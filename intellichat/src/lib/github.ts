// GitHub links and the GitHub REST API: parse pasted links, fetch their details for a message, and run the
// read-only tools the coding assistant uses on a connected repo. Works in the browser and on the server.
import type { LinkContext } from './types';

const API = 'https://api.github.com';
const MAX_TEXT = 24000;

export type GitHubRef =
  | { kind: 'repo'; owner: string; repo: string }
  | { kind: 'file' | 'dir'; owner: string; repo: string; ref: string; path: string }
  | { kind: 'issue' | 'pull'; owner: string; repo: string; number: number }
  | { kind: 'commit'; owner: string; repo: string; sha: string };

export type ConnectedRepo = { owner: string; repo: string; branch: string; description?: string };

// From the browser with the user's token or none (each visitor gets GitHub's own rate limit),
// or through /api/github when the server has GITHUB_TOKEN.
export type GitHubAccess = { token?: string; viaServer?: boolean };

export type ToolOutput = { content: string; summary: string; diff?: string };

const LINK = /https?:\/\/(?:www\.)?github\.com\/[^\s<>()"'`\]]+/gi;

const clip = (text: string, max = MAX_TEXT) => (text.length > max ? `${text.slice(0, max)}\n... [truncated]` : text);
const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');
const fence = (path: string, text: string) => `\`\`\`\`${path.split('.').pop() || ''}\n${text}\n\`\`\`\``;

/** The repo, file, folder, issue, pull request or commit a github.com link points to. */
export function parseGitHubUrl(url: string): GitHubRef | null {
  let parsed: URL;
  try {
    parsed = new URL(url.replace(/[.,;:!?]+$/, ''));
  } catch {
    return null;
  }
  if (!/^(www\.)?github\.com$/i.test(parsed.hostname)) return null;
  const parts = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length < 2) return null;
  const [owner, rawRepo, type, ...rest] = parts;
  const repo = rawRepo.replace(/\.git$/, '');
  const number = /^\d+$/.test(rest[0] || '') ? Number(rest[0]) : null;
  if (type === 'issues' && number) return { kind: 'issue', owner, repo, number };
  if ((type === 'pull' || type === 'pulls') && number) return { kind: 'pull', owner, repo, number };
  if (type === 'commit' && rest[0]) return { kind: 'commit', owner, repo, sha: rest[0] };
  if ((type === 'blob' || type === 'tree') && rest[0]) {
    // the first segment is taken as the branch, so branch names with slashes are not supported
    const [ref, ...path] = rest;
    return { kind: type === 'blob' && path.length ? 'file' : 'dir', owner, repo, ref, path: path.join('/') };
  }
  return { kind: 'repo', owner, repo };
}

/** The distinct GitHub links in a message, at most `limit`. */
export function findGitHubLinks(text: string, limit = 3) {
  const found: Array<{ url: string; ref: GitHubRef }> = [];
  for (const match of text.match(LINK) || []) {
    const url = match.replace(/[.,;:!?]+$/, '');
    const ref = parseGitHubUrl(url);
    if (ref && !found.some((item) => item.url === url)) found.push({ url, ref });
    if (found.length >= limit) break;
  }
  return found;
}

/** "owner/repo" or any github.com link, as the repo to connect and an optional branch. */
export function parseRepoInput(value: string): { owner: string; repo: string; branch?: string } | null {
  const text = value.trim();
  const shorthand = /^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(text);
  if (shorthand) return { owner: shorthand[1], repo: shorthand[2] };
  const ref = parseGitHubUrl(text.startsWith('http') ? text : `https://${text}`);
  if (!ref) return null;
  return { owner: ref.owner, repo: ref.repo, branch: ref.kind === 'file' || ref.kind === 'dir' ? ref.ref : undefined };
}

/** A short name for a link, shown while its details load. */
export function linkLabel(ref: GitHubRef) {
  const name = `${ref.owner}/${ref.repo}`;
  switch (ref.kind) {
    case 'repo':
      return name;
    case 'file':
    case 'dir':
      return `${name} · ${ref.path || '/'}`;
    case 'issue':
      return `${name}#${ref.number}`;
    case 'pull':
      return `${name} PR #${ref.number}`;
    case 'commit':
      return `${name}@${ref.sha.slice(0, 7)}`;
  }
}

async function githubError(response: Response, hasToken: boolean) {
  let message = '';
  try {
    message = ((await response.json()) as { message?: string }).message || '';
  } catch {
    // not JSON
  }
  if ((response.status === 403 || response.status === 429) && response.headers.get('x-ratelimit-remaining') === '0') {
    return hasToken ? 'GitHub rate limit reached, try again later.' : 'GitHub rate limit reached. Add a GitHub token in Settings, Code, for higher limits.';
  }
  if (response.status === 404) return hasToken ? 'Not found on GitHub.' : 'Not found on GitHub. Private repos need a GitHub token in Settings, Code.';
  if (response.status === 401) return 'GitHub rejected the token.';
  return `GitHub answered ${response.status}${message ? `: ${message}` : ''}`;
}

/** One GET request to the GitHub REST API; `raw` returns file contents as text. */
export async function requestGitHub(path: string, { token, raw = false, signal }: { token?: string; raw?: boolean; signal?: AbortSignal } = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: {
      Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await githubError(response, Boolean(token)));
  return raw ? response.text() : response.json();
}

export async function githubGet(path: string, access: GitHubAccess, raw = false, signal?: AbortSignal): Promise<any> {
  if (!access.viaServer) return requestGitHub(path, { token: access.token, raw, signal });
  const response = await fetch('/api/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, raw }),
    signal,
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'The GitHub request failed.');
  return json.data;
}

// ---- details shared by pasted links and repo tools ----

async function repoDetails(owner: string, repo: string, access: GitHubAccess, signal?: AbortSignal) {
  const base = `/repos/${owner}/${repo}`;
  const info = await githubGet(base, access, false, signal);
  const [readme, root] = await Promise.all([
    githubGet(`${base}/readme`, access, true, signal).catch(() => ''),
    githubGet(`${base}/contents`, access, false, signal).catch(() => []),
  ]);
  const files = Array.isArray(root) ? root.map((entry: any) => (entry.type === 'dir' ? `${entry.name}/` : entry.name)).join(', ') : '';
  const text = [
    `GitHub repository ${owner}/${repo}`,
    info.description && `Description: ${info.description}`,
    `Default branch: ${info.default_branch}. Language: ${info.language || 'unknown'}. Stars: ${info.stargazers_count}. Open issues and pull requests: ${info.open_issues_count}.`,
    files && `Top-level files: ${files}`,
    readme && `README:\n${clip(String(readme), 6000)}`,
  ].filter(Boolean).join('\n');
  return { info, text };
}

async function issueDetails(owner: string, repo: string, number: number, access: GitHubAccess, signal?: AbortSignal) {
  const base = `/repos/${owner}/${repo}/issues/${number}`;
  const [issue, comments] = await Promise.all([
    githubGet(base, access, false, signal),
    githubGet(`${base}/comments?per_page=30`, access, false, signal).catch(() => []),
  ]);
  const thread = (comments as any[]).map((comment) => `@${comment.user?.login}: ${clip(comment.body || '', 2000)}`).join('\n\n');
  const text = [
    `${issue.pull_request ? 'Pull request' : 'Issue'} #${number} in ${owner}/${repo}: ${issue.title}`,
    `State: ${issue.state}. Author: @${issue.user?.login}. Labels: ${(issue.labels || []).map((label: any) => label.name).join(', ') || 'none'}.`,
    issue.body && `Description:\n${clip(issue.body, 8000)}`,
    thread && `Comments:\n${clip(thread, 10000)}`,
  ].filter(Boolean).join('\n');
  return { issue, text };
}

async function pullDetails(owner: string, repo: string, number: number, access: GitHubAccess, signal?: AbortSignal) {
  const base = `/repos/${owner}/${repo}/pulls/${number}`;
  const [pull, files] = await Promise.all([
    githubGet(base, access, false, signal),
    githubGet(`${base}/files?per_page=50`, access, false, signal).catch(() => []),
  ]);
  const changes = (files as any[]).map((file) => `--- ${file.filename} (${file.status}, +${file.additions} -${file.deletions})\n${clip(file.patch || '', 3000)}`).join('\n');
  const text = [
    `Pull request #${number} in ${owner}/${repo}: ${pull.title}`,
    `State: ${pull.merged ? 'merged' : pull.state}. Author: @${pull.user?.login}. ${pull.head?.ref} into ${pull.base?.ref}. ${pull.changed_files} files, +${pull.additions} -${pull.deletions}.`,
    pull.body && `Description:\n${clip(pull.body, 6000)}`,
    changes && `Changes:\n${clip(changes, 16000)}`,
  ].filter(Boolean).join('\n');
  return { pull, files: files as any[], text };
}

/** The details of one pasted GitHub link, ready to send with the message. */
export async function fetchLinkContext(url: string, ref: GitHubRef, access: GitHubAccess, signal?: AbortSignal): Promise<LinkContext> {
  const name = `${ref.owner}/${ref.repo}`;
  const base = `/repos/${name}`;
  const ready = (label: string, summary: string, content: string): LinkContext => ({ url, label, summary, content: `[GitHub link ${url}]\n${content}`, state: 'ready' });
  switch (ref.kind) {
    case 'repo': {
      const { info, text } = await repoDetails(ref.owner, ref.repo, access, signal);
      return ready(name, `${name}${info.description ? `: ${info.description}` : ''}`, text);
    }
    case 'file': {
      const text = String(await githubGet(`${base}/contents/${encodePath(ref.path)}?ref=${encodeURIComponent(ref.ref)}`, access, true, signal));
      return ready(`${name} · ${ref.path}`, `${ref.path} from ${name}`, `File ${ref.path} from ${name} at ${ref.ref}:\n${fence(ref.path, clip(text))}`);
    }
    case 'dir': {
      const entries = await githubGet(`${base}/contents/${encodePath(ref.path)}?ref=${encodeURIComponent(ref.ref)}`, access, false, signal);
      const list = (Array.isArray(entries) ? entries : []).map((entry: any) => (entry.type === 'dir' ? `${entry.path}/` : entry.path)).join('\n');
      return ready(`${name} · ${ref.path || '/'}`, `the ${ref.path || 'root'} folder of ${name}`, `Folder ${ref.path || '/'} of ${name} at ${ref.ref}:\n${list}`);
    }
    case 'issue': {
      const { issue, text } = await issueDetails(ref.owner, ref.repo, ref.number, access, signal);
      return ready(`${name}#${ref.number}`, issue.title, text);
    }
    case 'pull': {
      const { pull, text } = await pullDetails(ref.owner, ref.repo, ref.number, access, signal);
      return ready(`${name} PR #${ref.number}`, pull.title, text);
    }
    case 'commit': {
      const commit = await githubGet(`${base}/commits/${ref.sha}`, access, false, signal);
      const changes = (commit.files || []).map((file: any) => `--- ${file.filename} (+${file.additions} -${file.deletions})\n${clip(file.patch || '', 3000)}`).join('\n');
      const message = commit.commit?.message || '';
      return ready(`${name}@${ref.sha.slice(0, 7)}`, message.split('\n')[0], `Commit ${ref.sha} in ${name} by ${commit.commit?.author?.name}:\n${message}\n${clip(changes, 16000)}`);
    }
  }
}

// ---- repo tools ----

const trees = new Map<string, string[]>();

async function repoFiles(repo: ConnectedRepo, access: GitHubAccess, signal?: AbortSignal) {
  const key = `${repo.owner}/${repo.repo}@${repo.branch}`;
  if (!trees.has(key)) {
    const data = await githubGet(`/repos/${repo.owner}/${repo.repo}/git/trees/${encodeURIComponent(repo.branch)}?recursive=1`, access, false, signal);
    trees.set(key, (data.tree || []).filter((entry: any) => entry.type === 'blob').map((entry: any) => entry.path));
  }
  return trees.get(key) as string[];
}

/** Check a repo exists and find its default branch. */
export async function connectRepo(input: { owner: string; repo: string; branch?: string }, access: GitHubAccess, signal?: AbortSignal): Promise<ConnectedRepo> {
  const info = await githubGet(`/repos/${input.owner}/${input.repo}`, access, false, signal);
  return { owner: info.owner?.login || input.owner, repo: info.name || input.repo, branch: input.branch || info.default_branch, description: info.description || '' };
}

export async function runRepoTool(name: string, args: Record<string, any>, repo: ConnectedRepo, access: GitHubAccess, signal?: AbortSignal): Promise<ToolOutput> {
  const full = `${repo.owner}/${repo.repo}`;
  switch (name) {
    case 'repo_list_files': {
      const prefix = String(args.path || '').replace(/^\/+|\/+$/g, '');
      const files = (await repoFiles(repo, access, signal)).filter((path) => !prefix || path === prefix || path.startsWith(`${prefix}/`));
      const shown = files.slice(0, 400);
      const more = files.length > shown.length ? `\n... ${files.length - shown.length} more files` : '';
      return { content: shown.length ? shown.join('\n') + more : 'No files found.', summary: `${files.length} files` };
    }
    case 'repo_read_file': {
      const path = String(args.path || '').replace(/^\/+/, '');
      const text = await githubGet(`/repos/${full}/contents/${encodePath(path)}?ref=${encodeURIComponent(repo.branch)}`, access, true, signal);
      if (typeof text !== 'string') return { content: `${path} is a folder; list it with repo_list_files.`, summary: 'folder' };
      const lines = text.split('\n');
      const start = Math.max(1, Number(args.start_line) || 1);
      const end = Math.min(lines.length, Number(args.end_line) || start + 499);
      const body = lines.slice(start - 1, end).map((line, index) => `${start + index}\t${line}`).join('\n');
      return { content: clip(`${path}, lines ${start} to ${end} of ${lines.length}\n${body}`), summary: `${lines.length} lines` };
    }
    case 'repo_search': {
      const query = String(args.query || '').trim();
      if (access.token || access.viaServer) {
        try {
          const data = await githubGet(`/search/code?q=${encodeURIComponent(`${query} repo:${full}`)}&per_page=30`, access, false, signal);
          const items = (data.items || []) as any[];
          return { content: items.map((item) => item.path).join('\n') || 'No matches.', summary: `${data.total_count ?? items.length} results` };
        } catch {
          // fall back to matching file names
        }
      }
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const files = (await repoFiles(repo, access, signal)).filter((path) => words.every((word) => path.toLowerCase().includes(word)));
      const note = '\n(Searching file contents needs a GitHub token, so only file names were matched. Read the likely files.)';
      return { content: (files.length ? files.slice(0, 100).join('\n') : 'No file names match.') + note, summary: `${files.length} file names` };
    }
    case 'repo_list_issues': {
      const state = ['open', 'closed', 'all'].includes(args.state) ? args.state : 'open';
      const type = ['issue', 'pull_request', 'all'].includes(args.type) ? args.type : 'issue';
      const data = (await githubGet(`/repos/${full}/issues?state=${state}&per_page=40`, access, false, signal)) as any[];
      const items = data.filter((item) => type === 'all' || (type === 'pull_request' ? item.pull_request : !item.pull_request));
      const lines = items.map((item) => `#${item.number} [${item.state}] ${item.title} (@${item.user?.login}, ${item.comments} comments${item.pull_request ? ', pull request' : ''})`);
      return { content: lines.join('\n') || 'None found.', summary: `${items.length} ${type === 'pull_request' ? 'pull requests' : 'items'}` };
    }
    case 'repo_get_issue': {
      const { issue, text } = await issueDetails(repo.owner, repo.repo, Number(args.number), access, signal);
      return { content: text, summary: issue.title };
    }
    case 'repo_get_pull_request': {
      const { pull, text } = await pullDetails(repo.owner, repo.repo, Number(args.number), access, signal);
      return { content: text, summary: pull.title };
    }
    default:
      throw new Error(`Unknown tool ${name}`);
  }
}
