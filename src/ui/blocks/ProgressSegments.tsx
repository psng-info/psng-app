import { cn } from '@/ui/lib/utils';
import { SEGMENT_LABEL, type SegmentKind } from './segments';

const SEGMENT_STYLE: Record<SegmentKind, string> = {
  done: 'bg-accent',
  implied: 'bg-accent/35',
  late: 'bg-crit',
  soon: 'bg-warn',
  open: 'border border-line bg-surface',
  unk: 'bg-[repeating-linear-gradient(45deg,var(--line)_0_2px,transparent_2px_4px)] border border-line',
};

/** Ein Segment je Schritt. `label` ist der Text für Screenreader, die Farben allein tragen nichts. */
export function ProgressSegments({
  segments,
  label,
  className,
}: {
  segments: { kind: SegmentKind; title?: string }[];
  label: string;
  className?: string;
}) {
  return (
    <span role="img" aria-label={label} className={cn('flex w-full min-w-24 gap-0.5', className)}>
      {segments.map((s, i) => (
        <i
          key={i}
          title={s.title}
          className={cn('block h-2 flex-1 rounded-[3px]', SEGMENT_STYLE[s.kind])}
        />
      ))}
    </span>
  );
}

/** Legende zu den Farben, mit Text und Muster. */
export function SegmentLegend({ kinds }: { kinds?: SegmentKind[] }) {
  const list = kinds ?? ['done', 'implied', 'soon', 'late', 'open', 'unk'];
  return (
    <ul className="text-muted flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Legende">
      {list.map((k) => (
        <li key={k} className="inline-flex items-center gap-1.5">
          <i className={cn('block h-2 w-4 rounded-[3px]', SEGMENT_STYLE[k])} aria-hidden="true" />
          {SEGMENT_LABEL[k]}
        </li>
      ))}
    </ul>
  );
}
