import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { WorkspaceToolkit } from 'intellinode';
import { structuredPatch } from 'diff';
import { errorMessage } from '@/lib/helpers';

// Local project files for the coding assistant. Only active when CODE_WORKSPACE is set, which is meant for running
// the app on your own machine; the tools are confined to that folder and never run shell commands.
function workspaceDir() {
  const dir = process.env.CODE_WORKSPACE?.trim();
  return dir && fs.existsSync(dir) && fs.statSync(dir).isDirectory() ? path.resolve(dir) : null;
}

const readTools: Record<string, string> = { local_list_files: 'list_files', local_read_file: 'read_file', local_search: 'search' };
const editTools: Record<string, string> = { local_edit_file: 'edit_file', local_write_file: 'write_file' };

const lineCount = (text: string) => (text ? text.split('\n').length : 0);

function readSummary(tool: string, content: string) {
  if (content.startsWith('Error')) return content.replace(/^Error:\s*/, '');
  if (tool === 'local_read_file') return `${lineCount(content)} lines`;
  if (tool === 'local_search') return content === 'No matches found.' ? 'no matches' : `${lineCount(content)} matches`;
  return `${lineCount(content)} files`;
}

function readCurrent(toolkit: WorkspaceToolkit, file: string) {
  try {
    return fs.readFileSync((toolkit as unknown as { resolve: (p: string) => string }).resolve(file), 'utf8');
  } catch {
    return null;
  }
}

// A compact unified diff with its line counts.
function unifiedDiff(file: string, before: string, after: string) {
  const patch = structuredPatch(file, file, before, after, '', '', { context: 2 });
  let added = 0;
  let removed = 0;
  const lines: string[] = [];
  for (const hunk of patch.hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
    for (const line of hunk.lines) {
      if (line.startsWith('+')) added += 1;
      else if (line.startsWith('-')) removed += 1;
      lines.push(line);
    }
  }
  return { diff: lines.join('\n'), added, removed };
}

// Whether local files are available, and the folder name to show in the settings.
export async function GET() {
  const dir = workspaceDir();
  return NextResponse.json({ enabled: Boolean(dir), name: dir ? path.basename(dir) : '' });
}

export async function POST(req: Request) {
  const dir = workspaceDir();
  if (!dir) {
    return NextResponse.json({ error: 'Local files are off. Set CODE_WORKSPACE in .env and restart the app.' }, { status: 400 });
  }
  const { tool, args = {}, allowEdits = false } = await req.json().catch(() => ({}));
  const name = readTools[tool] || editTools[tool];
  if (!name) {
    return NextResponse.json({ error: `Unknown tool ${tool}.` }, { status: 400 });
  }
  if (editTools[tool] && !allowEdits) {
    return NextResponse.json({ error: 'File edits are off. Turn on Allow file edits in Settings, Code.' }, { status: 403 });
  }
  try {
    const toolkit = new WorkspaceToolkit(dir, { allowBash: false });
    if (!editTools[tool]) {
      const content = toolkit.execute(name, args);
      return NextResponse.json({ content, summary: readSummary(tool, content) });
    }
    const file = String(args.path || '');
    const before = readCurrent(toolkit, file);
    const content = toolkit.execute(name, args);
    if (content.startsWith('Error')) {
      return NextResponse.json({ content, summary: content.replace(/^Error:\s*/, '') });
    }
    const after = readCurrent(toolkit, file) ?? '';
    const { diff, added, removed } = unifiedDiff(file, before ?? '', after);
    const summary = before === null ? `Created with ${lineCount(after)} lines` : `Added ${added} ${added === 1 ? 'line' : 'lines'}, removed ${removed}`;
    return NextResponse.json({ content, summary, diff });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) || 'The file tool failed.' }, { status: 400 });
  }
}
