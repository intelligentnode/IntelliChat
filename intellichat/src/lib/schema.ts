import { z } from 'zod';
import { ImagesValidator, ProvidersValidator, SpeechValidator, providerNames } from './validators';
import { hasModelList, isKeyless, providerConfig } from './ai-providers';

export const formSchema = z
  .object({
    systemMessage: z.string(),
    numberOfMessages: z.number().min(2).max(6),
    providerName: z.enum(providerNames),
    providerModel: z.string().optional(),
    providers: ProvidersValidator,
    withContext: z.boolean(),
    stream: z.boolean(),
    images: ImagesValidator,
    speech: SpeechValidator,
    envKeys: z.record(z.boolean()),
  })
  .superRefine((data, ctx) => {
    const name = data.providerName;
    const settings = data.providers[name] as { apiKey?: string; model?: string; baseUrl?: string } | undefined;

    // providers without a fixed list need a model name typed or picked from the fetched list
    if (!hasModelList(name) && name !== 'azure' && !settings?.model?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A model name is required',
        path: ['providers', name, 'model'],
      });
    }
    // local servers and vLLM need their URL; hosted OpenAI-compatible APIs use the intellinode preset
    const kind = providerConfig(name).kind;
    if ((kind === 'local' || kind === 'vllm') && !settings?.baseUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The server URL is required',
        path: ['providers', name, 'baseUrl'],
      });
    }
    // an API key from the settings or from the environment, unless the provider is local
    if (!isKeyless(name)) {
      const keyExists = settings?.apiKey?.trim() || data.envKeys[name];
      if (!keyExists) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: providerConfig(name).envKey
            ? `Add your key or set ${providerConfig(name).envKey} in .env.`
            : 'An API key is required.',
          path: ['providers', name, 'apiKey'],
        });
      }
    }
    // the context feature embeds the history with OpenAI
    if (data.withContext && !data.envKeys.openai && !data.providers.openai?.apiKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'An OpenAI API key is required for the context feature.',
        path: ['providers', 'openai', 'apiKey'],
      });
    }
  });
