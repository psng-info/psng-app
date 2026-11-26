import type { QueryClient } from '@tanstack/react-query';
import { safeCell } from './cellValue';
import { SheetsError, type SheetsAdapter } from './SheetsAdapter';

/** Google Sheets nimmt höchstens 50.000 Zeichen pro Zelle an. */
export const MAX_CELL_CHARS = 50_000;

/** Wirft `invalid`, wenn ein Text nicht in eine Zelle passt. Prüfen, bevor irgendetwas geschrieben wird. */
export function checkCellLength(values: (string | boolean)[]): void {
  if (values.some((v) => typeof v === 'string' && v.length > MAX_CELL_CHARS)) {
    throw new SheetsError(
      'invalid',
      'Text zu lang: Google Sheets erlaubt höchstens 50.000 Zeichen pro Zelle.',
    );
  }
}

export interface CellWrite {
  /** Zelle als A1, z. B. `'To-dos'!C12` (siehe `a1()` in table.ts). */
  a1: string;
  value: string | boolean;
}

/**
 * Schreibt Zellen nacheinander, jede einzeln per `values.update` (CLAUDE.md: nur Einzelzellen).
 * Jeder Wert geht durch `safeCell` (Schutz vor Formeln). Scheitert eine Zelle, nachdem schon andere
 * geschrieben sind, sagt die Meldung das dazu: dann steht im Sheet ein halber Stand, den man prüfen muss.
 */
export async function writeCells(
  sheets: SheetsAdapter,
  spreadsheetId: string,
  cells: CellWrite[],
): Promise<void> {
  checkCellLength(cells.map((c) => c.value));
  let done = 0;
  for (const c of cells) {
    try {
      await sheets.updateCell(spreadsheetId, c.a1, safeCell(c.value));
    } catch (e) {
      if (done === 0) throw e;
      const err = e instanceof SheetsError ? e : new SheetsError('unknown', 'Unbekannter Fehler.');
      throw new SheetsError(
        err.kind,
        `Nur teilweise gespeichert (${done} von ${cells.length} Feldern). Bitte neu laden und prüfen. ${err.message}`,
        err.status,
      );
    }
    done++;
  }
}

/**
 * Nach einer Schreibaktion neu lesen, aber erst, wenn keine weitere Schreibaktion mit diesem
 * Schlüssel mehr läuft. Sonst würde das Neuladen die optimistische Anzeige der anderen überschreiben.
 * In `onSettled` zählt die eigene Aktion noch mit, daher `<= 1`.
 */
export function invalidateWhenIdle(
  qc: QueryClient,
  mutationKey: readonly unknown[],
  queryKey: readonly unknown[],
): void {
  if (qc.isMutating({ mutationKey: [...mutationKey] }) <= 1) {
    void qc.invalidateQueries({ queryKey: [...queryKey] });
  }
}
