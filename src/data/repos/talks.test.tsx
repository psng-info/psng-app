import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { headerOf, type Values } from '@/domain/rows';
import { STEP_HEADERS, table } from '@/domain/talks/test-helpers';
import { RANGES } from '../config';
import { SheetsError, type SheetsAdapter } from '../sheets/SheetsAdapter';
import { parseCell, splitRange } from '../sheets/table';
import {
  logStep,
  TALKS_KEY,
  updateLecture,
  useLogStep,
  useTalksData,
  useUpdateLecture,
  type TalksData,
} from './talks';

const TODAY = new Date(2026, 10, 26);
const LHEAD = ['Datum', 'Titel', 'Speaker', 'Status', 'Ort', 'TN vor Ort', 'TN gesamt', 'Notizen'];
const LECTURES: Values = [
  LHEAD,
  ['03.12.2026', 'T1', 'Anna Beispiel', 'fix', '', '', '', ''],
  ['10.12.2026', 'T2', 'Bernd Muster', 'Idee', 'Raum 1', '5', '5', ''],
];
const KEY = '10.12.2026 · Bernd Muster';

class Fake implements SheetsAdapter {
  writes: [string, string | boolean][] = [];
  appends: [string, (string | boolean)[]][] = [];
  reads = 0;
  fail = false;
  lectures: Values = LECTURES.map((r) => [...r]);
  steps: Values = table(STEP_HEADERS, []);
  batchGet(_id: string, ranges: string[]) {
    this.reads++;
    return Promise.resolve(
      ranges.map((r) =>
        r === RANGES.talks.lectures
          ? this.lectures.map((x) => [...x])
          : r === RANGES.talks.steps
            ? this.steps.map((x) => [...x])
            : [['x']],
      ),
    );
  }
  updateCell(_id: string, a1: string, v: string | boolean) {
    if (this.fail) return Promise.reject(new SheetsError('forbidden', 'Keine Freigabe.'));
    this.writes.push([a1, v]);
    const cell = parseCell(splitRange(a1).cells);
    if (cell) (this.lectures[cell.row - 1] ??= [])[cell.col] = String(v);
    return Promise.resolve();
  }
  append(_id: string, range: string, row: (string | boolean)[]) {
    if (this.fail) return Promise.reject(new SheetsError('forbidden', 'Keine Freigabe.'));
    this.appends.push([range, row]);
    this.steps.push(row.map(String));
    return Promise.resolve(this.steps.length);
  }
}

describe('logStep', () => {
  it('hängt eine Zeile in Kopfzeilen-Reihenfolge an Talk-Schritte an', async () => {
    const f = new Fake();
    await logStep(
      f,
      {
        talk: KEY,
        step: 'Raum/Zoom',
        status: 'erledigt',
        owner: 'Eric',
        note: 'ok',
        by: 'Lennert',
      },
      TODAY,
    );
    expect(f.reads).toBe(1);
    expect(f.appends).toEqual([
      ["'Talk-Schritte'!A1", ['26.11.2026', KEY, 'Raum/Zoom', 'erledigt', 'Eric', 'Lennert', 'ok']],
    ]);
  });
  it('folgt einer anderen Spaltenreihenfolge, sichert Formel-Anfänge, leerer Status bleibt leer', async () => {
    const f = new Fake();
    f.steps = [['Schritt', 'Talk', 'Zeitpunkt', 'Notiz', 'Status', 'Owner', 'Von']];
    await logStep(
      f,
      { talk: KEY, step: 'Apero', status: '', owner: '', note: '=1+1', by: 'Anna' },
      TODAY,
    );
    expect(f.appends[0]?.[1]).toEqual(['Apero', KEY, '26.11.2026', "'=1+1", '', '', 'Anna']);
  });
  it('Spalte fehlt: missing_column, nichts geschrieben', async () => {
    const f = new Fake();
    f.steps = [['Zeitpunkt', 'Talk']];
    await expect(
      logStep(f, { talk: KEY, step: 'x', status: '', owner: '', note: '', by: '' }, TODAY),
    ).rejects.toMatchObject({ kind: 'missing_column' });
    expect(f.appends).toEqual([]);
  });
});

describe('updateLecture', () => {
  it('liest frisch, findet die Zeile über den Schlüssel, schreibt nur geänderte Zellen nach Namen', async () => {
    const f = new Fake();
    await updateLecture(f, KEY, { Status: 'durchgeführt', Ort: 'Raum 1', Notizen: '-neu' });
    expect(f.reads).toBe(1);
    expect(f.writes).toEqual([
      ['Lectures!D3', 'durchgeführt'],
      ['Lectures!H3', "'-neu"],
    ]);
  });
  it('findet die Zeile auch nach Umsortieren, Spalten fehlend im Sheet werden übersprungen', async () => {
    const f = new Fake();
    f.lectures = [LHEAD, [...(LECTURES[2] ?? [])], [...(LECTURES[1] ?? [])]];
    await updateLecture(f, KEY, { Status: 'fix', Uhrzeit: '18:00' });
    expect(f.writes).toEqual([['Lectures!D2', 'fix']]);
  });
  it('schreibt Datum als TT.MM.JJJJ', async () => {
    const f = new Fake();
    await updateLecture(f, KEY, { Datum: '2026-12-11' });
    expect(f.writes).toEqual([['Lectures!A3', '11.12.2026']]);
  });
  it('Speaker und TN gesamt sind gesperrt', async () => {
    const f = new Fake();
    await expect(updateLecture(f, KEY, { Speaker: 'X' })).rejects.toThrow(/nicht erlaubt/);
    await expect(updateLecture(f, KEY, { 'TN gesamt': '9' })).rejects.toThrow(/nicht erlaubt/);
    expect(f.writes).toEqual([]);
  });
  it('Zahlenfeld mit Text wird abgelehnt', async () => {
    const f = new Fake();
    await expect(updateLecture(f, KEY, { 'TN vor Ort': 'viele' })).rejects.toThrow(/Zahl/);
  });
  it('Zeile nicht gefunden: row_missing mit klarer Meldung', async () => {
    const f = new Fake();
    const err = await updateLecture(f, '01.01.2027 · Zoe', { Status: 'fix' }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(SheetsError);
    expect((err as SheetsError).kind).toBe('row_missing');
    expect((err as SheetsError).message).toBe(
      'Zeile für 01.01.2027 · Zoe nicht gefunden. Neu laden und nochmal versuchen.',
    );
    expect(f.writes).toEqual([]);
  });
});

describe('updateLecture: parallele Änderungen', () => {
  it('Zelle seit dem Öffnen unverändert: wird geschrieben', async () => {
    const f = new Fake();
    await updateLecture(f, KEY, { Status: 'fix' }, { Status: 'Idee' });
    expect(f.writes).toEqual([['Lectures!D3', 'fix']]);
  });
  it('jemand hat dieselbe Zelle inzwischen geändert: conflict, nichts geschrieben', async () => {
    const f = new Fake();
    const err = await updateLecture(
      f,
      KEY,
      { Status: 'fix', Ort: 'Raum 9' },
      { Status: 'angefragt', Ort: 'Raum 1' },
    ).catch((e: unknown) => e);
    expect((err as SheetsError).kind).toBe('conflict');
    expect((err as SheetsError).message).toBe(
      '„Status“ wurde inzwischen im Sheet geändert. Neu laden und nochmal versuchen.',
    );
    expect(f.writes).toEqual([]);
  });
  it('Datum in anderer Schreibweise gilt als unverändert', async () => {
    const f = new Fake();
    await updateLecture(f, KEY, { Datum: '2026-12-11' }, { Datum: '10.12.26' });
    expect(f.writes).toEqual([['Lectures!A3', '11.12.2026']]);
  });
});

let current = new Fake();
vi.mock('../AdapterContext', () => ({ useSheets: () => current }));

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const W = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, W };
}

describe('Hooks', () => {
  it('useUpdateLecture: optimistisch, schreibt, liest danach neu', async () => {
    current = new Fake();
    const { client, W } = wrapper();
    const data = renderHook(() => useTalksData(), { wrapper: W });
    await waitFor(() => expect(data.result.current.isSuccess).toBe(true));
    const m = renderHook(() => useUpdateLecture(), { wrapper: W });
    act(() => m.result.current.mutate({ key: KEY, set: { Status: 'fix' } }));
    await waitFor(() => {
      const d = client.getQueryData<TalksData>(TALKS_KEY);
      expect(d?.lectures[2]?.[3]).toBe('fix');
    });
    await waitFor(() => expect(m.result.current.isSuccess).toBe(true));
    expect(current.writes).toEqual([['Lectures!D3', 'fix']]);
  });

  it('useUpdateLecture: Fehler setzt den alten Stand zurück', async () => {
    current = new Fake();
    current.fail = true;
    const { client, W } = wrapper();
    const data = renderHook(() => useTalksData(), { wrapper: W });
    await waitFor(() => expect(data.result.current.isSuccess).toBe(true));
    const onError = vi.fn();
    const m = renderHook(() => useUpdateLecture({ onError }), { wrapper: W });
    act(() => m.result.current.mutate({ key: KEY, set: { Status: 'fix' } }));
    await waitFor(() => expect(m.result.current.isError).toBe(true));
    expect(onError).toHaveBeenCalled();
    await waitFor(() =>
      expect(client.getQueryData<TalksData>(TALKS_KEY)?.lectures[2]?.[3]).toBe('Idee'),
    );
  });

  it('useLogStep: Zeile erscheint sofort im Cache, Fehler rollt zurück', async () => {
    current = new Fake();
    const { client, W } = wrapper();
    const data = renderHook(() => useTalksData(), { wrapper: W });
    await waitFor(() => expect(data.result.current.isSuccess).toBe(true));
    const m = renderHook(() => useLogStep(), { wrapper: W });
    const entry = { talk: KEY, step: 'Apero', status: 'erledigt', owner: '', note: '', by: 'A' };
    act(() => m.result.current.mutate(entry));
    await waitFor(() => expect(m.result.current.isSuccess).toBe(true));
    expect(current.appends).toHaveLength(1);

    current.fail = true;
    act(() => m.result.current.mutate(entry));
    await waitFor(() => expect(m.result.current.isError).toBe(true));
    await waitFor(() =>
      expect(headerOf(client.getQueryData<TalksData>(TALKS_KEY)?.steps ?? [])).toContain('Talk'),
    );
    expect(client.getQueryData<TalksData>(TALKS_KEY)?.steps).toHaveLength(2);
  });
});
