import { CLOSED_TXT } from './stages';
import type { HrConflict, Person } from './types';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Nennt der To-do-Text (To-do + Nächster Schritt) eine Person, deren HR-Status abgeschlossen ist?
 * Verglichen wird der Vorname (bis zum ersten Leerzeichen oder zur Klammer, mind. 3 Zeichen),
 * mit Buchstabengrenzen und Groß-/Kleinschreibung („Lasse“, nicht „lasse“).
 * Nur Kandidat:innen und Abbrüche zählen, nie reine Formular-Personen.
 * Gibt den ersten Treffer zurück: Vorname, Status und (bei Abbrüchen) den Status-Text als Grund.
 */
export function hrConflict(todoText: string, people: Person[]): HrConflict | null {
  const txt = ` ${todoText} `;
  for (const p of people) {
    if (!CLOSED_TXT[p.status] || p.formOnly) continue;
    const first = (p.k['Vorname'] ?? '').split(/[ (]/)[0] ?? '';
    if (first.length < 3) continue;
    if (new RegExp(`(?<!\\p{L})${escapeRe(first)}(?!\\p{L})`, 'u').test(txt)) {
      return {
        first,
        status: p.status,
        grund: p.source === 'abbruch' ? (p.k['Pipeline-Status'] ?? '') : '',
      };
    }
  }
  return null;
}
