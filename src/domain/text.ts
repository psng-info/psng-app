/** Kombinierende Akzente und unsichtbare Steuerzeichen (Zero-Width, Richtungsmarken). */
const INVISIBLE = new RegExp('[\\u0300-\\u036f\\u200b-\\u200f\\u202a-\\u202e]', 'g');

/** Bindestrich und Gedankenstriche (U+2010 bis U+2015, Minuszeichen). */
const DASHES = new RegExp('[-\\u2010-\\u2015\\u2212]', 'g');

/**
 * Vergleichsform für Text: klein, ohne Akzente und unsichtbare Zeichen,
 * Binde- und Gedankenstriche als Leerzeichen, Leerraum zusammengefasst.
 */
export function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(INVISIBLE, '')
    .replace(/ß/g, 'ss')
    .replace(DASHES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ja-Werte im Sheet: true, wahr, ja, x, ✓ (Groß/klein egal). */
export function yes(v: string | null | undefined): boolean {
  return /^(true|wahr|ja|x|✓)$/i.test(String(v ?? '').trim());
}
