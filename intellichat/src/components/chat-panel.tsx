import React, { useEffect } from 'react';
import { ChatMessage } from './chat-message';
import { Message } from '@/lib/types';

export const ChatPanel = ({
  chat,
  initialMessage,
  streamingMessage,
  isStreaming,
}: {
  chat?: Message[];
  initialMessage?: Message | null;
  streamingMessage: Message | null;
  isStreaming: boolean;
}) => {
  const endRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [chat?.length, streamingMessage]); // Add streamingMessage to dependencies

  if (chat) {
    return (
      <>
        {/* Render regular messages */}
        {chat.map((message, index) => {
          if (message.id !== streamingMessage?.id) {
            return (
              <ChatMessage
                key={message.id}
                {...message}
                last={!streamingMessage && index === chat.length - 1}
              />
            );
          }
        })}

        {/* Render streaming message if present */}
        {streamingMessage && (
          <ChatMessage
            {...streamingMessage}
            last={true}
            isStreaming={isStreaming}
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
