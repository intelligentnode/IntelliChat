import { cn } from '@/lib/utils';

export default function FieldGroup({
  children,
  withToolTip,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
  withToolTip?: boolean;
}) {
  return (
    <div
      className={cn(
        'mb-8 space-y-2',
        withToolTip && 'flex items-center space-x-2 space-y-0',
        className
      )}
    >
      {children}
    </div>
  );
}
