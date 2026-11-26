import { describe, expect, it } from 'vitest';
import { initialOwner, OWNER_OTHER, ownerOptions } from './owners';

const team = ['Polina', 'Stela'];
const options = ownerOptions(team);

describe('initialOwner', () => {
  it('wählt einen Teamnamen vor, auch bei anderer Schreibweise', () => {
    expect(initialOwner('Polina', options)).toEqual({ choice: 'Polina', custom: '' });
    expect(initialOwner(' stela ', options)).toEqual({ choice: 'Stela', custom: '' });
  });
  it('wählt Rollen vor', () => {
    expect(initialOwner('Lokale Orga', options).choice).toBe('Lokale Orga');
  });
  it('fremder Name: „Anderer Name“ mit vorbelegtem Namen', () => {
    expect(initialOwner('Eric Marquardt', options)).toEqual({
      choice: OWNER_OTHER,
      custom: 'Eric Marquardt',
    });
  });
  it('ohne Owner bleibt alles leer', () => {
    expect(initialOwner('', options)).toEqual({ choice: '', custom: '' });
  });
});
