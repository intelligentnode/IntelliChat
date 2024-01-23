import { useChatSettings } from '@/store/chat-settings';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';

export default function ApiKeyInput({
  name,
  id,
  label,
  control,
  provider,
  withContext,
}: {
  name: string;
  provider: 'openai' | 'replicate' | 'cohere' | 'google';
  id: string;
  label: string;
  control: any;
  withContext: boolean;
}) {
  const envKeys = useChatSettings((s) => s.envKeys);
  const isVisible = provider === id || (withContext && id === 'openai');
  if (!isVisible) return null;
  const hasEnvKey = envKeys[id];
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} type='password' autoComplete={`${id}-apiKey`} />
          </FormControl>
          {hasEnvKey && (
            <FormDescription>
              API Key is set as an environment variable, but you can override it
              here.
            </FormDescription>
          )}
        </FormItem>
      )}
    ></FormField>
  );
}
