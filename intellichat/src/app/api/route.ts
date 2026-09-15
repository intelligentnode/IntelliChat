import { NextResponse } from 'next/server';
import { envKeyStatus } from '@/lib/intellinode';

// Which API keys are set in the environment (never the values).
export async function GET() {
  return NextResponse.json(envKeyStatus());
}

// read the environment on every request, so keys added to .env after the build are picked up
export const dynamic = 'force-dynamic';
