import React, { useRef } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { CornerDownLeft, ImagePlus, Loader2, Mic, Paperclip, Square, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';

export type Attachment = {
  kind: 'image';
  dataUrl: string;
  name: string;
};

type Props = {
  isLoading: boolean;
  onSubmit: () => void;
  onStop: () => void;
  // image generation mode: the prompt is sent to the image model instead of the chat model
  imageMode: boolean;
  onToggleImageMode: () => void;
  attachment: Attachment | null;
  onAttach: (file: File) => void;
  onClearAttachment: () => void;
  // microphone
  canRecord: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  onToggleRecording: () => void;
};

function IconButton({ label, active, onClick, disabled, children, className }: {
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type='button'
          size='icon'
          variant={active ? 'default' : 'ghost'}
          className={cn('h-9 w-9 rounded-full', active ? 'text-white' : 'text-zinc-300 hover:text-white', className)}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className='text-xs'>{label}</TooltipContent>
    </Tooltip>
  );
}

export const ChatPrompt = React.forwardRef<HTMLTextAreaElement, Props>(
  function ChatPrompt(props, ref) {
    const {
      isLoading, onSubmit, onStop, imageMode, onToggleImageMode, attachment, onAttach, onClearAttachment,
      canRecord, isRecording, isTranscribing, onToggleRecording,
    } = props;
    const fileInput = useRef<HTMLInputElement>(null);

    const onEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isLoading) return;
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        onSubmit();
      }
    };

    const status = isRecording
      ? 'Recording... click the microphone to stop'
      : isTranscribing
        ? 'Transcribing...'
        : isLoading
          ? imageMode ? 'Generating image...' : 'Generating response...'
          : null;

    return (
      <div className='sticky bottom-0 left-0 z-20 w-full self-end py-10'>
        {status && (
          <div className='absolute left-1/2 top-0 -translate-x-1/2 text-sm text-zinc-300'>{status}</div>
        )}
        {attachment && (
          <div className='mb-2 flex items-center gap-2'>
            <div className='relative'>
              <img src={attachment.dataUrl} alt={attachment.name} className='h-16 w-16 rounded-md border border-zinc-600 object-cover' />
              <button
                type='button'
                onClick={onClearAttachment}
                className='absolute -right-2 -top-2 rounded-full bg-zinc-800 p-0.5 text-white hover:bg-zinc-600'
                aria-label='Remove the attachment'
              >
                <X size={14} />
              </button>
            </div>
            <span className='text-xs text-zinc-400'>{attachment.name}</span>
          </div>
        )}
        <div className='relative w-full'>
          <Textarea
            ref={ref}
            rows={1}
            className='min-h-0 w-full resize-none py-6 pl-32 pr-24'
            placeholder={imageMode ? 'Describe the image to generate' : attachment ? 'Ask about the image' : 'Send a message'}
            onKeyDown={onEnter}
            data-testid='prompt'
          />
          <div className='absolute left-3 top-3 flex items-center gap-1'>
            <IconButton label='Attach an image or audio file' onClick={() => fileInput.current?.click()} disabled={isLoading || imageMode}>
              <Paperclip size={18} />
            </IconButton>
            <IconButton
              label={isRecording ? 'Stop recording' : 'Voice input'}
              onClick={onToggleRecording}
              active={isRecording}
              disabled={!canRecord || isTranscribing || isLoading}
              className={isRecording ? 'animate-pulse bg-red-600 hover:bg-red-600' : ''}
            >
              {isTranscribing ? <Loader2 size={18} className='animate-spin' /> : <Mic size={18} />}
            </IconButton>
            <IconButton label={imageMode ? 'Back to chat' : 'Generate an image'} onClick={onToggleImageMode} active={imageMode} disabled={isLoading}>
              <ImagePlus size={18} />
            </IconButton>
          </div>
          <input
            ref={fileInput}
            type='file'
            accept='image/*,audio/*'
            className='hidden'
            data-testid='file-input'
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onAttach(file);
              event.target.value = '';
            }}
          />
          {isLoading ? (
            <Button
              size='icon'
              className='absolute right-4 top-3 h-11 w-16 bg-red-600 p-0 hover:bg-red-500'
              onClick={onStop}
              variant='default'
              aria-label='Stop'
              data-testid='stop'
            >
              <Square size={18} />
            </Button>
          ) : (
            <Button
              size='icon'
              className='absolute right-4 top-3 h-11 w-16 p-0 disabled:bg-sky-700'
              onClick={onSubmit}
              variant='default'
              aria-label='Send'
              data-testid='send'
            >
              <CornerDownLeft />
            </Button>
          )}
        </div>
      </div>
    );
  }
);
