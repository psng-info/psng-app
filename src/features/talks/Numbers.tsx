import type { TalkStats } from '@/domain/talks/model';
import { formatShort } from '@/domain/dates';
import { hasYT } from '@/domain/talks/steps';
import { cell } from '@/domain/talks/steps';
import { EmptyState, StatTile, TileGrid } from '@/ui/blocks';
import { cn } from '@/ui/lib/utils';
import { fmtNumber } from './format';
import { talkHref } from './links';

function Bar({
  label,
  value,
  max,
  shown,
  fill,
  warn,
  title,
}: {
  label: string;
  value: number;
  max: number;
  shown: string;
  fill: string;
  warn?: boolean;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-2" title={title}>
      <span className="text-muted w-12 shrink-0 text-xs">{label}</span>
      <div className="bg-bg h-3 min-w-0 flex-1 rounded-r">
        {value > 0 && (
          <div
            className={cn('h-full min-w-0.5 rounded-r', fill)}
            style={{ width: `${Math.max(2, (value / max) * 100)}%` }}
          />
        )}
      </div>
      <span
        className={cn(
          'w-12 shrink-0 text-right font-mono text-xs tabular-nums',
          warn && 'text-warn font-bold',
        )}
      >
        {shown}
      </span>
    </div>
  );
}

export function Numbers({
  stats,
  today,
  onOpen,
}: {
  stats: TalkStats;
  today: Date;
  onOpen: (key: string) => void;
}) {
  if (!stats.rows.length)
    return (
      <EmptyState>Noch keine Zahlen. Sie erscheinen, sobald ein Talk gehalten wurde.</EmptyState>
    );
  return (
    <div className="flex flex-col gap-3">
      <TileGrid className="grid-cols-3 md:grid-cols-3 [&>*]:flex-col [&>*]:items-start [&>*]:gap-1">
        <StatTile value={fmtNumber(stats.totalTn)} label="Teilnehmende gesamt" />
        <StatTile
          value={stats.averageTn !== null ? `Ø ${stats.averageTn}` : '–'}
          label="pro Talk"
        />
        <StatTile value={fmtNumber(stats.totalViews)} label="Views nach 4 Wo." />
      </TileGrid>
      <div className="border-line bg-surface rounded-2xl border p-3 sm:p-4">
        <ul className="flex flex-col gap-4 sm:gap-3">
          {stats.rows.map(({ talk, tn, views }) => {
            const vo = cell(talk.raw, 'TN vor Ort');
            const on = cell(talk.raw, 'TN online');
            return (
              <li
                key={talk.key}
                className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center"
              >
                <a
                  href={talkHref(talk.key)}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpen(talk.key);
                  }}
                  className="hover:text-accent min-w-0 truncate text-sm underline-offset-2 hover:underline"
                  title={talk.title}
                >
                  <span className="font-mono text-[0.8125rem]">
                    {talk.date ? formatShort(talk.date, today) : ''}
                  </span>{' '}
                  · {talk.names.join(', ')}
                </a>
                <Bar
                  label="TN"
                  value={tn}
                  max={stats.maxTn}
                  shown={tn ? String(tn) : '–'}
                  fill="bg-accent"
                  title={`${tn} gesamt${vo ? `, vor Ort ${vo}` : ''}${on ? `, online ${on}` : ''}`}
                />
                <Bar
                  label="Views"
                  value={views}
                  max={stats.maxViews}
                  shown={views ? fmtNumber(views) : hasYT(talk) ? 'fehlt' : '–'}
                  fill="bg-accent2"
                  warn={!views && hasYT(talk)}
                  title={
                    views
                      ? `${views} Views nach 4 Wochen`
                      : hasYT(talk)
                        ? 'Views noch nicht eingetragen'
                        : 'nicht veröffentlicht'
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
