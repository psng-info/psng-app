import { describe, expect, it } from 'vitest';
import hr from '../../../tests/fixtures/hr.json';
import talks from '../../../tests/fixtures/talks.json';
import todos from '../../../tests/fixtures/todos.json';
import { buildPeople } from '@/domain/hr';
import { buildTalksModel } from '@/domain/talks/model';
import { parseTodos } from '@/domain/todos';
import { emptyQueue, setNote } from './queue';
import { buildRequest } from './request';
import { sanitizeRequest } from './plan';

const today = new Date(2026, 10, 26);

describe('buildRequest aus Demo-Fixtures', () => {
  const data = {
    todos: parseTodos(todos.todos, today),
    people: buildPeople(hr, today),
    talks: buildTalksModel(talks, today).talks,
  };
  const person = data.people.find((p) => p.editable);
  const talk = data.talks[0];

  it('Personen: nur Schlüssel, Vorname und Pipeline-Felder, keine Kontaktdaten', () => {
    expect(person && talk).toBeTruthy();
    let q = setNote(emptyQueue(), 'people', person?.key ?? '', 'Hat sich gemeldet');
    q = setNote(q, 'todos', data.todos[0]?.id ?? '', 'läuft');
    q = setNote(q, 'talks', talk?.key ?? '', 'Zoom steht');
    const req = buildRequest(q, data, { mode: 'fast', today });
    const keys = new Set(req.context.people.flatMap((r) => Object.keys(r)));
    for (const bad of ['Nachname', 'E-Mail', 'Handynummer', 'Telefon', 'Link']) {
      expect(keys.has(bad)).toBe(false);
    }
    expect(req.context.people[0]?.['Vorname']).toBeTruthy();
    expect(req.context.talks[0]?.['Schritte']).toContain(':');
    expect(req.today).toBe('26.11.2026');
    // Der Server filtert noch einmal und ändert dabei nichts Wesentliches.
    const again = sanitizeRequest(JSON.parse(JSON.stringify(req)));
    expect(again.people).toEqual(req.people);
    expect(JSON.stringify(req)).not.toMatch(/@/);
  });

  it('ignoriert vorgemerkte IDs, die es nicht mehr gibt', () => {
    const q = setNote(emptyQueue(), 'todos', 'T9999', 'x');
    expect(buildRequest(q, data, { mode: 'fast', today }).todos).toEqual([]);
  });
});
