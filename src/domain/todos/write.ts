import { formatDate, formatShort, parseDate } from '@/domain/dates';
import { headerOf, type Values } from '@/domain/rows';

/** Felder, die das Formular „Neues To-do“ liefert (Kopfzeilen-Namen des Sheets). */
export interface NewTodoFields {
  'To-do': string;
  Status: string;
  Ebene: string;
  Modus: string;
  Ziel: string;
  Bereich: string;
  Prio: string;
  Deadline: string;
  'Wartet auf': string;
  'Delegiert an': string;
}

export type TodoErrors = Partial<Record<keyof NewTodoFields, string>>;

/** Prüft ein neues To-do. Leeres Ergebnis = gültig. */
export function validateNewTodo(f: Partial<NewTodoFields>): TodoErrors {
  const err: TodoErrors = {};
  const v = (k: keyof NewTodoFields): string => (f[k] ?? '').trim();
  if (!v('To-do')) err['To-do'] = 'Bitte beschreiben, was zu tun ist.';
  if (v('Deadline') && !parseDate(v('Deadline'))) err.Deadline = 'Datum nicht lesbar.';
  if (v('Prio') === 'A' && !v('Deadline')) err.Deadline = 'Prio A braucht eine Deadline.';
  if (v('Modus') === 'delegieren' && !v('Delegiert an')) {
    err['Delegiert an'] = 'Wer übernimmt? Bei „delegieren“ ist das Pflicht.';
  }
  if (v('Status') === 'wartet' && !v('Wartet auf')) {
    err['Wartet auf'] = 'Auf wen oder was wird gewartet?';
  }
  return err;
}

/** Höchste `T<n>` in der Spalte ID plus 1, zweistellig gepolstert (T07, T118). */
export function nextTodoId(values: Values): string {
  const idCol = Math.max(0, headerOf(values).indexOf('ID'));
  let max = 0;
  for (const row of values.slice(1)) {
    const m = /^T(\d+)$/.exec(String(row[idCol] ?? '').trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `T${String(max + 1).padStart(2, '0')}`;
}

/**
 * Neue Zeile in der Reihenfolge der Kopfzeile. ID kommt aus `fields.ID`.
 * Erfasst und Geändert = heute, Quelle = „App TT.MM.JJJJ“, Deadline wird als TT.MM.JJJJ geschrieben,
 * unbekannte Spalten bleiben leer.
 */
export function newTodoRow(
  header: string[],
  fields: Partial<NewTodoFields> & { ID: string },
  today: Date,
): string[] {
  const stamp = formatDate(today);
  const deadline = parseDate(fields.Deadline);
  return header.map((h) => {
    switch (h) {
      case 'ID':
        return fields.ID;
      case 'Erfasst':
      case 'Geändert':
        return stamp;
      case 'Quelle':
        return `App ${stamp}`;
      case 'Status':
        return fields.Status?.trim() || 'offen';
      case 'Deadline':
        return deadline ? formatDate(deadline) : '';
      case 'Link':
      case 'Erledigt':
      case 'Notiz':
      case 'Nächster Schritt':
        return '';
      default:
        return ((fields as Record<string, string | undefined>)[h] ?? '').trim();
    }
  });
}

/** Spalten, die beim Abhaken geschrieben werden, in dieser Reihenfolge. `Geändert` nur, wenn es die Spalte gibt. */
export function completePatch(today: Date): Record<string, string> {
  const stamp = formatDate(today);
  return { Status: 'erledigt', Erledigt: stamp, Geändert: stamp };
}

/** Neue Notiz: bestehender Text bleibt, dazu eine Zeile „TT.MM.: Text“. */
export function appendNote(existing: string, text: string, today: Date): string {
  const line = `${formatShort(today, today)}: ${text.trim()}`;
  const old = existing.trim();
  return old ? `${old}\n${line}` : line;
}

/** Zeilenindex (in `values`) der Zeile mit dieser ID in der Spalte ID, -1 wenn nicht da. */
export function findTodoRow(values: Values, id: string): number {
  const idCol = headerOf(values).indexOf('ID');
  if (idCol < 0) return -1;
  return values.findIndex((r, i) => i > 0 && String(r[idCol] ?? '').trim() === id);
}

/** Kopie von `values` mit gesetzten Zellen der Zeile `id`. Unbekannte Spalten werden übersprungen. Für optimistische Updates. */
export function withCells(values: Values, id: string, patch: Record<string, string>): Values {
  const idx = findTodoRow(values, id);
  if (idx < 0) return values;
  const header = headerOf(values);
  return values.map((row, i) => {
    if (i !== idx) return row;
    const next = [...row];
    for (const [k, v] of Object.entries(patch)) {
      const c = header.indexOf(k);
      if (c < 0) continue;
      while (next.length <= c) next.push('');
      next[c] = v;
    }
    return next;
  });
}

/** Kopie von `values` mit angehängter Zeile (optimistisch). */
export function withAppendedRow(values: Values, row: string[]): Values {
  return [...values.map((r) => [...r]), row];
}
