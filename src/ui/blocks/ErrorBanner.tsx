import { OctagonAlert } from 'lucide-react';
import type { ReactNode } from 'react';

/** Fehlerhinweis. Nur Texte von `SheetsError.message` oder feste Texte übergeben, nie Rohdaten. */
export function ErrorBanner({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="bg-crit-soft text-crit border-crit/40 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
    >
      <OctagonAlert aria-hidden="true" className="size-5 shrink-0" />
      <p className="min-w-0 flex-1 basis-56 font-medium">{children}</p>
      {action}
    </div>
  );
}
