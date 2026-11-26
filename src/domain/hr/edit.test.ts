import { describe, expect, it } from 'vitest';
import { cellText, checkEdit, HR_EDIT, PIPELINE_STATUS } from './edit';

describe('checkEdit', () => {
  it('erlaubt nur HR_EDIT-Spalten', () => {
    expect(HR_EDIT).toHaveLength(16);
    expect(() => checkEdit({ 'E-Mail': 'x' })).toThrow();
    expect(() => checkEdit({ Vorname: 'x' })).toThrow();
  });
  it('Booleans nur als Boolean', () => {
    expect(checkEdit({ Integriert: true })).toEqual({ Integriert: true });
    expect(() => checkEdit({ Integriert: 'TRUE' })).toThrow();
    expect(cellText(true)).toBe('TRUE');
    expect(cellText(false)).toBe('FALSE');
  });
  it('Pipeline-Status nur aus der Liste', () => {
    for (const s of PIPELINE_STATUS) expect(checkEdit({ 'Pipeline-Status': s })).toBeTruthy();
    expect(PIPELINE_STATUS).not.toContain('Abbruch');
    expect(PIPELINE_STATUS).not.toContain('Pool');
    expect(() => checkEdit({ 'Pipeline-Status': 'Abbruch' })).toThrow();
  });
  it('Datum wird als TT.MM.JJJJ normalisiert, leer löscht, Unsinn wirft', () => {
    expect(checkEdit({ '1:1 am': '5.11.26' })).toEqual({ '1:1 am': '05.11.2026' });
    expect(checkEdit({ '1:1 am': '' })).toEqual({ '1:1 am': '' });
    expect(() => checkEdit({ Deadline: 'bald' })).toThrow();
  });
});
