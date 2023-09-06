'use client';

import React from 'react';
import { nanoid } from 'nanoid';
import { ChatPanel } from './chat-panel';
import { ChatPrompt } from './chat-prompt';
import Container from './container';
import { useMutation } from '@tanstack/react-query';
import type { PostMessagePayload } from '@/lib/validators';

type Props = {};

export default function Chat() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const input = React.useRef<HTMLTextAreaElement>(null);

  function appendMessage(message: Message) {
    setMessages((messages) => [...messages, message]);
  }

  const { mutate, isLoading } = useMutation({
    mutationFn: async (message: PostMessagePayload) => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ ...message }),
      });
      const json: { response: string } = await res.json();
      return json;
    },
    onSuccess: (data) => {
      const { response } = data;
      if (!response) return;
      setMessages((messages) => [
        ...messages,
        {
          id: nanoid(),
          content: response,
          role: 'assistant',
        },
      ]);
    },
  });

  const onSubmit = async () => {
    const inputText = input.current?.value;
    if (!inputText) return;

    const prompt = {
      id: nanoid(),
      content: inputText,
      role: 'user',
    } as Message;

    appendMessage(prompt);
    mutate({ messages: messages ? [...messages, prompt] : [prompt] });
    input.current!.value = '';
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
