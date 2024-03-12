// Description: Chat providers and their models.

import { SupportedProvidersNamesType } from './validators';

const OpenAIModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'] as const;
const ReplicateModels = [
  '70b-chat',
  '13b-chat',
  '34b-code',
  '34b-python',
  '13b-code-instruct',
] as const;
const CohereModels = ['command'] as const;
const GoogleModels = ['gemini'] as const;
const MistralModels = ['mistral-tiny', 'mistral-medium'] as const;
const AnthropicModels = ['claude-3-sonnet-20240229', 'claude-3-opus-20240229'] as const;

export const AIProviders = {
  openai: {
    name: 'openai' as const,
    models: OpenAIModels,
  },
  replicate: {
    name: 'replicate' as const,
    models: ReplicateModels,
  },
  cohere: {
    name: 'cohere' as const,
    models: CohereModels,
  },
  google: {
    name: 'google' as const,
    models: GoogleModels,
  },
  mistral: {
    name: 'mistral' as const,
    models: MistralModels,
  },
  anthropic: {
    name: 'anthropic' as const,
    models: AnthropicModels,
  },
  // azure is a special case, it has a different validator
  // and the model names are entered manually instead of being a list
  azure: {
    name: 'azure' as const,
  },
};

// Create a record of all providers with false values, this will be used to
// check if a provider api key is defined in the environment variables.
export const envKeys = Object.fromEntries(
  Object.keys(AIProviders).map((key) => [key, false])
) as Record<SupportedProvidersNamesType, boolean>;
