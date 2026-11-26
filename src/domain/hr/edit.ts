import { formatDate, parseDate } from '@/domain/dates';

/** Spalten im Tab Kandidaten, die die App schreiben darf. */
export const HR_EDIT = [
  'Pipeline-Status',
  'Buddy',
  '1:1 am',
  'Probeaufgabe',
  'Deadline',
  'Review / Ergebnis',
  'Kommentar',
  'Letzter Kontakt',
  'Wiedervorlage',
  'Formular gesendet',
  '1:1 angeboten + Überblick',
  'Aufgabe vereinbart',
  'Letzter Check-in',
  'Team-Entscheidung',
  'Benachrichtigt',
  'Integriert',
] as const;
export type HrEditCol = (typeof HR_EDIT)[number];

/** Checkbox-Spalten, geschrieben als TRUE/FALSE. */
export const HR_BOOL: ReadonlySet<string> = new Set([
  'Formular gesendet',
  '1:1 angeboten + Überblick',
  'Aufgabe vereinbart',
  'Team-Entscheidung',
  'Benachrichtigt',
  'Integriert',
]);

export const HR_DATE: ReadonlySet<string> = new Set([
  '1:1 am',
  'Deadline',
  'Letzter Kontakt',
  'Wiedervorlage',
  'Letzter Check-in',
]);

/** Pipeline-Status, die beim Schreiben erlaubt sind. */
export const PIPELINE_STATUS = [
  'Neu eingegangen',
  'Warte auf Termin',
  '1:1 geführt',
  'Probeaufgabe läuft',
  'Review',
  'Core',
  'Helper',
  'Pause',
  'Abgesagt',
] as const;

export type HrSet = Partial<Record<HrEditCol, string | boolean>>;

/** Prüft die Änderung und gibt sie als Zellwerte zurück (Boolean bleibt Boolean, Datum als TT.MM.JJJJ). Wirft bei Unerlaubtem. */
export function checkEdit(set: Record<string, string | boolean>): HrSet {
  const out: Record<string, string | boolean> = {};
  for (const [col, v] of Object.entries(set)) {
    if (!(HR_EDIT as readonly string[]).includes(col))
      throw new Error(`Spalte nicht erlaubt: ${col}`);
    if (HR_BOOL.has(col)) {
      if (typeof v !== 'boolean') throw new Error(`Spalte ${col} erwartet Ja/Nein.`);
      out[col] = v;
      continue;
    }
    if (typeof v !== 'string') throw new Error(`Spalte ${col} erwartet Text.`);
    if (col === 'Pipeline-Status' && !(PIPELINE_STATUS as readonly string[]).includes(v)) {
      throw new Error('Status nicht erlaubt.');
    }
    if (HR_DATE.has(col) && v !== '') {
      const d = parseDate(v);
      if (!d) throw new Error(`Datum ungültig: ${col}`);
      out[col] = formatDate(d);
      continue;
    }
    out[col] = v;
  }
  return out;
}

/** Zellwert fürs Sheet: Booleans als TRUE/FALSE. */
export const cellText = (v: string | boolean): string =>
  typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : v;
