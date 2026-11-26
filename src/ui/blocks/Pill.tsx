import { Ban, Check, OctagonAlert, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/ui/lib/utils';

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'crit';

const TONE: Record<Tone, string> = {
  neutral: 'bg-bg text-muted border-line',
  accent: 'bg-accent-soft text-accent border-transparent',
  ok: 'bg-ok-soft text-ok border-transparent',
  warn: 'bg-warn-soft text-warn border-transparent',
  crit: 'bg-crit-soft text-crit border-transparent',
};

/** Kleine Beschriftung. Bedeutung steckt immer im Text, die Farbe verstärkt nur. */
export function Pill({
  tone = 'neutral',
  icon,
  className,
  children,
}: {
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs leading-tight font-bold whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Symbol je Stufe: crit = Achteck, warn = Dreieck. */
export function LevelIcon({ level, className }: { level: 'crit' | 'warn'; className?: string }) {
  const Icon = level === 'crit' ? OctagonAlert : TriangleAlert;
  return <Icon aria-hidden="true" className={cn('size-3.5 shrink-0', className)} />;
}

export function LevelPill({ level, children }: { level: 'crit' | 'warn'; children: ReactNode }) {
  return (
    <Pill tone={level} icon={<LevelIcon level={level} />}>
      {children}
    </Pill>
  );
}

/** Talk-Status aus der Spalte Status in Lectures. */
export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'veröffentlicht')
    return (
      <Pill tone="ok" icon={<Check aria-hidden="true" className="size-3.5" />}>
        {status}
      </Pill>
    );
  if (s === 'fix') return <Pill tone="accent">{status}</Pill>;
  if (/abgesagt|pausiert/.test(s))
    return (
      <Pill tone="neutral" icon={<Ban aria-hidden="true" className="size-3.5" />}>
        {status}
      </Pill>
    );
  if (s === 'durchgeführt') return <Pill tone="neutral">{status}</Pill>;
  return <Pill className="border-dashed">{status || 'ohne Status'}</Pill>;
}
