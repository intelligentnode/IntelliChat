export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  // an attached (user) or generated (assistant) image as a data URL
  image?: string;
  // the prompt used to generate the image
  imagePrompt?: string;
  references?: string[] | null;
  isStreaming?: boolean;
  // the reply was cut short by the Stop button
  stopped?: boolean;
};

export type ChatProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'cohere'
  | 'mistral'
  | 'replicate'
  | 'openrouter'
  | 'groq'
  | 'deepseek'
  | 'ollama'
  | 'lmstudio'
  | 'vllm'
  | 'azure';

// Marks an error written at the end of a chat stream, so the client shows it as an error instead of reply text.
export const STREAM_ERROR_MARKER = '\u0000[error]';
