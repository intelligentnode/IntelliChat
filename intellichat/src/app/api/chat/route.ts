import { NextResponse } from 'next/server';
import { ChatContext, Chatbot } from 'intellinode';
import { chatbotValidator } from '@/lib/validators';
import {
  addMessages,
  getChatInput,
  getChatProviderKey,
} from '@/lib/intellinode';

const defaultSystemMessage =
  'You are a helpful assistant. Format response in Markdown where needed.';
const defaultProvider = {
  name: 'openai' as const,
  model: 'gpt-3.5-turbo' as const,
};

export async function POST(req: Request) {
  const json = await req.json();

  const parsedJson = chatbotValidator.safeParse(json);

  if (!parsedJson.success) {
    const { error } = parsedJson;
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const {
    messages,
    apiKeys,
    provider = defaultProvider,
    systemMessage = defaultSystemMessage,
    n = 2,
    withContext,
  } = parsedJson.data;

  const key =
    (apiKeys && apiKeys[provider.name]) || getChatProviderKey(provider.name);
  const contextKey = apiKeys?.openai || getChatProviderKey('openai');

  if (!key) {
    return NextResponse.json(
      {
        error:
          'no api key provided, either add it to your .env file or in the chat settings',
      },
      { status: 400 }
    );
  }

  if (!contextKey) {
    return NextResponse.json(
      {
        error:
          'OpenAi key was not provided, either add it to your .env file or in the chat settings',
      },
      { status: 400 }
    );
  }

  const chatSystemMessage =
    systemMessage.trim() !== '' ? systemMessage : defaultSystemMessage;
  const chatProvider = provider || defaultProvider;

  // context is always true if the chat provider is openai
  const useContext = chatProvider.name === 'openai' || withContext;

  try {
    const chatbot = new Chatbot(key, chatProvider.name);
    // get the input for the chatbot
    const input = getChatInput(
      chatProvider.name,
      chatProvider.model,
      chatSystemMessage
    );
    // add the messages to the input
    // if the user wants to use context, get the context and add it to the input
    // otherwise, just add the messages
    if (useContext) {
      const contextProvider = defaultProvider;
      const context = new ChatContext(contextKey, contextProvider.name);
      // extract the last message from the array; this is the user's message
      const userMessage = messages[messages.length - 1].content;
      // get the closest context to the user's message
      const contextResponse = await context.getRoleContext(
        userMessage,
        messages,
        n
      );
      addMessages(input, contextResponse);
    } else {
      addMessages(input, messages);
    }

    const response = await chatbot.chat(input);

    return NextResponse.json({ response: response[0] });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'invalid api key or provider',
      },
      { status: 400 }
    );
  }
}
