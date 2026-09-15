import { NextResponse } from 'next/server';
import path from 'path';
import { z } from 'zod';
import { ProvidersValidator, providerNames } from '@/lib/validators';
import { getChatProviderKey, runAgentStep } from '@/lib/intellinode';
import { isKeyless, providerConfig, supportsTools } from '@/lib/ai-providers';
import { codingSystemPrompt, localEditTools, localReadTools, repoTools } from '@/lib/code-tools';
import { errorMessage } from '@/lib/helpers';

const toolCall = z.object({
  id: z.string(),
  type: z.literal('function').default('function'),
  function: z.object({ name: z.string(), arguments: z.string() }),
  thoughtSignature: z.string().optional(),
});

const agentMessage = z.union([
  z.object({ role: z.literal('user'), content: z.string(), image: z.string().optional() }),
  z.object({ role: z.literal('assistant'), content: z.string(), toolCalls: z.array(toolCall).optional() }),
  z.object({
    role: z.literal('tool'),
    results: z.array(z.object({ id: z.string(), name: z.string(), content: z.string(), isError: z.boolean().optional() })),
  }),
]);

const codeRequestValidator = z.object({
  provider: z.enum(providerNames),
  providers: ProvidersValidator,
  systemMessage: z.string().optional(),
  messages: z.array(agentMessage).min(1),
  repo: z.object({ owner: z.string(), repo: z.string(), branch: z.string() }).nullable().optional(),
  local: z.boolean().optional(),
  allowEdits: z.boolean().optional(),
  finalize: z.boolean().optional(),
});

// One step of the coding assistant; the browser runs the tools it asks for and calls again.
export async function POST(req: Request) {
  const parsed = codeRequestValidator.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { provider, providers, systemMessage, messages, repo, local, allowEdits, finalize } = parsed.data;
  const settings = providers[provider];
  if (!settings) {
    return NextResponse.json({ error: `No settings for the ${provider} provider.` }, { status: 400 });
  }
  if (!supportsTools(provider)) {
    return NextResponse.json({ error: `${providerConfig(provider).label} cannot use tools. Switch to OpenAI, Anthropic, Gemini, Mistral or a local model to work with repos and files.` }, { status: 400 });
  }
  const apiKey = getChatProviderKey(provider, providers);
  if (!apiKey && !isKeyless(provider)) {
    return NextResponse.json({ error: `No API key for ${provider}. Add it in the settings or in the .env file.` }, { status: 400 });
  }

  const workspace = local && process.env.CODE_WORKSPACE?.trim() ? path.basename(path.resolve(process.env.CODE_WORKSPACE.trim())) : null;
  const tools = [...(repo ? repoTools : []), ...(workspace ? localReadTools : []), ...(workspace && allowEdits ? localEditTools : [])];
  if (!tools.length) {
    return NextResponse.json({ error: 'Connect a GitHub repo or turn on local files first.' }, { status: 400 });
  }

  try {
    const result = await runAgentStep({
      provider,
      settings,
      apiKey,
      messages,
      tools,
      finalize,
      signal: req.signal,
      systemMessage: codingSystemPrompt({ repo, local: workspace, allowEdits: Boolean(workspace && allowEdits), base: systemMessage }),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Code step error:', error);
    return NextResponse.json({ error: errorMessage(error) || 'The coding assistant failed.' }, { status: 400 });
  }
}

export const maxDuration = 180;
