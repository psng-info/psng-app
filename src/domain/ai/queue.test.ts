import { describe, expect, it } from 'vitest';
import {
  addFree,
  emptyQueue,
  parseQueue,
  queueCount,
  queueSummary,
  removeFree,
  serializeQueue,
  setNote,
} from './queue';

describe('Warteschlange', () => {
  it('zählt, fasst zusammen und entfernt bei leerem Text', () => {
    let q = setNote(emptyQueue(), 'todos', 'T1', ' erledigt ');
    q = setNote(q, 'people', 'p-a', 'x');
    q = setNote(q, 'talks', 'k', 'y');
    q = addFree(addFree(q, 'Neu eins'), '   ');
    expect(queueCount(q)).toBe(4);
    expect(queueSummary(q)).toBe('1 To-do · 1 Person · 1 Talk · 1 neu');
    expect(setNote(q, 'todos', 'T1', '').todos).toEqual({});
    expect(removeFree(q, 0).free).toEqual([]);
  });
  it('speichert nie Notizen zu Personen', () => {
    const q = setNote(setNote(emptyQueue(), 'people', 'p-anna', 'geheim'), 'todos', 'T1', 'ok');
    const raw = serializeQueue(q);
    expect(raw).not.toContain('geheim');
    expect(parseQueue(raw).todos).toEqual({ T1: 'ok' });
    expect(parseQueue(raw).people).toEqual({});
  });
  it('kaputtes JSON ergibt leere Schlange', () => {
    expect(parseQueue('{')).toEqual(emptyQueue());
    expect(parseQueue(null)).toEqual(emptyQueue());
    expect(parseQueue('[1]').free).toEqual([]);
  });
});
