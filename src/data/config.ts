/** Sheet-IDs, Bereiche und Intervalle. Die IDs sind öffentlich unkritisch, der Schutz liegt in den Drive-Freigaben (ADR 0005). */

export const SHEET_IDS = {
  todos: '1RconQa9454jAwtibcp2kcoZAnAh2dK1ZhHHMBG1oCJM',
  hr: '10PYamzuwl_9-cnoJOkbl0SO1sWvPrRWuhy8u0SaVS7Y',
  lectures: '12bBZKGjUA_ilIqYgz5racmCWZL_M7uBIjLLYsDlwfeI',
} as const;

/** Tab-Namen, so wie sie im Sheet stehen (ohne Quoting). */
export const TABS = {
  lectures: 'Lectures',
  speaker: 'Speaker',
  steps: 'Talk-Schritte',
  reports: 'Talk-Berichte',
  speakerForm: 'Speaker-Formular',
  access: 'Zugang',
  todos: 'To-dos',
  kandidaten: 'Kandidaten',
  abbrueche: 'Abbrüche',
  formular: 'Formularantworten 1',
  notizen: 'Notizen',
} as const;

/** A1-Bereiche je Ansicht. Reihenfolge = Reihenfolge der Ergebnisse von batchGet. */
export const RANGES = {
  talks: {
    lectures: 'Lectures!A1:AF400',
    speakers: 'Speaker!A1:Z600',
    steps: "'Talk-Schritte'!A1:G5000",
    reports: "'Talk-Berichte'!A1:T400",
    speakerForm: "'Speaker-Formular'!A1:AD400",
  },
  access: 'Zugang!A1:C200',
  todos: "'To-dos'!A1:R1000",
  hr: {
    kandidaten: 'Kandidaten!A1:AA1000',
    abbrueche: 'Abbrüche!A1:AC1000',
    formular: "'Formularantworten 1'!A1:U500",
    notizen: 'Notizen!A1:E2000',
  },
} as const;

const MINUTE = 60_000;
export const REFETCH = {
  talks: 15 * MINUTE,
  todos: 5 * MINUTE,
  hr: 10 * MINUTE,
} as const;
export const STALE_MS = { talks: MINUTE, todos: MINUTE, hr: MINUTE, access: 10 * MINUTE } as const;

export const GOOGLE_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();

export type DataMode = 'sheets' | 'demo';

/** `VITE_DATA` gewinnt. Ohne Angabe: Demo, solange keine Client ID da ist. */
export const DATA_MODE: DataMode =
  import.meta.env.VITE_DATA === 'sheets'
    ? 'sheets'
    : import.meta.env.VITE_DATA === 'demo'
      ? 'demo'
      : GOOGLE_CLIENT_ID
        ? 'sheets'
        : 'demo';

export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/spreadsheets openid email';
