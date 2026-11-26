const ROLE_OWNERS = ['Lokale Orga', 'BPSA-Orga'];

/** Owner-Auswahl: aktueller Owner, Team, Rollen. Reihenfolge ohne Doppelte. */
export function ownerOptions(current: string, team: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [current, ...team, ...ROLE_OWNERS]) {
    const n = name.trim();
    if (n && !seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase());
      out.push(n);
    }
  }
  return out;
}
