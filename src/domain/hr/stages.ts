export const ONLY_FORM = 'Nur Formular';
export const NO_STATUS = 'Ohne Status';

export const STAGES = [
  'Formular fehlt',
  'Bereit für 1:1',
  'Warte auf Termin',
  '1:1 geführt',
  'Probeaufgabe läuft',
  'Review',
  'Core',
  'Helper',
  'Pool',
  'Pause',
  'Abgesagt',
  'Abbruch',
] as const;

/** Abgeschlossene Stufen (Ergebnisse): keine aktive Pipeline mehr. */
export const CLOSED: ReadonlySet<string> = new Set([
  'Core',
  'Abbruch',
  'Helper',
  'Pool',
  'Pause',
  'Abgesagt',
]);

export const CLOSED_TXT: Readonly<Record<string, string>> = {
  Pool: 'im Pool',
  Abbruch: 'abgebrochen',
  Pause: 'pausiert',
  Abgesagt: 'abgesagt',
  Core: 'aufgenommen (Core)',
  Helper: 'aufgenommen (Helper)',
};

/** Sortier-Rang einer Stufe: „Nur Formular“ vorn, Unbekanntes hinten. */
export function stageOrder(stage: string): number {
  if (stage === ONLY_FORM) return -1;
  const i = (STAGES as readonly string[]).indexOf(stage);
  return i < 0 ? STAGES.length : i;
}
