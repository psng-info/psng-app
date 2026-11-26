import { CalendarPlus } from 'lucide-react';
import { TALK_TILES } from '@/domain/talks/model';
import { cell } from '@/domain/talks/steps';
import type { Talk } from '@/domain/talks/types';
import { EmptyState, LevelTag, ProgressSegments, Tile, TileGrid } from '@/ui/blocks';
import { Button } from '@/ui/shadcn/button';
import { DateRail } from './DateRail';
import { progressOf } from './format';

function countdown(dd: number | null): string {
  if (dd === null) return '';
  return dd === 0 ? 'heute' : dd === 1 ? 'morgen' : `in ${dd} Tagen`;
}

/**
 * Der nächste Talk: Datumsmarke, Titel, Speaker, Eckdaten, Fortschritt.
 * Einzige Fläche mit Leuchten (wie der nächste Termin auf psng.info).
 */
export function NextTalkHero({
  talk,
  today,
  onOpen,
}: {
  talk: Talk | null;
  today: Date;
  onOpen: (key: string) => void;
}) {
  if (!talk)
    return (
      <EmptyState icon={<CalendarPlus className="size-5" />}>
        Kein Talk mit Termin geplant. Neue Termine kommen aus dem Tab Lectures.
      </EmptyState>
    );
  const p = progressOf(talk);
  const facts = [
    cell(talk.raw, 'Uhrzeit'),
    cell(talk.raw, 'Reihe'),
    cell(talk.raw, 'Format'),
    cell(talk.raw, 'Ort'),
  ].filter(Boolean);
  return (
    <article
      aria-label="Nächster Talk"
      className="border-line bg-surface flex flex-col gap-4 rounded-2xl border p-4 shadow-[0_8px_24px_-12px_var(--glow)] sm:p-5"
    >
      <div className="flex gap-4">
        <DateRail date={talk.date} today={today} upcoming large />
        <div className="border-line min-w-0 flex-1 border-l pl-4">
          <p className="font-display text-xl leading-snug font-semibold break-words sm:text-[1.375rem]">
            {talk.title}
          </p>
          <p className="text-muted mt-1 text-sm break-words">{talk.names.join(', ')}</p>
          <p className="text-muted mt-2 text-sm">
            <span className="text-accent font-bold">{countdown(talk.dd)}</span>
            {facts.length > 0 && ` · ${facts.join(' · ')}`}
          </p>
        </div>
      </div>
      <div className="border-line flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <ProgressSegments segments={p.segments} label={p.label} />
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted">
              <b className="text-fg tabular-nums">{p.done}</b> von {p.total} Schritten
            </span>
            {p.late > 0 && <LevelTag level="crit">{p.late} überfällig</LevelTag>}
            {p.soon > 0 && <LevelTag level="warn">{p.soon} bald fällig</LevelTag>}
          </p>
        </div>
        <Button type="button" variant="accent" onClick={() => onOpen(talk.key)}>
          Ablauf öffnen
        </Button>
      </div>
    </article>
  );
}

/** Filter-Kacheln über der Talk-Liste. */
export function TalkTiles({
  talks,
  active,
  onToggle,
}: {
  talks: Talk[];
  active: string;
  onToggle: (k: string) => void;
}) {
  return (
    <TileGrid className="md:grid-cols-4 lg:grid-cols-7">
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
    </TileGrid>
  );
}
