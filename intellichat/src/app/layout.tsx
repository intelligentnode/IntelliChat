import './globals.css';
import { Inter } from 'next/font/google';

import Header from '@/components/shared/header';
import { RQProvider } from '@/components/shared/providers';

import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'IntelliChat',
  description:
    'An open-source AI chatbot built with IntelliNode and Next.js. It is designed to accelerate the integration of multiple language models.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body
        className={`bg-gradient-to-br from-[hsl(202_2%_27%)] from-0% to-[hsl(202_2%_0%)] to-100% ${inter.className}`}
      >
        <RQProvider>
          <div className='min-height-screen'>
            <Header />
            <main>{children}</main>
          </div>
        </RQProvider>
        <Toaster />
      </body>
    </html>
  );
}
