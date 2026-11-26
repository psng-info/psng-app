import { describe, expect, it } from 'vitest';
import { moodLevel, moodOf } from '@/domain/mood';
import { talksMood } from './mood';
import { TODAY, modelOf } from './test-helpers';

describe('moodOf / moodLevel', () => {
  it('100 plus Summe, begrenzt, ohne Nullfaktoren, schlechteste zuerst', () => {
    const m = moodOf([
      { text: 'a', value: -10 },
      { text: 'b', value: 0 },
      { text: 'c', value: -30 },
      { text: 'd', value: 5 },
    ]);
    expect(m.score).toBe(65);
    expect(m.factors.map((f) => f.text)).toEqual(['c', 'a', 'd']);
    expect(moodOf([{ text: 'x', value: -500 }]).score).toBe(0);
    expect(moodOf([{ text: 'x', value: 50 }]).score).toBe(100);
  });
  it('Stufen', () => {
    expect(moodLevel(100).label).toBe('Läuft');
    expect(moodLevel(80).label).toBe('Läuft');
    expect(moodLevel(79).label).toBe('Solide');
    expect(moodLevel(60).label).toBe('Solide');
    expect(moodLevel(59).label).toBe('Geht so');
    expect(moodLevel(40).label).toBe('Geht so');
    expect(moodLevel(39).label).toBe('Zäh');
    expect(moodLevel(20).label).toBe('Zäh');
    expect(moodLevel(19)).toEqual({ label: 'Brennt', tone: 'crit' });
    expect(moodLevel(80).tone).toBe('ok');
    expect(moodLevel(40).tone).toBe('warn');
  });
});

describe('talksMood', () => {
  it('leeres Modell: vier Lücken und kein Talk in Sicht', () => {
    const m = talksMood(modelOf({}), TODAY);
    expect(m.score).toBe(72);
    expect(m.factors.map((f) => f.value)).toEqual([-18, -10]);
    expect(m.level.label).toBe('Solide');
  });

  it('Bonus für Aufnahmen und gehaltene Talks der letzten Wochen', () => {
    const m = talksMood(
      modelOf({
        lectures: [
          {
            Datum: '10.11.2026',
            Speaker: 'Anna Beispiel',
            Status: 'veröffentlicht',
            'YouTube-Link': 'https://youtu.be/demo',
            'TN gesamt': '10',
          },
        ],
      }),
      TODAY,
    );
    expect(m.factors.find((f) => f.text.includes('Aufnahme'))?.value).toBe(5);
    expect(m.factors.find((f) => f.text.includes('letzten 30 Tagen'))?.value).toBe(4);
  });

  it('Rückstand drückt die Stimmung, Deckel greift', () => {
    const lectures = [
      { Datum: '03.12.2026', Speaker: 'A B', Status: 'fix' },
      { Datum: '04.12.2026', Speaker: 'C D', Status: 'fix' },
      { Datum: '05.12.2026', Speaker: 'E F', Status: 'fix' },
    ];
    const m = talksMood(modelOf({ lectures }), TODAY);
    const late = m.factors.find((f) => f.text.includes('überfällig'));
    expect(late?.value).toBe(-36);
    expect(m.factors.find((f) => f.text.includes('ohne Owner'))?.value).toBe(-12);
    expect(m.score).toBeLessThan(60);
  });
});
