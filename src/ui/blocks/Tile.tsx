import type { ReactNode } from 'react';
import { cn } from '@/ui/lib/utils';
import { LevelIcon } from './Pill';

const LEVEL_BORDER = { crit: 'border-l-crit', warn: 'border-l-warn' } as const;
const BASE =
  'border-line bg-surface flex min-h-11 flex-col items-start gap-0.5 rounded-lg border p-3 text-left';

/** Filter-Kachel (Schalter): Zahl, Beschriftung, Stufe als Symbol. */
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
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        BASE,
        'hover:border-accent/60 cursor-pointer border-l-4 transition-colors',
        level && !quiet ? LEVEL_BORDER[level] : 'border-l-line',
        pressed && 'bg-accent-soft border-accent border-l-accent ring-accent ring-1',
        quiet && !pressed && 'text-muted',
      )}
    >
      <span className="font-display flex items-center gap-1.5 text-2xl leading-none font-semibold tabular-nums">
        {count}
        {level && !quiet && (
          <LevelIcon level={level} className={level === 'crit' ? 'text-crit' : 'text-warn'} />
        )}
      </span>
      <span className="text-sm leading-snug">{label}</span>
    </button>
  );
}

/** Zahlen-Kachel ohne Schalter. */
export function StatTile({
  value,
  label,
  hint,
  icon,
}: {
  value: string;
  label: string;
  hint?: string | undefined;
  icon?: ReactNode;
}) {
  return (
    <div className={cn(BASE, 'bg-bg justify-center')}>
      <span className="font-display text-accent flex items-center gap-2 text-3xl leading-none font-semibold tabular-nums">
        {icon}
        {value}
      </span>
      <span className="text-sm leading-snug">{label}</span>
      {hint && <span className="text-muted text-xs">{hint}</span>}
    </div>
  );
}
