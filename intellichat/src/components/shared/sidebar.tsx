'use client';

import React, { PropsWithChildren } from 'react';
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
import ChatSettings from '../chat-settings';

export default function SideBar({ title }: { title?: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <Sheet
      modal={false}
      onOpenChange={() => {
        setIsOpen(!isOpen);
      }}
    >
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
            <ChatSettings />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
