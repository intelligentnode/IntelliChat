'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';

import { useChatSettings } from '@/store/chat-settings';
import { isKeyless, type Vendor } from '@/lib/ai-providers';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import ChatSettings from '@/components/chat-settings';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function SideBar({ title = 'Settings' }: { title?: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();
  const provider = useChatSettings((s) => s.provider);
  const providers = useChatSettings((s) => s.providers);
  const envKeys = useChatSettings((s) => s.envKeys);
  const envKeysLoaded = useChatSettings((s) => s.envKeysLoaded);

  // Open the settings when the selected provider has no key in the settings or the environment
  // (checked once the server answered which .env keys exist)
  useEffect(() => {
    if (!envKeysLoaded || isKeyless(provider)) return;
    const keyInState = providers[provider]?.apiKey?.trim();
    const keyInEnv = envKeys[provider as Vendor];
    if (!keyInState && !keyInEnv) setIsOpen(true);
  }, [provider, providers, envKeys, envKeysLoaded]);

  return (
    <Sheet modal={false} open={isOpen} onOpenChange={() => setIsOpen(!isOpen)}>
      <SheetTrigger asChild>
        <Button variant='ghost' className='p-0 px-2' data-testid='toggle-settings'>
          {isOpen ? (
            <PanelLeftOpen className='h-6 w-6' />
          ) : (
            <PanelLeftClose className='h-6 w-6' />
          )}
          <span className='sr-only'>Toggle Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        className='flex flex-col gap-0 border-none bg-zinc-900 px-6 pb-6 pt-[calc(var(--header-height)+1rem)] sm:max-w-md'
        side='right'
      >
        {pathname === '/' && (
          <>
            <SheetHeader className='mb-4'>
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <TooltipProvider>
              <ChatSettings close={() => setIsOpen(false)} />
            </TooltipProvider>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
