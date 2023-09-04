declare module 'intellinode' {
  let ChatModels = ['openai', 'replicate', 'sagemaker'] as const;
  type SupportedChatModels = (typeof ChatModels)[number];

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
  }
  class ChatGPTMessage {
    constructor(message: string, role: string);
  }
  class LLamaReplicateInput {
    constructor(message: string);

    addUserMessage(message: string): void;
    addAssistantMessage(message: string): void;
  }
}
