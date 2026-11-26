import { describe, expect, it } from 'vitest';
import type { Values } from '@/domain/rows';
import {
  actionItems,
  buildTalksModel,
  speakerPool,
  stats,
  TALK_TILES,
  type TalksInput,
} from './model';
import { talksMood } from './mood';
import { isOff } from './steps';

const files = import.meta.glob<{ default: Record<keyof TalksInput, Values> }>(
  '/tests/fixtures/talks.json',
  { eager: true },
);
const fixture = Object.values(files)[0]?.default;

describe.skipIf(!fixture)('Talks-Fixture (anonymisiert, heute = 26.11.2026)', () => {
  const today = new Date(2026, 10, 26);
  const build = () => {
    if (!fixture) throw new Error('Fixture fehlt');
    return buildTalksModel(fixture, today);
  };

  it('baut das Modell ohne Fehler und mit allen Talks', () => {
    const model = build();
    expect(model.talks.length).toBeGreaterThan(0);
    expect(model.speakers.length).toBeGreaterThan(0);
  });

  it('jeder Talk hat 19 Schritte', () => {
    for (const t of build().talks) expect(t.steps).toHaveLength(19);
  });

  it('der nächste Talk ist anstehend und nicht abgesagt', () => {
    const next = build().next;
    expect(next).not.toBeNull();
    expect(next?.dd).toBeGreaterThanOrEqual(0);
    expect(next && isOff(next)).toBe(false);
  });

  it('abgesagte Talks haben nur „nicht nötig“ und keine Flags', () => {
    const off = build().talks.filter(isOff);
    expect(off.length).toBeGreaterThan(0);
    for (const t of off) {
      expect(t.flags).toEqual([]);
      expect(t.steps.every((s) => s.status === 'na')).toBe(true);
    }
  });

  it('Handlungsbedarf, Zahlen, Pool, Kacheln und Mood laufen durch', () => {
    const model = build();
    const items = actionItems(model, today);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.rank === 0 || i.rank === 1)).toBe(true);
    expect(stats(model).rows.length).toBeGreaterThan(0);
    expect(speakerPool(model).entries).toHaveLength(model.speakers.length);
    for (const tile of TALK_TILES)
      expect(model.talks.filter(tile.test).length).toBeGreaterThanOrEqual(0);
    const mood = talksMood(model, today);
    expect(mood.score).toBeGreaterThanOrEqual(0);
    expect(mood.score).toBeLessThanOrEqual(100);
  });
});
