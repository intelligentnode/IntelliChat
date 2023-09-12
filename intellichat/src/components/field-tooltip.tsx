import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export default function FieldTooltip({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon width={20} />
        <TooltipContent align={'end'} className='max-w-xs text-left'>
          <p className='text-sm'>{children}</p>
        </TooltipContent>
      </TooltipTrigger>
    </Tooltip>
  );
}
