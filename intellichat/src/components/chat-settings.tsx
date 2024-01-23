'use client';

import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useChatSettings } from '@/store/chat-settings';
import { AIProviders } from '@/lib/ai-providers';
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
import { SupportedProvidersNamesType } from '@/lib/validators';

const providersOptions = [
  ...Object.keys(AIProviders).map((key) => ({
    label: AIProviders[key as keyof typeof AIProviders].name,
    value: key,
    _key: key,
  })),
];

export default function ChatSettings({ close }: { close: () => void }) {
  const systemMessage = useChatSettings((s) => s.systemMessage);
  const numberOfMessages = useChatSettings((s) => s.numberOfMessages);
  const provider = useChatSettings((s) => s.provider);
  const providers = useChatSettings((s) => s.providers);
  const withContext = useChatSettings((s) => s.withContext);
  const intellinodeData = useChatSettings((s) => s.intellinodeData);
  const oneKey = useChatSettings((s) => s.oneKey);
  const envKeys = useChatSettings((s) => s.envKeys);
  const getModel = useChatSettings((s) => s.getModel);
  const updateChatSettings = useChatSettings((s) => s.updateChatSettings);
  const reset = useChatSettings((s) => s.resetState);

  const defaultFormValues = {
    systemMessage,
    numberOfMessages,
    // The selected provider name and its selected model
    providerName: provider,
    providerModel: getModel(),
    // The API keys for each provider
    providers,
    withContext,
    intellinodeData,
    oneKey,
    envKeys,
  };
  const form = useForm<z.infer<typeof formSchema>>({
    values: defaultFormValues,
    defaultValues: defaultFormValues,
    resolver: zodResolver(formSchema),
  });

  function onSubmit({
    providerName,
    providerModel,
    withContext,
    providers,
    ...values
  }: z.infer<typeof formSchema>) {
    const provider = providerName;
    const payload = {
      provider,
      withContext: provider !== 'openai' ? false : withContext,
      providers: {
        ...providers,
        [provider]: {
          ...providers[provider],
          model: provider === 'azure' ? providers.azure?.model : providerModel,
        },
      },
      ...values,
    };
    updateChatSettings(payload);
    close();
  }

  function onChangeProviderName(name: SupportedProvidersNamesType) {
    form.setValue('providerName', name);

    if (name !== 'azure') {
      form.setValue('providerModel', AIProviders[name].models[0] as string);
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
                name='providers.azure.model'
                label='Azure Model Name'
              />
              <FormInputField
                control={form.control}
                name='providers.azure.resourceName'
                label='Azure Resource Name'
              />
              <FormInputField
                control={form.control}
                name='providers.azure.embeddingName'
                label='Azure Embedding Name'
              />
              <FormInputField
                control={form.control}
                name='providers.azure.apiKey'
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
                key={`${watchProviderName}-key`}
                control={form.control}
                id={`${watchProviderName}`}
                name={`providers.${watchProviderName}.apiKey`}
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
            <Button type='button' variant='outline' onClick={reset}>
              Reset
            </Button>
          </div>
        </form>
      </Form>
    </ScrollArea>
  );
}
