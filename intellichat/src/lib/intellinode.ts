// Server side integration with intellinode: chat, images, speech, transcription and model listing.
import {
  AnthropicInput,
  ChatContext,
  ChatGPTInput,
  Chatbot,
  CohereInput,
  GeminiInput,
  ImageModelInput,
  LLamaReplicateInput,
  MistralInput,
  OpenAICompatibleInput,
  OpenAIWrapper,
  ProxyHelper,
  RemoteImageModel,
  RemoteSpeechModel,
  Text2SpeechInput,
  VLLMInput,
} from 'intellinode';
import type { ChatModelInput, ToolDefinition } from 'intellinode';
import type { AgentMessage, ToolCall } from './types';
import {
  EnvKeyVendors,
  ImageProviders,
  SpeechProviders,
  TranscriptionVendor,
  isCompatibleProvider,
  isKeyless,
  providerConfig,
  supportsStreaming,
  supportsVision,
  type ProviderName,
  type Vendor,
} from './ai-providers';
import type { ImagesSettings, ProviderSettings, SpeechSettings, SupportedProvidersType } from './validators';

const TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';
const SPEECH_MODEL = 'gpt-4o-mini-tts';
const IMAGE_SIZE = '1024x1024';
const MAX_SPEECH_CHARS = 4000;

type ChatMessage = { role: 'user' | 'assistant'; content: string; image?: string };

// ---------------------------------------------------------------------
// Keys: settings first, then the environment
// ---------------------------------------------------------------------

export function envKey(vendor: Vendor) {
  const value = process.env[EnvKeyVendors[vendor]];
  if (vendor === 'anthropic') return value || process.env.Anthropic_API_KEY || undefined;
  return value || undefined;
}

/** Which vendor keys exist in the environment (booleans only, never the values). */
export function envKeyStatus() {
  return Object.fromEntries(Object.keys(EnvKeyVendors).map((vendor) => [vendor, Boolean(envKey(vendor as Vendor))])) as Record<Vendor, boolean>;
}

/** The key for a chat provider: the settings field, then the environment; local servers need none. */
export function getChatProviderKey(provider: ProviderName, providers?: SupportedProvidersType) {
  const fromSettings = providers?.[provider]?.apiKey?.trim();
  if (fromSettings) return fromSettings;
  const config = providerConfig(provider);
  if (config?.envKey) return envKey(provider as Vendor) || null;
  return null;
}

/**
 * The key of a vendor used by images, speech or transcription: an override typed in that section, then the
 * same vendor's chat key (one OpenAI key serves chat, images, speech and transcription), then the environment.
 */
export function resolveVendorKey(vendor: Vendor, providers?: SupportedProvidersType, override?: string) {
  if (override?.trim()) return override.trim();
  const chatKey = (providers as Record<string, { apiKey?: string } | undefined> | undefined)?.[vendor]?.apiKey?.trim();
  if (chatKey) return chatKey;
  return envKey(vendor) || null;
}

export class MissingKeyError extends Error {
  constructor(vendor: string, feature: string) {
    super(`No ${vendor} API key for ${feature}. Add it in the settings or set ${EnvKeyVendors[vendor as Vendor] || vendor} in .env.`);
    this.name = 'MissingKeyError';
  }
}

// ---------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------

function dataUrlParts(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Attached images must be base64 data URLs.');
  return { mime: match[1], data: match[2] };
}

function createChatInput(provider: ProviderName, model: string, systemMessage: string) {
  const options = { model: model || undefined };
  switch (provider) {
    case 'openai':
    case 'azure':
      return new ChatGPTInput(systemMessage, options);
    case 'anthropic':
      return new AnthropicInput(systemMessage, options);
    case 'google':
      return new GeminiInput(systemMessage, options);
    case 'cohere':
      return new CohereInput(systemMessage, options);
    case 'mistral':
      return new MistralInput(systemMessage, options);
    case 'replicate':
      return new LLamaReplicateInput(systemMessage, options);
    case 'vllm':
      return new VLLMInput(systemMessage, options);
    default:
      // openrouter, groq, deepseek, ollama, lmstudio
      return new OpenAICompatibleInput(systemMessage, options);
  }
}

// Add one message to the input, with the attached image in the shape of the provider.
function addMessage(input: ChatModelInput, provider: ProviderName, message: ChatMessage) {
  if (message.role === 'assistant') {
    input.addAssistantMessage(message.content);
    return;
  }
  if (!message.image) {
    input.addUserMessage(message.content);
    return;
  }
  if (!supportsVision(provider)) {
    throw new Error(`${providerConfig(provider).label} does not accept images. Switch to OpenAI, Anthropic, Gemini, Mistral or a local vision model.`);
  }
  const { mime, data } = dataUrlParts(message.image);
  const text = message.content || 'Describe this image.';
  if (provider === 'anthropic') {
    input.addUserMessage([
      { type: 'image', source: { type: 'base64', media_type: mime, data } },
      { type: 'text', text },
    ]);
  } else if (provider === 'google') {
    (input as GeminiInput).messages.push({ role: 'user', parts: [{ inline_data: { mime_type: mime, data } }, { text }] });
  } else {
    // OpenAI chat completions and Responses API, Mistral and the OpenAI-compatible servers
    input.addUserMessage([
      { type: 'text', text },
      { type: 'image_url', image_url: { url: message.image } },
    ]);
  }
}

type ChatOptions = {
  provider: ProviderName;
  settings: ProviderSettings;
  apiKey: string | null;
  systemMessage: string;
  messages: ChatMessage[];
  stream: boolean;
  withContext: boolean;
  contextKey?: string | null;
  n: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => Promise<void> | void;
};

function createChatbot({ provider, settings, apiKey, signal }: Pick<ChatOptions, 'provider' | 'settings' | 'apiKey' | 'signal'>) {
  const options: Record<string, unknown> = { signal, timeout: 180000, retries: 1 };
  if (provider === 'azure') {
    const proxy = new ProxyHelper();
    proxy.setAzureOpenai((settings as { resourceName?: string }).resourceName || '');
    return new Chatbot(apiKey || '', 'openai', proxy, options);
  }
  if (isCompatibleProvider(provider) || provider === 'vllm') {
    options.baseUrl = settings.baseUrl || providerConfig(provider).baseUrl;
  }
  const intelliProvider = provider === 'google' ? 'gemini' : provider;
  return new Chatbot(apiKey || (isKeyless(provider) ? null : ''), intelliProvider, null, options);
}

// Keep the messages that matter for the last question, using OpenAI embeddings.
async function contextMessages(apiKey: string, messages: ChatMessage[], n: number, proxy: ProxyHelper | null = null, model: string | null = null) {
  const context = new ChatContext(apiKey, 'openai', proxy);
  const userMessage = messages[messages.length - 1].content;
  const history = messages.map(({ role, content }) => ({ role, content }));
  return context.getRoleContext(userMessage, history, n, model) as Promise<Array<{ role: 'user' | 'assistant'; content: string }>>;
}

/**
 * Send the conversation to the provider. Streams through onChunk when `stream` is set and the provider
 * supports it, otherwise resolves with the reply text.
 */
export async function getChatResponse(options: ChatOptions): Promise<string> {
  const { provider, settings, systemMessage, stream, withContext, contextKey, n, onChunk } = options;
  const chatbot = createChatbot(options);
  const input = createChatInput(provider, settings.model, systemMessage);

  let messages = options.messages;
  if (withContext) {
    if (!contextKey) throw new MissingKeyError('openai', 'the context feature');
    const proxy = provider === 'azure' ? new ProxyHelper() : null;
    if (proxy) proxy.setAzureOpenai((settings as { resourceName?: string }).resourceName || '');
    const embeddingModel = provider === 'azure' ? (settings as { embeddingName?: string }).embeddingName || null : null;
    const selected = await contextMessages(contextKey, messages, n, proxy, embeddingModel);
    // keep the attachment of the current question
    const last = messages[messages.length - 1];
    messages = selected.map((message, index) => (index === selected.length - 1 && message.content === last.content ? last : message));
  }
  for (const message of messages) addMessage(input, provider, message);

  if (stream && supportsStreaming(provider) && onChunk) {
    let full = '';
    for await (const chunk of chatbot.stream(input)) {
      const text = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
      full += text;
      await onChunk(text);
    }
    return full;
  }

  const response = await chatbot.chat(input);
  const replies = Array.isArray(response) ? response : response.result;
  const first = replies[0];
  if (typeof first === 'string') return first;
  return (first && 'content' in first && first.content) || '';
}

// ---------------------------------------------------------------------
// Coding assistant
// ---------------------------------------------------------------------

type AgentStepOptions = Pick<ChatOptions, 'provider' | 'settings' | 'apiKey' | 'systemMessage' | 'signal'> & {
  messages: AgentMessage[];
  tools: ToolDefinition[];
  // ask for the final answer without more tools
  finalize?: boolean;
};

/**
 * One model call of the coding assistant: the answer, or the tools the model wants next. The browser runs the tools
 * and calls again with their results, so every request stays short.
 */
export async function runAgentStep(options: AgentStepOptions): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const { provider, settings, systemMessage, messages, tools, finalize } = options;
  const chatbot = createChatbot(options);
  const input = createChatInput(provider, settings.model, systemMessage);
  input.tools = tools;
  if (finalize) input.toolChoice = 'none';
  for (const message of messages) {
    if (message.role === 'tool') input.addToolResults(message.results);
    else if (message.role === 'assistant' && message.toolCalls?.length) input.addToolCalls(message.toolCalls, message.content || null);
    else addMessage(input, provider, message);
  }
  const response = await chatbot.chat(input);
  const replies = Array.isArray(response) ? response : response.result;
  const first = replies[0];
  if (first && typeof first === 'object' && 'tool_calls' in first && Array.isArray(first.tool_calls) && first.tool_calls.length) {
    return { content: first.content || '', toolCalls: first.tool_calls as ToolCall[] };
  }
  if (typeof first === 'string') return { content: first, toolCalls: [] };
  return { content: (first && 'content' in first && first.content) || '', toolCalls: [] };
}

// ---------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------

export async function generateImage(prompt: string, images: ImagesSettings, providers?: SupportedProvidersType) {
  const config = ImageProviders[images.provider];
  const apiKey = resolveVendorKey(config.vendor, providers, images.apiKey);
  if (!apiKey) throw new MissingKeyError(config.vendor, 'image generation');

  const model = new RemoteImageModel(apiKey, images.provider);
  const input = images.provider === 'openai'
    ? new ImageModelInput({ prompt, numberOfImages: 1, imageSize: IMAGE_SIZE, quality: 'medium', model: 'gpt-image-2' })
    : new ImageModelInput({ prompt, numberOfImages: 1, width: 1024, height: 1024, engine: 'stable-diffusion-xl-1024-v1-0' });
  const [image] = await model.generateImages(input);
  if (!image) throw new Error(`${config.label} returned no image.`);
  if (/^https?:\/\//i.test(image)) {
    const response = await fetch(image);
    return `data:image/png;base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
  }
  return `data:image/png;base64,${image}`;
}

// ---------------------------------------------------------------------
// Speech
// ---------------------------------------------------------------------

async function streamToBuffer(stream: NodeJS.ReadableStream | Buffer | string): Promise<Buffer> {
  if (Buffer.isBuffer(stream)) return stream;
  if (typeof stream === 'string') return Buffer.from(stream, 'base64');
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Text to speech; resolves with MP3 bytes. */
export async function synthesizeSpeech(text: string, speech: SpeechSettings, providers?: SupportedProvidersType): Promise<Buffer> {
  const config = SpeechProviders[speech.provider];
  const apiKey = resolveVendorKey(config.vendor, providers, speech.apiKey);
  if (!apiKey) throw new MissingKeyError(config.vendor, 'read aloud');
  const spoken = text.slice(0, MAX_SPEECH_CHARS);

  if (speech.provider === 'openai') {
    const model = new RemoteSpeechModel(apiKey, 'openAi');
    const audio = await model.generateSpeech(new Text2SpeechInput({ text: spoken, voice: speech.voice, model: SPEECH_MODEL, stream: true }));
    return streamToBuffer(audio);
  }
  const model = new RemoteSpeechModel(apiKey, 'google');
  const audio = await model.generateSpeech(new Text2SpeechInput({ text: spoken, language: 'en-gb' }));
  return streamToBuffer(audio);
}

/** Speech to text with OpenAI; `file` is the recording or the uploaded audio file. */
export async function transcribeAudio(file: Blob, filename: string, providers?: SupportedProvidersType, override?: string) {
  const apiKey = resolveVendorKey(TranscriptionVendor, providers, override);
  if (!apiKey) throw new MissingKeyError(TranscriptionVendor, 'voice input');
  const form = new FormData();
  form.append('file', file, filename);
  form.append('model', TRANSCRIPTION_MODEL);
  const wrapper = new OpenAIWrapper(apiKey);
  const result = await wrapper.speechToText(form);
  return typeof result === 'string' ? result : result.text || '';
}

// ---------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------

/** The model ids served by an OpenAI-compatible or vLLM server. */
export async function listProviderModels(provider: ProviderName, apiKey: string, baseUrl: string): Promise<string[]> {
  const config = providerConfig(provider);
  const url = (baseUrl || config.baseUrl || '').replace(/\/+$/, '');
  if (provider === 'vllm') {
    const response = await fetch(`${url}/v1/models`);
    if (!response.ok) throw new Error(`vLLM answered ${response.status} for ${url}/v1/models`);
    const json = (await response.json()) as { data?: Array<{ id: string }> };
    return (json.data || []).map((model) => model.id);
  }
  if (!isCompatibleProvider(provider)) {
    return [...(config.models || [])];
  }
  const key = apiKey?.trim() || getChatProviderKey(provider) || null;
  const chatbot = new Chatbot(key, provider as 'ollama', null, { baseUrl: url, timeout: 15000, retries: 0 });
  return chatbot.listModels();
}
