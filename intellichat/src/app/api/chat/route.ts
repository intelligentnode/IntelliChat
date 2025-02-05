import { NextResponse } from 'next/server';
import { chatbotValidator } from '@/lib/validators';
import {
  getAzureChatResponse,
  getChatProviderKey,
  getChatResponse,
  getDefaultProviderKey,
} from '@/lib/intellinode';
import { serializeError } from '@/lib/helpers';

const defaultSystemMessage =
  'You are a helpful assistant. Format response in Markdown where needed.';
const defaultProvider = 'openai';

export async function POST(req: Request) {
  const json = await req.json();
  const parsedJson : any = chatbotValidator.safeParse(json);

  if (!parsedJson.success) {
    const { error } = parsedJson;
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const {
    messages,
    providers,
    provider,
    systemMessage = defaultSystemMessage,
    n = 2,
    withContext,
    intellinodeData,
    oneKey,
    stream: streamResponse,
  } = parsedJson.data;

  const key =
    (provider && providers[provider]?.apiKey) ||
    getChatProviderKey(provider) ||
    getDefaultProviderKey(provider, oneKey);

  if (!key) {
    console.log('error');
    const missingKeyError = `no api key provided for ${provider}, either add it to your .env file or in the chat settings`;
    return NextResponse.json({ error: missingKeyError }, { status: 400 });
  }

  const contextKey = providers.openai?.apiKey || getChatProviderKey('openai');

  if (withContext && !contextKey) {
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
  const chatProviderProps = providers[chatProvider];

  try {
    if (chatProvider === 'azure' && providers.azure) {
      const responses = await getAzureChatResponse({
        provider: { ...providers.azure, apiKey: key },
        systemMessage: chatSystemMessage,
        withContext,
        messages,
        n,
        oneKey: intellinodeData ? oneKey : undefined,
      });
      return NextResponse.json({ response: responses });
    } else if (chatProviderProps && chatProviderProps?.name !== 'azure') {
      let shouldStream = (chatProviderProps.name === 'openai' || chatProviderProps.name === 'cohere') && req.headers.get('Accept') === 'text/event-stream';

      if (shouldStream) {
        const encoder = new TextEncoder();
        const stream = new TransformStream();
        const writer = stream.writable.getWriter();

        // Start the streaming response
        getChatResponse({
          provider: { ...chatProviderProps, apiKey: key },
          systemMessage: chatSystemMessage,
          withContext,
          contextKey,
          messages,
          n,
          stream : streamResponse,
          oneKey: intellinodeData ? oneKey : undefined,
          intellinodeData,
          onChunk: async (chunk: string) => {
            try {
              // Ensure proper SSE format
              const data = `${chunk}`;
              await writer.write(encoder.encode(data));
            } catch (error) {
              console.error('Error writing chunk:', error);
              throw error;
            }
          },
        }).then(async () => {
          // Send end message and close the stream
          // await writer.write(encoder.encode('[DONE]\n\n'));
          await writer.close();
        }).catch(async (error) => {
          console.error('Streaming error:', error);
          // Safely serialize the error before sending to client
          try {
            const safeError = serializeError(error);
            if (
              chatProviderProps?.name === 'openai' &&
              ['o1', 'o1-mini'].includes(chatProviderProps.model)
            ) {
              await writer.write(
                encoder.encode(
                  `Model "${chatProviderProps.model}" does not support streaming. Please turn off streaming.`
                )
              );
            } else {
              await writer.write(
                encoder.encode(`Something went wrong; unable to generate a response.`)
              );
            }
          } finally {
            await writer.close();
          }
        });;

        return new Response(stream.readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } else {
        // Non-streaming response remains the same
        const responses = await getChatResponse({
          provider: { ...chatProviderProps, apiKey: key },
          systemMessage: chatSystemMessage,
          withContext,
          contextKey,
          messages,
          stream : false,
          n,
          oneKey: intellinodeData ? oneKey : undefined,
          intellinodeData,
        });

        return NextResponse.json({
          response: responses.result,
          references: responses.references,
        });
      }
    } 
  } catch (e) {
    console.error('Error:', e);
    return NextResponse.json(
      {
        error: 'invalid api key or provider',
      },
      { status: 400 }
    );
  }
}

export const maxDuration = 180;
