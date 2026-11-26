import type { AiPlan, AiRequest } from '@/domain/ai/plan';
import { parsePlan } from '@/domain/ai/plan';
import { DATA_MODE } from './config';

/** Fehler von „Mit Claude verarbeiten“ mit deutscher Meldung (ohne Inhalte der Notizen). */
export class AiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

const GENERIC = 'Verarbeiten fehlgeschlagen. Später nochmal versuchen.';

/**
 * Holt einen Vorschlag. Demo-Modus: deterministischer Mock, kein Netzwerk.
 * Sonst POST an die eigene Function `/api/claude` mit dem Google-Token (kein Drittanbieter im Browser).
 */
export async function requestPlan(
  req: AiRequest,
  getToken: (forceRefresh?: boolean) => Promise<string>,
): Promise<AiPlan> {
  if (DATA_MODE === 'demo') {
    const { mockPlan } = await import('@/domain/ai/mock');
    return mockPlan(req);
  }
  let res: Response;
  try {
    res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
      body: JSON.stringify(req),
    });
  } catch {
    throw new AiError('network', 'Keine Verbindung. Später nochmal versuchen.');
  }
  let body: { ok?: boolean; plan?: unknown; error?: string; message?: string } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    // Nicht-JSON-Antwort (z. B. Gateway-Fehler): generische Meldung
  }
  if (!res.ok || !body.ok) {
    throw new AiError(body.error ?? `http_${res.status}`, body.message ?? GENERIC);
  }
  return parsePlan(body.plan);
}
