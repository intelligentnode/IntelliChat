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
import { ScrollArea } from './ui/scroll-area';
import FieldTooltip from './field-tooltip';
import FieldGroup from './field-group';
import ApiKeyInput from './apikey-input';

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
