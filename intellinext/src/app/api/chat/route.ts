import { NextResponse } from 'next/server';
import { Chatbot } from 'intellinode';
import { chatbotValidator } from '@/lib/validators';
import {
  addMessages,
  getChatInput,
  getChatProviderKey,
} from '@/lib/intellinode';

const defaultSystemMessage =
  'You are a helpful assistant. Format response in Markdown where needed.';
const defaultProvider = 'openai';

export async function POST(req: Request) {
  const json = await req.json();

  const parsedJson = chatbotValidator.safeParse(json);

  if (!parsedJson.success) {
    const { error } = parsedJson;
    return NextResponse.json({
      error: { message: 'Invalid', error },
    });
  }

  const {
    messages,
    apiKey,
    provider = defaultProvider,
    systemMessage = defaultSystemMessage,
  } = parsedJson.data;

  const key = apiKey || getChatProviderKey(provider);

  if (!key) {
    return NextResponse.json(
      {
        error:
          'no api key provided, either add it to your .env file or in the app settings',
      },
      { status: 400 }
    );
  }

  console.log(key);

  const chatSystemMessage =
    systemMessage.trim() !== '' ? systemMessage : defaultSystemMessage;
  const chatProvider = provider.trim() !== '' ? provider : defaultProvider;

  try {
    const chatbot = new Chatbot(key, chatProvider);
    const input = getChatInput(chatProvider, chatSystemMessage);
    addMessages(input, messages);
    const response = await chatbot.chat(input);

    return NextResponse.json({ response: response[0] });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'invalid api key or provider',
      },
      { status: 400 }
    );
  }
}
