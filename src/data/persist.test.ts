import { QueryClient } from '@tanstack/react-query';
import { dehydrate } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAllLocalData } from './clearLocal';
import { HR_META, HR_QUERY_KEY } from './repos/hr';
import { CACHE_DB, shouldPersist } from './persist';

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
