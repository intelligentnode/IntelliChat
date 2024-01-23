import { z } from 'zod';
import { ProvidersValidator, providerNames } from './validators';

export const formSchema = z
  .object({
    systemMessage: z.string(),
    numberOfMessages: z.number().min(2).max(6),
    providerName: z.enum(providerNames),
    providerModel: z.string().optional(),
    providers: ProvidersValidator,
    withContext: z.boolean(),
    intellinodeData: z.boolean(),
    oneKey: z.string().optional(),
    envKeys: z.record(z.boolean()),
  })
  .superRefine((data, ctx) => {
    const name = data.providerName;
    const keyValue = data.providers[name]?.apiKey;
    const envKey = data.envKeys[name];
    const keyExists = keyValue || envKey;
    const openAi = data.providers.openai;

    // API Key is required if oneKey is not set
    if ((!data.intellinodeData || !data.oneKey) && !keyExists) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${name} API Key is required`,
        path: [`providers.${name}.apiKey`],
      });
    }

    // OpenAI API Key is required if withContext is true
    if (data.withContext && !data.envKeys.openAi && !openAi?.apiKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OpenAI API Key is required.',
        path: ['openaiKey'],
      });
    }
  });
