import { Check, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentUser, useTeam } from '@/features/access/CurrentUser';
import { memberMatcher } from '@/features/access/team';
import {
  useLogStep,
  usePendingTalkWrites,
  useTalksData,
  useUpdateLecture,
} from '@/data/repos/talks';
import { useOnline } from '@/data/online';
import { SheetsError } from '@/data/sheets/SheetsAdapter';
import { navigate } from '@/app/router';
import { parseDate, startOfDay } from '@/domain/dates';
import {
  TALK_TILES,
  actionItems,
  buildTalksModel,
  speakerPool,
  stats,
  talkKey,
} from '@/domain/talks/model';
import { cell } from '@/domain/talks/steps';
import type { Flag, StepState, Talk } from '@/domain/talks/types';
import { EmptyState, ErrorBanner, PageHeader, Section, Skeleton } from '@/ui/blocks';
import { Button } from '@/ui/shadcn/button';
import { TalkActionsContext, type TalkActions } from './actions';
import { ActionList } from './ActionList';
import { FactsSheet } from './FactsSheet';
import { StepSheet, type StepEdit } from './StepSheet';
import { NO_FILTERS, hasActiveFilter, type TalkFilters } from './filters';
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

/** Fehlertext ohne Zellinhalte. SheetsError-Texte sind für Menschen gedacht. */
function writeError(err: unknown): string {
  return `Speichern fehlgeschlagen. ${
    err instanceof SheetsError ? err.message : 'Bitte neu laden und nochmal versuchen.'
  }`;
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
  const online = useOnline();
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

  // Schreiben: Sheets für Schritt und Eckdaten, Meldungen, laufende Speicherungen
  const user = useCurrentUser();
  const [stepTarget, setStepTarget] = useState<{ talk: string; step: string } | null>(null);
  const [factsTarget, setFactsTarget] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');
  const log = useLogStep({
    onError: (e) => setProblem(writeError(e)),
    onSuccess: (_r, v) => setNotice(`Gespeichert: ${v.step}.`),
  });
  const lecture = useUpdateLecture({
    onError: (e) => setProblem(writeError(e)),
    onSuccess: () => setNotice('Eckdaten gespeichert.'),
  });
  const pending = usePendingTalkWrites();

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(t);
  }, [notice]);

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

  const { mutate: logMutate } = log;
  const { mutate: lectureMutate } = lecture;
  const talkActions = useMemo<TalkActions>(
    () => ({
      editStep: (talk: Talk, step: StepState) =>
        setStepTarget({ talk: talk.key, step: step.def.key }),
      markDone: (talk: Talk, step: StepState) => {
        setProblem('');
        logMutate({
          talk: talk.key,
          step: step.def.key,
          status: 'erledigt',
          owner: '',
          note: '',
          by: user.name,
        });
      },
      editFacts: (talk: Talk) => setFactsTarget(talk.key),
      applyFix: (talk: Talk, fix: NonNullable<Flag['fix']>) => {
        setProblem('');
        lectureMutate({ key: talk.key, set: fix.set });
      },
      pendingSteps: pending.steps,
      pendingTalks: pending.lectures,
      offline: !online,
    }),
    [logMutate, lectureMutate, user.name, pending.steps, pending.lectures, online],
  );
  const stepSheet = useMemo(() => {
    const talk = model?.talks.find((t) => t.key === stepTarget?.talk);
    const step = talk?.steps.find((s) => s.def.key === stepTarget?.step);
    return talk && step ? { talk, step } : null;
  }, [model, stepTarget]);
  const factsTalk = useMemo(
    () => model?.talks.find((t) => t.key === factsTarget) ?? null,
    [model, factsTarget],
  );
  const saveStep = useCallback(
    (talk: Talk, step: StepState, edit: StepEdit): void => {
      setProblem('');
      logMutate({ talk: talk.key, step: step.def.key, by: user.name, ...edit });
      setStepTarget(null);
    },
    [logMutate, user.name],
  );
  const saveFacts = (talk: Talk, set: Record<string, string>): void => {
    setProblem('');
    lectureMutate({ key: talk.key, set });
    setFactsTarget(null);
    // Neues Datum = neuer Schlüssel: die Karte unter dem neuen Schlüssel offen halten
    if ('Datum' in set) openFromUi(talkKey(parseDate(set.Datum), cell(talk.raw, 'Speaker')));
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

  const errorText =
    query.error instanceof SheetsError
      ? query.error.message
      : 'Die Talks konnten nicht geladen werden.';
  const activeTile = TALK_TILES.find((t) => t.k === filters.tile);

  return (
    <TalkActionsContext.Provider value={talkActions}>
      <section aria-labelledby="talks-title" className="flex flex-col gap-8">
        <PageHeader
          id="talks-title"
          title="Talks"
          updatedAt={query.dataUpdatedAt}
          fetching={query.isFetching}
          failed={query.isError}
          onReload={() => void query.refetch()}
        />

        <p
          role="status"
          className={notice ? 'text-ok flex items-center gap-2 text-sm font-medium' : 'sr-only'}
        >
          {notice && <Check aria-hidden="true" className="size-4" />}
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
        <StepSheet
          target={stepSheet}
          team={team.map((m) => m.name)}
          onClose={() => setStepTarget(null)}
          onSave={saveStep}
        />
        <FactsSheet talk={factsTalk} onClose={() => setFactsTarget(null)} onSave={saveFacts} />
      </section>
    </TalkActionsContext.Provider>
  );
}
