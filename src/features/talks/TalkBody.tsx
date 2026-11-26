import { ExternalLink, Lock, Play } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { SHEET_IDS } from '@/data/config';
import { formatShort, relDays } from '@/domain/dates';
import { col, type Row } from '@/domain/rows';
import { cell, coord, hasYT, isHeld, isOff, onsite, tnOf } from '@/domain/talks/steps';
import { PHASES, type StepState, type Talk, type TalkSpeaker } from '@/domain/talks/types';
import { LevelPill, OwnerChip, Pill, SegmentLegend, SubHeading } from '@/ui/blocks';
import { cn } from '@/ui/lib/utils';
import {
  dueText,
  firstSpeakerForm,
  isUrl,
  linkText,
  progressOf,
  shortAnswer,
  STATUS_TEXT,
} from './format';

interface Ctx {
  today: Date;
  isMember: (owner: string) => boolean;
}

/** Beschriftung und Wert, leere Werte fallen weg. */
function Facts({ items }: { items: [string, ReactNode][] }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false);
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-[minmax(6rem,auto)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
      {shown.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Links({ value }: { value: string }) {
  const parts = value.split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  return (
    <span className="flex flex-col gap-0.5">
      {parts.map((p, i) =>
        isUrl(p) ? (
          <ExtLink key={i} href={p}>
            {linkText(p)}
          </ExtLink>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

function ExtLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'text-accent inline-flex items-center gap-1 underline underline-offset-2',
        className,
      )}
    >
      {children}
      <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
    </a>
  );
}

const Prose = ({ children }: { children: string }) => (
  <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line">{children}</p>
);

// --- Hinweise -----------------------------------------------------------

function FlagList({ talk }: { talk: Talk }) {
  if (!talk.flags.length) return null;
  return (
    <ul className="flex flex-col gap-2" aria-label="Hinweise">
      {talk.flags.map((f, i) => (
        <li key={i} className="flex flex-wrap items-start gap-x-2 gap-y-1 text-sm">
          <LevelPill level={f.level}>{f.tag}</LevelPill>
          <span className="min-w-0 flex-1 basis-56">{f.why}</span>
        </li>
      ))}
    </ul>
  );
}

// --- Ablauf -------------------------------------------------------------

const SYMBOL: Record<StepState['status'], { glyph: string; cls: string }> = {
  done: { glyph: '✓', cls: 'text-accent font-bold' },
  implied: { glyph: '✓', cls: 'text-muted' },
  open: { glyph: '○', cls: 'text-fg' },
  unk: { glyph: '?', cls: 'text-muted' },
  na: { glyph: '–', cls: 'text-muted' },
};

function stepNote(s: StepState): string {
  if (s.lastNote?.note) return s.lastNote.note;
  if (s.status === 'unk') return 'nicht erfasst (vor der SOP)';
  if (s.status === 'implied') return 'vor dem Talk, nicht einzeln erfasst';
  if (s.isAuto) return 'automatisch aus dem Sheet';
  if (s.lastStatus) {
    const d = s.lastStatus.date;
    return `${s.lastStatus.status}${d ? ` · ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.` : ''}`;
  }
  return '';
}

function StepRow({ step, ctx }: { step: StepState; ctx: Ctx }) {
  const sym = SYMBOL[step.status];
  const note = stepNote(step);
  const due = step.due && step.status === 'open' ? dueText(step.due, ctx.today) : null;
  return (
    <li className="border-line grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 gap-y-1 border-t py-2 first:border-t-0 sm:grid-cols-[1.25rem_minmax(0,1fr)_auto]">
      <span aria-hidden="true" className={cn('font-mono text-base leading-5', sym.cls)}>
        {sym.glyph}
      </span>
      <div
        className={cn(
          'min-w-0 text-sm',
          step.late
            ? 'text-crit'
            : step.status === 'done' || step.status === 'implied' || step.status === 'unk'
              ? 'text-muted'
              : '',
        )}
      >
        <span className="sr-only">{STATUS_TEXT[step.status]}: </span>
        <span className="break-words">{step.def.label}</span>
        {note && <span className="text-muted block text-xs leading-snug">{note}</span>}
      </div>
      {step.status !== 'implied' && (
        <div className="col-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 sm:col-start-3 sm:justify-end">
          {due && step.due && (
            <span
              className={cn(
                'font-mono text-xs',
                due.tone === 'late' && 'text-crit font-bold',
                due.tone === 'soon' && 'text-warn font-bold',
                due.tone === 'plain' && 'text-muted',
              )}
            >
              {formatShort(step.due, ctx.today)} · {due.text}
            </span>
          )}
          {step.owner ? (
            <OwnerChip name={step.owner} member={ctx.isMember(step.owner)} />
          ) : (
            <Pill tone="crit">Owner fehlt</Pill>
          )}
        </div>
      )}
    </li>
  );
}

function Ablauf({ talk, ctx }: { talk: Talk; ctx: Ctx }) {
  const p = progressOf(talk);
  const na = talk.steps.filter((s) => s.status === 'na');
  return (
    <div className="min-w-0">
      <SubHeading className="mb-1">
        Ablauf · {p.done} von {p.total}
      </SubHeading>
      <SegmentLegend />
      <div className="mt-3 flex flex-col gap-4">
        {PHASES.map((name, i) => {
          const steps = talk.steps.filter((s) => s.def.phase === i && s.status !== 'na');
          if (!steps.length) return null;
          return (
            <div key={name}>
              <p className="text-muted mb-0.5 text-xs font-bold tracking-wide uppercase">{name}</p>
              <ul>
                {steps.map((s) => (
                  <StepRow key={s.def.key} step={s} ctx={ctx} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {na.length > 0 && !isOff(talk) && (
        <p className="text-muted mt-3 text-xs">Entfällt: {na.map((s) => s.def.key).join(', ')}</p>
      )}
    </div>
  );
}

// --- Eckdaten und Speaker -----------------------------------------------

function Eckdaten({ talk, ctx }: { talk: Talk; ctx: Ctx }) {
  const r = talk.raw;
  const form = firstSpeakerForm(talk);
  const owner = cell(r, 'Owner');
  const mod = talk.steps.find((s) => s.def.key === 'Moderation');
  const near = talk.dd !== null && talk.dd >= 0 && talk.dd <= 7;
  const event = cell(r, 'Event-Link') || cell(r, 'Luma');
  return (
    <div>
      <SubHeading>Eckdaten</SubHeading>
      <Facts
        items={[
          [
            'Datum',
            talk.date ? (
              <>
                <span className="font-mono text-[0.8125rem]">
                  {talk.date.toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                  {cell(r, 'Uhrzeit') ? `, ${cell(r, 'Uhrzeit')}` : ''}
                </span>
                <span className="text-muted"> · {relDays(talk.date, ctx.today)}</span>
              </>
            ) : (
              <Pill tone="warn">noch offen</Pill>
            ),
          ],
          [
            'Ort',
            cell(r, 'Ort') ||
              (onsite(talk) ? <Pill tone={near ? 'crit' : 'warn'}>Ort fehlt</Pill> : 'online'),
          ],
          ['Format', cell(r, 'Format')],
          ['Sprache', cell(r, 'Sprache')],
          ['Reihe', cell(r, 'Reihe')],
          ['Kooperation', cell(r, 'Kooperation')],
          [
            'Owner',
            owner ? (
              <OwnerChip name={owner} member={ctx.isMember(owner)} />
            ) : (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <OwnerChip name={coord(talk)} member={ctx.isMember(coord(talk))} />
                <span className="text-muted text-xs">Standard, nicht eingetragen</span>
              </span>
            ),
          ],
          ['Moderation', cell(r, 'Moderation') || mod?.lastNote?.note || ''],
          ['Event-Link', event ? <Links value={event} /> : ''],
          ['Veröffentlichung', cell(r, 'Veröffentlichung')],
          ...(form
            ? ([
                ['Livestream', shortAnswer(col(form, 'Livestream'))],
                ['Fotos', shortAnswer(col(form, 'Fotos vom Abend'))],
                ['Folien teilen', shortAnswer(col(form, 'Freigabe der Präsentationsfolien'))],
                ['Technik', col(form, 'Technik')],
                ['Interessenkonflikte', col(form, 'Interessenkonflikte')],
                ['Sonstiges', col(form, 'Sonstiges')],
              ] as [string, ReactNode][])
            : []),
        ]}
      />
    </div>
  );
}

function SpeakerBlock({ x }: { x: TalkSpeaker }) {
  const [showContact, setShowContact] = useState(false);
  const s: Row | Record<string, string> = x.speaker?.raw ?? {};
  const f = x.form;
  const pick = (k: string): string => (s as Record<string, string>)[k] ?? '';
  const mail = pick('E-Mail') || col(f, 'E-Mail');
  const tel = (pick('Telefon') || col(f, 'Handynummer')).replace(/^'/, '');
  const bio = pick('Bio') || col(f, 'Kurzbio');
  const links = pick('Website / Social') || col(f, 'Social Media');
  const photo = col(f, 'Porträtfoto');
  const status = pick('Status');
  return (
    <div className="border-line bg-bg flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display font-semibold">
          {[pick('Akad. Titel'), x.name].filter(Boolean).join(' ')}
        </span>
        {status && <Pill>{status}</Pill>}
        {!x.speaker && <Pill tone="warn">nicht im Tab Speaker</Pill>}
      </div>
      <Facts
        items={[
          ['Affiliation', pick('Affiliation') || col(f, 'Affiliation')],
          ['Kontakt via', pick('Kontakt via (PSNG)')],
          ['Empfohlen von', pick('Empfohlen von')],
          [
            'Endorsement',
            pick('Endorsement') ? (
              <>
                {pick('Endorsement')}
                {pick('Endorsement-Text') && (
                  <span className="text-muted block">{pick('Endorsement-Text')}</span>
                )}
              </>
            ) : (
              ''
            ),
          ],
          ['Hat empfohlen', pick('Hat empfohlen')],
          ['Letzter Kontakt', pick('Letzter Kontakt')],
          ['Nächster Schritt', pick('Nächster Schritt')],
          ['Links', links ? <Links value={links} /> : ''],
          ['Foto', photo ? <Links value={photo} /> : ''],
        ]}
      />
      {bio && (
        <div>
          <p className="text-muted text-xs font-bold">Bio</p>
          <Prose>{bio}</Prose>
        </div>
      )}
      {pick('Notizen') && (
        <div>
          <p className="text-muted text-xs font-bold">Notizen</p>
          <Prose>{pick('Notizen')}</Prose>
        </div>
      )}
      {(mail || tel) &&
        (showContact ? (
          <div className="border-line flex flex-col gap-1 rounded-md border border-dashed p-2 text-sm">
            {mail && (
              <span className="font-mono text-[0.8125rem] break-all">
                <a href={`mailto:${mail}`} className="underline underline-offset-2">
                  {mail}
                </a>
              </span>
            )}
            {tel && <span className="font-mono text-[0.8125rem]">{tel}</span>}
            <button
              type="button"
              onClick={() => setShowContact(false)}
              className="text-muted mt-1 min-h-11 self-start text-sm underline underline-offset-2"
            >
              Kontakt ausblenden
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowContact(true)}
            className="border-line hover:border-accent inline-flex min-h-11 items-center gap-2 self-start rounded-md border px-3 text-sm"
          >
            <Lock aria-hidden="true" className="size-4" />
            Kontakt anzeigen (nur intern)
          </button>
        ))}
    </div>
  );
}

// --- Nach dem Talk ------------------------------------------------------

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-line bg-bg flex min-w-24 flex-col rounded-lg border px-3 py-1.5">
      <b className="font-display text-xl font-semibold tabular-nums">{value || '–'}</b>
      <span className="text-muted text-xs">{label}</span>
    </div>
  );
}

function AfterTalk({ talk }: { talk: Talk }) {
  const r = talk.raw;
  const good = cell(r, 'Was gut lief');
  const bad = cell(r, 'Was schlecht lief');
  const tn = tnOf(talk);
  return (
    <div className="border-line flex flex-col gap-3 border-t pt-4">
      <SubHeading className="mb-0">Nach dem Talk</SubHeading>
      <div className="flex flex-wrap gap-2">
        <Kpi value={cell(r, 'TN vor Ort')} label="TN vor Ort" />
        <Kpi value={cell(r, 'TN online')} label="TN online" />
        <Kpi value={tn ? String(tn) : ''} label="TN gesamt" />
        <Kpi value={cell(r, 'Views nach 4 Wo.')} label="Views nach 4 Wo." />
      </div>
      {hasYT(talk) ? (
        <ExtLink href={cell(r, 'YouTube-Link')} className="self-start font-bold">
          <Play aria-hidden="true" className="size-3.5" />
          Aufnahme auf YouTube
        </ExtLink>
      ) : (
        <p className="text-muted text-sm">
          {/^nein/i.test(cell(r, 'Veröffentlichung'))
            ? 'Keine Veröffentlichung (Freigabe = nein).'
            : 'Noch kein YouTube-Link.'}
        </p>
      )}
      <Facts
        items={[
          ['Lief gut', good ? <Prose>{good}</Prose> : ''],
          ['Verbessern', bad ? <Prose>{bad}</Prose> : ''],
        ]}
      />
      {talk.reports.map((p) => {
        const keys = Object.keys(p).filter((h) => h !== '_row' && h !== 'Lecture' && p[h]);
        const by = cell(p, 'Ausgefüllt von');
        const stamp = cell(p, 'Zeitstempel').slice(0, 10);
        return (
          <details key={p._row} className="border-line bg-bg rounded-lg border">
            <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">
              Talk-Bericht{by ? ` von ${by}` : ''}
              {stamp ? ` · ${stamp}` : ''}
            </summary>
            <div className="border-line border-t p-3">
              <Facts items={keys.map((h) => [h, cell(p, h)] as [string, ReactNode])} />
            </div>
          </details>
        );
      })}
    </div>
  );
}

// --- Gesamt -------------------------------------------------------------

export function TalkBody({ talk, ctx }: { talk: Talk; ctx: Ctx }) {
  const r = talk.raw;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_IDS.lectures}/edit#gid=0&range=A${talk.row}`;
  return (
    <div className="reveal border-line flex flex-col gap-5 border-t p-3 sm:p-4">
      <FlagList talk={talk} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Ablauf talk={talk} ctx={ctx} />
        <div className="flex min-w-0 flex-col gap-4">
          <Eckdaten talk={talk} ctx={ctx} />
          <div className="flex flex-col gap-3">
            <SubHeading className="mb-0">
              {talk.speakers.length > 1 ? 'Speaker:innen' : 'Speaker'}
            </SubHeading>
            {talk.speakers.map((x) => (
              <SpeakerBlock key={x.name} x={x} />
            ))}
          </div>
        </div>
      </div>
      {cell(r, 'Abstract') && (
        <div className="border-line border-t pt-4">
          <SubHeading>Abstract</SubHeading>
          <Prose>{cell(r, 'Abstract')}</Prose>
        </div>
      )}
      {isHeld(talk) && <AfterTalk talk={talk} />}
      {cell(r, 'Notizen') && (
        <div className="border-line border-t pt-4">
          <SubHeading>Notizen</SubHeading>
          <Prose>{cell(r, 'Notizen')}</Prose>
        </div>
      )}
      <div className="border-line flex justify-end border-t pt-3">
        <ExtLink href={sheetUrl} className="min-h-11 py-2 text-sm">
          Zeile {talk.row} im Sheet
        </ExtLink>
      </div>
    </div>
  );
}

export type { Ctx as TalkCtx };
