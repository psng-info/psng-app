import type { Row } from '@/domain/rows';

/** Erlaubte Werte laut Spezifikation. Das Sheet darf davon abweichen, die App liest dann den Rohtext. */
export const STATUSES = ['offen', 'läuft', 'wartet', 'geparkt', 'erledigt', 'verworfen'] as const;
export const LEVELS = ['Schritt', 'Projekt', 'Ziel'] as const;
export const MODES = ['selbst', 'koordinieren', 'entscheiden', 'delegieren'] as const;
export const PRIOS = ['A', 'B', 'C'] as const;

export interface Todo {
  id: string;
  title: string;
  /** Status aus dem Sheet, leer = „offen“. */
  status: string;
  level: string;
  mode: string;
  goal: string;
  area: string;
  prio: string;
  /** Deadline als lokale Mitternacht, null ohne gültiges Datum. */
  deadline: Date | null;
  /** Tage bis zur Deadline (negativ = drüber), null ohne Deadline. */
  dd: number | null;
  waitingFor: string;
  delegatedTo: string;
  nextStep: string;
  source: string;
  link: string;
  /** Datumsfelder im Sheet-Format (Text). */
  created: string;
  doneOn: string;
  note: string;
  changed: string;
  /** erledigt, verworfen oder geparkt: zählt nicht als offen. */
  isDone: boolean;
  /** offen und Deadline vorbei. */
  late: boolean;
  /** offen und Deadline in 0 bis 7 Tagen. */
  week: boolean;
  /** offen und (Status wartet oder „Wartet auf“ gesetzt). */
  waiting: boolean;
  /** Letzte Berührung: spätestes von Geändert, Erledigt, Erfasst. */
  touched: Date | null;
  /** „Delegiert an“, sonst „Wartet auf“, sonst „Koordination“. */
  owners: string[];
  /** Zeilennummer im Sheet (Kopfzeile = 1). */
  row: number;
  /** Rohzeile, Zugriff über Kopfzeilen-Namen. */
  raw: Row;
}

/** Ergebnis der HR-Prüfung für ein To-do (kommt mit dem HR-Feature). */
export interface ConflictInfo {
  /** Kurztext für die Pille, z. B. „HR: Anna abgesagt“. */
  label: string;
  /** Erklärung für den Tooltip. */
  reason?: string;
}

/** Haken für das HR-Feature: liefert einen Widerspruch oder null. Nur für offene To-dos aufgerufen. */
export type ConflictFn = (todo: Todo) => ConflictInfo | null;
