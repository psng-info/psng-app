import { formatDate, parseDate } from '@/domain/dates';
import { checkEdit, type HrSet } from '@/domain/hr/edit';
import { norm, yes } from '@/domain/text';
import { checkLectureSet } from '@/domain/talks/write';
import {
  LEVELS,
  MODES,
  PRIOS,
  STATUSES,
  validateNewTodo,
  type NewTodoFields,
} from '@/domain/todos';
import { HR_BOOL_COLS, type AiPlan, type Rec } from './plan';

/** Ein Wert-Wechsel in der Vorschau. `old` leer = bisher nichts drin. */
export interface DiffLine {
  col: string;
  old: string;
  next: string;
}

interface Base {
  /** Stabiler Schlüssel, damit „Ergänzen/korrigieren“ abgewählte Einträge abgewählt lässt. */
  id: string;
  label: string;
  why: string;
  lines: DiffLine[];
  ok: boolean;
  /** Gesetzt = nicht schreibbar (Grund steht hier), Haken ist aus und gesperrt. */
  blocked?: string;
}

export type PreviewItem =
  | (Base & { kind: 'todo'; todoId: string; set: Rec })
  | (Base & { kind: 'hr'; key: string; name: string; set: HrSet })
  | (Base & { kind: 'talk'; talkKey: string; set: Rec })
  | (Base & { kind: 'new'; fields: Partial<NewTodoFields> })
  | (Base & {
      kind: 'step';
      talkKey: string;
      step: string;
      status: string;
      owner: string;
      note: string;
    });

/** Wo die Vorschau den aktuellen Stand nachschlägt. */
export interface Lookup {
  todo: (id: string) => { title: string; raw: Rec } | undefined;
  person: (key: string) => { name: string; k: Rec } | undefined;
  talk: (key: string) => { raw: Rec } | undefined;
}

const TODO_ENUMS: Record<string, readonly string[]> = {
  Status: STATUSES,
  Ebene: LEVELS,
  Modus: MODES,
  Prio: PRIOS,
};
const TODO_DATES = new Set(['Deadline', 'Erledigt']);

const show = (col: string, v: string): string =>
  HR_BOOL_COLS.includes(col) ? (yes(v) ? '✓' : '○') : v;

/** Nur echte Änderungen als Zeilen. Wahrheitswerte und Datumsformate werden vor dem Vergleich angeglichen. */
function diff(cur: Rec, set: Record<string, string | boolean>): DiffLine[] {
  const out: DiffLine[] = [];
  for (const [col, raw] of Object.entries(set)) {
    const next = typeof raw === 'boolean' ? (raw ? 'TRUE' : 'FALSE') : raw;
    const old = (cur[col] ?? '').trim();
    if (HR_BOOL_COLS.includes(col)) {
      if (yes(old) === yes(next)) continue;
    } else if (old === next.trim()) continue;
    else {
      const d1 = parseDate(old);
      const d2 = parseDate(next);
      if (d1 && d2 && formatDate(d1) === formatDate(d2)) continue;
    }
    out.push({ col, old: show(col, old), next: show(col, next) });
  }
  return out;
}

/**
 * Macht aus dem Vorschlag eine Vorschau mit Haken. Unbekannte IDs/Schlüssel, nicht erlaubte Werte und
 * Änderungen, die schon so im Sheet stehen, fallen weg. `previous` (frühere Vorschau) hält abgewählte Einträge abgewählt.
 */
export function buildPreview(
  plan: AiPlan,
  look: Lookup,
  previous: PreviewItem[] = [],
): PreviewItem[] {
  const items: PreviewItem[] = [];

  for (const c of plan.todo) {
    const t = look.todo(c.id);
    if (!t) continue;
    const set: Rec = {};
    for (const [col, v] of Object.entries(c.set)) {
      const allowed = TODO_ENUMS[col];
      if (allowed && !allowed.includes(v)) continue;
      if (TODO_DATES.has(col)) {
        const d = parseDate(v);
        if (!d) continue;
        set[col] = formatDate(d);
      } else set[col] = v;
    }
    const lines = diff(t.raw, set);
    if (lines.length) {
      items.push({
        kind: 'todo',
        id: `todo:${c.id}`,
        todoId: c.id,
        label: `${c.id} ${t.title}`,
        why: c.why,
        lines,
        ok: true,
        set: Object.fromEntries(lines.map((l) => [l.col, set[l.col] ?? l.next])),
      });
    }
  }

  for (const c of plan.hr) {
    const p = look.person(c.key);
    if (!p) continue;
    const set: Record<string, string | boolean> = {};
    for (const [col, v] of Object.entries(c.set))
      set[col] = HR_BOOL_COLS.includes(col) ? yes(v) : v;
    let checked: HrSet;
    try {
      checked = checkEdit(set);
    } catch {
      continue;
    }
    const lines = diff(p.k, checked);
    if (lines.length) {
      const keep = new Set(lines.map((l) => l.col));
      items.push({
        kind: 'hr',
        id: `hr:${c.key}`,
        key: c.key,
        name: p.name,
        label: p.name,
        why: c.why,
        lines,
        ok: true,
        set: Object.fromEntries(Object.entries(checked).filter(([k]) => keep.has(k))),
      });
    }
  }

  for (const c of plan.talk) {
    const t = look.talk(c.key);
    if (!t) continue;
    let checked: Rec;
    try {
      checked = checkLectureSet(c.set);
    } catch {
      continue;
    }
    const lines = diff(t.raw, checked);
    if (lines.length) {
      items.push({
        kind: 'talk',
        id: `talk:${c.key}`,
        talkKey: c.key,
        label: c.key,
        why: c.why,
        lines,
        ok: true,
        set: Object.fromEntries(lines.map((l) => [l.col, checked[l.col] ?? l.next])),
      });
    }
  }

  for (const c of plan.steps) {
    if (!look.talk(c.key)) continue;
    const lines: DiffLine[] = [];
    if (c.status) lines.push({ col: 'Status', old: '', next: c.status });
    if (c.owner) lines.push({ col: 'Owner', old: '', next: c.owner });
    if (c.note) lines.push({ col: 'Notiz', old: '', next: c.note });
    items.push({
      kind: 'step',
      id: `step:${c.key}|${c.step}`,
      talkKey: c.key,
      step: c.step,
      status: c.status,
      owner: c.owner,
      note: c.note,
      label: `${c.key} · ${c.step}`,
      why: c.why,
      lines,
      ok: true,
    });
  }

  for (const c of plan.new) {
    const errs = Object.values(validateNewTodo(c.set as Partial<NewTodoFields>));
    const lines = Object.entries(c.set)
      .filter(([, v]) => v.trim())
      .map(([col, next]) => ({ col, old: '', next }));
    const item: PreviewItem = {
      kind: 'new',
      id: `new:${norm(c.set['To-do'] ?? '')}`,
      label: c.set['To-do'] ?? '',
      why: c.why,
      lines,
      ok: errs.length === 0,
      fields: c.set,
      ...(errs[0] ? { blocked: errs[0] } : {}),
    };
    items.push(item);
  }

  const off = new Set(previous.filter((p) => !p.ok && !p.blocked).map((p) => p.id));
  return items.map((i) => (off.has(i.id) ? { ...i, ok: false } : i));
}
