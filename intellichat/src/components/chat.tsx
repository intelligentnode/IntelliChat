'use client';

import React, { useEffect, useState } from 'react';
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
  const [streamingMessage, setStreamingMessage] = React.useState<Message | null>(null);
  const [isStreaming , setIsStreaming] = useState(false);
  // const [chatPanelMessage, setChatPanelMessage] = useState(messages);



  useEffect(() => {
    const ok = oneKey ?? getSettings().oneKey;
    if (ok) setOneKey(ok);
  }, []);

  const { toast } = useToast();
  const input = React.useRef<HTMLTextAreaElement>(null);

  const handleStream = async (response: Response, messageId: string) => {
    const reader = response.body?.getReader();
    if (!reader) return;
  
    const decoder = new TextDecoder();
    let accumulatedContent = '';
    let frameId: number | null = null;
  
    const updateMessage = () => {
      setStreamingMessage({
        id: messageId,
        content: accumulatedContent,
        role: 'assistant',
      });
      frameId = null;
    };
  
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        accumulatedContent += decoder.decode(value);
  
        // Reduce re-renders: Schedule the update if not already scheduled
        if (!frameId) {
          frameId = requestAnimationFrame(updateMessage);
        }
      }

      if (frameId) {
        cancelAnimationFrame(frameId);
        updateMessage(); // Final update before clearing streamingMessage
      }
      
      setIsStreaming(false);

      // Final update once stream ends
      setMessage({
        id: messageId,
        content: accumulatedContent,
        role: 'assistant',
      });

      setStreamingMessage(null);
    } catch (error) {
      console.error('Stream reading error:', error);
      reader.cancel();
    }
  };
  

  const { mutate, isLoading } = useMutation({
    mutationFn: async (payload: PostMessagePayload) => {
      const settings = getSettings();
      const supportsStreaming = settings.provider === 'openai' ||
                          settings.provider === 'cohere' ||
                          settings.provider === 'vllm';
      const isStreaming = supportsStreaming && settings.stream;
      setIsStreaming(isStreaming);

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify(payload),
        // Add headers to indicate streaming for OpenAI or Cohere
        headers: {
          'Content-Type': 'application/json',
          'Accept': isStreaming ? 'text/event-stream' : 'application/json',
        },
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(`${error}`);
      }

      if (isStreaming) {
        // Handle streaming for OpenAI or Cohere
        const messageId = nanoid();
        handleStream(res, messageId);
        return null; // Return null as we're handling the response in handleStream
      } else {
        // Handle normal response for other providers
        const json: {
          response: string[];
          references: { [key: string]: string } | null;
        } = await res.json();
        return json;
      }
    },
    onSuccess: (data) => {

      if (!data) return; // Skip for streaming responses
      
      const { response, references } = data;
      if (!response) return;
      const refsSet = references ? new Set(Object.keys(references)) : null;
      const refs = references && refsSet ? Array.from(refsSet.keys()) : null;
      
      setMessage({
        id: nanoid(),
        content: response[0],
        references: refs,
        role: 'assistant',
      });
    },
    onError: (err: any) => {
      setStreamingMessage(null);
      toast({
        title: 'Error',
        variant: 'destructive',
        description: err.message,
        duration: 5000,
      });
    },
  });

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
    onSuccess: (data:any) => {
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

    console.log("Payload", payload);

    mutate(payload);
    input.current!.value = '';
  };

  return (
    <Container className='relative grid min-h-[calc(100vh-88px)] grid-rows-[1fr,min-content]'>
      <div className='py-10'>
        <ChatPanel 
          chat={messages} 
          streamingMessage={streamingMessage}
          isStreaming={isStreaming}  // Pass streaming message to ChatPanel
        />
      </div>
      <ChatPrompt ref={input} isLoading={isStreaming || isLoading} onSubmit={onSubmit} />
    </Container>
  );
}