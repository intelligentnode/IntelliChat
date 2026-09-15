import { NextResponse } from 'next/server';
import { requestGitHub } from '@/lib/github';
import { envKey } from '@/lib/intellinode';
import { errorMessage } from '@/lib/helpers';

// Repo reads and code search only, so GITHUB_TOKEN cannot reach other GitHub endpoints.
const ALLOWED = /^\/(repos\/[\w.-]+\/[\w.-]+(\/[^?#\s]*)?(\?[^#\s]*)?|search\/code\?[^#\s]+)$/;

// GitHub requests with GITHUB_TOKEN from .env; the token never reaches the browser.
export async function POST(req: Request) {
  const token = envKey('github');
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_TOKEN is not set on the server.' }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const path = typeof body.path === 'string' ? body.path : '';
  if (!ALLOWED.test(path) || /\.\.|%2e/i.test(path)) {
    return NextResponse.json({ error: 'This GitHub request is not allowed.' }, { status: 400 });
  }
  try {
    const data = await requestGitHub(path, { token, raw: Boolean(body.raw), signal: req.signal });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) || 'The GitHub request failed.' }, { status: 400 });
  }
}
