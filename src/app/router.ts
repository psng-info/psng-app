import { useSyncExternalStore } from 'react';

export type View = 'talks' | 'todos' | 'kandidaten';
export interface Route {
  view: View;
  param?: string;
}

/** Wandelt einen Hash wie `#/talks/abc` oder `#/todos/T07` in eine Route um. Unbekanntes führt zu `talks`. */
export function parseHash(hash: string): Route {
  const [, first, second] = hash.replace(/^#/, '').split('/');
  if (first === 'todos') {
    if (!second) return { view: 'todos' };
    try {
      return { view: 'todos', param: decodeURIComponent(second) };
    } catch {
      return { view: 'todos' };
    }
  }
  if (first === 'kandidaten') return { view: 'kandidaten' };
  if (first === 'talks' && second) {
    try {
      return { view: 'talks', param: decodeURIComponent(second) };
    } catch {
      return { view: 'talks' };
    }
  }
  return { view: 'talks' };
}

export function navigate(view: View, param?: string): void {
  window.location.hash = param ? `#/${view}/${encodeURIComponent(param)}` : `#/${view}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const getHash = () => window.location.hash;

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash);
  return parseHash(hash);
}
