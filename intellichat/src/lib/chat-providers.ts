export const openAIModels = ['gpt-3.5-turbo', 'gpt-4'] as const;
export const replicateModels = [
  '70b-chat',
  '13b-chat',
  '34b-code',
  '34b-python',
  '13b-code-instruct',
] as const;
export const cohereModels = ['command'] as const;

export const AIProviders: {
  openai: { name: 'openai'; models: typeof openAIModels };
  replicate: { name: 'replicate'; models: typeof replicateModels };
  cohere: { name: 'cohere'; models: typeof cohereModels };
} = {
  openai: { name: 'openai', models: openAIModels },
  replicate: { name: 'replicate', models: replicateModels },
  cohere: { name: 'cohere', models: cohereModels },
};

export const defaultProvider = {
  name: 'openai' as const,
  model: AIProviders.openai.models[0],
};

export type AIProviderType = typeof AIProviders;

export type OpenAI = {
  name: 'openai';
  model: AIProviderType['openai']['models'][number];
  apiKey: string;
};

export type Replicate = {
  name: 'replicate';
  model: AIProviderType['replicate']['models'][number];
  apiKey: string;
};

export type Azure = {
  name: 'azure';
  model: string;
  resourceName: string;
  embeddingName: string;
  apiKey: string;
};

export type Cohere = {
  name: 'cohere';
  model: AIProviderType['cohere']['models'][number];
  apiKey: string;
};
