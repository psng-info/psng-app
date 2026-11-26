import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthError, GoogleSession, grantsSheets } from './google';

type Callback = (r: { access_token?: string; expires_in?: number; scope?: string }) => void;

/** Ersetzt `window.google` durch einen Token Client, den der Test selbst antworten lässt. */
function fakeGsi() {
  let callback: Callback = () => undefined;
  const requestAccessToken = vi.fn();
  const revoke = vi.fn((_t: string, done?: () => void) => done?.());
  vi.stubGlobal('google', {
    accounts: {
      oauth2: {
        initTokenClient: (cfg: { callback: Callback }) => {
          callback = cfg.callback;
          return { requestAccessToken };
        },
        revoke,
      },
    },
  });
  return { requestAccessToken, revoke, answer: (r: Parameters<Callback>[0]) => callback(r) };
}

const ALL = 'email openid https://www.googleapis.com/auth/spreadsheets';

afterEach(() => vi.unstubAllGlobals());

describe('grantsSheets', () => {
  it('erkennt, ob der Sheets-Scope gewährt wurde', () => {
    expect(grantsSheets(ALL)).toBe(true);
    expect(grantsSheets('email openid')).toBe(false);
    expect(grantsSheets(undefined)).toBe(true);
  });
});

describe('GoogleSession', () => {
  it('fragt im selben Klick nach dem Token, wenn der Client vorbereitet ist (kein Popup-Blocker)', async () => {
    const gsi = fakeGsi();
    const session = new GoogleSession('id');
    await session.prepare();
    const p = session.signIn();
    // synchron, noch vor jedem await: sonst blockiert Safari das Google-Fenster
    expect(gsi.requestAccessToken).toHaveBeenCalledWith({ prompt: 'select_account' });
    gsi.answer({ access_token: 'tok', expires_in: 3600, scope: ALL });
    await expect(p).resolves.toBe('tok');
    expect(session.hasToken()).toBe(true);
  });

  it('ohne gewährten Sheets-Scope: Fehler mit Hinweis, kein Token im Speicher', async () => {
    const gsi = fakeGsi();
    const session = new GoogleSession('id');
    await session.prepare();
    const p = session.signIn();
    gsi.answer({ access_token: 'tok', expires_in: 3600, scope: 'email openid' });
    const err = await p.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect((err as AuthError).message).toMatch(/Zugriff auf Google Sheets/);
    expect(session.hasToken()).toBe(false);
  });

  it('gültiges Token wird wiederverwendet, kurz vor Ablauf still erneuert', async () => {
    vi.useFakeTimers();
    try {
      const gsi = fakeGsi();
      const session = new GoogleSession('id');
      await session.prepare();
      const first = session.signIn();
      gsi.answer({ access_token: 'a', expires_in: 3600, scope: ALL });
      await first;
      await expect(session.getToken()).resolves.toBe('a');
      expect(gsi.requestAccessToken).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(59 * 60_000);
      const renewed = session.getToken();
      expect(gsi.requestAccessToken).toHaveBeenLastCalledWith({ prompt: '' });
      gsi.answer({ access_token: 'b', expires_in: 3600, scope: ALL });
      await expect(renewed).resolves.toBe('b');
    } finally {
      vi.useRealTimers();
    }
  });

  it('revoke löscht das Token und widerruft es bei Google', async () => {
    const gsi = fakeGsi();
    const session = new GoogleSession('id');
    await session.prepare();
    const p = session.signIn();
    gsi.answer({ access_token: 'tok', expires_in: 3600, scope: ALL });
    await p;
    await session.revoke();
    expect(session.hasToken()).toBe(false);
    expect(gsi.revoke).toHaveBeenCalledWith('tok', expect.any(Function));
  });
});
