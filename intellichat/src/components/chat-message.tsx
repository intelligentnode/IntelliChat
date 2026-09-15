import React, { useEffect, useState } from 'react';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import { cn } from '@/lib/utils';
import { Message } from '@/lib/types';
import { Download, Loader2, Square, Volume2 } from 'lucide-react';
import { useChatSettings } from '@/store/chat-settings';
import { currentlySpeaking, onSpeechChange, speak } from '@/lib/client';
import { parseCommand, textDirection } from '@/lib/commands';
import { CommandBadge } from './command-badge';
import { CodeBlock, codeInfo } from './code-block';
import { AgentSteps } from './agent-steps';
import { LinkContextChips } from './link-context';
import { useToast } from './ui/use-toast';

type Props = Message & {
  last?: boolean;
  isStreaming?: boolean;
};

// Code blocks draw their own container, so markdown's <pre> only passes its children through.
function MarkdownPre({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function MarkdownCode({ node, inline, className, children, ...props }: any) {
  if (inline) {
    return (
      <code className='rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[0.85em] text-sky-200' {...props}>
        {children}
      </code>
    );
  }
  const { language, file } = codeInfo(className, node?.data?.meta || '');
  return <CodeBlock code={String(children).replace(/\n$/, '')} language={language} file={file} />;
}

const markdownComponents = { pre: MarkdownPre, code: MarkdownCode };

export const ChatMessage = ({ role, content, image, imagePrompt, stopped, id, isStreaming, context, steps }: Props) => {
  const isUser = role === 'user';
  const command = isUser ? parseCommand(content) : null;
  const isAgent = Array.isArray(steps);

  return (
    <div className={'items-top flex w-full gap-4 pb-10'} data-testid={`message-${role}`}>
      <ChatAvatar isUser={isUser} />
      <div className='mt-2 min-w-0 flex-1 border-b-[1px] border-background pb-10'>
        {image && (
          <figure className='mb-3'>
            <img
              src={image}
              alt={imagePrompt || 'attached image'}
              className={cn('rounded-lg border border-zinc-700', isUser ? 'max-h-48' : 'max-h-[28rem]')}
            />
            {!isUser && (
              <figcaption className='mt-2 flex items-center gap-3 text-xs text-zinc-400'>
                <a href={image} download={`intellichat-${id}.png`} className='inline-flex items-center gap-1 rounded-md border border-zinc-600 px-2 py-1 hover:border-primary hover:text-white'>
                  <Download size={14} /> Download
                </a>
              </figcaption>
            )}
          </figure>
        )}
        {isUser ? (
          <>
            {command?.command ? (
              // the command as a badge, followed by the prompt in its own direction
              <div className='flex flex-wrap items-center gap-2' dir={textDirection(command.text)}>
                <CommandBadge />
                <span className='whitespace-pre-wrap break-words'>{command.text}</span>
              </div>
            ) : (
              <div className='whitespace-pre-wrap break-words' dir='auto'>{content}</div>
            )}
            {context?.length ? <LinkContextChips context={context} /> : null}
          </>
        ) : (
          // dir=auto: a reply that starts in Arabic reads right to left; code blocks stay left to right
          <div dir='auto'>
            {isAgent && <AgentSteps steps={steps} working={isStreaming} />}
            {content && (
              <ReactMarkdown
                className='prose prose-invert max-w-none break-words prose-code:before:content-none prose-code:after:content-none'
                components={markdownComponents}
              >
                {content}
              </ReactMarkdown>
            )}
            {stopped && <div className='mt-1 text-xs italic text-zinc-400'>Stopped</div>}
            {isStreaming && !isAgent ? (
              <div className='flex gap-2'>
                <div className='streaming-indicator animate-pulse mt-2 h-2 w-2 rounded-full bg-white text-sm text-muted-foreground'></div>
                <div className='streaming-indicator animate-pulse mt-2 h-2 w-2 rounded-full bg-white text-sm text-muted-foreground'></div>
                <div className='streaming-indicator animate-pulse mt-2 h-2 w-2 rounded-full bg-white text-sm text-muted-foreground'></div>
              </div>
            ) : (
              content && !image && !isStreaming && <ReadAloudButton id={id} text={content} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Speaker button under a reply; the same button stops the playback.
function ReadAloudButton({ id, text }: { id: string; text: string }) {
  const speech = useChatSettings((s) => s.speech);
  const providers = useChatSettings((s) => s.providers);
  const { toast } = useToast();
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>(currentlySpeaking() === id ? 'playing' : 'idle');

  useEffect(() => onSpeechChange((playingId) => setState(playingId === id ? 'playing' : 'idle')), [id]);

  const onClick = async () => {
    try {
      if (state === 'idle') setState('loading');
      await speak(id, text, speech, providers);
    } catch (error: any) {
      setState('idle');
      toast({ title: 'Read aloud', variant: 'destructive', description: error.message, duration: 5000 });
    }
  };

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'mt-2 inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-primary hover:text-white',
        state === 'playing' && 'border-primary text-white'
      )}
      aria-label={state === 'playing' ? 'Stop reading' : 'Read aloud'}
      data-testid='read-aloud'
    >
      {state === 'loading' ? <Loader2 size={14} className='animate-spin' /> : state === 'playing' ? <Square size={14} /> : <Volume2 size={14} />}
      {state === 'playing' ? 'Stop' : 'Read aloud'}
    </button>
  );
}

const ChatAvatar = ({ isUser }: { isUser: boolean }) => {
  return (
    <div
      className={cn(
        'relative h-10 w-10 flex-shrink-0 flex-grow-0 rounded-full',
        isUser ? 'bg-primary' : 'bg-secondary'
      )}
    ></div>
  );
};
