import { getChatProviderKey } from '@/lib/intellinode';
import { NextResponse } from 'next/server';

// Check if the user has set up their API keys for OpenAI and Replicate in .env
export async function GET() {
  const OpenAIKey = getChatProviderKey('openai');
  const ReplicateKey = getChatProviderKey('replicate');
  const CohereKey = getChatProviderKey('cohere');
  const GoogleKey = getChatProviderKey('google');
  const AzureKey = getChatProviderKey('azure');
  const MistralKey = getChatProviderKey('mistral');
  const anthropicKey = getChatProviderKey('anthropic');

  return NextResponse.json({
    openai: !!OpenAIKey,
    replicate: !!ReplicateKey,
    cohere: !!CohereKey,
    google: !!GoogleKey,
    azure: !!AzureKey,
    mistral: !!MistralKey,
    anthropic: !!anthropicKey,
  });
}
