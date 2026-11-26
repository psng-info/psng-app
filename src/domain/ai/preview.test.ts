import { describe, expect, it } from 'vitest';
import { buildPreview, type Lookup } from './preview';
import { emptyPlan, type AiPlan } from './plan';

const look: Lookup = {
  todo: (id) =>
    id === 'T1'
      ? { title: 'Poster', raw: { Status: 'offen', Notiz: 'alt', Deadline: '02.12.2026' } }
      : undefined,
  person: (key) =>
    key === 'p-a'
      ? { name: 'Anna Alt', k: { 'Pipeline-Status': 'Review', Integriert: 'FALSE', Buddy: 'Meta' } }
      : undefined,
  talk: (key) => (key === 'k' ? { raw: { Status: 'angefragt', Ort: 'Aula' } } : undefined),
};

describe('buildPreview', () => {
  it('zeigt nur echte Änderungen und verwirft Unbekanntes und Ungültiges', () => {
    const plan: AiPlan = {
      ...emptyPlan(),
      todo: [
        {
          id: 'T1',
          set: { Status: 'erledigt', Notiz: 'alt', Prio: 'Z', Deadline: '2.12.2026' },
          why: 'w',
        },
        { id: 'T9', set: { Status: 'erledigt' }, why: '' },
      ],
      hr: [
        { key: 'p-a', set: { Integriert: 'TRUE', 'Pipeline-Status': 'Review' }, why: '' },
        { key: 'p-a', set: { 'Pipeline-Status': 'Quatsch' }, why: '' },
      ],
      talk: [{ key: 'k', set: { Status: 'fix', Ort: 'Aula' }, why: '' }],
      steps: [
        { key: 'k', step: 'Raum/Zoom', status: 'erledigt', owner: '', note: '', why: '' },
        { key: 'zz', step: 'Raum/Zoom', status: 'erledigt', owner: '', note: '', why: '' },
      ],
    };
    const items = buildPreview(plan, look);
    expect(items.map((i) => i.id)).toEqual(['todo:T1', 'hr:p-a', 'talk:k', 'step:k|Raum/Zoom']);
    expect(items[0]?.lines).toEqual([{ col: 'Status', old: 'offen', next: 'erledigt' }]);
    expect(items[1]?.lines).toEqual([{ col: 'Integriert', old: '○', next: '✓' }]);
    expect(items[2]?.lines).toEqual([{ col: 'Status', old: 'angefragt', next: 'fix' }]);
  });

  it('neue To-dos: Regelverstoß sperrt den Eintrag, Abwahl überlebt eine Neuberechnung', () => {
    const plan = {
      ...emptyPlan(),
      new: [
        { set: { 'To-do': 'Gut', Prio: 'B' }, why: '' },
        { set: { 'To-do': 'Dringend', Prio: 'A' }, why: '' },
      ],
    };
    const first = buildPreview(plan, look);
    expect(first[0]?.ok).toBe(true);
    expect(first[1]?.blocked).toBe('Prio A braucht eine Deadline.');
    expect(first[1]?.ok).toBe(false);
    const unticked = first.map((i) => (i.id === 'new:gut' ? { ...i, ok: false } : i));
    const again = buildPreview(plan, look, unticked);
    expect(again[0]?.ok).toBe(false);
  });
});
