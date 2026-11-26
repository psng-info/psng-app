import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST, _internal, ZUGANG_SHEET_ID } from './claude';

const URL_TOKENINFO = 'https://oauth2.googleapis.com/tokeninfo';
const URL_SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${ZUGANG_SHEET_ID}/values/`;
const URL_ANTHROPIC = 'https://api.anthropic.com/v1/messages';

const CLIENT = 'client-123.apps.googleusercontent.com';
const tokenInfo = {
  aud: CLIENT,
  email: 'Anna@Example.org',
  email_verified: 'true',
  scope:
    'openid https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',
};
const ZUGANG = {
  values: [
    ['E-Mail', 'Name', 'Rollen'],
    ['anna@example.org', 'Anna', 'kern'],
    ['hanna@example.org', 'Hanna', 'kern, hr'],
  ],
};
const PLAN = {
  todo: [
    {
      id: 'T1',
      set: [
        { col: 'Status', value: 'erledigt' },
        { col: 'ID', value: 'X' },
      ],
      why: 'ok',
    },
  ],
  hr: [],
  new: [],
  talk: [],
  steps: [],
};

interface Opts {
  info?: object | null;
  zugang?: object | null;
  anthropic?: object | { status: number };
}
let calls: { url: string; init?: RequestInit }[] = [];

function mockFetch(o: Opts = {}): void {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.startsWith(URL_TOKENINFO)) {
        return Promise.resolve(
          o.info === null
            ? new Response('{}', { status: 400 })
            : Response.json(o.info ?? tokenInfo),
        );
      }
      if (url.startsWith(URL_SHEETS)) {
        return Promise.resolve(
          o.zugang === null
            ? new Response('{}', { status: 403 })
            : Response.json(o.zugang ?? ZUGANG),
        );
      }
      if (url === URL_ANTHROPIC) {
        const a = o.anthropic ?? {
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: JSON.stringify(PLAN) }],
          usage: { input_tokens: 10, output_tokens: 5 },
        };
        return Promise.resolve(
          'status' in a
            ? new Response('{}', { status: (a as { status: number }).status })
            : Response.json(a),
        );
      }
      return Promise.reject(new Error(`unerwarteter Aufruf ${url}`));
    }),
  );
}

const body = (over: object = {}) => ({
  mode: 'fast',
  today: '26.11.2026',
  todos: [{ id: 'T1', note: 'erledigt, Mail an x@y.de' }],
  people: [],
  talks: [],
  free: [],
  context: { todos: [{ ID: 'T1', 'To-do': 'Poster', Link: 'https://geheim' }] },
  ...over,
});

interface Out {
  ok: boolean;
  error?: string;
  model?: string;
  plan?: unknown;
}
const out = async (r: Response): Promise<Out> => (await r.json()) as Out;

interface Sent {
  model: string;
  output_config: { format: { type: string } };
  tool_choice?: unknown;
  messages: { content: string }[];
}
const sentBody = (c: { init?: RequestInit } | undefined): Sent => {
  const b = c?.init?.body;
  return JSON.parse(typeof b === 'string' ? b : '{}') as Sent;
};

const call = (
  b: object = body(),
  headers: Record<string, string> = { authorization: 'Bearer tok' },
) =>
  POST(
    new Request('https://app.test/api/claude', {
      method: 'POST',
      headers,
      body: JSON.stringify(b),
    }),
  );

beforeEach(() => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key-nicht-echt');
  vi.stubEnv('GOOGLE_CLIENT_ID', CLIENT);
  vi.stubEnv('AI_DAILY_LIMIT', '3');
  _internal.used.clear();
  mockFetch();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('POST /api/claude', () => {
  it('Happy Path: gültiger Plan, Haiku, strukturierte Ausgabe, keine Kontaktdaten', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const j = await out(res);
    expect(j.ok).toBe(true);
    expect(j.model).toBe('claude-haiku-5-5');
    expect(j.plan).toMatchObject({ todo: [{ id: 'T1', set: { Status: 'erledigt' } }] });
    expect((j.plan as { todo: unknown[] }).todo).toEqual([
      { id: 'T1', set: { Status: 'erledigt' }, why: 'ok' },
    ]);

    const a = calls.find((c) => c.url === URL_ANTHROPIC);
    const h = a?.init?.headers as Record<string, string>;
    expect(h['x-api-key']).toBe('test-key-nicht-echt');
    const sent = sentBody(a);
    expect(sent.model).toBe('claude-haiku-5-5');
    expect(sent.output_config.format.type).toBe('json_schema');
    expect(sent.tool_choice).toBeUndefined();
    expect(sent.messages[0]?.content).toContain('Poster');
    expect(sent.messages[0]?.content).not.toMatch(/geheim|x@y\.de/);
    // Token kommt nie in die URL, Google-Token geht nie an Anthropic.
    expect(calls.every((c) => !c.url.includes('access_token'))).toBe(true);
    expect(JSON.stringify(a?.init)).not.toContain('Bearer tok');
  });

  it('„Gründlich“ nimmt Sonnet', async () => {
    await call(body({ mode: 'thorough' }));
    const a = calls.find((c) => c.url === URL_ANTHROPIC);
    expect(sentBody(a).model).toBe('claude-sonnet-5-5');
  });

  it('ohne Schlüssel oder Client ID: 503, kein Aufruf', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    expect((await call()).status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it('ohne Token: 401, ohne dass etwas aufgerufen wird', async () => {
    expect((await call(body(), {})).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it.each<[string, Opts]>([
    ['Token ungültig', { info: null }],
    ['E-Mail nicht verifiziert', { info: { ...tokenInfo, email_verified: 'false' } }],
    ['Token einer fremden App', { info: { ...tokenInfo, aud: 'andere-app' } }],
    ['ohne Sheets-Scope', { info: { ...tokenInfo, scope: 'openid email' } }],
  ])('%s: 401, Anthropic wird nicht aufgerufen', async (_n, o) => {
    mockFetch(o);
    expect((await call()).status).toBe(401);
    expect(calls.some((c) => c.url === URL_ANTHROPIC)).toBe(false);
  });

  it('nicht auf der Zugangsliste (oder Liste nicht lesbar): 403', async () => {
    mockFetch({ info: { ...tokenInfo, email: 'fremd@example.org' } });
    expect((await call()).status).toBe(403);
    mockFetch({ zugang: null });
    expect((await call()).status).toBe(403);
    expect(calls.some((c) => c.url === URL_ANTHROPIC)).toBe(false);
  });

  it('HR-Notizen nur mit Rolle hr', async () => {
    const withPeople = body({ people: [{ key: 'p-a', note: 'x' }] });
    expect((await call(withPeople)).status).toBe(403);
    mockFetch({ info: { ...tokenInfo, email: 'hanna@example.org' } });
    expect((await call(withPeople)).status).toBe(200);
  });

  it('Tageslimit pro Person (best effort), „Gründlich“ zählt dreifach', async () => {
    expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(200);
    const res = await call();
    expect(res.status).toBe(429);
    expect((await out(res)).error).toBe('rate_limited');
    _internal.used.clear();
    expect((await call(body({ mode: 'thorough' }))).status).toBe(200);
    expect((await call()).status).toBe(429);
  });

  it('kaputter oder leerer Body: 400', async () => {
    expect((await call({ mode: 'fast' })).status).toBe(400);
    const res = await POST(
      new Request('https://app.test/api/claude', {
        method: 'POST',
        headers: { authorization: 'Bearer tok' },
        body: '{',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('Modellfehler werden verständlich gemeldet, ohne Inhalte', async () => {
    vi.stubEnv('AI_DAILY_LIMIT', '50');
    mockFetch({ anthropic: { status: 529 } });
    const busy = await call();
    expect(busy.status).toBe(503);
    mockFetch({ anthropic: { status: 500 } });
    expect((await call()).status).toBe(502);
    mockFetch({ anthropic: { stop_reason: 'refusal', content: [] } });
    expect((await out(await call())).error).toBe('refused');
    mockFetch({
      anthropic: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'kein json' }] },
    });
    expect((await out(await call())).error).toBe('invalid_json');
  });

  it('Müll vom Modell wird durch parsePlan bereinigt', async () => {
    mockFetch({
      anthropic: {
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              todo: [{ id: 'T1', set: [{ col: 'Link', value: 'x' }] }],
              evil: 1,
            }),
          },
        ],
      },
    });
    const j = await out(await call());
    expect(j.plan).toEqual({ todo: [], hr: [], new: [], talk: [], steps: [] });
  });
});

describe('Konfiguration', () => {
  it('Zugang-Sheet-ID der Function ist das Lecture-Sheet der App', () => {
    const cfg = readFileSync(resolve(process.cwd(), 'src/data/config.ts'), 'utf8');
    expect(cfg).toContain(`lectures: '${ZUGANG_SHEET_ID}'`);
  });

  it('vercel.json: CSP erlaubt nur self für /api, keine neue Herkunft für Claude', () => {
    const v = readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8');
    expect(v).toMatch(/connect-src 'self' https:\/\/sheets\.googleapis\.com/);
    expect(v).not.toContain('anthropic');
  });
});
