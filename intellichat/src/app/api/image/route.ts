import { NextResponse } from 'next/server';
import { imageRequestValidator } from '@/lib/validators';
import { generateImage } from '@/lib/intellinode';
import { errorMessage } from '@/lib/helpers';

// Generate one image from a prompt; answers { image: <data URL> }.
export async function POST(req: Request) {
  const parsed = imageRequestValidator.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { prompt, images, providers } = parsed.data;
  try {
    const image = await generateImage(prompt, images, providers);
    return NextResponse.json({ image, provider: images.provider });
  } catch (error) {
    console.error('Image error:', error);
    return NextResponse.json({ error: errorMessage(error) || 'unable to generate the image' }, { status: 400 });
  }
}

export const maxDuration = 180;
