/** Vorname oder voller Name aus der Zugangsliste gleicht dem Owner. */
export function memberMatcher(team: { name: string }[]): (owner: string) => boolean {
  const names = new Set(
    team.flatMap((m) => [m.name.toLowerCase(), (m.name.split(/\s+/)[0] ?? '').toLowerCase()]),
  );
  return (owner) => names.has(owner.trim().toLowerCase());
}
