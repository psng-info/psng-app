import { describe, expect, it, vi } from 'vitest';
import { GoogleSheetsAdapter } from './GoogleSheetsAdapter';
import { SheetsError, shouldRetry } from './SheetsAdapter';

function res(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status });
}

function setup(responses: (Response | Error)[]) {
  const fetchFn = vi.fn<typeof fetch>(() => {
    const next = responses.shift();
    if (!next) return Promise.reject(new Error('keine Antwort vorbereitet'));
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next);
  });
  const getToken = vi.fn((force?: boolean) => Promise.resolve(force ? 'neu' : 'alt'));
  return { fetchFn, getToken, adapter: new GoogleSheetsAdapter(getToken, fetchFn) };
}

async function kindOf(p: Promise<unknown>): Promise<SheetsError> {
  try {
    await p;
  } catch (e) {
    return e as SheetsError;
  }
  throw new Error('kein Fehler geworfen');
}

describe('GoogleSheetsAdapter', () => {
  it('batchGet: eine Anfrage, alle Bereiche, Bearer-Token', async () => {
    const { adapter, fetchFn } = setup([res(200, { valueRanges: [{ values: [['a', 'b']] }, {}] })]);
    const out = await adapter.batchGet('SHEET', ['Lectures!A1:B2', "'Talk-Schritte'!A1:G5"]);
    expect(out).toEqual([[['a', 'b']], []]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    const u = new URL(url as string);
    expect(u.pathname).toBe('/v4/spreadsheets/SHEET/values:batchGet');
    expect(u.searchParams.getAll('ranges')).toEqual(['Lectures!A1:B2', "'Talk-Schritte'!A1:G5"]);
    expect(u.searchParams.get('valueRenderOption')).toBe('FORMATTED_VALUE');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer alt');
  });

  it('updateCell: PUT mit USER_ENTERED', async () => {
    const { adapter, fetchFn } = setup([res(200)]);
    await adapter.updateCell('S', 'Lectures!F12', true);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url as string).toContain('values/Lectures!F12?valueInputOption=USER_ENTERED');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual({
      range: 'Lectures!F12',
      majorDimension: 'ROWS',
      values: [[true]],
    });
  });

  it('append: POST mit INSERT_ROWS', async () => {
    const { adapter, fetchFn } = setup([res(200)]);
    await adapter.append('S', "'Talk-Schritte'!A1", ['x', false]);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url as string).toContain(
      ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
    );
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      majorDimension: 'ROWS',
      values: [['x', false]],
    });
  });

  it('append: gibt die Zeilennummer aus updatedRange zurück', async () => {
    const { adapter } = setup([res(200, { updates: { updatedRange: "'To-dos'!A120:R120" } })]);
    expect(await adapter.append('S', "'To-dos'!A1", ['x'])).toBe(120);
    const none = setup([res(200, {})]);
    expect(await none.adapter.append('S', "'To-dos'!A1", ['x'])).toBeNull();
  });

  it('400 beim Schreiben: Wert abgelehnt (nicht „Tab fehlt“), ohne Google-Text', async () => {
    const { adapter } = setup([res(400, { error: { message: 'GEHEIMER ZELLINHALT' } })]);
    const err = await kindOf(adapter.updateCell('S', 'Lectures!F12', 'x'));
    expect(err.kind).toBe('invalid');
    expect(err.message).not.toContain('GEHEIM');
    const read = setup([res(400)]);
    expect((await kindOf(read.adapter.batchGet('S', ['A!A1']))).kind).toBe('not_found');
  });

  it('401: einmal mit frischem Token wiederholen', async () => {
    const { adapter, getToken } = setup([
      res(401),
      res(200, { valueRanges: [{ values: [['ok']] }] }),
    ]);
    expect(await adapter.batchGet('S', ['A!A1'])).toEqual([[['ok']]]);
    expect(getToken.mock.calls.map((c) => c[0])).toEqual([false, true]);
  });

  it('401 zweimal: unauthenticated', async () => {
    const { adapter, fetchFn } = setup([res(401), res(401)]);
    const err = await kindOf(adapter.batchGet('S', ['A!A1']));
    expect(err.kind).toBe('unauthenticated');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      403,
      'forbidden',
      'Keine Berechtigung für dieses Sheet. Bitte im Google Drive Zugriff anfragen.',
    ],
    [
      429,
      'quota',
      'Google-Limit für Abrufe pro Minute erreicht. Eine Minute warten, dann neu laden.',
    ],
    [404, 'not_found', 'Sheet oder Tab nicht gefunden.'],
    [500, 'unknown', 'Google hat die Anfrage abgelehnt (Status 500).'],
  ] as const)('Status %i wird %s', async (status, kind, message) => {
    const { adapter } = setup([res(status, { error: { message: 'GEHEIMER ZELLINHALT' } })]);
    const err = await kindOf(adapter.batchGet('S', ['A!A1']));
    expect(err.kind).toBe(kind);
    expect(err.message).toBe(message);
    expect(err.message).not.toContain('GEHEIM');
  });

  it('Netzwerkfehler: network ohne Token in der Meldung', async () => {
    const { adapter } = setup([new TypeError('Failed to fetch Bearer alt')]);
    const err = await kindOf(adapter.batchGet('S', ['A!A1']));
    expect(err.kind).toBe('network');
    expect(err.message).not.toContain('alt');
  });

  it('Token-Fehler: unauthenticated', async () => {
    const adapter = new GoogleSheetsAdapter(
      () => Promise.reject(new Error('popup blocked')),
      vi.fn<typeof fetch>(),
    );
    expect((await kindOf(adapter.batchGet('S', ['A!A1']))).kind).toBe('unauthenticated');
  });
});

describe('shouldRetry', () => {
  it('wiederholt Netz- und Limitfehler einmal, Freigabe- und Anmeldefehler nie', () => {
    expect(shouldRetry(0, new SheetsError('network', 'x'))).toBe(true);
    expect(shouldRetry(0, new SheetsError('quota', 'x'))).toBe(true);
    expect(shouldRetry(1, new SheetsError('network', 'x'))).toBe(false);
    expect(shouldRetry(0, new SheetsError('forbidden', 'x'))).toBe(false);
    expect(shouldRetry(0, new SheetsError('unauthenticated', 'x'))).toBe(false);
    expect(shouldRetry(0, new SheetsError('missing_column', 'x'))).toBe(false);
    expect(shouldRetry(0, new Error('x'))).toBe(true);
  });
});
