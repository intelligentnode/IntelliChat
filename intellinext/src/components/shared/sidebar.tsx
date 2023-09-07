'use client';

import React, { PropsWithChildren } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default function SideBar({
  children,
  title,
}: PropsWithChildren<{
  title?: string;
}>) {
  const [isOpen, setIsOpen] = React.useState(false);

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
          <span className='sr-only'>Toggle Sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        className='pt-20'
        side='right'
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownCapture={(e) => e.preventDefault()}
      >
        <SheetHeader className='mb-4'>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
