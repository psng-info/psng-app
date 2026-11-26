import { STORAGE_KEY as AI_QUEUE_KEY } from '@/domain/ai/queue';
import { CACHE_DB } from './persist';

const deleteDb = (name: string): Promise<void> =>
  new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });

/**
 * Löscht alle lokalen Daten dieser Herkunft: IndexedDB-Datenbanken und Cache-Storage-Einträge.
 * Der Workbox-Precache (App-Hülle, keine Nutzerdaten) bleibt, sonst startet die App offline nicht mehr.
 * Wird beim Abmelden aufgerufen (CLAUDE.md: HR-Daten nie offline, beim Abmelden alles löschen).
 */
export async function clearAllLocalData(): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  try {
    localStorage.removeItem(AI_QUEUE_KEY);
  } catch {
    // localStorage gesperrt: nichts zu löschen
  }

  if (typeof indexedDB !== 'undefined') {
    // Den Lesecache immer ausdrücklich löschen: indexedDB.databases() gibt es nicht in jedem Browser.
    tasks.push(deleteDb(CACHE_DB));
    if (typeof indexedDB.databases === 'function') {
      tasks.push(
        indexedDB
          .databases()
          .then((dbs) =>
            Promise.all(dbs.map((db) => (db.name ? deleteDb(db.name) : Promise.resolve()))),
          )
          .catch(() => undefined),
      );
    }
  }

  if (typeof caches !== 'undefined') {
    tasks.push(
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((k) => !/precache/i.test(k)).map((k) => caches.delete(k))),
        )
        .catch(() => undefined),
    );
  }

  await Promise.all(tasks);
}
