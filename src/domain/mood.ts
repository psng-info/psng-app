/** Generisches Mood-Meter: 100 plus die Summe aller Faktoren, begrenzt auf 0 bis 100. */

export interface MoodFactor {
  text: string;
  value: number;
}

export type MoodTone = 'ok' | 'warn' | 'crit';

export interface MoodLevel {
  label: 'Läuft' | 'Solide' | 'Geht so' | 'Zäh' | 'Brennt';
  tone: MoodTone;
}

export interface Mood {
  score: number;
  level: MoodLevel;
  /** Nur Faktoren ungleich 0, schlechteste zuerst. */
  factors: MoodFactor[];
}

export function moodLevel(score: number): MoodLevel {
  if (score >= 80) return { label: 'Läuft', tone: 'ok' };
  if (score >= 60) return { label: 'Solide', tone: 'ok' };
  if (score >= 40) return { label: 'Geht so', tone: 'warn' };
  if (score >= 20) return { label: 'Zäh', tone: 'warn' };
  return { label: 'Brennt', tone: 'crit' };
}

export function moodOf(factors: MoodFactor[]): Mood {
  const used = factors.filter((f) => f.value !== 0).sort((a, b) => a.value - b.value);
  const score = Math.max(0, Math.min(100, 100 + used.reduce((sum, f) => sum + f.value, 0)));
  return { score, level: moodLevel(score), factors: used };
}
