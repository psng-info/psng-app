import { CalendarDays, Clock, Eye, MapPin, Users } from 'lucide-react';
import { formatShort } from '@/domain/dates';
import { TALK_TILES } from '@/domain/talks/model';
import { cell } from '@/domain/talks/steps';
import type { Talk } from '@/domain/talks/types';
import { EmptyState, Pill, ProgressSegments, StatTile, Tile } from '@/ui/blocks';
import { Button } from '@/ui/shadcn/button';
import { fmtNumber, progressOf } from './format';
import type { TalkStats } from '@/domain/talks/model';

function countdown(dd: number | null): string {
  if (dd === null) return '';
  return dd === 0 ? 'heute' : dd === 1 ? 'morgen' : `in ${dd} Tagen`;
}

export function NextTalkHero({
  talk,
  today,
  onOpen,
}: {
  talk: Talk | null;
  today: Date;
  onOpen: (key: string) => void;
}) {
  if (!talk) return <EmptyState>Kein Talk mit Termin geplant.</EmptyState>;
  const p = progressOf(talk);
  const facts = [cell(talk.raw, 'Reihe'), cell(talk.raw, 'Format'), cell(talk.raw, 'Ort')].filter(
    Boolean,
  );
  return (
    <article
      aria-label="Nächster Talk"
      className="border-line bg-surface border-l-accent flex h-full flex-col gap-4 rounded-xl border border-l-4 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-muted text-sm font-bold tracking-wide uppercase">Nächster Talk</h4>
        <p className="font-display text-accent text-3xl leading-none font-semibold sm:text-4xl">
          {countdown(talk.dd)}
        </p>
      </div>
      <div className="min-w-0">
        <p className="font-display text-xl leading-snug font-semibold break-words sm:text-2xl">
          {talk.title}
        </p>
        <p className="text-muted mt-1 flex items-center gap-1.5 text-sm">
          <Users aria-hidden="true" className="size-4 shrink-0" />
          {talk.names.join(', ')}
        </p>
      </div>
      <ul className="text-muted flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {talk.date && (
          <li className="flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="size-4" />
            <span className="font-mono text-[0.8125rem]">{formatShort(talk.date, today)}</span>
          </li>
        )}
        {cell(talk.raw, 'Uhrzeit') && (
          <li className="flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4" />
            <span className="font-mono text-[0.8125rem]">{cell(talk.raw, 'Uhrzeit')}</span>
          </li>
        )}
        {facts.length > 0 && (
          <li className="flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-4" />
            {facts.join(' · ')}
          </li>
        )}
      </ul>
      <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <ProgressSegments segments={p.segments} label={p.label} />
          <p className="text-muted flex flex-wrap items-center gap-2 text-sm">
            <span>
              {p.done} von {p.total} Schritten
            </span>
            {p.late > 0 && <Pill tone="crit">{p.late} überfällig</Pill>}
          </p>
        </div>
        <Button type="button" onClick={() => onOpen(talk.key)}>
          Details
        </Button>
      </div>
    </article>
  );
}

export function TileGrid({
  talks,
  active,
  onToggle,
}: {
  talks: Talk[];
  active: string;
  onToggle: (k: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
      {TALK_TILES.map((tile) => (
        <Tile
          key={tile.k}
          count={talks.filter(tile.test).length}
          label={tile.label}
          level={tile.level}
          pressed={active === tile.k}
          onToggle={() => onToggle(tile.k)}
        />
      ))}
    </div>
  );
}

export function NumberTiles({ stats }: { stats: TalkStats }) {
  return (
    <>
      <StatTile
        icon={<Users aria-hidden="true" className="size-6" />}
        value={fmtNumber(stats.totalTn)}
        label="Teilnehmende gesamt"
        hint="gehaltene Talks"
      />
      <StatTile
        icon={<Eye aria-hidden="true" className="size-6" />}
        value={fmtNumber(stats.totalViews)}
        label="YouTube-Views nach 4 Wo."
      />
    </>
  );
}
