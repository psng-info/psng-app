import { describe, expect, it } from 'vitest';
import { tilesFor, TILES } from './tiles';
import { TODAY, todos } from './test-helpers';
import {
  EMPTY_FILTERS,
  filterTodos,
  groupTodos,
  personOptions,
  sinceOk,
  sortTodos,
  type TodoFilters,
} from './view';

const f = (over: Partial<TodoFilters>): TodoFilters => ({ ...EMPTY_FILTERS, ...over });

describe('sortTodos', () => {
  it('offen vor erledigt, überfällig, Prio, Deadline (ohne zuletzt), ID numerisch', () => {
    const t = todos([
      { ID: 'T10', Prio: 'B' },
      { ID: 'T02', Prio: 'B' },
      { ID: 'T03', Prio: 'A', Deadline: '10.12.2026' },
      { ID: 'T04', Prio: 'A', Deadline: '01.12.2026' },
      { ID: 'T05', Prio: 'C', Deadline: '01.11.2026' },
      { ID: 'T06', Prio: 'A', Status: 'erledigt' },
    ]);
    expect([...t].sort(sortTodos).map((x) => x.id)).toEqual([
      'T05', // überfällig zuerst
      'T04',
      'T03',
      'T02',
      'T10',
      'T06',
    ]);
  });
});

describe('Kacheln', () => {
  const t = todos([
    { Deadline: '20.11.2026', Prio: 'A' }, // überfällig, A
    { Deadline: '30.11.2026', Modus: 'selbst' }, // Woche, selbst
    { Status: 'wartet' },
    { 'Wartet auf': 'Eric', Status: 'erledigt' },
    { Status: 'geparkt', Prio: 'A', Modus: 'selbst' },
  ]);
  const count = (key: string) => t.filter((x) => TILES.find((k) => k.key === key)?.test(x)).length;

  it('zählen offene bzw. abgeschlossene', () => {
    expect(TILES.map((x) => x.key)).toEqual(['late', 'week', 'a', 'self', 'wait', 'done']);
    expect(count('late')).toBe(1);
    expect(count('week')).toBe(1);
    expect(count('a')).toBe(1);
    expect(count('self')).toBe(1);
    expect(count('wait')).toBe(1);
    expect(count('done')).toBe(2);
  });

  it('Hook: mit conflict kommt „Widerspruch HR“ vor „Abgeschlossen“', () => {
    const tiles = tilesFor((x) => (x.id === 'T01' ? { label: 'HR: Anna abgesagt' } : null));
    expect(tiles.map((x) => x.key)).toEqual(['late', 'week', 'a', 'self', 'wait', 'hr', 'done']);
    expect(t.filter(tiles[5]!.test).map((x) => x.id)).toEqual(['T01']);
  });
});

describe('filterTodos', () => {
  const t = todos([
    {
      'To-do': 'Raum buchen',
      Bereich: 'Lectures',
      'Delegiert an': 'Polina',
      Erfasst: '01.11.2026',
    },
    { 'To-do': 'Üben', Bereich: 'Team', Status: 'erledigt', Erledigt: '20.11.2026' },
    { 'To-do': 'Alt', Bereich: 'Team', Erfasst: '01.10.2026' },
    { 'To-do': 'Heute', Bereich: 'Team', Geändert: '26.11.2026' },
  ]);
  const ids = (x: ReturnType<typeof filterTodos>) => x.map((y) => y.id);

  it('Erledigte standardmäßig ausgeblendet', () => {
    expect(ids(filterTodos(t, f({}), TODAY))).toEqual(['T01', 'T03', 'T04']);
    expect(ids(filterTodos(t, f({ showDone: true }), TODAY))).toHaveLength(4);
  });
  it('Suche über alle Spalten, ohne Akzente und Groß/klein', () => {
    expect(ids(filterTodos(t, f({ q: 'uben', showDone: true }), TODAY))).toEqual(['T02']);
    expect(ids(filterTodos(t, f({ q: 'polina' }), TODAY))).toEqual(['T01']);
  });
  it('Person und Bereich', () => {
    expect(ids(filterTodos(t, f({ person: 'Polina' }), TODAY))).toEqual(['T01']);
    expect(ids(filterTodos(t, f({ person: 'Koordination' }), TODAY))).toEqual(['T03', 'T04']);
    expect(ids(filterTodos(t, f({ area: 'Lectures' }), TODAY))).toEqual(['T01']);
  });
  it('Bearbeitet: heute, 7 Tage, alt; zeigt auch Erledigte', () => {
    expect(ids(filterTodos(t, f({ since: '0' }), TODAY))).toEqual(['T04']);
    expect(ids(filterTodos(t, f({ since: '7' }), TODAY))).toEqual(['T02', 'T04']);
    expect(ids(filterTodos(t, f({ since: 'old' }), TODAY))).toEqual(['T01', 'T03']);
  });
  it('Kachel Abgeschlossen zeigt Erledigte ohne Schalter', () => {
    expect(ids(filterTodos(t, f({ tile: 'done' }), TODAY))).toEqual(['T02']);
  });
  it('keepIds bleiben trotz Erledigt-Filter und Kachel sichtbar', () => {
    const kept = filterTodos(t, f({ tile: 'late' }), TODAY, { keepIds: new Set(['T02']) });
    expect(ids(kept)).toEqual(['T02']);
  });
  it('sinceOk ohne Datum: nur „alt“', () => {
    const [x] = todos([{}]);
    expect(sinceOk(x!, '7', TODAY)).toBe(false);
    expect(sinceOk(x!, 'old', TODAY)).toBe(true);
    expect(sinceOk(x!, '', TODAY)).toBe(true);
  });
});

describe('Optionen und Gruppen', () => {
  const t = todos([
    { Modus: 'selbst', Ebene: 'Schritt', Ziel: 'Onboarding', 'Delegiert an': 'Polina, Meta' },
    { Modus: 'selbst', Ebene: 'Projekt', Ziel: 'Neu', Prio: 'A' },
    { Modus: 'koordinieren', Ebene: 'Ziel', Ziel: 'Onboarding', 'Delegiert an': 'Meta' },
    { Modus: '', Status: 'erledigt' },
  ]);

  it('personOptions: nur offene, meiste zuerst', () => {
    expect(personOptions(t).map((o) => [o.value, o.count])).toEqual([
      ['Meta', 2],
      ['Koordination', 1],
      ['Polina', 1],
    ]);
  });

  it('Modus zeigt immer vier Spalten, Reste unter „Ohne Angabe“', () => {
    const b = groupTodos(t, 'Modus');
    expect(b.map((x) => x.key)).toEqual([
      'selbst',
      'koordinieren',
      'entscheiden',
      'delegieren',
      'Ohne Angabe',
    ]);
    expect(b[0]?.label).toBe('Selbst tun');
    expect(b[0]?.todos.map((x) => x.id)).toEqual(['T02', 'T01']); // Prio A zuerst
    expect(b[3]?.todos).toEqual([]);
  });
  it('Ebene und Ziel zeigen nur gefüllte Spalten, bekannte zuerst', () => {
    expect(groupTodos(t, 'Ebene').map((x) => x.key)).toEqual([
      'Schritt',
      'Projekt',
      'Ziel',
      'Ohne Angabe',
    ]);
    expect(groupTodos(t, 'Ziel').map((x) => x.key)).toEqual(['Onboarding', 'Neu', 'Ohne Angabe']);
  });
  it('Person: ein To-do erscheint bei jedem Owner, größte Gruppe zuerst', () => {
    const b = groupTodos(
      t.filter((x) => !x.isDone),
      'Person',
    );
    expect(b.map((x) => [x.key, x.todos.length])).toEqual([
      ['Meta', 2],
      ['Koordination', 1],
      ['Polina', 1],
    ]);
  });
});
