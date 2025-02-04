import React from 'react';
import { ChatMessage } from './chat-message';
import { Message } from '@/lib/types';

export const ChatPanel = ({
  chat,
  initialMessage,
  streamingMessage,
}: {
  chat?: Message[];
  initialMessage?: Message | null;
  streamingMessage: Message | null;
}) => {
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, streamingMessage?.content]); // Add streamingMessage to dependencies

  if (chat) {
    return (
      <>
        {/* Render regular messages */}
        {chat.map((message, index) => (
          <ChatMessage
            key={message.id}
            {...message}
            last={!streamingMessage && index === chat.length - 1}
          />
        ))}
        
        {/* Render streaming message if present */}
        {streamingMessage && (
          <ChatMessage
            {...streamingMessage}
            last={true}
            isStreaming={true}
          />
        )}
        
        <div ref={endRef} />
      </>
    );
  }

  if (initialMessage) {
    return <ChatMessage {...initialMessage} />;
  }

  return null;
};