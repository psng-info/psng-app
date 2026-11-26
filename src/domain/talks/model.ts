import { addDays, daysFrom, formatDate, formatShort, monthLabel, parseDate } from '@/domain/dates';
import { nameMatch, nn, spell, splitNames } from '@/domain/names';
import { col, rowsOf, type Row, type Values } from '@/domain/rows';
import { norm } from '@/domain/text';
import { ROLE, STEPS, TRACK_FROM, cell, hasYT, isHeld, isOff, num, onsite, tnOf } from './steps';
import type {
  ActionItem,
  Flag,
  FlagLevel,
  Speaker,
  StepLogEntry,
  StepState,
  StepStatus,
  Talk,
  TalkBase,
  TalkSpeaker,
  TalksModel,
} from './types';

export interface TalksInput {
  lectures: Values;
  speakers: Values;
  steps: Values;
  reports: Values;
  speakerForm: Values;
}

// --- Schlüssel und Zeilensuche -------------------------------------------

/** Talk-Schlüssel: `TT.MM.JJJJ · <Speaker-Zelle>`, ohne Datum `ohne Datum · …`. */
export function talkKey(date: Date | null, speakerCell: string): string {
  return `${date ? formatDate(date) : 'ohne Datum'} · ${String(speakerCell ?? '').trim()}`;
}

/**
 * Sheet-Zeilennummer (Kopfzeile = 1) der Lecture zu `key`, frisch aus `values` gesucht.
 * Erst gleiches Datum und exakte Speaker-Zelle, dann gleiches Datum und `nameMatch`. Sonst null.
 */
export function findLectureRow(values: Values, key: string): number | null {
  const head = (values[0] ?? []).map((h) => String(h).trim());
  const iDate = head.indexOf('Datum');
  const iSpeaker = head.indexOf('Speaker');
  if (iDate < 0 || iSpeaker < 0) return null;
  const parts = key.split(' · ');
  const keyDate = parts[0] === 'ohne Datum' ? null : parseDate(parts[0]);
  const keySpeaker = parts.slice(1).join(' · ');
  const sameDate = (cells: string[]): boolean => {
    const d = parseDate(cells[iDate]);
    return keyDate ? !!d && +d === +keyDate : !d;
  };
  const data = values.slice(1);
  let i = data.findIndex((c) => sameDate(c) && String(c[iSpeaker] ?? '').trim() === keySpeaker);
  if (i < 0) i = data.findIndex((c) => sameDate(c) && nameMatch(c[iSpeaker], keySpeaker));
  return i < 0 ? null : i + 2;
}

// --- Schritte ------------------------------------------------------------

/** Ablauf eines Talks: Status, Owner und Fälligkeit je Schritt. Neuester Log-Eintrag je Feld gewinnt. */
export function stepsOf(t: TalkBase, today: Date): StepState[] {
  const off = isOff(t);
  const held = isHeld(t);
  const legacy = !!t.date && t.date < TRACK_FROM;
  return STEPS.map((def) => {
    const entries = t.log.filter((l) => norm(l.step) === norm(def.key)).reverse();
    const lastStatus = entries.find((l) => l.status);
    const lastOwner = entries.find((l) => l.owner);
    const lastNote = entries.find((l) => l.note);
    const logStatus = lastStatus ? norm(lastStatus.status) : '';
    const isAuto = !!def.auto?.(t);
    let status: StepStatus;
    if (off || (def.when && !def.when(t)) || logStatus === 'nicht notig') status = 'na';
    else if (isAuto || logStatus === 'erledigt') status = 'done';
    else if (held && def.phase < 2) status = 'implied';
    else if (legacy && def.sop) status = 'unk';
    else status = 'open';
    const due = t.date ? addDays(t.date, def.offsetDays) : null;
    const dueIn = due ? daysFrom(due, today) : null;
    const open = status === 'open';
    const state: StepState = {
      def,
      status,
      isAuto,
      owner: lastOwner ? lastOwner.owner : ROLE[def.role](t),
      ownerFromLog: !!lastOwner,
      due,
      late: open && dueIn !== null && dueIn < 0,
      soon: open && dueIn !== null && dueIn >= 0 && dueIn <= 7,
    };
    if (lastStatus) state.lastStatus = lastStatus;
    if (lastNote) state.lastNote = lastNote;
    return state;
  });
}

// --- Flags ---------------------------------------------------------------

/** Prozess-Flags (Ablauf), alle anderen Flags heißen „Daten prüfen“. */
export const PROCESS_FLAGS: ReadonlySet<string> = new Set([
  'Überfällig',
  'Bald fällig',
  'Owner fehlt',
]);

export const isProcessFlag = (f: Flag): boolean => PROCESS_FLAGS.has(f.tag);

/** Hinweise zu einem Talk, leer bei abgesagten oder pausierten Talks. */
export function flagsOf(t: TalkBase & { steps: StepState[] }, today: Date): Flag[] {
  const flags: Flag[] = [];
  const add = (level: FlagLevel, tag: string, why: string, fix?: Flag['fix']): void => {
    flags.push(fix ? { level, tag, why, fix } : { level, tag, why });
  };
  if (isOff(t)) return flags;

  const late = t.steps.filter((s) => s.late);
  const soon = t.steps.filter((s) => s.soon);
  const noOwner = t.steps.filter((s) => s.status === 'open' && !s.owner);
  if (late.length)
    add(
      'crit',
      'Überfällig',
      late.map((s) => s.def.label + (s.owner ? ` (${s.owner})` : '')).join(', '),
    );
  if (soon.length)
    add(
      'warn',
      'Bald fällig',
      soon.map((s) => `${s.def.label} bis ${s.due ? formatShort(s.due, today) : ''}`).join(', '),
    );
  if (noOwner.length) add('crit', 'Owner fehlt', noOwner.map((s) => s.def.label).join(', '));

  const upcoming = t.dd !== null && t.dd >= 0;
  const past = t.dd !== null && t.dd < 0;
  // Ort und Abstract werden erst kurz vor dem Talk dringend (≤ 21 Tage, Ort ≤ 7 Tage kritisch)
  if (upcoming && t.dd !== null && t.dd <= 21 && onsite(t) && !cell(t.raw, 'Ort'))
    add(
      t.dd <= 7 ? 'crit' : 'warn',
      'Ort fehlt',
      `Format ${cell(t.raw, 'Format')}, aber kein Ort im Sheet`,
    );
  if (upcoming && t.dd !== null && t.dd <= 21 && !cell(t.raw, 'Abstract'))
    add('warn', 'Abstract fehlt', 'Wird für die Ankündigung gebraucht');
  if (hasYT(t) && /^nein/i.test(cell(t.raw, 'Veröffentlichung')))
    add('crit', 'Freigabe', 'YouTube-Link eingetragen, obwohl Veröffentlichung = nein');
  if (hasYT(t) && t.status.toLowerCase() !== 'veröffentlicht') {
    add('warn', 'Status', `YouTube-Link vorhanden, Status steht auf „${t.status || 'leer'}“`, {
      set: { Status: 'veröffentlicht' },
      label: 'Status auf veröffentlicht',
    });
  } else if (past && ['fix', 'angefragt', 'idee', ''].includes(t.status.toLowerCase())) {
    add(
      'warn',
      'Status',
      `Talk war am ${t.date ? formatShort(t.date, today) : ''}, Status steht noch auf „${t.status || 'leer'}“`,
      { set: { Status: 'durchgeführt' }, label: 'Status auf durchgeführt' },
    );
  }
  if (past && !tnOf(t)) add('warn', 'Zahlen', 'Teilnehmende fehlen');
  for (const x of t.speakers) {
    if (!x.speaker) {
      add('warn', 'Speaker', `${x.name} fehlt im Tab Speaker (oder andere Schreibweise)`);
    } else {
      const hint = spell(x.name, cell(x.speaker.raw, 'E-Mail'));
      if (hint)
        add('warn', 'Schreibweise', `„${x.name}“, die E-Mail schreibt „${hint}“. Namen prüfen`);
    }
  }
  return flags;
}

/** Monatsanfänge der nächsten 4 Monate (ohne den laufenden) ohne Talk. */
export function gapsOf(talks: Pick<TalkBase, 'date' | 'status'>[], today: Date): Date[] {
  const gaps: Date[] = [];
  for (let i = 1; i <= 4; i++) {
    const from = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    if (!talks.some((t) => t.date && t.date >= from && t.date < to && !isOff(t))) gaps.push(from);
  }
  return gaps;
}

// --- Modell --------------------------------------------------------------

function speakerFor(name: string, speakers: Speaker[], forms: Row[]): TalkSpeaker {
  const speaker = speakers.find((s) => nameMatch(s.name, name)) ?? null;
  const mail = speaker ? cell(speaker.raw, 'E-Mail') : '';
  // Letzte Antwort gewinnt
  const form =
    forms
      .filter(
        (f) =>
          (!!mail && norm(col(f, 'E-Mail')) === norm(mail)) ||
          nameMatch(col(f, 'Vollständiger Name'), name),
      )
      .pop() ?? null;
  return { name, speaker, form };
}

/** Berichte zu einem Talk: Lecture-Feld „Datum · Speaker“, sonst „Falls nicht in der Liste“-Felder. */
function reportsFor(names: string[], date: Date | null, reports: Row[]): Row[] {
  return reports.filter((p) => {
    const parts = cell(p, 'Lecture').split(' · ');
    if (parts.length >= 2) {
      const rDate = parts[0] === 'ohne Datum' ? null : parseDate(parts[0]);
      const sameDate = !rDate || !date || +rDate === +date;
      return sameDate && names.some((n) => nameMatch(parts.slice(1).join(' · '), n));
    }
    const fd = parseDate(col(p, 'Falls nicht in der Liste: Datum'));
    const text = norm(col(p, 'Falls nicht in der Liste: Speaker'));
    if (!fd || !date || +fd !== +date) return false;
    return names.some((n) => {
      const surname = nn(n).split(' ').pop();
      return !!surname && text.includes(surname);
    });
  });
}

function toLogEntry(r: Row): StepLogEntry {
  return {
    row: r._row,
    date: parseDate(cell(r, 'Zeitpunkt')),
    talk: cell(r, 'Talk'),
    step: cell(r, 'Schritt'),
    status: cell(r, 'Status'),
    owner: cell(r, 'Owner'),
    by: cell(r, 'Von'),
    note: cell(r, 'Notiz'),
  };
}

export function buildTalksModel(input: TalksInput, today: Date): TalksModel {
  const speakers: Speaker[] = rowsOf(input.speakers)
    .filter((r) => cell(r, 'Name'))
    .map((r) => ({ name: cell(r, 'Name'), row: r._row, raw: r }));
  const forms = rowsOf(input.speakerForm);
  const reports = rowsOf(input.reports);
  const log = rowsOf(input.steps)
    .filter((r) => cell(r, 'Talk') && cell(r, 'Schritt'))
    .map(toLogEntry);

  const bases: TalkBase[] = rowsOf(input.lectures)
    .filter((r) => cell(r, 'Speaker') || cell(r, 'Titel'))
    .map((raw) => {
      const date = parseDate(cell(raw, 'Datum'));
      const names = splitNames(cell(raw, 'Speaker'));
      return {
        key: talkKey(date, cell(raw, 'Speaker')),
        row: raw._row,
        date,
        dd: date ? daysFrom(date, today) : null,
        status: cell(raw, 'Status'),
        title: cell(raw, 'Titel') || '(ohne Titel)',
        names,
        speakers: names.map((n) => speakerFor(n, speakers, forms)),
        reports: reportsFor(names, date, reports),
        log: [],
        raw,
      };
    });

  // Log zuordnen: exakter Schlüssel, sonst Speaker-Teil per nameMatch, aber nur bei genau einem Treffer
  for (const entry of log) {
    const key = entry.talk.trim();
    let target = bases.find((t) => t.key === key);
    if (!target) {
      const speakerPart = key.split(' · ').slice(1).join(' · ');
      const candidates = bases.filter((t) => t.names.some((n) => nameMatch(n, speakerPart)));
      if (candidates.length === 1) target = candidates[0];
    }
    target?.log.push(entry);
  }

  const talks: Talk[] = bases.map((base) => {
    const steps = stepsOf(base, today);
    return { ...base, steps, flags: flagsOf({ ...base, steps }, today) };
  });
  const next =
    talks
      .filter((t) => t.date && t.dd !== null && t.dd >= 0 && !isOff(t))
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))[0] ?? null;
  return { talks, speakers, next, gaps: gapsOf(talks, today) };
}

// --- Handlungsbedarf -----------------------------------------------------

/**
 * Talks mit Flags plus Semesterplan-Lücken. Rang: crit vor warn, dann anstehend vor vergangen,
 * dann Nähe zu heute. Lücken kommen zuletzt in Monatsreihenfolge.
 */
export function actionItems(model: TalksModel, today: Date): ActionItem[] {
  const items: ActionItem[] = model.talks
    .filter((t) => t.flags.length > 0)
    .map((talk) => ({
      talk,
      label: `${talk.date ? formatShort(talk.date, today) : 'ohne Datum'} · ${talk.names.join(', ')}`,
      flags: talk.flags,
      rank: talk.flags.some((f) => f.level === 'crit') ? (0 as const) : (1 as const),
    }));
  const upcomingFirst = (t: Talk): number => (t.dd !== null && t.dd >= 0 ? 0 : 1);
  const distance = (t: Talk): number => Math.abs(t.dd ?? 999);
  items.sort((a, b) => {
    const x = a.talk;
    const y = b.talk;
    if (!x || !y) return 0;
    return a.rank - b.rank || upcomingFirst(x) - upcomingFirst(y) || distance(x) - distance(y);
  });
  const gaps: ActionItem[] = model.gaps.map((month) => ({
    talk: null,
    label: monthLabel(month),
    flags: [
      {
        level: 'warn',
        tag: 'Semesterplan',
        why: `${monthLabel(month)}: noch kein Talk geplant (Ziel laut SOP: ein Talk pro Monat)`,
      },
    ],
    rank: 1,
  }));
  return [...items, ...gaps];
}

// --- Kacheln, Zahlen, Speaker-Pool ---------------------------------------

export interface TalkTile {
  k: string;
  label: string;
  level?: FlagLevel;
  test: (t: Talk) => boolean;
}

/** Filter-Kacheln der Ansicht Talks, in Anzeigereihenfolge. */
export const TALK_TILES: TalkTile[] = [
  { k: 'up', label: 'Anstehend', test: (t) => t.dd !== null && t.dd >= 0 && !isOff(t) },
  {
    k: 'late',
    label: 'Mit überfälligen Schritten',
    level: 'crit',
    test: (t) => t.steps.some((s) => s.late),
  },
  {
    k: 'soon',
    label: 'Schritte fällig in 7 Tagen',
    level: 'warn',
    test: (t) => t.steps.some((s) => s.soon),
  },
  {
    k: 'own',
    label: 'Schritt ohne Owner',
    level: 'crit',
    test: (t) => t.flags.some((f) => f.tag === 'Owner fehlt'),
  },
  {
    k: 'dq',
    label: 'Daten prüfen',
    level: 'warn',
    test: (t) => t.flags.some((f) => !isProcessFlag(f)),
  },
  {
    k: 'rec',
    label: 'Aufnahme ausstehend',
    level: 'warn',
    test: (t) => isHeld(t) && t.steps.some((s) => s.def.key === 'YouTube' && s.status === 'open'),
  },
  { k: 'held', label: 'Gehalten', test: (t) => isHeld(t) },
];

export interface StatsRow {
  talk: Talk;
  tn: number;
  views: number;
}

export interface TalkStats {
  /** Gehaltene Talks mit Datum, älteste zuerst. */
  rows: StatsRow[];
  totalTn: number;
  totalViews: number;
  /** Ø Teilnehmende pro gehaltenem Talk, gerundet; null ohne Talks. */
  averageTn: number | null;
  maxTn: number;
  maxViews: number;
}

export function stats(model: TalksModel): TalkStats {
  const rows = model.talks
    .filter((t) => isHeld(t) && t.date)
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
    .map((talk) => ({ talk, tn: tnOf(talk), views: num(talk.raw, 'Views nach 4 Wo.') }));
  const totalTn = rows.reduce((sum, r) => sum + r.tn, 0);
  return {
    rows,
    totalTn,
    totalViews: rows.reduce((sum, r) => sum + r.views, 0),
    averageTn: rows.length ? Math.round(totalTn / rows.length) : null,
    maxTn: Math.max(1, ...rows.map((r) => r.tn)),
    maxViews: Math.max(1, ...rows.map((r) => r.views)),
  };
}

/** Reihenfolge der bekannten Speaker-Status, unbekannte folgen danach. */
export const SPEAKER_STATUSES = [
  'Idee',
  'angefragt',
  'zugesagt',
  'gesprochen',
  'abgesagt',
  'pausiert',
] as const;
const NO_STATUS = 'ohne Status';

export interface SpeakerPoolEntry {
  speaker: Speaker;
  status: string;
  /** Talk zum Öffnen: nächster anstehender, sonst der jüngste vergangene. */
  talk: Talk | null;
}

export interface SpeakerPool {
  /** Kacheln: Status mit Anzahl, bekannte zuerst. */
  statuses: { status: string; count: number }[];
  /** Endorsement = ja unter den gesprochenen; null, wenn niemand gesprochen hat. */
  endorsements: { yes: number; spoken: number } | null;
  /** Alle Speaker, späterer Status zuerst, dann nach Name. */
  entries: SpeakerPoolEntry[];
}

export function speakerPool(model: TalksModel): SpeakerPool {
  const statusOf = (s: Speaker): string => cell(s.raw, 'Status') || NO_STATUS;
  const counts = new Map<string, number>();
  for (const s of model.speakers) counts.set(statusOf(s), (counts.get(statusOf(s)) ?? 0) + 1);
  const known: string[] = [...SPEAKER_STATUSES];
  const order = [
    ...known.filter((s) => counts.has(s)),
    ...[...counts.keys()].filter((s) => !known.includes(s)),
  ];
  const spoken = model.speakers.filter((s) => cell(s.raw, 'Status') === 'gesprochen');
  const yes = spoken.filter((s) => /^ja$/i.test(cell(s.raw, 'Endorsement'))).length;

  const talkOf = (s: Speaker): Talk | null => {
    const own = model.talks.filter((t) => t.speakers.some((x) => x.speaker === s));
    const upcoming = own
      .filter((t) => t.dd !== null && t.dd >= 0 && !isOff(t))
      .sort((a, b) => (a.dd ?? 0) - (b.dd ?? 0));
    const past = own
      .filter((t) => t.dd !== null && t.dd < 0)
      .sort((a, b) => (b.dd ?? 0) - (a.dd ?? 0));
    return upcoming[0] ?? past[0] ?? own[0] ?? null;
  };
  const entries = model.speakers
    .map((speaker) => ({ speaker, status: statusOf(speaker), talk: talkOf(speaker) }))
    .sort(
      (a, b) =>
        known.indexOf(b.status) - known.indexOf(a.status) ||
        a.speaker.name.localeCompare(b.speaker.name, 'de'),
    );
  return {
    statuses: order.map((status) => ({ status, count: counts.get(status) ?? 0 })),
    endorsements: spoken.length ? { yes, spoken: spoken.length } : null,
    entries,
  };
}
