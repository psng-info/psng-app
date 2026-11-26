import { describe, expect, it } from 'vitest';
import { ownersOf, parseTodos, splitPeople } from './parse';
import { TODAY, todoValues, todos } from './test-helpers';

describe('splitPeople / ownersOf', () => {
  it('trennt an Komma und „und“, entfernt Klammern und Dubletten', () => {
    expect(splitPeople('Meta (extern), Ivana und Polina')).toEqual(['Meta', 'Ivana', 'Polina']);
    expect(ownersOf('Meta, Meta', 'Stela')).toEqual(['Meta']);
  });
  it('Owner: Delegiert an, sonst Wartet auf, sonst Koordination', () => {
    expect(ownersOf('Polina', 'Stela')).toEqual(['Polina']);
    expect(ownersOf('', 'Stela')).toEqual(['Stela']);
    expect(ownersOf('', '')).toEqual(['Koordination']);
  });
});

describe('parseTodos', () => {
  it('lässt Zeilen ohne ID und Text weg, Status leer = offen', () => {
    const t = parseTodos(todoValues([{ ID: 'T01', 'To-do': 'a' }, { Notiz: 'nur Notiz' }]), TODAY);
    expect(t).toHaveLength(1);
    expect(t[0]?.status).toBe('offen');
    expect(t[0]?.row).toBe(2);
  });

  it('isDone: erledigt, verworfen, geparkt', () => {
    const t = todos([
      { Status: 'erledigt' },
      { Status: 'verworfen' },
      { Status: 'geparkt' },
      { Status: 'läuft' },
    ]);
    expect(t.map((x) => x.isDone)).toEqual([true, true, true, false]);
  });

  it('late: offen und Deadline vorbei, week: heute bis 7 Tage', () => {
    const t = todos([
      { Deadline: '25.11.2026' },
      { Deadline: '26.11.2026' },
      { Deadline: '03.12.2026' },
      { Deadline: '04.12.2026' },
      { Deadline: '01.01.2026', Status: 'erledigt' },
      {},
    ]);
    expect(t.map((x) => [x.late, x.week])).toEqual([
      [true, false],
      [false, true],
      [false, true],
      [false, false],
      [false, false],
      [false, false],
    ]);
    expect(t[0]?.dd).toBe(-1);
    expect(t[5]?.dd).toBeNull();
  });

  it('waiting: Status wartet oder Wartet auf gesetzt, nur wenn offen', () => {
    const t = todos([
      { Status: 'wartet' },
      { 'Wartet auf': 'Eric' },
      { Status: 'erledigt', 'Wartet auf': 'Eric' },
      {},
    ]);
    expect(t.map((x) => x.waiting)).toEqual([true, true, false, false]);
  });

  it('touched: spätestes von Geändert, Erledigt, Erfasst', () => {
    const t = todos([
      { Erfasst: '01.11.2026', Erledigt: '20.11.2026', Geändert: '10.11.2026' },
      { Erfasst: '01.11.2026' },
      {},
    ]);
    expect(t[0]?.touched).toEqual(new Date(2026, 10, 20));
    expect(t[1]?.touched).toEqual(new Date(2026, 10, 1));
    expect(t[2]?.touched).toBeNull();
  });
});
