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
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id={id} className="font-display text-2xl leading-tight font-semibold">
            {title}
          </h2>
          {offline ? (
            <p
              role="status"
              className="text-warn mt-0.5 text-xs font-bold"
              title="Angezeigt wird der zuletzt gespeicherte Stand"
            >
              Offline, Stand {standLong(updatedAt)}
            </p>
          ) : (
            stand && (
              <p className="text-muted mt-0.5 text-xs" title="Letzter Abruf aus dem Sheet">
                Stand {stand}
              </p>
            )
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onReload}
            disabled={fetching}
            aria-busy={fetching}
            aria-label="Neu laden"
            title="Neu laden"
            className="text-muted hover:text-fg"
          >
            <RefreshCw aria-hidden="true" className={cn('size-5', fetching && 'animate-spin')} />
          </Button>
          {actions}
        </div>
      </div>
      {!online && (
        <p className="text-muted text-sm" role="note">
          {OFFLINE_HINT}
        </p>
      )}
    </div>
  );
}
