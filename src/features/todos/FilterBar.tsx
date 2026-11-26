import { Search, X } from 'lucide-react';
import {
  GROUP_KEYS,
  SINCE_LABELS,
  type CountedOption,
  type GroupKey,
  type SinceKey,
  type TodoFilters,
} from '@/domain/todos';
import { cn } from '@/ui/lib/utils';
import { controlClass, SelectField } from './fields';

export interface Chip {
  key: string;
  label: string;
  clear: () => void;
}

export function FilterBar({
  filters,
  onChange,
  group,
  onGroup,
  persons,
  areas,
}: {
  filters: TodoFilters;
  onChange: (patch: Partial<TodoFilters>) => void;
  group: GroupKey;
  onGroup: (g: GroupKey) => void;
  persons: CountedOption[];
  areas: CountedOption[];
}) {
  return (
    <div role="search" aria-label="To-dos filtern" className="space-y-3">
      <div className="relative">
        <label htmlFor="todos-q" className="sr-only">
          Suche
        </label>
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          id="todos-q"
          type="search"
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Suche in allen Spalten"
          autoComplete="off"
          className={cn(controlClass, 'pl-9')}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SelectField
          label="Ansicht"
          value={group}
          onChange={(v) => onGroup(v as GroupKey)}
          options={GROUP_KEYS.map((g) => ({ value: g, label: `nach ${g}` }))}
        />
        <SelectField
          label="Person"
          value={filters.person ?? ''}
          onChange={(v) => onChange({ person: v || null })}
          options={[
            { value: '', label: 'alle' },
            ...persons.map((p) => ({ value: p.value, label: `${p.label} (${p.count})` })),
          ]}
        />
        <SelectField
          label="Bereich"
          value={filters.area ?? ''}
          onChange={(v) => onChange({ area: v || null })}
          options={[
            { value: '', label: 'alle' },
            ...areas.map((a) => ({ value: a.value, label: `${a.label} (${a.count})` })),
          ]}
        />
        <SelectField
          label="Bearbeitet"
          value={filters.since}
          onChange={(v) => onChange({ since: v as SinceKey })}
          options={(Object.keys(SINCE_LABELS) as SinceKey[]).map((k) => ({
            value: k,
            label: SINCE_LABELS[k],
          }))}
        />
      </div>
      <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={filters.showDone}
          onChange={(e) => onChange({ showDone: e.target.checked })}
          className="accent-accent size-5"
        />
        <span className="text-sm font-medium">Erledigte anzeigen</span>
      </label>
    </div>
  );
}

export function ActiveChips({ chips, onReset }: { chips: Chip[]; onReset: () => void }) {
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Aktive Filter" className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <li key={c.key}>
          <button
            type="button"
            onClick={c.clear}
            aria-label={`Filter entfernen: ${c.label}`}
            className="bg-accent-soft border-line inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm"
          >
            {c.label}
            <X className="size-4" aria-hidden="true" />
          </button>
        </li>
      ))}
      {chips.length > 1 && (
        <li>
          <button
            type="button"
            onClick={onReset}
            className="text-accent inline-flex min-h-11 items-center px-2 text-sm font-medium underline-offset-4 hover:underline"
          >
            Alle zurücksetzen
          </button>
        </li>
      )}
    </ul>
  );
}
