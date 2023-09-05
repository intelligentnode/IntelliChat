'use client';

import React from 'react';
import { nanoid } from 'nanoid';
import { ChatPanel } from './chat-panel';
import { ChatPrompt } from './chat-prompt';
import Container from './container';

type Props = {};

export default function Chat() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: '1',
      content: 'Hello',
      role: 'user',
    },
    {
      id: '2',
      content: 'Hello, how can I help you?',
      role: 'assistant',
    },
  ]);
  const input = React.useRef<HTMLTextAreaElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const onSubmit = async () => {
    const inputText = input.current?.value;
    if (!inputText) return;

    setMessages((messages) => [
      ...messages,
      {
        id: nanoid(),
        content: inputText,
        role: 'user',
      },
    ]);
  };

  return (
    <Container className='relative grid min-h-[calc(100vh-88px)] grid-rows-[1fr,min-content]'>
      <div className='py-10'>
        <ChatPanel chat={messages} />
      </div>
      <ChatPrompt ref={input} isLoading={isLoading} onSubmit={onSubmit} />
    </Container>
  );
}
