import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { startOfDay } from '@/domain/dates';
import { headerOf, type Values } from '@/domain/rows';
import {
  appendNote,
  completePatch,
  findTodoRow,
  newTodoRow,
  nextTodoId,
  validateNewTodo,
  withAppendedRow,
  withCells,
  type NewTodoFields,
} from '@/domain/todos';
import { useSheets } from '../AdapterContext';
import { RANGES, REFETCH, SHEET_IDS, STALE_MS, TABS } from '../config';
import { SheetsError, type SheetsAdapter } from '../sheets/SheetsAdapter';
import { safeRow } from '../sheets/cellValue';
import { a1, quoteTab, requireColumns } from '../sheets/table';
import { checkCellLength, invalidateWhenIdle, writeCells, type CellWrite } from '../sheets/write';

export const TODOS_KEY = ['todos'] as const;

const missing = (id: string): SheetsError =>
  new SheetsError(
    'row_missing',
    `Zeile für ${id} nicht gefunden. Neu laden und nochmal versuchen.`,
  );

/** Der Tab To-dos frisch gelesen (nie aus dem Cache, ADR: vor jedem Schreiben neu lesen). */
async function readTab(sheets: SheetsAdapter): Promise<Values> {
  const [values] = await sheets.batchGet(SHEET_IDS.todos, [RANGES.todos]);
  return values ?? [];
}

/** Zellen einer Zeile, Spalten über den Kopfzeilen-Namen. Fehlende optionale Spalten werden übersprungen. */
function rowCells(header: string[], sheetRow: number, patch: Record<string, string>): CellWrite[] {
  return Object.entries(patch).flatMap(([name, value]) => {
    const col = header.indexOf(name);
    return col < 0 ? [] : [{ a1: a1(TABS.todos, col, sheetRow), value }];
  });
}

/** Wie oft eine ID in der Spalte ID vorkommt. */
function idCount(values: Values, header: string[], id: string): number {
  const c = header.indexOf('ID');
  return values.slice(1).filter((r) => String(r[c] ?? '').trim() === id).length;
}

/**
 * Frisch lesen, Zeile über die Spalte ID finden. Wirft `row_missing`, auch wenn die ID doppelt
 * vorkommt: dann wüssten wir nicht, welche Zeile gemeint ist, und schreiben lieber gar nicht.
 */
async function locate(sheets: SheetsAdapter, id: string, required: string[]) {
  const values = await readTab(sheets);
  const header = requireColumns(values, ['ID', ...required], TABS.todos);
  const idx = findTodoRow(values, id);
  if (idx < 0) throw missing(id);
  if (idCount(values, header, id) > 1) {
    throw new SheetsError(
      'row_missing',
      `Die ID ${id} steht mehrfach im Tab To-dos. Bitte im Sheet eine der Zeilen umbenennen.`,
    );
  }
  return { values, header, idx, sheetRow: idx + 1 };
}

/** Abhaken: Status=erledigt, Erledigt=heute, Geändert=heute. Bereits erledigte Zeilen bleiben unberührt. */
export async function completeTodo(sheets: SheetsAdapter, id: string, today: Date): Promise<void> {
  const { values, header, idx, sheetRow } = await locate(sheets, id, ['Status', 'Erledigt']);
  if ((values[idx]?.[header.indexOf('Status')] ?? '').trim() === 'erledigt') return;
  await writeCells(sheets, SHEET_IDS.todos, rowCells(header, sheetRow, completePatch(today)));
}

/** Notiz ergänzen: „TT.MM.: Text“ unter den bestehenden Text, Geändert=heute. */
export async function addTodoNote(
  sheets: SheetsAdapter,
  id: string,
  text: string,
  today: Date,
): Promise<void> {
  if (!text.trim()) return;
  const { values, header, idx, sheetRow } = await locate(sheets, id, ['Notiz']);
  const existing = values[idx]?.[header.indexOf('Notiz')] ?? '';
  await writeCells(
    sheets,
    SHEET_IDS.todos,
    rowCells(header, sheetRow, {
      Notiz: appendNote(existing, text, today),
      Geändert: completePatch(today)['Geändert'] ?? '',
    }),
  );
}

/**
 * Neues To-do: frisch lesen, nächste ID, eine Zeile anhängen. Gibt die neue ID zurück.
 *
 * Legen zwei Personen fast gleichzeitig ein To-do an, lesen beide dieselbe höchste ID.
 * Deshalb danach noch einmal lesen: Steht die ID doppelt und ist unsere Zeile (Google meldet
 * ihre Nummer beim Anhängen) die spätere, bekommt sie die nächste freie ID.
 */
export async function createTodo(
  sheets: SheetsAdapter,
  fields: Partial<NewTodoFields>,
  today: Date,
): Promise<string> {
  const errors = validateNewTodo(fields);
  const first = Object.values(errors)[0];
  if (first) throw new SheetsError('invalid', first);
  const values = await readTab(sheets);
  const header = requireColumns(values, ['ID', 'To-do'], TABS.todos);
  const id = nextTodoId(values);
  const row = safeRow(newTodoRow(header, { ...fields, ID: id }, today));
  checkCellLength(row);
  const sheetRow = await sheets.append(SHEET_IDS.todos, `${quoteTab(TABS.todos)}!A1`, row);
  if (sheetRow === null) return id;

  const after = await readTab(sheets);
  if (idCount(after, header, id) <= 1) return id;
  const ownId = String(after[sheetRow - 1]?.[header.indexOf('ID')] ?? '').trim();
  if (ownId !== id) return id; // Zeilennummer passt nicht (Sheet umsortiert): lieber nichts ändern
  // Nur die spätere Zeile weicht aus, sonst würden beide Personen ihre Zeile umbenennen.
  if (findTodoRow(after, id) + 1 === sheetRow) return id;
  const nextId = nextTodoId(after);
  await writeCells(sheets, SHEET_IDS.todos, rowCells(header, sheetRow, { ID: nextId }));
  return nextId;
}

const today = (): Date => startOfDay(new Date());

/** Ein batchGet für den Tab To-dos. Liefert Rohwerte, `parseTodos` baut das Modell. Alle 5 Minuten neu. */
export function useTodosData() {
  const sheets = useSheets();
  return useQuery({
    queryKey: TODOS_KEY,
    staleTime: STALE_MS.todos,
    refetchInterval: REFETCH.todos,
    queryFn: () => readTab(sheets),
  });
}

export interface WriteCallbacks<V, R> {
  onSuccess?: (result: R, vars: V) => void;
  onError?: (error: Error, vars: V) => void;
}

/**
 * Gemeinsamer Ablauf für Schreibaktionen: Cache sofort ändern, bei Fehler zurückrollen,
 * danach neu lesen. Der Fehler geht an den Aufrufer (`mutation.error`).
 */
function useWrite<V, R = void>(
  key: string,
  write: (sheets: SheetsAdapter, v: V, day: Date) => Promise<R>,
  optimistic: (values: Values, v: V, day: Date) => Values,
  callbacks: WriteCallbacks<V, R> = {},
) {
  const sheets = useSheets();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['todos', key],
    mutationFn: (v: V) => write(sheets, v, today()),
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: TODOS_KEY });
      const previous = qc.getQueryData<Values>(TODOS_KEY);
      if (previous) qc.setQueryData<Values>(TODOS_KEY, optimistic(previous, v, today()));
      return { previous };
    },
    onError: (err, v, ctx) => {
      if (ctx?.previous) qc.setQueryData<Values>(TODOS_KEY, ctx.previous);
      callbacks.onError?.(err, v);
    },
    onSuccess: (result, v) => callbacks.onSuccess?.(result, v),
    onSettled: () => invalidateWhenIdle(qc, ['todos'], TODOS_KEY),
  });
}

export function useCompleteTodo(callbacks?: WriteCallbacks<{ id: string }, void>) {
  return useWrite<{ id: string }>(
    'complete',
    (s, v, day) => completeTodo(s, v.id, day),
    (values, v, day) => withCells(values, v.id, completePatch(day)),
    callbacks,
  );
}

export function useUpdateTodoNote(callbacks?: WriteCallbacks<{ id: string; text: string }, void>) {
  return useWrite<{ id: string; text: string }>(
    'note',
    (s, v, day) => addTodoNote(s, v.id, v.text, day),
    (values, v, day) => {
      const idx = findTodoRow(values, v.id);
      const col = headerOf(values).indexOf('Notiz');
      const existing = idx >= 0 && col >= 0 ? (values[idx]?.[col] ?? '') : '';
      return withCells(values, v.id, {
        Notiz: appendNote(existing, v.text, day),
        Geändert: completePatch(day)['Geändert'] ?? '',
      });
    },
    callbacks,
  );
}

export function useCreateTodo(callbacks?: WriteCallbacks<Partial<NewTodoFields>, string>) {
  return useWrite<Partial<NewTodoFields>, string>(
    'create',
    (s, v, day) => createTodo(s, v, day),
    (values, v, day) => {
      const header = headerOf(values);
      // Vorläufige ID, bis der Server-Stand da ist (die echte ID vergibt `createTodo` beim Schreiben).
      return withAppendedRow(values, newTodoRow(header, { ...v, ID: nextTodoId(values) }, day));
    },
    callbacks,
  );
}

/** IDs der To-dos, deren Abhaken oder Notiz gerade geschrieben wird. */
export function usePendingTodoIds(): Set<string> {
  const vars = useMutationState({
    filters: { mutationKey: ['todos'], status: 'pending' },
    select: (m) => (m.state.variables as { id?: string } | undefined)?.id,
  });
  return new Set(vars.filter((v): v is string => typeof v === 'string'));
}
