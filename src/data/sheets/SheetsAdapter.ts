import type { Values } from '@/domain/rows';

/**
 * Zugriff auf Google Sheets. Zwei Umsetzungen: GoogleSheetsAdapter (echte API mit Token)
 * und DemoAdapter (anonymisierte Fixtures, schreibt nur in den Speicher).
 * UI und Domain kennen nur dieses Interface.
 */
export interface SheetsAdapter {
  /** Liest mehrere Bereiche eines Sheets in einem Aufruf. Ergebnis in derselben Reihenfolge wie `ranges`. */
  batchGet(spreadsheetId: string, ranges: string[]): Promise<Values[]>;
  /** Schreibt genau eine Zelle, z. B. `Lectures!F12`. */
  updateCell(spreadsheetId: string, a1: string, value: string | boolean): Promise<void>;
  /** Hängt eine Zeile an, z. B. an `'Talk-Schritte'!A1`. */
  append(spreadsheetId: string, range: string, row: (string | boolean)[]): Promise<void>;
}

export type SheetsErrorKind =
  | 'unauthenticated' // 401: neu anmelden
  | 'forbidden' // 403: keine Freigabe im Drive
  | 'quota' // 429: Google-Limit pro Minute
  | 'not_found' // 404: Sheet oder Tab fehlt
  | 'missing_column' // Kopfzeile fehlt
  | 'row_missing' // Zielzeile beim Schreiben nicht gefunden
  | 'network'
  | 'unknown';

/** Fehler ohne Zellinhalte. `message` ist für Menschen (Deutsch) und darf angezeigt werden. */
export class SheetsError extends Error {
  constructor(
    public readonly kind: SheetsErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SheetsError';
  }
}
