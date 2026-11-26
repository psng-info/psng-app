import { describe, expect, it } from 'vitest';
import { relatedTodos } from './related';
import { TODAY, todos } from './test-helpers';

const talk = (names: string[], date: Date | null = new Date(2026, 11, 3)) => ({ names, date });
const ids = (x: { id: string }[]) => x.map((y) => y.id);

describe('relatedTodos', () => {
  it('Nachname (mind. 4 Buchstaben) in To-do, Nächster Schritt oder Notiz', () => {
    const t = todos([
      { 'To-do': 'Dezember-Lecture Marquardt: Ort klären' },
      { 'To-do': 'x', 'Nächster Schritt': 'Mail an Marquardt' },
      { 'To-do': 'x', Notiz: 'Marquardts Folien' }, // Genitiv: Wortgrenze „s“ ist ein Buchstabe, kein Treffer
      { 'To-do': 'Marquardt-Foto', Notiz: '' },
      { 'To-do': 'nichts' },
    ]);
    expect(ids(relatedTodos(t, talk(['Dr. Anna Marquardt']), TODAY))).toEqual([
      'T01',
      'T02',
      'T04',
    ]);
  });

  it('kurze Nachnamen (unter 4 Zeichen) zählen nicht', () => {
    const t = todos([{ 'To-do': 'Mail an Li' }]);
    expect(relatedTodos(t, talk(['Wei Li']), TODAY)).toEqual([]);
  });

  it('Vorname nur bei Lectures, mehrteiligem Namen und Erfasst ≤ 60 Tage vom Talk', () => {
    const t = todos([
      { 'To-do': 'Anna anschreiben', Bereich: 'Lectures', Erfasst: '29.10.2026' }, // nah: ja
      { 'To-do': 'Anna anschreiben', Ziel: 'Lecture-Pipeline', Erfasst: '29.10.2026' }, // Ziel: ja
      { 'To-do': 'Anna anschreiben', Bereich: 'Team', Erfasst: '29.10.2026' }, // kein Lectures: nein
      { 'To-do': 'Anna anschreiben', Bereich: 'Lectures', Erfasst: '01.08.2026' }, // zu weit weg: nein
      { 'To-do': 'Anna anschreiben', Bereich: 'Lectures' }, // ohne Erfasst: ja
    ]);
    expect(ids(relatedTodos(t, talk(['Anna Marquardt']), TODAY))).toEqual(['T01', 'T02', 'T05']);
    // Ein einteiliger Name gilt als Nachname, der Vorname-Zweig braucht mehrere Teile.
    expect(ids(relatedTodos(t.slice(2, 3), talk(['Anna']), TODAY))).toEqual(['T03']);
  });

  it('ohne Talk-Datum zählt „nah“; Akzente und Titel werden normalisiert', () => {
    const t = todos([{ 'To-do': 'Petrovic melden', Bereich: 'Lectures', Erfasst: '01.01.2020' }]);
    expect(ids(relatedTodos(t, talk(['Prof. Dr. Ana Petrović'], null), TODAY))).toEqual(['T01']);
  });

  it('mehrere Speaker: ein Treffer genügt', () => {
    const t = todos([{ 'To-do': 'Briefing Sandoval' }]);
    expect(ids(relatedTodos(t, talk(['Anna Marquardt', 'Ben Sandoval']), TODAY))).toEqual(['T01']);
  });
});
