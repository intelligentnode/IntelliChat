import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Input, InputProps } from '@/components/ui/input';
import FieldTooltip from './field-tooltip';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';

type FormSelectProps = {
  placeholder: string;
  label?: string;
  name: string;
  options: Array<{
    label: string;
    value: string;
    _key: string;
  }>;
  control: any;
  className?: string;
  onChange?: (e: any) => void;
};

export function FormSelectField({
  placeholder,
  label,
  control,
  name,
  options,
  className,
  onChange,
}: FormSelectProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Select
              onValueChange={(e) => {
                field.onChange(e);
                if (onChange) onChange(e);
              }}
              defaultValue={field.value}
            >
              <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder}>
                  {field.value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {options.map(({ value, label, _key }) => (
                  <SelectItem key={_key} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    ></FormField>
  );
}

type FormInputProps = {
  name: string;
  label?: string;
  type?: string;
  className?: string;
  inputClassName?: string;
  control: any;
  withTooltip?: boolean;
  tooltipText?: string;
} & InputProps;

export function FormInputField({
  name,
  label,
  type = 'text',
  className,
  inputClassName,
  control,
  withTooltip,
  tooltipText,
  ...props
}: FormInputProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div
            className={cn(
              withTooltip && 'flex items-center justify-between gap-2'
            )}
          >
            {label && <FormLabel>{label}</FormLabel>}
            {withTooltip && <FieldTooltip>{tooltipText}</FieldTooltip>}
          </div>
          <FormControl>
            <Input
              className={inputClassName}
              type={type}
              {...field}
              {...props}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function FormSwitchField({
  control,
  name,
  label,
  withTooltip,
  tooltipText,
  disabled,
  onChange,
}: {
  control: any;
  name: string;
  label: string;
  withTooltip?: boolean;
  tooltipText?: string;
  disabled?: boolean;
  onChange?: (e: any) => void;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className='flex items-center justify-between gap-2 space-y-0'>
          <div className='flex items-center gap-2'>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Switch
                disabled={disabled}
                checked={!disabled && field.value}
                onCheckedChange={(e) => {
                  field.onChange(e);
                  if (onChange) onChange(e);
                }}
              />
            </FormControl>
          </div>
          {withTooltip && <FieldTooltip>{tooltipText}</FieldTooltip>}
        </FormItem>
      )}
    />
  );
}
