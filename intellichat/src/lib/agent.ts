// The coding assistant loop in the browser: ask /api/code for the next step, run the tools it requests (GitHub reads
// from here, local files through /api/workspace) and repeat until the model answers. Each request stays short.
import type { AgentMessage, AgentStep, ToolCall, ToolResult } from './types';
import { runRepoTool, type ConnectedRepo, type GitHubAccess, type ToolOutput } from './github';
import { stepTarget, toolTitle } from './code-tools';
import type { PostMessagePayload } from './validators';

const MAX_ROUNDS = 12;
const MAX_RESULT_CHARS = 24000;

export type AgentOptions = {
  settings: Omit<PostMessagePayload, 'messages'>;
  messages: AgentMessage[];
  repo: ConnectedRepo | null;
  local: boolean;
  allowEdits: boolean;
  access: GitHubAccess;
  signal: AbortSignal;
  onSteps: (steps: AgentStep[]) => void;
};

async function post(url: string, body: unknown, signal: AbortSignal) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || `The request failed with status ${response.status}.`);
  return json;
}

function parseArgs(call: ToolCall): Record<string, any> {
  try {
    const value = JSON.parse(call.function.arguments || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function runTool(name: string, args: Record<string, any>, options: AgentOptions): Promise<ToolOutput> {
  if (name.startsWith('repo_')) {
    if (!options.repo) throw new Error('No GitHub repo is connected.');
    return runRepoTool(name, args, options.repo, options.access, options.signal);
  }
  return post('/api/workspace', { tool: name, args, allowEdits: options.allowEdits }, options.signal);
}

/** Run one coding assistant turn; `onSteps` receives the timeline after every change. */
export async function runAgent(options: AgentOptions): Promise<{ text: string; steps: AgentStep[] }> {
  const { settings, repo, local, allowEdits, signal, onSteps } = options;
  const messages = [...options.messages];
  const steps: AgentStep[] = [];
  const request = { provider: settings.provider, providers: settings.providers, systemMessage: settings.systemMessage, repo, local, allowEdits };
  const publish = () => onSteps(steps.map((step) => ({ ...step })));

  for (let round = 0; round <= MAX_ROUNDS; round++) {
    // after the last round of tools, ask for the answer with what was found
    const finalize = round === MAX_ROUNDS;
    const { content, toolCalls } = await post('/api/code', { ...request, messages, finalize }, signal);
    if (finalize || !Array.isArray(toolCalls) || toolCalls.length === 0) return { text: content || '', steps };

    messages.push({ role: 'assistant', content: content || '', toolCalls });
    const results: ToolResult[] = [];
    for (let index = 0; index < toolCalls.length; index++) {
      const call = toolCalls[index] as ToolCall;
      const name = call.function.name;
      const args = parseArgs(call);
      const step: AgentStep = { id: `${round}-${index}-${call.id}`, tool: name, title: toolTitle(name), target: stepTarget(name, args), state: 'running' };
      steps.push(step);
      publish();
      try {
        const output = await runTool(name, args, options);
        const failed = output.content.startsWith('Error');
        Object.assign(step, { state: failed ? 'error' : 'done', summary: output.summary, diff: output.diff });
        results.push({ id: call.id, name, content: output.content.slice(0, MAX_RESULT_CHARS), isError: failed });
      } catch (error) {
        if (signal.aborted) throw error;
        const message = error instanceof Error ? error.message : String(error);
        Object.assign(step, { state: 'error', summary: message });
        results.push({ id: call.id, name, content: `Error: ${message}`, isError: true });
      }
      publish();
    }
    messages.push({ role: 'tool', results });
  }
  return { text: '', steps };
}
