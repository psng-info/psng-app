import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/todos.json';
import { goalPeriod, goalsOf } from './goals';
import { todosMood } from './mood';
import { parseTodos } from './parse';
import { TODAY } from './test-helpers';
import { TILES } from './tiles';
import { EMPTY_FILTERS, filterTodos, groupTodos } from './view';
import { nextTodoId } from './write';

const t = parseTodos(fixture.todos, TODAY);

describe('Fixture todos.json (heute 26.11.2026)', () => {
  it('liest alle 43 To-dos', () => {
    expect(t).toHaveLength(43);
  });

  it('Kacheln', () => {
    const n = Object.fromEntries(TILES.map((x) => [x.key, t.filter(x.test).length]));
    expect(n).toEqual({ late: 2, week: 5, a: 13, self: 7, wait: 7, done: 19 });
  });

  it('überfällig und bald fällig', () => {
    expect(t.filter((x) => x.late).map((x) => x.id)).toEqual(['T104', 'T105']);
    expect(t.filter((x) => x.week).map((x) => x.id)).toEqual([
      'T61',
      'T112',
      'T115',
      'T116',
      'T117',
    ]);
  });

  it('Ziele und Zeitraum', () => {
    const goals = goalsOf(t, TODAY);
    expect(goals.map((g) => [g.name, g.done, g.total, g.pct])).toEqual([
      ['e.V.', 0, 1, 0],
      ['Onboarding', 5, 12, 42],
      ['Lecture-Pipeline', 3, 6, 50],
    ]);
    expect(goalPeriod(t, TODAY)).toMatchObject({ daysLeft: 35 });
  });

  it('Modus-Spalten ohne Erledigte', () => {
    const shown = filterTodos(t, EMPTY_FILTERS, TODAY);
    expect(shown).toHaveLength(24);
    const b = groupTodos(shown, 'Modus');
    expect(b.map((x) => [x.key, x.todos.length])).toEqual([
      ['selbst', 7],
      ['koordinieren', 8],
      ['entscheiden', 3],
      ['delegieren', 6],
    ]);
    // überfällig zuerst
    expect(b[0]?.todos.slice(0, 2).map((x) => x.id)).toEqual(['T104', 'T105']);
  });

  it('Mood und nächste ID', () => {
    expect(todosMood(t, TODAY).score).toBe(62);
    expect(nextTodoId(fixture.todos)).toBe('T118');
  });
});
