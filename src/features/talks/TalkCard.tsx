import { ChevronDown, Play } from 'lucide-react';
import { memo } from 'react';
import { relDays } from '@/domain/dates';
import { cell, hasYT, isOff, tnOf } from '@/domain/talks/steps';
import type { Talk } from '@/domain/talks/types';
import { LevelPill, ProgressSegments, StatusBadge } from '@/ui/blocks';
import { cn } from '@/ui/lib/utils';
import { monthShort, progressOf, speakerLine } from './format';
import { cardId } from './links';
import { TalkBody, type TalkCtx } from './TalkBody';

function DateBlock({ talk, today }: { talk: Talk; today: Date }) {
  const up = talk.dd !== null && talk.dd >= 0;
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border py-1.5 leading-none',
        up ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-bg',
      )}
    >
      <b className="font-display text-xl font-semibold tabular-nums">
        {talk.date ? String(talk.date.getDate()).padStart(2, '0') : '?'}
      </b>
      <span
        className={cn('mt-0.5 font-mono text-[0.6875rem] whitespace-nowrap', !up && 'text-muted')}
      >
        {talk.date ? monthShort(talk.date, today) : 'offen'}
      </span>
    </div>
  );
}

interface Props {
  talk: Talk;
  open: boolean;
  onToggle: (key: string) => void;
  ctx: TalkCtx;
}

/** Aufklappbare Karte, native `<details>`. Der Inhalt wird erst beim Öffnen gebaut. */
export const TalkCard = memo(function TalkCard({ talk, open, onToggle, ctx }: Props) {
  const p = progressOf(talk);
  const crit = talk.flags.some((f) => f.level === 'crit');
  const tn = tnOf(talk);
  const off = isOff(talk);
  const eyebrow = [
    cell(talk.raw, 'Reihe'),
    cell(talk.raw, 'Format'),
    cell(talk.raw, 'Sprache'),
    talk.date ? relDays(talk.date, ctx.today) : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const worst = crit ? 'crit' : 'warn';
  return (
    <details
      id={cardId(talk)}
      open={open}
      className={cn(
        'group border-line bg-surface scroll-mt-20 rounded-xl border',
        crit && 'border-crit/60',
        !crit && talk.flags.length > 0 && 'border-warn/60',
        off && 'border-dashed',
        open && 'shadow-sm',
      )}
    >
      <summary
        onClick={(e) => {
          e.preventDefault();
          onToggle(talk.key);
        }}
        className="no-marker focus-visible:outline-accent grid min-h-11 cursor-pointer grid-cols-[3.25rem_minmax(0,1fr)_1.25rem] items-start gap-x-3 gap-y-3 rounded-xl p-3 md:grid-cols-[3.5rem_minmax(0,1fr)_16rem_1.25rem]"
      >
        <DateBlock talk={talk} today={ctx.today} />
        <div className="min-w-0">
          {eyebrow && <p className="text-muted text-xs">{eyebrow}</p>}
          <p
            className={cn(
              'font-display text-base leading-snug font-semibold break-words',
              off && 'text-muted',
            )}
          >
            {talk.title}
          </p>
          <p className="text-muted mt-0.5 text-sm break-words">{speakerLine(talk)}</p>
        </div>
        <ChevronDown
          aria-hidden="true"
          className="text-muted size-5 transition-transform group-open:rotate-180 md:col-start-4 md:row-start-1"
        />
        <div className="col-span-3 flex min-w-0 flex-col gap-2 md:col-span-1 md:col-start-3 md:row-start-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge status={talk.status} />
            {hasYT(talk) && (
              <span className="text-accent inline-flex items-center gap-1 text-xs font-bold">
                <Play aria-hidden="true" className="size-3" />
                YouTube
              </span>
            )}
            {tn > 0 && <span className="text-muted font-mono text-xs">{tn} TN</span>}
            {talk.flags.length > 0 && (
              <LevelPill level={worst}>
                {talk.flags.length} {talk.flags.length === 1 ? 'Hinweis' : 'Hinweise'}
              </LevelPill>
            )}
          </div>
          {p.total > 0 && (
            <div className="flex items-center gap-2">
              <ProgressSegments segments={p.segments} label={p.label} />
              <span aria-hidden="true" className="text-muted font-mono text-xs whitespace-nowrap">
                {p.done}/{p.total}
              </span>
            </div>
          )}
        </div>
      </summary>
      {open && <TalkBody talk={talk} ctx={ctx} />}
    </details>
  );
});
