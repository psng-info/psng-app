import { formatShort } from '@/domain/dates';
import type { Goal, GoalPeriod } from '@/domain/todos';

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
      ? ''
      : period.daysLeft >= 0
        ? `noch ${period.daysLeft} Tage`
        : 'Zeitraum vorbei';
  return (
    <section aria-labelledby="todos-ziele" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 id="todos-ziele" className="font-display text-lg font-semibold">
          {period.end ? `Ziele bis ${formatShort(period.end, today)}` : 'Ziele'}
        </h3>
        {left && <span className="text-muted font-mono text-sm">{left}</span>}
      </div>
      {goals.length === 0 ? (
        <p className="text-muted text-sm">Keine Ziele im Sheet (Zeilen mit Ebene Ziel).</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <li key={g.name} className="bg-surface border-line rounded-lg border p-3">
              <p className="text-muted text-xs font-medium tracking-wide uppercase">{g.name}</p>
              <p className="mt-1 font-medium">{g.title}</p>
              <div
                role="progressbar"
                aria-label={`${g.name}: ${g.done} von ${g.total} erledigt`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={g.pct}
                className="bg-line mt-3 h-2 overflow-hidden rounded-full"
              >
                <div className="bg-accent h-full rounded-full" style={{ width: `${g.pct}%` }} />
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
    </section>
  );
}
