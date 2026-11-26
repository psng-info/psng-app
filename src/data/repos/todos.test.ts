import { describe, expect, it } from 'vitest';
import type { Values } from '@/domain/rows';
import { TODO_HEADER, todoValues } from '@/domain/todos/test-helpers';
import { SHEET_IDS } from '../config';
import { SheetsError, type SheetsAdapter } from '../sheets/SheetsAdapter';
import { parseCell, splitRange } from '../sheets/table';
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
      return Promise.resolve(null);
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

  it('sichert Formel-Anfänge in der neuen Zeile', async () => {
    const f = fake(todoValues([]));
    await createTodo(f.adapter, { 'To-do': '=1+1', 'Wartet auf': '@Anna' }, TODAY);
    const row = f.calls.find((c) => c.kind === 'append')?.args[2] as string[];
    expect(row[TODO_HEADER.indexOf('To-do')]).toBe("'=1+1");
    expect(row[TODO_HEADER.indexOf('Wartet auf')]).toBe("'@Anna");
  });

  it('ungültige Eingabe: Fehler vor jedem Zugriff', async () => {
    const f = fake(todoValues([]));
    await expect(createTodo(f.adapter, { 'To-do': '' }, TODAY)).rejects.toBeInstanceOf(SheetsError);
    expect(f.calls).toHaveLength(0);
  });
});

/** Fake mit echtem Speicher: Zellen und Zeilen landen in `values`, `append` meldet die Zeilennummer. */
function sheet(
  values: Values,
  opts: { beforeAppend?: (v: Values) => void; failCell?: number } = {},
) {
  let cells = 0;
  const adapter: SheetsAdapter = {
    batchGet: () => Promise.resolve([values.map((r) => [...r])]),
    updateCell: (_id, a1, value) => {
      cells++;
      if (opts.failCell === cells) {
        return Promise.reject(new SheetsError('network', 'Keine Verbindung zu Google.'));
      }
      const cell = parseCell(splitRange(a1).cells);
      if (cell) (values[cell.row - 1] ??= [])[cell.col] = String(value);
      return Promise.resolve();
    },
    append: (_id, _range, row) => {
      opts.beforeAppend?.(values);
      values.push(row.map(String));
      return Promise.resolve(values.length);
    },
  };
  return adapter;
}

describe('Schreiben bei parallelen Änderungen und Teilfehlern', () => {
  it('createTodo: legt jemand gleichzeitig dieselbe ID an, bekommt unsere Zeile die nächste', async () => {
    const values = todoValues([{ ID: 'T05' }]);
    const idCol = TODO_HEADER.indexOf('ID');
    const other = (v: Values) => {
      const row = TODO_HEADER.map(() => '');
      row[idCol] = 'T06';
      v.push(row); // die andere Person war ein paar Millisekunden schneller
    };
    const id = await createTodo(sheet(values, { beforeAppend: other }), { 'To-do': 'Neu' }, TODAY);
    expect(id).toBe('T07');
    expect(values.slice(1).map((r) => r[idCol])).toEqual(['T05', 'T06', 'T07']);
  });

  it('createTodo: war unsere Zeile die erste mit der ID, bleibt sie (die andere weicht aus)', async () => {
    const values = todoValues([{ ID: 'T05' }]);
    const idCol = TODO_HEADER.indexOf('ID');
    const adapter = sheet(values);
    const append = adapter.append.bind(adapter);
    adapter.append = async (id, range, row) => {
      const n = await append(id, range, row);
      const late = TODO_HEADER.map(() => '');
      late[idCol] = 'T06';
      values.push(late); // die andere Person kam direkt nach uns
      return n;
    };
    expect(await createTodo(adapter, { 'To-do': 'Neu' }, TODAY)).toBe('T06');
    expect(values[2]?.[idCol]).toBe('T06');
  });

  it('createTodo ohne Konflikt: ID bleibt, kein zusätzlicher Schreibzugriff', async () => {
    const values = todoValues([{ ID: 'T05' }]);
    expect(await createTodo(sheet(values), { 'To-do': 'Neu' }, TODAY)).toBe('T06');
    expect(values).toHaveLength(3);
  });

  it('doppelte ID im Sheet: Abhaken schreibt nicht in irgendeine der Zeilen', async () => {
    const f = fake(todoValues([{ ID: 'T01' }, { ID: 'T01' }]));
    const err = await completeTodo(f.adapter, 'T01', TODAY).catch((e: unknown) => e);
    expect((err as SheetsError).kind).toBe('row_missing');
    expect((err as SheetsError).message).toMatch(/mehrfach/);
    expect(f.calls.every((c) => c.kind === 'get')).toBe(true);
  });

  it('Teilfehler: Meldung sagt „nur teilweise gespeichert“, ohne Zellinhalte', async () => {
    const values = todoValues([{ ID: 'T01', 'To-do': 'Geheimer Inhalt' }]);
    const err = await completeTodo(sheet(values, { failCell: 2 }), 'T01', TODAY).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(SheetsError);
    expect((err as SheetsError).kind).toBe('network');
    expect((err as SheetsError).message).toMatch(/^Nur teilweise gespeichert \(1 von 3 Feldern\)/);
    expect((err as SheetsError).message).not.toContain('Geheim');
  });

  it('Fehler bei der ersten Zelle: normale Meldung', async () => {
    const values = todoValues([{ ID: 'T01' }]);
    const err = await completeTodo(sheet(values, { failCell: 1 }), 'T01', TODAY).catch(
      (e: unknown) => e,
    );
    expect((err as SheetsError).message).toBe('Keine Verbindung zu Google.');
  });

  it('zu langer Text: nichts geschrieben, klare Meldung', async () => {
    const f = fake(todoValues([{ ID: 'T01' }]));
    const err = await addTodoNote(f.adapter, 'T01', 'x'.repeat(50_001), TODAY).catch(
      (e: unknown) => e,
    );
    expect((err as SheetsError).kind).toBe('invalid');
    expect(f.calls.every((c) => c.kind === 'get')).toBe(true);
    const g = fake(todoValues([]));
    await expect(
      createTodo(g.adapter, { 'To-do': 'x'.repeat(50_001) }, TODAY),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(g.calls.some((c) => c.kind === 'append')).toBe(false);
  });
});
