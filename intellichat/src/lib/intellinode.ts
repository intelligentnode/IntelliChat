import {
  ChatContext,
  ChatGPTInput,
  Chatbot,
  CohereInput,
  GeminiInput,
  LLamaReplicateInput,
  MistralInput,
  AnthropicInput,
  ProxyHelper,
  VLLMInput,
  SupportedChatModels,
} from 'intellinode';
import { ChatProvider } from './types';
import {
  azureType,
  azureValidator,
  cohereType,
  cohereValidator,
  googleType,
  googleValidator,
  mistralValidator,
  mistralType,
  openAIType,
  openAIValidator,
  replicateType,
  replicateValidator,
  anthropicType,
  anthropicValidator,
  vllmValidator
} from './validators';

// We can use this function to get the default provider key if onekey is provided and starts with 'in'
export function getDefaultProviderKey(provider: ChatProvider, oneKey?: string) {
  if (!oneKey || (oneKey && !oneKey.startsWith('in'))) {
    return null;
  }

  switch (provider) {
    case 'openai':
      return process.env.INTELLI_OPENAI_API_KEY;
    case 'replicate':
      return process.env.INTELLI_REPLICATE_API_KEY;
    case 'azure':
      return process.env.INTELLI_AZURE_API_KEY;
    case 'cohere':
      return process.env.INTELLI_COHERE_API_KEY;
    case 'google':
      return process.env.INTELLI_GOOGLE_API_KEY;
    case 'anthropic':
        return process.env.INTELLI_Anthropic_API_KEY;
    default:
      return null;
  }
}

export function getChatProviderKey(provider: ChatProvider) {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'replicate':
      return process.env.REPLICATE_API_KEY;
    case 'azure':
      return process.env.AZURE_API_KEY;
    case 'cohere':
      return process.env.COHERE_API_KEY;
    case 'google':
      return process.env.GOOGLE_API_KEY;
    case 'mistral':
      return process.env.MISTRAL_API_KEY;
    case 'anthropic':
        return process.env.Anthropic_API_KEY;
    case 'vllm':
      return null;
    default:
      return null;
  }
}

type getAzureChatResponseParams = {
  systemMessage: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  provider?: azureType;
  withContext: boolean;
  n: number;
  oneKey?: string;
};

export async function getAzureChatResponse({
  systemMessage,
  messages,
  provider,
  withContext,
  oneKey,
  n,
}: getAzureChatResponseParams) {
  const parsed = azureValidator.safeParse(provider);

  if (!parsed.success) {
    const { error } = parsed;
    throw new Error(error.message);
  }

  const { apiKey, resourceName, model, embeddingName, name } = parsed.data;
  const proxy = createProxy(resourceName);

  const chatbot = new Chatbot(
      apiKey,
      'openai',
      proxy,
      ...(oneKey ? [{ oneKey, intelliBase: process.env.CUSTOM_INTELLIBASE_URL }] : [])
    );

  const input = getChatInput(name, model, systemMessage);

  if (withContext) {
    const contextResponse = await getContextResponse({
      apiKey,
      proxy,
      messages,
      model: embeddingName,
      n,
    });
    addMessages(input, contextResponse);
  } else {
    addMessages(input, messages);
  }

  const responses = await chatbot.chat(input);
  return responses[0];
}

type getChatResponseParams = {
  systemMessage: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  provider?: openAIType | replicateType | cohereType | googleType | mistralType | anthropicType;
  withContext: boolean;
  stream?: boolean;
  n: number;
  contextKey?: string | null;
  oneKey?: string;
  intellinodeData?: boolean;
  onChunk?: (chunk: string) => Promise<void>;
  intelliBase?: string;
};

const validateProvider = (name: string) => {
  switch (name) {
    case 'openai':
      return openAIValidator;
    case 'replicate':
      return replicateValidator;
    case 'cohere':
      return cohereValidator;
    case 'google':
      return googleValidator;
    case 'mistral':
      return mistralValidator;
    case 'anthropic':
      return anthropicValidator;
    case 'vllm':
      return vllmValidator;
    default:
      throw new Error('provider is not supported');
  }
};

export async function getChatResponse({
  systemMessage,
  messages,
  provider,
  withContext,
  stream,
  n,
  contextKey,
  oneKey,
  intellinodeData,
  onChunk,
  intelliBase,
}: getChatResponseParams) {
  if (!provider) {
    throw new Error('provider is required');
  }
  const parsed = validateProvider(provider.name).safeParse(provider);

  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  const { apiKey, model, name, baseUrl } = parsed.data;
  const finalApiKey = name === 'vllm' ? "" : apiKey;
  const chatbot = new Chatbot(
      finalApiKey,
      name === 'google' ? 'gemini' : name,
      null,
      oneKey && intellinodeData
        ? { baseUrl, oneKey, intelliBase: intelliBase || process.env.CUSTOM_INTELLIBASE_URL }
        : { baseUrl }
    );


  const input = getChatInput(name, model, systemMessage);

  if (withContext) {
    if (!contextKey) {
      throw new Error('contextKey is required');
    }

    const contextResponse = await getContextResponse({
      apiKey: contextKey,
      messages,
      n,
    });
    addMessages(input, contextResponse);
  } else {
    addMessages(input, messages);
  }

  if ((name === 'openai' || name === 'cohere') && stream && onChunk) {
    const streamData = await chatbot.stream(input);
    let fullResponse = '';

    try {
      for await (const chunk of streamData) {
        fullResponse += chunk;
        // If Response is available as a string
        const textChunk = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
        
        await onChunk(textChunk);
      }

      console.log('fullResponse', fullResponse);

      return {
        result: [fullResponse],
        references: null
      };
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }
  } else {
    // Handle non-streaming response
    const responses = await chatbot.chat(input);
    console.log("responses", responses);
    return responses;
  }
}

function getChatInput(provider: string, model: string, systemMessage: string) {
  switch (provider) {
    case 'openai':
    case 'azure':
      return new ChatGPTInput(systemMessage, { model, attachReference: true });
    case 'replicate':
      return new LLamaReplicateInput(systemMessage, {
        model,
        attachReference: true,
      });
    case 'cohere':
      return new CohereInput(systemMessage, { model, attachReference: true });
    case 'google':
      return new GeminiInput(systemMessage, { model, attachReference: true });
    case 'mistral':
      return new MistralInput(systemMessage, { model, attachReference: true });
    case 'anthropic':
      return new AnthropicInput(systemMessage, { model, attachReference: true });
    case 'vllm':
      return new VLLMInput(systemMessage, { model, attachReference: true, });
    default:
      throw new Error('provider is not supported');
  }
}

function addMessages(
  chatInput: ChatGPTInput | LLamaReplicateInput | CohereInput | GeminiInput,
  messages: {
    role: 'user' | 'assistant';
    content: string;
  }[]
) {
  messages.forEach((m) => {
    if (m.role === 'user') {
      chatInput.addUserMessage(m.content);
    } else {
      chatInput.addAssistantMessage(m.content);
    }
  });
}

function createProxy(resourceName: string) {
  const proxy = new ProxyHelper();
  proxy.setAzureOpenai(resourceName);
  return proxy;
}

type ContextResponseParams = {
  apiKey: string;
  proxy?: ProxyHelper | null;
  messages: { role: 'user' | 'assistant'; content: string }[];
  model?: string | null;
  n?: number;
};

async function getContextResponse({
  apiKey,
  proxy = null,
  messages,
  model,
  n = 2,
}: ContextResponseParams) {
  const context = new ChatContext(apiKey, 'openai', proxy);
  // extract the last message from the array; this is the user's message
  const userMessage = messages[messages.length - 1].content;

  // get the closest context to the user's message
  const contextResponse = await context.getRoleContext(
    userMessage,
    messages,
    n,
    model
  );
  return contextResponse;
}
