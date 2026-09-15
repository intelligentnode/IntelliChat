// Description: Chat, image and speech providers and their models.

export type ProviderKind = 'cloud' | 'local' | 'compatible' | 'azure' | 'vllm';

export type ProviderConfig = {
  name: string;
  label: string;
  kind: ProviderKind;
  // static model list (the first entry is the default); providers without one take a free-text model
  models?: readonly string[];
  // the model list can be fetched from the provider (OpenAI-compatible servers)
  dynamicModels?: boolean;
  // default base URL for local and compatible servers
  baseUrl?: string;
  // no API key needed
  keyless?: boolean;
  // chatbot.stream is supported
  streaming: boolean;
  // images can be attached to a message
  vision: boolean;
  // environment variable that holds the key
  envKey?: string;
};

// The first model of each list is the default in the settings panel.
const OpenAIModels = ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.1', 'gpt-4.1', 'gpt-4.1-mini'] as const;
const ReplicateModels = ['70b-chat', '13b-chat'] as const;
const CohereModels = [
  'command-a-03-2025',
  'command-a-plus-05-2026',
  'command-a-reasoning-08-2025',
  'command-r-plus-08-2024',
  'command-r7b-12-2024',
] as const;
const GoogleModels = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview'] as const;
const MistralModels = [
  'mistral-medium-latest',
  'mistral-small-latest',
  'magistral-medium-latest',
  'magistral-small-latest',
  'ministral-14b-latest',
] as const;
const AnthropicModels = ['claude-sonnet-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-haiku-4-5'] as const;

export const AIProviders = {
  openai: {
    name: 'openai' as const,
    label: 'OpenAI',
    kind: 'cloud' as const,
    models: OpenAIModels,
    streaming: true,
    vision: true,
    envKey: 'OPENAI_API_KEY',
  },
  anthropic: {
    name: 'anthropic' as const,
    label: 'Anthropic',
    kind: 'cloud' as const,
    models: AnthropicModels,
    streaming: true,
    vision: true,
    envKey: 'ANTHROPIC_API_KEY',
  },
  google: {
    name: 'google' as const,
    label: 'Google Gemini',
    kind: 'cloud' as const,
    models: GoogleModels,
    streaming: false,
    vision: true,
    envKey: 'GOOGLE_API_KEY',
  },
  cohere: {
    name: 'cohere' as const,
    label: 'Cohere',
    kind: 'cloud' as const,
    models: CohereModels,
    streaming: true,
    vision: false,
    envKey: 'COHERE_API_KEY',
  },
  mistral: {
    name: 'mistral' as const,
    label: 'Mistral',
    kind: 'cloud' as const,
    models: MistralModels,
    streaming: true,
    vision: true,
    envKey: 'MISTRAL_API_KEY',
  },
  replicate: {
    name: 'replicate' as const,
    label: 'Replicate (Llama)',
    kind: 'cloud' as const,
    models: ReplicateModels,
    streaming: false,
    vision: false,
    envKey: 'REPLICATE_API_KEY',
  },
  openrouter: {
    name: 'openrouter' as const,
    label: 'OpenRouter',
    kind: 'compatible' as const,
    dynamicModels: true,
    models: ['openai/gpt-5.5', 'anthropic/claude-sonnet-5', 'google/gemini-3.6-flash'] as const,
    streaming: true,
    vision: true,
    envKey: 'OPENROUTER_API_KEY',
  },
  groq: {
    name: 'groq' as const,
    label: 'Groq',
    kind: 'compatible' as const,
    dynamicModels: true,
    streaming: true,
    vision: false,
    envKey: 'GROQ_API_KEY',
  },
  deepseek: {
    name: 'deepseek' as const,
    label: 'DeepSeek',
    kind: 'compatible' as const,
    dynamicModels: true,
    models: ['deepseek-chat', 'deepseek-reasoner'] as const,
    streaming: true,
    vision: false,
    envKey: 'DEEPSEEK_API_KEY',
  },
  ollama: {
    name: 'ollama' as const,
    label: 'Ollama (local)',
    kind: 'local' as const,
    dynamicModels: true,
    baseUrl: 'http://localhost:11434/v1',
    keyless: true,
    streaming: true,
    vision: true,
  },
  lmstudio: {
    name: 'lmstudio' as const,
    label: 'LM Studio (local)',
    kind: 'local' as const,
    dynamicModels: true,
    baseUrl: 'http://localhost:1234/v1',
    keyless: true,
    streaming: true,
    vision: true,
  },
  vllm: {
    name: 'vllm' as const,
    label: 'vLLM (self-hosted)',
    kind: 'vllm' as const,
    baseUrl: 'http://localhost:8000',
    keyless: true,
    streaming: true,
    vision: false,
  },
  // azure is a special case: the model and resource names are entered manually
  azure: {
    name: 'azure' as const,
    label: 'Azure OpenAI',
    kind: 'azure' as const,
    streaming: false,
    vision: false,
    envKey: 'AZURE_API_KEY',
  },
} satisfies Record<string, ProviderConfig>;

export type ProviderName = keyof typeof AIProviders;

export const providerNames = Object.keys(AIProviders) as [ProviderName, ...ProviderName[]];

export function providerConfig(name: string): ProviderConfig {
  return AIProviders[name as ProviderName] as ProviderConfig;
}

// Providers that take an OpenAI-compatible base URL (and can list their models)
export function isCompatibleProvider(name: string) {
  const kind = providerConfig(name)?.kind;
  return kind === 'compatible' || kind === 'local';
}

export function supportsStreaming(name: string) {
  return Boolean(providerConfig(name)?.streaming);
}

export function supportsVision(name: string) {
  return Boolean(providerConfig(name)?.vision);
}

export function isKeyless(name: string) {
  return Boolean(providerConfig(name)?.keyless);
}

export function hasModelList(name: string) {
  return Boolean(providerConfig(name)?.models?.length);
}

// ---- images and speech ----

export const ImageProviders = {
  openai: { name: 'openai' as const, label: 'OpenAI (gpt-image-2)', vendor: 'openai' as const, envKey: 'OPENAI_API_KEY' },
  stability: { name: 'stability' as const, label: 'Stability AI', vendor: 'stability' as const, envKey: 'STABILITY_API_KEY' },
};
export type ImageProviderName = keyof typeof ImageProviders;
export const imageProviderNames = Object.keys(ImageProviders) as [ImageProviderName, ...ImageProviderName[]];

export const SpeechProviders = {
  openai: { name: 'openai' as const, label: 'OpenAI (gpt-4o-mini-tts)', vendor: 'openai' as const, envKey: 'OPENAI_API_KEY' },
  google: { name: 'google' as const, label: 'Google Text-to-Speech', vendor: 'google' as const, envKey: 'GOOGLE_API_KEY' },
};
export type SpeechProviderName = keyof typeof SpeechProviders;
export const speechProviderNames = Object.keys(SpeechProviders) as [SpeechProviderName, ...SpeechProviderName[]];

export const OpenAIVoices = ['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer'] as const;

// Voice input (microphone and audio files) is transcribed with OpenAI.
export const TranscriptionVendor = 'openai' as const;

// Every key the app can read from the environment, keyed by vendor.
export const EnvKeyVendors = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  cohere: 'COHERE_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  replicate: 'REPLICATE_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  groq: 'GROQ_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  azure: 'AZURE_API_KEY',
  stability: 'STABILITY_API_KEY',
} as const;
export type Vendor = keyof typeof EnvKeyVendors;

// Record of vendors with false values, used to track which keys exist in the environment.
export const envKeys = Object.fromEntries(
  Object.keys(EnvKeyVendors).map((key) => [key, false])
) as Record<Vendor, boolean>;
