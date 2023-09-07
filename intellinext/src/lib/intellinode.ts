import { ChatGPTInput, LLamaReplicateInput } from 'intellinode';
import { ChatProvider } from './types';

export function getChatInput(provider: string, systemMessage: string) {
  if (provider === 'openai') {
    return new ChatGPTInput(systemMessage);
  } else if (provider === 'replicate') {
    return new LLamaReplicateInput(systemMessage);
  } else {
    throw new Error('provider is not supported');
  }
}

export function addMessages(
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

export function getChatProviderKey(provider: ChatProvider) {
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY;
  } else if (provider === 'replicate') {
    return process.env.REPLICATE_API_KEY;
  } else {
    throw new Error('provider is not supported');
  }
}
