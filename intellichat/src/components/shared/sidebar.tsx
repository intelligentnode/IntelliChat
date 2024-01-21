'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';

import { useChatSettings } from '@/store/chat-settings';

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
import { SupportedProvidersNamesType } from '@/lib/validators';

export default function SideBar({ title }: { title?: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();
  const getProvider = useChatSettings((s) => s.getProvider);
  const intellinodeData = useChatSettings((s) => s.intellinodeData);
  const oneKey = useChatSettings((s) => s.oneKey);
  const envKeys = useChatSettings((s) => s.envKeys);

  // Open the settings sheet if the user has not set the API keys
  useEffect(() => {
    const provider = getProvider();
    const providerkey = provider?.apiKey;
    const keyInState = providerkey ? providerkey.trim() : undefined;
    const keyInEnv = provider
      ? envKeys[provider.name as SupportedProvidersNamesType]
      : false;
    const keyExists = keyInState || keyInEnv;
    const oneKeyInState = oneKey.trim();
    const oneKeyIsEnabled = intellinodeData;

    if (!keyExists && oneKeyIsEnabled && !oneKeyInState) {
      setIsOpen(true);
    }
  }, [getProvider, oneKey]);

  return (
    <Sheet modal={false} open={isOpen} onOpenChange={() => setIsOpen(!isOpen)}>
      <SheetTrigger asChild>
        <Button variant='ghost' className='p-0 px-2'>
          {isOpen ? (
            <PanelLeftOpen className='h-6 w-6' />
          ) : (
            <PanelLeftClose className='h-6 w-6' />
          )}
          <span className='sr-only'>Toggle Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        className='border-none bg-zinc-900 px-14 pt-[calc(var(--header-height)+1rem)]'
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
