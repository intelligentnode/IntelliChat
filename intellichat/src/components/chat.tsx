'use client';

import React, { useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { ChatPanel } from './chat-panel';
import { ChatPrompt, type Attachment } from './chat-prompt';
import Container from '@/components/shared/container';
import { useQuery } from '@tanstack/react-query';
import type { PostMessagePayload } from '@/lib/validators';
import { STREAM_ERROR_MARKER, type AgentMessage, type AgentStep, type LinkContext, type Message } from '@/lib/types';
import { useChatSettings } from '@/store/chat-settings';
import { useToast } from './ui/use-toast';
import { providerConfig, supportsStreaming, supportsTools, supportsVision, type Vendor } from '@/lib/ai-providers';
import { Recorder, imageToDataUrl, requestImage, speak, stopSpeaking, transcribe } from '@/lib/client';
import { imageCommandMessage, parseCommand } from '@/lib/commands';
import { connectRepo, fetchLinkContext, findGitHubLinks, linkLabel, parseRepoInput, type ConnectedRepo, type GitHubAccess } from '@/lib/github';
import { runAgent } from '@/lib/agent';
import { TooltipProvider } from './ui/tooltip';

// The Voice tab key also serves transcription when the speech provider is OpenAI.
function transcriptionKey() {
  const { speech } = useChatSettings.getState();
  return speech.provider === 'openai' ? speech.apiKey : '';
}

// GitHub from the browser with the user's token or none, or through the server when only .env has a token.
function githubAccess(): GitHubAccess {
  const { code, envKeys } = useChatSettings.getState();
  if (code.githubToken.trim()) return { token: code.githubToken.trim() };
  return envKeys.github ? { viaServer: true } : {};
}

// Image requests and generated images are not part of the conversation sent to the chat model,
// and neither are empty replies (a reply stopped before its first word).
function isConversation(message: Message) {
  if (message.role === 'assistant') return Boolean(message.content.trim());
  return !parseCommand(message.content).command;
}

// What the model receives for a message: the text plus the details of its GitHub links.
function messageText(message: Message) {
  const details = (message.context || []).filter((item) => item.state === 'ready' && item.content).map((item) => item.content);
  return details.length ? `${message.content}\n\n${details.join('\n\n')}` : message.content;
}

// An image prompt with a short line about the linked repos, issues or files.
function imagePromptWithLinks(text: string, context?: LinkContext[]) {
  const about = (context || []).filter((item) => item.state === 'ready' && item.summary).map((item) => item.summary).join('; ');
  return about ? `${text}\n\nAbout: ${about.slice(0, 600)}` : text;
}

export default function Chat() {
  const messages = useChatSettings((s) => s.messages);
  const getSettings = useChatSettings((s) => s.getSettings);
  const setEnvKeys = useChatSettings((s) => s.setEnvKeys);
  const setMessage = useChatSettings((s) => s.setMessage);
  const updateMessage = useChatSettings((s) => s.updateMessage);
  const images = useChatSettings((s) => s.images);
  const speech = useChatSettings((s) => s.speech);
  const code = useChatSettings((s) => s.code);

  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [canRecord, setCanRecord] = useState(false);
  // saved settings exist only in the browser, so settings-driven controls render after the first client render
  const [mounted, setMounted] = useState(false);
  // the GitHub repo connected to this chat
  const [repo, setRepo] = useState<ConnectedRepo | null>(null);

  const { toast } = useToast();
  const input = useRef<HTMLTextAreaElement>(null);
  const abortController = useRef<AbortController | null>(null);
  const recorder = useRef<Recorder | null>(null);

  useEffect(() => {
    setCanRecord(Recorder.supported());
    setMounted(true);
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

  // local files exist only when the server runs with CODE_WORKSPACE
  const workspace = useQuery({
    queryKey: ['workspace'],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => (await (await fetch('/api/workspace')).json()) as { enabled: boolean; name: string },
  });
  const localFolder = code.localFiles && workspace.data?.enabled ? { name: workspace.data.name, allowEdits: code.allowEdits } : null;

  const showError = (title: string, error: unknown) => {
    toast({ title, variant: 'destructive', description: error instanceof Error ? error.message : String(error), duration: 6000 });
  };

  // read the reply aloud when the setting is on
  const maybeReadAloud = (id: string, text: string) => {
    if (!speech.readAloud || !text) return;
    speak(id, text, speech, getSettings().providers).catch((error) => showError('Read aloud', error));
  };

  const onConnectRepo = async (value: string) => {
    const target = parseRepoInput(value);
    if (!target) {
      showError('GitHub', 'Enter owner/repo or a GitHub link.');
      return false;
    }
    try {
      setRepo(await connectRepo(target, githubAccess()));
      return true;
    } catch (error) {
      showError('GitHub', error);
      return false;
    }
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
    const history = [...messages, prompt]
      .filter(isConversation)
      .map((message) => ({ role: message.role, content: messageText(message), ...(message.image && { image: message.image }) }));
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

  // the coding assistant: tool steps show live, then the answer
  const sendAgent = async (prompt: Message, activeRepo: ConnectedRepo | null, signal: AbortSignal) => {
    const id = nanoid();
    let steps: AgentStep[] = [];
    setStreamingMessage({ id, role: 'assistant', content: '', steps });
    const history: AgentMessage[] = [...messages, prompt].filter(isConversation).map((message) =>
      message.role === 'user'
        ? { role: 'user', content: messageText(message), ...(message.image && { image: message.image }) }
        : { role: 'assistant', content: messageText(message) }
    );
    try {
      const result = await runAgent({
        settings: getSettings(),
        messages: history,
        repo: activeRepo,
        local: Boolean(localFolder),
        allowEdits: code.allowEdits,
        access: githubAccess(),
        signal,
        onSteps: (next) => {
          steps = next;
          setStreamingMessage({ id, role: 'assistant', content: '', steps: next });
        },
      });
      setStreamingMessage(null);
      setMessage({ id, role: 'assistant', content: result.text, steps: result.steps });
      maybeReadAloud(id, result.text);
    } catch (error) {
      setStreamingMessage(null);
      // keep the steps that ran, so the timeline still shows what happened
      if (steps.length) {
        const settled = steps.map((step) => (step.state === 'running' ? { ...step, state: 'error' as const, summary: 'Stopped' } : step));
        setMessage({ id, role: 'assistant', content: '', steps: settled, stopped: true });
      }
      throw error;
    }
  };

  const sendImage = async (prompt: string, signal: AbortSignal) => {
    const image = await requestImage(prompt, images, getSettings().providers, signal);
    setMessage({ id: nanoid(), content: '', image, imagePrompt: prompt, role: 'assistant' });
  };

  // fetch the details of a message's GitHub links; the chips under the message show the progress
  const loadLinks = async (message: Message, links: ReturnType<typeof findGitHubLinks>, signal: AbortSignal): Promise<Message> => {
    const access = githubAccess();
    const context = await Promise.all(
      links.map(({ url, ref }) =>
        fetchLinkContext(url, ref, access, signal).catch((error): LinkContext => ({
          url,
          label: linkLabel(ref),
          state: 'error',
          error: error instanceof Error ? error.message : String(error),
        }))
      )
    );
    updateMessage(message.id, { context });
    return { ...message, context };
  };

  const onSubmit = async () => {
    if (isLoading || !input.current) return;
    const parsed = parseCommand(input.current.value);
    const asImage = imageMode || parsed.command === 'image';
    const text = parsed.text.trim();

    // "/image" on its own: show the command badge and wait for the description
    if (parsed.command === 'image' && !text) {
      input.current.value = '';
      setImageMode(true);
      return;
    }
    if (!text && !attachment) return;

    const settings = getSettings();
    if (attachment && !asImage && !supportsVision(settings.provider)) {
      showError('Attachment', `${settings.provider} does not accept images. Switch to OpenAI, Anthropic, Gemini, Mistral or a local vision model.`);
      return;
    }

    const links = findGitHubLinks(text);
    let prompt: Message = {
      id: nanoid(),
      content: asImage ? imageCommandMessage(text) : text,
      role: 'user',
      ...(attachment && !asImage && { image: attachment.dataUrl }),
      ...(links.length > 0 && { context: links.map(({ url, ref }) => ({ url, label: linkLabel(ref), state: 'loading' as const })) }),
    };
    setMessage(prompt);
    input.current.value = '';
    setAttachment(null);
    stopSpeaking();
    if (asImage) setImageMode(true);

    const controller = new AbortController();
    abortController.current = controller;
    setIsLoading(true);
    try {
      if (links.length) {
        prompt = await loadLinks(prompt, links, controller.signal);
        if (controller.signal.aborted) return;
      }

      // with repo connecting on, a pasted GitHub link connects its repo when none is connected yet
      let activeRepo = code.github ? repo : null;
      if (code.github && !activeRepo && links.length && !asImage) {
        const { ref } = links[0];
        const branch = ref.kind === 'file' || ref.kind === 'dir' ? ref.ref : undefined;
        activeRepo = await connectRepo({ owner: ref.owner, repo: ref.repo, branch }, githubAccess(), controller.signal).catch(() => null);
        if (activeRepo) setRepo(activeRepo);
      }

      const wantsTools = !asImage && (Boolean(activeRepo) || Boolean(localFolder));
      if (asImage) {
        await sendImage(imagePromptWithLinks(text, prompt.context), controller.signal);
      } else if (wantsTools && supportsTools(settings.provider)) {
        await sendAgent(prompt, activeRepo, controller.signal);
      } else {
        if (wantsTools) {
          toast({ title: 'Coding assistant', description: `${providerConfig(settings.provider).label} cannot use tools, so it answers from the message and the link details only.`, duration: 6000 });
        }
        await sendChat(prompt, controller.signal);
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') showError(asImage ? 'Image' : 'Error', error);
      setStreamingMessage(null);
    } finally {
      setIsLoading(false);
      abortController.current = null;
      // the image command applies to one message
      if (asImage) setImageMode(false);
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
        const transcript = await transcribe(file, file.name, getSettings().providers, transcriptionKey());
        appendToPrompt(transcript);
      } else {
        showError('Attachment', 'Attach an image or an audio file.');
      }
    } catch (error) {
      showError('Attachment', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const appendToPrompt = (value: string) => {
    if (!input.current) return;
    const current = input.current.value.trim();
    input.current.value = current ? `${current} ${value}` : value;
    input.current.focus();
  };

  const onToggleRecording = async () => {
    try {
      if (!recorder.current) recorder.current = new Recorder();
      if (recorder.current.recording) {
        setIsRecording(false);
        setIsTranscribing(true);
        const { blob, filename } = await recorder.current.stop();
        const transcript = await transcribe(blob, filename, getSettings().providers, transcriptionKey());
        appendToPrompt(transcript);
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
          onImageModeChange={setImageMode}
          attachment={attachment}
          onAttach={onAttach}
          onClearAttachment={() => setAttachment(null)}
          canRecord={canRecord}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          onToggleRecording={onToggleRecording}
          githubEnabled={mounted && code.github}
          repo={repo}
          onConnectRepo={onConnectRepo}
          onDisconnectRepo={() => setRepo(null)}
          localFolder={localFolder}
        />
      </Container>
    </TooltipProvider>
  );
}
