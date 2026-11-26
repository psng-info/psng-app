import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  useCompleteTodo,
  useCreateTodo,
  usePendingTodoIds,
  useUpdateTodoNote,
} from '@/data/repos/todos';
import { SheetsError } from '@/data/sheets/SheetsAdapter';
import { useTeam } from '@/features/access/CurrentUser';
import { memberMatcher } from '@/features/access/team';
import {
  EMPTY_FILTERS,
  SINCE_LABELS,
  areaOptions,
  filterTodos,
  goalPeriod,
  goalsOf,
  groupTodos,
  GROUP_KEYS,
  personOptions,
  tilesFor,
  type ConflictFn,
  type GroupKey,
  type NewTodoFields,
  type Todo,
  type SinceKey,
  type TodoFilters,
} from '@/domain/todos';
import {
  EmptyState,
  ErrorBanner,
  FilterBar,
  PageHeader,
  Section,
  Skeleton,
  Tile,
  type FilterChip,
} from '@/ui/blocks';
import { Button } from '@/ui/shadcn/button';
import { GoalsSection } from './GoalsSection';
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
export function TodosView({ conflict, param }: { conflict?: ConflictFn; param?: string }) {
  const { todos, today, isPending, error, refetch, isFetching, dataUpdatedAt } = useTodos();
  const team = useTeam();
  const isMember = useMemo(() => memberMatcher(team), [team]);
  const tiles = useMemo(() => tilesFor(conflict), [conflict]);

  const [filters, setFilters] = useState<TodoFilters>(EMPTY_FILTERS);
  const [group, setGroup] = useState<GroupKey>(readGroup);
  const [noteFor, setNoteFor] = useState<Todo | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [seenParam, setSeenParam] = useState<string | undefined>(undefined);

  // Neue ID in der URL (`#/todos/T07`): Suche auf die ID, Erledigte zeigen, danach hinscrollen
  if (param !== seenParam) {
    setSeenParam(param);
    setFocusId(param ?? null);
    if (param) setFilters({ ...EMPTY_FILTERS, q: param, showDone: true });
  }

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

  const chips: FilterChip[] = [];
  const addChip = (id: string, label: string, onClear: () => void): void => {
    chips.push({ id, label, onClear });
  };
  if (filters.q) addChip('q', `Suche: „${filters.q}“`, () => patch({ q: '' }));
  const tile = tiles.find((t) => t.key === filters.tile);
  if (tile) addChip('tile', `Kachel: ${tile.label}`, () => patch({ tile: null }));
  if (filters.person) addChip('person', `Person: ${filters.person}`, () => patch({ person: null }));
  if (filters.area) addChip('area', `Bereich: ${filters.area}`, () => patch({ area: null }));
  if (filters.since)
    addChip('since', `Bearbeitet: ${SINCE_LABELS[filters.since]}`, () => patch({ since: '' }));
  if (filters.showDone) addChip('done', 'inkl. Erledigte', () => patch({ showDone: false }));

  useEffect(() => {
    if (!focusId || isPending) return;
    const el = document.getElementById(`todo-${focusId}`);
    if (!el) return;
    el.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    });
    el.focus({ preventScroll: true });
  }, [focusId, isPending, shown]);

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
      <PageHeader
        id="todos-title"
        title="To-dos"
        updatedAt={dataUpdatedAt}
        fetching={isFetching}
        onReload={() => void refetch()}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Neues To-do
          </Button>
        }
      />

      <p role="status" className="sr-only">
        {notice}
      </p>
      {problem && (
        <ErrorBanner
          action={
            <button
              type="button"
              onClick={() => setProblem('')}
              aria-label="Meldung schließen"
              className="-m-2 inline-flex size-11 items-center justify-center"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          }
        >
          {problem}
        </ErrorBanner>
      )}

      {isPending ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">To-dos werden geladen</span>
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      ) : error ? (
        <ErrorBanner
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              Erneut versuchen
            </Button>
          }
        >
          {errorText(error).replace('Speichern fehlgeschlagen.', 'Laden fehlgeschlagen.')}
        </ErrorBanner>
      ) : (
        <>
          <Section title="Lage">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
              {tiles.map((t) => (
                <Tile
                  key={t.key}
                  count={counts[t.key] ?? 0}
                  label={t.label}
                  level={t.level}
                  pressed={filters.tile === t.key}
                  onToggle={() => toggleTile(t.key)}
                />
              ))}
            </div>
          </Section>
          <GoalsSection goals={goals} period={period} today={today} />

          <Section title="Liste" count={`(${shown.length})`}>
            <div className="flex flex-col gap-4">
              <FilterBar
                label="To-dos filtern"
                search={{
                  label: 'Suche',
                  placeholder: 'Suche in allen Spalten',
                  value: filters.q,
                  onChange: (q) => patch({ q }),
                }}
                selects={[
                  {
                    id: 'group',
                    label: 'Ansicht',
                    value: group,
                    onChange: (v) => changeGroup(v as GroupKey),
                    options: GROUP_KEYS.map((g) => ({ value: g, label: `nach ${g}` })),
                  },
                  {
                    id: 'person',
                    label: 'Person',
                    value: filters.person ?? '',
                    onChange: (v) => patch({ person: v || null }),
                    options: [
                      { value: '', label: 'alle' },
                      ...persons.map((p) => ({ value: p.value, label: p.label, count: p.count })),
                    ],
                  },
                  {
                    id: 'area',
                    label: 'Bereich',
                    value: filters.area ?? '',
                    onChange: (v) => patch({ area: v || null }),
                    options: [
                      { value: '', label: 'alle' },
                      ...areas.map((a) => ({ value: a.value, label: a.label, count: a.count })),
                    ],
                  },
                  {
                    id: 'since',
                    label: 'Bearbeitet',
                    value: filters.since,
                    onChange: (v) => patch({ since: v as SinceKey }),
                    options: (Object.keys(SINCE_LABELS) as SinceKey[]).map((k) => ({
                      value: k,
                      label: SINCE_LABELS[k],
                    })),
                  },
                ]}
                chips={chips}
                onClearAll={() => setFilters(EMPTY_FILTERS)}
                extra={
                  <label className="mt-3 flex min-h-11 w-fit cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={filters.showDone}
                      onChange={(e) => patch({ showDone: e.target.checked })}
                      className="accent-accent size-5"
                    />
                    <span className="text-sm font-medium">Erledigte anzeigen</span>
                  </label>
                }
              />

              {shown.length === 0 ? (
                <EmptyState>
                  {todos.length
                    ? 'Keine Treffer für diesen Filter.'
                    : 'Im Sheet steht noch kein To-do.'}
                </EmptyState>
              ) : (
                <div className="grid items-start gap-6 md:grid-cols-2">
                  {buckets.map((b) => (
                    <section
                      key={b.key}
                      aria-labelledby={`todos-col-${b.key}`}
                      className="space-y-3"
                    >
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
                                highlight={focusId === t.id}
                                isMember={isMember}
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
            </div>
          </Section>
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
