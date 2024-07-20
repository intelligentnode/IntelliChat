declare module 'intellinode' {
  type SupportedChatModels =
    | 'openai'
    | 'replicate'
    | 'sagemaker'
    | 'azure'
    | 'gemini'
    | 'cohere'
    | 'mistral'
    | 'anthropic';

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
        | AnthropicInput
    );
  }

  class ChatGPTInput {
    model: string = 'gpt-4o-mini';
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
        attachReference?: boolean;
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
    constructor(
      message: string,
      options?: {
        model?: string;
        attachReference?: boolean;
      }
    );

    addUserMessage(message: string): void;
    addAssistantMessage(message: string): void;
  }

  class CohereInput {
    constructor(
      message: string,
      options?: {
        model?: string;
        web?: boolean;
        attachReference?: boolean;
      }
    );

    addUserMessage(message: string): void;
    addAssistantMessage(message: string): void;
  }

  class GeminiInput {
    constructor(
      message: string,
      options?: {
        model?: string;
        attachReference?: boolean;
      }
    );

    addUserMessage(message: string): void;
    addAssistantMessage(message: string): void;
  }

  class MistralInput {
    constructor(
      message: string,
      options?: {
        model?: string;
        attachReference?: boolean;
      }
    );

    addUserMessage(message: string): void;
    addAssistantMessage(message: string): void;
  }

  class AnthropicInput {
    constructor(
      message: string,
      options?: {
        model?: string;
        attachReference?: boolean;
      }
    );

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
