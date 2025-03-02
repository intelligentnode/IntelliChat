import { z } from 'zod';
import { AIProviders } from './ai-providers';

// List of supported provider names (e.g. 'openai', 'replicate', etc.)
export const providerNames = Object.keys(AIProviders) as [
  keyof typeof AIProviders,
  ...Array<keyof typeof AIProviders>,
];

// Create a validator for a given provider
const createProviderValidator = (
  provider: (typeof AIProviders)[keyof typeof AIProviders]
) => {
  return z.object({
    name: z.literal(provider.name),
    model: provider.name !== 'azure' ? z.enum(provider.models) : z.string(),
    apiKey: z.string(),
  });
};

export const openAIValidator = createProviderValidator(AIProviders.openai);
export type openAIType = z.infer<typeof openAIValidator>;

export const replicateValidator = createProviderValidator(
  AIProviders.replicate
);
export type replicateType = z.infer<typeof replicateValidator>;

export const cohereValidator = createProviderValidator(AIProviders.cohere);
export type cohereType = z.infer<typeof cohereValidator>;

export const googleValidator = createProviderValidator(AIProviders.google);
export type googleType = z.infer<typeof googleValidator>;

export const azureValidator = createProviderValidator(AIProviders.azure).extend(
  { resourceName: z.string(), embeddingName: z.string() }
);
export type azureType = z.infer<typeof azureValidator>;

export const mistralValidator = createProviderValidator(AIProviders.mistral);
export type mistralType = z.infer<typeof mistralValidator>;

export const anthropicValidator = createProviderValidator(AIProviders.anthropic);
export type anthropicType = z.infer<typeof anthropicValidator>;

export const vllmValidator = z.object({
  name: z.literal('vllm'),
  model: z.string().min(1, { message: "Model is required" }).or(z.literal("")),
  apiKey: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.string().optional().default("")
  ),
  baseUrl: z.string().min(1, { message: "Base URL is required" }).or(z.literal("")),
});

export const ProvidersValidator = z.object({
  openai: openAIValidator.optional(),
  replicate: replicateValidator.optional(),
  cohere: cohereValidator.optional(),
  google: googleValidator.optional(),
  azure: azureValidator.optional(),
  mistral: mistralValidator.optional(),
  anthropic: anthropicValidator.optional(),
  vllm: vllmValidator.optional(),
});

export type vllmType = z.infer<typeof vllmValidator>;

export type SupportedProvidersType = z.infer<typeof ProvidersValidator>;
export type SupportedProvidersNamesType = keyof SupportedProvidersType;

// Create a validator for the chatbot payload
export const chatbotValidator = z.object({
  messages: z.array(
    z.object({
      content: z.string(),
      role: z.enum(['user', 'assistant']),
    })
  ),
  provider: z.enum(providerNames),
  providers: ProvidersValidator,
  systemMessage: z.string().optional(),
  withContext: z.boolean(),
  stream: z.boolean(),
  intellinodeData: z.boolean(),
  oneKey: z.string().optional(),
  n: z.number().optional(),
});
export type PostMessagePayload = z.infer<typeof chatbotValidator>;
