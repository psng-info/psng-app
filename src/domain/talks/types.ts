import type { Row } from '@/domain/rows';

/** Phasen des Ablaufs: 0 Planung, 1 Vorbereitung, 2 Am Tag, 3 Nachbereitung. */
export type Phase = 0 | 1 | 2 | 3;
export const PHASES = ['Planung', 'Vorbereitung', 'Am Tag', 'Nachbereitung'] as const;

export type RoleName =
  'Koordination' | 'Marketing' | 'Raum' | 'Lokale Orga' | 'HR' | 'Schnitt/Upload' | 'Website';

/** done = erledigt, implied = vor dem Talk, nicht einzeln erfasst, unk = nicht erfasst (vor der SOP), open = offen, na = nicht nötig. */
export type StepStatus = 'done' | 'implied' | 'unk' | 'open' | 'na';

/** Alles, was ein Schritt über den Talk wissen darf (ohne berechnete Schritte und Flags). */
export interface TalkBase {
  key: string;
  row: number;
  date: Date | null;
  /** Tage bis zum Talk (negativ = vergangen), null ohne Datum. */
  dd: number | null;
  status: string;
  title: string;
  names: string[];
  speakers: TalkSpeaker[];
  reports: Row[];
  log: StepLogEntry[];
  /** Rohzeile aus Lectures, Zugriff nur über Kopfzeilen-Namen. */
  raw: Row;
}

export interface StepDef {
  key: string;
  label: string;
  phase: Phase;
  role: RoleName;
  offsetDays: number;
  sop?: boolean;
  when?: (t: TalkBase) => boolean;
  auto?: (t: TalkBase) => boolean;
}

export interface StepState {
  def: StepDef;
  status: StepStatus;
  isAuto: boolean;
  owner: string;
  /** true, wenn der Owner aus dem Log kommt, false = Standard aus der Rolle. */
  ownerFromLog: boolean;
  due: Date | null;
  late: boolean;
  soon: boolean;
  lastStatus?: StepLogEntry;
  lastNote?: StepLogEntry;
}

export type FlagLevel = 'crit' | 'warn';

export interface Flag {
  level: FlagLevel;
  tag: string;
  why: string;
  fix?: { set: Record<string, string>; label: string };
}

export interface Speaker {
  name: string;
  row: number;
  raw: Row;
}

export interface TalkSpeaker {
  name: string;
  speaker: Speaker | null;
  form: Row | null;
}

export interface StepLogEntry {
  row: number;
  date: Date | null;
  talk: string;
  step: string;
  status: string;
  owner: string;
  by: string;
  note: string;
}

export interface Talk extends TalkBase {
  steps: StepState[];
  flags: Flag[];
}

export interface TalksModel {
  talks: Talk[];
  speakers: Speaker[];
  next: Talk | null;
  /** Monatsanfänge der nächsten 4 Monate ohne Talk. */
  gaps: Date[];
}

export interface ActionItem {
  talk: Talk | null;
  label: string;
  flags: Flag[];
  /** 0 = crit, 1 = warn */
  rank: 0 | 1;
}
