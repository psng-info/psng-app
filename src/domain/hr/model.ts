import { parseDate } from '@/domain/dates';
import { rowsOf, type Row } from '@/domain/rows';
import { norm } from '@/domain/text';
import { flagsOf } from './flags';
import { CLOSED, ONLY_FORM } from './stages';
import type { HrRaw, Person, Rec } from './types';

export const F_NAME = 'Vor- und Nachname';
export const F_MAIL = 'E-Mail';
export const F_TEL = 'Handynummer';
export const F_TS = 'Zeitstempel';
export const F_CONSENT = 'Einverständnis';
/** Formularfelder, die nie angezeigt werden (Identität, Kontakt, Zeitpunkt, Einwilligung). */
export const F_SKIP: ReadonlySet<string> = new Set([F_NAME, F_MAIL, F_TEL, F_TS, F_CONSENT]);

export function fullName(k: Rec): string {
  return [k['Vorname'], k['Nachname']].filter(Boolean).join(' ');
}

/** Stabiler Schlüssel aus dem Namen, `p-vorname_nachname`. */
export function personKey(prefix: 'p' | 'a' | 'f', name: string): string {
  return `${prefix}-${norm(name).replace(/\s/g, '_')}`;
}

/** Name ohne Klammerzusatz, nur das Buddy-Wort („Lennert (geplant)“ → „Lennert“). */
export function buddyName(buddy: string | undefined): string {
  return String(buddy ?? '')
    .replace(/\s*\(.*\)/, '')
    .trim();
}

/** Neueste Notiz je Person (nach Datum, bei Gleichstand die spätere Zeile). */
function latestNotes(notes: Row[]): Map<string, Row> {
  const by = new Map<string, { t: number; i: number; n: Row }>();
  notes.forEach((n, i) => {
    const key = norm(n['Person']);
    if (!key) return;
    const t = parseDate(n['Datum'])?.getTime() ?? 0;
    const prev = by.get(key);
    if (!prev || t > prev.t || (t === prev.t && i > prev.i)) by.set(key, { t, i, n });
  });
  return new Map([...by].map(([k, v]) => [k, v.n]));
}

/** Baut alle Personen: Kandidaten, Abbrüche und Leute, die nur das Formular ausgefüllt haben. */
export function buildPeople(raw: HrRaw, today: Date): Person[] {
  const kand = rowsOf(raw.kandidaten).filter((k) => k['Vorname'] || k['Nachname'] || k['E-Mail']);
  const abbr = rowsOf(raw.abbrueche).filter((k) => k['Vorname'] || k['Nachname']);
  const form = rowsOf(raw.formular);
  const notes = latestNotes(rowsOf(raw.notizen));

  const formByMail = new Map<string, Row>();
  const formByName = new Map<string, Row>();
  for (const f of form) {
    const m = norm(f[F_MAIL]);
    const n = norm(f[F_NAME]);
    if (m) formByMail.set(m, f);
    if (n) formByName.set(n, f);
  }

  const make = (k: Row, source: 'kandidat' | 'abbruch'): Person => {
    const name = fullName(k) || '(ohne Namen)';
    const isAbbruch = source === 'abbruch';
    const status = isAbbruch ? 'Abbruch' : (k['Pipeline-Status'] ?? '');
    const last = parseDate(k['Letzter Kontakt']);
    const dl = parseDate(k['Deadline']);
    const wv = parseDate(k['Wiedervorlage']);
    const mail = k['E-Mail'];
    const fa =
      (mail ? formByMail.get(norm(mail)) : undefined) ?? formByName.get(norm(name)) ?? null;
    const active = !CLOSED.has(status);
    const stage =
      status === 'Neu eingegangen' ? (fa ? 'Bereit für 1:1' : 'Formular fehlt') : status;
    return {
      key: personKey(isAbbruch ? 'a' : 'p', name),
      name,
      source,
      k,
      row: isAbbruch ? null : k._row,
      status,
      stage,
      buddy: buddyName(k['Buddy']),
      last,
      dl,
      wv,
      note: notes.get(norm(name)) ?? null,
      flags: flagsOf({ k, status, isAbbruch, active, last, dl, wv }, today),
      active,
      closed: CLOSED.has(stage),
      form: fa,
      formOnly: false,
      editable: !isAbbruch,
    };
  };

  const people: Person[] = [
    ...kand.map((k) => make(k, 'kandidat')),
    ...abbr.map((k) => make(k, 'abbruch')),
  ];

  const known = new Set<string>();
  const knownMail = new Set<string>();
  for (const k of [...kand, ...abbr]) {
    known.add(norm(fullName(k)));
    if (k['E-Mail']) knownMail.add(norm(k['E-Mail']));
  }
  const fresh = new Map<string, Row>();
  for (const f of form) {
    const n = norm(f[F_NAME]);
    const m = norm(f[F_MAIL]);
    if (known.has(n) || (m && knownMail.has(m))) continue;
    fresh.set(m || n, f);
  }
  for (const f of fresh.values()) {
    const name = f[F_NAME] || '(ohne Namen)';
    people.push({
      key: personKey('f', name),
      name,
      source: 'formular',
      k: {
        'E-Mail': f[F_MAIL] ?? '',
        Telefon: f[F_TEL] ?? '',
        'Stadt / Uni': f['Stadt und Hochschule bzw. Institution'] ?? '',
        'Status & Fach': [f['Was machst du gerade?'], f['Fach und voraussichtliches Ende']]
          .filter(Boolean)
          .join(', '),
        'Interesse / Bereich': f['Wo möchtest du mitmachen?'] ?? '',
        'Zeit pro Woche': f['Wie viel Zeit hast du realistisch pro Woche?'] ?? '',
      },
      row: null,
      status: ONLY_FORM,
      stage: ONLY_FORM,
      buddy: '',
      last: null,
      dl: null,
      wv: null,
      note: notes.get(norm(name)) ?? null,
      flags: [{ lvl: 'new', tag: 'Neu', why: 'Formular da, noch keine Zeile im Tab Kandidaten' }],
      active: true,
      closed: false,
      form: f,
      formOnly: true,
      editable: false,
    });
  }
  return people;
}

/** Kontaktdaten. Nur für die Anzeige hinter „Kontakt anzeigen“ verwenden. */
export function contactOf(p: Person): { mail: string; tel: string } {
  return {
    mail: p.k['E-Mail'] || p.form?.[F_MAIL] || '',
    tel: p.k['Telefon'] || p.form?.[F_TEL] || '',
  };
}

/** Formularantwort ohne Name, Mail, Telefon, Zeitstempel und Einwilligung (leere Felder fallen weg). */
export function formAnswers(p: Person): { label: string; value: string }[] {
  if (!p.form) return [];
  return Object.entries(p.form)
    .filter(([h, v]) => h !== '_row' && !F_SKIP.has(h) && typeof v === 'string' && v)
    .map(([label, value]) => ({ label, value: String(value) }));
}
