import { z } from 'zod';

export const formSchema = z
  .object({
    systemMessage: z.string(),
    numberOfMessages: z.number().min(2).max(6),
    providerName: z.enum(['openai', 'replicate', 'azure', 'cohere', 'google']),
    providerModel: z.string(),
    openaiKey: z.string(),
    replicateKey: z.string(),
    cohereKey: z.string(),
    googleKey: z.string(),
    azureKey: z.string(),
    azureResourceName: z.string(),
    azureModelName: z.string(),
    azureEmbeddingName: z.string(),
    withContext: z.boolean(),
    intellinodeData: z.boolean(),
    oneKey: z.string().optional(),
    envKeyExist: z.object({
      openai: z.boolean(),
      replicate: z.boolean(),
    }),
  })
  .superRefine((data, ctx) => {
    if (
      (data.providerModel === 'openai' || data.withContext) &&
      !data.envKeyExist.openai &&
      !data.openaiKey
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OpenAI API Key is required.',
        path: ['openaiKey'],
      });
    }
    if (
      data.providerModel === 'replicate' &&
      !data.envKeyExist.replicate &&
      !data.replicateKey
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Replicate API Key is required.',
        path: ['replicateKey'],
      });
    }
  });
