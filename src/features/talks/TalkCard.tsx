import { ChevronDown, Play } from 'lucide-react';
import { memo } from 'react';
import { relDays } from '@/domain/dates';
import { cell, hasYT, isOff, tnOf } from '@/domain/talks/steps';
import type { Talk } from '@/domain/talks/types';
import { LevelTag, ProgressSegments, StatusBadge } from '@/ui/blocks';
import { cn } from '@/ui/lib/utils';
import { DateRail } from './DateRail';
import { progressOf, speakerLine } from './format';
import { cardId } from './links';
import { TalkBody, type TalkCtx } from './TalkBody';

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
  const meta = [
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
        'group border-line bg-surface scroll-mt-20 rounded-xl border transition-shadow',
        off && 'border-dashed',
        open && 'shadow-[0_6px_20px_-12px_rgb(0_0_0/0.25)]',
      )}
    >
      <summary
        onClick={(e) => {
          e.preventDefault();
          onToggle(talk.key);
        }}
        className="no-marker focus-visible:outline-accent hover:bg-accent-soft/40 grid min-h-11 cursor-pointer grid-cols-[2.75rem_minmax(0,1fr)_1.25rem] items-start gap-x-3 gap-y-2.5 rounded-xl px-3 py-3 md:grid-cols-[2.75rem_minmax(0,1fr)_15rem_1.25rem] md:items-center"
      >
        <DateRail
          date={talk.date}
          today={ctx.today}
          upcoming={talk.dd !== null && talk.dd >= 0 && !off}
        />
        <div className="min-w-0">
          <p
            className={cn(
              'font-display text-base leading-snug font-semibold break-words',
              off && 'text-muted line-through decoration-1',
            )}
          >
            {talk.title}
          </p>
          <p className="text-muted mt-0.5 text-sm leading-snug break-words">{speakerLine(talk)}</p>
          {meta && <p className="text-muted mt-1 text-xs">{meta}</p>}
        </div>
        <ChevronDown
          aria-hidden="true"
          className="text-muted mt-0.5 size-5 transition-transform group-open:rotate-180 md:col-start-4 md:row-start-1 md:mt-0"
        />
        <div className="col-span-3 col-start-1 flex min-w-0 flex-col gap-2 md:col-span-1 md:col-start-3 md:row-start-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge status={talk.status} />
            {talk.flags.length > 0 && (
              <LevelTag level={worst}>
                {talk.flags.length} {talk.flags.length === 1 ? 'Hinweis' : 'Hinweise'}
              </LevelTag>
            )}
            {hasYT(talk) && (
              <span className="text-muted inline-flex items-center gap-1 text-xs font-bold">
                <Play aria-hidden="true" className="size-3" />
                YouTube
              </span>
            )}
            {tn > 0 && <span className="text-muted text-xs tabular-nums">{tn} TN</span>}
          </div>
          {p.total > 0 && (
            <div className="flex items-center gap-2">
              <ProgressSegments segments={p.segments} label={p.label} />
              <span
                aria-hidden="true"
                className="text-muted text-xs whitespace-nowrap tabular-nums"
              >
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
