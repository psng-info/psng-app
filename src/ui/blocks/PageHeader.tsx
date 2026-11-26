import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/ui/shadcn/button';
import { cn } from '@/ui/lib/utils';

/** „HH:MM“ des letzten Abrufs, leer ohne Abruf. */
function standOf(updatedAt: number): string {
  return updatedAt
    ? new Date(updatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : '';
}

/** Kopf jeder Ansicht: Titel (h2), Stand des Abrufs, „Neu laden“ und optional weitere Aktionen. */
export function PageHeader({
  id,
  title,
  updatedAt,
  fetching,
  onReload,
  actions,
}: {
  id: string;
  title: string;
  updatedAt: number;
  fetching: boolean;
  onReload: () => void;
  actions?: ReactNode;
}) {
  const stand = standOf(updatedAt);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h2 id={id} className="font-display text-2xl font-semibold">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        {stand && (
          <span className="text-muted font-mono text-xs" title="Letzter Abruf aus dem Sheet">
            Stand {stand}
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onReload}
          disabled={fetching}
          aria-busy={fetching}
        >
          <RefreshCw aria-hidden="true" className={cn(fetching && 'animate-spin')} />
          Neu laden
        </Button>
        {actions}
      </div>
    </div>
  );
}
