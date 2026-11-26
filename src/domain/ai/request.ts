import { formatDate } from '@/domain/dates';
import type { Person } from '@/domain/hr';
import { cell } from '@/domain/talks/steps';
import type { Talk } from '@/domain/talks/types';
import type { Todo } from '@/domain/todos';
import { type AiMode, type AiPlan, type AiRequest, pickCols, CONTEXT_COLS } from './plan';
import type { Queue } from './queue';

export interface RequestData {
  todos: Todo[];
  /** Nur mit Rolle hr befüllen. */
  people: Person[];
  talks: Talk[];
}

/** Schritt-Stand eines Talks als eine Zeile Text, z. B. „Anfrage: erledigt (Polina); Zusage: offen“. */
function stepsText(t: Talk): string {
  return t.steps
    .filter((s) => s.status !== 'na')
    .map((s) => `${s.def.key}: ${s.status}${s.owner ? ` (${s.owner})` : ''}`)
    .join('; ');
}

/**
 * Baut die Anfrage aus Warteschlange und geladenen Daten. Hier gehen nur Spalten mit,
 * die Claude ändern darf oder zum Zuordnen braucht. Von Personen nur Schlüssel, Vorname und Pipeline-Felder
 * (kein Nachname, keine Kontaktdaten). `sanitizeRequest` auf dem Server filtert noch einmal.
 */
export function buildRequest(
  q: Queue,
  data: RequestData,
  opts: { mode: AiMode; today: Date; extra?: string[]; previous?: AiPlan | null },
): AiRequest {
  const todoById = new Map(data.todos.map((t) => [t.id, t]));
  const personByKey = new Map(data.people.map((p) => [p.key, p]));
  const talkByKey = new Map(data.talks.map((t) => [t.key, t]));
  const queued = (m: Record<string, string>) => Object.entries(m);

  const todoNotes = queued(q.todos).filter(([id]) => todoById.has(id));
  const peopleNotes = queued(q.people).filter(([k]) => personByKey.has(k));
  const talkNotes = queued(q.talks).filter(([k]) => talkByKey.has(k));
  const queuedTodoIds = new Set(todoNotes.map(([id]) => id));

  return {
    mode: opts.mode,
    today: formatDate(opts.today),
    todos: todoNotes.map(([id, note]) => ({ id, note })),
    people: peopleNotes.map(([key, note]) => ({ key, note })),
    talks: talkNotes.map(([key, note]) => ({ key, note })),
    free: q.free,
    extra: opts.extra ?? [],
    previous: opts.previous ?? null,
    context: {
      todos: todoNotes.flatMap(([id]) => {
        const t = todoById.get(id);
        return t ? [pickCols({ ...t.raw, ID: t.id }, CONTEXT_COLS.todos)] : [];
      }),
      openTodos: data.todos
        .filter((t) => !t.isDone && !queuedTodoIds.has(t.id))
        .map((t) => pickCols({ ...t.raw, ID: t.id }, CONTEXT_COLS.openTodos)),
      people: peopleNotes.flatMap(([key]) => {
        const p = personByKey.get(key);
        return p
          ? [
              pickCols(
                { ...p.k, key, Vorname: p.k['Vorname'] ?? p.name.split(' ')[0] },
                CONTEXT_COLS.people,
              ),
            ]
          : [];
      }),
      talks: talkNotes.flatMap(([key]) => {
        const t = talkByKey.get(key);
        return t
          ? [
              pickCols(
                { ...t.raw, key, Titel: t.title || cell(t.raw, 'Titel'), Schritte: stepsText(t) },
                CONTEXT_COLS.talks,
              ),
            ]
          : [];
      }),
      ziele: [...new Set(data.todos.map((t) => t.goal).filter(Boolean))],
    },
  };
}
