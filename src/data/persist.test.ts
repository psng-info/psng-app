import { QueryClient } from '@tanstack/react-query';
import { dehydrate } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAllLocalData } from './clearLocal';
import { HR_META, HR_QUERY_KEY } from './repos/hr';
import { CACHE_DB, DEHYDRATE_OPTIONS, scrubForStorage, shouldPersist } from './persist';

function clientWith(entries: { key: readonly unknown[]; meta?: Record<string, unknown> }[]) {
  const qc = new QueryClient();
  for (const e of entries) {
    qc.getQueryCache()
      .build(qc, { queryKey: e.key, ...(e.meta ? { meta: e.meta } : {}) })
      .setData({ rows: 1 });
  }
  return qc;
}

describe('Lesecache: was gespeichert wird', () => {
  it('speichert talks, todos und Zugangsliste', () => {
    const qc = clientWith([{ key: ['talks'] }, { key: ['todos'] }, { key: ['access', 'a@b.de'] }]);
    const keys = dehydrate(qc, { shouldDehydrateQuery: shouldPersist }).queries.map(
      (q) => q.queryKey[0],
    );
    expect(keys.sort()).toEqual(['access', 'talks', 'todos']);
  });

  it('speichert HR-Daten nie', () => {
    const qc = clientWith([{ key: HR_QUERY_KEY, meta: HR_META }, { key: ['todos'] }]);
    const keys = dehydrate(qc, { shouldDehydrateQuery: shouldPersist }).queries.map(
      (q) => q.queryKey[0],
    );
    expect(keys).toEqual(['todos']);
  });

  it('HR bleibt auch ohne Meta draußen, meta persist:false schlägt jeden Schlüssel', () => {
    const qc = clientWith([{ key: ['hr'] }, { key: ['talks'], meta: { persist: false } }]);
    expect(dehydrate(qc, { shouldDehydrateQuery: shouldPersist }).queries).toEqual([]);
  });

  it('speichert keine fehlgeschlagenen oder offenen Abfragen', () => {
    const qc = new QueryClient();
    void qc.prefetchQuery({ queryKey: ['talks'], queryFn: () => new Promise(() => undefined) });
    expect(dehydrate(qc, { shouldDehydrateQuery: shouldPersist }).queries).toEqual([]);
  });
});

describe('Lesecache: Schreibaktionen und Telefonnummern', () => {
  it('speichert keine (offline pausierten) Schreibaktionen, auch nicht für HR', () => {
    const qc = new QueryClient();
    // So sieht eine Mutation aus, die TanStack offline pausiert hat (Standard: sie würde gespeichert).
    qc.getMutationCache().build(
      qc,
      { mutationKey: ['hr', 'update'], mutationFn: () => Promise.resolve() },
      {
        context: undefined,
        data: undefined,
        error: null,
        failureCount: 0,
        failureReason: null,
        isPaused: true,
        status: 'pending',
        variables: { name: 'X' },
        submittedAt: 0,
      },
    );
    expect(dehydrate(qc).mutations).toHaveLength(1);
    expect(dehydrate(qc, DEHYDRATE_OPTIONS).mutations).toEqual([]);
  });

  it('leert Telefonnummern von Speaker:innen vor dem Speichern, der Rest bleibt', () => {
    const qc = new QueryClient();
    qc.setQueryData(['talks'], {
      lectures: [
        ['Datum', 'Speaker'],
        ['01.12.2026', 'Anna'],
      ],
      speakers: [
        ['Name', 'E-Mail', 'Telefon'],
        ['Anna', 'a@example.org', "'+49 170 000"],
      ],
      speakerForm: [
        ['Vollständiger Name', 'Handynummer / Phone'],
        ['Anna', '0170 000'],
      ],
    });
    qc.setQueryData(
      ['todos'],
      [
        ['ID', 'Telefon'],
        ['T01', 'bleibt'],
      ],
    );
    const out = scrubForStorage({
      timestamp: 0,
      buster: '',
      clientState: dehydrate(qc, DEHYDRATE_OPTIONS),
    });
    const talks = out.clientState.queries.find((q) => q.queryKey[0] === 'talks')?.state.data as {
      speakers: string[][];
      speakerForm: string[][];
      lectures: string[][];
    };
    expect(talks.speakers).toEqual([
      ['Name', 'E-Mail', 'Telefon'],
      ['Anna', 'a@example.org', ''],
    ]);
    expect(talks.speakerForm[1]).toEqual(['Anna', '']);
    expect(talks.lectures[1]).toEqual(['01.12.2026', 'Anna']);
    // Original im Speicher bleibt unverändert
    expect(qc.getQueryData<{ speakers: string[][] }>(['talks'])?.speakers[1]?.[2]).toBe(
      "'+49 170 000",
    );
    const todos = out.clientState.queries.find((q) => q.queryKey[0] === 'todos')?.state.data;
    expect(todos).toEqual([
      ['ID', 'Telefon'],
      ['T01', 'bleibt'],
    ]);
  });
});

describe('clearAllLocalData', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('löscht die Cache-Datenbank, auch wenn indexedDB.databases() fehlt', async () => {
    const deleted: string[] = [];
    vi.stubGlobal('indexedDB', {
      deleteDatabase: (name: string) => {
        deleted.push(name);
        const req: { onsuccess?: () => void } = {};
        queueMicrotask(() => req.onsuccess?.());
        return req;
      },
    });
    await clearAllLocalData();
    expect(deleted).toContain(CACHE_DB);
  });

  it('löscht alle gelisteten Datenbanken', async () => {
    const deleted: string[] = [];
    vi.stubGlobal('indexedDB', {
      databases: () => Promise.resolve([{ name: CACHE_DB }, { name: 'andere' }]),
      deleteDatabase: (name: string) => {
        deleted.push(name);
        const req: { onsuccess?: () => void } = {};
        queueMicrotask(() => req.onsuccess?.());
        return req;
      },
    });
    await clearAllLocalData();
    expect(deleted).toEqual(expect.arrayContaining([CACHE_DB, 'andere']));
  });
});
