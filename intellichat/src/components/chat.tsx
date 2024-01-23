'use client';

import React, { useEffect } from 'react';
import { nanoid } from 'nanoid';
import { ChatPanel } from './chat-panel';
import { ChatPrompt } from './chat-prompt';
import Container from '@/components/shared/container';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { PostMessagePayload } from '@/lib/validators';
import { Message } from '@/lib/types';
import { useChatSettings } from '@/store/chat-settings';
import { useToast } from './ui/use-toast';
import { useSearchParams } from 'next/navigation';

export default function Chat() {
  const messages = useChatSettings((s) => s.messages);
  const params = useSearchParams();
  const oneKey = params.get('one_key');

  const getSettings = useChatSettings((s) => s.getSettings);
  const setEnvKeys = useChatSettings((s) => s.setEnvKeys);
  const setMessage = useChatSettings((s) => s.setMessage);
  const setOneKey = useChatSettings((s) => s.setOneKey);

  useEffect(() => {
    const ok = oneKey ?? getSettings().oneKey;
    if (ok) setOneKey(ok);
  }, []);

  const { toast } = useToast();

  const input = React.useRef<HTMLTextAreaElement>(null);

  const { mutate, isLoading } = useMutation({
    mutationFn: async (payload: PostMessagePayload) => {
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
  useQuery({
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
          cohere: boolean;
          google: boolean;
          azure: boolean;
        };
      }
      const { error } = await res.json();
      throw new Error(`${error}`);
    },
    onSuccess: (data) => {
      setEnvKeys(data);
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
    const payload: PostMessagePayload = {
      messages: messages ? [...messages, prompt] : [prompt],
      ...getSettings(),
    };
    mutate(payload);
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
