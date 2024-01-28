declare module 'intellinode' {
  type SupportedChatModels =
    | 'openai'
    | 'replicate'
    | 'sagemaker'
    | 'azure'
    | 'gemini'
    | 'cohere'
    | 'mistral';

  class Chatbot {
    constructor(
      keyValue?: string,
      provider?: string,
      customProxy?: ProxyHelper | null,
      options?: {
        oneKey?: string;
      }
    );
    chat(
      modelInput?:
        | ChatGPTInput
        | LLamaReplicateInput
        | CohereInput
        | GeminiInput
    );
  }

  class ChatGPTInput {
    model: string = 'gpt-3.5-turbo';
    temperature: number = 1;
    maxTokens: number | null = null;
    numberOfOutputs: number = 1;

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

  class CohereInput {
    constructor(message: string, options?: { model?: string; web?: boolean });

    addUserMessage(message: string): void;
    addAssistantMessage(message: string): void;
  }

  class GeminiInput {
    constructor(message: string, options?: { model?: string });

    addUserMessage(message: string): void;
    addAssistantMessage(message: string): void;
  }

  class MistralInput {
    constructor(message: string, options?: { model?: string });

    addUserMessage(message: string): void;
    addAssistantMessage(message: string): void;
  }

  class ChatContext {
    constructor(
      apiKey: string,
      provider?: SupportedChatModels,
      customProxy?: ProxyHelper | null
    );
    getRoleContext(
      userMessage: string,
      historyMessages: { role: 'user' | 'assistant'; content: string }[],
      n: number,
      embeddingName?: string | null
    );
  }
  class ProxyHelper {
    static getInstance(): ProxyHelper;
    setAzureOpenai(resourceName: string): void;
  }
}
