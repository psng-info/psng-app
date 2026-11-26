import { LoaderCircle, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  useCompleteTodo,
  useCreateTodo,
  usePendingTodoIds,
  useUpdateTodoNote,
} from '@/data/repos/todos';
import { SheetsError } from '@/data/sheets/SheetsAdapter';
import { useTeam } from '@/features/access/CurrentUser';
import {
  EMPTY_FILTERS,
  SINCE_LABELS,
  areaOptions,
  filterTodos,
  goalPeriod,
  goalsOf,
  groupTodos,
  personOptions,
  tilesFor,
  type ConflictFn,
  type GroupKey,
  type NewTodoFields,
  type Todo,
  type TodoFilters,
} from '@/domain/todos';
import { Button } from '@/ui/shadcn/button';
import { ActiveChips, FilterBar, type Chip } from './FilterBar';
import { GoalsSection } from './GoalsSection';
import { LageSection } from './LageSection';
import { NewTodoSheet } from './NewTodoSheet';
import { NoteSheet } from './NoteSheet';
import { TodoCard } from './TodoCard';
import { useTodos } from './useTodos';

const GROUP_STORAGE = 'todo-group';
const GROUPS: GroupKey[] = ['Modus', 'Ebene', 'Ziel', 'Person'];

function readGroup(): GroupKey {
  try {
    const v = localStorage.getItem(GROUP_STORAGE);
    return GROUPS.find((g) => g === v) ?? 'Modus';
  } catch {
    return 'Modus';
  }
}

/** Fehlertext ohne Zellinhalte. SheetsError-Texte sind für Menschen gedacht. */
function errorText(err: unknown): string {
  return err instanceof SheetsError
    ? err.message
    : 'Speichern fehlgeschlagen. Bitte neu laden und nochmal versuchen.';
}

/**
 * To-dos der Koordination: Lage, Ziele, Liste mit Filtern, Abhaken, Notiz, neues To-do.
 * `conflict` kommt später vom HR-Feature (Widerspruch zwischen To-do und Kandidat:in).
 */
export function TodosView({ conflict }: { conflict?: ConflictFn }) {
  const { todos, today, isPending, error, refetch } = useTodos();
  const team = useTeam();
  const tiles = useMemo(() => tilesFor(conflict), [conflict]);

  const [filters, setFilters] = useState<TodoFilters>(EMPTY_FILTERS);
  const [group, setGroup] = useState<GroupKey>(readGroup);
  const [noteFor, setNoteFor] = useState<Todo | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');

  const onError = (e: Error): void => setProblem(errorText(e));
  const complete = useCompleteTodo({ onError });
  const note = useUpdateTodoNote({ onError });
  const create = useCreateTodo({
    onError,
    onSuccess: (id) => setNotice(`Neues To-do ${id} angelegt.`),
  });
  const pending = usePendingTodoIds();

  const patch = (p: Partial<TodoFilters>): void => setFilters((f) => ({ ...f, ...p }));
  const changeGroup = (g: GroupKey): void => {
    setGroup(g);
    try {
      localStorage.setItem(GROUP_STORAGE, g);
    } catch {
      /* ohne Speicher bleibt die Ansicht nur für diese Sitzung */
    }
  };
  const toggleTile = (key: string): void =>
    setFilters((f) => {
      const on = f.tile === key;
      return { ...f, tile: on ? null : key, showDone: key === 'done' && !on ? true : f.showDone };
    });

  const counts = useMemo(
    () => Object.fromEntries(tiles.map((t) => [t.key, todos.filter(t.test).length])),
    [tiles, todos],
  );
  const goals = useMemo(() => goalsOf(todos, today), [todos, today]);
  const period = useMemo(() => goalPeriod(todos, today), [todos, today]);
  const persons = useMemo(() => personOptions(todos), [todos]);
  const areas = useMemo(() => areaOptions(todos), [todos]);
  const shown = useMemo(
    () => filterTodos(todos, filters, today, { tiles, keepIds: pending }),
    [todos, filters, today, tiles, pending],
  );
  const buckets = useMemo(() => groupTodos(shown, group), [shown, group]);

  const chips: Chip[] = [];
  if (filters.q)
    chips.push({ key: 'q', label: `Suche: „${filters.q}“`, clear: () => patch({ q: '' }) });
  const tile = tiles.find((t) => t.key === filters.tile);
  if (tile)
    chips.push({ key: 'tile', label: `Kachel: ${tile.label}`, clear: () => patch({ tile: null }) });
  if (filters.person)
    chips.push({
      key: 'person',
      label: `Person: ${filters.person}`,
      clear: () => patch({ person: null }),
    });
  if (filters.area)
    chips.push({
      key: 'area',
      label: `Bereich: ${filters.area}`,
      clear: () => patch({ area: null }),
    });
  if (filters.since)
    chips.push({
      key: 'since',
      label: `Bearbeitet: ${SINCE_LABELS[filters.since]}`,
      clear: () => patch({ since: '' }),
    });
  if (filters.showDone)
    chips.push({ key: 'done', label: 'inkl. Erledigte', clear: () => patch({ showDone: false }) });

  const startComplete = (t: Todo): void => {
    setProblem('');
    complete.mutate({ id: t.id });
  };

  const newGoals = useMemo(
    () =>
      [...new Set(todos.map((t) => t.goal).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'de'),
      ),
    [todos],
  );
  const newAreas = useMemo(() => areas.map((a) => a.value), [areas]);

  return (
    <section aria-labelledby="todos-title" className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h2 id="todos-title" className="font-display text-2xl font-semibold">
          To-dos
        </h2>
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Neues To-do
        </Button>
      </div>

      <p role="status" className="sr-only">
        {notice}
      </p>
      {problem && (
        <div
          role="alert"
          className="bg-crit-soft text-crit border-crit flex items-start gap-2 rounded-lg border p-3 text-sm"
        >
          <p className="flex-1">{problem}</p>
          <button
            type="button"
            onClick={() => setProblem('')}
            aria-label="Meldung schließen"
            className="-m-2 inline-flex size-11 items-center justify-center"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {isPending ? (
        <p role="status" className="text-muted flex items-center gap-2">
          <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          To-dos werden geladen …
        </p>
      ) : error ? (
        <div role="alert" className="bg-crit-soft text-crit rounded-lg p-4">
          <p>{errorText(error).replace('Speichern fehlgeschlagen.', 'Laden fehlgeschlagen.')}</p>
          <Button className="mt-3" variant="outline" onClick={() => void refetch()}>
            Neu laden
          </Button>
        </div>
      ) : (
        <>
          <LageSection tiles={tiles} counts={counts} active={filters.tile} onToggle={toggleTile} />
          <GoalsSection goals={goals} period={period} today={today} />

          <section aria-labelledby="todos-liste" className="space-y-4">
            <h3 id="todos-liste" className="font-display text-lg font-semibold">
              Liste <span className="text-muted font-mono text-base">({shown.length})</span>
            </h3>
            <FilterBar
              filters={filters}
              onChange={patch}
              group={group}
              onGroup={changeGroup}
              persons={persons}
              areas={areas}
            />
            <ActiveChips chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} />

            {shown.length === 0 ? (
              <p className="text-muted py-6 text-center">
                {todos.length
                  ? 'Keine Treffer für diesen Filter.'
                  : 'Im Sheet steht noch kein To-do.'}
              </p>
            ) : (
              <div className="grid items-start gap-6 md:grid-cols-2">
                {buckets.map((b) => (
                  <section key={b.key} aria-labelledby={`todos-col-${b.key}`} className="space-y-3">
                    <div>
                      <h4 id={`todos-col-${b.key}`} className="font-display font-semibold">
                        {b.label}{' '}
                        <span className="text-muted font-mono text-sm">({b.todos.length})</span>
                      </h4>
                      {b.hint && <p className="text-muted text-sm">{b.hint}</p>}
                    </div>
                    {b.todos.length === 0 ? (
                      <p className="text-muted text-sm">Nichts offen.</p>
                    ) : (
                      <ul className="space-y-3">
                        {b.todos.map((t) => (
                          <li key={t.id || t.row}>
                            <TodoCard
                              todo={t}
                              today={today}
                              group={group}
                              pending={pending.has(t.id)}
                              conflict={conflict && !t.isDone ? conflict(t) : null}
                              onComplete={startComplete}
                              onNote={setNoteFor}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <NoteSheet
        todo={noteFor}
        onClose={() => setNoteFor(null)}
        onSave={(t, text) => {
          setProblem('');
          note.mutate({ id: t.id, text });
          setNoteFor(null);
        }}
      />
      <NewTodoSheet
        open={creating}
        onClose={() => setCreating(false)}
        goals={newGoals}
        areas={newAreas}
        people={team.map((m) => m.name)}
        onCreate={(fields: NewTodoFields) => {
          setProblem('');
          create.mutate(fields);
          setCreating(false);
        }}
      />
    </section>
  );
}
