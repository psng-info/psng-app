import { describe, expect, it } from 'vitest';
import { nameMatch, nn, spell, splitNames } from './names';

describe('nn', () => {
  it('entfernt Titel und Satzzeichen', () => {
    expect(nn('Prof. Dr. med. Anna Müller')).toBe('anna muller');
    expect(nn('Dr. phil. Jonas K. Wendlandt')).toBe('jonas k wendlandt');
    expect(nn('Marie Curie, PhD')).toBe('marie curie');
  });
});

describe('nameMatch', () => {
  it('gleich nach nn, auch mit Titel und Akzent', () => {
    expect(nameMatch('Dr. Dragan Petrović', 'dragan petrovic')).toBe(true);
  });
  it('gleicher Nachname und gleicher Anfangsbuchstabe', () => {
    expect(nameMatch('Jonas K. Wendlandt', 'J. Wendlandt')).toBe(true);
    expect(nameMatch('Anna Beispiel', 'A. Beispiel')).toBe(true);
  });
  it('anderer Vornamen-Anfangsbuchstabe oder anderer Nachname passt nicht', () => {
    expect(nameMatch('Anna Beispiel', 'Bernd Beispiel')).toBe(false);
    expect(nameMatch('Anna Beispiel', 'Anna Muster')).toBe(false);
  });
  it('einteilige Namen passen nur bei Gleichheit', () => {
    expect(nameMatch('Beispiel', 'Anna Beispiel')).toBe(false);
    expect(nameMatch('Beispiel', 'beispiel')).toBe(true);
  });
  it('leer passt nie', () => {
    expect(nameMatch('', '')).toBe(false);
    expect(nameMatch('Dr.', 'Prof.')).toBe(false);
  });
});

describe('splitNames', () => {
  it('trennt an Komma, &, /, und, and', () => {
    expect(splitNames('Anna Eins und Bernd Zwei')).toEqual(['Anna Eins', 'Bernd Zwei']);
    expect(splitNames('A Eins, B Zwei & C Drei / D Vier and E Fünf')).toEqual([
      'A Eins',
      'B Zwei',
      'C Drei',
      'D Vier',
      'E Fünf',
    ]);
  });
  it('trennt nicht mitten im Wort', () => {
    expect(splitNames('Sandra Brandt')).toEqual(['Sandra Brandt']);
  });
  it('leer ergibt leere Liste', () => {
    expect(splitNames('')).toEqual([]);
  });
});

describe('spell', () => {
  it('meldet die Schreibweise der E-Mail bei genau einem Buchstaben Abweichung', () => {
    expect(spell('Nils Kampmann', 'nils.kampman@example.org')).toBe('kampman');
  });
  it('schweigt bei exakter Übereinstimmung', () => {
    expect(spell('Nils Kampmann', 'nils.kampmann@example.org')).toBe('');
  });
  it('schweigt bei zwei Buchstaben Abweichung, kurzen Namensteilen und ohne E-Mail', () => {
    expect(spell('Nils Kampmann', 'nils.kampmenx@example.org')).toBe('');
    expect(spell('Jo Li', 'jo.lo@example.org')).toBe('');
    expect(spell('Nils Kampmann', '')).toBe('');
    expect(spell('Nils Kampmann', null)).toBe('');
  });
  it('ignoriert Ziffern und Trennzeichen in der E-Mail', () => {
    expect(spell('Anna Beispiel', 'a_beispiel1@example.org')).toBe('');
  });
});
