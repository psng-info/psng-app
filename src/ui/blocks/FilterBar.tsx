import { Search, X } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/ui/lib/utils';
import type { ReactNode } from 'react';

export interface FilterOption {
  value: string;
  label: string;
  count?: number | undefined;
}

export interface FilterSelect {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export interface FilterChip {
  id: string;
  label: string;
  onClear: () => void;
}

const FIELD =
  'border-line bg-surface text-fg focus-visible:border-accent min-h-11 w-full rounded-md border px-3 text-base';

/** Suche, Auswahlfelder mit Zählern und Chips für aktive Filter. */
export function FilterBar({
  search,
  selects,
  chips,
  onClearAll,
  extra,
  label,
}: {
  search: { label: string; placeholder?: string; value: string; onChange: (v: string) => void };
  selects: FilterSelect[];
  chips: FilterChip[];
  onClearAll: () => void;
  /** Zusätzliche Bedienelemente unter den Feldern, z. B. ein Schalter. */
  extra?: ReactNode;
  /** Beschriftung der Gruppe für Screenreader, z. B. „To-dos filtern“. */
  label?: string;
}) {
  const searchId = useId();
  return (
    <div
      role="search"
      aria-label={label ?? 'Filter'}
      className="border-line bg-surface rounded-lg border p-3"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor={searchId} className="text-muted mb-1 block text-xs font-bold">
            {search.label}
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <input
              id={searchId}
              type="search"
              inputMode="search"
              value={search.value}
              placeholder={search.placeholder}
              onChange={(e) => search.onChange(e.target.value)}
              className={cn(FIELD, 'pl-9')}
            />
          </div>
        </div>
        {selects.map((s) => (
          <SelectField key={s.id} select={s} />
        ))}
      </div>
      {extra}
      {chips.length > 0 && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2"
          aria-label="Aktive Filter"
          role="group"
        >
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={c.onClear}
              aria-label={`Filter entfernen: ${c.label}`}
              className="bg-accent-soft text-accent relative inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-sm font-medium after:absolute after:-inset-1.5 after:content-['']"
            >
              {c.label}
              <X aria-hidden="true" className="size-3.5" />
            </button>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-muted relative inline-flex min-h-8 items-center px-2 text-sm underline underline-offset-2 after:absolute after:-inset-1.5 after:content-['']"
          >
            Alle zurücksetzen
          </button>
        </div>
      )}
    </div>
  );
}

function SelectField({ select }: { select: FilterSelect }): ReactNode {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-muted mb-1 block text-xs font-bold">
        {select.label}
      </label>
      <select
        id={id}
        value={select.value}
        onChange={(e) => select.onChange(e.target.value)}
        className={FIELD}
      >
        {select.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {o.count !== undefined ? ` (${o.count})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
