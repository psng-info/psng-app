import { cn } from '@/ui/lib/utils';

/** Platzhalter beim Laden. Das Pulsieren ist unter prefers-reduced-motion praktisch aus (tokens.css). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('bg-line/70 animate-pulse rounded-lg', className)} />
  );
}
