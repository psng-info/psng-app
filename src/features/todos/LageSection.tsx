import { Check, CircleAlert, Clock } from 'lucide-react';
import type { Tile } from '@/domain/todos';
import { cn } from '@/ui/lib/utils';

/** Lage: Kacheln mit Zahlen, jede ist ein Filter-Schalter. Die Bedeutung steht im Text, die Farbe verstärkt nur. */
export function LageSection({
  tiles,
  counts,
  active,
  onToggle,
}: {
  tiles: readonly Tile[];
  counts: Record<string, number>;
  active: string | null;
  onToggle: (key: string) => void;
}) {
  return (
    <section aria-labelledby="todos-lage" className="space-y-3">
      <h3 id="todos-lage" className="font-display text-lg font-semibold">
        Lage
      </h3>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => {
          const n = counts[tile.key] ?? 0;
          const on = active === tile.key;
          const Icon = tile.level === 'crit' ? CircleAlert : tile.level === 'warn' ? Clock : null;
          const hot = n > 0 && tile.level;
          return (
            <li key={tile.key}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(tile.key)}
                className={cn(
                  'bg-surface relative flex min-h-24 w-full flex-col items-start justify-between rounded-lg border p-3 text-left transition-colors',
                  on ? 'border-accent bg-accent-soft ring-accent ring-2' : 'border-line',
                  hot && tile.level === 'crit' && !on && 'border-l-crit border-l-4',
                  hot && tile.level === 'warn' && !on && 'border-l-warn border-l-4',
                )}
              >
                <span className="flex w-full items-start justify-between gap-1">
                  <span
                    className={cn(
                      'font-display text-3xl leading-none font-semibold tabular-nums',
                      n === 0 && 'text-muted',
                      hot && tile.level === 'crit' && 'text-crit',
                      hot && tile.level === 'warn' && 'text-warn',
                    )}
                  >
                    {n}
                  </span>
                  {on ? (
                    <Check className="text-accent size-4" aria-hidden="true" />
                  ) : Icon && n > 0 ? (
                    <Icon className="text-muted size-4" aria-hidden="true" />
                  ) : null}
                </span>
                <span className="text-sm leading-tight font-medium">{tile.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
