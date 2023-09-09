import { z } from 'zod';

const openAI = z.object({
  name: z.literal('openai'),
  model: z.enum(['gpt-3.5-turbo', 'gpt-4']),
});

const replicate = z.object({
  name: z.literal('replicate'),
  model: z.enum([
    '70b-chat',
    '13b-chat',
    '34b-code',
    '34b-python',
    '13b-code-instruct',
  ]),
});

export const chatbotValidator = z.object({
  messages: z.array(
    z.object({
      content: z.string(),
      role: z.enum(['user', 'assistant']),
    })
  ),
  apiKey: z.string().optional(),
  provider: z.union([openAI, replicate]).optional(),
  systemMessage: z.string().optional(),
});

export type PostMessagePayload = z.infer<typeof chatbotValidator>;
