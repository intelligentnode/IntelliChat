import { NextResponse } from 'next/server';
import { chatbotValidator } from '@/lib/validators';
import { getChatProviderKey, getChatResponse, resolveVendorKey } from '@/lib/intellinode';
import { isKeyless, supportsStreaming } from '@/lib/ai-providers';
import { errorMessage } from '@/lib/helpers';
import { STREAM_ERROR_MARKER } from '@/lib/types';

const defaultSystemMessage = 'You are a helpful assistant. Format response in Markdown where needed.';

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = chatbotValidator.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { messages, providers, provider, systemMessage = defaultSystemMessage, n = 2, withContext, stream } = parsed.data;
  const settings = providers[provider];
  if (!settings) {
    return NextResponse.json({ error: `No settings for the ${provider} provider.` }, { status: 400 });
  }

  const key = getChatProviderKey(provider, providers);
  if (!key && !isKeyless(provider)) {
    return NextResponse.json({ error: `No API key for ${provider}. Add it in the settings or in the .env file.` }, { status: 400 });
  }

  // the context feature embeds the history with OpenAI
  const contextKey = withContext ? resolveVendorKey('openai', providers) : null;
  if (withContext && !contextKey) {
    return NextResponse.json({ error: 'An OpenAI API key is needed for the context feature: add it in the settings or in .env.' }, { status: 400 });
  }

  const chatSystemMessage = systemMessage.trim() !== '' ? systemMessage : defaultSystemMessage;
  const shouldStream = stream && supportsStreaming(provider) && req.headers.get('Accept') === 'text/event-stream';
  const options = {
    provider,
    settings,
    apiKey: key,
    systemMessage: chatSystemMessage,
    messages,
    withContext,
    contextKey,
    n,
    signal: req.signal,
  };

  if (shouldStream) {
    const encoder = new TextEncoder();
    const transform = new TransformStream();
    const writer = transform.writable.getWriter();

    getChatResponse({
      ...options,
      stream: true,
      onChunk: async (chunk) => {
        await writer.write(encoder.encode(chunk));
      },
    })
      .catch(async (error) => {
        if (req.signal.aborted) return; // the user pressed Stop
        console.error('Streaming error:', error);
        try {
          const message = errorMessage(error) || 'Something went wrong; unable to generate a response.';
          await writer.write(encoder.encode(`${STREAM_ERROR_MARKER}${message}`));
        } catch (writeError) {
          // the client went away
        }
      })
      .finally(async () => {
        try {
          await writer.close();
        } catch (closeError) {
          // already closed by the client
        }
      });

    return new Response(transform.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  try {
    const text = await getChatResponse({ ...options, stream: false });
    return NextResponse.json({ response: [text] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: errorMessage(error) || 'invalid api key or provider' }, { status: 400 });
  }
}

export const maxDuration = 180;
