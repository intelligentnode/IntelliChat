import React from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { CornerDownLeft } from 'lucide-react';

type Props = {
  isLoading: boolean;
  onSubmit: () => void;
};

export const ChatPrompt = React.forwardRef<HTMLTextAreaElement, Props>(
  function ChatPrompt(props, ref) {
    const { isLoading, onSubmit } = props;

    const onEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onSubmit();
      }
    };

    return (
      <div className='sticky bottom-0 left-0 z-20 w-full self-end py-10'>
        {isLoading && (
          <div className='absolute left-1/2 top-0 -translate-x-1/2 text-sm'>
            Generating Response ...
          </div>
        )}
        <div className='relative w-full'>
          <Textarea
            ref={ref}
            rows={1}
            className='min-h-0 w-full resize-none py-6 pr-24'
            placeholder='Send a message'
            onKeyDown={onEnter}
          />
          <Button
            size='icon'
            className='absolute right-4 top-3 h-11 w-16 p-0'
            onClick={onSubmit}
            variant='default'
          >
            <CornerDownLeft />
          </Button>
        </div>
      </div>
    );
  }
);
