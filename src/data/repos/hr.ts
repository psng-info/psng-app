import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkEdit, cellText, type HrRaw, type HrSet } from '@/domain/hr';
import { headerOf, rowsOf, type Values } from '@/domain/rows';
import { norm } from '@/domain/text';
import { useSheets } from '../AdapterContext';
import { RANGES, SHEET_IDS, STALE_MS, TABS } from '../config';
import { SheetsError, type SheetsAdapter } from '../sheets/SheetsAdapter';
import { a1, requireColumns } from '../sheets/table';

export const HR_QUERY_KEY = ['hr'] as const;
/** HR-Daten sind personenbezogen: nie offline speichern, auch nicht über Persister. */
export const HR_META = { persist: false } as const;
const HR_REFETCH_MS = 15 * 60_000;

/** Ein batchGet für die vier HR-Tabs. Das Modell baut `buildPeople` in der Domain. */
export function useHrData() {
  const sheets = useSheets();
  return useQuery({
    queryKey: HR_QUERY_KEY,
    meta: HR_META,
    staleTime: STALE_MS.hr,
    refetchInterval: HR_REFETCH_MS,
    queryFn: async (): Promise<HrRaw> => {
      const r = RANGES.hr;
      const [kandidaten, abbrueche, formular, notizen] = await sheets.batchGet(SHEET_IDS.hr, [
        r.kandidaten,
        r.abbrueche,
        r.formular,
        r.notizen,
      ]);
      return {
        kandidaten: kandidaten ?? [],
        abbrueche: abbrueche ?? [],
        formular: formular ?? [],
        notizen: notizen ?? [],
      };
    },
  });
}

const nameOf = (row: Record<string, string | number>) =>
  norm([row['Vorname'], row['Nachname']].filter(Boolean).join(' '));

/** Sheet-Zeilennummer der Person im Tab Kandidaten. Wirft, wenn sie fehlt oder der Name doppelt vorkommt. */
export function findCandidateRow(values: Values, name: string): number {
  const target = norm(name);
  const hits = rowsOf(values).filter((r) => nameOf(r) === target);
  if (hits.length !== 1) {
    throw new SheetsError(
      'row_missing',
      hits.length === 0
        ? 'Zeile in Kandidaten nicht gefunden. Neu laden und nochmal versuchen.'
        : 'Name kommt in Kandidaten mehrfach vor. Bitte im Sheet ändern.',
    );
  }
  return hits[0]?._row ?? 0;
}

/**
 * Schreibt einzelne Zellen in den Tab Kandidaten. Liest die Tabelle vorher frisch,
 * findet die Zeile über den Namen und die Spalten über die Kopfzeile. Nie für Abbrüche.
 */
export async function writeCandidate(
  sheets: SheetsAdapter,
  name: string,
  set: HrSet,
): Promise<void> {
  const edit = checkEdit(set);
  const cols = Object.keys(edit);
  if (cols.length === 0) return;
  const [fresh] = await sheets.batchGet(SHEET_IDS.hr, [RANGES.hr.kandidaten]);
  const values = fresh ?? [];
  const header = requireColumns(values, ['Vorname', 'Nachname', ...cols], TABS.kandidaten);
  const row = findCandidateRow(values, name);
  for (const [col, v] of Object.entries(edit)) {
    await sheets.updateCell(SHEET_IDS.hr, a1(TABS.kandidaten, header.indexOf(col), row), v);
  }
}

/** Wendet eine Änderung auf eine Kopie der Rohwerte an (für optimistische Anzeige). */
export function applyEdit(values: Values, name: string, set: HrSet): Values {
  const edit = checkEdit(set);
  const header = headerOf(values);
  const row = findCandidateRow(values, name);
  const next = values.map((r) => [...r]);
  const cells = (next[row - 1] ??= []);
  for (const [col, v] of Object.entries(edit)) {
    const ci = header.indexOf(col);
    if (ci < 0) continue;
    while (cells.length <= ci) cells.push('');
    cells[ci] = cellText(v);
  }
  return next;
}

export interface UpdateCandidate {
  /** Person laut Modell (nur zur Zuordnung, nicht zum Schreiben). */
  key: string;
  /** Anzeigename, daraus wird die Zeile gefunden. */
  name: string;
  set: HrSet;
}

const MUTATION_KEY = ['hr', 'update'] as const;

/** Schreibt Änderungen an einer Kandidat:in. Optimistisch, bei Fehler Rücksetzen auf den alten Stand. */
export function useUpdateCandidate() {
  const sheets = useSheets();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: ({ name, set }: UpdateCandidate) => writeCandidate(sheets, name, set),
    onMutate: async ({ name, set }) => {
      await qc.cancelQueries({ queryKey: HR_QUERY_KEY });
      const previous = qc.getQueryData<HrRaw>(HR_QUERY_KEY);
      if (previous) {
        try {
          qc.setQueryData<HrRaw>(HR_QUERY_KEY, {
            ...previous,
            kandidaten: applyEdit(previous.kandidaten, name, set),
          });
        } catch {
          // Zeile im Cache nicht eindeutig: keine optimistische Anzeige, das Schreiben prüft selbst.
        }
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(HR_QUERY_KEY, ctx.previous);
    },
    onSettled: () => {
      // Erst neu lesen, wenn keine weitere Änderung unterwegs ist (sonst überschreibt es deren Anzeige).
      if (qc.isMutating({ mutationKey: MUTATION_KEY }) <= 1) {
        void qc.invalidateQueries({ queryKey: HR_QUERY_KEY });
      }
    },
  });
}
