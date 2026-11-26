import { describe, expect, it } from 'vitest';
import { todosMood } from './mood';
import { TODAY, todos } from './test-helpers';

describe('todosMood', () => {
  it('leere Liste: 100, Läuft', () => {
    const m = todosMood([], TODAY);
    expect(m.score).toBe(100);
    expect(m.level.label).toBe('Läuft');
  });

  it('Abzüge: überfällig (8 je, max 40), Prio A, 7 Tage, Warten', () => {
    const t = todos([
      { Deadline: '20.11.2026', Prio: 'A' },
      { Deadline: '25.11.2026' },
      { Deadline: '28.11.2026' },
      { Status: 'wartet', Erfasst: '26.11.2026' },
    ]);
    const m = todosMood(t, TODAY);
    const f = Object.fromEntries(m.factors.map((x) => [x.text, x.value]));
    expect(f['2 überfällig']).toBe(-16);
    expect(f['1 überfällig mit Prio A']).toBe(-4);
    expect(f['1 fällig in 7 Tagen']).toBe(-2);
    expect(f['1 wartet auf andere']).toBe(-1);
    expect(m.score).toBe(100 - 16 - 4 - 2 - 1);
  });

  it('Bonus: erledigt in den letzten 7 Tagen, max 12', () => {
    const t = todos(
      Array.from({ length: 10 }, () => ({ Status: 'erledigt', Erledigt: '25.11.2026' })),
    );
    const m = todosMood(t, TODAY);
    expect(m.factors[0]?.value).toBe(12);
    expect(m.score).toBe(100);
  });

  it('Ziele hinter dem Zeitplan kosten Punkte', () => {
    const t = todos([
      { Ebene: 'Ziel', Ziel: 'X', Erfasst: '27.10.2026', Deadline: '26.12.2026' }, // Hälfte rum
      { Ebene: 'Schritt', Ziel: 'X', Status: 'offen' },
      { Ebene: 'Schritt', Ziel: 'X', Status: 'offen' },
    ]);
    const hit = todosMood(t, TODAY).factors.find((x) => x.text.startsWith('Ziele'));
    expect(hit?.value).toBeLessThan(0);
    expect(hit?.text).toContain('hinter dem Zeitplan');
  });

  it('Widerspruch HR zählt nur mit Hook', () => {
    const t = todos([{}, {}]);
    expect(todosMood(t, TODAY).factors).toEqual([]);
    const m = todosMood(t, TODAY, () => ({ label: 'HR: x' }));
    expect(m.factors).toEqual([{ text: '2 Widerspruch zu HR', value: -10 }]);
  });
});
