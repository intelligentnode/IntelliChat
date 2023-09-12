'use client';

import React from 'react';
import Logo from './logo';
import Container from './container';
import SideBar from './sidebar';
import { Button } from '@/components/ui/button';
import { useChatSettings } from '@/store/chat-settings';

type Props = {};

export default function Header({}: Props) {
  const clearMessages = useChatSettings((s) => s.clearMessages);
  return (
    <header className='sticky top-0 z-[60] bg-background py-8 shadow-sm'>
      <Container className='flex max-w-full items-center justify-between'>
        <Button role='button' variant='link' onClick={clearMessages}>
          <Logo />
        </Button>
        <nav className='flex items-center gap-10'>
          <SideBar />
        </nav>
      </Container>
    </header>
  );
}
