import { useMemo, useState } from 'react';
import { Gauge, RefreshCw } from 'lucide-react';
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
import { cn } from '@/ui/lib/utils';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
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

function selectCls() {
  return 'border-input bg-card min-h-11 w-full rounded-md border px-3 text-base';
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

  if (query.isPending) {
    return (
      <Section title="Kandidat:innen">
        <p role="status" className="text-muted">
          Daten werden geladen.
        </p>
      </Section>
    );
  }
  if (query.isError) {
    const msg =
      query.error instanceof SheetsError
        ? query.error.message
        : 'Daten konnten nicht geladen werden.';
    return (
      <Section title="Kandidat:innen">
        <p role="alert" className="text-crit">
          {msg}
        </p>
        <Button type="button" className="mt-4" onClick={() => void query.refetch()}>
          Erneut versuchen
        </Button>
      </Section>
    );
  }

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

  const tile = (s: string) => {
    const n = counts.get(s) ?? 0;
    const on = stage === s;
    return (
      <li key={s}>
        <button
          type="button"
          aria-pressed={on}
          onClick={() => setStage(on ? null : s)}
          className={cn(
            'flex min-h-14 w-full flex-col items-start justify-center rounded-lg border px-3 py-2 text-left',
            on ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
            n === 0 && !on && 'text-muted',
          )}
        >
          <span className="font-display text-2xl leading-none font-semibold">{n}</span>
          <span className="text-xs">{s}</span>
        </button>
      </li>
    );
  };

  return (
    <section aria-labelledby="hr-title" className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-2">
          <h2 id="hr-title" className="font-display text-2xl font-semibold">
            Kandidat:innen
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={cn(query.isFetching && 'animate-spin')} aria-hidden="true" />
            <span className="sr-only">Neu laden</span>
          </Button>
        </div>
        <details className="mt-1">
          <summary className="text-muted inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <Gauge className="size-4" aria-hidden="true" />
            Stimmung: {mood.level.label}
            <span className="font-mono">{mood.score}/100</span>
          </summary>
          <ul className="text-muted mt-1 text-sm">
            {mood.factors.map((f) => (
              <li key={f.text}>
                <span className="font-mono">{f.value > 0 ? `+${f.value}` : f.value}</span> {f.text}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {update.isError && (
        <div
          role="alert"
          className="border-crit bg-crit-soft text-crit flex items-start gap-2 rounded-lg border p-3 text-sm"
        >
          <p className="flex-1">
            Speichern fehlgeschlagen.{' '}
            {update.error instanceof SheetsError
              ? update.error.message
              : 'Bitte nochmal versuchen.'}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => update.reset()}>
            Schließen
          </Button>
        </div>
      )}

      <Section title="Pipeline" level={3}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[...openTiles, ...extra].map(tile)}
        </ul>
        <h4 className="text-muted mt-4 mb-2 text-sm font-medium">Ergebnisse</h4>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {closedTiles.map(tile)}
        </ul>
      </Section>

      <Section title="Handlungsbedarf" count={groups.length} level={3}>
        <ActionList groups={groups} />
      </Section>

      <Section
        title="Personen"
        count={filtered ? `${shown.length} von ${people.length}` : shown.length}
        level={3}
      >
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <label htmlFor="hr-q" className="flex flex-col gap-1 text-sm font-medium">
            Suche
            <Input
              id="hr-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, Stadt, Interesse"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Status
            <select
              className={selectCls()}
              value={stage ?? ''}
              onChange={(e) => setStage(e.target.value || null)}
            >
              <option value="">Alle</option>
              {[...openTiles, ...closedTiles, ...extra]
                .filter((s) => counts.get(s))
                .map((s) => (
                  <option key={s} value={s}>
                    {s} ({counts.get(s)})
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Buddy
            <select
              className={selectCls()}
              value={buddy}
              onChange={(e) => setBuddy(e.target.value)}
            >
              <option value="">Alle</option>
              {buddies.map(([b, n]) => (
                <option key={b} value={b}>
                  {b} ({n})
                </option>
              ))}
            </select>
          </label>
        </div>
        {filtered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-3"
            onClick={() => {
              setQ('');
              setStage(null);
              setBuddy('');
            }}
          >
            Filter zurücksetzen
          </Button>
        )}

        {shown.length === 0 && (
          <p className="text-muted text-sm">
            {people.length
              ? 'Keine Treffer für diesen Filter.'
              : 'Im Tab Kandidaten steht noch niemand.'}
          </p>
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
      </Section>

      {results.length > 0 && (
        <Section title="Ergebnisse" count={results.length} level={3}>
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
        <Section title="Abgebrochen" count={aborted.length} level={3}>
          <AbortedList people={aborted} today={today} />
        </Section>
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

function Section({
  title,
  count,
  level = 2,
  children,
}: {
  title: string;
  count?: number | string;
  level?: 2 | 3;
  children: React.ReactNode;
}) {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <section>
      <H className="font-display mb-3 text-lg font-semibold">
        {title}
        {count !== undefined && (
          <span className="text-muted ml-2 font-mono text-sm">({count})</span>
        )}
      </H>
      {children}
    </section>
  );
}
