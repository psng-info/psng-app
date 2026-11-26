import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void): (() => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

/** Ob der Browser eine Verbindung meldet. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** Hinweis für deaktivierte Schreib-Aktionen. */
export const OFFLINE_HINT = 'Offline: Änderungen sind erst mit Verbindung möglich.';
