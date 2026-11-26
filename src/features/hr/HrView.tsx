import { useMemo, useState } from 'react';
import { Gauge } from 'lucide-react';
import { useHrData, useUpdateCandidate } from '@/data/repos/hr';
import { SheetsError } from '@/data/sheets/SheetsAdapter';
import {
  buildPeople,
  byProgress,
  CLOSED,
  flagGroups,
  formAnswers,
  hrMood,
  NO_STATUS,
  ONLY_FORM,
  STAGES,
  type HrSet,
  type Person,
} from '@/domain/hr';
import { norm } from '@/domain/text';
import {
  EmptyState,
  ErrorBanner,
  FilterBar,
  PageHeader,
  Section,
  Skeleton,
  Tile,
  TileGrid,
  type FilterChip,
} from '@/ui/blocks';
import { Button } from '@/ui/shadcn/button';
import { AbortedList } from './AbortedList';
import { ActionList } from './ActionList';
import { PersonCard } from './PersonCard';
import { StatusSheet, type SheetMode } from './StatusSheet';

const stageOf = (p: Person) => p.stage || NO_STATUS;

/** Suchtext einer Person. Bewusst ohne Mail, Telefon und Zeitstempel. */
function haystack(p: Person): string {
  return norm(
    [
      p.name,
      p.k['Stadt / Uni'],
      p.k['Interesse / Bereich'],
      p.k['Buddy'],
      p.k['Status & Fach'],
      ...formAnswers(p).map((a) => a.value),
    ].join(' '),
  );
}

export function HrView() {
  const query = useHrData();
  const update = useUpdateCandidate();
  const [today] = useState(() => new Date());
  const [stage, setStage] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [buddy, setBuddy] = useState('');
  const [sheet, setSheet] = useState<{ key: string; mode: SheetMode } | null>(null);

  const people = useMemo(
    () => (query.data ? buildPeople(query.data, today) : []),
    [query.data, today],
  );
  const groups = useMemo(() => flagGroups(people), [people]);
  const mood = useMemo(() => hrMood(people, today), [people, today]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of people) m.set(stageOf(p), (m.get(stageOf(p)) ?? 0) + 1);
    return m;
  }, [people]);

  const buddies = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of people) if (p.buddy) m.set(p.buddy, (m.get(p.buddy) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'));
  }, [people]);

  const needle = norm(q);
  const shown = useMemo(
    () =>
      people
        .filter(
          (p) =>
            (!stage || stageOf(p) === stage) &&
            (!buddy || p.buddy === buddy) &&
            (!needle || haystack(p).includes(needle)),
        )
        .sort(byProgress),
    [people, stage, buddy, needle],
  );

  const active = shown.filter((p) => !p.closed);
  const results = shown.filter((p) => p.closed && p.stage !== 'Abbruch');
  const aborted = shown.filter((p) => p.stage === 'Abbruch');
  const filtered = !!(stage || buddy || needle);

  const openTiles = [...STAGES.filter((s) => !CLOSED.has(s)), ONLY_FORM, NO_STATUS].filter(
    (s) => !(s === ONLY_FORM || s === NO_STATUS) || (counts.get(s) ?? 0) > 0,
  );
  const closedTiles = STAGES.filter((s) => CLOSED.has(s));
  const extra = [...counts.keys()].filter(
    (s) => !(STAGES as readonly string[]).includes(s) && s !== ONLY_FORM && s !== NO_STATUS,
  );

  const edit = (p: Person, set: HrSet) => update.mutate({ key: p.key, name: p.name, set });
  const sheetPerson = sheet ? (people.find((p) => p.key === sheet.key) ?? null) : null;

  const card = (p: Person) => (
    <PersonCard
      person={p}
      today={today}
      onEdit={edit}
      onStatus={(x) => setSheet({ key: x.key, mode: 'status' })}
      onReview={(x) => setSheet({ key: x.key, mode: 'review' })}
    />
  );

  const tile = (s: string) => (
    <Tile
      key={s}
      count={counts.get(s) ?? 0}
      label={s}
      pressed={stage === s}
      onToggle={() => setStage(stage === s ? null : s)}
    />
  );

  const chips: FilterChip[] = [];
  if (q) chips.push({ id: 'q', label: `Suche: „${q}“`, onClear: () => setQ('') });
  if (stage) chips.push({ id: 'stage', label: `Status: ${stage}`, onClear: () => setStage(null) });
  if (buddy) chips.push({ id: 'buddy', label: `Buddy: ${buddy}`, onClear: () => setBuddy('') });
  const clearAll = (): void => {
    setQ('');
    setStage(null);
    setBuddy('');
  };

  const errorMsg =
    query.error instanceof SheetsError
      ? query.error.message
      : 'Daten konnten nicht geladen werden.';

  return (
    <section aria-labelledby="hr-title" className="flex flex-col gap-8">
      <div>
        <PageHeader
          id="hr-title"
          title="Kandidat:innen"
          updatedAt={query.dataUpdatedAt}
          fetching={query.isFetching}
          failed={query.isError}
          onReload={() => void query.refetch()}
        />
        {query.data && (
          <details className="mt-1">
            <summary className="text-muted inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <Gauge className="size-4" aria-hidden="true" />
              Stimmung: {mood.level.label}
              <span className="font-mono">{mood.score}/100</span>
            </summary>
            <ul className="text-muted mt-1 text-sm">
              {mood.factors.map((f) => (
                <li key={f.text}>
                  <span className="font-mono">{f.value > 0 ? `+${f.value}` : f.value}</span>{' '}
                  {f.text}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {query.isPending && (
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Daten werden geladen</span>
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-64" />
        </div>
      )}
      {query.isError && (
        <ErrorBanner
          action={
            <Button type="button" variant="outline" onClick={() => void query.refetch()}>
              Erneut versuchen
            </Button>
          }
        >
          {errorMsg}
        </ErrorBanner>
      )}

      {update.isError && (
        <ErrorBanner
          action={
            <Button type="button" variant="ghost" size="sm" onClick={() => update.reset()}>
              Schließen
            </Button>
          }
        >
          Speichern fehlgeschlagen.{' '}
          {update.error instanceof SheetsError ? update.error.message : 'Bitte nochmal versuchen.'}
        </ErrorBanner>
      )}

      {query.data && (
        <>
          <Section title="Handlungsbedarf" count={`(${groups.length})`}>
            <ActionList groups={groups} />
          </Section>

          <Section title="Pipeline">
            <TileGrid className="md:grid-cols-4 lg:grid-cols-7">
              {[...openTiles, ...extra].map(tile)}
            </TileGrid>
            <h4 className="font-display text-muted mt-4 mb-2 text-sm font-semibold">Ergebnisse</h4>
            <TileGrid className="grid-cols-4 [&>*]:min-h-11 [&>*]:flex-col [&>*]:items-start [&>*]:gap-0.5 [&>*]:py-2 md:[&>*]:min-h-14">
              {closedTiles.map(tile)}
            </TileGrid>
          </Section>

          <Section
            title="Personen"
            count={filtered ? `(${shown.length} von ${people.length})` : `(${shown.length})`}
          >
            <div className="flex flex-col gap-4">
              <FilterBar
                label="Kandidat:innen filtern"
                search={{
                  label: 'Suche',
                  placeholder: 'Name, Stadt, Interesse',
                  value: q,
                  onChange: setQ,
                }}
                selects={[
                  {
                    id: 'stage',
                    label: 'Status',
                    value: stage ?? '',
                    onChange: (v) => setStage(v || null),
                    options: [
                      { value: '', label: 'alle' },
                      ...[...openTiles, ...closedTiles, ...extra]
                        .filter((s) => counts.get(s))
                        .map((s) => ({ value: s, label: s, count: counts.get(s) ?? 0 })),
                    ],
                  },
                  {
                    id: 'buddy',
                    label: 'Buddy',
                    value: buddy,
                    onChange: setBuddy,
                    options: [
                      { value: '', label: 'alle' },
                      ...buddies.map(([b, n]) => ({ value: b, label: b, count: n })),
                    ],
                  },
                ]}
                chips={chips}
                onClearAll={clearAll}
              />

              {shown.length === 0 && (
                <EmptyState>
                  {people.length
                    ? 'Keine Treffer für diesen Filter.'
                    : 'Im Tab Kandidaten steht noch niemand.'}
                </EmptyState>
              )}

              {active.length > 0 && (
                <ul className="grid gap-3 md:grid-cols-2">
                  {active.map((p) => (
                    <li key={p.key} className="flex">
                      <div className="flex w-full">{card(p)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>

          {results.length > 0 && (
            <Section title="Ergebnisse" count={`(${results.length})`}>
              <ul className="grid gap-3 md:grid-cols-2">
                {results.map((p) => (
                  <li key={p.key} className="flex">
                    <div className="flex w-full">{card(p)}</div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {aborted.length > 0 && (
            <Section title="Abgebrochen" count={`(${aborted.length})`}>
              <AbortedList people={aborted} today={today} />
            </Section>
          )}
        </>
      )}

      <StatusSheet
        person={sheetPerson}
        mode={sheet?.mode ?? 'status'}
        onClose={() => setSheet(null)}
        onStatus={(s) => {
          if (sheetPerson) edit(sheetPerson, { 'Pipeline-Status': s });
          setSheet(null);
        }}
        onReview={(text) => {
          if (sheetPerson) edit(sheetPerson, { 'Review / Ergebnis': text });
          setSheet(null);
        }}
      />
    </section>
  );
}
