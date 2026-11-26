import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { OFFLINE_HINT, useOnline } from '@/data/online';
import { Button } from '@/ui/shadcn/button';
import { cn } from '@/ui/lib/utils';

/** „TT.MM.JJJJ HH:MM“ für den Offline-Hinweis. */
function standLong(updatedAt: number): string {
  const d = new Date(updatedAt);
  return `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
}

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
  failed = false,
}: {
  id: string;
  title: string;
  updatedAt: number;
  fetching: boolean;
  onReload: () => void;
  actions?: ReactNode;
  /** Der letzte Abruf ist fehlgeschlagen, vorhandene Daten stammen aus dem Cache. */
  failed?: boolean;
}) {
  const online = useOnline();
  const offline = updatedAt > 0 && (!online || failed);
  const stand = standOf(updatedAt);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h2 id={id} className="font-display text-2xl font-semibold">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        {offline ? (
          <span
            role="status"
            className="text-warn font-mono text-xs font-bold"
            title="Angezeigt wird der zuletzt gespeicherte Stand"
          >
            Offline, Stand {standLong(updatedAt)}
          </span>
        ) : (
          stand && (
            <span className="text-muted font-mono text-xs" title="Letzter Abruf aus dem Sheet">
              Stand {stand}
            </span>
          )
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
      {!online && (
        <p className="text-muted w-full text-sm" role="note">
          {OFFLINE_HINT}
        </p>
      )}
    </div>
  );
}
