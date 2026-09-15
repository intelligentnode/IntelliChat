import React, { useEffect, useState } from 'react';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import { cn, isPrimarilyRtl } from '@/lib/utils';
import { Message } from '@/lib/types';
import { Download, Loader2, Square, Volume2 } from 'lucide-react';
import { useChatSettings } from '@/store/chat-settings';
import { currentlySpeaking, onSpeechChange, speak } from '@/lib/client';
import { useToast } from './ui/use-toast';

type Props = Message & {
  last?: boolean;
  isStreaming?: boolean;
};

export const ChatMessage = ({ role, content, image, imagePrompt, stopped, id, isStreaming }: Props) => {
  const isUser = role === 'user';
  const isRtl = isPrimarilyRtl(content);

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
          <div className={cn('whitespace-pre-wrap break-words', isRtl && 'text-right rtl')}>{content}</div>
        ) : (
          <div className={isRtl ? 'text-right rtl' : ''}>
            {content && (
              <ReactMarkdown className='prose prose-invert max-w-none prose-code:whitespace-normal break-words'>
                {content}
              </ReactMarkdown>
            )}
            {stopped && <div className='mt-1 text-xs italic text-zinc-400'>Stopped</div>}
            {isStreaming ? (
              <div className='flex gap-2'>
                <div className='streaming-indicator animate-pulse mt-2 h-2 w-2 rounded-full bg-white text-sm text-muted-foreground'></div>
                <div className='streaming-indicator animate-pulse mt-2 h-2 w-2 rounded-full bg-white text-sm text-muted-foreground'></div>
                <div className='streaming-indicator animate-pulse mt-2 h-2 w-2 rounded-full bg-white text-sm text-muted-foreground'></div>
              </div>
            ) : (
              content && !image && <ReadAloudButton id={id} text={content} />
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
