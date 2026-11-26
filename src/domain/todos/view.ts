import { daysFrom } from '@/domain/dates';
import { norm } from '@/domain/text';
import { TILES, type Tile } from './tiles';
import type { Todo } from './types';

/* ---------- Sortierung ---------- */

const prioRank = (p: string): number => ({ A: 0, B: 1, C: 2 })[p] ?? 3;

/** Offene vor erledigten, überfällige zuerst, dann Prio, Deadline (ohne zuletzt), ID. */
export function sortTodos(a: Todo, b: Todo): number {
  return (
    Number(a.isDone) - Number(b.isDone) ||
    Number(b.late) - Number(a.late) ||
    prioRank(a.prio) - prioRank(b.prio) ||
    (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity) ||
    a.id.localeCompare(b.id, 'de', { numeric: true })
  );
}

/* ---------- Filter ---------- */

export type SinceKey = '' | '0' | '7' | '30' | 'old';

export const SINCE_LABELS: Record<SinceKey, string> = {
  '': 'egal wann',
  '0': 'heute',
  '7': 'letzte 7 Tage',
  '30': 'letzte 30 Tage',
  old: 'vor über 14 Tagen',
};

export interface TodoFilters {
  q: string;
  person: string | null;
  area: string | null;
  since: SinceKey;
  showDone: boolean;
  tile: string | null;
}

export const EMPTY_FILTERS: TodoFilters = {
  q: '',
  person: null,
  area: null,
  since: '',
  showDone: false,
  tile: null,
};

export function sinceOk(t: Todo, since: SinceKey, today: Date): boolean {
  if (!since) return true;
  if (!t.touched) return since === 'old';
  const ago = -daysFrom(t.touched, today);
  return since === 'old' ? ago > 14 : ago <= Number(since);
}

export interface FilterOptions {
  tiles?: readonly Tile[];
  /** Diese IDs bleiben trotz Erledigt-Filter und Kachel sichtbar (gerade abgehakt, noch am Speichern). */
  keepIds?: ReadonlySet<string>;
}

/** Text aller Zellen einer Zeile für die Suche. */
const haystack = (t: Todo): string =>
  norm(
    Object.values(t.raw)
      .filter((v): v is string => typeof v === 'string')
      .join(' '),
  );

export function filterTodos(
  todos: Todo[],
  f: TodoFilters,
  today: Date,
  opts: FilterOptions = {},
): Todo[] {
  const tile = f.tile ? (opts.tiles ?? TILES).find((x) => x.key === f.tile) : undefined;
  const q = norm(f.q);
  return todos.filter((t) => {
    if (f.person && !t.owners.includes(f.person)) return false;
    if (f.area && t.area !== f.area) return false;
    if (!sinceOk(t, f.since, today)) return false;
    if (q && !haystack(t).includes(q)) return false;
    if (opts.keepIds?.has(t.id)) return true;
    if (!(f.showDone || !t.isDone || f.tile === 'done' || f.since)) return false;
    return !tile || tile.test(t);
  });
}

export interface CountedOption {
  value: string;
  label: string;
  count: number;
}

/** Personen mit Zahl offener To-dos, meiste zuerst. */
export function personOptions(todos: Todo[]): CountedOption[] {
  const counts = new Map<string, number>();
  for (const t of todos)
    if (!t.isDone) for (const n of t.owners) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
    .map(([value, count]) => ({ value, label: value, count }));
}

/** Alle Bereiche (auch ohne offene To-dos), alphabetisch, mit Zahl offener. */
export function areaOptions(todos: Todo[]): CountedOption[] {
  const names = [...new Set(todos.map((t) => t.area).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'de'),
  );
  return names.map((value) => ({
    value,
    label: value,
    count: todos.filter((t) => !t.isDone && t.area === value).length,
  }));
}

/* ---------- Gruppen ---------- */

export type GroupKey = 'Modus' | 'Ebene' | 'Ziel' | 'Person';
export const GROUP_KEYS: readonly GroupKey[] = ['Modus', 'Ebene', 'Ziel', 'Person'];

interface GroupDef {
  field: 'mode' | 'level' | 'goal' | null;
  order: string[];
  names: Record<string, string>;
  hints: Record<string, string>;
}

const GROUPS: Record<GroupKey, GroupDef> = {
  Modus: {
    field: 'mode',
    order: ['selbst', 'koordinieren', 'entscheiden', 'delegieren'],
    names: {
      selbst: 'Selbst tun',
      koordinieren: 'Koordinieren',
      entscheiden: 'Entscheiden',
      delegieren: 'Delegiert',
    },
    hints: {
      selbst: 'macht die Koordination',
      koordinieren: 'Leute abstimmen',
      entscheiden: 'Entscheidung herbeiführen',
      delegieren: 'andere machen, Koordination hält nach',
    },
  },
  Ebene: {
    field: 'level',
    order: ['Schritt', 'Projekt', 'Ziel'],
    names: { Schritt: 'Konkrete Schritte', Projekt: 'Projekte', Ziel: 'Ziele' },
    hints: { Schritt: 'eine Handlung', Projekt: 'mehrere Schritte', Ziel: 'Q4-Ziel' },
  },
  Ziel: {
    field: 'goal',
    order: ['e.V.', 'Onboarding', 'Lecture-Pipeline', 'Außerhalb Q4'],
    names: {},
    hints: {},
  },
  Person: { field: null, order: [], names: {}, hints: {} },
};

export interface Bucket {
  key: string;
  label: string;
  hint?: string;
  todos: Todo[];
}

/**
 * Spalten der Liste. Modus zeigt immer alle vier Spalten, die anderen nur gefüllte.
 * Innerhalb einer Spalte nach `sortTodos` sortiert.
 */
export function groupTodos(todos: Todo[], group: GroupKey): Bucket[] {
  const def = GROUPS[group];
  const map = new Map<string, Todo[]>();
  if (def.field === null) {
    for (const t of todos) {
      for (const p of t.owners) map.set(p, [...(map.get(p) ?? []), t]);
    }
  } else {
    for (const k of def.order) map.set(k, []);
    for (const t of todos) {
      const k = t[def.field] || 'Ohne Angabe';
      map.set(k, [...(map.get(k) ?? []), t]);
    }
  }
  let entries = [...map.entries()];
  if (def.field === null) {
    entries = entries.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'de'));
  }
  return entries
    .filter(([, v]) => v.length > 0 || group === 'Modus')
    .map(([key, v]) => ({
      key,
      label: def.names[key] ?? key,
      ...(def.hints[key] ? { hint: def.hints[key] } : {}),
      todos: [...v].sort(sortTodos),
    }));
}
