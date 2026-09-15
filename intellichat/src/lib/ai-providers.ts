// Description: Chat providers and their models.

import { SupportedProvidersNamesType } from './validators';

// The first model of each list is the default in the settings panel.
const OpenAIModels = ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.1', 'gpt-4.1', 'gpt-4.1-mini'] as const;
const ReplicateModels = ['70b-chat', '13b-chat'] as const;
const CohereModels = [
  'command-a-03-2025',
  'command-a-plus-05-2026',
  'command-a-reasoning-08-2025',
  'command-r-plus-08-2024',
  'command-r7b-12-2024',
] as const;
const GoogleModels = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview'] as const;
const MistralModels = [
  'mistral-medium-latest',
  'mistral-small-latest',
  'magistral-medium-latest',
  'magistral-small-latest',
  'ministral-14b-latest',
] as const;
const AnthropicModels = ['claude-sonnet-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-haiku-4-5'] as const;
const VLLMModels = [] as const;

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
  vllm: {
    name: 'vllm' as const
  },
};

// Create a record of all providers with false values, this will be used to
// check if a provider api key is defined in the environment variables.
export const envKeys = Object.fromEntries(
  Object.keys(AIProviders).map((key) => [key, false])
) as Record<SupportedProvidersNamesType, boolean>;
