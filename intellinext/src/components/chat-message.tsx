import React from 'react';

import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import { cn } from '@/lib/utils';

type Props = {
  role: string;
  content: string;
};

export const ChatMessage = ({ role, content }: Props) => {
  const isUser = role === 'user';

  return (
    <div className={'items-top flex w-full gap-4 pb-10'}>
      <ChatAvatar isUser={isUser} />
      <div className='mt-2 flex-1 border-b-[1px] border-background pb-10'>
        {isUser ? (
          <>{content}</>
        ) : (
          <ReactMarkdown className='prose'>{content}</ReactMarkdown>
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
