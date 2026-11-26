import { describe, expect, it } from 'vitest';
import { parseTodos } from './parse';
import { TODAY, TODO_HEADER, todoValues } from './test-helpers';
import {
  appendNote,
  completePatch,
  findTodoRow,
  newTodoRow,
  nextTodoId,
  validateNewTodo,
  withAppendedRow,
  withCells,
} from './write';

describe('nextTodoId', () => {
  it('höchste T<n> plus 1, zweistellig gepolstert', () => {
    expect(nextTodoId(todoValues([{ ID: 'T02' }, { ID: 'T09' }, { ID: 'T07' }]))).toBe('T10');
    expect(nextTodoId(todoValues([{ ID: 'T117' }, { ID: 'T20' }]))).toBe('T118');
    expect(nextTodoId(todoValues([{ ID: 'T01' }]))).toBe('T02');
  });
  it('leere Tabelle: T01; fremde IDs werden ignoriert', () => {
    expect(nextTodoId(todoValues([]))).toBe('T01');
    expect(nextTodoId(todoValues([{ ID: 'X5' }, { ID: '' }]))).toBe('T01');
  });
  it('findet die Spalte ID über die Kopfzeile', () => {
    expect(
      nextTodoId([
        ['To-do', 'ID'],
        ['a', 'T4'],
      ]),
    ).toBe('T05');
  });
});

describe('newTodoRow', () => {
  it('Kopfzeilen-Reihenfolge, Erfasst/Geändert heute, Quelle App, Deadline als TT.MM.JJJJ', () => {
    const row = newTodoRow(
      TODO_HEADER,
      {
        ID: 'T118',
        'To-do': 'Foto holen',
        Status: 'offen',
        Prio: 'A',
        Deadline: '2026-12-03',
        'Delegiert an': 'Meta',
      },
      TODAY,
    );
    const by = Object.fromEntries(TODO_HEADER.map((h, i) => [h, row[i]]));
    expect(row).toHaveLength(TODO_HEADER.length);
    expect(by).toMatchObject({
      ID: 'T118',
      'To-do': 'Foto holen',
      Status: 'offen',
      Prio: 'A',
      Deadline: '03.12.2026',
      'Delegiert an': 'Meta',
      Erfasst: '26.11.2026',
      Geändert: '26.11.2026',
      Quelle: 'App 26.11.2026',
      Erledigt: '',
      Link: '',
      Ziel: '',
    });
  });
  it('Status leer wird offen, unbekannte Spalten bleiben leer', () => {
    const row = newTodoRow(
      ['ID', 'To-do', 'Status', 'Sonst'],
      { ID: 'T01', 'To-do': '=1+1' },
      TODAY,
    );
    expect(row).toEqual(['T01', '=1+1', 'offen', '']);
  });
});

describe('validateNewTodo', () => {
  const ok = { 'To-do': 'x', Status: 'offen', Modus: 'selbst', Prio: 'B' };
  it('gültig = leer', () => expect(validateNewTodo(ok)).toEqual({}));
  it('Text Pflicht', () =>
    expect(validateNewTodo({ ...ok, 'To-do': '  ' })).toHaveProperty('To-do'));
  it('Prio A braucht Deadline', () => {
    expect(validateNewTodo({ ...ok, Prio: 'A' })).toHaveProperty('Deadline');
    expect(validateNewTodo({ ...ok, Prio: 'A', Deadline: '2026-12-01' })).toEqual({});
  });
  it('delegieren braucht Delegiert an', () => {
    expect(validateNewTodo({ ...ok, Modus: 'delegieren' })).toHaveProperty('Delegiert an');
    expect(validateNewTodo({ ...ok, Modus: 'delegieren', 'Delegiert an': 'Meta' })).toEqual({});
  });
  it('wartet braucht Wartet auf', () => {
    expect(validateNewTodo({ ...ok, Status: 'wartet' })).toHaveProperty('Wartet auf');
  });
  it('unlesbares Datum', () => {
    expect(validateNewTodo({ ...ok, Deadline: 'bald' })).toHaveProperty('Deadline');
  });
});

describe('Schreib-Helfer', () => {
  it('completePatch: erledigt, Erledigt und Geändert heute', () => {
    expect(completePatch(TODAY)).toEqual({
      Status: 'erledigt',
      Erledigt: '26.11.2026',
      Geändert: '26.11.2026',
    });
  });
  it('appendNote hängt „TT.MM.: Text“ an, bestehender Text bleibt', () => {
    expect(appendNote('', ' Neu ', TODAY)).toBe('26.11.: Neu');
    expect(appendNote('Alt', 'Neu', TODAY)).toBe('Alt\n26.11.: Neu');
  });
  it('withCells ändert nur die Zielzeile, Original bleibt', () => {
    const v = todoValues([{ ID: 'T01' }, { ID: 'T02' }]);
    const next = withCells(v, 'T02', { Status: 'erledigt', Unbekannt: 'x' });
    expect(parseTodos(next, TODAY).map((t) => t.status)).toEqual(['offen', 'erledigt']);
    expect(parseTodos(v, TODAY)[1]?.status).toBe('offen');
    expect(withCells(v, 'T99', { Status: 'x' })).toBe(v);
  });
  it('findTodoRow, withAppendedRow', () => {
    const v = todoValues([{ ID: 'T01' }, { ID: 'T02' }]);
    expect(findTodoRow(v, 'T02')).toBe(2);
    expect(findTodoRow(v, 'T03')).toBe(-1);
    expect(withAppendedRow(v, ['T03'])).toHaveLength(4);
    expect(v).toHaveLength(3);
  });
});
