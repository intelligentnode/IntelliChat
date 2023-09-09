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
import { AIProviders } from '@/lib/chat-providers';

export default function ChatSettings() {
  const systemMessage = useChatSettings((s) => s.systemMessage);
  const provider = useChatSettings((s) => s.provider);
  const updateSystemMessage = useChatSettings((s) => s.setSystemMessage);
  const updateProvider = useChatSettings((s) => s.setProvider);
  const updateModel = useChatSettings((s) => s.setModel);

  return (
    <div className='space-y-8'>
      <div>
        <Label htmlFor='systemMsg'>System Message</Label>
        <Input
          id='systemMsg'
          value={systemMessage}
          onChange={(e) => {
            updateSystemMessage(e.target.value);
          }}
        />
      </div>
      <div>
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
      <div>
        <Label>Models</Label>
        <Select
          value={provider.model}
          defaultValue='davinci'
          onValueChange={(e: string) => {
            updateModel(e);
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
    </div>
  );
}
