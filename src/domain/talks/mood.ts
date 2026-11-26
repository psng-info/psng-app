import { daysFrom } from '@/domain/dates';
import { moodOf, type Mood, type MoodFactor } from '@/domain/mood';
import { hasYT, isHeld } from './steps';
import { isProcessFlag } from './model';
import type { TalksModel } from './types';

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Stimmung der Lecture-Reihe: 100 minus Lücken und Rückstände, plus Punkte für Aufnahmen und gehaltene Talks. */
export function talksMood(model: TalksModel, today: Date): Mood {
  const { talks, gaps, next } = model;
  const factors: MoodFactor[] = [];
  const add = (text: string, value: number): void => {
    factors.push({ text, value: Math.round(value) });
  };

  const late = talks.flatMap((t) => t.steps.filter((s) => s.late)).length;
  add(`${plural(late, 'Schritt', 'Schritte')} überfällig`, -Math.min(36, late * 4));

  const crit = talks.flatMap((t) =>
    t.flags.filter((f) => f.level === 'crit' && !isProcessFlag(f)),
  ).length;
  add(`${crit} kritische Datenlücken`, -Math.min(20, crit * 8));

  const noOwner = talks.filter((t) => t.flags.some((f) => f.tag === 'Owner fehlt')).length;
  add(`${plural(noOwner, 'Talk', 'Talks')} mit Schritt ohne Owner`, -Math.min(12, noOwner * 6));

  add(`${gaps.length} der nächsten 4 Monate ohne Talk`, -Math.min(18, gaps.length * 6));
  if (!next || (next.dd ?? 0) > 35) add('Kein Talk in den nächsten 5 Wochen', -10);

  const ago = (d: Date): number => -daysFrom(d, today);
  const online = talks.filter((t) => hasYT(t) && t.date && ago(t.date) <= 45).length;
  add(
    `${plural(online, 'Aufnahme', 'Aufnahmen')} der letzten 6 Wochen online`,
    Math.min(10, online * 5),
  );

  const recent = talks.filter((t) => isHeld(t) && t.date && ago(t.date) <= 30).length;
  add(`${plural(recent, 'Talk', 'Talks')} in den letzten 30 Tagen`, Math.min(8, recent * 4));

  return moodOf(factors);
}
