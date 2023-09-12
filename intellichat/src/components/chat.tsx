'use client';

import React from 'react';
import { nanoid } from 'nanoid';
import { ChatPanel } from './chat-panel';
import { ChatPrompt } from './chat-prompt';
import Container from '@/components/shared/container';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { PostMessagePayload } from '@/lib/validators';
import { Message } from '@/lib/types';
import { useChatSettings } from '@/store/chat-settings';
import { useToast } from './ui/use-toast';

export default function Chat() {
  const getSettings = useChatSettings((s) => s.getSettings);
  const setEnvKeyExist = useChatSettings((s) => s.setEnvKeyExist);
  const messages = useChatSettings((s) => s.messages);
  const setMessage = useChatSettings((s) => s.setMessage);

  const { toast } = useToast();

  const input = React.useRef<HTMLTextAreaElement>(null);

  const { mutate, isLoading } = useMutation({
    mutationFn: async (messages: Message[]) => {
      const { n, provider, providers, systemMessage, withContext } =
        getSettings();
      const payload: PostMessagePayload = {
        messages,
        provider,
        providers,
        systemMessage,
        withContext,
        n,
      };
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json: { response: string } = await res.json();
        return json;
      }
      const { error } = await res.json();
      throw new Error(`${error}`);
    },
    onSuccess: (data) => {
      const { response } = data;
      if (!response) return;
      setMessage({
        id: nanoid(),
        content: response,
        role: 'assistant',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        variant: 'destructive',
        description: err.message,
        duration: 5000,
      });
    },
  });

  // check if api keys are set as env variables
  const envKeysQuery = useQuery({
    queryKey: ['apiKeys'],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch('/api');
      if (res.ok) {
        const json = await res.json();
        return json as {
          openai: boolean;
          replicate: boolean;
        };
      }
      const { error } = await res.json();
      throw new Error(`${error}`);
    },
    onSuccess: (data) => {
      setEnvKeyExist(data);
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

    setMessage(prompt);
    mutate(messages ? [...messages, prompt] : [prompt]);
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
