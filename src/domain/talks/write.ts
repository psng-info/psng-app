import { formatDate, parseDate } from '@/domain/dates';
import { headerOf, type Values } from '@/domain/rows';
import { findLectureRow } from './model';

/** Spalten in Lectures, die die App schreiben darf. Speaker und TN gesamt nie (Schlüssel bzw. Formel im Sheet). */
export const LECTURE_EDITABLE = [
  'Status',
  'Datum',
  'Uhrzeit',
  'Ort',
  'Format',
  'Reihe',
  'Owner',
  'Moderation',
  'Veröffentlichung',
  'Abstract',
  'TN vor Ort',
  'TN online',
  'Views nach 4 Wo.',
  'YouTube-Link',
  'Notizen',
] as const;
export type LectureCol = (typeof LECTURE_EDITABLE)[number];

const NUMERIC: ReadonlySet<string> = new Set(['TN vor Ort', 'TN online', 'Views nach 4 Wo.']);

/** Status im Log: leer = Status bleibt wie er ist. */
export const STEP_LOG_STATUS = ['erledigt', 'offen', 'nicht nötig'] as const;

/**
 * Prüft eine Änderung an Lectures und gibt die Zellwerte zurück (getrimmt, Datum als TT.MM.JJJJ).
 * Wirft bei nicht erlaubten Spalten, ungültigem Datum oder Zahlenfeldern mit Text.
 */
export function checkLectureSet(set: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [col, raw] of Object.entries(set)) {
    if (!(LECTURE_EDITABLE as readonly string[]).includes(col))
      throw new Error(`Spalte nicht erlaubt: ${col}`);
    const v = raw.trim();
    if (col === 'Datum' && v) {
      const d = parseDate(v);
      if (!d) throw new Error('Datum nicht lesbar.');
      out[col] = formatDate(d);
    } else if (NUMERIC.has(col) && v && !/^\d+$/.test(v)) {
      throw new Error(`${col}: bitte nur eine Zahl.`);
    } else out[col] = v;
  }
  return out;
}

/**
 * Zellen, die sich gegenüber der Zeile in `values` wirklich ändern: Spalte (Kopfzeilen-Name), Index, neuer Wert.
 * Spalten, die es im Tab nicht gibt, fallen weg. Wirft, wenn die Zeile fehlt.
 */
export function lectureChanges(
  values: Values,
  key: string,
  set: Record<string, string>,
): { row: number; cells: { col: string; index: number; value: string }[] } | null {
  const row = findLectureRow(values, key);
  if (row === null) return null;
  const header = headerOf(values);
  const current = values[row - 1] ?? [];
  const cells: { col: string; index: number; value: string }[] = [];
  for (const [col, value] of Object.entries(checkLectureSet(set))) {
    const index = header.indexOf(col);
    if (index < 0) continue;
    const old = String(current[index] ?? '').trim();
    if (old === value) continue;
    const oldDate = col === 'Datum' ? parseDate(old) : null;
    if (oldDate && formatDate(oldDate) === value) continue;
    cells.push({ col, index, value });
  }
  return { row, cells };
}

/** Kopie von `values` mit geänderten Zellen der Lecture `key` (optimistisch). Ohne Treffer unverändert. */
export function withLectureCells(values: Values, key: string, set: Record<string, string>): Values {
  const found = lectureChanges(values, key, set);
  if (!found) return values;
  return values.map((r, i) => {
    if (i !== found.row - 1) return r;
    const next = [...r];
    for (const c of found.cells) {
      while (next.length <= c.index) next.push('');
      next[c.index] = c.value;
    }
    return next;
  });
}

export interface StepLogInput {
  /** Talk-Schlüssel `TT.MM.JJJJ · Speaker`. */
  talk: string;
  /** Schritt-Schlüssel, z. B. `Raum/Zoom`. */
  step: string;
  /** erledigt | offen | nicht nötig | leer. */
  status: string;
  owner: string;
  note: string;
  /** Name der angemeldeten Person laut Zugang. */
  by: string;
}

/** Neue Zeile für Talk-Schritte in der Reihenfolge der Kopfzeile. Unbekannte Spalten bleiben leer. */
export function stepLogRow(header: string[], e: StepLogInput, today: Date): string[] {
  const by: Record<string, string> = {
    Zeitpunkt: formatDate(today),
    Talk: e.talk,
    Schritt: e.step,
    Status: e.status.trim(),
    Owner: e.owner.trim(),
    Von: e.by.trim(),
    Notiz: e.note.trim(),
  };
  return header.map((h) => by[h] ?? '');
}
