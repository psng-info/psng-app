import { useState } from 'react';
import type { ActionItem } from '@/domain/talks/types';
import { EmptyState, LevelPill } from '@/ui/blocks';
import { cn } from '@/ui/lib/utils';
import { talkHref } from './links';

const FOLDED = 6;

export function ActionList({
  items,
  onOpen,
}: {
  items: ActionItem[];
  onOpen: (key: string) => void;
}) {
  const [all, setAll] = useState(false);
  if (!items.length) return <EmptyState>Nichts offen.</EmptyState>;
  const shown = all ? items : items.slice(0, FOLDED);
  return (
    <div>
      <ul className="border-line bg-surface divide-line divide-y rounded-xl border">
        {shown.map((item, i) => (
          <li
            key={`${item.talk?.key ?? item.label}-${i}`}
            className={cn(
              'flex flex-col gap-1.5 border-l-4 p-3 sm:flex-row sm:items-start sm:gap-4',
              item.rank === 0 ? 'border-l-crit' : 'border-l-warn',
              i === 0 && 'rounded-tl-xl',
            )}
          >
            <div className="font-display text-sm font-semibold sm:w-56 sm:shrink-0">
              {item.talk ? (
                <a
                  href={talkHref(item.talk.key)}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.talk) onOpen(item.talk.key);
                  }}
                  className="hover:text-accent inline-flex min-h-11 items-center underline-offset-2 hover:underline sm:min-h-0"
                >
                  {item.label}
                </a>
              ) : (
                item.label
              )}
            </div>
            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {item.flags.map((f, j) => (
                <li key={j} className="flex flex-wrap items-start gap-x-2 gap-y-1 text-sm">
                  <LevelPill level={f.level}>{f.tag}</LevelPill>
                  <span className="min-w-0 flex-1 basis-48">{f.why}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {items.length > FOLDED && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="text-accent mt-2 min-h-11 text-sm font-medium underline underline-offset-2"
        >
          {all ? 'Weniger anzeigen' : `Alle ${items.length} anzeigen`}
        </button>
      )}
    </div>
  );
}
