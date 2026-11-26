/** Eine Sheet-Zeile als Objekt: Kopfzeilen-Name → getrimmter Text. `_row` ist die Zeilennummer im Sheet (Kopfzeile = 1). */
export type Row = Record<string, string> & { _row: number };

/** Rohwerte, wie die Sheets-API sie liefert: Zeilen mit Zellen, hinten fehlende Zellen werden weggelassen. */
export type Values = string[][];

const EMPTYISH = /^(|TRUE|FALSE|true|false)$/;

/** Kopfzeile aus Rohwerten, getrimmt. */
export function headerOf(values: Values): string[] {
  return (values[0] ?? []).map((h) => String(h).trim());
}

/**
 * Wandelt Rohwerte in Zeilen-Objekte. Zeile 1 ist die Kopfzeile.
 * Zeilen, die nur leer oder TRUE/FALSE enthalten, fallen weg.
 */
export function rowsOf(values: Values | null | undefined): Row[] {
  if (!values || values.length === 0) return [];
  const head = headerOf(values);
  const out: Row[] = [];
  values.slice(1).forEach((cells, i) => {
    if (!cells.some((c) => !EMPTYISH.test(String(c ?? '').trim()))) return;
    const row = { _row: i + 2 } as Row;
    head.forEach((h, j) => {
      if (!h) return;
      const v = cells[j];
      row[h] = v == null ? '' : String(v).trim();
    });
    out.push(row);
  });
  return out;
}

/** Wert einer Spalte: exakter Kopfzeilen-Name, sonst die erste Spalte, deren Name mit `prefix` beginnt. */
export function col(row: Row | null | undefined, prefix: string): string {
  if (!row) return '';
  const exact = row[prefix];
  if (typeof exact === 'string') return exact;
  const key = Object.keys(row).find((h) => h !== '_row' && h.startsWith(prefix));
  return key ? (row[key] ?? '') : '';
}
