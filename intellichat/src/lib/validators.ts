import { z } from 'zod';
import {
  AIProviders,
  ImageProviders,
  OpenAIVoices,
  SpeechProviders,
  imageProviderNames,
  providerNames,
  speechProviderNames,
} from './ai-providers';

export { providerNames };

// Create a validator for a given chat provider: a model from the list when the provider has one,
// otherwise free text; local and OpenAI-compatible servers also take a base URL.
const createProviderValidator = (provider: (typeof AIProviders)[keyof typeof AIProviders]) => {
  const config = provider as { name: string; models?: readonly string[]; kind: string; keyless?: boolean };
  return z.object({
    name: z.literal(config.name),
    model: config.models && config.models.length && config.kind === 'cloud'
      ? z.enum(config.models as unknown as [string, ...string[]])
      : z.string().default(''),
    apiKey: z.preprocess((value) => (value === null ? undefined : value), z.string().optional().default('')),
    baseUrl: z.string().optional().default(''),
  });
};

export const openAIValidator = createProviderValidator(AIProviders.openai);
export type openAIType = z.infer<typeof openAIValidator>;

export const replicateValidator = createProviderValidator(AIProviders.replicate);
export type replicateType = z.infer<typeof replicateValidator>;

export const cohereValidator = createProviderValidator(AIProviders.cohere);
export type cohereType = z.infer<typeof cohereValidator>;

export const googleValidator = createProviderValidator(AIProviders.google);
export type googleType = z.infer<typeof googleValidator>;

export const azureValidator = createProviderValidator(AIProviders.azure).extend({
  resourceName: z.string().default(''),
  embeddingName: z.string().default(''),
});
export type azureType = z.infer<typeof azureValidator>;

export const mistralValidator = createProviderValidator(AIProviders.mistral);
export type mistralType = z.infer<typeof mistralValidator>;

export const anthropicValidator = createProviderValidator(AIProviders.anthropic);
export type anthropicType = z.infer<typeof anthropicValidator>;

export const openrouterValidator = createProviderValidator(AIProviders.openrouter);
export const groqValidator = createProviderValidator(AIProviders.groq);
export const deepseekValidator = createProviderValidator(AIProviders.deepseek);
export const ollamaValidator = createProviderValidator(AIProviders.ollama);
export const lmstudioValidator = createProviderValidator(AIProviders.lmstudio);
export const vllmValidator = createProviderValidator(AIProviders.vllm);
export type vllmType = z.infer<typeof vllmValidator>;

export const ProvidersValidator = z.object({
  openai: openAIValidator.optional(),
  anthropic: anthropicValidator.optional(),
  google: googleValidator.optional(),
  cohere: cohereValidator.optional(),
  mistral: mistralValidator.optional(),
  replicate: replicateValidator.optional(),
  openrouter: openrouterValidator.optional(),
  groq: groqValidator.optional(),
  deepseek: deepseekValidator.optional(),
  ollama: ollamaValidator.optional(),
  lmstudio: lmstudioValidator.optional(),
  vllm: vllmValidator.optional(),
  azure: azureValidator.optional(),
});

export type SupportedProvidersType = z.infer<typeof ProvidersValidator>;
export type SupportedProvidersNamesType = keyof SupportedProvidersType;
export type ProviderSettings = NonNullable<SupportedProvidersType[SupportedProvidersNamesType]>;

// Image generation settings: the provider and an optional key (OpenAI reuses the chat key)
export const ImagesValidator = z.object({
  provider: z.enum(imageProviderNames).default('openai'),
  apiKey: z.string().optional().default(''),
});
export type ImagesSettings = z.infer<typeof ImagesValidator>;

// Speech settings: read aloud provider, voice and an optional key (OpenAI reuses the chat key)
export const SpeechValidator = z.object({
  provider: z.enum(speechProviderNames).default('openai'),
  voice: z.enum(OpenAIVoices).default('alloy'),
  readAloud: z.boolean().default(false),
  apiKey: z.string().optional().default(''),
});
export type SpeechSettings = z.infer<typeof SpeechValidator>;

// Coding assistant: connect GitHub repos (a token is optional for public repos) and use local files when CODE_WORKSPACE is set
export const CodeValidator = z.object({
  github: z.boolean().default(false),
  githubToken: z.string().optional().default(''),
  localFiles: z.boolean().default(true),
  allowEdits: z.boolean().default(false),
});
export type CodeSettings = z.infer<typeof CodeValidator>;

const messageValidator = z.object({
  content: z.string(),
  role: z.enum(['user', 'assistant']),
  // an attached image as a data URL
  image: z.string().optional(),
});

// Create a validator for the chatbot payload
export const chatbotValidator = z.object({
  messages: z.array(messageValidator),
  provider: z.enum(providerNames),
  providers: ProvidersValidator,
  systemMessage: z.string().optional(),
  withContext: z.boolean(),
  stream: z.boolean(),
  n: z.number().optional(),
});
export type PostMessagePayload = z.infer<typeof chatbotValidator>;

// /api/image
export const imageRequestValidator = z.object({
  prompt: z.string().min(1),
  images: ImagesValidator,
  providers: ProvidersValidator,
});
export type ImageRequestPayload = z.infer<typeof imageRequestValidator>;

// /api/speech
export const speechRequestValidator = z.object({
  text: z.string().min(1),
  speech: SpeechValidator,
  providers: ProvidersValidator,
});
export type SpeechRequestPayload = z.infer<typeof speechRequestValidator>;

// /api/models
export const modelsRequestValidator = z.object({
  provider: z.enum(providerNames),
  apiKey: z.string().optional().default(''),
  baseUrl: z.string().optional().default(''),
});

export { ImageProviders, SpeechProviders };
