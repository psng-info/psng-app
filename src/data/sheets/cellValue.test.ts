import { describe, expect, it } from 'vitest';
import { safeCell, safeRow } from './cellValue';

describe('safeCell', () => {
  it('setzt ein Hochkomma vor mögliche Formeln', () => {
    for (const s of ['=SUMME(A1)', '+49 170', '-5', '@home']) expect(safeCell(s)).toBe(`'${s}`);
  });
  it('lässt normalen Text, Leerstrings und Wahrheitswerte unverändert', () => {
    expect(safeCell('Normal')).toBe('Normal');
    expect(safeCell('')).toBe('');
    expect(safeCell('26.11.2026')).toBe('26.11.2026');
    expect(safeCell('a=b')).toBe('a=b');
    expect(safeCell(true)).toBe(true);
    expect(safeCell(false)).toBe(false);
  });
  it('sichert nur den Anfang, nicht mehrfach', () => {
    expect(safeCell("'=x")).toBe("'=x");
  });
  it('safeRow wirkt auf jede Zelle', () => {
    expect(safeRow(['ok', '=x', true])).toEqual(['ok', "'=x", true]);
  });
});
