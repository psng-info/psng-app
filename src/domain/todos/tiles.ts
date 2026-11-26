import type { ConflictFn, Todo } from './types';

export interface Tile {
  key: string;
  label: string;
  /** crit = rot, warn = gelb, sonst neutral. Die Bedeutung steht immer auch im Text. */
  level?: 'crit' | 'warn';
  test: (t: Todo) => boolean;
}

/**
 * Lage-Kacheln. Mit `conflict` (vom HR-Feature) kommt „Widerspruch HR“ vor „Abgeschlossen“ dazu.
 * Ohne `conflict` fehlt die Kachel.
 */
export function tilesFor(conflict?: ConflictFn): Tile[] {
  const tiles: Tile[] = [
    { key: 'late', label: 'Überfällig', level: 'crit', test: (t) => t.late },
    { key: 'week', label: 'Fällig in 7 Tagen', level: 'warn', test: (t) => t.week },
    { key: 'a', label: 'Prio A offen', level: 'crit', test: (t) => !t.isDone && t.prio === 'A' },
    { key: 'self', label: 'Selbst tun', test: (t) => !t.isDone && t.mode === 'selbst' },
    { key: 'wait', label: 'Wartet auf andere', level: 'warn', test: (t) => t.waiting },
  ];
  if (conflict) {
    tiles.push({
      key: 'hr',
      label: 'Widerspruch HR',
      level: 'crit',
      test: (t) => !t.isDone && conflict(t) !== null,
    });
  }
  tiles.push({ key: 'done', label: 'Abgeschlossen', test: (t) => t.isDone });
  return tiles;
}

/** Kacheln ohne HR. */
export const TILES: readonly Tile[] = tilesFor();
