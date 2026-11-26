import type { Query } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

/** Name der IndexedDB-Datenbank für den Lesecache. `clearAllLocalData` löscht sie beim Abmelden. */
export const CACHE_DB = 'psng-orga-cache';
const STORE = 'cache';
const KEY = 'query-client';

/** 7 Tage, danach wird der Cache verworfen. */
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/** Schlüssel-Anfänge, die offline gespeichert werden dürfen. HR ist bewusst nicht dabei (CLAUDE.md). */
export const PERSISTED_KEYS: readonly string[] = ['talks', 'todos', 'access'];

/** Cache-Buster: bei neuer App-Version wird der alte Cache verworfen. */
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? 'dev';

/**
 * Was der Lesecache speichern darf. Schreibaktionen nie: TanStack würde sonst offline pausierte
 * Änderungen (z. B. an Kandidat:innen, mit Namen und Kommentar) in IndexedDB ablegen.
 */
export const DEHYDRATE_OPTIONS = {
  shouldDehydrateQuery: (q: Pick<Query, 'queryKey' | 'state' | 'meta'>) => shouldPersist(q),
  shouldDehydrateMutation: () => false,
} as const;

/** Spalten mit Telefonnummern (Tab Speaker bzw. Speaker-Formular), Anfang des Kopfzeilen-Namens. */
const PHONE_PREFIXES = ['Telefon', 'Handynummer'];

/** Kopie der Rohwerte, in der Telefonnummern-Spalten leer sind (Kopfzeile bleibt). */
function withoutPhones(values: unknown): unknown {
  if (!Array.isArray(values) || !Array.isArray(values[0])) return values;
  const rows = values as unknown[][];
  const head = (rows[0] ?? []).map((h) => String(h).trim());
  const drop = head.flatMap((h, i) => (PHONE_PREFIXES.some((p) => h.startsWith(p)) ? [i] : []));
  if (drop.length === 0) return values;
  return rows.map((r, i) => (i === 0 ? r : r.map((c, j) => (drop.includes(j) ? '' : c))));
}

/**
 * Vor dem Speichern: Telefonnummern von Speaker:innen nicht offline ablegen (Datenschutz, nur auf Klick
 * sichtbar). Nach dem Neuladen fehlen sie, bis die Talks frisch geladen sind (passiert beim Start).
 */
export function scrubForStorage(client: PersistedClient): PersistedClient {
  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries.map((q) => {
        if (q.queryKey[0] !== 'talks' || !q.state.data || typeof q.state.data !== 'object')
          return q;
        const data = q.state.data as Record<string, unknown>;
        return {
          ...q,
          state: {
            ...q.state,
            data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, withoutPhones(v)])),
          },
        };
      }),
    },
  };
}

/** Nur erfolgreiche Abfragen auf der Liste, und nie solche mit `meta: { persist: false }`. */
export function shouldPersist(query: Pick<Query, 'queryKey' | 'state' | 'meta'>): boolean {
  if (query.state.status !== 'success') return false;
  if (query.meta?.persist === false) return false;
  const head = query.queryKey[0];
  return typeof head === 'string' && PERSISTED_KEYS.includes(head);
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CACHE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB nicht verfügbar'));
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB-Fehler'));
    });
  } finally {
    db.close();
  }
}

/** Kleiner IndexedDB-Persister. Fehler (Privatmodus, kein IndexedDB) machen den Cache still wirkungslos. */
export function createIdbPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await run('readwrite', (s) => s.put(scrubForStorage(client), KEY));
      } catch {
        /* Cache ist optional */
      }
    },
    restoreClient: async () => {
      try {
        return await run<PersistedClient | undefined>(
          'readonly',
          (s) => s.get(KEY) as IDBRequest<PersistedClient | undefined>,
        );
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await run('readwrite', (s) => s.delete(KEY));
      } catch {
        /* nichts zu tun */
      }
    },
  };
}
