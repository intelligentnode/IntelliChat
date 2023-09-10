declare module 'intellinode' {
  type SupportedChatModels = 'openai' | 'replicate' | 'sagemaker';

  class Chatbot {
    constructor(keyValue?: string, provider?: string);
    chat(modelInput?: ChatGPTInput | LLamaReplicateInput);
  }
  class ChatGPTInput {
    constructor(
      systemMessage: string,
      options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        numberOfOutputs?: number;
      }
    );

    addMessage(message: ChatGPTMessage);
    addUserMessage(message: string): void;
    addAssistantMessage(message: string): void;
  }
  class ChatGPTMessage {
    constructor(message: string, role: string);
  }
  class LLamaReplicateInput {
    constructor(message: string, options?: { model?: string });

    addUserMessage(message: string): void;
    addAssistantMessage(message: string): void;
  }

  class ChatContext {
    constructor(apiKey: string, provider?: SupportedChatModels);
    getRoleContext(
      userMessage: string,
      historyMessages: { role: 'user' | 'assistant'; content: string }[],
      n: number
    );
  }
}
