import { formatShort } from '@/domain/dates';
import type { Goal, GoalPeriod } from '@/domain/todos';
import { EmptyState, ProgressSegments, Section, type SegmentKind } from '@/ui/blocks';

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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <li key={g.name} className="bg-surface border-line rounded-lg border p-3">
              <p className="text-muted text-xs font-bold">{g.name}</p>
              <p className="mt-1 font-medium">{g.title}</p>
              <div className="mt-3">
                <ProgressSegments
                  segments={segmentsOf(g)}
                  label={`${g.name}: ${g.done} von ${g.total} erledigt`}
                />
              </div>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                <span className="font-mono">
                  {g.done}/{g.total} erledigt
                </span>
                {g.open > 0 && <span>{g.open} offen</span>}
                {g.late > 0 && <span className="text-crit font-medium">{g.late} überfällig</span>}
              </p>
              {(g.owner || g.deadline) && (
                <p className="text-muted mt-1 flex flex-wrap gap-x-3 text-sm">
                  {g.owner && <span>Owner: {g.owner}</span>}
                  {g.deadline && (
                    <span className="font-mono">bis {formatShort(g.deadline, today)}</span>
                  )}
                </p>
              )}
              {g.nextStep && (
                <p className="mt-2 text-sm">
                  <span className="text-muted">Nächster Schritt: </span>
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
