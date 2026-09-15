import { NextResponse } from 'next/server';
import { ProvidersValidator } from '@/lib/validators';
import { transcribeAudio } from '@/lib/intellinode';
import { errorMessage } from '@/lib/helpers';

// Turn a recording or an audio file into text; multipart form with `file`, optional `providers` JSON and `apiKey`.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: 'No audio received.' }, { status: 400 });
    }
    const providersField = form.get('providers');
    const providers = typeof providersField === 'string' && providersField
      ? ProvidersValidator.parse(JSON.parse(providersField))
      : undefined;
    const override = form.get('apiKey');
    const filename = (file as File).name || 'audio.webm';
    const text = await transcribeAudio(file, filename, providers, typeof override === 'string' ? override : undefined);
    return NextResponse.json({ text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: errorMessage(error) || 'unable to transcribe the audio' }, { status: 400 });
  }
}

export const maxDuration = 120;
