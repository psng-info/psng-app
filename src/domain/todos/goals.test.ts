import { describe, expect, it } from 'vitest';
import { goalPeriod, goalRows, goalsOf } from './goals';
import { todos } from './test-helpers';

const base = { Ebene: 'Ziel', Ziel: 'Onboarding' };

describe('goalRows', () => {
  it('nur Ebene Ziel mit Ziel-Name, nicht verworfen, geparkt oder „Außerhalb“', () => {
    const t = todos([
      base,
      { ...base, Status: 'verworfen' },
      { ...base, Status: 'geparkt' },
      { Ebene: 'Ziel', Ziel: 'Außerhalb Q4' },
      { Ebene: 'Projekt', Ziel: 'Onboarding' },
      { Ebene: 'Ziel', Ziel: '' },
    ]);
    expect(goalRows(t, new Date(2026, 10, 26)).map((x) => x.id)).toEqual(['T01']);
  });

  it('erledigte Ziele bis 45 Tage nach der Deadline', () => {
    const today = new Date(2026, 10, 26);
    const t = todos([
      { ...base, Status: 'erledigt', Deadline: '12.10.2026' }, // 45 Tage her: noch da
      { ...base, Ziel: 'B', Status: 'erledigt', Deadline: '11.10.2026' }, // 46 Tage: weg
      { ...base, Ziel: 'C', Status: 'erledigt' }, // ohne Deadline: bleibt
    ]);
    expect(goalRows(t, today).map((x) => x.id)).toEqual(['T01', 'T03']);
  });
});

describe('goalsOf / goalPeriod', () => {
  const today = new Date(2026, 10, 26);
  const t = todos([
    {
      ...base,
      'To-do': 'Onboarding aufbauen',
      'Delegiert an': 'Matilda',
      Deadline: '31.12.2026',
      Erfasst: '22.10.2026',
      'Nächster Schritt': 'Leitfaden',
    },
    { Ziel: 'Onboarding', Ebene: 'Schritt', Status: 'erledigt' },
    { Ziel: 'Onboarding', Ebene: 'Schritt', Status: 'läuft', Deadline: '01.11.2026' },
    { Ziel: 'Onboarding', Ebene: 'Projekt', Status: 'offen' },
    { Ziel: 'Onboarding', Ebene: 'Schritt', Status: 'geparkt' },
    { Ziel: 'Onboarding', Ebene: 'Schritt', Status: 'verworfen' },
  ]);

  it('Fortschritt zählt Unterpunkte ohne die Ziel-Zeile, ohne geparkt und verworfen', () => {
    const [g] = goalsOf(t, today);
    expect(g).toMatchObject({
      name: 'Onboarding',
      title: 'Onboarding aufbauen',
      total: 3,
      done: 1,
      open: 2,
      late: 1,
      pct: 33,
      owner: 'Matilda',
      nextStep: 'Leitfaden',
    });
  });

  it('Zeitraum: frühestes Erfasst bis späteste Deadline, Tage übrig', () => {
    expect(goalPeriod(t, today)).toEqual({
      start: new Date(2026, 9, 22),
      end: new Date(2026, 11, 31),
      daysLeft: 35,
    });
    expect(goalPeriod([], today)).toEqual({ start: null, end: null, daysLeft: null });
  });

  it('ohne Unterpunkte: 0 Prozent', () => {
    expect(goalsOf(todos([base]), today)[0]?.pct).toBe(0);
  });
});
