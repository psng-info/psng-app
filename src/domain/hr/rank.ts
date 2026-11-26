import { moodOf, type Mood, type MoodFactor } from '@/domain/mood';
import { daysFrom } from '@/domain/dates';
import { progress } from './steps';
import { CLOSED, stageOrder } from './stages';
import type { FlagGroup, Person } from './types';

const cmpName = (a: Person, b: Person) => a.name.localeCompare(b.name, 'de');

/** Handlungsbedarf: Personen mit Flags, dringend zuerst, dann Neue, dann Rest; je Gruppe nach Stufe und Name. */
export function flagGroups(people: Person[]): FlagGroup[] {
  return people
    .filter((p) => p.flags.length > 0)
    .map((person): FlagGroup => {
      const rank = Math.min(
        ...person.flags.map((f) => (f.lvl === 'crit' ? 0 : f.lvl === 'new' ? 1 : 2)),
      ) as 0 | 1 | 2;
      return { person, flags: person.flags, rank };
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        stageOrder(a.person.stage || '~') - stageOrder(b.person.stage || '~') ||
        cmpName(a.person, b.person),
    );
}

/** Sortierung der Personenliste: weitester Fortschritt zuerst, laufende vor angehaltenen, spätere Stufe zuerst, dann Name. */
export function byProgress(a: Person, b: Person): number {
  const pa = progress(a);
  const pb = progress(b);
  return (
    pb.step - pa.step ||
    Number(pa.mode === 'halt') - Number(pb.mode === 'halt') ||
    stageOrder(b.stage || '~') - stageOrder(a.stage || '~') ||
    cmpName(a, b)
  );
}

/** Stimmung der Pipeline (Mood-Meter wie Referenz). */
export function hrMood(people: Person[], today: Date): Mood {
  const gs = flagGroups(people);
  const f: MoodFactor[] = [];
  const add = (text: string, value: number) => f.push({ text, value: Math.round(value) });

  const crit = gs.filter((g) => g.flags.some((x) => x.lvl === 'crit')).length;
  add(`${crit} dringend (rot)`, -Math.min(40, crit * 8));
  const warn = gs.filter(
    (g) => !g.flags.some((x) => x.lvl === 'crit') && g.flags.some((x) => x.lvl === 'warn'),
  ).length;
  add(`${warn} mit Handlungsbedarf`, -Math.min(15, warn * 3));
  const nost = people.filter((p) => !p.stage).length;
  add(`${nost} ohne Status`, -Math.min(10, nost * 5));
  const act = people.filter((p) => !CLOSED.has(p.stage));
  if (!act.length) add('Pipeline leer', -15);
  const fresh = act.filter((p) => p.last && -daysFrom(p.last, today) <= 7).length;
  add(`${fresh} ${fresh === 1 ? 'Kontakt' : 'Kontakte'} in 7 Tagen`, Math.min(10, fresh * 2));
  const neu = people.filter((p) => p.formOnly).length;
  add(`${neu} neue Bewerbungen`, Math.min(6, neu * 2));
  const won = people.filter((p) => p.stage === 'Core' || p.stage === 'Helper').length;
  const lost = people.filter((p) => p.stage === 'Abbruch' || p.stage === 'Abgesagt').length;
  if (won + lost >= 3) {
    const r = won / (won + lost);
    add(
      `${Math.round(r * 100)} % aufgenommen statt abgebrochen`,
      r >= 0.5 ? Math.min(6, (r - 0.5) * 12) : -Math.min(8, (0.5 - r) * 16),
    );
  }
  return moodOf(f);
}
