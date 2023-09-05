import { NextResponse } from 'next/server';
import { Chatbot } from 'intellinode';
import { chatbotValidator } from '@/lib/validators';
import { addMessages, getChatInput } from '@/lib/intellinode';

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
    provider = 'openai',
    systemMessage = 'You are a helpful assistant. Format response in Markdown where needed.',
  } = parsedJson.data;

  const key = apiKey || process.env.OPENAI_API_KEY;

  if (!key) {
    return NextResponse.json(
      {
        error:
          'no api key provided, either add it to your .env file or in the app settings',
      },
      { status: 400 }
    );
  }

  try {
    const chatbot = new Chatbot(key, provider);
    const input = getChatInput(provider, systemMessage);
    addMessages(input, messages);
    const response = await chatbot.chat(input);
    const responseMsgs = response.messages.map((msg: string) => msg);

    return NextResponse.json({ messages: 'hi' });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'invalid api key or provider',
      },
      { status: 400 }
    );
  }
}
