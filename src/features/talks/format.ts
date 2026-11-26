import { daysFrom } from '@/domain/dates';
import type { SegmentKind } from '@/ui/blocks';
import type { StepState, Talk, TalkSpeaker } from '@/domain/talks/types';
import { cell } from '@/domain/talks/steps';

/** „Prof. Dr. Anna Beispiel, Universität X · Ben Muster“ */
export function speakerLine(t: Talk): string {
  return t.speakers
    .map((x) => {
      const s = x.speaker?.raw;
      const name = [s ? cell(s, 'Akad. Titel') : '', x.name].filter(Boolean).join(' ');
      const aff = s ? cell(s, 'Affiliation') : '';
      return aff ? `${name}, ${aff}` : name;
    })
    .join(' · ');
}

/** Anzeige kürzt Antworten des Speaker-Formulars auf den Teil vor dem ersten „/“. */
export const shortAnswer = (s: string): string => (s.split('/')[0] ?? '').trim();

export const isUrl = (s: string): boolean => /^https?:\/\//i.test(s);

/** Kurzer Linktext ohne Protokoll. */
export const linkText = (url: string): string =>
  url.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 42) + (url.length > 50 ? '…' : '');

export function segmentKind(s: StepState): SegmentKind {
  if (s.late) return 'late';
  if (s.soon) return 'soon';
  if (s.status === 'done') return 'done';
  if (s.status === 'implied') return 'implied';
  if (s.status === 'unk') return 'unk';
  return 'open';
}

export interface Progress {
  segments: { kind: SegmentKind; title: string }[];
  done: number;
  total: number;
  late: number;
  soon: number;
  label: string;
}

/** Fortschritt über die zutreffenden Schritte (ohne „nicht nötig“). */
export function progressOf(t: Talk): Progress {
  const applicable = t.steps.filter((s) => s.status !== 'na');
  const done = applicable.filter((s) => s.status === 'done' || s.status === 'implied').length;
  const late = applicable.filter((s) => s.late).length;
  const soon = applicable.filter((s) => s.soon).length;
  const extra = [late ? `${late} überfällig` : '', soon ? `${soon} bald fällig` : '']
    .filter(Boolean)
    .join(', ');
  return {
    segments: applicable.map((s) => ({
      kind: segmentKind(s),
      title: `${s.def.label}: ${s.late ? 'überfällig' : s.soon ? 'bald fällig' : STATUS_TEXT[s.status]}`,
    })),
    done,
    total: applicable.length,
    late,
    soon,
    label: `${done} von ${applicable.length} Schritten erledigt${extra ? `, ${extra}` : ''}`,
  };
}

export const STATUS_TEXT: Record<StepState['status'], string> = {
  done: 'erledigt',
  implied: 'vor dem Talk',
  unk: 'nicht erfasst',
  open: 'offen',
  na: 'nicht nötig',
};

/** Fälligkeit eines offenen Schritts in Worten, nie nur Farbe. */
export function dueText(due: Date, today: Date): { text: string; tone: 'late' | 'soon' | 'plain' } {
  const n = daysFrom(due, today);
  if (n < 0) return { text: `überfällig, ${-n} T. drüber`, tone: 'late' };
  if (n === 0) return { text: 'bald fällig, heute', tone: 'soon' };
  if (n <= 7) return { text: `bald fällig, in ${n} T.`, tone: 'soon' };
  return { text: `in ${n} T.`, tone: 'plain' };
}

export const firstSpeakerForm = (t: Talk): TalkSpeaker['form'] =>
  t.speakers.map((x) => x.form).find(Boolean) ?? null;

export const fmtNumber = (n: number): string => n.toLocaleString('de-DE');

/** „Nov“, im Jahr ungleich dem von `today` „Nov 27“. */
export function monthShort(d: Date, today: Date): string {
  const m = d.toLocaleDateString('de-DE', { month: 'short' }).replace(/\.$/, '');
  return d.getFullYear() === today.getFullYear()
    ? m
    : `${m} ${String(d.getFullYear() % 100).padStart(2, '0')}`;
}
