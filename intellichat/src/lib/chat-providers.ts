const openAIModels = ['gpt-3.5-turbo', 'gpt-4'];
const replicateModels = [
  '70b-chat',
  '13b-chat',
  '34b-code',
  '34b-python',
  '13b-code-instruct',
];

export const AIProviders: {
  openai: { name: 'openai'; models: typeof openAIModels };
  replicate: { name: 'replicate'; models: typeof replicateModels };
} = {
  openai: { name: 'openai', models: openAIModels },
  replicate: { name: 'replicate', models: replicateModels },
};

export const defaultProvider = {
  name: 'openai' as const,
  model: AIProviders.openai.models[0],
};

export type AIProviderType = typeof AIProviders;
