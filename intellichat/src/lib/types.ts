export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  references?: string[] | null;
};

export type ChatProvider =
  | 'openai'
  | 'replicate'
  | 'azure'
  | 'cohere'
  | 'google'
  | 'mistral';
