'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { AgentStep } from '@/lib/types';

const PREVIEW_LINES = 14;

// The coding assistant's steps in a Claude Code style timeline: a status dot, the action and its target,
// a one-line result, and the diff of each file edit.
export function AgentSteps({ steps, working }: { steps: AgentStep[]; working?: boolean }) {
  if (!steps.length && !working) return null;
  const running = steps.find((step) => step.state === 'running');
  return (
    <div className='mb-4 space-y-2.5 font-mono text-[13px] leading-5' dir='ltr' data-testid='agent-steps'>
      {steps.map((step) => (
        <Step key={step.id} step={step} />
      ))}
      {working && (
        <div className='flex items-center gap-2 text-amber-300/90'>
          <span className='animate-spin select-none'>✻</span>
          <span>{running ? `${running.title === 'Read' ? 'Reading' : running.title === 'Search' ? 'Searching' : 'Working'}...` : 'Thinking...'}</span>
        </div>
      )}
    </div>
  );
}

function Step({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false);
  const lines = step.diff ? step.diff.split('\n') : [];
  const shown = expanded ? lines : lines.slice(0, PREVIEW_LINES);

  return (
    <div data-testid='agent-step'>
      <div className='flex items-baseline gap-2'>
        <span
          className={cn(
            'select-none text-[11px]',
            step.state === 'running' && 'animate-pulse text-zinc-400',
            step.state === 'done' && 'text-emerald-400',
            step.state === 'error' && 'text-red-400'
          )}
        >
          ●
        </span>
        <span className='min-w-0 break-words'>
          <span className='font-semibold text-zinc-100'>{step.title}</span>
          {step.target && <span className='text-zinc-400'>({step.target})</span>}
        </span>
      </div>
      {step.summary && (
        <div className='ml-5 flex gap-2 text-zinc-500'>
          <span className='select-none'>└</span>
          <span className={cn('min-w-0 break-words', step.state === 'error' && 'text-red-300')}>{step.summary}</span>
        </div>
      )}
      {step.diff && (
        <div className='ml-9 mt-1.5 overflow-hidden rounded border border-zinc-800 bg-zinc-950/60'>
          <pre className='overflow-x-auto py-2 text-xs leading-5'>
            {shown.map((line, index) => (
              <div
                key={index}
                className={cn(
                  'px-3',
                  line.startsWith('+') && 'bg-emerald-950/70 text-emerald-300',
                  line.startsWith('-') && 'bg-red-950/70 text-red-300',
                  line.startsWith('@@') && 'text-sky-300/80',
                  !/^[+\-@]/.test(line) && 'text-zinc-400'
                )}
              >
                {line || ' '}
              </div>
            ))}
          </pre>
          {lines.length > PREVIEW_LINES && (
            <button
              type='button'
              onClick={() => setExpanded(!expanded)}
              className='w-full border-t border-zinc-800 py-1 text-xs text-zinc-500 hover:text-zinc-300'
            >
              {expanded ? 'Show less' : `Show ${lines.length - PREVIEW_LINES} more lines`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
