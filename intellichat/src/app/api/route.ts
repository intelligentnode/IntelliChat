import { getChatProviderKey } from '@/lib/intellinode';
import { NextResponse } from 'next/server';

// Check if the user has set up their API keys for OpenAI and Replicate in .env
export async function GET() {
  const OpenAIKey = getChatProviderKey('openai');
  const ReplicateKey = getChatProviderKey('replicate');

  return NextResponse.json({
    openai: !!OpenAIKey,
    replicate: !!ReplicateKey,
  });
}
