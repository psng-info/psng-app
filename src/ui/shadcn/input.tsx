import * as React from 'react';

import { cn } from '@/ui/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'border-input bg-card text-foreground placeholder:text-muted-foreground min-h-11 w-full min-w-0 rounded-md border px-3 py-2 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
