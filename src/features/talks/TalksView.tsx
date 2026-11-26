import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTeam } from '@/features/access/CurrentUser';
import { useTalksData } from '@/data/repos/talks';
import { SheetsError } from '@/data/sheets/SheetsAdapter';
import { navigate } from '@/app/router';
import { startOfDay } from '@/domain/dates';
import { TALK_TILES, actionItems, buildTalksModel, speakerPool, stats } from '@/domain/talks/model';
import { EmptyState, ErrorBanner, Section, Skeleton } from '@/ui/blocks';
import { Button } from '@/ui/shadcn/button';
import { cn } from '@/ui/lib/utils';
import { ActionList } from './ActionList';
import { NO_FILTERS, hasActiveFilter, type TalkFilters } from './filters';
import { memberMatcher } from './format';
import { NextTalkHero, NumberTiles, TileGrid } from './Lage';
import { Numbers } from './Numbers';
import { SpeakerPool } from './SpeakerPool';
import { cardId } from './links';
import { TalkList } from './TalkList';

function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">Talks werden geladen</span>
      <div className="grid gap-3 lg:grid-cols-3">
        <Skeleton className="h-52 lg:col-span-2" />
        <div className="grid gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Ansicht Talks (nur lesen). `param` ist der Talk-Schlüssel aus `#/talks/<key>`.
 * `today` nur für Tests setzen, dann stabil halten.
 */
export function TalksView({
  param,
  today: todayProp,
}: {
  param?: string | undefined;
  today?: Date;
}) {
  const query = useTalksData();
  const team = useTeam();
  const defaultToday = useMemo(() => startOfDay(new Date()), []);
  const today = todayProp ?? defaultToday;

  const { data } = query;
  const model = useMemo(() => (data ? buildTalksModel(data, today) : null), [data, today]);
  const actions = useMemo(() => (model ? actionItems(model, today) : []), [model, today]);
  const numbers = useMemo(() => (model ? stats(model) : null), [model]);
  const pool = useMemo(() => (model ? speakerPool(model) : null), [model]);
  const ctx = useMemo(() => ({ today, isMember: memberMatcher(team) }), [today, team]);

  const [filters, setFilters] = useState<TalkFilters>(NO_FILTERS);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [touched, setTouched] = useState(false);
  const [scrollReq, setScrollReq] = useState<{ key: string; n: number } | null>(null);
  const [seenParam, setSeenParam] = useState<string | undefined>(undefined);

  const open = (key: string): void => {
    setFilters(NO_FILTERS);
    setTouched(true);
    setOverrides((o) => ({ ...o, [key]: true }));
    setScrollReq((r) => ({ key, n: (r?.n ?? 0) + 1 }));
  };

  // Neuer Schlüssel in der URL: Karte öffnen und hinscrollen (State-Anpassung beim Rendern)
  if (param !== seenParam) {
    setSeenParam(param);
    if (param) open(param);
  }

  const nextKey = model?.next?.key;
  const isOpen = (key: string): boolean => overrides[key] ?? (!touched && key === nextKey);
  const toggle = (key: string): void => {
    setTouched(true);
    setOverrides((o) => ({ ...o, [key]: !isOpen(key) }));
  };

  const openFromUi = (key: string): void => {
    open(key);
    navigate('talks', key);
  };

  const scrolled = useRef(0);
  useEffect(() => {
    if (!scrollReq || !model || scrolled.current === scrollReq.n) return;
    const talk = model.talks.find((t) => t.key === scrollReq.key);
    if (!talk) return;
    scrolled.current = scrollReq.n;
    requestAnimationFrame(() => {
      document
        .getElementById(cardId(talk))
        ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
  }, [scrollReq, model]);

  const toggleTile = (k: string): void =>
    setFilters((f) => ({ ...f, tile: f.tile === k ? '' : k }));

  const stand = query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const errorText =
    query.error instanceof SheetsError
      ? query.error.message
      : 'Die Talks konnten nicht geladen werden.';
  const activeTile = TALK_TILES.find((t) => t.k === filters.tile);

  return (
    <section aria-labelledby="talks-title" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="talks-title" className="font-display text-2xl font-semibold">
          Talks
        </h2>
        <div className="flex items-center gap-3">
          {stand && (
            <span className="text-muted font-mono text-xs" title="Letzter Abruf aus dem Sheet">
              Stand {stand}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            aria-busy={query.isFetching}
          >
            <RefreshCw aria-hidden="true" className={cn(query.isFetching && 'animate-spin')} />
            Neu laden
          </Button>
        </div>
      </div>

      {query.isError && (
        <ErrorBanner
          action={
            <Button type="button" variant="outline" onClick={() => void query.refetch()}>
              Erneut versuchen
            </Button>
          }
        >
          {errorText}
        </ErrorBanner>
      )}

      {query.isPending && <Loading />}

      {model && numbers && pool && (
        <>
          <Section title="Lage">
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <NextTalkHero talk={model.next} today={today} onOpen={openFromUi} />
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                <NumberTiles stats={numbers} />
              </div>
            </div>
            <div className="mt-3">
              <TileGrid talks={model.talks} active={filters.tile} onToggle={toggleTile} />
            </div>
            {activeTile && (
              <p className="text-muted mt-2 text-sm" aria-live="polite">
                Filter aktiv: {activeTile.label}.{' '}
                <button
                  type="button"
                  className="text-accent min-h-11 underline underline-offset-2"
                  onClick={() =>
                    document.getElementById('talks-liste')?.scrollIntoView({
                      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                      block: 'start',
                    })
                  }
                >
                  Zur Liste
                </button>
              </p>
            )}
          </Section>

          <Section
            title="Handlungsbedarf"
            count={actions.length ? `(${actions.length})` : undefined}
          >
            <ActionList items={actions} onOpen={openFromUi} />
          </Section>

          {model.talks.length === 0 ? (
            <Section title="Talks">
              <EmptyState>Im Tab Lectures steht noch kein Talk.</EmptyState>
            </Section>
          ) : (
            <TalkList
              talks={model.talks}
              filters={filters}
              onFilters={setFilters}
              isOpen={isOpen}
              onToggle={toggle}
              ctx={ctx}
            />
          )}

          <Section title="Zahlen" hint={hasActiveFilter(filters) ? undefined : 'Gehaltene Talks'}>
            <Numbers stats={numbers} today={today} onOpen={openFromUi} />
          </Section>

          <SpeakerPool pool={pool} today={today} onOpen={openFromUi} />
        </>
      )}
    </section>
  );
}
