import { z } from 'zod';

export const chatbotValidator = z.object({
  messages: z.array(
    z.object({
      content: z.string(),
      role: z.enum(['user', 'assistant']),
    })
  ),
  apiKey: z.string().optional(),
  provider: z.enum(['openai', 'replicate']).optional(),
  systemMessage: z.string().optional(),
});

export type PostMessagePayload = z.infer<typeof chatbotValidator>;
