import type { ReactNode } from 'react';
import { cn } from '@/ui/lib/utils';
import { LevelIcon } from './Pill';

const LEVEL_TEXT = { crit: 'text-crit', warn: 'text-warn' } as const;

/**
 * Raster aus Kacheln als eine Fläche mit Haarlinien (wie das Schritt-Raster auf psng.info).
 * Auf dem Handy zwei Spalten mit Zahl links, ab `md` Zahl über der Beschriftung.
 * Die Linien sind Schatten in den 1px-Lücken, leere Zellen bleiben ohne Linie.
 */
export function TileGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-line bg-surface grid grid-cols-2 gap-px overflow-hidden rounded-2xl border',
        '[&>*]:shadow-[1px_0_0_var(--line),0_1px_0_var(--line)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

const CELL =
  'flex min-h-14 items-center gap-3 px-3 py-2.5 text-left md:min-h-20 md:flex-col md:items-start md:justify-center md:gap-1';

/**
 * Filter-Kachel (Schalter) in einem `TileGrid`. Gewicht nach Lage: Stufe mit Treffern zeigt
 * Zahl und Symbol in der Stufenfarbe, null Treffer ist gedämpft. Bedeutung steckt im Text.
 */
export function Tile({
  count,
  label,
  level,
  pressed,
  onToggle,
}: {
  count: number;
  label: string;
  level?: 'crit' | 'warn' | undefined;
  pressed: boolean;
  onToggle: () => void;
}) {
  const quiet = count === 0;
  const alarm = !!level && !quiet;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        CELL,
        'hover:bg-accent-soft/60 cursor-pointer transition-colors',
        pressed && 'bg-accent-soft hover:bg-accent-soft ring-accent ring-2 ring-inset',
      )}
    >
      <span
        className={cn(
          'font-display flex w-12 shrink-0 items-center gap-1 text-xl leading-none font-semibold tabular-nums md:w-auto md:text-2xl',
          quiet && 'text-muted',
          alarm && level && LEVEL_TEXT[level],
          pressed && 'text-accent',
        )}
      >
        {count}
        {alarm && level && <LevelIcon level={level} className="size-4" />}
      </span>
      <span
        className={cn(
          'text-sm leading-tight',
          quiet ? 'text-muted' : 'text-fg',
          alarm && 'font-bold',
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** Zahl ohne Schalter, im selben Raster wie `Tile`. */
export function StatTile({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string | undefined;
}) {
  return (
    <div className={cn(CELL, 'bg-bg')}>
      <span className="font-display w-12 shrink-0 text-xl leading-none font-semibold tabular-nums md:w-auto md:text-2xl">
        {value}
      </span>
      <span className="text-muted text-sm leading-tight">
        {label}
        {hint && <span className="block text-xs">{hint}</span>}
      </span>
    </div>
  );
}
