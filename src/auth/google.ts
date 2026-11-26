import { GOOGLE_SCOPES } from '@/data/config';

/** Minimale Typen für Google Identity Services (Token Client). Nur was wir nutzen. */
interface GsiTokenResponse {
  access_token?: string;
  expires_in?: number | string;
  /** Tatsächlich gewährte Scopes, durch Leerzeichen getrennt (bei Einzelfreigabe evtl. weniger als angefragt). */
  scope?: string;
  error?: string;
}
interface GsiError {
  type?: string;
}
interface GsiTokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}
interface GsiGlobal {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (r: GsiTokenResponse) => void;
        error_callback: (e: GsiError) => void;
      }): GsiTokenClient;
      revoke(token: string, done?: () => void): void;
    };
  };
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const REFRESH_MARGIN_MS = 2 * 60_000;
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/**
 * Google lässt Nutzer:innen einzelne Berechtigungen abwählen. Ohne Sheets-Scope würde jede Abfrage
 * mit 403 scheitern und wie „keine Freigabe im Drive“ aussehen. Fehlt `scope`, gilt alles als gewährt.
 */
export function grantsSheets(scope: string | undefined): boolean {
  return scope === undefined || scope.split(/\s+/).includes(SHEETS_SCOPE);
}

export type AuthFailure = 'cancelled' | 'popup_blocked' | 'failed';

export class AuthError extends Error {
  constructor(
    public readonly reason: AuthFailure,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

let scriptPromise: Promise<void> | null = null;

const gsiLoaded = (): boolean =>
  !!(window as unknown as { google?: GsiGlobal }).google?.accounts?.oauth2;

/** Lädt das Google-Skript erst auf Anfrage (nur Anmeldeseite). */
export function loadGsiScript(): Promise<void> {
  if (gsiLoaded()) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = GSI_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scriptPromise = null;
      el.remove();
      reject(new AuthError('failed', 'Das Google-Anmeldeskript konnte nicht geladen werden.'));
    };
    document.head.appendChild(el);
  });
  return scriptPromise;
}

function gsi(): GsiGlobal['accounts']['oauth2'] {
  const g = (window as unknown as { google?: GsiGlobal }).google;
  if (!g) throw new AuthError('failed', 'Google-Anmeldung nicht verfügbar.');
  return g.accounts.oauth2;
}

interface Pending {
  resolve: (token: string) => void;
  reject: (e: AuthError) => void;
}

/** Hält das Token nur im Speicher. Nie in localStorage, IndexedDB oder Logs. */
export class GoogleSession {
  private token: string | null = null;
  private expiresAt = 0;
  private client: GsiTokenClient | null = null;
  private pending: { promise: Promise<string>; handlers: Pending } | null = null;

  constructor(private readonly clientId: string) {}

  hasToken(): boolean {
    return this.token !== null;
  }

  /** Bereitet den Token Client vor (Skript laden). Vor dem Klick aufrufen, damit der Popup nicht blockiert wird. */
  async prepare(): Promise<void> {
    await loadGsiScript();
    this.client ??= gsi().initTokenClient({
      client_id: this.clientId,
      scope: GOOGLE_SCOPES,
      callback: (r) => {
        if (r.error || !r.access_token) {
          this.settle(null, new AuthError('failed', 'Anmeldung bei Google fehlgeschlagen.'));
          return;
        }
        if (!grantsSheets(r.scope)) {
          this.settle(
            null,
            new AuthError(
              'failed',
              'Ohne Zugriff auf Google Sheets funktioniert die App nicht. Bitte erneut anmelden und den Zugriff auf Tabellen erlauben.',
            ),
          );
          return;
        }
        this.token = r.access_token;
        this.expiresAt = Date.now() + Number(r.expires_in ?? 3600) * 1000;
        this.settle(r.access_token, null);
      },
      error_callback: (e) => {
        const reason: AuthFailure =
          e.type === 'popup_closed'
            ? 'cancelled'
            : e.type === 'popup_failed_to_open'
              ? 'popup_blocked'
              : 'failed';
        const message =
          reason === 'cancelled'
            ? 'Anmeldung abgebrochen.'
            : reason === 'popup_blocked'
              ? 'Das Anmeldefenster wurde blockiert. Popups für diese Seite erlauben und erneut versuchen.'
              : 'Anmeldung bei Google fehlgeschlagen.';
        this.settle(null, new AuthError(reason, message));
      },
    });
  }

  private settle(token: string | null, err: AuthError | null): void {
    const p = this.pending;
    this.pending = null;
    if (!p) return;
    if (token) p.handlers.resolve(token);
    else p.handlers.reject(err ?? new AuthError('failed', 'Anmeldung bei Google fehlgeschlagen.'));
  }

  private request(prompt: '' | 'select_account'): Promise<string> {
    if (this.pending) return this.pending.promise;
    let handlers!: Pending;
    const promise = new Promise<string>((resolve, reject) => {
      handlers = { resolve, reject };
    });
    this.pending = { promise, handlers };
    const fail = (e: unknown) =>
      this.settle(
        null,
        e instanceof AuthError ? e : new AuthError('failed', 'Anmeldung fehlgeschlagen.'),
      );
    const ask = () => {
      try {
        this.client?.requestAccessToken({ prompt });
      } catch (e) {
        fail(e);
      }
    };
    // Ist der Client schon bereit, sofort fragen, also noch im selben Klick. Nach einem `await`
    // werten manche Browser (vor allem Safari) das Google-Fenster nicht mehr als Klickfolge und blockieren es.
    if (this.client) ask();
    else this.prepare().then(ask, fail);
    return promise;
  }

  /** Interaktive Anmeldung. Muss aus einem Klick kommen. */
  signIn(): Promise<string> {
    return this.request('select_account');
  }

  /** Gültiges Token. Bei weniger als 2 Minuten Restzeit (oder `force`) still erneuern. */
  getToken(force = false): Promise<string> {
    if (!force && this.token && this.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
      return Promise.resolve(this.token);
    }
    return this.request('');
  }

  async revoke(): Promise<void> {
    const t = this.token;
    this.token = null;
    this.expiresAt = 0;
    if (!t) return;
    try {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 2000);
        gsi().revoke(t, () => {
          clearTimeout(timer);
          resolve();
        });
      });
    } catch {
      // Skript nicht geladen: Token läuft nach höchstens einer Stunde ab.
    }
  }
}

/** E-Mail der angemeldeten Person. Nur im Speicher halten, nie loggen. */
export async function fetchUserEmail(
  token: string,
  fetchFn: typeof fetch = (...a) => fetch(...a),
): Promise<string> {
  let res: Response;
  try {
    res = await fetchFn('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new AuthError(
      'failed',
      'Keine Verbindung zu Google. Netzwerk prüfen und erneut versuchen.',
    );
  }
  if (!res.ok) throw new AuthError('failed', 'Die E-Mail-Adresse konnte nicht gelesen werden.');
  const json = (await res.json().catch(() => null)) as { email?: unknown } | null;
  if (typeof json?.email !== 'string' || !json.email) {
    throw new AuthError('failed', 'Die E-Mail-Adresse konnte nicht gelesen werden.');
  }
  return json.email;
}
