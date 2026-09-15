'use client';

import React, { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronDown, FolderGit2, Info, Loader2, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { useChatSettings, defaultProviderSettings } from '@/store/chat-settings';
import {
  AIProviders,
  EnvKeyVendors,
  ImageProviders,
  OpenAIVoices,
  SpeechProviders,
  hasModelList,
  isKeyless,
  providerConfig,
  supportsStreaming,
  type ProviderName,
  type Vendor,
} from '@/lib/ai-providers';
import { formSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormInputField, FormSelectField, FormSwitchField } from '@/components/form-ui';
import { useToast } from './ui/use-toast';

type FormValues = z.infer<typeof formSchema>;
type Tab = 'chat' | 'images' | 'voice' | 'code';

// What serves a key while its field is empty: a key from .env or from the Chat tab, or nothing needed (local servers).
type KeyNote = { text: string; tone: 'ready' | 'info'; overrides?: string };

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'chat', label: 'Chat' },
  { id: 'images', label: 'Images' },
  { id: 'voice', label: 'Voice' },
  { id: 'code', label: 'Code' },
];

const providerGroups: Array<{ label: string; names: ProviderName[] }> = [
  { label: 'Cloud', names: ['openai', 'anthropic', 'google', 'cohere', 'mistral', 'replicate', 'azure'] },
  { label: 'OpenAI-compatible', names: ['openrouter', 'groq', 'deepseek'] },
  { label: 'Local and self-hosted', names: ['ollama', 'lmstudio', 'vllm'] },
];

const imageProviderOptions = Object.values(ImageProviders).map((p) => ({ label: p.label, value: p.name, _key: p.name }));
const speechProviderOptions = Object.values(SpeechProviders).map((p) => ({ label: p.label, value: p.name, _key: p.name }));
const voiceOptions = OpenAIVoices.map((voice) => ({ label: voice, value: voice, _key: voice }));
const vendorLabels: Partial<Record<Vendor, string>> = { openai: 'OpenAI', google: 'Google', stability: 'Stability AI' };

// Local servers and vLLM need their URL; hosted OpenAI-compatible APIs use the intellinode preset.
const needsBaseUrl = (name: ProviderName) => ['local', 'vllm'].includes(providerConfig(name).kind);

// An API key field. While empty, the key in use shows as a note: the key value from .env never reaches the browser.
// A typed key takes priority over .env and stays in this browser.
function KeyField({ control, name, label, envVar, note }: {
  control: any;
  name: string;
  label: string;
  envVar?: string;
  note: KeyNote | null;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // move the cursor to the field once the user asks to type a key
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const typed = Boolean(String(field.value || '').trim());
        const showNote = !typed && !editing && note;
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {showNote ? (
              <div
                className={cn(
                  'flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm',
                  note.tone === 'ready' ? 'border-emerald-900 bg-emerald-950/40 text-emerald-300' : 'border-zinc-700 bg-zinc-800/60 text-zinc-300'
                )}
                data-testid='key-note'
              >
                <span className='flex items-center gap-2'>
                  {note.tone === 'ready' ? <Check size={16} className='shrink-0' /> : <Info size={16} className='shrink-0' />}
                  {note.text}
                </span>
                <button
                  type='button'
                  onClick={() => setEditing(true)}
                  className='shrink-0 text-xs text-zinc-400 hover:text-white hover:underline'
                >
                  {note.tone === 'ready' ? 'Use my key' : 'Add a key'}
                </button>
              </div>
            ) : (
              <>
                <div className='flex gap-2'>
                  <FormControl>
                    <Input
                      {...field}
                      ref={(element) => {
                        field.ref(element);
                        inputRef.current = element;
                      }}
                      value={field.value || ''}
                      type='password'
                      placeholder='Paste your key'
                      autoComplete='off'
                    />
                  </FormControl>
                  {note && (
                    <Button
                      type='button'
                      variant='ghost'
                      className='shrink-0 px-3 text-zinc-400'
                      onClick={() => {
                        field.onChange('');
                        setEditing(false);
                      }}
                    >
                      {typed ? 'Remove' : 'Cancel'}
                    </Button>
                  )}
                </div>
                <FormDescription>
                  {typed
                    ? note?.overrides || 'Saved in this browser only.'
                    : note?.tone === 'info'
                      ? 'Only needed when the server was started with a key.'
                      : note
                        ? 'Your key takes priority over the one in use.'
                        : envVar
                          ? `Or set ${envVar} in .env and restart the app.`
                          : 'Paste the key of this provider.'}
                </FormDescription>
              </>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

// Chat providers grouped by where they run, with a hint for the ones that are ready to use.
function ProviderSelect({ control, onChange, hint }: {
  control: any;
  onChange: (name: ProviderName) => void;
  hint: (name: ProviderName) => string | null;
}) {
  return (
    <FormField
      control={control}
      name='providerName'
      render={({ field }) => (
        <FormItem>
          <FormLabel>Provider</FormLabel>
          <Select
            value={field.value}
            onValueChange={(value) => {
              field.onChange(value);
              onChange(value as ProviderName);
            }}
          >
            <FormControl>
              <SelectTrigger data-testid='provider-select'>
                <SelectValue placeholder='Select a provider'>{providerConfig(field.value)?.label}</SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent className='max-h-[min(24rem,var(--radix-select-content-available-height))]'>
              {providerGroups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel className='text-xs font-medium uppercase tracking-wide text-zinc-500'>{group.label}</SelectLabel>
                  {group.names.map((name) => {
                    const note = hint(name);
                    return (
                      <SelectItem key={name} value={name} className='pr-20'>
                        {AIProviders[name].label}
                        {note && <span className='absolute right-2 text-xs text-zinc-500'>{note}</span>}
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default function ChatSettings({ close }: { close: () => void }) {
  const store = useChatSettings();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('chat');
  const [moreOpen, setMoreOpen] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);

  const defaultFormValues = {
    systemMessage: store.systemMessage,
    numberOfMessages: store.numberOfMessages,
    providerName: store.provider,
    providerModel: store.getModel() || '',
    providers: Object.fromEntries(
      Object.keys(AIProviders).map((name) => [name, store.providers[name as ProviderName] || defaultProviderSettings(name as ProviderName)])
    ) as typeof store.providers,
    stream: store.stream,
    withContext: store.withContext,
    images: store.images,
    speech: store.speech,
    code: store.code,
    envKeys: store.envKeys,
  };

  const form = useForm<FormValues>({
    values: defaultFormValues,
    defaultValues: defaultFormValues,
    resolver: zodResolver(formSchema),
  });

  const watchProviderName = form.watch('providerName') as ProviderName;
  const watchProviders = form.watch('providers') as Record<string, { apiKey?: string; model?: string; baseUrl?: string } | undefined>;
  const watchImages = form.watch('images');
  const watchSpeech = form.watch('speech');
  const watchContext = form.watch('withContext');
  const watchCode = form.watch('code');

  // local files exist only when the server runs with CODE_WORKSPACE
  const workspace = useQuery({
    queryKey: ['workspace'],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => (await (await fetch('/api/workspace')).json()) as { enabled: boolean; name: string },
  });
  const envKeys = store.envKeys as Record<string, boolean>;
  const config = providerConfig(watchProviderName);
  const selected = watchProviders[watchProviderName];
  const cloudList = hasModelList(watchProviderName) && config.kind === 'cloud';
  const canLoadModels = Boolean(config.dynamicModels) || watchProviderName === 'vllm';
  const contextAvailable = watchProviderName === 'openai' || watchProviderName === 'azure';

  // The notes follow the server order: a typed key, then the same vendor's key from the Chat tab, then .env.
  const typedChatKey = (vendor: string) => watchProviders[vendor]?.apiKey?.trim();
  const envNote = (vendor: Vendor): KeyNote | null =>
    envKeys[vendor]
      ? { text: `Using ${EnvKeyVendors[vendor]} from .env`, tone: 'ready', overrides: `Saved in this browser. It overrides ${EnvKeyVendors[vendor]} from .env.` }
      : null;
  const chatTabNote = (vendor: Vendor): KeyNote | null =>
    typedChatKey(vendor)
      ? { text: `Using the ${vendorLabels[vendor]} key from Chat`, tone: 'ready', overrides: 'Saved in this browser. It overrides the key from Chat.' }
      : null;

  const chatNote: KeyNote | null = isKeyless(watchProviderName)
    ? { text: 'No key needed for a local server', tone: 'info' }
    : envNote(watchProviderName as Vendor);
  const imageVendor = ImageProviders[watchImages.provider].vendor;
  const imageNote = chatTabNote(imageVendor) || envNote(imageVendor);
  const speechVendor = SpeechProviders[watchSpeech.provider].vendor;
  const speechNote = chatTabNote(speechVendor) || envNote(speechVendor);
  const transcriptionReady = Boolean(
    (watchSpeech.provider === 'openai' && watchSpeech.apiKey?.trim()) || typedChatKey('openai') || envKeys.openai
  );

  const ready: Record<Tab, boolean> = {
    chat: isKeyless(watchProviderName) || Boolean(selected?.apiKey?.trim() || envKeys[watchProviderName]),
    images: Boolean(watchImages.apiKey?.trim() || imageNote),
    voice: Boolean(watchSpeech.apiKey?.trim() || speechNote),
    // every coding feature is optional
    code: true,
  };

  const providerHint = (name: ProviderName) => {
    if (isKeyless(name)) return 'local';
    if (watchProviders[name]?.apiKey?.trim()) return 'your key';
    if (envKeys[name]) return '.env';
    return null;
  };

  function onSubmit({ providerName, providerModel, providers, withContext, stream, ...values }: FormValues) {
    const updatedProviders = { ...providers } as Record<string, any>;
    // cloud providers pick the model from the list; the others type it
    if (hasModelList(providerName) && providerConfig(providerName).kind === 'cloud') {
      updatedProviders[providerName] = { ...updatedProviders[providerName], model: providerModel };
    }
    store.updateChatSettings({
      provider: providerName,
      providers: updatedProviders as typeof providers,
      withContext: providerName === 'openai' || providerName === 'azure' ? withContext : false,
      stream: supportsStreaming(providerName) ? stream : false,
      images: values.images,
      speech: values.speech,
      code: values.code,
      systemMessage: values.systemMessage,
      numberOfMessages: values.numberOfMessages,
    });
    close();
  }

  // show the tab that holds the first invalid field
  function onError(errors: Record<string, unknown>) {
    if (errors.providers || errors.providerModel || errors.providerName || errors.numberOfMessages) setTab('chat');
    else if (errors.images) setTab('images');
    else if (errors.speech) setTab('voice');
    else if (errors.code) setTab('code');
  }

  function onChangeProviderName(name: ProviderName) {
    setModelOptions([]);
    const current = (form.getValues('providers') as Record<string, { model?: string }>)[name];
    const list = AIProviders[name] as { models?: readonly string[] };
    form.setValue('providerModel', current?.model || list.models?.[0] || '');
  }

  // fetch the models of a local server, vLLM or a hosted OpenAI-compatible API
  async function loadModels() {
    setLoadingModels(true);
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: watchProviderName, apiKey: selected?.apiKey || '', baseUrl: selected?.baseUrl || '' }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to load the models');
      setModelOptions(json.models);
      if (json.models.length && !selected?.model) {
        form.setValue(`providers.${watchProviderName}.model` as any, json.models[0]);
      }
      if (!json.models.length) toast({ title: 'Models', description: 'The server has no models yet.' });
    } catch (error: any) {
      toast({ title: 'Models', variant: 'destructive', description: error.message, duration: 6000 });
    } finally {
      setLoadingModels(false);
    }
  }

  function handleReset() {
    form.reset(defaultFormValues);
    store.resetState();
    setTab('chat');
  }

  const staticModelOptions = cloudList
    ? (config.models as readonly string[]).map((model) => ({ label: model, value: model, _key: model }))
    : [];

  return (
    <Form {...form}>
      <form className='flex min-h-0 flex-1 flex-col' onSubmit={form.handleSubmit(onSubmit, onError)}>
        <div role='tablist' aria-label='Settings' className='grid grid-cols-4 gap-1 rounded-lg bg-zinc-800/80 p-1'>
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type='button'
              role='tab'
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md py-1.5 text-sm transition-colors',
                tab === id ? 'bg-zinc-950 text-white shadow' : 'text-zinc-400 hover:text-white'
              )}
              data-testid={`tab-${id}`}
            >
              <span
                className={cn('h-2 w-2 rounded-full', ready[id] ? 'bg-emerald-500' : 'bg-amber-500')}
                title={ready[id] ? 'Ready' : 'Needs an API key'}
              />
              {label}
            </button>
          ))}
        </div>

        <ScrollArea className='mt-5 min-h-0 flex-1 pr-3'>
          <div className='space-y-5 pb-6' role='tabpanel'>
            {tab === 'chat' && (
              <>
                <ProviderSelect control={form.control} onChange={onChangeProviderName} hint={providerHint} />

                {cloudList ? (
                  <FormSelectField
                    key={`model-${watchProviderName}`}
                    control={form.control}
                    placeholder='Select a model'
                    name='providerModel'
                    label='Model'
                    options={staticModelOptions}
                  />
                ) : watchProviderName === 'azure' ? (
                  <div className='space-y-5'>
                    <FormInputField control={form.control} name='providers.azure.model' label='Deployment name' />
                    <FormInputField control={form.control} name='providers.azure.resourceName' label='Resource name' />
                    <FormInputField control={form.control} name='providers.azure.embeddingName' label='Embedding deployment' />
                  </div>
                ) : (
                  <FormField
                    key={`model-${watchProviderName}`}
                    control={form.control}
                    name={`providers.${watchProviderName}.model` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <div className='flex gap-2'>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              list={`models-${watchProviderName}`}
                              placeholder={watchProviderName === 'vllm' ? 'e.g. meta-llama/Llama-3.1-8B-Instruct' : 'Type a model or load the list'}
                              autoComplete='off'
                            />
                          </FormControl>
                          {canLoadModels && (
                            <Button type='button' variant='outline' onClick={loadModels} disabled={loadingModels} aria-label='Load models' title='Load models' className='shrink-0'>
                              {loadingModels ? <Loader2 size={16} className='animate-spin' /> : <RefreshCw size={16} />}
                            </Button>
                          )}
                        </div>
                        <datalist id={`models-${watchProviderName}`}>
                          {Array.from(new Set([...(config.models || []), ...modelOptions])).map((model) => (
                            <option key={model} value={model} />
                          ))}
                        </datalist>
                        {modelOptions.length > 0 && (
                          <FormDescription>
                            {modelOptions.length === 1 ? '1 model' : `${modelOptions.length} models`} available on the server.
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {needsBaseUrl(watchProviderName) && (
                  <FormInputField
                    key={`url-${watchProviderName}`}
                    control={form.control}
                    name={`providers.${watchProviderName}.baseUrl`}
                    label='Server URL'
                    placeholder={config.baseUrl}
                  />
                )}

                <KeyField
                  key={`key-${watchProviderName}`}
                  control={form.control}
                  name={`providers.${watchProviderName}.apiKey`}
                  label='API key'
                  envVar={config.envKey}
                  note={chatNote}
                />

                {supportsStreaming(watchProviderName) && (
                  <FormSwitchField
                    control={form.control}
                    name='stream'
                    label='Stream replies'
                    withTooltip={true}
                    tooltipText='Show the reply while it is written. The Stop button cancels it.'
                  />
                )}

                <Collapsible open={moreOpen} onOpenChange={setMoreOpen} className='rounded-md border border-zinc-800'>
                  <CollapsibleTrigger asChild>
                    <button type='button' className='flex w-full items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:text-white'>
                      More options
                      <ChevronDown size={16} className={cn('transition-transform', moreOpen && 'rotate-180')} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className='space-y-5 border-t border-zinc-800 px-3 py-4'>
                    <FormInputField control={form.control} name='systemMessage' label='System message' placeholder='You are a helpful assistant.' />
                    {contextAvailable && (
                      <FormSwitchField
                        control={form.control}
                        name='withContext'
                        label='Smart context'
                        withTooltip={true}
                        tooltipText='Send only the earlier messages related to the question, picked with OpenAI embeddings.'
                      />
                    )}
                    {contextAvailable && watchContext && (
                      <FormInputField
                        control={form.control}
                        name='numberOfMessages'
                        label='Messages to keep'
                        type='number'
                        min={2}
                        max={6}
                        onChange={(e) => form.setValue('numberOfMessages', Number(e.target.value))}
                      />
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {tab === 'images' && (
              <>
                <p className='text-sm text-zinc-400'>Use the image button in the message box, or start a message with /image.</p>
                <FormSelectField control={form.control} placeholder='Image provider' name='images.provider' label='Provider' options={imageProviderOptions} />
                <KeyField
                  key={`images-${watchImages.provider}`}
                  control={form.control}
                  name='images.apiKey'
                  label={`${vendorLabels[imageVendor]} API key`}
                  envVar={ImageProviders[watchImages.provider].envKey}
                  note={imageNote}
                />
              </>
            )}

            {tab === 'voice' && (
              <>
                <FormSwitchField
                  control={form.control}
                  name='speech.readAloud'
                  label='Read replies aloud'
                  withTooltip={true}
                  tooltipText='Speak each reply when it arrives. The Read aloud button under a reply works either way.'
                />
                <FormSelectField control={form.control} placeholder='Speech provider' name='speech.provider' label='Speech provider' options={speechProviderOptions} />
                {watchSpeech.provider === 'openai' && (
                  <FormSelectField control={form.control} placeholder='Voice' name='speech.voice' label='Voice' options={voiceOptions} />
                )}
                <KeyField
                  key={`speech-${watchSpeech.provider}`}
                  control={form.control}
                  name='speech.apiKey'
                  label={`${vendorLabels[speechVendor]} API key`}
                  envVar={SpeechProviders[watchSpeech.provider].envKey}
                  note={speechNote}
                />
                <div className='flex items-start gap-2 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-400'>
                  {transcriptionReady ? (
                    <Check size={14} className='mt-0.5 shrink-0 text-emerald-400' />
                  ) : (
                    <Info size={14} className='mt-0.5 shrink-0 text-amber-400' />
                  )}
                  <span>
                    Voice input turns the microphone and audio files into text with OpenAI.
                    {transcriptionReady ? '' : ' It needs an OpenAI key.'}
                  </span>
                </div>
              </>
            )}

            {tab === 'code' && (
              <>
                <p className='text-sm text-zinc-400'>Code blocks with copy and download, and the details of pasted GitHub links, work in every chat.</p>
                <FormSwitchField
                  control={form.control}
                  name='code.github'
                  label='Connect GitHub repos'
                  withTooltip={true}
                  tooltipText='Adds a GitHub button to the message box. Connect one repo to the chat and the assistant reads its files, searches code and checks issues and pull requests.'
                />
                <KeyField
                  key='github-token'
                  control={form.control}
                  name='code.githubToken'
                  label='GitHub token (optional)'
                  envVar='GITHUB_TOKEN'
                  note={envNote('github')}
                />
                <div className='space-y-4 rounded-md border border-zinc-800 p-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-zinc-200'>
                    <FolderGit2 size={16} /> Local files
                  </div>
                  {workspace.data?.enabled ? (
                    <>
                      <p className='text-xs text-zinc-400'>Using the {workspace.data.name} folder from CODE_WORKSPACE in .env.</p>
                      <FormSwitchField control={form.control} name='code.localFiles' label='Let the assistant read files' />
                      {watchCode.localFiles && (
                        <FormSwitchField
                          control={form.control}
                          name='code.allowEdits'
                          label='Allow file edits'
                          withTooltip={true}
                          tooltipText='The assistant can change files in this folder and shows every change as a diff.'
                        />
                      )}
                    </>
                  ) : (
                    <p className='text-xs text-zinc-400'>When you run the app on your computer, set CODE_WORKSPACE in .env to a project folder so the assistant can read and edit its files.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className='flex items-center justify-between border-t border-zinc-800 pt-4'>
          <Button type='submit'>Save</Button>
          <Button type='button' variant='ghost' className='text-zinc-400' onClick={handleReset}>
            Reset
          </Button>
        </div>
      </form>
    </Form>
  );
}
