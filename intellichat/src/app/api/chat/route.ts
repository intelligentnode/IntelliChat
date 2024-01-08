import { NextResponse } from 'next/server';
import { chatbotValidator } from '@/lib/validators';
import {
  getAzureChatResponse,
  getChatProviderKey,
  getChatResponse,
} from '@/lib/intellinode';

const defaultSystemMessage =
  'You are a helpful assistant. Format response in Markdown where needed.';
const defaultProvider = 'openai';

export async function POST(req: Request) {
  const json = await req.json();
  const parsedJson = chatbotValidator.safeParse(json);

  if (!parsedJson.success) {
    const { error } = parsedJson;
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const {
    messages,
    providers,
    provider = defaultProvider,
    systemMessage = defaultSystemMessage,
    n = 2,
    withContext,
    intellinodeData,
    oneKey,
  } = parsedJson.data;

  const key =
    (provider && providers[provider]?.apiKey) || getChatProviderKey(provider);
  const contextKey = providers.openai?.apiKey || getChatProviderKey('openai');

  if (!key) {
    const missingKeyError = `no api key provided for ${provider}, either add it to your .env file or in the chat settings`;
    return NextResponse.json({ error: missingKeyError }, { status: 400 });
  }

  if (!contextKey) {
    const missingContextKey = `OpenAi key was not provided, either add it to your .env file or in the chat settings`;
    return NextResponse.json({ error: missingContextKey }, { status: 400 });
  }

  if (intellinodeData && !oneKey) {
    const missingOneKey = `oneKey is required when intellinodeData is enabled`;
    return NextResponse.json({ error: missingOneKey }, { status: 400 });
  }

  const chatSystemMessage =
    systemMessage.trim() !== '' ? systemMessage : defaultSystemMessage;
  const chatProvider = provider || defaultProvider;

  try {
    if (chatProvider === 'azure' && providers.azure) {
      const responses = await getAzureChatResponse({
        provider: { ...providers.azure, apiKey: key },
        systemMessage: chatSystemMessage,
        withContext,
        messages,
        n,
        oneKey,
      });
      return NextResponse.json({ response: responses });
    } else if (providers[provider] && providers[provider].name !== 'azure') {
      const responses = await getChatResponse({
        provider: { ...providers[provider], apiKey: key },
        systemMessage: chatSystemMessage,
        withContext,
        contextKey,
        messages,
        n,
        oneKey,
      });
      return NextResponse.json({ response: responses });
    }
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      {
        error: 'invalid api key or provider',
      },
      { status: 400 }
    );
  }
}

export const maxDuration = 180;
