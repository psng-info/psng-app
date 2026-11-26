import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RANGES, SHEET_IDS } from '../config';
import type { SheetsAdapter } from '../sheets/SheetsAdapter';
import { SheetsError } from '../sheets/SheetsAdapter';
import { parseCell, splitRange } from '../sheets/table';
import {
  applyEdit,
  findCandidateRow,
  HR_QUERY_KEY,
  useHrData,
  useUpdateCandidate,
  writeCandidate,
} from './hr';

const HEAD = ['Vorname', 'Nachname', 'Pipeline-Status', 'E-Mail', 'Buddy', '1:1 am', 'Integriert'];
const KAND = [
  HEAD,
  ['Anna', 'Alt', 'Neu eingegangen', 'a@x.org', '', '', 'FALSE'],
  ['Ben', 'Bunt', 'Review', 'b@x.org', 'Meta', '', 'FALSE'],
];

class Fake implements SheetsAdapter {
  writes: [string, string | boolean][] = [];
  reads = 0;
  fail = false;
  kand: string[][];
  constructor(kand = KAND) {
    this.kand = kand.map((r) => [...r]);
  }
  batchGet(_id: string, ranges: string[]) {
    this.reads++;
    return Promise.resolve(
      ranges.map((r) => (r === RANGES.hr.kandidaten ? this.kand.map((x) => [...x]) : [['x']])),
    );
  }
  updateCell(_id: string, a1: string, v: string | boolean) {
    if (this.fail) return Promise.reject(new SheetsError('forbidden', 'Keine Freigabe.'));
    this.writes.push([a1, v]);
    const cell = parseCell(splitRange(a1).cells);
    if (cell)
      (this.kand[cell.row - 1] ??= [])[cell.col] =
        typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : v;
    return Promise.resolve();
  }
  append() {
    return Promise.resolve(null);
  }
}

let current: Fake = new Fake();
vi.mock('../AdapterContext', () => ({ useSheets: () => current }));

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const W = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, W };
}

describe('writeCandidate', () => {
  it('liest frisch, findet Zeile über den Namen und schreibt einzelne Zellen', async () => {
    const f = new Fake();
    await writeCandidate(f, ' ben  BUNT ', { 'Pipeline-Status': 'Core', Integriert: true });
    expect(f.reads).toBe(1);
    expect(f.writes).toEqual([
      ['Kandidaten!C3', 'Core'],
      ['Kandidaten!G3', true],
    ]);
  });
  it('lehnt nicht erlaubte Spalten und Status ab, ohne zu lesen oder zu schreiben', async () => {
    const f = new Fake();
    await expect(writeCandidate(f, 'Ben Bunt', { 'E-Mail': 'x' } as never)).rejects.toThrow();
    await expect(writeCandidate(f, 'Ben Bunt', { 'Pipeline-Status': 'Abbruch' })).rejects.toThrow();
    expect(f.reads).toBe(0);
    expect(f.writes).toEqual([]);
  });
  it('unbekannte Person: row_missing, nichts geschrieben', async () => {
    const f = new Fake();
    await expect(writeCandidate(f, 'Zoe Zorn', { Buddy: 'X' })).rejects.toMatchObject({
      kind: 'row_missing',
    });
    expect(f.writes).toEqual([]);
  });
  it('fehlende Spalte im Sheet: missing_column', async () => {
    const f = new Fake([
      ['Vorname', 'Nachname'],
      ['Ben', 'Bunt'],
    ]);
    await expect(writeCandidate(f, 'Ben Bunt', { Buddy: 'X' })).rejects.toMatchObject({
      kind: 'missing_column',
    });
  });
  it('doppelter Name: Fehler statt raten', () => {
    expect(() => findCandidateRow([...KAND, ['Ben', 'Bunt']], 'Ben Bunt')).toThrow(/mehrfach/);
  });
  it('sichert Formel-Anfänge in Texten', async () => {
    const f = new Fake([
      [...HEAD, 'Kommentar'],
      ['Anna', 'Alt', '', '', '', '', '', ''],
    ]);
    await writeCandidate(f, 'Anna Alt', { Kommentar: '-ruft zurück' });
    expect(f.writes).toEqual([['Kandidaten!H2', "'-ruft zurück"]]);
  });
  it('schreibt Datum als TT.MM.JJJJ', async () => {
    const f = new Fake();
    await writeCandidate(f, 'Anna Alt', { '1:1 am': '3.12.2026' });
    expect(f.writes).toEqual([['Kandidaten!F2', '03.12.2026']]);
  });
});

describe('applyEdit', () => {
  it('setzt Zellen in einer Kopie, Booleans als TRUE/FALSE, kurze Zeilen werden aufgefüllt', () => {
    const vals = [HEAD, ['Ben', 'Bunt']];
    const out = applyEdit(vals, 'Ben Bunt', { Integriert: true, Buddy: 'Eric' });
    expect(out[1]).toEqual(['Ben', 'Bunt', '', '', 'Eric', '', 'TRUE']);
    expect(vals[1]).toEqual(['Ben', 'Bunt']);
  });
});

describe('Hooks', () => {
  it('useHrData: ein batchGet, Query-Key hr, nicht persistieren', async () => {
    current = new Fake();
    const { client, W } = wrapper();
    const { result } = renderHook(() => useHrData(), { wrapper: W });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(current.reads).toBe(1);
    expect(Object.keys(result.current.data ?? {})).toEqual([
      'kandidaten',
      'abbrueche',
      'formular',
      'notizen',
    ]);
    expect(client.getQueryCache().find({ queryKey: HR_QUERY_KEY })?.meta).toEqual({
      persist: false,
    });
    expect(SHEET_IDS.hr).toBeTruthy();
  });

  it('useUpdateCandidate: optimistisch, schreibt, liest danach neu', async () => {
    current = new Fake();
    const { client, W } = wrapper();
    const data = renderHook(() => useHrData(), { wrapper: W });
    await waitFor(() => expect(data.result.current.isSuccess).toBe(true));
    const m = renderHook(() => useUpdateCandidate(), { wrapper: W });
    act(() => {
      m.result.current.mutate({ key: 'p-ben_bunt', name: 'Ben Bunt', set: { Integriert: true } });
    });
    await waitFor(() =>
      expect(
        client.getQueryData<{ kandidaten: string[][] }>(HR_QUERY_KEY)?.kandidaten[2]?.[6],
      ).toBe('TRUE'),
    );
    await waitFor(() => expect(m.result.current.isSuccess).toBe(true));
    expect(current.writes).toEqual([['Kandidaten!G3', true]]);
  });

  it('Fehler: Rollback auf den alten Stand', async () => {
    current = new Fake();
    current.fail = true;
    const { client, W } = wrapper();
    const data = renderHook(() => useHrData(), { wrapper: W });
    await waitFor(() => expect(data.result.current.isSuccess).toBe(true));
    const m = renderHook(() => useUpdateCandidate(), { wrapper: W });
    act(() => {
      m.result.current.mutate({ key: 'p-ben_bunt', name: 'Ben Bunt', set: { Integriert: true } });
    });
    await waitFor(() => expect(m.result.current.isError).toBe(true));
    await waitFor(() =>
      expect(
        client.getQueryData<{ kandidaten: string[][] }>(HR_QUERY_KEY)?.kandidaten[2]?.[6],
      ).toBe('FALSE'),
    );
  });
});
