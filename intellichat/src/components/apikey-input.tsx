import { useChatSettings } from '@/store/chat-settings';
import FieldGroup from './field-group';
import { Label } from './ui/label';
import { Input } from './ui/input';

export default function ApiKeyInput({
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
  const withContext = useChatSettings((s) => s.withContext);
  const isVisible =
    provider.name === name || (withContext && name === 'openai');

  const isRequired = envKeyExist[name];

  if (!isVisible) return null;

  return (
    <FieldGroup>
      <Label htmlFor='openaiKey'>{label}</Label>
      <Input
        id='openaiKey'
        value={value}
        onChange={onChange}
        required={isRequired}
      />
      {envKeyExist[name] && (
        <p className='text-xs text-zinc-300'>
          API Key is set as an environment variable, but you can override it
          here.
        </p>
      )}
    </FieldGroup>
  );
}
