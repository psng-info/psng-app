import type { ReactNode } from 'react';
import { cn } from '@/ui/lib/utils';

/**
 * Leerer Zustand: kurzer Satz, was hier stehen würde, optional ein Symbol und eine Aktion.
 * `tone="ok"` für gute Nachrichten (nichts offen), sonst neutral.
 */
export function EmptyState({
  children,
  action,
  icon,
  tone = 'neutral',
}: {
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  tone?: 'neutral' | 'ok';
}) {
  return (
    <div
      className={cn(
        'border-line bg-surface/70 flex flex-wrap items-center gap-x-3 gap-y-3 rounded-xl border px-4 py-3.5 text-sm',
        tone === 'ok' ? 'text-fg' : 'text-muted',
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={cn('shrink-0', tone === 'ok' ? 'text-ok' : 'text-muted')}
        >
          {icon}
        </span>
      )}
      <p className="min-w-0 flex-1 basis-48">{children}</p>
      {action}
    </div>
  );
}
