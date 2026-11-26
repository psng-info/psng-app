import { CheckCircle2, Sparkles } from 'lucide-react';
import { formatShort } from '@/domain/dates';
import { CLOSED, type Flag, type Progress } from '@/domain/hr';
import { LevelPill, Pill, ProgressSegments, type SegmentKind } from '@/ui/blocks';

/** Flag als Pille: Symbol und Text, nie nur Farbe. */
export function FlagPill({ flag }: { flag: Flag }) {
  if (flag.lvl === 'new')
    return (
      <Pill tone="accent" icon={<Sparkles aria-hidden="true" className="size-3.5" />}>
        <span className="sr-only">Neu: </span>
        {flag.tag}
      </Pill>
    );
  return (
    <LevelPill level={flag.lvl}>
      <span className="sr-only">{flag.lvl === 'crit' ? 'Dringend' : 'Bald'}: </span>
      {flag.tag}
    </LevelPill>
  );
}

/** Stufe als Abzeichen. Abgeschlossene Stufen bekommen ein Häkchen-Symbol. */
export function StageBadge({ stage }: { stage: string }) {
  const closed = CLOSED.has(stage);
  return (
    <Pill
      tone={closed ? 'neutral' : 'accent'}
      icon={closed ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : null}
    >
      {stage || 'Ohne Status'}
    </Pill>
  );
}

const KIND: Record<Progress['checks'][number], SegmentKind> = {
  done: 'done',
  implied: 'implied',
  open: 'open',
};

/** Zehn Segmente, Bedeutung steht zusätzlich als Text (`progress.text`). */
export function ProgressBar({ progress }: { progress: Progress }) {
  return (
    <ProgressSegments
      segments={progress.checks.map((c) => ({ kind: KIND[c] }))}
      label={progress.text}
    />
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
