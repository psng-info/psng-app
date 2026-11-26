import { describe, expect, it } from 'vitest';
import { HR_BOOL, HR_EDIT } from '@/domain/hr/edit';
import { STEPS } from '@/domain/talks/steps';
import { LECTURE_EDITABLE } from '@/domain/talks/write';
import { STEP_LOG_STATUS } from '@/domain/talks/write';
import { newTodoRow } from '@/domain/todos';
import {
  AI_MODELS,
  HR_BOOL_COLS,
  HR_SET_COLS,
  NEW_TODO_COLS,
  PLAN_SCHEMA,
  STEP_KEYS,
  STEP_STATUS,
  TALK_SET_COLS,
  buildUserPrompt,
  parsePlan,
  redactContact,
  sanitizeRequest,
} from './plan';

describe('Whitelists bleiben gleich zur App', () => {
  it('HR-Spalten', () => {
    expect([...HR_SET_COLS]).toEqual([...HR_EDIT]);
    expect([...HR_BOOL_COLS].sort()).toEqual([...HR_BOOL].sort());
  });
  it('Talk-Spalten und Schritte', () => {
    expect([...TALK_SET_COLS]).toEqual([...LECTURE_EDITABLE]);
    expect([...STEP_KEYS]).toEqual(STEPS.map((s) => s.key));
    expect([...STEP_STATUS]).toEqual([...STEP_LOG_STATUS]);
  });
  it('neue To-dos: jede Spalte wird von newTodoRow übernommen', () => {
    const row = newTodoRow(
      [...NEW_TODO_COLS],
      { ID: 'T01', ...Object.fromEntries(NEW_TODO_COLS.map((c) => [c, 'x'])) },
      new Date(2026, 10, 26),
    );
    expect(row).toHaveLength(NEW_TODO_COLS.length);
  });
  it('Modelle: Haiku Standard, Sonnet gründlich', () => {
    expect(AI_MODELS).toEqual({ fast: 'claude-haiku-5-5', thorough: 'claude-sonnet-5-5' });
  });
});

describe('redactContact', () => {
  it('entfernt E-Mail, Telefon und Links, lässt Datum stehen', () => {
    const out = redactContact(
      'Mail an a.b@uni-x.de, Tel +49 170 1234567, https://x.org/y, am 30.10.2026',
    );
    expect(out).not.toMatch(/@|1234567|https/);
    expect(out).toContain('30.10.2026');
  });
});

describe('sanitizeRequest', () => {
  const base = {
    mode: 'thorough',
    today: '26.11.2026',
    todos: [{ id: 'T1', note: 'Mail an x@y.de schreiben' }],
    people: [{ key: 'p-anna', note: 'ruft an: 0170 12345678' }],
    talks: [],
    free: ['Poster drucken'],
    context: {
      todos: [{ ID: 'T1', 'To-do': 'A', Link: 'https://geheim', Notiz: 'n' }],
      people: [
        {
          key: 'p-anna',
          Vorname: 'Anna',
          Nachname: 'Alt',
          'E-Mail': 'a@x.org',
          Handynummer: '0170',
          Kommentar: 'ok',
          'Pipeline-Status': 'Review',
        },
      ],
      talks: [],
      openTodos: [],
      ziele: [],
    },
  };
  it('wirft Kontaktdaten und fremde Spalten serverseitig raus', () => {
    const r = sanitizeRequest(base);
    expect(r.people[0]?.note).not.toMatch(/0170/);
    expect(r.todos[0]?.note).not.toContain('@');
    const p = r.context.people[0] ?? {};
    expect(Object.keys(p).sort()).toEqual(['Kommentar', 'Pipeline-Status', 'Vorname', 'key']);
    expect(r.context.todos[0]).not.toHaveProperty('Link');
    expect(JSON.stringify(r)).not.toMatch(/Nachname|x\.org|geheim/);
    expect(r.mode).toBe('thorough');
  });
  it('unbekannter Modus fällt auf fast, leere Anfrage wirft', () => {
    expect(sanitizeRequest({ ...base, mode: 'opus' }).mode).toBe('fast');
    expect(() => sanitizeRequest({ mode: 'fast', today: 'x' })).toThrow('Nichts vorgemerkt.');
    expect(() => sanitizeRequest('x')).toThrow();
  });
  it('kürzt zu viele Einträge', () => {
    const many = Array.from({ length: 100 }, (_, i) => `T${i}`);
    expect(sanitizeRequest({ ...base, free: many }).free).toHaveLength(20);
  });
  it('Prompt enthält Notizen, aber keinen Nachnamen', () => {
    const text = buildUserPrompt(sanitizeRequest(base));
    expect(text).toContain('Poster drucken');
    expect(text).not.toContain('Alt');
  });
});

describe('parsePlan', () => {
  it('nimmt Paar-Listen, filtert Spalten, Schritte und kaputte Einträge', () => {
    const plan = parsePlan({
      todo: [
        {
          id: 'T1',
          set: [
            { col: 'Status', value: 'erledigt' },
            { col: 'ID', value: 'T9' },
          ],
          why: 'x',
        },
        { id: 'T2', set: [{ col: 'Link', value: 'x' }], why: '' },
        null,
      ],
      hr: [
        {
          key: 'p-a',
          set: [
            { col: 'Integriert', value: 'ja' },
            { col: 'E-Mail', value: 'x@y.de' },
          ],
          why: '',
        },
      ],
      new: [
        {
          set: [
            { col: 'To-do', value: 'Neu' },
            { col: 'Prio', value: 'B' },
          ],
          why: '',
        },
        { set: [], why: '' },
      ],
      talk: [{ key: 'k', set: { Status: 'fix', Speaker: 'X' }, why: '' }],
      steps: [
        { key: 'k', step: 'Raum/Zoom', status: 'erledigt', owner: '', note: '', why: '' },
        { key: 'k', step: 'Unbekannt', status: 'erledigt', owner: '', note: '', why: '' },
      ],
    });
    expect(plan.todo).toEqual([{ id: 'T1', set: { Status: 'erledigt' }, why: 'x' }]);
    expect(plan.hr[0]?.set).toEqual({ Integriert: 'TRUE' });
    expect(plan.new).toHaveLength(1);
    expect(plan.talk[0]?.set).toEqual({ Status: 'fix' });
    expect(plan.steps).toHaveLength(1);
  });
  it('Müll ergibt leeren Plan', () => {
    expect(parsePlan('x')).toEqual({ todo: [], hr: [], new: [], talk: [], steps: [] });
  });
});

describe('PLAN_SCHEMA', () => {
  it('ist für strukturierte Ausgabe geeignet: überall additionalProperties false, alle Felder required', () => {
    const walk = (n: unknown): void => {
      if (!n || typeof n !== 'object') return;
      const o = n as Record<string, unknown>;
      if (o['type'] === 'object') {
        expect(o['additionalProperties']).toBe(false);
        expect([...(o['required'] as string[])].sort()).toEqual(
          Object.keys(o['properties'] as object).sort(),
        );
      }
      Object.values(o).forEach(walk);
    };
    walk(PLAN_SCHEMA);
  });
});
