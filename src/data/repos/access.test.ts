import { describe, expect, it } from 'vitest';
import { SheetsError } from '../sheets/SheetsAdapter';
import { findAccess, parseAccess } from './access';

const values = [
  ['E-Mail', 'Name', 'Rollen'],
  [' Anna.Beispiel@Example.org ', 'Anna', 'kern, HR'],
  ['ben@example.org', 'Ben', 'admin;kern'],
  ['cem@example.org', '', 'unbekannt'],
  ['', 'Ohne Mail', 'kern'],
  ['keine-mail', 'X', 'kern'],
];

describe('parseAccess', () => {
  const list = parseAccess(values);

  it('liest E-Mail klein und getrimmt, Name und Rollen', () => {
    expect(list).toHaveLength(3);
    expect(list[0]).toEqual({
      email: 'anna.beispiel@example.org',
      name: 'Anna',
      roles: new Set(['kern', 'hr']),
    });
    expect(list[1]?.roles).toEqual(new Set(['admin', 'kern']));
  });

  it('ohne gültige Rolle: kern, ohne Namen: Teil vor dem @', () => {
    expect(list[2]).toEqual({ email: 'cem@example.org', name: 'cem', roles: new Set(['kern']) });
  });

  it('fehlende Spalte: missing_column', () => {
    expect(() =>
      parseAccess([
        ['E-Mail', 'Name'],
        ['a@b.de', 'A'],
      ]),
    ).toThrow(SheetsError);
  });
});

describe('findAccess', () => {
  const list = parseAccess(values);
  it('vergleicht klein und getrimmt', () => {
    expect(findAccess(list, '  ANNA.BEISPIEL@example.ORG ')?.name).toBe('Anna');
  });
  it('unbekannte Adresse: undefined', () => {
    expect(findAccess(list, 'fremd@example.org')).toBeUndefined();
  });
});
