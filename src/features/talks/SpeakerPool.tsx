import { useState, type ReactNode } from 'react';
import { formatShort } from '@/domain/dates';
import type { SpeakerPool as Pool } from '@/domain/talks/model';
import { cell } from '@/domain/talks/steps';
import { EmptyState, Pill, Section, StatTile, Tile, TileGrid } from '@/ui/blocks';
import { Button } from '@/ui/shadcn/button';

const CLOSED = /^(gesprochen|abgesagt)$/;

function Dl({ items }: { items: [string, ReactNode][] }) {
  const shown = items.filter(([, v]) => !!v);
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-[minmax(6rem,auto)_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
      {shown.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SpeakerPool({
  pool,
  today,
  onOpen,
}: {
  pool: Pool;
  today: Date;
  onOpen: (key: string) => void;
}) {
  const [status, setStatus] = useState('');
  const entries = pool.entries.filter((e) =>
    status ? e.status === status : !CLOSED.test(e.status),
  );
  return (
    <Section
      title="Speaker-Pool"
      count={`(${pool.entries.length})`}
      hint={status ? undefined : 'Ohne Filter: alle, die noch nicht gesprochen haben'}
    >
      <TileGrid className="mb-3 md:grid-cols-4 lg:grid-cols-7">
        {pool.statuses.map((s) => (
          <Tile
            key={s.status}
            count={s.count}
            label={s.status}
            pressed={status === s.status}
            onToggle={() => setStatus((cur) => (cur === s.status ? '' : s.status))}
          />
        ))}
        {pool.endorsements && (
          <StatTile
            value={`${pool.endorsements.yes}/${pool.endorsements.spoken}`}
            label="Endorsements erhalten"
          />
        )}
      </TileGrid>
      {entries.length === 0 ? (
        <EmptyState>Niemand in dieser Gruppe.</EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {entries.map(({ speaker, status: st, talk }) => {
            const raw = speaker.raw;
            return (
              <li
                key={speaker.row}
                className="border-line bg-surface flex flex-col gap-2 rounded-xl border p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display min-w-0 font-semibold break-words">
                    {[cell(raw, 'Akad. Titel'), speaker.name].filter(Boolean).join(' ')}
                  </p>
                  <Pill className="shrink-0">{st}</Pill>
                </div>
                {cell(raw, 'Affiliation') && (
                  <p className="text-muted text-sm">{cell(raw, 'Affiliation')}</p>
                )}
                <Dl
                  items={[
                    ['Thema', cell(raw, 'Thema')],
                    ['Kontakt via', cell(raw, 'Kontakt via (PSNG)')],
                    ['Empfohlen von', cell(raw, 'Empfohlen von')],
                    ['Nächster Schritt', cell(raw, 'Nächster Schritt')],
                    st === 'gesprochen'
                      ? ['Endorsement', cell(raw, 'Endorsement') || 'offen']
                      : ['', ''],
                    ['Letzter Kontakt', cell(raw, 'Letzter Kontakt')],
                  ]}
                />
                {cell(raw, 'Notizen') && (
                  <p className="text-muted text-sm whitespace-pre-line">{cell(raw, 'Notizen')}</p>
                )}
                {talk && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-auto self-start"
                    onClick={() => onOpen(talk.key)}
                  >
                    Talk {talk.date ? `am ${formatShort(talk.date, today)} ` : ''}öffnen
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
