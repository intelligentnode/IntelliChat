import { NextResponse } from 'next/server';
import { speechRequestValidator } from '@/lib/validators';
import { synthesizeSpeech } from '@/lib/intellinode';
import { errorMessage } from '@/lib/helpers';

// Read a reply aloud; answers MP3 audio.
export async function POST(req: Request) {
  const parsed = speechRequestValidator.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { text, speech, providers } = parsed.data;
  try {
    const audio = await synthesizeSpeech(text, speech, providers);
    return new Response(audio, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Speech error:', error);
    return NextResponse.json({ error: errorMessage(error) || 'unable to generate speech' }, { status: 400 });
  }
}

export const maxDuration = 60;
