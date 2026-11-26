import { describe, expect, it } from 'vitest';
import { SheetsError } from './SheetsAdapter';
import {
  a1,
  colLetter,
  columnIndex,
  parseCell,
  quoteTab,
  requireColumns,
  splitRange,
} from './table';

describe('colLetter', () => {
  it('wandelt Indizes in Buchstaben', () => {
    expect(colLetter(0)).toBe('A');
    expect(colLetter(25)).toBe('Z');
    expect(colLetter(26)).toBe('AA');
    expect(colLetter(31)).toBe('AF');
    expect(colLetter(702)).toBe('AAA');
  });
  it('lehnt negative Werte ab', () => {
    expect(() => colLetter(-1)).toThrow();
  });
});

describe('a1 und quoteTab', () => {
  it('lässt einfache Namen unquotiert', () => {
    expect(a1('Lectures', 5, 12)).toBe('Lectures!F12');
  });
  it('quotet Bindestriche, Leerzeichen, Umlaute und Apostrophe', () => {
    expect(a1('Talk-Schritte', 2, 3)).toBe("'Talk-Schritte'!C3");
    expect(quoteTab('Formularantworten 1')).toBe("'Formularantworten 1'");
    expect(quoteTab('Abbrüche')).toBe("'Abbrüche'");
    expect(quoteTab("Lena's")).toBe("'Lena''s'");
  });
});

describe('splitRange und parseCell', () => {
  it('zerlegt Bereiche', () => {
    expect(splitRange("'Talk-Schritte'!A1:G5000")).toEqual({
      tab: 'Talk-Schritte',
      cells: 'A1:G5000',
    });
    expect(splitRange('Lectures!F12')).toEqual({ tab: 'Lectures', cells: 'F12' });
    expect(splitRange("'Lena''s'!A1").tab).toBe("Lena's");
  });
  it('liest die erste Zelle', () => {
    expect(parseCell('F12')).toEqual({ col: 5, row: 12 });
    expect(parseCell('AA3:AB9')).toEqual({ col: 26, row: 3 });
    expect(parseCell('A:A')).toBeNull();
  });
});

describe('requireColumns', () => {
  const values = [[' Datum ', 'Speaker', 'Status'], ['x']];
  it('gibt die getrimmte Kopfzeile zurück', () => {
    expect(requireColumns(values, ['Datum', 'Status'], 'Lectures')).toEqual([
      'Datum',
      'Speaker',
      'Status',
    ]);
    expect(columnIndex(['A', 'B'], 'B')).toBe(1);
    expect(columnIndex(['A', 'B'], 'C')).toBe(-1);
  });
  it('wirft missing_column mit deutscher Meldung', () => {
    try {
      requireColumns(values, ['Datum', 'Titel'], 'Lectures');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SheetsError);
      expect((e as SheetsError).kind).toBe('missing_column');
      expect((e as SheetsError).message).toBe('Spalte „Titel“ fehlt im Tab Lectures.');
    }
  });
});
