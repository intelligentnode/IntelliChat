import { addMessages } from '@/lib/intellinode';
import { ChatContext, ChatGPTInput, Chatbot, ProxyHelper } from 'intellinode';
import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = '7f2d662bcae44c6f825758b176a257e0';
  const resourceName = 'medwrite-openai';
  const modelName = 'gpt_basic'; // input
  const embeddingName = 'embed_latest'; // context

  const proxy = new ProxyHelper();
  proxy.setAzureOpenai(resourceName);

  // chatbot
  const chatbot = new Chatbot(apiKey, 'openai', proxy);
  const context = new ChatContext(apiKey, 'openai', proxy);

  const system = 'You are a helpful assistant.';
  const input = new ChatGPTInput(system, {
    model: modelName,
  });
  const userMessage = 'Hello';
  const historyMessages: {
    role: 'user' | 'assistant';
    content: string;
  }[] = [
    { role: 'user', content: 'Dinner time' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'Good Morning' },
    { role: 'assistant', content: 'How can I help you' },
  ];
  try {
    const contextResponse = await context.getRoleContext(
      userMessage,
      historyMessages,
      2,
      embeddingName
    );
    addMessages(input, contextResponse);
    const responses = await chatbot.chat(input);

    return NextResponse.json(
      {
        response: responses[0],
      },
      {
        status: 200,
      }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      {
        response: e,
      },
      {
        status: 200,
      }
    );
  }
}
