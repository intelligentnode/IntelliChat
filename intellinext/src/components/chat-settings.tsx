import React from 'react';

import { useChatSettings } from '@/store/chat-settings';
import { ChatProvider } from '@/lib/types';

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

type Props = {};

export default function ChatSettings({}: Props) {
  const systemMessage = useChatSettings((s) => s.systemMessage);
  const provider = useChatSettings((s) => s.provider);
  const updateSystemMessage = useChatSettings((s) => s.setSystemMessage);
  const updateProvider = useChatSettings((s) => s.setProvider);

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
          value={provider}
          defaultValue='openai'
          onValueChange={(e: string) => {
            updateProvider(e as ChatProvider);
          }}
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='Select a Model' />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value='openai'>OpenAI</SelectItem>
              <SelectItem value='replicate'>Replicate</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
