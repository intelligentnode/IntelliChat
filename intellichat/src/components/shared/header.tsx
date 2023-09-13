'use client';

import React from 'react';
import Logo from './logo';
import Container from './container';
import SideBar from './sidebar';
import { Button } from '@/components/ui/button';
import { useChatSettings } from '@/store/chat-settings';
import GitHubButton from 'react-github-btn';
type Props = {};

export default function Header({}: Props) {
  const clearMessages = useChatSettings((s) => s.clearMessages);
  return (
    <header className='sticky top-0 z-[60] bg-background py-8 shadow-sm'>
      <Container className='flex max-w-full items-center justify-between'>
        <Button role='button' variant='link' onClick={clearMessages}>
          <Logo />
        </Button>
        <nav className='flex items-center gap-6'>
          <div className='translate-y-[3px]'>
            <GitHubButton
              data-size='large'
              href='https://github.com/intelligentnode/intellichat'
              data-icon='octicon-star'
              aria-label='Star intelligentnode/intellichat on GitHub'
            >
              Star
            </GitHubButton>
          </div>
          <SideBar />
        </nav>
      </Container>
    </header>
  );
}
