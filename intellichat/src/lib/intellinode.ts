import {
  ChatContext,
  ChatGPTInput,
  Chatbot,
  LLamaReplicateInput,
  ProxyHelper,
} from 'intellinode';
import { ChatProvider } from './types';
import {
  azureType,
  azureValidator,
  openAIType,
  openAIValidator,
  replicateType,
  replicateValidator,
} from './validators';

export function getChatProviderKey(provider: ChatProvider) {
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY;
  } else if (provider === 'replicate') {
    return process.env.REPLICATE_API_KEY;
  } else if (provider === 'azure') {
    return process.env.AZURE_API_KEY;
  } else {
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
};

export async function getAzureChatResponse({
  systemMessage,
  messages,
  provider,
  withContext,
  n,
}: getAzureChatResponseParams) {
  const parsed = azureValidator.safeParse(provider);

  if (!parsed.success) {
    const { error } = parsed;
    throw new Error(error.message);
  }

  const { apiKey, resourceName, model, embeddingName, name } = parsed.data;
  const proxy = createProxy(resourceName);
  const chatbot = new Chatbot(apiKey, 'openai', proxy);
  const input = getChatInput(name, model, systemMessage);

  if (withContext) {
    const contextResponse = await getContextResponse({
      apiKey,
      proxy,
      messages,
      model: embeddingName,
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
  provider?: openAIType | replicateType;
  withContext: boolean;
  n: number;
  contextKey: string;
};

export async function getChatResponse({
  systemMessage,
  messages,
  provider,
  withContext,
  n,
  contextKey,
}: getChatResponseParams) {
  if (!provider) {
    throw new Error('provider is required');
  }
  const parsed =
    provider.name === 'openai'
      ? openAIValidator.safeParse(provider)
      : replicateValidator.safeParse(provider);

  if (!parsed.success) {
    const { error } = parsed;
    throw new Error(error.message);
  }

  const { apiKey, model, name } = parsed.data;

  const chatbot = new Chatbot(apiKey, name);
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
    default:
      throw new Error('provider is not supported');
  }
}

function addMessages(
  chatInput: ChatGPTInput | LLamaReplicateInput,
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

async function getContextResponse({
  apiKey,
  proxy = null,
  messages,
  model,
  n = 2,
}: {
  apiKey: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  proxy?: ProxyHelper | null;
  model?: string | null;
  n?: number;
}) {
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
