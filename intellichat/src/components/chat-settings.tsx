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
import { Separator } from './ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from './ui/button';

export default function ChatSettings() {
  const [areKeysVisible, setKeysVisibility] = React.useState(true);

  const systemMessage = useChatSettings((s) => s.systemMessage);
  const numberOfMessages = useChatSettings((s) => s.numberOfMessages);
  const provider = useChatSettings((s) => s.provider);
  const openaikey = useChatSettings((s) => s.apiKeys.openai);
  const replicatekey = useChatSettings((s) => s.apiKeys.replicate);

  const updateSystemMessage = useChatSettings((s) => s.setSystemMessage);
  const setNumberOfMessages = useChatSettings((s) => s.setNumberOfMessages);
  const setKey = useChatSettings((s) => s.setKey);
  const updateProvider = useChatSettings((s) => s.setProvider);
  const updateModel = useChatSettings((s) => s.setModel);

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
      <Separator orientation='horizontal' />
      <Collapsible
        open={areKeysVisible}
        onOpenChange={setKeysVisibility}
        className='space-y-2'
      >
        <div className='flex items-center justify-between space-x-4'>
          <h4 className='text-sm font-semibold'>API Keys</h4>
          <CollapsibleTrigger asChild>
            <Button variant='ghost' size='sm' className='w-9 p-0'>
              <ChevronsUpDown className='h-4 w-4' />
              <span className='sr-only'>Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className='space-y-4'>
          <div>
            <Label htmlFor='openaiKey'>OpenAI</Label>
            <Input
              id='openaiKey'
              value={openaikey}
              onChange={(e) => setKey('openai', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor='replicateKey'>Replicate</Label>
            <Input
              id='replicateKey'
              value={replicatekey}
              onChange={(e) => setKey('replicate', e.target.value)}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
