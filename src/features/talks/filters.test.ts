import { describe, expect, it } from 'vitest';
import { buildTalksModel } from '@/domain/talks/model';
import fixture from '../../../tests/fixtures/talks.json';
import { NO_FILTERS, groupTalks, matchesFilters } from './filters';

const model = buildTalksModel(fixture, new Date(2026, 10, 26));

describe('Talk-Filter', () => {
  it('ohne Filter passen alle', () => {
    expect(model.talks.every((t) => matchesFilters(t, NO_FILTERS, ''))).toBe(true);
  });

  it('Zeitraum anstehend und Gruppen sind konsistent', () => {
    const g = groupTalks(model.talks);
    const up = model.talks.filter((t) => matchesFilters(t, { ...NO_FILTERS, when: 'up' }, ''));
    expect(up).toHaveLength(g.upcoming.length);
    expect(g.upcoming.length + g.past.length + g.undated.length).toBe(model.talks.length);
  });

  it('Suche findet Speaker', () => {
    expect(model.talks.some((t) => matchesFilters(t, NO_FILTERS, 'brandtner'))).toBe(true);
    expect(model.talks.every((t) => matchesFilters(t, NO_FILTERS, 'zzzzqq'))).toBe(false);
  });
});
