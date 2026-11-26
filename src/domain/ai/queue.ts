/**
 * Warteschlange „Vorgemerkt“: Notizen je To-do, Person und Talk plus freie Einträge.
 * Reine Funktionen. Gespeichert (localStorage) werden nur To-dos, Talks und freie Einträge.
 * Notizen zu Personen (HR) bleiben im Speicher und überleben kein Neuladen.
 */

export type QueueKind = 'todos' | 'people' | 'talks';

export interface Queue {
  todos: Record<string, string>;
  people: Record<string, string>;
  talks: Record<string, string>;
  free: string[];
}

export const emptyQueue = (): Queue => ({ todos: {}, people: {}, talks: {}, free: [] });

export const queueCount = (q: Queue): number =>
  Object.keys(q.todos).length +
  Object.keys(q.people).length +
  Object.keys(q.talks).length +
  q.free.length;

/** Text zu einem Eintrag setzen. Leerer Text entfernt ihn. */
export function setNote(q: Queue, kind: QueueKind, id: string, text: string): Queue {
  const next = { ...q[kind] };
  const t = text.trim();
  if (t) next[id] = t;
  else delete next[id];
  return { ...q, [kind]: next };
}

export function addFree(q: Queue, text: string): Queue {
  const t = text.trim();
  return t ? { ...q, free: [...q.free, t] } : q;
}

export const removeFree = (q: Queue, index: number): Queue => ({
  ...q,
  free: q.free.filter((_, i) => i !== index),
});

export const STORAGE_KEY = 'psng.ai.queue.v1';

/** Nur das, was auf dem Gerät bleiben darf: keine Notizen zu Personen. */
export function serializeQueue(q: Queue): string {
  return JSON.stringify({ todos: q.todos, talks: q.talks, free: q.free });
}

const strMap = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, t] of Object.entries(v)) if (typeof t === 'string' && t.trim()) out[k] = t;
  }
  return out;
};

/** Liest gespeicherten Text. Kaputtes oder fremdes JSON ergibt eine leere Schlange. */
export function parseQueue(raw: string | null): Queue {
  if (!raw) return emptyQueue();
  try {
    const d: unknown = JSON.parse(raw);
    if (!d || typeof d !== 'object') return emptyQueue();
    const o = d as Record<string, unknown>;
    return {
      todos: strMap(o['todos']),
      people: {},
      talks: strMap(o['talks']),
      free: Array.isArray(o['free'])
        ? o['free'].filter((x): x is string => typeof x === 'string' && x.trim() !== '')
        : [],
    };
  } catch {
    return emptyQueue();
  }
}

/** „2 To-dos · 1 Person · 1 Talk · 1 neu“ für die Leiste. */
export function queueSummary(q: Queue): string {
  const parts: string[] = [];
  const n = (count: number, one: string, many: string): void => {
    if (count) parts.push(`${count} ${count === 1 ? one : many}`);
  };
  n(Object.keys(q.todos).length, 'To-do', 'To-dos');
  n(Object.keys(q.people).length, 'Person', 'Personen');
  n(Object.keys(q.talks).length, 'Talk', 'Talks');
  n(q.free.length, 'neu', 'neu');
  return parts.join(' · ');
}
