import type { Values } from '@/domain/rows';
import { buildTalksModel, type TalksInput } from './model';
import type { Talk, TalksModel } from './types';

/** Heute für alle Domain-Tests: 26.11.2026 (Donnerstag). */
export const TODAY = new Date(2026, 10, 26);

/** Baut Rohwerte: Kopfzeile plus Zeilen als Objekte, fehlende Spalten bleiben leer. */
export function table(headers: string[], rows: Record<string, string>[]): Values {
  return [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))];
}

export const LECTURE_HEADERS = [
  'Datum',
  'Titel',
  'Speaker',
  'Reihe',
  'Format',
  'Ort',
  'Status',
  'Owner',
  'Moderation',
  'TN vor Ort',
  'TN online',
  'TN gesamt',
  'Veröffentlichung',
  'YouTube-Link',
  'Views nach 4 Wo.',
  'Was gut lief',
  'Was schlecht lief',
  'Abstract',
];
export const SPEAKER_HEADERS = [
  'Name',
  'Status',
  'E-Mail',
  'Endorsement',
  'Formular eingegangen',
  'Thema',
];
export const STEP_HEADERS = ['Zeitpunkt', 'Talk', 'Schritt', 'Status', 'Owner', 'Von', 'Notiz'];
export const REPORT_HEADERS = [
  'Zeitstempel',
  'Lecture',
  'Falls nicht in der Liste: Datum',
  'Falls nicht in der Liste: Speaker und Titel',
  'Neue Interessierte fürs Mitmachen (Name + Kontakt)',
];
export const FORM_HEADERS = ['Zeitstempel', 'Vollständiger Name / Full name', 'E-Mail'];

type Cells = Record<string, string>;

export interface Rows {
  lectures?: Cells[];
  speakers?: Cells[];
  steps?: Cells[];
  reports?: Cells[];
  speakerForm?: Cells[];
}

export function inputOf(rows: Rows): TalksInput {
  return {
    lectures: table(LECTURE_HEADERS, rows.lectures ?? []),
    speakers: table(SPEAKER_HEADERS, rows.speakers ?? []),
    steps: table(STEP_HEADERS, rows.steps ?? []),
    reports: table(REPORT_HEADERS, rows.reports ?? []),
    speakerForm: table(FORM_HEADERS, rows.speakerForm ?? []),
  };
}

export function modelOf(rows: Rows, today: Date = TODAY): TalksModel {
  return buildTalksModel(inputOf(rows), today);
}

/** Modell mit genau einem Talk (und optional Speaker/Log) und gibt diesen zurück. */
export function oneTalk(lecture: Cells, rest: Omit<Rows, 'lectures'> = {}): Talk {
  const talk = modelOf({ ...rest, lectures: [lecture] }).talks[0];
  if (!talk) throw new Error('kein Talk im Testmodell');
  return talk;
}

export function stepOf(t: Talk, key: string) {
  const s = t.steps.find((x) => x.def.key === key);
  if (!s) throw new Error(`Schritt ${key} fehlt`);
  return s;
}

export const flagOf = (t: Talk, tag: string) => t.flags.find((f) => f.tag === tag);
