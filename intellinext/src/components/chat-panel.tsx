import React from 'react';
import { ChatMessage } from './chat-message';

export const ChatPanel = ({
  chat,
  initialMessage,
}: {
  chat?: Message[];
  initialMessage?: Message | null;
}) => {
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  if (chat) {
    return (
      <>
        {chat.map((message) => (
          <ChatMessage key={message.id} {...message} />
        ))}
        <div ref={endRef} />
      </>
    );
  }

  if (initialMessage) {
    return <ChatMessage {...initialMessage} />;
  }

  return null;
};
