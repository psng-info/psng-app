import { describe, expect, it } from 'vitest';
import { mockPlan } from './mock';
import type { AiRequest } from './plan';

const req = (p: Partial<AiRequest>): AiRequest => ({
  mode: 'fast',
  today: '26.11.2026',
  todos: [],
  people: [],
  talks: [],
  free: [],
  extra: [],
  previous: null,
  context: { todos: [], openTodos: [], people: [], talks: [], ziele: [] },
  ...p,
});

describe('mockPlan (deterministisch)', () => {
  it('hakt ab und hängt die Notiz an', () => {
    const plan = mockPlan(
      req({
        todos: [{ id: 'T1', note: 'ist erledigt' }],
        context: {
          todos: [{ ID: 'T1', Notiz: '20.11.: alt' }],
          openTodos: [],
          people: [],
          talks: [],
          ziele: [],
        },
      }),
    );
    expect(plan.todo[0]?.set).toEqual({
      Status: 'erledigt',
      Erledigt: '26.11.2026',
      Notiz: '20.11.: alt\n26.11.: ist erledigt',
    });
    expect(mockPlan(req({ todos: [{ id: 'T1', note: 'ist erledigt' }] }))).toEqual(
      mockPlan(req({ todos: [{ id: 'T1', note: 'ist erledigt' }] })),
    );
  });
  it('freie Einträge: neues To-do, per ID zugeordnet, Ergänzungen wirken', () => {
    const base = req({
      free: ['Poster drucken', 'T5 Zusage ist da'],
      context: { todos: [], openTodos: [{ ID: 'T5' }], people: [], talks: [], ziele: [] },
    });
    const plan = mockPlan(base);
    expect(plan.new).toHaveLength(1);
    expect(plan.todo[0]).toMatchObject({ id: 'T5' });
    expect(mockPlan({ ...base, extra: ['Prio A'] }).new[0]?.set).toMatchObject({
      Prio: 'A',
      Deadline: '03.12.2026',
    });
    expect(mockPlan({ ...base, extra: ['keine neuen'] }).new).toHaveLength(0);
  });
  it('Talk mit Zoom setzt den Schritt', () => {
    const plan = mockPlan(req({ talks: [{ key: 'k', note: 'Zoom steht' }] }));
    expect(plan.steps).toHaveLength(1);
    expect(plan.talk[0]?.set['Notizen']).toBe('26.11.: Zoom steht');
  });
});
