'use client';

import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  OpenAI,
  Replicate,
  openAIModels,
  replicateModels,
} from '@/lib/chat-providers';

import { useChatSettings } from '@/store/chat-settings';
import { AIProviderType, AIProviders } from '@/lib/chat-providers';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import FieldTooltip from '@/components/field-tooltip';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import ApiKeyInput from './apikey-input';

const formSchema = z
  .object({
    systemMessage: z.string(),
    numberOfMessages: z.number(),
    providerName: z.string(),
    providerModel: z.string(),
    openaiKey: z.string(),
    replicateKey: z.string(),
    withContext: z.boolean(),
    envKeyExist: z.object({
      openai: z.boolean(),
      replicate: z.boolean(),
    }),
  })
  .superRefine((data, ctx) => {
    if (
      (data.providerModel === 'openai' || data.withContext) &&
      !data.envKeyExist.openai &&
      !data.openaiKey
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OpenAI API Key is required.',
        path: ['openaiKey'],
      });
    }
    if (
      data.providerModel === 'replicate' &&
      !data.envKeyExist.replicate &&
      !data.replicateKey
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Replicate API Key is required.',
        path: ['replicateKey'],
      });
    }
  });

export default function ChatSettings({
  closeSidebar,
}: {
  closeSidebar: () => void;
}) {
  const systemMessage = useChatSettings((s) => s.systemMessage);
  const numberOfMessages = useChatSettings((s) => s.numberOfMessages);
  const provider = useChatSettings((s) => s.provider);
  const openaikey = useChatSettings((s) => s.apiKeys.openai);
  const replicatekey = useChatSettings((s) => s.apiKeys.replicate);
  const withContext = useChatSettings((s) => s.withContext);
  const envKeyExist = useChatSettings((s) => s.envKeyExist);
  const updateChatSettings = useChatSettings((s) => s.updateChatSettings);

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      systemMessage,
      numberOfMessages,
      providerName: provider.name,
      providerModel: provider.model,
      openaiKey: openaikey,
      replicateKey: replicatekey,
      withContext,
      envKeyExist: {
        openai: envKeyExist.openai,
        replicate: envKeyExist.replicate,
      },
    },
    resolver: zodResolver(formSchema),
  });

  function onSubmit({
    envKeyExist,
    providerName,
    providerModel,
    openaiKey,
    replicateKey,
    ...values
  }: z.infer<typeof formSchema>) {
    let provider: OpenAI | Replicate;

    if (providerName === 'openai') {
      provider = {
        name: providerName,
        model: providerModel as OpenAI['model'],
      };
    } else {
      provider = {
        name: 'replicate',
        model: providerModel as Replicate['model'],
      };
    }
    updateChatSettings({
      provider,
      apiKeys: {
        openai: openaiKey,
        replicate: replicateKey,
      },
      ...values,
    });
    closeSidebar();
  }

  return (
    <ScrollArea className='h-full'>
      <Form {...form}>
        <form className='space-y-8' onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name='systemMessage'
            render={({ field }) => (
              <FormItem>
                <FormLabel>System Message</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder='You are a helpful assistant!'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='numberOfMessages'
            render={({ field }) => (
              <FormItem>
                <div className='flex items-center justify-between gap-2'>
                  <FormLabel>Number of Messages</FormLabel>
                  <FieldTooltip>
                    The number of messages to include in a request. The higher
                    the number, the more context the AI will have to work with.
                    This will determine the number of messages used to generate
                    the context when the "Use Chat Context" option is enabled.
                  </FieldTooltip>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    type='number'
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='providerName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(e) => {
                      field.onChange(e);
                      form.setValue(
                        'providerModel',
                        AIProviders[e as keyof AIProviderType].models[0]
                      );
                    }}
                    defaultValue={field.value}
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='providerModel'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className='w-[180px]'>
                      <SelectValue>{field.value}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {AIProviders[
                          form.watch('providerName') as keyof AIProviderType
                        ].models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='withContext'
            render={({ field }) => (
              <FormItem className='flex items-center justify-between gap-2 space-y-0'>
                <div className='flex items-center gap-2'>
                  <FormLabel>Context</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </div>
                <FieldTooltip>
                  When enabled, the chatbot wil dynamically select previous
                  parts of the conversation that are most relevant to the
                  current query, using embeddings. The number of parts will be
                  equal to the number of messages set above.
                </FieldTooltip>
              </FormItem>
            )}
          />
          <ApiKeyInput
            control={form.control}
            id='openai'
            name='openaiKey'
            label='OpenAI API Key'
            provider={form.watch('providerName') as keyof AIProviderType}
            withContext={form.watch('withContext')}
          />

          <ApiKeyInput
            control={form.control}
            id='replicate'
            name='replicateKey'
            label='Replicate API Key'
            provider={form.watch('providerName') as keyof AIProviderType}
            withContext={form.watch('withContext')}
          />
          <Button type='submit'>Save</Button>
        </form>
      </Form>
    </ScrollArea>
  );
}
