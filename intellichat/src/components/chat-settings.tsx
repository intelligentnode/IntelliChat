'use client';

import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Azure, OpenAI, Replicate } from '@/lib/chat-providers';

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
    numberOfMessages: z.number().min(2).max(6),
    providerName: z.enum(['openai', 'replicate', 'azure']),
    providerModel: z.string(),
    openaiKey: z.string(),
    replicateKey: z.string(),
    azureKey: z.string(),
    azureResourceName: z.string(),
    azureModelName: z.string(),
    azureEmbeddingName: z.string(),
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

export default function ChatSettings({ close }: { close: () => void }) {
  const systemMessage = useChatSettings((s) => s.systemMessage);
  const numberOfMessages = useChatSettings((s) => s.numberOfMessages);
  const provider = useChatSettings((s) => s.provider);
  const openai = useChatSettings((s) => s.openai);
  const replicate = useChatSettings((s) => s.replicate);
  const azure = useChatSettings((s) => s.azure);
  const withContext = useChatSettings((s) => s.withContext);
  const envKeyExist = useChatSettings((s) => s.envKeyExist);
  const getModel = useChatSettings((s) => s.getModel);
  const updateChatSettings = useChatSettings((s) => s.updateChatSettings);
  const resetKeys = useChatSettings((s) => s.resetKeys);
  const hasKey = openai.apiKey || replicate.apiKey || azure.apiKey;

  const form = useForm<z.infer<typeof formSchema>>({
    values: {
      systemMessage,
      numberOfMessages,
      providerName: provider,
      providerModel: getModel(),
      openaiKey: openai.apiKey,
      replicateKey: replicate.apiKey,
      azureKey: azure.apiKey,
      azureResourceName: azure.resourceName,
      azureModelName: azure.model,
      azureEmbeddingName: azure.embeddingName,
      withContext,
      envKeyExist: {
        openai: envKeyExist.openai,
        replicate: envKeyExist.replicate,
      },
    },
    defaultValues: {
      systemMessage,
      numberOfMessages,
      providerName: provider,
      providerModel: getModel(),
      openaiKey: openai.apiKey,
      replicateKey: replicate.apiKey,
      azureKey: azure.apiKey,
      azureResourceName: azure.resourceName,
      azureModelName: azure.model,
      azureEmbeddingName: azure.embeddingName,
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
    azureEmbeddingName,
    azureResourceName,
    azureModelName,
    azureKey,
    ...values
  }: z.infer<typeof formSchema>) {
    const provider = providerName;
    updateChatSettings({
      provider,
      openai: {
        ...openai,
        apiKey: openaiKey,
        model:
          provider === 'openai'
            ? (providerModel as OpenAI['model'])
            : openai.model,
      },
      replicate: {
        ...replicate,
        apiKey: replicateKey,
        model:
          provider === 'replicate'
            ? (providerModel as Replicate['model'])
            : replicate.model,
      },
      azure: {
        ...azure,
        apiKey: azureKey,
        resourceName: azureResourceName,
        model: azureModelName,
        embeddingName: azureEmbeddingName,
      },
      ...values,
    });
    close();
  }

  function onChangeProviderName(name: string) {
    const providerName = name as 'openai' | 'replicate' | 'azure';
    form.setValue('providerName', providerName);

    if (providerName !== 'azure') {
      form.setValue(
        'providerModel',
        AIProviders[providerName].models[0] as string
      );
    }

    if (providerName === 'openai' || providerName === 'azure') {
      form.setValue('withContext', true);
    } else {
      form.setValue('withContext', false);
    }
  }

  const watchProviderName = form.watch('providerName');

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
                    {`The number of messages to include in a request. The higher
                    the number, the more context the AI will have to work with.
                    This will determine the number of messages used to generate
                    the context when the "Use Chat Context" option is enabled.`}
                  </FieldTooltip>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    type='number'
                    min={2}
                    max={6}
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
                      onChangeProviderName(e);
                    }}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select a Model' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Object.keys(AIProviders).map((key) => (
                          <SelectItem key={key} value={key}>
                            {AIProviders[key as keyof typeof AIProviders].name}
                          </SelectItem>
                        ))}
                        <SelectItem value={'azure'}>azure</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchProviderName !== 'azure' && (
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
                      <SelectTrigger>
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
          )}
          {watchProviderName == 'azure' && (
            <div className='space-y-4'>
              <FormField
                control={form.control}
                name='azureKey'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Azure API Key</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type='password'
                        autoComplete='azure-apiKey'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='azureResourceName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Azure Resource Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='azureModelName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Azure Model Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='azureEmbeddingName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Azure Embedding Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          {watchProviderName !== 'azure' && (
            <>
              <ApiKeyInput
                control={form.control}
                id='replicate'
                name='replicateKey'
                label='Replicate API Key'
                provider={form.watch('providerName') as keyof AIProviderType}
                withContext={form.watch('withContext')}
              />
              <ApiKeyInput
                control={form.control}
                id='openai'
                name='openaiKey'
                label='OpenAI API Key'
                provider={form.watch('providerName') as keyof AIProviderType}
                withContext={form.watch('withContext')}
              />
            </>
          )}
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
                  {`When enabled, the chatbot wil dynamically select previous
                  parts of the conversation that are most relevant to the
                  current query, using embeddings. The number of parts will be
                  equal to the number of messages set above.`}
                </FieldTooltip>
              </FormItem>
            )}
          />
          <div className='flex justify-between'>
            <Button type='submit'>Save</Button>
            <Button
              disabled={!hasKey}
              type='button'
              variant={hasKey ? 'destructive' : 'outline'}
              onClick={resetKeys}
            >
              Reset Keys
            </Button>
          </div>
        </form>
      </Form>
    </ScrollArea>
  );
}
