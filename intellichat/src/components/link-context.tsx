import React from 'react';
import { Check, Github, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LinkContext } from '@/lib/types';

// Chips under a user message for its GitHub links: loading, read, or why they could not be read.
export function LinkContextChips({ context }: { context: LinkContext[] }) {
  return (
    <div className='mt-2 flex flex-wrap gap-2' dir='ltr' data-testid='link-context'>
      {context.map((item) => (
        <a
          key={item.url}
          href={item.url}
          target='_blank'
          rel='noreferrer'
          title={item.error || item.summary || item.url}
          className={cn(
            'inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
            item.state === 'error' ? 'border-red-900/80 text-red-300' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
          )}
        >
          {item.state === 'loading' ? <Loader2 size={12} className='shrink-0 animate-spin' /> : <Github size={12} className='shrink-0' />}
          <span className='truncate'>{item.label}</span>
          {item.state === 'ready' && <Check size={12} className='shrink-0 text-emerald-400' />}
          {item.state === 'error' && <span className='truncate text-red-300/90'>{item.error}</span>}
        </a>
      ))}
    </div>
  );
}
