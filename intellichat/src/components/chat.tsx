'use client';

import React, { useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { ChatPanel } from './chat-panel';
import { ChatPrompt, type Attachment } from './chat-prompt';
import Container from '@/components/shared/container';
import { useQuery } from '@tanstack/react-query';
import type { PostMessagePayload } from '@/lib/validators';
import { Message, STREAM_ERROR_MARKER } from '@/lib/types';
import { useChatSettings } from '@/store/chat-settings';
import { useToast } from './ui/use-toast';
import { supportsStreaming, supportsVision, type Vendor } from '@/lib/ai-providers';
import { Recorder, imageToDataUrl, requestImage, speak, stopSpeaking, transcribe } from '@/lib/client';
import { TooltipProvider } from './ui/tooltip';

const IMAGE_COMMAND = /^\/image\s+/i;

// The Voice tab key also serves transcription when the speech provider is OpenAI.
function transcriptionKey() {
  const { speech } = useChatSettings.getState();
  return speech.provider === 'openai' ? speech.apiKey : '';
}

export default function Chat() {
  const messages = useChatSettings((s) => s.messages);
  const getSettings = useChatSettings((s) => s.getSettings);
  const setEnvKeys = useChatSettings((s) => s.setEnvKeys);
  const setMessage = useChatSettings((s) => s.setMessage);
  const images = useChatSettings((s) => s.images);
  const speech = useChatSettings((s) => s.speech);

  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [canRecord, setCanRecord] = useState(false);

  const { toast } = useToast();
  const input = useRef<HTMLTextAreaElement>(null);
  const abortController = useRef<AbortController | null>(null);
  const recorder = useRef<Recorder | null>(null);

  useEffect(() => {
    setCanRecord(Recorder.supported());
  }, []);

  useQuery({
    queryKey: ['apiKeys'],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch('/api');
      if (res.ok) return (await res.json()) as Record<Vendor, boolean>;
      const { error } = await res.json();
      throw new Error(`${error}`);
    },
    onSuccess: (data) => setEnvKeys(data),
  });

  const showError = (title: string, error: unknown) => {
    toast({ title, variant: 'destructive', description: error instanceof Error ? error.message : String(error), duration: 6000 });
  };

  // read the reply aloud when the setting is on
  const maybeReadAloud = (id: string, text: string) => {
    if (!speech.readAloud || !text) return;
    speak(id, text, speech, getSettings().providers).catch((error) => showError('Read aloud', error));
  };

  const readStream = async (response: Response, messageId: string, signal: AbortSignal) => {
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let accumulated = '';
    let frameId: number | null = null;
    // an error after the reply started arrives at the end of the stream, behind a marker
    const split = () => {
      const at = accumulated.indexOf(STREAM_ERROR_MARKER);
      return at < 0
        ? { reply: accumulated, failure: '' }
        : { reply: accumulated.slice(0, at), failure: accumulated.slice(at + STREAM_ERROR_MARKER.length).trim() };
    };
    const update = () => {
      setStreamingMessage({ id: messageId, content: split().reply, role: 'assistant' });
      frameId = null;
    };
    let stopped = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        if (!frameId) frameId = requestAnimationFrame(update);
      }
    } catch (error) {
      if (!signal.aborted) throw error;
      stopped = true;
    } finally {
      if (frameId) cancelAnimationFrame(frameId);
      if (signal.aborted) stopped = true;
    }
    setStreamingMessage(null);
    const { reply, failure } = split();
    if (reply || stopped) {
      setMessage({ id: messageId, content: reply, role: 'assistant', stopped: stopped || Boolean(failure) });
      if (!stopped && !failure) maybeReadAloud(messageId, reply);
    }
    if (failure) showError('Error', failure);
  };

  const sendChat = async (prompt: Message, signal: AbortSignal) => {
    const settings = getSettings();
    const streaming = settings.stream && supportsStreaming(settings.provider);
    const history = [...messages, prompt].map(({ role, content, image }) => ({ role, content, ...(image && { image }) }));
    const payload: PostMessagePayload = { ...settings, messages: history };

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json', Accept: streaming ? 'text/event-stream' : 'application/json' },
      signal,
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(`${error}`);
    }
    const messageId = nanoid();
    if (streaming) {
      setStreamingMessage({ id: messageId, content: '', role: 'assistant' });
      await readStream(res, messageId, signal);
      return;
    }
    const json: { response: string[] } = await res.json();
    const content = json.response?.[0] || '';
    setMessage({ id: messageId, content, role: 'assistant' });
    maybeReadAloud(messageId, content);
  };

  const sendImage = async (prompt: string, signal: AbortSignal) => {
    const image = await requestImage(prompt, images, getSettings().providers, signal);
    setMessage({ id: nanoid(), content: '', image, imagePrompt: prompt, role: 'assistant' });
  };

  const onSubmit = async () => {
    const raw = input.current?.value.trim() || '';
    if (isLoading) return;
    const asImage = imageMode || IMAGE_COMMAND.test(raw);
    const text = raw.replace(IMAGE_COMMAND, '').trim();
    if (!text && !attachment) return;

    const settings = getSettings();
    if (attachment && !asImage && !supportsVision(settings.provider)) {
      showError('Attachment', `${settings.provider} does not accept images. Switch to OpenAI, Anthropic, Gemini, Mistral or a local vision model.`);
      return;
    }

    const prompt: Message = {
      id: nanoid(),
      content: asImage ? `/image ${text}` : text,
      role: 'user',
      ...(attachment && !asImage && { image: attachment.dataUrl }),
    };
    setMessage(prompt);
    input.current!.value = '';
    setAttachment(null);
    stopSpeaking();

    const controller = new AbortController();
    abortController.current = controller;
    setIsLoading(true);
    try {
      if (asImage) await sendImage(text, controller.signal);
      else await sendChat(prompt, controller.signal);
    } catch (error: any) {
      if (error?.name !== 'AbortError') showError(asImage ? 'Image' : 'Error', error);
      setStreamingMessage(null);
    } finally {
      setIsLoading(false);
      abortController.current = null;
    }
  };

  const onStop = () => {
    abortController.current?.abort();
  };

  const onAttach = async (file: File) => {
    try {
      if (file.type.startsWith('image/')) {
        setAttachment({ kind: 'image', dataUrl: await imageToDataUrl(file), name: file.name });
        setImageMode(false);
      } else if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|webm|ogg|flac)$/i.test(file.name)) {
        setIsTranscribing(true);
        const text = await transcribe(file, file.name, getSettings().providers, transcriptionKey());
        appendToPrompt(text);
      } else {
        showError('Attachment', 'Attach an image or an audio file.');
      }
    } catch (error) {
      showError('Attachment', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const appendToPrompt = (text: string) => {
    if (!input.current) return;
    const current = input.current.value.trim();
    input.current.value = current ? `${current} ${text}` : text;
    input.current.focus();
  };

  const onToggleRecording = async () => {
    try {
      if (!recorder.current) recorder.current = new Recorder();
      if (recorder.current.recording) {
        setIsRecording(false);
        setIsTranscribing(true);
        const { blob, filename } = await recorder.current.stop();
        const text = await transcribe(blob, filename, getSettings().providers, transcriptionKey());
        appendToPrompt(text);
      } else {
        await recorder.current.start();
        setIsRecording(true);
      }
    } catch (error) {
      setIsRecording(false);
      showError('Voice input', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <TooltipProvider>
      <Container className='relative grid min-h-[calc(100vh-88px)] grid-rows-[1fr,min-content]'>
        <div className='py-10'>
          <ChatPanel chat={messages} streamingMessage={streamingMessage} isStreaming={Boolean(streamingMessage)} />
        </div>
        <ChatPrompt
          ref={input}
          isLoading={isLoading}
          onSubmit={onSubmit}
          onStop={onStop}
          imageMode={imageMode}
          onToggleImageMode={() => setImageMode((mode) => !mode)}
          attachment={attachment}
          onAttach={onAttach}
          onClearAttachment={() => setAttachment(null)}
          canRecord={canRecord}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          onToggleRecording={onToggleRecording}
        />
      </Container>
    </TooltipProvider>
  );
}
