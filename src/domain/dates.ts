/** Datums-Helfer. Alle Funktionen bekommen `today` explizit, die Domain liest nie die Systemuhr. */

const DAY_MS = 864e5;

const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Lokale Mitternacht aus Jahr/Monat(1-12)/Tag; null bei unmöglichem Datum (z. B. 31.02.). */
function exactDate(y: number, m: number, d: number): Date | null {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
    ? date
    : null;
}

/** `T.M.JJ(JJ)` (zweistellig = 20JJ) oder ISO `JJJJ-MM-TT`, sonst null. Text dahinter (Uhrzeit) wird ignoriert. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  const de = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(s);
  if (de) {
    let y = Number(de[3]);
    if (y < 100) y += 2000;
    return exactDate(y, Number(de[2]), Number(de[1]));
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return exactDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  return null;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Ganze Tage von `today` bis `d` (negativ = vergangen). Rundung fängt Zeitumstellung ab. */
export function daysFrom(d: Date, today: Date): number {
  return Math.round((startOfDay(d).getTime() - startOfDay(today).getTime()) / DAY_MS);
}

/** Alias für `daysFrom`, liest sich bei zwei Daten besser. */
export const daysBetween = daysFrom;

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** `TT.MM.JJJJ`, so wird ins Sheet geschrieben. */
export function formatDate(d: Date): string {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** `TT.MM.`, im Jahr ungleich dem von `today` mit zweistelligem Jahr (`TT.MM.JJ`). */
export function formatShort(d: Date, today: Date): string {
  const base = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`;
  return d.getFullYear() === today.getFullYear() ? base : base + pad2(d.getFullYear() % 100);
}

/** „heute“, „morgen“, „in N Tagen“, „gestern“, „vor N Tagen“. */
export function relDays(d: Date, today: Date): string {
  const n = daysFrom(d, today);
  if (n === 0) return 'heute';
  if (n === 1) return 'morgen';
  if (n > 1) return `in ${n} Tagen`;
  if (n === -1) return 'gestern';
  return `vor ${-n} Tagen`;
}

/** „November 2026“. */
export function monthLabel(d: Date): string {
  return `${MONTHS[d.getMonth()] ?? ''} ${d.getFullYear()}`;
}
