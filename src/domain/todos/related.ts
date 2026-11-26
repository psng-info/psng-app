import { parseDate } from '@/domain/dates';
import { nn } from '@/domain/names';
import { norm } from '@/domain/text';
import type { Todo } from './types';

/** Alles, was wir von einem Talk wissen müssen. Passt zu `TalkBase` der Talks-Domain. */
export interface TalkLike {
  names: string[];
  date: Date | null;
}

const NEAR_DAYS = 60;
const DAY_MS = 864e5;

/**
 * To-dos, die zu einem Talk gehören (für die Talk-Karte).
 * Treffer, wenn ein Name des Talks im Text aus To-do, Nächster Schritt und Notiz vorkommt:
 * der Nachname (mind. 4 Buchstaben), oder der Vorname, wenn Bereich Lectures bzw. Ziel
 * Lecture-Pipeline, der Name mehrteilig ist und Erfasst höchstens 60 Tage vom Talk entfernt liegt
 * (ohne Talk-Datum oder ohne Erfasst zählt „nah“). `today` wird (noch) nicht gebraucht, die Signatur bleibt für spätere Regeln.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function relatedTodos(todos: Todo[], talk: TalkLike, _today?: Date): Todo[] {
  return todos.filter((t) => {
    const text = ` ${norm([t.title, t.nextStep, t.note].join(' '))} `;
    const lecture = t.area === 'Lectures' || t.goal === 'Lecture-Pipeline';
    const created = parseDate(t.created);
    const near =
      !talk.date ||
      !created ||
      Math.abs(created.getTime() - talk.date.getTime()) <= NEAR_DAYS * DAY_MS;
    const has = (w: string | undefined): boolean =>
      !!w && w.length >= 4 && new RegExp(`[^a-z]${w}[^a-z]`).test(text);
    return talk.names.some((n) => {
      const w = nn(n).split(' ').filter(Boolean);
      return has(w[w.length - 1]) || (lecture && near && w.length > 1 && has(w[0]));
    });
  });
}
