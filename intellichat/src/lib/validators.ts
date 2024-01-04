import { z } from 'zod';

export const openAIValidator = z.object({
  name: z.literal('openai'),
  model: z.enum(['gpt-3.5-turbo', 'gpt-4']),
  apiKey: z.string(),
});

export const replicateValidator = z.object({
  name: z.literal('replicate'),
  model: z.enum([
    '70b-chat',
    '13b-chat',
    '34b-code',
    '34b-python',
    '13b-code-instruct',
  ]),
  apiKey: z.string(),
});

export const cohereValidator = z.object({
  name: z.literal('cohere'),
  model: z.enum(['command']),
  apiKey: z.string(),
});

export const azureValidator = z.object({
  name: z.literal('azure'),
  model: z.string(),
  resourceName: z.string(),
  embeddingName: z.string(),
  apiKey: z.string(),
});

export const chatbotValidator = z.object({
  messages: z.array(
    z.object({
      content: z.string(),
      role: z.enum(['user', 'assistant']),
    })
  ),
  provider: z.enum(['openai', 'replicate', 'azure', 'cohere']),
  providers: z.object({
    openai: openAIValidator.optional(),
    replicate: replicateValidator.optional(),
    azure: azureValidator.optional(),
    cohere: cohereValidator.optional(),
  }),

  systemMessage: z.string().optional(),
  withContext: z.boolean(),
  intellinodeData: z.boolean(),
  oneKey: z.string().optional(),
  n: z.number().optional(),
});

export type azureType = z.infer<typeof azureValidator>;
export type openAIType = z.infer<typeof openAIValidator>;
export type replicateType = z.infer<typeof replicateValidator>;
export type cohereType = z.infer<typeof cohereValidator>;

export type PostMessagePayload = z.infer<typeof chatbotValidator>;
