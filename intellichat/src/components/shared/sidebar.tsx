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

export default function SideBar({ title }: { title?: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();
  const getExistsInEnv = useChatSettings((s) => s.getExistsInEnv);
  const getProvider = useChatSettings((s) => s.getProvider);
  const provider = useChatSettings((s) => s.provider);
  const providerkey = getProvider().apiKey;
  // Open the settings sheet if the user has not set the API keys
  useEffect(() => {
    const exists = getExistsInEnv();
    const key = providerkey.trim();
    if (!exists && key === '') {
      setIsOpen(true);
    }
  }, [provider, getExistsInEnv, providerkey]);

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
