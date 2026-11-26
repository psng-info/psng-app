import { useState } from 'react';
import type { ActionItem } from '@/domain/talks/types';
import { CircleCheck } from 'lucide-react';
import { EmptyState, LevelTag } from '@/ui/blocks';
import { talkHref } from './links';

const FOLDED = 4;

export function ActionList({
  items,
  onOpen,
}: {
  items: ActionItem[];
  onOpen: (key: string) => void;
}) {
  const [all, setAll] = useState(false);
  if (!items.length)
    return (
      <EmptyState tone="ok" icon={<CircleCheck className="size-5" />}>
        Nichts offen. Kein Talk braucht gerade etwas.
      </EmptyState>
    );
  const shown = all ? items : items.slice(0, FOLDED);
  return (
    <div>
      <ul className="border-line bg-surface divide-line divide-y overflow-hidden rounded-2xl border">
        {shown.map((item, i) => (
          <li key={`${item.talk?.key ?? item.label}-${i}`} className="px-3 py-2.5 sm:px-4">
            <p className="font-display text-[0.9375rem] font-semibold">
              {item.talk ? (
                <a
                  href={talkHref(item.talk.key)}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.talk) onOpen(item.talk.key);
                  }}
                  className="hover:text-accent -my-1 inline-flex min-h-11 items-center underline-offset-2 hover:underline"
                >
                  {item.label}
                </a>
              ) : (
                item.label
              )}
            </p>
            <ul className="flex flex-col gap-1.5 pb-1">
              {item.flags.map((f, j) => (
                <li
                  key={j}
                  className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-baseline gap-x-2 text-sm"
                >
                  <LevelTag level={f.level}>{f.tag}</LevelTag>
                  <span className="line-clamp-3 min-w-0 leading-snug" title={f.why}>
                    {f.why}
                  </span>
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
