export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
};

export type ChatProvider = 'openai' | 'replicate';
