import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  daysFrom,
  formatDate,
  formatShort,
  monthLabel,
  parseDate,
  relDays,
  startOfDay,
} from './dates';

const today = new Date(2026, 10, 26, 15, 30);

describe('parseDate', () => {
  it('liest T.M.JJJJ', () => {
    expect(parseDate('4.11.2026')).toEqual(new Date(2026, 10, 4));
    expect(parseDate('04.11.2026')).toEqual(new Date(2026, 10, 4));
  });
  it('macht zweistellige Jahre zu 20JJ', () => {
    expect(parseDate('4.11.26')).toEqual(new Date(2026, 10, 4));
  });
  it('liest ISO', () => {
    expect(parseDate('2026-11-04')).toEqual(new Date(2026, 10, 4));
  });
  it('ignoriert Uhrzeit dahinter', () => {
    expect(parseDate('05.11.2026 10:12:33')).toEqual(new Date(2026, 10, 5));
    expect(parseDate('2026-11-05T10:00')).toEqual(new Date(2026, 10, 5));
  });
  it('gibt null bei Unlesbarem, Leerem und unmöglichen Daten', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate('bald')).toBeNull();
    expect(parseDate('31.02.2026')).toBeNull();
    expect(parseDate('ohne Datum')).toBeNull();
  });
});

describe('Tagesrechnung', () => {
  it('daysFrom zählt ab Mitternacht, Uhrzeit von today spielt keine Rolle', () => {
    expect(daysFrom(new Date(2026, 10, 26), today)).toBe(0);
    expect(daysFrom(new Date(2026, 10, 27), today)).toBe(1);
    expect(daysFrom(new Date(2026, 10, 19), today)).toBe(-7);
    expect(daysBetween(new Date(2026, 11, 3), today)).toBe(7);
  });
  it('übersteht die Zeitumstellung', () => {
    expect(daysFrom(new Date(2026, 9, 26), new Date(2026, 9, 24))).toBe(2);
    expect(daysFrom(new Date(2027, 2, 29), new Date(2027, 2, 27))).toBe(2);
  });
  it('addDays und startOfDay', () => {
    expect(addDays(new Date(2026, 10, 26), 7)).toEqual(new Date(2026, 11, 3));
    expect(addDays(new Date(2026, 11, 30), 3)).toEqual(new Date(2027, 0, 2));
    expect(startOfDay(today)).toEqual(new Date(2026, 10, 26));
  });
});

describe('Anzeige', () => {
  it('formatDate: TT.MM.JJJJ', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('05.01.2026');
  });
  it('formatShort: Jahr nur bei anderem Jahr', () => {
    expect(formatShort(new Date(2026, 11, 3), today)).toBe('03.12.');
    expect(formatShort(new Date(2027, 0, 19), today)).toBe('19.01.27');
  });
  it('relDays', () => {
    expect(relDays(new Date(2026, 10, 26), today)).toBe('heute');
    expect(relDays(new Date(2026, 10, 27), today)).toBe('morgen');
    expect(relDays(new Date(2026, 10, 30), today)).toBe('in 4 Tagen');
    expect(relDays(new Date(2026, 10, 25), today)).toBe('gestern');
    expect(relDays(new Date(2026, 10, 16), today)).toBe('vor 10 Tagen');
  });
  it('monthLabel', () => {
    expect(monthLabel(new Date(2027, 2, 1))).toBe('März 2027');
  });
});
