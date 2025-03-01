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

const providersOptions = Object.keys(AIProviders).map((key) => ({
  label: AIProviders[key as keyof typeof AIProviders].name,
  value: key,
  _key: key,
}));

export default function ChatSettings({ close }: { close: () => void }) {
  const systemMessage = useChatSettings((s) => s.systemMessage);
  const numberOfMessages = useChatSettings((s) => s.numberOfMessages);
  const provider = useChatSettings((s) => s.provider);
  const providers = useChatSettings((s) => s.providers);
  const withContext = useChatSettings((s) => s.withContext);
  const stream = useChatSettings((s) => s.stream);
  const intellinodeData = useChatSettings((s) => s.intellinodeData);
  const oneKey = useChatSettings((s) => s.oneKey);
  const envKeys = useChatSettings((s) => s.envKeys);
  const getModel = useChatSettings((s) => s.getModel);
  const updateChatSettings = useChatSettings((s) => s.updateChatSettings);
  const resetStore = useChatSettings((s) => s.resetState);

  // For vLLM, we want the top-level providerModel to be empty,
  // and we ensure providers.vllm exists with default empty fields.
  const defaultProviderModel = provider === 'vllm' ? '' : getModel();
  const defaultVllmProviders = {
    ...providers,
    vllm: providers.vllm || { name: 'vllm', model: '', baseUrl: '', apiKey: "" },
  };

  const defaultFormValues = {
    systemMessage,
    numberOfMessages,
    providerName: provider,
    providerModel: defaultProviderModel,
    providers: defaultVllmProviders,
    stream,
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
    stream,
    providers,
    ...values
  }: z.infer<typeof formSchema>) {
    console.log("onSubmit called with:", {
      providerName,
      providerModel,
      withContext,
      stream,
      providers,
      ...values,
    });
    const selectedProvider = providerName;
    const updatedProviders = { ...providers };

    // Only update the model from the top-level providerModel if the provider is not azure or vllm.
    if (selectedProvider !== 'azure' && selectedProvider !== 'vllm') {
      updatedProviders[selectedProvider] = {
        ...updatedProviders[selectedProvider],
        model: providerModel,
      };
      console.log(`For provider ${selectedProvider}, setting model from dropdown:`, providerModel);
    } else {
      // For azure and vllm, we assume the user filled the text field.
      console.log(`For provider ${selectedProvider}, using text field value for model:`, updatedProviders[selectedProvider].model);
    }

    const payload = {
      provider: selectedProvider,
      withContext: selectedProvider === 'openai' ? withContext : false,
      stream: selectedProvider === 'openai' || selectedProvider === 'cohere' ? stream : false,
      providers: updatedProviders,
      ...values,
    };

    updateChatSettings(payload);
    close();
  }

  function onError(errors: any) {
    console.error("Form validation errors:", errors);
  }

  function onChangeProviderName(name: SupportedProvidersNamesType) {
    console.log("Provider changed to:", name);
    form.setValue('providerName', name);
    // For providers with a predefined list, set default providerModel; otherwise clear it.
    if (name !== 'azure' && name !== 'vllm' && AIProviders[name].models) {
      const defaultModel = AIProviders[name].models[0] as string;
      form.setValue('providerModel', defaultModel);
      console.log("Set providerModel from dropdown to:", defaultModel);
    } else {
      form.setValue('providerModel', '');
      console.log("Cleared providerModel for provider:", name);
    }
  }

  const watchProviderName = form.watch('providerName');
  const watchIntellinodeData = form.watch('intellinodeData');

  // Only show dropdown options if provider is not azure and not vllm.
  const modelsOptions =
    watchProviderName !== 'azure' && watchProviderName !== 'vllm'
      ? AIProviders[watchProviderName].models.map((model) => ({
          label: model,
          value: model,
          _key: model,
        }))
      : [];

  // Reset function: resets the form to default values.
  function handleReset() {
    console.log("Reset button clicked. Resetting form.");
    form.reset(defaultFormValues);
    resetStore();
  }

  return (
    <ScrollArea className='h-full'>
      <Form {...form}>
        <form className='space-y-8' onSubmit={form.handleSubmit(onSubmit, onError)}>
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
            tooltipText={`The number of messages to include in a request. The higher the number, the more context the AI will have to work with. This determines how many messages are used for generating context when "Use Chat Context" is enabled.`}
            onChange={(e) => {
              const value = Number(e.target.value);
              form.setValue('numberOfMessages', value);
            }}
          />
          <FormSelectField
            control={form.control}
            placeholder='Select a Provider'
            name='providerName'
            label='Provider'
            options={providersOptions}
            onChange={onChangeProviderName}
          />

          {/* Azure-specific fields */}
          {watchProviderName === 'azure' && (
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
          )}

          {/* vLLM-specific fields */}
          {watchProviderName === 'vllm' && (
            <div className="space-y-4">
              <FormInputField
                control={form.control}
                name="providers.vllm.model"
                label="vLLM Model"
                placeholder="e.g. deepseek-ai/DeepSeek-R1-Distill-Llama-8B"
              />
              <FormInputField
                control={form.control}
                name="providers.vllm.baseUrl"
                label="vLLM Base URL"
                placeholder="http://localhost:8000"
              />
            </div>
          )}

          {/* Fields for all other providers */}
          {watchProviderName !== 'azure' && watchProviderName !== 'vllm' && (
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
                label={`${watchProviderName.slice(0, 1).toUpperCase()}${watchProviderName.slice(1)} API Key`}
                provider={watchProviderName as "openai" | "replicate" | "cohere" | "google"}
                withContext={form.watch('withContext')}
              />
            </>
          )}

          {(watchProviderName === 'openai' || watchProviderName === 'cohere') && (
            <FormSwitchField
              control={form.control}
              name='stream'
              label='Stream'
              withTooltip={true}
              tooltipText={'When enabled, the chatbot will stream its responses in real-time...'}
            />
          )}

          {watchProviderName === 'openai' && (
            <FormSwitchField
              control={form.control}
              name='withContext'
              label='Context'
              withTooltip={true}
              tooltipText={`When enabled, the chatbot will dynamically select previous parts of the conversation that are most relevant to the current query, using embeddings. The number of parts will equal the number of messages set above.`}
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
            <Button type='button' variant='outline' onClick={handleReset}>
              Reset
            </Button>
          </div>
        </form>
      </Form>
    </ScrollArea>
  );
}
