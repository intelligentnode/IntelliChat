import React from 'react';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import { cn } from '@/lib/utils';
import { Message } from '@/lib/types';
import { BookIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

type Props = Message & {
  last?: boolean;
  isStreaming?: boolean;
};

export const ChatMessage = ({ 
  role, 
  content, 
  last, 
  references, 
  id, 
  isStreaming 
}: Props) => {
  const isUser = role === 'user';

  return (
    <div className={'items-top flex w-full gap-4 pb-10'}>
      <ChatAvatar isUser={isUser} />
      <div className='mt-2 flex-1 border-b-[1px] border-background pb-10'>
        {isUser ? (
          <>{content}</>
        ) : (
          <div>
            <ReactMarkdown className='prose prose-invert max-w-none prose-code:whitespace-normal break-all'>
              {content}
            </ReactMarkdown>
            {last && references && references.length > 0 && !isStreaming && (
              <div className='flex gap-2'>
                <Popover>
                  <PopoverTrigger className='mt-1 flex items-center gap-2 rounded-md border px-2 py-1 text-sm hover:border-primary hover:bg-primary'>
                    <BookIcon size={18} /> Sources
                  </PopoverTrigger>
                  <PopoverContent align='start' className='text-sm'>
                    {references.map((ref, index) => (
                      <li key={`${id}-${index}`} className='space-y-1'>
                        {ref}
                      </li>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            )}
            {isStreaming && (
              <div className='flex gap-2'>
                <div className='streaming-indicator animate-pulse mt-2 h-2 w-2 rounded-full bg-white text-sm text-muted-foreground'></div>

                <div className='streaming-indicator animate-pulse mt-2 h-2 w-2 rounded-full bg-white text-sm text-muted-foreground'></div>      
                
                <div className='streaming-indicator animate-pulse mt-2 h-2 w-2 rounded-full bg-white text-sm text-muted-foreground'></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

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