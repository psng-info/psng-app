/** „Anna Beispiel“ wird „AB“, „BPSA-Orga“ wird „BO“. */
export function initialsOf(name: string): string {
  const parts = name
    .replace(/\(.*?\)/g, ' ')
    .split(/[\s\-/]+/)
    .filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]];
  return letters
    .map((p) => (p ? Array.from(p)[0] : ''))
    .join('')
    .toUpperCase();
}
