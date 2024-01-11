import {
  ChatContext,
  ChatGPTInput,
  Chatbot,
  CohereInput,
  GeminiInput,
  LLamaReplicateInput,
  ProxyHelper,
} from 'intellinode';
import { ChatProvider } from './types';
import {
  azureType,
  azureValidator,
  cohereType,
  cohereValidator,
  googleType,
  googleValidator,
  openAIType,
  openAIValidator,
  replicateType,
  replicateValidator,
} from './validators';

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
    default:
      throw new Error('provider is not supported');
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
    ...(oneKey ? [{ oneKey }] : [])
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
  provider?: openAIType | replicateType | cohereType | googleType;
  withContext: boolean;
  n: number;
  contextKey: string;
  oneKey?: string;
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
    default:
      throw new Error('provider is not supported');
  }
};

export async function getChatResponse({
  systemMessage,
  messages,
  provider,
  withContext,
  n,
  contextKey,
  oneKey,
}: getChatResponseParams) {
  if (!provider) {
    throw new Error('provider is required');
  }
  const parsed = validateProvider(provider.name).safeParse(provider);

  if (!parsed.success) {
    const { error } = parsed;
    throw new Error(error.message);
  }

  const { apiKey, model, name } = parsed.data;

  const chatbot = new Chatbot(
    apiKey,
    name,
    null,
    ...(oneKey ? [{ oneKey }] : [])
  );
  const input = getChatInput(name, model, systemMessage);

  if (withContext) {
    const contextResponse = await getContextResponse({
      apiKey: contextKey,
      messages,
      n,
    });
    addMessages(input, contextResponse);
  } else {
    addMessages(input, messages);
  }
  const responses = await chatbot.chat(input);
  return responses[0];
}

function getChatInput(provider: string, model: string, systemMessage: string) {
  switch (provider) {
    case 'openai':
    case 'azure':
      return new ChatGPTInput(systemMessage, { model });
    case 'replicate':
      return new LLamaReplicateInput(systemMessage, { model });
    case 'cohere':
      return new CohereInput(systemMessage, { model });
    case 'google':
      return new GeminiInput(systemMessage, { model });
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
