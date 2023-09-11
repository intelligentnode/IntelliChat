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
export default function ChatSettings() {
  const systemMessage = useChatSettings((s) => s.systemMessage);
  const numberOfMessages = useChatSettings((s) => s.numberOfMessages);
  const provider = useChatSettings((s) => s.provider);
  const openaikey = useChatSettings((s) => s.apiKeys.openai);
  const replicatekey = useChatSettings((s) => s.apiKeys.replicate);
  const useContext = useChatSettings((s) => s.useContext);

  const updateSystemMessage = useChatSettings((s) => s.setSystemMessage);
  const setNumberOfMessages = useChatSettings((s) => s.setNumberOfMessages);
  const setKey = useChatSettings((s) => s.setKey);
  const updateProvider = useChatSettings((s) => s.setProvider);
  const updateModel = useChatSettings((s) => s.setModel);
  const setUseContext = useChatSettings((s) => s.setUseContext);

  return (
    <div className='space-y-8'>
      <div className='space-y-1'>
        <Label htmlFor='systemMsg'>System Message</Label>
        <Input
          id='systemMsg'
          value={systemMessage}
          onChange={(e) => {
            updateSystemMessage(e.target.value);
          }}
        />
      </div>
      <div className='space-y-1'>
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
      </div>
      <div className='space-y-1'>
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
      </div>
      <div className='space-y-0'>
        <Label htmlFor='systemMsg'>Number of Messages</Label>
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
        <p className='text-xs  text-zinc-300'>
          number of messages to include in a request
        </p>
      </div>
      <div className='flex items-center space-x-2'>
        <Switch
          checked={useContext}
          onCheckedChange={setUseContext}
          id='use-chatcontext'
        />
        <Label htmlFor='use-chatcontext'>Use Chat Context</Label>
      </div>
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
    </div>
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
  const useContext = useChatSettings((s) => s.useContext);
  const isVisible = provider.name === name || (useContext && name === 'openai');

  const isRequired = envKeyExist[name];

  if (!isVisible) return null;

  return (
    <div>
      <Label htmlFor='openaiKey'>{label}</Label>
      <Input
        id='openaiKey'
        value={value}
        onChange={onChange}
        required={isRequired}
      />
    </div>
  );
}
