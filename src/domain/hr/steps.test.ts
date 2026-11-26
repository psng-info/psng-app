import { describe, expect, it } from 'vitest';
import { checks, progress, STEPS } from './steps';
import type { Person } from './types';

const P = (status: string, k: Record<string, string> = {}, form: Person['form'] = null) => ({
  status,
  k,
  form,
});

describe('STEPS', () => {
  it('10 Schritte, Arten box/date/note/auto', () => {
    expect(STEPS).toHaveLength(10);
    expect(STEPS.map((s) => s.kind)).toEqual([
      'box',
      'auto',
      'box',
      'date',
      'box',
      'date',
      'note',
      'box',
      'box',
      'box',
    ]);
  });
});

describe('checks', () => {
  it('Haken, Datum und Text zählen; frühere offene Schritte sind „implied“', () => {
    const c = checks(
      P('Probeaufgabe läuft', { 'Aufgabe vereinbart': 'TRUE', '1:1 am': '20.10.2026' }),
    );
    expect(c.slice(0, 6)).toEqual(['implied', 'implied', 'implied', 'done', 'done', 'open']);
  });
  it('Formular-Antwort automatisch: Antwort da oder „ja…“', () => {
    expect(checks(P('Neu eingegangen', { 'Formular ausgefüllt': 'ja (30.10.)' }))[1]).toBe('done');
    expect(checks(P('Neu eingegangen', { 'Formular ausgefüllt': 'nein' }))[1]).toBe('open');
    expect(checks(P('Neu eingegangen', {}, { _row: 1 } as never))[1]).toBe('done');
  });
  it('Core/Helper: erste 8 Schritte erledigt', () => {
    const c = checks(P('Core', { Integriert: 'TRUE' }));
    expect(c.slice(0, 8).every((v) => v === 'done')).toBe(true);
    expect(c[8]).toBe('implied');
    expect(c[9]).toBe('done');
  });
  it('Nur Formular: Schritt 2 erledigt', () => {
    expect(checks(P('Nur Formular'))[1]).toBe('done');
  });
});

describe('progress', () => {
  it('laufend: Zähler und nächster Schritt', () => {
    const g = progress(P('1:1 geführt', { 'Formular gesendet': 'TRUE', '1:1 am': '19.11.2026' }));
    expect(g.mode).toBe('run');
    expect(g.text).toBe('4/10 · Nächster Schritt: Aufgabe / Projekt vereinbart');
    expect(g.step).toBe(3);
    expect(g.next).toBe(4);
  });
  it('angehalten: Pool, Pause, Abgesagt, Abbruch mit letztem Schritt', () => {
    expect(progress(P('Pool', { '1:1 am': '23.11.2026' })).text).toBe('Im Pool nach: 1:1 geführt');
    expect(progress(P('Pause')).text).toBe('Pausiert nach: Erstkontakt');
    expect(progress(P('Abgesagt', { 'Formular gesendet': 'TRUE' })).mode).toBe('halt');
    expect(progress(P('Abbruch')).text).toBe('Abgebrochen nach: Erstkontakt');
  });
  it('fertig integriert', () => {
    const k = {
      Benachrichtigt: 'TRUE',
      Integriert: 'TRUE',
      'Letzter Check-in': '1.1.2026',
      'Review / Ergebnis': 'ok',
    };
    const g = progress(P('Core', k));
    expect(g.mode).toBe('ok');
    expect(g.text).toBe('Fertig integriert als Core');
  });
});
