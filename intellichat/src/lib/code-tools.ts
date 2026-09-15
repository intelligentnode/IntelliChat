// The coding assistant's tools, its system prompt and the labels of its timeline steps.
import type { ConnectedRepo } from './github';

const object = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required });
const text = (description: string) => ({ type: 'string', description });
const tool = (name: string, description: string, parameters: Record<string, unknown>) => ({
  type: 'function' as const,
  function: { name, description, parameters, strict: false },
});

export const repoTools = [
  tool('repo_list_files', 'List the files of the connected GitHub repo, optionally under one folder.', object({ path: text('Folder path; leave empty for the whole repo.') })),
  tool('repo_read_file', 'Read a file of the connected GitHub repo, with line numbers.', object({
    path: text('File path in the repo.'),
    start_line: { type: 'integer', description: 'First line to read.' },
    end_line: { type: 'integer', description: 'Last line to read.' },
  }, ['path'])),
  tool('repo_search', 'Search the connected GitHub repo for code or file names.', object({ query: text('Words or a symbol name to find.') }, ['query'])),
  tool('repo_list_issues', 'List issues or pull requests of the connected GitHub repo.', object({
    state: { type: 'string', enum: ['open', 'closed', 'all'] },
    type: { type: 'string', enum: ['issue', 'pull_request', 'all'] },
  })),
  tool('repo_get_issue', 'Read one issue of the connected GitHub repo with its comments.', object({ number: { type: 'integer' } }, ['number'])),
  tool('repo_get_pull_request', 'Read one pull request of the connected GitHub repo with its changed files.', object({ number: { type: 'integer' } }, ['number'])),
];

export const localReadTools = [
  tool('local_list_files', 'List the files of the local project folder.', object({})),
  tool('local_read_file', 'Read a file of the local project folder.', object({ path: text('Path relative to the project folder.') }, ['path'])),
  tool('local_search', 'Search the local project files with a regular expression; returns file:line: text.', object({ pattern: text('Regular expression.') }, ['pattern'])),
];

export const localEditTools = [
  tool('local_edit_file', 'Replace one exact snippet in a local file. The snippet must appear once; read the file first.', object({
    path: text('Path relative to the project folder.'),
    old_text: text('The exact text to replace.'),
    new_text: text('The replacement text.'),
  }, ['path', 'old_text', 'new_text'])),
  tool('local_write_file', 'Create a local file, or replace all of its content.', object({
    path: text('Path relative to the project folder.'),
    content: text('The full file content.'),
  }, ['path', 'content'])),
];

const titles: Record<string, string> = {
  repo_list_files: 'List',
  repo_read_file: 'Read',
  repo_search: 'Search',
  repo_list_issues: 'List',
  repo_get_issue: 'Issue',
  repo_get_pull_request: 'Pull request',
  local_list_files: 'List',
  local_read_file: 'Read',
  local_search: 'Search',
  local_edit_file: 'Update',
  local_write_file: 'Write',
};

export const toolTitle = (name: string) => titles[name] || name;

/** What a step worked on, shown after its title: a path, a query or an issue number. */
export function stepTarget(name: string, args: Record<string, any>) {
  if (name.endsWith('_search')) return `"${args.query ?? args.pattern ?? ''}"`;
  if (name === 'repo_list_issues') return `${args.state || 'open'} ${args.type === 'pull_request' ? 'pull requests' : args.type === 'all' ? 'issues and pull requests' : 'issues'}`;
  if (name === 'repo_get_issue' || name === 'repo_get_pull_request') return `#${args.number}`;
  if (name.endsWith('_list_files')) return args.path || 'all files';
  return String(args.path || '');
}

export function codingSystemPrompt({ repo, local, allowEdits, base }: {
  repo?: ConnectedRepo | null;
  local?: string | null;
  allowEdits?: boolean;
  base?: string;
}) {
  return [
    base?.trim() || 'You are a helpful coding assistant.',
    'Format answers in Markdown. Put code in fenced blocks with the language, followed by the file path when the code belongs to a file, for example ```ts src/app.ts.',
    repo && `The GitHub repo ${repo.owner}/${repo.repo} (branch ${repo.branch}) is connected. Use the repo tools to list, read and search files and to check issues and pull requests before answering, and cite file paths. Never guess file contents. You cannot change the repo: propose changes as unified diffs in \`\`\`diff blocks that name the file.`,
    local && `The local project folder "${local}" is available through the local tools. Read files before answering.`,
    local && (allowEdits
      ? 'When the user asks for a change, edit the local files with local_edit_file or local_write_file. Read a file before editing it, keep edits small, and summarize what changed.'
      : 'Local files are read-only: propose changes as unified diffs in ```diff blocks that name the file.'),
    'Use tools only as much as the task needs, then answer.',
  ].filter(Boolean).join('\n\n');
}
