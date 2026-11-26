import { headerOf, type Values } from '@/domain/rows';
import { SheetsError } from './SheetsAdapter';

/** 0 → A, 25 → Z, 26 → AA. */
export function colLetter(index: number): string {
  if (!Number.isInteger(index) || index < 0) throw new RangeError('Spaltenindex ungültig');
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Zahl der Buchstaben A, B, ... AA → Index (A = 0). */
export function colIndexOfLetters(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Tab-Name für A1-Bereiche: nur einfache Namen bleiben ohne Anführungszeichen. */
export function quoteTab(tab: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(tab) ? tab : `'${tab.replaceAll("'", "''")}'`;
}

/** Eine Zelle als A1, z. B. `'Talk-Schritte'!C12`. `row` ist die Sheet-Zeilennummer (Kopfzeile = 1). */
export function a1(tab: string, colIndex: number, row: number): string {
  return `${quoteTab(tab)}!${colLetter(colIndex)}${row}`;
}

/** Zerlegt `'Tab Name'!A1:B2` in Tab und Rest. Ohne `!` ist alles der Tab-Name. */
export function splitRange(range: string): { tab: string; cells: string } {
  const bang = range.lastIndexOf('!');
  if (bang < 0) return { tab: unquote(range), cells: '' };
  return { tab: unquote(range.slice(0, bang)), cells: range.slice(bang + 1) };
}

function unquote(tab: string): string {
  if (tab.length >= 2 && tab.startsWith("'") && tab.endsWith("'")) {
    return tab.slice(1, -1).replaceAll("''", "'");
  }
  return tab;
}

/** Erste Zelle eines Bereichs: `F12` oder `A1:C5` → { col: 5, row: 12 }. */
export function parseCell(cells: string): { col: number; row: number } | null {
  const m = /^([A-Za-z]+)(\d+)/.exec(cells);
  if (!m) return null;
  return { col: colIndexOfLetters(m[1] ?? ''), row: Number(m[2]) };
}

/** Index der Spalte mit diesem Kopfzeilen-Namen, -1 wenn sie fehlt. */
export function columnIndex(header: string[], name: string): number {
  return header.indexOf(name);
}

/** Wirft `missing_column`, wenn eine der Spalten in der Kopfzeile fehlt. Gibt die Kopfzeile zurück. */
export function requireColumns(values: Values, names: string[], tabLabel: string): string[] {
  const header = headerOf(values);
  for (const name of names) {
    if (columnIndex(header, name) < 0) {
      throw new SheetsError('missing_column', `Spalte „${name}“ fehlt im Tab ${tabLabel}.`);
    }
  }
  return header;
}
