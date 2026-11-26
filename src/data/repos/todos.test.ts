import { describe, expect, it } from 'vitest';
import type { Values } from '@/domain/rows';
import { TODO_HEADER, todoValues } from '@/domain/todos/test-helpers';
import { SHEET_IDS } from '../config';
import { SheetsError, type SheetsAdapter } from '../sheets/SheetsAdapter';
import { addTodoNote, completeTodo, createTodo } from './todos';

const TODAY = new Date(2026, 10, 26);

/** Fake-Adapter: hält eine Tabelle im Speicher und merkt sich alle Aufrufe. */
function fake(values: Values) {
  const calls: { kind: string; args: unknown[] }[] = [];
  let reads = 0;
  const adapter: SheetsAdapter = {
    batchGet: (id, ranges) => {
      reads++;
      calls.push({ kind: 'get', args: [id, ranges] });
      return Promise.resolve([values.map((r) => [...r])]);
    },
    updateCell: (id, a1, value) => {
      calls.push({ kind: 'cell', args: [id, a1, value] });
      return Promise.resolve();
    },
    append: (id, range, row) => {
      calls.push({ kind: 'append', args: [id, range, row] });
      return Promise.resolve();
    },
  };
  return { adapter, calls, reads: () => reads };
}

const col = (name: string) => String.fromCharCode(65 + TODO_HEADER.indexOf(name));

describe('completeTodo', () => {
  const values = todoValues([
    { ID: 'T01', 'To-do': 'a' },
    { ID: 'T02', 'To-do': 'b', Status: 'läuft' },
  ]);

  it('liest frisch und schreibt Status, Erledigt, Geändert per Zelle', async () => {
    const f = fake(values);
    await completeTodo(f.adapter, 'T02', TODAY);
    expect(f.calls.map((c) => c.kind)).toEqual(['get', 'cell', 'cell', 'cell']);
    expect(f.calls.slice(1).map((c) => c.args)).toEqual([
      [SHEET_IDS.todos, `'To-dos'!${col('Status')}3`, 'erledigt'],
      [SHEET_IDS.todos, `'To-dos'!${col('Erledigt')}3`, '26.11.2026'],
      [SHEET_IDS.todos, `'To-dos'!${col('Geändert')}3`, '26.11.2026'],
    ]);
  });

  it('findet die Zeile über die ID, auch wenn die Reihenfolge sich geändert hat', async () => {
    const f = fake([values[0]!, values[2]!, values[1]!]);
    await completeTodo(f.adapter, 'T02', TODAY);
    expect((f.calls[1]?.args[1] as string).endsWith('2')).toBe(true);
  });

  it('Spalten über Kopfzeilen-Namen: andere Reihenfolge, fehlendes Geändert wird übersprungen', async () => {
    const f = fake([
      ['Notiz', 'Erledigt', 'ID', 'Status'],
      ['', '', 'T09', 'offen'],
    ]);
    await completeTodo(f.adapter, 'T09', TODAY);
    expect(f.calls.slice(1).map((c) => [c.args[1], c.args[2]])).toEqual([
      ["'To-dos'!D2", 'erledigt'],
      ["'To-dos'!B2", '26.11.2026'],
    ]);
  });

  it('Zeile fehlt: row_missing mit klarer Meldung, nichts geschrieben', async () => {
    const f = fake(values);
    const err = await completeTodo(f.adapter, 'T07', TODAY).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SheetsError);
    expect((err as SheetsError).kind).toBe('row_missing');
    expect((err as SheetsError).message).toBe(
      'Zeile für T07 nicht gefunden. Neu laden und nochmal versuchen.',
    );
    expect(f.calls.every((c) => c.kind === 'get')).toBe(true);
  });

  it('schon erledigt: kein Schreibzugriff, Datum bleibt', async () => {
    const f = fake(todoValues([{ ID: 'T01', Status: 'erledigt', Erledigt: '01.11.2026' }]));
    await completeTodo(f.adapter, 'T01', TODAY);
    expect(f.calls).toHaveLength(1);
  });

  it('fehlende Spalte ID oder Status: missing_column', async () => {
    const f = fake([['To-do'], ['x']]);
    await expect(completeTodo(f.adapter, 'T01', TODAY)).rejects.toMatchObject({
      kind: 'missing_column',
    });
  });
});

describe('addTodoNote', () => {
  it('hängt „TT.MM.: Text“ an die bestehende Notiz, stempelt Geändert', async () => {
    const f = fake(todoValues([{ ID: 'T01', Notiz: 'Alt' }]));
    await addTodoNote(f.adapter, 'T01', ' Neu ', TODAY);
    expect(f.calls.slice(1).map((c) => [c.args[1], c.args[2]])).toEqual([
      [`'To-dos'!${col('Notiz')}2`, 'Alt\n26.11.: Neu'],
      [`'To-dos'!${col('Geändert')}2`, '26.11.2026'],
    ]);
  });

  it('leerer Text schreibt nichts', async () => {
    const f = fake(todoValues([{ ID: 'T01' }]));
    await addTodoNote(f.adapter, 'T01', '  ', TODAY);
    expect(f.calls).toHaveLength(0);
  });
});

describe('createTodo', () => {
  it('liest frisch, vergibt die nächste ID und hängt die Zeile in Kopfzeilen-Reihenfolge an', async () => {
    const f = fake(todoValues([{ ID: 'T05' }, { ID: 'T117' }]));
    const id = await createTodo(
      f.adapter,
      { 'To-do': 'Neu', Status: 'offen', Modus: 'selbst', Prio: 'B' },
      TODAY,
    );
    expect(id).toBe('T118');
    const append = f.calls.find((c) => c.kind === 'append');
    expect(append?.args[0]).toBe(SHEET_IDS.todos);
    expect(append?.args[1]).toBe("'To-dos'!A1");
    const row = append?.args[2] as string[];
    expect(row[0]).toBe('T118');
    expect(row[TODO_HEADER.indexOf('Quelle')]).toBe('App 26.11.2026');
    expect(row[TODO_HEADER.indexOf('Erfasst')]).toBe('26.11.2026');
  });

  it('ungültige Eingabe: Fehler vor jedem Zugriff', async () => {
    const f = fake(todoValues([]));
    await expect(createTodo(f.adapter, { 'To-do': '' }, TODAY)).rejects.toBeInstanceOf(SheetsError);
    expect(f.calls).toHaveLength(0);
  });
});
