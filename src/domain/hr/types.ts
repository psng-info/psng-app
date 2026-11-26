import type { Mood } from '@/domain/mood';

/** Eine Sheet-Zeile (Kopfname → Text). Kandidaten-Zeilen tragen `_row`. */
export type Rec = Record<string, string>;

/** Rohwerte der vier HR-Tabs. */
export interface HrRaw {
  kandidaten: string[][];
  abbrueche: string[][];
  formular: string[][];
  notizen: string[][];
}

export type FlagLevel = 'crit' | 'warn' | 'new';

export interface Flag {
  lvl: FlagLevel;
  tag: string;
  why: string;
}

export type PersonSource = 'kandidat' | 'abbruch' | 'formular';

export interface Person {
  /** Eindeutig je Quelle: `p-` Kandidaten, `a-` Abbrüche, `f-` nur Formular. */
  key: string;
  name: string;
  source: PersonSource;
  /** Rohe Zeile. Enthält Kontaktdaten: nur über `contactOf` und nur nach Klick anzeigen. */
  k: Rec;
  /** Zeile im Tab Kandidaten (nur dort beschreibbar), sonst null. */
  row: number | null;
  /** Pipeline-Status aus dem Sheet („Abbruch“ für Abbrüche, „Nur Formular“ ohne Zeile). */
  status: string;
  /** Anzeige-Stufe: „Neu eingegangen“ wird zu „Formular fehlt“ oder „Bereit für 1:1“. */
  stage: string;
  buddy: string;
  last: Date | null;
  dl: Date | null;
  wv: Date | null;
  note: Rec | null;
  flags: Flag[];
  active: boolean;
  closed: boolean;
  form: Rec | null;
  formOnly: boolean;
  editable: boolean;
}

export type StepState = 'done' | 'implied' | 'open';
export type ProgressMode = 'run' | 'halt' | 'ok';

export interface Progress {
  /** Index des letzten erledigten Schritts, -1 ohne. */
  step: number;
  mode: ProgressMode;
  checks: StepState[];
  /** Index des nächsten offenen Schritts, -1 wenn keiner. */
  next: number;
  text: string;
}

export interface FlagGroup {
  person: Person;
  flags: Flag[];
  rank: 0 | 1 | 2;
}

export interface HrConflict {
  first: string;
  status: string;
  grund: string;
}

export type HrMood = Mood;
