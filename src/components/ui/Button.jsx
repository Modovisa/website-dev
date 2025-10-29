import React from 'react';
import { cn } from '../../lib/utils';

export function Button({ children, className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium',
        'transition-all duration-150 ease-in-out active:scale-95',
        'disabled:pointer-events-none disabled:opacity-50',
        'shadow-apple hover:shadow-apple-md',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
