import { col, type Row } from '@/domain/rows';
import { norm } from '@/domain/text';
import type { RoleName, StepDef, TalkBase } from './types';

/** Start der SOP: ältere Talks zeigen SOP-Schritte ohne Log-Eintrag als „nicht erfasst“ (unk). */
export const TRACK_FROM = new Date(2026, 9, 29);

/** Standardname, wenn bei einem Talk kein Owner eingetragen ist. */
export const DEFAULT_COORD = 'Polina';

/** Zelle einer Rohzeile, leer wenn die Spalte fehlt. */
export function cell(row: Row, header: string): string {
  return row[header] ?? '';
}

/** Zahl aus einer Zelle, 0 bei leer oder Text. */
export function num(row: Row, header: string): number {
  const n = Number(cell(row, header));
  return Number.isFinite(n) ? n : 0;
}

// --- Prädikate über einen Talk -------------------------------------------

/** Abgesagt oder pausiert. */
export const isOff = (t: Pick<TalkBase, 'status'>): boolean => /abgesagt|pausiert/i.test(t.status);

/** Gehalten: nicht off und (Status durchgeführt/veröffentlicht oder Datum vergangen). */
export const isHeld = (t: Pick<TalkBase, 'status' | 'dd'>): boolean =>
  !isOff(t) && (/^(durchgeführt|veröffentlicht)$/i.test(t.status) || (t.dd !== null && t.dd < 0));

export const onsite = (t: TalkBase): boolean => /vor ort|hybrid/.test(norm(cell(t.raw, 'Format')));
export const online = (t: TalkBase): boolean => /online|hybrid/.test(norm(cell(t.raw, 'Format')));
export const hasYT = (t: TalkBase): boolean => /youtu/i.test(cell(t.raw, 'YouTube-Link'));
/** Veröffentlichung ist erlaubt, solange sie nicht mit „nein“ beginnt. */
export const pubOk = (t: TalkBase): boolean => !/^nein/i.test(cell(t.raw, 'Veröffentlichung'));

/** Teilnehmende: TN gesamt, sonst vor Ort + online. */
export const tnOf = (t: TalkBase): number =>
  num(t.raw, 'TN gesamt') || num(t.raw, 'TN vor Ort') + num(t.raw, 'TN online');

/** Koordination: Owner aus Lectures, sonst Standard (Anzeige „Standard, nicht eingetragen“). */
export const coord = (t: TalkBase): string => cell(t.raw, 'Owner') || DEFAULT_COORD;

const statusIn = (t: TalkBase, list: string[]): boolean => list.includes(t.status.toLowerCase());

// --- Standard-Owner je Rolle ---------------------------------------------

/** Leerer String = Owner fehlt (Schnitt/Upload). Im Log je Talk und Schritt überschreibbar. */
export const ROLE: Record<RoleName, (t: TalkBase) => string> = {
  Koordination: coord,
  Marketing: () => 'Stela',
  // Online: Koordination; vor Ort: bei BPSA Eric, sonst Lokale Orga
  Raum: (t) => (!onsite(t) ? coord(t) : /BPSA/.test(cell(t.raw, 'Reihe')) ? 'Eric' : 'Lokale Orga'),
  'Lokale Orga': (t) => (/BPSA/.test(cell(t.raw, 'Reihe')) ? 'BPSA-Orga' : 'Lokale Orga'),
  HR: () => 'Lennert',
  'Schnitt/Upload': () => '',
  Website: () => 'Lennert',
};

// --- Die 19 Schritte -----------------------------------------------------

/** `offsetDays` relativ zum Talk. `sop` = erst seit der SOP Pflicht. `when` = nur wenn zutreffend. `auto` = aus dem Sheet als erledigt erkannt. */
export const STEPS: StepDef[] = [
  {
    key: 'Anfrage',
    label: 'Speaker angefragt',
    phase: 0,
    role: 'Koordination',
    offsetDays: -42,
    auto: (t) => !statusIn(t, ['', 'idee']),
  },
  {
    key: 'Zusage',
    label: 'Zusage und Termin fix',
    phase: 0,
    role: 'Koordination',
    offsetDays: -42,
    auto: (t) => !!t.date && statusIn(t, ['fix', 'durchgeführt', 'veröffentlicht']),
  },
  {
    key: 'Raum/Zoom',
    label: 'Raum bzw. Zoom organisiert',
    phase: 0,
    role: 'Raum',
    offsetDays: -28,
    sop: true,
  },
  {
    key: 'Formular',
    label: 'Speaker-Formular eingegangen',
    phase: 0,
    role: 'Koordination',
    offsetDays: -21,
    sop: true,
    auto: (t) =>
      t.speakers.some(
        (x) => !!x.form || (!!x.speaker && !!cell(x.speaker.raw, 'Formular eingegangen')),
      ),
  },
  {
    key: 'Freigaben',
    label: 'Freigaben geklärt (Stream, Aufnahme, Fotos)',
    phase: 0,
    role: 'Koordination',
    offsetDays: -21,
    auto: (t) => !!cell(t.raw, 'Veröffentlichung'),
  },
  {
    key: 'Briefing Marketing',
    label: 'Briefing an Team Marketing',
    phase: 0,
    role: 'Koordination',
    offsetDays: -21,
    sop: true,
  },
  {
    key: 'Ankündigung',
    label: 'Grafik und Ankündigung online',
    phase: 1,
    role: 'Marketing',
    offsetDays: -14,
    sop: true,
  },
  {
    key: 'Moderation',
    label: 'Moderation steht',
    phase: 1,
    role: 'Koordination',
    offsetDays: -7,
    sop: true,
    auto: (t) => !!cell(t.raw, 'Moderation'),
  },
  {
    key: 'Apero',
    label: 'Apero danach organisiert',
    phase: 1,
    role: 'Lokale Orga',
    offsetDays: -3,
    sop: true,
    when: onsite,
  },
  {
    key: 'Reminder',
    label: 'Speaker erinnert, Technik geklärt',
    phase: 1,
    role: 'Koordination',
    offsetDays: -2,
    sop: true,
  },
  {
    key: 'Geschenk',
    label: 'Speaker-Geschenk besorgt',
    phase: 1,
    role: 'Lokale Orga',
    offsetDays: -1,
    sop: true,
    when: onsite,
  },
  {
    key: 'Durchgeführt',
    label: 'Talk gehalten, Teilnehmende gezählt',
    phase: 2,
    role: 'Koordination',
    offsetDays: 1,
    auto: (t) => statusIn(t, ['durchgeführt', 'veröffentlicht']) || tnOf(t) > 0,
  },
  {
    key: 'Talk-Bericht',
    label: 'Talk-Bericht ausgefüllt',
    phase: 3,
    role: 'Koordination',
    offsetDays: 2,
    sop: true,
    auto: (t) =>
      t.reports.length > 0 || !!(cell(t.raw, 'Was gut lief') || cell(t.raw, 'Was schlecht lief')),
  },
  {
    key: 'Interessierte',
    label: 'Interessierte ins HR-Sheet',
    phase: 3,
    role: 'HR',
    offsetDays: 2,
    sop: true,
    when: (t) => t.reports.some((r) => !!col(r, 'Neue Interessierte')),
  },
  {
    key: 'Dank',
    label: 'Dank und Endorsement-Anfrage',
    phase: 3,
    role: 'Koordination',
    offsetDays: 3,
    sop: true,
    auto: (t) =>
      t.speakers.length > 0 &&
      t.speakers.every(
        (x) => !!x.speaker && /^(angefragt|ja)$/i.test(cell(x.speaker.raw, 'Endorsement')),
      ),
  },
  {
    key: 'Recap',
    label: 'Recap-Post veröffentlicht',
    phase: 3,
    role: 'Marketing',
    offsetDays: 3,
    sop: true,
  },
  {
    key: 'YouTube',
    label: 'Aufnahme geschnitten, auf YouTube',
    phase: 3,
    role: 'Schnitt/Upload',
    offsetDays: 7,
    when: pubOk,
    auto: hasYT,
  },
  {
    key: 'Website',
    label: 'Video auf psng.info',
    phase: 3,
    role: 'Website',
    offsetDays: 10,
    sop: true,
    when: pubOk,
  },
  {
    key: 'Views',
    label: 'Views nach 4 Wochen eingetragen',
    phase: 3,
    role: 'Koordination',
    offsetDays: 28,
    when: (t) => hasYT(t) || pubOk(t),
    auto: (t) => !!cell(t.raw, 'Views nach 4 Wo.'),
  },
];
