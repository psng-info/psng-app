import type { Values } from '@/domain/rows';
import { SheetsError, type SheetsAdapter } from './SheetsAdapter';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Liefert ein Token. Mit `forceRefresh` muss ein frisches angefordert werden (nach 401). */
export type TokenGetter = (forceRefresh?: boolean) => Promise<string>;

type FetchLike = typeof fetch;

interface ValueRangeResponse {
  valueRanges?: { values?: (string | number | boolean | null)[][] }[];
}

/** Fehlertexte enthalten nie Zellinhalte, Tokens oder Bereiche. */
function errorFor(status: number): SheetsError {
  switch (status) {
    case 401:
      return new SheetsError('unauthenticated', 'Anmeldung abgelaufen. Bitte neu anmelden.', 401);
    case 403:
      return new SheetsError(
        'forbidden',
        'Keine Berechtigung für dieses Sheet. Bitte im Google Drive Zugriff anfragen.',
        403,
      );
    case 429:
      return new SheetsError(
        'quota',
        'Google-Limit für Abrufe pro Minute erreicht. Eine Minute warten, dann neu laden.',
        429,
      );
    case 404:
      return new SheetsError('not_found', 'Sheet oder Tab nicht gefunden.', 404);
    case 400:
      // Google antwortet mit 400, wenn ein Tab im Bereich nicht existiert.
      return new SheetsError(
        'not_found',
        'Tab oder Bereich nicht gefunden. Wurde ein Tab umbenannt?',
        400,
      );
    default:
      return new SheetsError(
        'unknown',
        `Google hat die Anfrage abgelehnt (Status ${status}).`,
        status,
      );
  }
}

export class GoogleSheetsAdapter implements SheetsAdapter {
  constructor(
    private readonly getToken: TokenGetter,
    private readonly fetchFn: FetchLike = (...args) => fetch(...args),
  ) {}

  async batchGet(spreadsheetId: string, ranges: string[]): Promise<Values[]> {
    const params = new URLSearchParams();
    for (const r of ranges) params.append('ranges', r);
    params.set('majorDimension', 'ROWS');
    params.set('valueRenderOption', 'FORMATTED_VALUE');
    const url = `${BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet?${params.toString()}`;
    const res = await this.send(url, { method: 'GET' });
    const json = (await res.json().catch(() => null)) as ValueRangeResponse | null;
    const out = json?.valueRanges ?? [];
    return ranges.map((_, i) =>
      (out[i]?.values ?? []).map((row) => row.map((c) => (c == null ? '' : String(c)))),
    );
  }

  async updateCell(spreadsheetId: string, a1: string, value: string | boolean): Promise<void> {
    const url = `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(a1)}?valueInputOption=USER_ENTERED`;
    await this.send(url, {
      method: 'PUT',
      body: JSON.stringify({ range: a1, majorDimension: 'ROWS', values: [[value]] }),
    });
  }

  async append(spreadsheetId: string, range: string, row: (string | boolean)[]): Promise<void> {
    const url = `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    await this.send(url, {
      method: 'POST',
      body: JSON.stringify({ majorDimension: 'ROWS', values: [row] }),
    });
  }

  /** Eine Anfrage mit Token. Bei 401 einmal mit frischem Token wiederholen. */
  private async send(url: string, init: { method: string; body?: string }): Promise<Response> {
    let res = await this.once(url, init, false);
    if (res.status === 401) res = await this.once(url, init, true);
    if (!res.ok) throw errorFor(res.status);
    return res;
  }

  private async once(
    url: string,
    init: { method: string; body?: string },
    forceRefresh: boolean,
  ): Promise<Response> {
    let token: string;
    try {
      token = await this.getToken(forceRefresh);
    } catch {
      throw new SheetsError('unauthenticated', 'Anmeldung abgelaufen. Bitte neu anmelden.');
    }
    try {
      return await this.fetchFn(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    } catch {
      throw new SheetsError(
        'network',
        'Keine Verbindung zu Google. Netzwerk prüfen und neu laden.',
      );
    }
  }
}
