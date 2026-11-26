import { daysFrom, parseDate } from '@/domain/dates';
import type { Todo } from './types';

/** Erledigte Ziele bleiben bis so viele Tage nach ihrer Deadline sichtbar. */
const KEEP_DONE_DAYS = 45;

/**
 * Ziele stehen im Sheet als Zeilen mit Ebene „Ziel“: nicht verworfen oder geparkt,
 * nicht „Außerhalb …“, erledigte bis 45 Tage nach ihrer Deadline.
 */
export function goalRows(todos: Todo[], today: Date): Todo[] {
  return todos.filter(
    (t) =>
      t.level === 'Ziel' &&
      !!t.goal &&
      !/^Außerhalb/i.test(t.goal) &&
      t.status !== 'verworfen' &&
      t.status !== 'geparkt' &&
      (t.status !== 'erledigt' || !t.deadline || daysFrom(t.deadline, today) >= -KEEP_DONE_DAYS),
  );
}

export interface Goal {
  /** Wert der Spalte „Ziel“ (Gruppenschlüssel). */
  name: string;
  /** To-do-Text der Ziel-Zeile, sonst der Name. */
  title: string;
  /** Alle Unterpunkte außer verworfen und geparkt (die Ziel-Zeile selbst zählt nicht). */
  total: number;
  done: number;
  open: number;
  late: number;
  /** Fortschritt 0 bis 100, gerundet. */
  pct: number;
  owner: string;
  nextStep: string;
  deadline: Date | null;
}

/** Unterpunkte eines Ziels für den Fortschritt. */
export function goalChildren(todos: Todo[], name: string): Todo[] {
  return todos.filter(
    (t) =>
      t.goal === name && t.level !== 'Ziel' && t.status !== 'verworfen' && t.status !== 'geparkt',
  );
}

export function goalsOf(todos: Todo[], today: Date): Goal[] {
  const heads = goalRows(todos, today);
  const names = [...new Set(heads.map((h) => h.goal))];
  return names.map((name): Goal => {
    const head = heads.find((h) => h.goal === name);
    const sub = goalChildren(todos, name);
    const done = sub.filter((t) => t.isDone).length;
    return {
      name,
      title: head?.title || name,
      total: sub.length,
      done,
      open: sub.length - done,
      late: sub.filter((t) => t.late).length,
      pct: sub.length ? Math.round((done / sub.length) * 100) : 0,
      owner: head?.delegatedTo ?? '',
      nextStep: head?.nextStep ?? '',
      deadline: head?.deadline ?? null,
    };
  });
}

export interface GoalPeriod {
  /** Frühestes Erfasst der Ziel-Zeilen. */
  start: Date | null;
  /** Späteste Deadline der Ziel-Zeilen. */
  end: Date | null;
  /** Tage bis zum Ende (negativ = vorbei), null ohne Ende. */
  daysLeft: number | null;
}

export function goalPeriod(todos: Todo[], today: Date): GoalPeriod {
  const rows = goalRows(todos, today);
  const ends = rows.map((r) => r.deadline).filter((d): d is Date => d !== null);
  const starts = rows.map((r) => parseDate(r.created)).filter((d): d is Date => d !== null);
  const end = ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null;
  const start = starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : null;
  return { start, end, daysLeft: end ? daysFrom(end, today) : null };
}
