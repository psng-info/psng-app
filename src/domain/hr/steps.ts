import { yes } from '@/domain/text';
import { ONLY_FORM } from './stages';
import type { Person, Progress, Rec, StepState } from './types';

export type StepKind = 'box' | 'date' | 'note' | 'auto';

export interface Step {
  text: string;
  /** Spalte im Tab Kandidaten (leer bei `auto`). */
  col?: string;
  kind: StepKind;
}

/** Die 10 Schritte der Checkliste. `box` = Haken, `date` = heutiges Datum, `note` = braucht Text, `auto` = aus Daten. */
export const STEPS: readonly Step[] = [
  { text: 'Kontakt + Formular gesendet', col: 'Formular gesendet', kind: 'box' },
  { text: 'Formular-Antwort', kind: 'auto' },
  { text: '1:1 angeboten + Überblick', col: '1:1 angeboten + Überblick', kind: 'box' },
  { text: '1:1 geführt', col: '1:1 am', kind: 'date' },
  { text: 'Aufgabe / Projekt vereinbart', col: 'Aufgabe vereinbart', kind: 'box' },
  { text: 'Regelmäßige Check-ins', col: 'Letzter Check-in', kind: 'date' },
  { text: 'Review', col: 'Review / Ergebnis', kind: 'note' },
  { text: 'Team-Entscheidung', col: 'Team-Entscheidung', kind: 'box' },
  { text: 'Benachrichtigt', col: 'Benachrichtigt', kind: 'box' },
  { text: 'Integriert', col: 'Integriert', kind: 'box' },
];

const N = STEPS.length;

function stepDone(st: Step, hasForm: boolean, k: Rec): boolean {
  if (st.kind === 'auto') return hasForm || /^ja/i.test(k['Formular ausgefüllt'] ?? '');
  const v = st.col ? (k[st.col] ?? '') : '';
  return st.kind === 'box' ? yes(v) : !!v;
}

type CheckInput = Pick<Person, 'k' | 'status' | 'form'>;

/** Status je Schritt: erledigt, „implied“ (später Schritt erledigt, dieser nicht eingetragen) oder offen. */
export function checks(p: CheckInput): StepState[] {
  const own = STEPS.map((st) => stepDone(st, !!p.form, p.k));
  if (p.status === 'Core' || p.status === 'Helper') for (let i = 0; i < 8; i++) own[i] = true;
  if (p.status === ONLY_FORM) own[1] = true;
  let last = -1;
  own.forEach((v, i) => {
    if (v) last = i;
  });
  return own.map((v, i): StepState => (v ? 'done' : i < last ? 'implied' : 'open'));
}

const HALT_TXT: Record<string, string> = {
  Pool: 'Im Pool',
  Pause: 'Pausiert',
  Abbruch: 'Abgebrochen',
  Abgesagt: 'Abgesagt',
};

export function progress(p: CheckInput): Progress {
  const c = checks(p);
  let last = -1;
  c.forEach((v, i) => {
    if (v === 'done' || v === 'implied') last = i;
  });
  const next = c.indexOf('open');
  const n = c.filter((v) => v !== 'open').length;
  const s = p.status;
  const haltTxt = HALT_TXT[s];
  if (haltTxt) {
    const after = last < 0 ? 'Erstkontakt' : (STEPS[last]?.text ?? '');
    return { step: last, mode: 'halt', checks: c, next, text: `${haltTxt} nach: ${after}` };
  }
  if (next < 0) {
    return {
      step: last,
      mode: 'ok',
      checks: c,
      next,
      text: `Fertig integriert${s ? ' als ' + s : ''}`,
    };
  }
  return {
    step: last,
    mode: 'run',
    checks: c,
    next,
    text: `${n}/${N} · Nächster Schritt: ${STEPS[next]?.text ?? ''}`,
  };
}
