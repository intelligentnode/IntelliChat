import React from 'react';
import Logo from './logo';
import Container from './container';
import Link from 'next/link';
import SideBar from './sidebar';

type Props = {};

export default function Header({}: Props) {
  return (
    <header className='sticky top-0 z-[60] bg-background py-8 shadow-sm'>
      <Container className='flex items-center justify-between'>
        <div>
          <Logo />
        </div>
        <nav className='flex items-center gap-10'>
          <Link href='/'>Chatbot</Link>
          <Link href='#'>Login</Link>
          <SideBar />
        </nav>
      </Container>
    </header>
  );
}
