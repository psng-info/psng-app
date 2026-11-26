import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { parseDate, startOfDay } from '@/domain/dates';
import { headerOf, type Values } from '@/domain/rows';
import {
  lectureChanges,
  stepLogRow,
  withLectureCells,
  type StepLogInput,
} from '@/domain/talks/write';
import { useSheets } from '../AdapterContext';
import { RANGES, REFETCH, SHEET_IDS, STALE_MS, TABS } from '../config';
import { safeRow } from '../sheets/cellValue';
import { SheetsError, type SheetsAdapter } from '../sheets/SheetsAdapter';
import { a1, quoteTab, requireColumns } from '../sheets/table';
import { checkCellLength, invalidateWhenIdle, writeCells } from '../sheets/write';
import type { WriteCallbacks } from './todos';

export interface TalksData {
  lectures: Values;
  speakers: Values;
  steps: Values;
  reports: Values;
  speakerForm: Values;
}

/** Ein batchGet für alle fünf Talk-Tabs. Das Modell baut das Feature, hier nur Rohwerte. */
export function useTalksData() {
  const sheets = useSheets();
  return useQuery({
    queryKey: TALKS_KEY,
    staleTime: STALE_MS.talks,
    refetchInterval: REFETCH.talks,
    queryFn: async (): Promise<TalksData> => {
      const r = RANGES.talks;
      const [lectures, speakers, steps, reports, speakerForm] = await sheets.batchGet(
        SHEET_IDS.lectures,
        [r.lectures, r.speakers, r.steps, r.reports, r.speakerForm],
      );
      return {
        lectures: lectures ?? [],
        speakers: speakers ?? [],
        steps: steps ?? [],
        reports: reports ?? [],
        speakerForm: speakerForm ?? [],
      };
    },
  });
}

// --- Schreiben ------------------------------------------------------------

export const TALKS_KEY = ['talks'] as const;
const LOG_MUTATION = ['talks', 'log'] as const;
const LECTURE_MUTATION = ['talks', 'lecture'] as const;

const fresh = async (sheets: SheetsAdapter, range: string): Promise<Values> => {
  const [values] = await sheets.batchGet(SHEET_IDS.lectures, [range]);
  return values ?? [];
};

/** Schritt-Änderung als neue Zeile in Talk-Schritte (Kopfzeile frisch gelesen, Reihenfolge nach Kopfzeile). */
export async function logStep(
  sheets: SheetsAdapter,
  entry: StepLogInput,
  today: Date,
): Promise<void> {
  const values = await fresh(sheets, RANGES.talks.steps);
  const header = requireColumns(values, ['Zeitpunkt', 'Talk', 'Schritt'], TABS.steps);
  const row = safeRow(stepLogRow(header, entry, today));
  checkCellLength(row);
  await sheets.append(SHEET_IDS.lectures, `${quoteTab(TABS.steps)}!A1`, row);
}

/** Gleicher Zellinhalt? Datumswerte zählen als gleich, wenn sie denselben Tag meinen (12.1.26 = 12.01.2026). */
function sameCell(col: string, a: string, b: string): boolean {
  if (a.trim() === b.trim()) return true;
  if (col !== 'Datum') return false;
  const da = parseDate(a);
  const db = parseDate(b);
  return !!da && !!db && +da === +db;
}

/**
 * Eckdaten ändern: Lectures frisch lesen, Zeile über den Talk-Schlüssel finden, nur geänderte Zellen schreiben.
 *
 * `expected` sind die Zellwerte, die das Formular beim Öffnen gesehen hat. Steht im Sheet inzwischen
 * etwas anderes (jemand hat dieselbe Zelle parallel geändert), wird nichts geschrieben: `conflict`.
 * So überschreibt niemand unbemerkt die Änderung einer anderen Person.
 */
export async function updateLecture(
  sheets: SheetsAdapter,
  key: string,
  set: Record<string, string>,
  expected?: Record<string, string>,
): Promise<void> {
  let found: ReturnType<typeof lectureChanges>;
  const values = await fresh(sheets, RANGES.talks.lectures);
  requireColumns(values, ['Datum', 'Speaker'], TABS.lectures);
  try {
    found = lectureChanges(values, key, set);
  } catch (e) {
    throw new SheetsError('invalid', e instanceof Error ? e.message : 'Eingabe ungültig.');
  }
  if (!found)
    throw new SheetsError(
      'row_missing',
      `Zeile für ${key} nicht gefunden. Neu laden und nochmal versuchen.`,
    );
  const current = values[found.row - 1] ?? [];
  for (const c of found.cells) {
    const before = expected?.[c.col];
    if (before !== undefined && !sameCell(c.col, String(current[c.index] ?? ''), before)) {
      throw new SheetsError(
        'conflict',
        `„${c.col}“ wurde inzwischen im Sheet geändert. Neu laden und nochmal versuchen.`,
      );
    }
  }
  await writeCells(
    sheets,
    SHEET_IDS.lectures,
    found.cells.map((c) => ({ a1: a1(TABS.lectures, c.index, found.row), value: c.value })),
  );
}

const today = (): Date => startOfDay(new Date());

/** Schritt-Zeile in der Anzeige: gleiche Spaltenlogik wie beim Schreiben. */
function withLogRow(data: TalksData, entry: StepLogInput, day: Date): TalksData {
  const header = headerOf(data.steps);
  if (header.length === 0) return data;
  return { ...data, steps: [...data.steps, stepLogRow(header, entry, day)] };
}

export interface LectureUpdate {
  key: string;
  set: Record<string, string>;
  /** Zellwerte beim Öffnen des Formulars (optional, für die Prüfung auf parallele Änderungen). */
  expected?: Record<string, string>;
}

export function useLogStep(callbacks: WriteCallbacks<StepLogInput, void> = {}) {
  const sheets = useSheets();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: LOG_MUTATION,
    mutationFn: (v: StepLogInput) => logStep(sheets, v, today()),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: TALKS_KEY });
      const previous = qc.getQueryData<TalksData>(TALKS_KEY);
      if (previous) qc.setQueryData<TalksData>(TALKS_KEY, withLogRow(previous, v, today()));
      return { previous };
    },
    onError: (err, v, ctx) => {
      if (ctx?.previous) qc.setQueryData(TALKS_KEY, ctx.previous);
      callbacks.onError?.(err, v);
    },
    onSuccess: (r, v) => callbacks.onSuccess?.(r, v),
    onSettled: () => settle(qc),
  });
}

export function useUpdateLecture(callbacks: WriteCallbacks<LectureUpdate, void> = {}) {
  const sheets = useSheets();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: LECTURE_MUTATION,
    mutationFn: (v: LectureUpdate) => updateLecture(sheets, v.key, v.set, v.expected),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: TALKS_KEY });
      const previous = qc.getQueryData<TalksData>(TALKS_KEY);
      if (previous) {
        try {
          qc.setQueryData<TalksData>(TALKS_KEY, {
            ...previous,
            lectures: withLectureCells(previous.lectures, v.key, v.set),
          });
        } catch {
          // ungültige Eingabe: keine optimistische Anzeige, das Schreiben meldet den Fehler
        }
      }
      return { previous };
    },
    onError: (err, v, ctx) => {
      if (ctx?.previous) qc.setQueryData(TALKS_KEY, ctx.previous);
      callbacks.onError?.(err, v);
    },
    onSuccess: (r, v) => callbacks.onSuccess?.(r, v),
    onSettled: () => settle(qc),
  });
}

const settle = (qc: QueryClient): void => invalidateWhenIdle(qc, ['talks'], TALKS_KEY);

/** Was gerade geschrieben wird: Schritte als `Talk|Schritt`, Eckdaten als Talk-Schlüssel. */
export function usePendingTalkWrites(): { steps: Set<string>; lectures: Set<string> } {
  const logs = useMutationState({
    filters: { mutationKey: LOG_MUTATION, status: 'pending' },
    select: (m) => m.state.variables as StepLogInput | undefined,
  });
  const lectures = useMutationState({
    filters: { mutationKey: LECTURE_MUTATION, status: 'pending' },
    select: (m) => (m.state.variables as LectureUpdate | undefined)?.key,
  });
  return {
    steps: new Set(logs.flatMap((l) => (l ? [stepId(l.talk, l.step)] : []))),
    lectures: new Set(lectures.filter((k): k is string => typeof k === 'string')),
  };
}

export const stepId = (talk: string, step: string): string => `${talk}|${step}`;
