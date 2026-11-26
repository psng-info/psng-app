import { addDays, daysFrom, parseDate } from '@/domain/dates';
import { moodOf, type Mood, type MoodFactor } from '@/domain/mood';
import { goalChildren, goalPeriod, goalsOf } from './goals';
import type { ConflictFn, Todo } from './types';

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Stimmung der To-dos: 100 minus Rückstände, plus Punkte für Erledigtes und Zeitplan der Ziele. */
export function todosMood(todos: Todo[], today: Date, conflict?: ConflictFn): Mood {
  const open = todos.filter((t) => !t.isDone);
  const factors: MoodFactor[] = [];
  const add = (text: string, value: number): void => {
    factors.push({ text, value: Math.round(value) });
  };

  const late = open.filter((t) => t.late);
  add(`${late.length} überfällig`, -Math.min(40, late.length * 8));
  const lateA = late.filter((t) => t.prio === 'A').length;
  add(`${lateA} überfällig mit Prio A`, -Math.min(12, lateA * 4));
  const week = open.filter((t) => t.week).length;
  add(`${week} fällig in 7 Tagen`, -Math.min(10, week * 2));
  if (conflict) {
    const cf = open.filter((t) => conflict(t) !== null).length;
    add(`${cf} Widerspruch zu HR`, -Math.min(15, cf * 5));
  }
  const stale = open.filter((t) => t.touched && -daysFrom(t.touched, today) > 14).length;
  add(`${stale} seit über 14 Tagen unberührt`, -Math.min(10, stale));
  const wait = open.filter((t) => t.waiting).length;
  add(`${wait} ${wait === 1 ? 'wartet' : 'warten'} auf andere`, -Math.min(8, wait));

  const { start, end } = goalPeriod(todos, today);
  const t0 = start ?? addDays(today, -30);
  const elapsed =
    end && end > t0
      ? Math.min(1, Math.max(0, (today.getTime() - t0.getTime()) / (end.getTime() - t0.getTime())))
      : 0;
  const shares = goalsOf(todos, today)
    .map((g) => {
      const sub = goalChildren(todos, g.name);
      return sub.length ? sub.filter((t) => t.isDone).length / sub.length : null;
    })
    .filter((v): v is number => v !== null);
  if (shares.length && end) {
    const d = shares.reduce((a, b) => a + b, 0) / shares.length - elapsed;
    add(
      `Ziele ${Math.abs(Math.round(d * 100))} Pkt. ${d < 0 ? 'hinter' : 'vor'} dem Zeitplan`,
      d < 0 ? Math.max(-15, d * 30) : Math.min(5, d * 20),
    );
  }

  const recent = todos.filter((t) => {
    if (t.status !== 'erledigt') return false;
    const d = parseDate(t.doneOn) ?? t.touched;
    return d !== null && -daysFrom(d, today) <= 7;
  }).length;
  add(`${plural(recent, 'To-do', 'To-dos')} in 7 Tagen erledigt`, Math.min(12, recent * 2));

  return moodOf(factors);
}
