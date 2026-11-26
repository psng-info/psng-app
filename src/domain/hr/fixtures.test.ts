import { describe, expect, it } from 'vitest';
import hr from '../../../tests/fixtures/hr.json';
import { hrConflict } from './conflict';
import { buildPeople } from './model';
import { flagGroups, hrMood } from './rank';
import { progress } from './steps';
import { TODAY } from './test-helpers';

const people = buildPeople(hr, TODAY);
const by = (name: string) => {
  const p = people.find((x) => x.name === name);
  if (!p) throw new Error(name);
  return p;
};

describe('Fixture hr.json (heute 26.11.2026)', () => {
  it('liest Kandidaten, Abbrüche und Formular-Personen', () => {
    expect(people.filter((p) => p.source === 'kandidat')).toHaveLength(14);
    expect(people.filter((p) => p.source === 'abbruch')).toHaveLength(3);
    expect(people.filter((p) => p.formOnly).map((p) => p.name)).toEqual(['Berit Sonnleitner']);
  });
  it('Stufen', () => {
    expect(by('Jasper Wiedemann').stage).toBe('Bereit für 1:1');
    expect(by('Torben Wagenfeld').stage).toBe('Bereit für 1:1');
    expect(by('Anselm Rieder').stage).toBe('Probeaufgabe läuft');
    expect(by('Berit Sonnleitner').stage).toBe('Nur Formular');
  });
  it('Anselm: überfällig und Check-in lange her', () => {
    const t = by('Anselm Rieder').flags.map((f) => f.tag);
    expect(t).toEqual(['Überfällig', 'Check-in']);
    expect(by('Anselm Rieder').flags[0]?.why).toBe('Deadline 19.11., 7 Tage drüber');
  });
  it('Greta (Pool): Wiedervorlage fällig, obwohl abgeschlossen', () => {
    expect(by('Greta Hollmann').flags).toEqual([
      { lvl: 'crit', tag: 'Wiedervorlage', why: 'Wiedervorlage fällig seit 17.11.' },
    ]);
  });
  it('Ida (Core, integriert) ohne Flags, Lasse ebenfalls', () => {
    expect(by('Ida Brunner').flags).toEqual([]);
    expect(by('Lasse Moritz').flags).toEqual([]);
  });
  it('Fortschritt: Core fertig, Pool angehalten', () => {
    expect(progress(by('Ida Brunner')).mode).toBe('ok');
    expect(progress(by('Greta Hollmann')).mode).toBe('halt');
  });
  it('Notiz zu Emil (Emmo) Sandoval gefunden', () => {
    expect(by('Emil (Emmo) Sandoval').note?.['Notiz']).toContain('Probeaufgabe');
  });
  it('Handlungsbedarf beginnt mit dringenden Fällen', () => {
    const g = flagGroups(people);
    expect(g.length).toBeGreaterThan(5);
    expect(g[0]?.rank).toBe(0);
    const ranks = g.map((x) => x.rank);
    expect([...ranks].sort()).toEqual(ranks);
  });
  it('Widerspruch: To-do nennt abgesagte Person', () => {
    expect(hrConflict('Rosalie anschreiben', people)).toMatchObject({
      first: 'Rosalie',
      status: 'Abgesagt',
    });
    expect(hrConflict('Anselm anschreiben', people)).toBeNull();
  });
  it('Mood im gültigen Bereich', () => {
    const m = hrMood(people, TODAY);
    expect(m.score).toBeGreaterThanOrEqual(0);
    expect(m.score).toBeLessThanOrEqual(100);
  });
});
