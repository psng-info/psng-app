import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { SheetsError, type SheetsAdapter } from './SheetsAdapter';
import { invalidateWhenIdle, MAX_CELL_CHARS, writeCells } from './write';

function adapter(fail?: number) {
  const writes: [string, string | boolean][] = [];
  const a: SheetsAdapter = {
    batchGet: () => Promise.resolve([]),
    append: () => Promise.resolve(null),
    updateCell: (_id, a1, v) => {
      if (writes.length + 1 === fail) return Promise.reject(new Error('Bearer geheim'));
      writes.push([a1, v]);
      return Promise.resolve();
    },
  };
  return { a, writes };
}

describe('writeCells', () => {
  it('schreibt jede Zelle einzeln und sichert Formel-Anfänge', async () => {
    const { a, writes } = adapter();
    await writeCells(a, 'S', [
      { a1: 'T!A2', value: '=HYPERLINK("x")' },
      { a1: 'T!B2', value: true },
    ]);
    expect(writes).toEqual([
      ['T!A2', '\'=HYPERLINK("x")'],
      ['T!B2', true],
    ]);
  });

  it('prüft die Länge vor dem ersten Schreiben', async () => {
    const { a, writes } = adapter();
    await expect(
      writeCells(a, 'S', [
        { a1: 'T!A2', value: 'ok' },
        { a1: 'T!B2', value: 'x'.repeat(MAX_CELL_CHARS + 1) },
      ]),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(writes).toEqual([]);
  });

  it('fremder Fehler nach Teilschreiben: eigener Text, keine Rohmeldung', async () => {
    const { a } = adapter(2);
    const err = await writeCells(a, 'S', [
      { a1: 'T!A2', value: '1' },
      { a1: 'T!B2', value: '2' },
    ]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SheetsError);
    expect((err as SheetsError).message).toMatch(/^Nur teilweise gespeichert \(1 von 2 Feldern\)/);
    expect((err as SheetsError).message).not.toContain('geheim');
  });
});

describe('invalidateWhenIdle', () => {
  it('liest nur neu, wenn höchstens die eigene Schreibaktion läuft', () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue();
    vi.spyOn(qc, 'isMutating').mockReturnValue(2);
    invalidateWhenIdle(qc, ['todos'], ['todos']);
    expect(spy).not.toHaveBeenCalled();
    vi.spyOn(qc, 'isMutating').mockReturnValue(1);
    invalidateWhenIdle(qc, ['todos'], ['todos']);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['todos'] });
  });
});
