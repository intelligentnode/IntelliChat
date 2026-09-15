'use client';

import React from 'react';
import { Github, HelpCircle, ImagePlus, Key, Languages, Mic, Paperclip, Square, Volume2, type LucideIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CommandBadge } from './command-badge';

const features: Array<{ icon: LucideIcon; text: string }> = [
  { icon: ImagePlus, text: 'Use the image button to create a picture.' },
  { icon: Paperclip, text: 'Attach an image to ask about it, or an audio file to turn it into text.' },
  { icon: Mic, text: 'Use the microphone to speak your message.' },
  { icon: Volume2, text: 'Press Read aloud under a reply to listen to it.' },
  { icon: Square, text: 'Press Stop to end a reply early.' },
  { icon: Github, text: 'Paste a GitHub link to ask about it, or connect a repo in Settings, Code.' },
  { icon: Languages, text: 'Write in any language, including Arabic.' },
  { icon: Key, text: 'Add your own API key in each tab, or use the keys set for this app.' },
];

// The help button next to the Settings title: the chat commands and a short tour of the features.
export default function SettingsHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-8 w-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white'
          aria-label='Help'
          title='Help'
          data-testid='settings-help'
        >
          <HelpCircle size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' sideOffset={8} className='w-80 border-zinc-700 bg-zinc-900 p-5 text-zinc-300'>
        <h3 className='text-sm font-semibold text-white'>Commands</h3>
        <div className='mt-2 space-y-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-sm'>
          <div className='flex items-center gap-2'>
            <CommandBadge />
            <span>Create an image from your words</span>
          </div>
          <p className='text-xs text-zinc-500'>Example: /image a developer coding at night</p>
        </div>

        <h3 className='mt-5 text-sm font-semibold text-white'>What you can do</h3>
        <ul className='mt-2 space-y-2 text-sm'>
          {features.map(({ icon: Icon, text }) => (
            <li key={text} className='flex items-start gap-2'>
              <Icon size={15} className='mt-0.5 shrink-0 text-zinc-500' aria-hidden='true' />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <p className='mt-5 border-t border-zinc-800 pt-3 text-xs text-zinc-500'>Enter sends. Shift + Enter starts a new line.</p>
      </PopoverContent>
    </Popover>
  );
}
