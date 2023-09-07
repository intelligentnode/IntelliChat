import { cn } from '@/lib/utils';
import React, { PropsWithChildren } from 'react';

type Props = {
  as?: 'div' | 'section' | 'article' | 'main' | 'header' | 'footer';
  className?: string;
};

export default function Container({
  as = 'div',
  className,
  children,
}: PropsWithChildren<Props>) {
  const Component = as;
  return (
    <Component
      className={cn('px-base md:px-md mx-auto w-full max-w-max', className)}
    >
      {children}
    </Component>
  );
}
