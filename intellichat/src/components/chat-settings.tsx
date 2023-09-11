import React from 'react';

import { useChatSettings } from '@/store/chat-settings';

import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  AIProviders,
  openAIModels,
  replicateModels,
} from '@/lib/chat-providers';
import { Switch } from './ui/switch';
import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

export default function ChatSettings() {
  const systemMessage = useChatSettings((s) => s.systemMessage);
  const numberOfMessages = useChatSettings((s) => s.numberOfMessages);
  const provider = useChatSettings((s) => s.provider);
  const openaikey = useChatSettings((s) => s.apiKeys.openai);
  const replicatekey = useChatSettings((s) => s.apiKeys.replicate);
  const withContext = useChatSettings((s) => s.withContext);

  const updateSystemMessage = useChatSettings((s) => s.setSystemMessage);
  const setNumberOfMessages = useChatSettings((s) => s.setNumberOfMessages);
  const setKey = useChatSettings((s) => s.setKey);
  const updateProvider = useChatSettings((s) => s.setProvider);
  const updateModel = useChatSettings((s) => s.setModel);
  const setWithContext = useChatSettings((s) => s.setWithContext);

  return (
    <ScrollArea className='h-full'>
      <FieldGroup>
        <Label htmlFor='systemMsg'>System Message</Label>
        <Input
          id='systemMsg'
          value={systemMessage}
          onChange={(e) => {
            updateSystemMessage(e.target.value);
          }}
        />
      </FieldGroup>
      <FieldGroup>
        <Label>Provider</Label>
        <Select
          value={provider.name}
          defaultValue='openai'
          onValueChange={(e: string) => {
            updateProvider(e as keyof typeof AIProviders);
          }}
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='Select a Model' />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.keys(AIProviders).map((key) => (
                <SelectItem key={key} value={key}>
                  {AIProviders[key as keyof typeof AIProviders].name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FieldGroup>
      <FieldGroup>
        <Label>Models</Label>
        <Select
          value={provider.model}
          defaultValue='davinci'
          onValueChange={(e: string) => {
            updateModel(
              e as
                | (typeof openAIModels)[number]
                | (typeof replicateModels)[number]
            );
          }}
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='Select a Model' />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {AIProviders[provider.name].models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FieldGroup>
      <FieldGroup>
        <div className='flex items-center gap-2'>
          <Label htmlFor='systemMsg'>Number of Messages</Label>
          <FieldTooltip>
            <p className='text-sm'>
              The number of messages to include in a request. The higher the
              number, the more context the AI will have to work with. This will
              determine the number of messages used to generate the context when
              the "Use Chat Context" option is enabled.
            </p>
          </FieldTooltip>
        </div>
        <Input
          id='systemMsg'
          type='number'
          min={4}
          max={8}
          value={numberOfMessages}
          onChange={(e) => {
            setNumberOfMessages(parseInt(e.target.value));
          }}
        />
      </FieldGroup>
      <FieldGroup withToolTip>
        <Switch
          disabled={provider.name === 'openai'}
          checked={withContext}
          onCheckedChange={setWithContext}
          id='use-chatcontext'
        />
        <Label htmlFor='use-chatcontext'>Use Chat Context</Label>
        <FieldTooltip>
          <p className='text-sm'>
            When enabled, the chatbot wil dynamically select previous parts of
            the conversation that are most relevant to the current query, using
            embeddings. The number of parts will be equal to the number of
            messages set above.
          </p>
        </FieldTooltip>
      </FieldGroup>
      <div className='space-y-2'>
        <ApiKeyInput
          name='replicate'
          label='Replicate API Key'
          value={replicatekey}
          onChange={(e) => setKey('replicate', e.target.value)}
        />
        <ApiKeyInput
          name='openai'
          label='OpenAI API Key'
          value={openaikey}
          onChange={(e) => setKey('openai', e.target.value)}
        />
      </div>
    </ScrollArea>
  );
}

function ApiKeyInput({
  name,
  label,
  value,
  onChange,
}: {
  name: 'openai' | 'replicate';
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const envKeyExist = useChatSettings((s) => s.envKeyExist);
  const provider = useChatSettings((s) => s.provider);
  const withContext = useChatSettings((s) => s.withContext);
  const isVisible =
    provider.name === name || (withContext && name === 'openai');

  const isRequired = envKeyExist[name];

  if (!isVisible) return null;

  return (
    <FieldGroup>
      <Label htmlFor='openaiKey'>{label}</Label>
      <Input
        id='openaiKey'
        value={value}
        onChange={onChange}
        required={isRequired}
      />
      {envKeyExist[name] && (
        <p className='text-xs text-zinc-300'>
          API Key is set as an environment variable, but you can override it
          here.
        </p>
      )}
    </FieldGroup>
  );
}

function FieldGroup({
  children,
  withToolTip,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
  withToolTip?: boolean;
}) {
  return (
    <div
      className={cn(
        'mb-4 space-y-2',
        withToolTip && 'flex items-center space-x-2 space-y-0',
        className
      )}
    >
      {children}
    </div>
  );
}

function FieldTooltip({ children }: { children?: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon width={20} />
        <TooltipContent className='max-w-xs text-left'>
          {children}
        </TooltipContent>
      </TooltipTrigger>
    </Tooltip>
  );
}
