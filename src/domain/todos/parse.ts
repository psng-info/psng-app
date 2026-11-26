import { daysFrom, parseDate } from '@/domain/dates';
import { rowsOf, type Values } from '@/domain/rows';
import type { Todo } from './types';

/** Namen aus einer Zelle: Klammern weg, getrennt an Komma und „und“. */
export function splitPeople(cell: string | null | undefined): string[] {
  return String(cell ?? '')
    .replace(/\([^)]*\)/g, '')
    .split(/,| und /)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Owner: „Delegiert an“; nur wenn leer „Wartet auf“; sonst die Koordination. */
export function ownersOf(delegatedTo: string, waitingFor: string): string[] {
  const d = splitPeople(delegatedTo);
  if (d.length) return [...new Set(d)];
  const w = splitPeople(waitingFor);
  return w.length ? [...new Set(w)] : ['Koordination'];
}

const CLOSED = new Set(['erledigt', 'verworfen', 'geparkt']);

/** Rohwerte des Tabs To-dos → To-dos. Zeilen ohne ID und ohne Text fallen weg. */
export function parseTodos(values: Values | null | undefined, today: Date): Todo[] {
  return rowsOf(values)
    .filter((r) => r['ID'] || r['To-do'])
    .map((r): Todo => {
      const status = r['Status'] || 'offen';
      const deadline = parseDate(r['Deadline']);
      const dd = deadline ? daysFrom(deadline, today) : null;
      const isDone = CLOSED.has(status);
      const touched =
        [r['Geändert'], r['Erledigt'], r['Erfasst']]
          .map((v) => parseDate(v))
          .filter((d): d is Date => d !== null)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      return {
        id: r['ID'] ?? '',
        title: r['To-do'] ?? '',
        status,
        level: r['Ebene'] ?? '',
        mode: r['Modus'] ?? '',
        goal: r['Ziel'] ?? '',
        area: r['Bereich'] ?? '',
        prio: r['Prio'] ?? '',
        deadline,
        dd,
        waitingFor: r['Wartet auf'] ?? '',
        delegatedTo: r['Delegiert an'] ?? '',
        nextStep: r['Nächster Schritt'] ?? '',
        source: r['Quelle'] ?? '',
        link: r['Link'] ?? '',
        created: r['Erfasst'] ?? '',
        doneOn: r['Erledigt'] ?? '',
        note: r['Notiz'] ?? '',
        changed: r['Geändert'] ?? '',
        isDone,
        late: !isDone && dd !== null && dd < 0,
        week: !isDone && dd !== null && dd >= 0 && dd <= 7,
        waiting: !isDone && (status === 'wartet' || !!r['Wartet auf']),
        touched,
        owners: ownersOf(r['Delegiert an'] ?? '', r['Wartet auf'] ?? ''),
        row: r._row,
        raw: r,
      };
    });
}
