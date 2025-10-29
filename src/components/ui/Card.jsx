import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6',
        'shadow-stripe transition-all duration-200 hover:shadow-apple-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
