import { AlertTriangle, CheckCircle2, Clock, Sparkles, type LucideIcon } from 'lucide-react';
import { formatShort } from '@/domain/dates';
import { CLOSED, type Flag, type Progress } from '@/domain/hr';
import { cn } from '@/ui/lib/utils';

const FLAG_STYLE: Record<Flag['lvl'], { cls: string; Icon: LucideIcon; label: string }> = {
  crit: { cls: 'bg-crit-soft text-crit', Icon: AlertTriangle, label: 'Dringend' },
  warn: { cls: 'bg-warn-soft text-warn', Icon: Clock, label: 'Bald' },
  new: { cls: 'bg-accent-soft text-accent', Icon: Sparkles, label: 'Neu' },
};

/** Flag als Pille: Icon und Text, nie nur Farbe. */
export function FlagPill({ flag }: { flag: Flag }) {
  const { cls, Icon, label } = FLAG_STYLE[flag.lvl];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap',
        cls,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      {flag.tag}
    </span>
  );
}

/** Stufe als Abzeichen. Abgeschlossene Stufen bekommen ein Häkchen-Symbol. */
export function StageBadge({ stage }: { stage: string }) {
  const closed = CLOSED.has(stage);
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1 rounded-md border px-2 text-xs font-bold whitespace-nowrap',
        closed
          ? 'border-line bg-surface text-muted'
          : 'border-transparent bg-accent-soft text-accent',
      )}
    >
      {closed && <CheckCircle2 className="size-3.5" aria-hidden="true" />}
      {stage || 'Ohne Status'}
    </span>
  );
}

/** Zehn Segmente, Bedeutung steht zusätzlich als Text darunter. */
export function ProgressBar({ progress }: { progress: Progress }) {
  return (
    <div role="img" aria-label={progress.text} className="flex gap-0.5">
      {progress.checks.map((c, i) => (
        <span
          key={i}
          className={cn(
            'h-2 flex-1 rounded-sm border',
            c === 'done' &&
              (progress.mode === 'halt' ? 'border-muted bg-muted' : 'border-accent bg-accent'),
            c === 'implied' && 'border-accent/60 bg-accent/30',
            c === 'open' && 'border-line bg-transparent',
            progress.mode === 'run' && i === progress.next && 'border-accent border-dashed',
          )}
        />
      ))}
    </div>
  );
}

/** Datum in Monospace, `–` wenn leer. */
export function DateText({ d, today }: { d: Date | null; today: Date }) {
  return d ? (
    <time dateTime={d.toISOString().slice(0, 10)} className="font-mono text-sm">
      {formatShort(d, today)}
    </time>
  ) : (
    <span className="text-muted">–</span>
  );
}
