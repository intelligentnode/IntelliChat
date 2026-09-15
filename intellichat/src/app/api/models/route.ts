import { NextResponse } from 'next/server';
import { modelsRequestValidator } from '@/lib/validators';
import { listProviderModels } from '@/lib/intellinode';
import { errorMessage } from '@/lib/helpers';

// The models served by an OpenAI-compatible, local or vLLM server; answers { models: string[] }.
export async function POST(req: Request) {
  const parsed = modelsRequestValidator.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { provider, apiKey, baseUrl } = parsed.data;
  try {
    const models = await listProviderModels(provider, apiKey, baseUrl);
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) || `unable to list the ${provider} models` }, { status: 400 });
  }
}
