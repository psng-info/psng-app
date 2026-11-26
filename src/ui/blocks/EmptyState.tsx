import type { ReactNode } from 'react';

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="border-line text-muted flex flex-col items-start gap-3 rounded-lg border border-dashed p-5 text-sm">
      <p>{children}</p>
      {action}
    </div>
  );
}
