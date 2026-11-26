import type { HrRaw } from './types';

export const TODAY = new Date(2026, 10, 26);

const KHEAD = [
  'Vorname',
  'Nachname',
  'Pipeline-Status',
  'Buddy',
  'Formular ausgefüllt',
  'E-Mail',
  'Telefon',
  '1:1 am',
  'Deadline',
  'Review / Ergebnis',
  'Letzter Kontakt',
  'Wiedervorlage',
  'Formular gesendet',
  '1:1 angeboten + Überblick',
  'Aufgabe vereinbart',
  'Letzter Check-in',
  'Team-Entscheidung',
  'Benachrichtigt',
  'Integriert',
];

/** Eine Kandidaten-Zeile aus Teilangaben (Rest leer). */
export function kRow(o: Record<string, string>): string[] {
  return KHEAD.map((h) => o[h] ?? '');
}

export function raw(kandidaten: Record<string, string>[] = [], extra: Partial<HrRaw> = {}): HrRaw {
  return {
    kandidaten: [KHEAD, ...kandidaten.map(kRow)],
    abbrueche: [[...KHEAD, 'Grund', 'Vorgehen']],
    formular: [['Zeitstempel', 'Vor- und Nachname', 'E-Mail', 'Handynummer', 'Einverständnis']],
    notizen: [['Datum', 'Person', 'Quelle', 'Notiz', 'Von']],
    ...extra,
  };
}
