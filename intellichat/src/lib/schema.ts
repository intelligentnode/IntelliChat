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
      openai: z.boolean().optional(),
      replicate: z.boolean().optional(),
      azure: z.boolean().optional(),
      google: z.boolean().optional(),
      cohere: z.boolean().optional(),
    }),
  })
  .superRefine((data, ctx) => {
    const name = data.providerName;
    const keyValue = data[`${name}Key`];
    const keyExists = keyValue !== '' || data.envKeyExist[name];
    if (!data.oneKey && !keyExists) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${name} API Key is required`,
        path: [`${name}Key`],
      });
    }

    if (data.withContext && !data.envKeyExist.openai && !data.openaiKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OpenAI API Key is required.',
        path: ['openaiKey'],
      });
    }
  });
