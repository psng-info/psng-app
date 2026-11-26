import { formatShort } from '@/domain/dates';
import type { Goal, GoalPeriod } from '@/domain/todos';
import { EmptyState, LevelTag, ProgressSegments, Section, type SegmentKind } from '@/ui/blocks';

/** Ein Segment je To-do des Ziels: erledigt, überfällig, offen. */
function segmentsOf(g: Goal): { kind: SegmentKind }[] {
  const open = Math.max(0, g.total - g.done - g.late);
  return [
    ...Array.from({ length: g.done }, () => ({ kind: 'done' as const })),
    ...Array.from({ length: g.late }, () => ({ kind: 'late' as const })),
    ...Array.from({ length: open }, () => ({ kind: 'open' as const })),
  ];
}

export function GoalsSection({
  goals,
  period,
  today,
}: {
  goals: Goal[];
  period: GoalPeriod;
  today: Date;
}) {
  const left =
    period.daysLeft === null
      ? undefined
      : period.daysLeft >= 0
        ? `noch ${period.daysLeft} Tage`
        : 'Zeitraum vorbei';
  return (
    <Section
      title={period.end ? `Ziele bis ${formatShort(period.end, today)}` : 'Ziele'}
      hint={left}
    >
      {goals.length === 0 ? (
        <EmptyState>Keine Ziele im Sheet (Zeilen mit Ebene Ziel).</EmptyState>
      ) : (
        <ul className="border-line bg-surface grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2 lg:grid-cols-3 [&>*]:shadow-[1px_0_0_var(--line),0_1px_0_var(--line)]">
          {goals.map((g) => (
            <li key={g.name} className="flex flex-col gap-2 p-3 sm:p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display min-w-0 font-semibold break-words">{g.name}</p>
                <p className="text-muted shrink-0 text-sm tabular-nums">
                  <b className="text-fg">{g.done}</b>/{g.total}
                </p>
              </div>
              <p className="text-muted -mt-1 text-sm leading-snug break-words">{g.title}</p>
              <ProgressSegments
                segments={segmentsOf(g)}
                label={`${g.name}: ${g.done} von ${g.total} erledigt`}
              />
              <p className="text-muted flex flex-wrap gap-x-2 text-xs">
                <span>{g.open > 0 ? `${g.open} offen` : 'alles erledigt'}</span>
                {g.late > 0 && (
                  <LevelTag level="crit" className="text-xs">
                    {g.late} überfällig
                  </LevelTag>
                )}
                {g.owner && <span>· {g.owner}</span>}
                {g.deadline && <span>· bis {formatShort(g.deadline, today)}</span>}
              </p>
              {g.nextStep && (
                <p className="text-sm leading-snug">
                  <span className="text-muted">Als Nächstes: </span>
                  {g.nextStep}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
