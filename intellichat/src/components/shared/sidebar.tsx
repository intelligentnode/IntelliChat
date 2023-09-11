'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import ChatSettings from '@/components/chat-settings';
import { useChatSettings } from '@/store/chat-settings';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function SideBar({ title }: { title?: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();
  const envKeyExist = useChatSettings((s) => s.envKeyExist);
  const apiKeys = useChatSettings((s) => s.apiKeys);
  const provider = useChatSettings((s) => s.provider);

  // Open the settings sheet if the user has not set the API keys
  useEffect(() => {
    if (!envKeyExist[provider.name] && apiKeys[provider.name].trim() === '') {
      setIsOpen(true);
    }
  }, []);

  return (
    <Sheet modal={false} open={isOpen} onOpenChange={() => setIsOpen(!isOpen)}>
      <SheetTrigger asChild>
        <Button variant='ghost' className='p-0 px-2'>
          <Settings className='h-6 w-6' />
          <span className='sr-only'>Toggle Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        className='border-none pt-[calc(var(--header-height)+1rem)]'
        side='right'
      >
        {pathname === '/' && (
          <>
            <SheetHeader className='mb-4'>
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <TooltipProvider>
              <ChatSettings />
            </TooltipProvider>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
