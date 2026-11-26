import { norm } from '@/domain/text';

const TITLES = /\b(prof|dr|med|phil|rer|nat|pd|habil|msc|bsc|ma|ba|dipl|psych|phd)\b\.?/g;

/** Name ohne akademische Titel, nur Buchstaben und einfache Leerzeichen (Vergleichsform). */
export function nn(name: string | null | undefined): string {
  return norm(name)
    .replace(TITLES, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Gleicher Name nach `nn`, oder beide mehrteilig mit gleichem Nachnamen und gleichem Vornamen-Anfangsbuchstaben. */
export function nameMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = nn(a);
  const y = nn(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const xs = x.split(' ');
  const ys = y.split(' ');
  return (
    xs.length > 1 &&
    ys.length > 1 &&
    xs[xs.length - 1] === ys[ys.length - 1] &&
    xs[0]?.[0] === ys[0]?.[0]
  );
}

/** Speaker-Zelle in einzelne Namen trennen: `,` `&` `/` „und“ „and“. */
export function splitNames(cell: string | null | undefined): string[] {
  return String(cell ?? '')
    .split(/,|&|\/|\bund\b|\band\b/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Levenshtein-Abstand, bricht ab 2 ab (wir brauchen nur „genau 1“). */
function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    const row: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        row[j] = j;
      } else {
        const prev = d[i - 1] ?? [];
        row[j] = Math.min(
          (prev[j] ?? 0) + 1,
          (row[j - 1] ?? 0) + 1,
          (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      }
    }
    d[i] = row;
  }
  return d[a.length]?.[b.length] ?? 2;
}

/**
 * Schreibweise: weicht ein Namensteil (≥4 Buchstaben) um genau einen Buchstaben
 * vom Teil der E-Mail vor dem @ ab? Gibt die Schreibweise aus der E-Mail zurück, sonst "".
 */
export function spell(name: string, mail: string | null | undefined): string {
  if (!mail) return '';
  const local = norm(String(mail).split('@')[0])
    .split(/[._\s\d]+/)
    .filter((w) => w.length >= 4);
  for (const w of nn(name)
    .split(' ')
    .filter((x) => x.length >= 4)) {
    if (local.includes(w)) continue;
    const hit = local.find((x) => lev(x, w) === 1);
    if (hit) return hit;
  }
  return '';
}
