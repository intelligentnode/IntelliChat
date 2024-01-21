// Description: Chat providers and their models.

import { SupportedProvidersNamesType } from './validators';

const OpenAIModels = ['gpt-3.5-turbo', 'gpt-4'] as const;
const ReplicateModels = [
  '70b-chat',
  '13b-chat',
  '34b-code',
  '34b-python',
  '13b-code-instruct',
] as const;
const CohereModels = ['command'] as const;
const GoogleModels = ['gemini'] as const;
const AzureModels = [''] as const;

export const AIProviders = {
  openai: {
    name: 'openai',
    models: OpenAIModels,
  },
  replicate: {
    name: 'replicate',
    models: ReplicateModels,
  },
  cohere: {
    name: 'cohere',
    models: CohereModels,
  },
  google: {
    name: 'google',
    models: GoogleModels,
  },
  azure: {
    name: 'azure',
    models: AzureModels,
  },
};

// Create a record of all providers with false values, this will be used to
// check if a provider api key is defined in the environment variables.
export const envKeys = Object.fromEntries(
  Object.keys(AIProviders).map((key) => [key, false])
) as Record<SupportedProvidersNamesType, boolean>;
