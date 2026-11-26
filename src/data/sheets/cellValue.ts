/**
 * Alle Schreibzugriffe laufen als USER_ENTERED: Text, der mit = + - @ beginnt, würde als Formel gelesen.
 * Ein führendes ' macht ihn zu Text (Google speichert das ' nicht mit). Wahrheitswerte bleiben unberührt.
 * Jede Zelle, die die App schreibt, geht durch diese Funktion.
 */
export function safeCell<T extends string | boolean>(v: T): T | string {
  return typeof v === 'string' && /^[=+\-@]/.test(v) ? `'${v}` : v;
}

/** Eine ganze Zeile absichern (für `append`). */
export const safeRow = (row: (string | boolean)[]): (string | boolean)[] => row.map(safeCell);
