'use client';

import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Cohere, Google, OpenAI, Replicate } from '@/lib/chat-providers';

import { useChatSettings } from '@/store/chat-settings';
import { AIProviders } from '@/lib/chat-providers';
import { formSchema } from '@/lib/schema';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  FormInputField,
  FormSelectField,
  FormSwitchField,
} from '@/components/form-ui';
import ApiKeyInput from '@/components/apikey-input';

const providersOptions = [
  ...Object.keys(AIProviders).map((key) => ({
    label: AIProviders[key as keyof typeof AIProviders].name,
    value: key,
    _key: key,
  })),
  { label: 'azure', value: 'azure', _key: 'azure' },
];

export default function ChatSettings({ close }: { close: () => void }) {
  const systemMessage = useChatSettings((s) => s.systemMessage);
  const numberOfMessages = useChatSettings((s) => s.numberOfMessages);
  const provider = useChatSettings((s) => s.provider);
  const openai = useChatSettings((s) => s.openai);
  const replicate = useChatSettings((s) => s.replicate);
  const azure = useChatSettings((s) => s.azure);
  const cohere = useChatSettings((s) => s.cohere);
  const google = useChatSettings((s) => s.google);
  const withContext = useChatSettings((s) => s.withContext);
  const envKeyExist = useChatSettings((s) => s.envKeyExist);
  const intellinodeData = useChatSettings((s) => s.intellinodeData);
  const oneKey = useChatSettings((s) => s.oneKey);
  const getModel = useChatSettings((s) => s.getModel);
  const updateChatSettings = useChatSettings((s) => s.updateChatSettings);
  const resetKeys = useChatSettings((s) => s.resetKeys);
  const hasKey = openai.apiKey || replicate.apiKey || azure.apiKey;

  const values = {
    systemMessage,
    numberOfMessages,
    providerName: provider,
    providerModel: getModel(),
    openaiKey: openai.apiKey,
    replicateKey: replicate.apiKey,
    azureKey: azure.apiKey,
    cohereKey: cohere.apiKey,
    googleKey: google.apiKey,
    azureResourceName: azure.resourceName,
    azureModelName: azure.model,
    azureEmbeddingName: azure.embeddingName,
    withContext,
    intellinodeData,
    oneKey,
    envKeyExist: {
      openai: envKeyExist.openai,
      replicate: envKeyExist.replicate,
    },
  };
  const form = useForm<z.infer<typeof formSchema>>({
    values: {
      systemMessage,
      numberOfMessages,
      providerName: provider,
      providerModel: getModel(),
      openaiKey: openai.apiKey,
      replicateKey: replicate.apiKey,
      azureKey: azure.apiKey,
      cohereKey: cohere.apiKey,
      googleKey: google.apiKey,
      azureResourceName: azure.resourceName,
      azureModelName: azure.model,
      azureEmbeddingName: azure.embeddingName,
      withContext,
      intellinodeData,
      oneKey,
      envKeyExist: {
        openai: envKeyExist.openai,
        replicate: envKeyExist.replicate,
        azure: envKeyExist.azure,
        cohere: envKeyExist.cohere,
        google: envKeyExist.google,
      },
    },
    defaultValues: values,
    resolver: zodResolver(formSchema),
  });

  function onSubmit({
    envKeyExist,
    providerName,
    providerModel,
    withContext,
    openaiKey,
    googleKey,
    replicateKey,
    cohereKey,
    azureEmbeddingName,
    azureResourceName,
    azureModelName,
    azureKey,
    ...values
  }: z.infer<typeof formSchema>) {
    const provider = providerName;
    if (provider !== 'openai') {
      withContext = false;
    }
    updateChatSettings({
      provider,
      withContext,
      openai: {
        ...openai,
        apiKey: openaiKey,
        model:
          provider === 'openai'
            ? (providerModel as OpenAI['model'])
            : openai.model,
      },
      google: {
        ...google,
        apiKey: googleKey,
        model:
          provider === 'google'
            ? (providerModel as Google['model'])
            : google.model,
      },
      cohere: {
        ...cohere,
        apiKey: cohereKey,
        model:
          provider === 'cohere'
            ? (providerModel as Cohere['model'])
            : cohere.model,
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
    const providerName = name as
      | 'openai'
      | 'replicate'
      | 'azure'
      | 'cohere'
      | 'google';
    form.setValue('providerName', providerName);

    if (providerName !== 'azure') {
      form.setValue(
        'providerModel',
        AIProviders[providerName].models[0] as string
      );
    }
  }

  const watchProviderName = form.watch('providerName');
  const watchIntellinodeData = form.watch('intellinodeData');

  const modelsOptions =
    watchProviderName === 'azure'
      ? []
      : AIProviders[watchProviderName].models.map((model) => ({
          label: model,
          value: model,
          _key: model,
        }));

  return (
    <ScrollArea className='h-full'>
      <Form {...form}>
        <form className='space-y-8' onSubmit={form.handleSubmit(onSubmit)}>
          <FormInputField
            control={form.control}
            name='systemMessage'
            label='System Message'
            placeholder='You are a helpful assistant!'
          />
          <FormInputField
            control={form.control}
            name='numberOfMessages'
            label='Number of Messages'
            type='number'
            min={2}
            max={6}
            withTooltip={true}
            tooltipText={`The number of messages to include in a request. The higher
              the number, the more context the AI will have to work with.
              This will determine the number of messages used to generate
              the context when the "Use Chat Context" option is enabled.`}
          />
          <FormSelectField
            control={form.control}
            placeholder='Select a Provider'
            name='providerName'
            label='Provider'
            options={providersOptions}
            onChange={onChangeProviderName}
          />

          {watchProviderName === 'azure' ? (
            <div className='space-y-4'>
              <FormInputField
                control={form.control}
                name='azureModelName'
                label='Azure Model Name'
              />
              <FormInputField
                control={form.control}
                name='azureResourceName'
                label='Azure Resource Name'
              />
              <FormInputField
                control={form.control}
                name='azureEmbeddingName'
                label='Azure Embedding Name'
              />
              <FormInputField
                control={form.control}
                name='azureKey'
                label='Azure API Key'
                autoComplete='azure-apiKey'
                type='password'
              />
            </div>
          ) : (
            <>
              <FormSelectField
                control={form.control}
                placeholder='Select a Model'
                name='providerModel'
                label='Model'
                options={modelsOptions}
              />
              <ApiKeyInput
                control={form.control}
                id={watchProviderName}
                name={`${watchProviderName}Key`}
                label={`${watchProviderName
                  .slice(0, 1)
                  .toUpperCase()}${watchProviderName.slice(1)} API Key`}
                provider={watchProviderName}
                withContext={form.watch('withContext')}
              />
            </>
          )}
          {watchProviderName === 'openai' && (
            <FormSwitchField
              control={form.control}
              name='withContext'
              label='Context'
              withTooltip={true}
              tooltipText={`When enabled, the chatbot will dynamically select previous
              parts of the conversation that are most relevant to the
              current query, using embeddings. The number of parts will be
              equal to the number of messages set above.`}
            />
          )}
          <FormSwitchField
            control={form.control}
            name='intellinodeData'
            label='intelliNode Data'
            withTooltip={true}
            tooltipText={`When enabled, you can use the chatbot against your project's data.`}
          />
          {watchIntellinodeData && (
            <FormInputField
              control={form.control}
              name={'oneKey'}
              label='One Key'
              autoComplete='cohere-apiKey'
              type='password'
            />
          )}
          <div className='flex justify-between'>
            <Button type='submit'>Save</Button>
            <Button
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
