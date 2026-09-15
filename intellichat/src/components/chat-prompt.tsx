import React, { useRef, useState } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CornerDownLeft, FolderGit2, GitBranch, Github, ImagePlus, Loader2, Mic, Paperclip, Square, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { typedImageCommand } from '@/lib/commands';
import type { ConnectedRepo } from '@/lib/github';
import { CommandBadge } from './command-badge';

export type Attachment = {
  kind: 'image';
  dataUrl: string;
  name: string;
};

type Props = {
  isLoading: boolean;
  onSubmit: () => void;
  onStop: () => void;
  // image mode: the message goes to the image model; typing "/image " at the start turns it on
  imageMode: boolean;
  onImageModeChange: (on: boolean) => void;
  attachment: Attachment | null;
  onAttach: (file: File) => void;
  onClearAttachment: () => void;
  // microphone
  canRecord: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  onToggleRecording: () => void;
  // coding assistant: one GitHub repo per chat, and the local folder when the app runs locally
  githubEnabled: boolean;
  repo: ConnectedRepo | null;
  onConnectRepo: (value: string) => Promise<boolean>;
  onDisconnectRepo: () => void;
  localFolder: { name: string; allowEdits: boolean } | null;
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

const chipClass = 'inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-xs text-zinc-200';

// The small form that connects a GitHub repo to the chat.
function RepoConnect({ onConnect, disabled }: { onConnect: (value: string) => Promise<boolean>; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    const connected = await onConnect(value);
    setBusy(false);
    if (connected) {
      setOpen(false);
      setValue('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type='button'
          disabled={disabled}
          className='inline-flex items-center gap-1.5 rounded-md border border-dashed border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-400 hover:text-white disabled:opacity-50'
          data-testid='connect-repo'
        >
          <Github size={13} /> Connect GitHub repo
        </button>
      </PopoverTrigger>
      <PopoverContent align='start' side='top' sideOffset={8} className='w-80 border-zinc-700 bg-zinc-900 p-3'>
        <form onSubmit={submit} className='space-y-2'>
          <label htmlFor='repo-input' className='text-xs text-zinc-400'>
            Repo for this chat
          </label>
          <div className='flex gap-2'>
            <Input
              id='repo-input'
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder='owner/repo or GitHub link'
              autoComplete='off'
              className='h-9'
              data-testid='repo-input'
            />
            <Button type='submit' size='sm' className='h-9 shrink-0' disabled={busy}>
              {busy ? <Loader2 size={14} className='animate-spin' /> : 'Connect'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export const ChatPrompt = React.forwardRef<HTMLTextAreaElement, Props>(
  function ChatPrompt(props, ref) {
    const {
      isLoading, onSubmit, onStop, imageMode, onImageModeChange, attachment, onAttach, onClearAttachment,
      canRecord, isRecording, isTranscribing, onToggleRecording,
      githubEnabled, repo, onConnectRepo, onDisconnectRepo, localFolder,
    } = props;
    const fileInput = useRef<HTMLInputElement>(null);

    const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Backspace in an empty box removes the /image command
      if (event.key === 'Backspace' && imageMode && !event.currentTarget.value) {
        event.preventDefault();
        onImageModeChange(false);
        return;
      }
      if (isLoading || event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        onSubmit();
      }
    };

    // "/image " or "\image " typed at the start turns into the command badge
    const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (imageMode) return;
      const rest = typedImageCommand(event.target.value);
      if (rest === null) return;
      event.target.value = rest;
      onImageModeChange(true);
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
        {(githubEnabled || localFolder) && (
          <div className='mb-2 flex flex-wrap items-center gap-2' data-testid='code-context'>
            {githubEnabled &&
              (repo ? (
                <span className={chipClass} data-testid='repo-chip'>
                  <Github size={13} />
                  {repo.owner}/{repo.repo}
                  <span className='inline-flex items-center gap-0.5 text-zinc-500'>
                    <GitBranch size={12} />
                    {repo.branch}
                  </span>
                  <button type='button' onClick={onDisconnectRepo} disabled={isLoading} className='text-zinc-500 hover:text-white' aria-label='Disconnect the repo'>
                    <X size={12} />
                  </button>
                </span>
              ) : (
                <RepoConnect onConnect={onConnectRepo} disabled={isLoading} />
              ))}
            {localFolder && (
              <span className={chipClass} data-testid='local-chip'>
                <FolderGit2 size={13} />
                {localFolder.name}
                <span className='text-zinc-500'>{localFolder.allowEdits ? 'can edit' : 'read only'}</span>
              </span>
            )}
          </div>
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
            dir='auto'
            className={cn('min-h-0 w-full resize-none py-6 pr-24', imageMode ? 'pl-[13.5rem]' : 'pl-32')}
            placeholder={imageMode ? 'Describe the image to generate' : attachment ? 'Ask about the image' : 'Send a message'}
            onChange={onChange}
            onKeyDown={onKeyDown}
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
            {imageMode ? (
              <span className='ml-1 flex h-9 items-center gap-1' data-testid='image-command'>
                <CommandBadge className='px-2 py-1 text-sm' />
                <button
                  type='button'
                  onClick={() => onImageModeChange(false)}
                  disabled={isLoading}
                  className='rounded p-0.5 text-zinc-400 hover:text-white disabled:opacity-50'
                  aria-label='Remove the image command'
                >
                  <X size={14} />
                </button>
              </span>
            ) : (
              <IconButton label='Generate an image' onClick={() => onImageModeChange(true)} disabled={isLoading}>
                <ImagePlus size={18} />
              </IconButton>
            )}
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
