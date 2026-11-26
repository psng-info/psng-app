import type { Values } from '@/domain/rows';
import { parseTodos } from './parse';
import type { Todo } from './types';

/** Heute für alle To-do-Tests: 26.11.2026. */
export const TODAY = new Date(2026, 10, 26);

export const TODO_HEADER = [
  'ID',
  'To-do',
  'Status',
  'Ebene',
  'Modus',
  'Ziel',
  'Bereich',
  'Prio',
  'Deadline',
  'Wartet auf',
  'Delegiert an',
  'Nächster Schritt',
  'Quelle',
  'Link',
  'Erfasst',
  'Erledigt',
  'Notiz',
  'Geändert',
];

export function todoValues(rows: Record<string, string>[]): Values {
  return [TODO_HEADER, ...rows.map((r) => TODO_HEADER.map((h) => r[h] ?? ''))];
}

/** To-dos aus Teil-Zeilen. Ohne ID wird T<n> vergeben, ohne Status „offen“. */
export function todos(rows: Record<string, string>[], today: Date = TODAY): Todo[] {
  return parseTodos(
    todoValues(rows.map((r, i) => ({ ID: `T${String(i + 1).padStart(2, '0')}`, ...r }))),
    today,
  );
}
