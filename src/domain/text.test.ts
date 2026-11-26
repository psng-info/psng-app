import { describe, expect, it } from 'vitest';
import { norm, yes } from './text';

describe('norm', () => {
  it('macht klein, ohne Akzente, ohne Umlautpunkte', () => {
    expect(norm('Petrović')).toBe('petrovic');
    expect(norm('Müller')).toBe('muller');
    expect(norm('Weiß')).toBe('weiss');
  });
  it('wandelt Binde- und Gedankenstriche in Leerzeichen', () => {
    expect(norm('Anna-Lena')).toBe('anna lena');
    expect(norm('A – B')).toBe('a b');
  });
  it('entfernt unsichtbare Zeichen und fasst Leerraum zusammen', () => {
    expect(norm('  a​  b \n c ')).toBe('a b c');
  });
  it('verträgt null und undefined', () => {
    expect(norm(null)).toBe('');
    expect(norm(undefined)).toBe('');
  });
});

describe('yes', () => {
  it.each(['true', 'TRUE', 'wahr', 'Ja', ' x ', '✓'])('erkennt %s', (v) => {
    expect(yes(v)).toBe(true);
  });
  it.each(['', 'nein', 'false', 'jaa', undefined])('lehnt %s ab', (v) => {
    expect(yes(v)).toBe(false);
  });
});
