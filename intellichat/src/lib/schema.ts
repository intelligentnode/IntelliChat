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
    stream: z.boolean(),
    intellinodeData: z.boolean(),
    oneKey: z.string().optional(),
    envKeys: z.record(z.boolean()),
  })
  .superRefine((data, ctx) => {
    const name = data.providerName;
    if (name === 'vllm') {
      // For vLLM, require that the nested model and baseUrl are non-empty.
      if (!data.providers.vllm?.model || data.providers.vllm.model.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "vLLM model is required",
          path: ["providers", "vllm", "model"],
        });
      }
      if (!data.providers.vllm?.baseUrl || data.providers.vllm.baseUrl.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "vLLM Base URL is required",
          path: ["providers", "vllm", "baseUrl"],
        });
      }
    } else {
      // For non-vllm providers, ensure that an API key exists.
      const keyValue = data.providers[name]?.apiKey;
      const envKey = data.envKeys[name];
      const keyExists = keyValue || envKey;
      if ((!data.intellinodeData || !data.oneKey) && !keyExists) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${name} API Key is required`,
          path: ["providers", name, "apiKey"],
        });
      }
    }
    // If withContext is enabled, enforce that OpenAI has a key.
    if (data.withContext && !data.envKeys.openAi && !data.providers.openai?.apiKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OpenAI API Key is required.',
        path: ['openaiKey'],
      });
    }
  });
