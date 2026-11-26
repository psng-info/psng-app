const ROLE_OWNERS = ['Lokale Orga', 'BPSA-Orga'];

/** Owner-Auswahl: Team und Rollen, ohne Doppelte. */
export function ownerOptions(team: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...team, ...ROLE_OWNERS]) {
    const n = name.trim();
    if (n && !seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase());
      out.push(n);
    }
  }
  return out;
}

export const OWNER_OTHER = '__other__';

/** Vorbelegung des Owner-Feldes: Treffer in der Liste (Groß-/Kleinschreibung egal), sonst „Anderer Name“ mit dem Namen. */
export function initialOwner(
  current: string,
  options: string[],
): { choice: string; custom: string } {
  const cur = current.trim();
  if (!cur) return { choice: '', custom: '' };
  const hit = options.find((o) => o.toLowerCase() === cur.toLowerCase());
  return hit ? { choice: hit, custom: '' } : { choice: OWNER_OTHER, custom: cur };
}
