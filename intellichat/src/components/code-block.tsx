'use client';

import React, { useState } from 'react';
import { PrismAsync as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, Download } from 'lucide-react';

const extensions: Record<string, string> = {
  typescript: 'ts', ts: 'ts', tsx: 'tsx', javascript: 'js', js: 'js', jsx: 'jsx', python: 'py', py: 'py',
  bash: 'sh', sh: 'sh', shell: 'sh', zsh: 'sh', json: 'json', css: 'css', scss: 'scss', html: 'html', xml: 'xml',
  markdown: 'md', md: 'md', yaml: 'yml', yml: 'yml', go: 'go', rust: 'rs', rs: 'rs', java: 'java', kotlin: 'kt',
  swift: 'swift', c: 'c', cpp: 'cpp', csharp: 'cs', cs: 'cs', php: 'php', ruby: 'rb', rb: 'rb', sql: 'sql',
  diff: 'diff', patch: 'diff', toml: 'toml',
};

/** The language and file name of a fenced block: ```ts src/app.ts, ```ts:src/app.ts or ```ts title="src/app.ts". */
export function codeInfo(className = '', meta = '') {
  const match = /language-(\S+)/.exec(className);
  const [language = '', fileFromClass = ''] = (match?.[1] || '').split(':');
  const title = /title=["']?([^"'\s]+)/.exec(meta)?.[1] || meta.trim().split(/\s+/)[0] || '';
  const file = fileFromClass || (/[./]/.test(title) ? title : '');
  return { language: language.toLowerCase(), file };
}

// A highlighted code block with its language, the file it belongs to, and copy and download buttons.
export function CodeBlock({ code, language, file }: { code: string; language: string; file: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const name = file.split('/').pop() || `snippet.${extensions[language] || 'txt'}`;
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const buttonClass = 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-zinc-700 hover:text-white';

  return (
    <div className='not-prose my-4 overflow-hidden rounded-lg border border-zinc-700 bg-[#282c34]' dir='ltr' data-testid='code-block'>
      <div className='flex items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-400'>
        <span className='min-w-0 truncate font-mono'>
          {file ? <span className='text-zinc-200'>{file}</span> : null}
          <span className={file ? 'ml-2' : ''}>{language || 'text'}</span>
        </span>
        <span className='flex shrink-0 items-center gap-1'>
          <button type='button' onClick={copy} className={buttonClass} aria-label='Copy code'>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type='button' onClick={download} className={buttonClass} aria-label='Download code'>
            <Download size={13} />
            Download
          </button>
        </span>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        showLineNumbers={language !== 'diff' && code.split('\n').length > 5}
        lineNumberStyle={{ color: '#5c6370', minWidth: '2.25em' }}
        customStyle={{ margin: 0, background: 'transparent', padding: '0.85rem 1rem', fontSize: '0.84rem', maxHeight: '32rem' }}
        codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
