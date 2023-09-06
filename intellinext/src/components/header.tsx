import React from 'react';
import Logo from './logo';
import Container from './container';
import Link from 'next/link';

type Props = {};

export default function Header({}: Props) {
  return (
    <header className='sticky top-0 z-50 bg-background py-8'>
      <Container className='flex items-center justify-between'>
        <div>
          <Logo />
        </div>
        <nav className='flex items-center gap-10'>
          <Link href='/'>Chatbot</Link>
          <Link href='#'>Login</Link>
        </nav>
      </Container>
    </header>
  );
}
