/**
 * Löscht alle lokalen Daten dieser Herkunft: IndexedDB-Datenbanken und Cache-Storage-Einträge.
 * Der Workbox-Precache (App-Hülle, keine Nutzerdaten) bleibt, sonst startet die App offline nicht mehr.
 * Wird beim Abmelden aufgerufen (CLAUDE.md: HR-Daten nie offline, beim Abmelden alles löschen).
 */
export async function clearAllLocalData(): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
    tasks.push(
      indexedDB
        .databases()
        .then((dbs) =>
          Promise.all(
            dbs.map(
              (db) =>
                new Promise<void>((resolve) => {
                  if (!db.name) return resolve();
                  const req = indexedDB.deleteDatabase(db.name);
                  req.onsuccess = req.onerror = req.onblocked = () => resolve();
                }),
            ),
          ),
        )
        .catch(() => undefined),
    );
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
