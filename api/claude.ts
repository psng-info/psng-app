/**
 * „Mit Claude verarbeiten“ (v2). Vercel Function, Node-Runtime, Web-Standard-Handler.
 *
 * Ablauf: Google-Token prüfen (tokeninfo) → E-Mail im Tab Zugang suchen (mit dem Token der Person
 * gelesen) → Tageslimit → Anfrage bereinigen (keine Kontaktdaten) → Anthropic Messages API mit
 * strukturierter Ausgabe → geprüften Plan zurückgeben. Geschrieben wird hier nie.
 *
 * Umgebungsvariablen (nur bei Vercel, nie im Repo):
 *   ANTHROPIC_API_KEY  Pflicht, als „Sensitive“ anlegen
 *   GOOGLE_CLIENT_ID   Pflicht, dieselbe öffentliche Client ID wie im Browser
 *   AI_DAILY_LIMIT     optional, Anfragen pro Person und Tag (Standard 20, „Gründlich“ zählt 3)
 * Es werden weder Eingaben noch Antworten geloggt.
 */
import {
  AI_MODELS,
  PLAN_SCHEMA,
  SYSTEM_PROMPT,
  LIMITS,
  buildUserPrompt,
  parsePlan,
  sanitizeRequest,
  type AiRequest,
} from '../src/domain/ai/plan.js';

/** Lecture-Sheet mit dem Tab Zugang (öffentlich unkritisch, siehe ADR 0005). Ein Test hält das gleich zu `SHEET_IDS.lectures`. */
export const ZUGANG_SHEET_ID = '12bBZKGjUA_ilIqYgz5racmCWZL_M7uBIjLLYsDlwfeI';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

const json = (status: number, body: Record<string, unknown>): Response =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (status: number, error: string, message: string): Response =>
  json(status, { ok: false, error, message });

// --- Tageslimit (best effort) ------------------------------------------------
// Serverless-Instanzen teilen keinen Speicher: Dieser Zähler gilt pro warmer Instanz und wird bei
// Kaltstart zurückgesetzt. Er bremst Dauerklicken, ist aber KEINE harte Grenze. Die harte Grenze ist
// das Ausgabenlimit in der Claude Console (siehe docs/decisions/0006-ki-function.md).
const used = new Map<string, number>();

function takeQuota(email: string, weight: number, now = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  for (const k of used.keys()) if (!k.endsWith(day)) used.delete(k);
  const limit = Math.max(1, Number(process.env['AI_DAILY_LIMIT']) || 20);
  const key = `${email}|${day}`;
  const n = used.get(key) ?? 0;
  if (n + weight > limit) return false;
  used.set(key, n + weight);
  return true;
}

// --- Google ---------------------------------------------------------------------

interface TokenInfo {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  scope?: string;
}

/** Prüft das Token bei Google (POST, damit es nicht in einer URL landet). Gibt die E-Mail zurück oder null. */
async function verifyToken(token: string, clientId: string): Promise<string | null> {
  const res = await fetch(TOKENINFO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ access_token: token }),
  });
  if (!res.ok) return null;
  const info = (await res.json()) as TokenInfo;
  const verified = info.email_verified === true || info.email_verified === 'true';
  if (!verified || !info.email || info.aud !== clientId) return null;
  if (!(info.scope ?? '').split(' ').some((s) => s.endsWith('/auth/spreadsheets'))) return null;
  return info.email.trim().toLowerCase();
}

/** Rollen der Person laut Tab Zugang (mit deren eigenem Token gelesen, also nur wer das Sheet sehen darf). null = nicht auf der Liste. */
async function rolesOf(token: string, email: string): Promise<Set<string> | null> {
  const range = encodeURIComponent('Zugang!A1:C200');
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${ZUGANG_SHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  const values = ((await res.json()) as { values?: string[][] }).values ?? [];
  const head = (values[0] ?? []).map((h) => String(h).trim());
  const iMail = head.indexOf('E-Mail');
  const iRoles = head.indexOf('Rollen');
  if (iMail < 0) return null;
  for (const row of values.slice(1)) {
    if (
      String(row[iMail] ?? '')
        .trim()
        .toLowerCase() !== email
    )
      continue;
    const roles = String(iRoles >= 0 ? (row[iRoles] ?? '') : '')
      .toLowerCase()
      .split(/[\s,;]+/)
      .filter((r) => r === 'kern' || r === 'hr' || r === 'admin');
    return new Set(roles.length ? roles : ['kern']);
  }
  return null;
}

// --- Anthropic ------------------------------------------------------------------

interface Messages {
  stop_reason?: string;
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

async function askClaude(req: AiRequest, apiKey: string): Promise<Messages> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODELS[req.mode],
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(req) }],
      output_config: {
        effort: req.mode === 'thorough' ? 'medium' : 'low',
        format: { type: 'json_schema', schema: PLAN_SCHEMA },
      },
    }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!res.ok) throw new UpstreamError(res.status);
  return (await res.json()) as Messages;
}

class UpstreamError extends Error {
  constructor(readonly status: number) {
    super(`anthropic ${status}`);
  }
}

// --- Handler --------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  const clientId = process.env['GOOGLE_CLIENT_ID'];
  if (!apiKey || !clientId)
    return fail(503, 'not_configured', 'Claude ist noch nicht eingerichtet.');

  const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return fail(401, 'unauthenticated', 'Bitte neu anmelden.');

  let email: string | null;
  try {
    email = await verifyToken(token, clientId);
  } catch {
    return fail(502, 'auth_unavailable', 'Anmeldung konnte nicht geprüft werden. Später nochmal.');
  }
  if (!email) return fail(401, 'unauthenticated', 'Bitte neu anmelden.');

  let roles: Set<string> | null;
  try {
    roles = await rolesOf(token, email);
  } catch {
    return fail(502, 'access_unavailable', 'Zugangsliste nicht lesbar. Später nochmal.');
  }
  if (!roles) return fail(403, 'forbidden', 'Dieses Konto steht nicht auf der Zugangsliste.');

  const raw = await request.text();
  if (raw.length > LIMITS.bodyChars)
    return fail(413, 'too_large', 'Zu viel auf einmal vorgemerkt.');
  let req: AiRequest;
  try {
    req = sanitizeRequest(JSON.parse(raw));
  } catch (e) {
    return fail(400, 'bad_request', e instanceof Error ? e.message : 'Anfrage unlesbar.');
  }
  if (req.people.length > 0 && !roles.has('hr')) {
    return fail(403, 'forbidden', 'Personen aus dem HR-Sheet sind nur für die Rolle HR.');
  }

  if (!takeQuota(email, req.mode === 'thorough' ? 3 : 1)) {
    return fail(429, 'rate_limited', 'Tageslimit erreicht. Morgen wieder, oder Lennert fragen.');
  }

  try {
    const msg = await askClaude(req, apiKey);
    if (msg.stop_reason === 'refusal') {
      return fail(502, 'refused', 'Claude hat die Anfrage abgelehnt. Anders formulieren.');
    }
    if (msg.stop_reason === 'max_tokens') {
      return fail(502, 'too_long', 'Die Antwort wurde zu lang. Weniger auf einmal verarbeiten.');
    }
    const text = (msg.content ?? []).find((b) => b.type === 'text')?.text ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fail(
        502,
        'invalid_json',
        'Claude hat keine verwertbare Antwort geliefert. Nochmal versuchen.',
      );
    }
    return json(200, {
      ok: true,
      plan: parsePlan(parsed),
      model: AI_MODELS[req.mode],
      usage: { input: msg.usage?.input_tokens ?? 0, output: msg.usage?.output_tokens ?? 0 },
    });
  } catch (e) {
    const status = e instanceof UpstreamError ? e.status : 0;
    if (status === 429 || status === 529) {
      return fail(503, 'busy', 'Claude ist gerade ausgelastet. Gleich nochmal versuchen.');
    }
    return fail(502, 'upstream', 'Claude ist gerade nicht erreichbar.');
  }
}

/** Nur für Tests. */
export const _internal = { used };
