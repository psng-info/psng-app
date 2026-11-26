import { norm } from '@/domain/text';
import { cell } from '@/domain/talks/steps';
import { TALK_TILES } from '@/domain/talks/model';
import type { Talk } from '@/domain/talks/types';

export type When = '' | 'up' | 'past' | 'nodate';

export interface TalkFilters {
  q: string;
  tile: string;
  when: When;
  series: string;
  status: string;
  owner: string;
}

export const NO_FILTERS: TalkFilters = {
  q: '',
  tile: '',
  when: '',
  series: '',
  status: '',
  owner: '',
};

export const WHEN_LABEL: Record<Exclude<When, ''>, string> = {
  up: 'anstehend',
  past: 'vergangen',
  nodate: 'ohne Termin',
};

export const hasActiveFilter = (f: TalkFilters): boolean => Object.values(f).some(Boolean);

/** Owner im Lectures-Sheet plus Owner offener Schritte. */
export function ownersOf(t: Talk): string[] {
  const set = new Set(
    [
      cell(t.raw, 'Owner'),
      ...t.steps.filter((s) => s.status === 'open').map((s) => s.owner),
    ].filter(Boolean),
  );
  return [...set];
}

export const whenOf = (t: Talk): Exclude<When, ''> =>
  t.dd === null ? 'nodate' : t.dd >= 0 ? 'up' : 'past';

/** Sucht in allen Spalten des Talks und seiner Speaker. Kontaktdaten (E-Mail, Telefon) zählen nicht mit. */
function searchText(t: Talk): string {
  const own = Object.entries(t.raw)
    .filter(([k]) => k !== '_row')
    .map(([, v]) => String(v));
  const speakers = t.speakers.flatMap((x) =>
    x.speaker
      ? Object.entries(x.speaker.raw)
          .filter(([k]) => k !== '_row' && k !== 'E-Mail' && k !== 'Telefon')
          .map(([, v]) => String(v))
      : [],
  );
  return norm([...own, ...speakers].join(' '));
}

export function matchesFilters(t: Talk, f: TalkFilters, search: string): boolean {
  const tile = f.tile ? TALK_TILES.find((x) => x.k === f.tile) : undefined;
  return (
    (!tile || tile.test(t)) &&
    (!f.series || cell(t.raw, 'Reihe') === f.series) &&
    (!f.status || t.status === f.status) &&
    (!f.owner || ownersOf(t).includes(f.owner)) &&
    (!f.when || whenOf(t) === f.when) &&
    (!search || searchText(t).includes(search))
  );
}

/** Zähler je Wert, alphabetisch (deutsch). */
export function countBy(talks: Talk[], pick: (t: Talk) => string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const t of talks) for (const v of pick(t)) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'));
}

/** Anstehend aufsteigend, vergangen absteigend, ohne Termin in Sheet-Reihenfolge. */
export function groupTalks(talks: Talk[]): { upcoming: Talk[]; past: Talk[]; undated: Talk[] } {
  const time = (t: Talk): number => t.date?.getTime() ?? 0;
  return {
    upcoming: talks.filter((t) => whenOf(t) === 'up').sort((a, b) => time(a) - time(b)),
    past: talks.filter((t) => whenOf(t) === 'past').sort((a, b) => time(b) - time(a)),
    undated: talks.filter((t) => whenOf(t) === 'nodate'),
  };
}
