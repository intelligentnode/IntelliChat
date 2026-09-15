import { ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

// The /image command drawn as a badge, so it reads as a command and not as message text.
export function CommandBadge({ className }: { className?: string }) {
  return (
    <span
      dir='ltr'
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/15 px-1.5 py-0.5 font-mono text-xs font-medium text-sky-300',
        className
      )}
      data-testid='command-badge'
    >
      <ImagePlus size={12} aria-hidden='true' />
      /image
    </span>
  );
}
