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

type FormSelectProps = {
  placeholder: string;
  label?: string;
  name: string;
  options: Array<{
    label: string;
    value: string;
  }>;
  className?: string;
  onChange?: (e: any) => void;
};

export function FormSelectField({
  placeholder,
  label,
  name,
  options,
  className,
  onChange,
}: FormSelectProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => {
        return (
          <FormItem>
            {label && <FormLabel>{label}</FormLabel>}
            <Select
              onValueChange={(e) => {
                field.onChange(e);
                if (onChange) onChange(e);
              }}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger className={className}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.map(({ value, label }) => (
                  <SelectItem key={`${name}-${value}`} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        );
      }}
    ></FormField>
  );
}
