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
  /**
   * Hängt eine Zeile an, z. B. an `'Talk-Schritte'!A1`.
   * Gibt die Sheet-Zeilennummer der neuen Zeile zurück, `null` wenn Google sie nicht meldet.
   */
  append(spreadsheetId: string, range: string, row: (string | boolean)[]): Promise<number | null>;
}

export type SheetsErrorKind =
  | 'unauthenticated' // 401: neu anmelden
  | 'forbidden' // 403: keine Freigabe im Drive
  | 'quota' // 429: Google-Limit pro Minute
  | 'not_found' // 404: Sheet oder Tab fehlt
  | 'missing_column' // Kopfzeile fehlt
  | 'row_missing' // Zielzeile beim Schreiben nicht gefunden (oder Schlüssel nicht eindeutig)
  | 'conflict' // jemand hat dieselbe Zelle inzwischen im Sheet geändert
  | 'invalid' // Google oder die App lehnt den Wert ab (z. B. Text zu lang)
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

/**
 * Ob sich ein zweiter Leseversuch lohnt. Nicht bei fehlender Freigabe, abgelaufener Anmeldung
 * (würde nur ein weiteres Google-Fenster versuchen) oder fehlendem Tab/Spalte: das ändert sich
 * nicht von selbst und kostet nur Abrufe vom Google-Limit (ca. 60 pro Minute).
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (!(error instanceof SheetsError)) return true;
  return error.kind === 'network' || error.kind === 'quota' || error.kind === 'unknown';
}
