import { useMemo } from 'react';
import { norm } from '@/domain/text';
import { TALK_TILES } from '@/domain/talks/model';
import { cell } from '@/domain/talks/steps';
import type { Talk } from '@/domain/talks/types';
import { EmptyState, FilterBar, Section, SubHeading, type FilterChip } from '@/ui/blocks';
import { Button } from '@/ui/shadcn/button';
import {
  NO_FILTERS,
  WHEN_LABEL,
  countBy,
  groupTalks,
  hasActiveFilter,
  matchesFilters,
  ownersOf,
  whenOf,
  type TalkFilters,
  type When,
} from './filters';
import { TalkCard } from './TalkCard';
import { TalkTiles } from './Lage';
import type { TalkCtx } from './TalkBody';

export function TalkList({
  talks,
  filters,
  onFilters,
  isOpen,
  onToggle,
  ctx,
}: {
  talks: Talk[];
  filters: TalkFilters;
  onFilters: (f: TalkFilters) => void;
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
  ctx: TalkCtx;
}) {
  const set = (patch: Partial<TalkFilters>): void => onFilters({ ...filters, ...patch });
  const search = norm(filters.q);
  const shown = useMemo(
    () => talks.filter((t) => matchesFilters(t, filters, search)),
    [talks, filters, search],
  );
  const groups = groupTalks(shown);

  const whenCounts = (v: Exclude<When, ''>): number => talks.filter((t) => whenOf(t) === v).length;
  const withCounts = (pick: (t: Talk) => string[]) =>
    countBy(talks, pick).map(([value, count]) => ({ value, label: value, count }));
  const tile = TALK_TILES.find((x) => x.k === filters.tile);

  const chips: FilterChip[] = [];
  const chip = (id: string, label: string, patch: Partial<TalkFilters>): void => {
    chips.push({ id, label, onClear: () => set(patch) });
  };
  if (filters.q) chip('q', `Suche: „${filters.q}“`, { q: '' });
  if (tile) chip('tile', `Kachel: ${tile.label}`, { tile: '' });
  if (filters.when) chip('when', `Zeitraum: ${WHEN_LABEL[filters.when]}`, { when: '' });
  if (filters.series) chip('series', `Reihe: ${filters.series}`, { series: '' });
  if (filters.status) chip('status', `Status: ${filters.status}`, { status: '' });
  if (filters.owner) chip('owner', `Owner: ${filters.owner}`, { owner: '' });

  const count =
    shown.length === talks.length ? `(${talks.length})` : `(${shown.length} von ${talks.length})`;

  const block = (title: string, list: Talk[]) =>
    list.length > 0 && (
      <div key={title}>
        <SubHeading>
          {title} <span className="text-muted font-normal tabular-nums">({list.length})</span>
        </SubHeading>
        <ul className="flex flex-col gap-2">
          {list.map((t) => (
            <li key={t.key + t.row}>
              <TalkCard talk={t} open={isOpen(t.key)} onToggle={onToggle} ctx={ctx} />
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <Section id="talks-liste" title="Talks" count={count}>
      <div className="flex flex-col gap-3">
        <TalkTiles
          talks={talks}
          active={filters.tile}
          onToggle={(k) => set({ tile: filters.tile === k ? '' : k })}
        />
        <FilterBar
          search={{
            label: 'Suche',
            placeholder: 'Titel, Speaker, Ort …',
            value: filters.q,
            onChange: (q) => set({ q }),
          }}
          selects={[
            {
              id: 'when',
              label: 'Zeitraum',
              value: filters.when,
              onChange: (v) => set({ when: v as When }),
              options: [
                { value: '', label: 'alle' },
                { value: 'up', label: 'anstehend', count: whenCounts('up') },
                { value: 'past', label: 'vergangen', count: whenCounts('past') },
                { value: 'nodate', label: 'ohne Termin', count: whenCounts('nodate') },
              ],
            },
            {
              id: 'series',
              label: 'Reihe',
              value: filters.series,
              onChange: (series) => set({ series }),
              options: [{ value: '', label: 'alle' }, ...withCounts((t) => [cell(t.raw, 'Reihe')])],
            },
            {
              id: 'status',
              label: 'Status',
              value: filters.status,
              onChange: (status) => set({ status }),
              options: [{ value: '', label: 'alle' }, ...withCounts((t) => [t.status])],
            },
            {
              id: 'owner',
              label: 'Owner',
              value: filters.owner,
              onChange: (owner) => set({ owner }),
              options: [{ value: '', label: 'alle' }, ...withCounts(ownersOf)],
            },
          ]}
          chips={chips}
          onClearAll={() => onFilters(NO_FILTERS)}
        />
      </div>
      <div className="mt-5 flex flex-col gap-6" aria-live="polite">
        {shown.length === 0 ? (
          <EmptyState
            action={
              hasActiveFilter(filters) ? (
                <Button type="button" variant="outline" onClick={() => onFilters(NO_FILTERS)}>
                  Filter zurücksetzen
                </Button>
              ) : undefined
            }
          >
            {talks.length
              ? 'Keine Treffer für diesen Filter.'
              : 'Im Tab Lectures steht noch kein Talk.'}
          </EmptyState>
        ) : (
          <>
            {block('Anstehend', groups.upcoming)}
            {block('Vergangen', groups.past)}
            {block('Ohne Termin', groups.undated)}
          </>
        )}
      </div>
    </Section>
  );
}
