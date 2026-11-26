import { useId, useState } from 'react';
import { formatDate, parseDate } from '@/domain/dates';
import { cell } from '@/domain/talks/steps';
import type { Talk } from '@/domain/talks/types';
import { checkLectureSet } from '@/domain/talks/write';
import { SelectField, TextArea, TextField } from '@/ui/blocks';
import { Button } from '@/ui/shadcn/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/ui/shadcn/sheet';

type Kind = 'text' | 'select' | 'date' | 'area' | 'number' | 'url';
interface Field {
  col: string;
  label: string;
  kind: Kind;
  options?: string[];
  hint?: string;
}

const STATUS = [
  'Idee',
  'angefragt',
  'fix',
  'durchgeführt',
  'veröffentlicht',
  'abgesagt',
  'pausiert',
];
const FORMATS = ['online', 'vor Ort', 'hybrid'];

/** Reihenfolge im Sheet. Nur Spalten, die es im Tab Lectures gibt, erscheinen im Formular. */
const FIELDS: Field[] = [
  { col: 'Status', label: 'Status', kind: 'select', options: STATUS },
  {
    col: 'Datum',
    label: 'Datum',
    kind: 'date',
    hint: 'Der Log im Tab Talk-Schritte wird über den Speaker weiter zugeordnet, solange der Name eindeutig ist.',
  },
  { col: 'Uhrzeit', label: 'Uhrzeit', kind: 'text' },
  { col: 'Ort', label: 'Ort', kind: 'text' },
  { col: 'Format', label: 'Format', kind: 'select', options: FORMATS },
  { col: 'Reihe', label: 'Reihe', kind: 'text' },
  { col: 'Owner', label: 'Owner', kind: 'text' },
  { col: 'Moderation', label: 'Moderation', kind: 'text' },
  {
    col: 'Veröffentlichung',
    label: 'Veröffentlichung',
    kind: 'text',
    hint: 'z. B. ja, nein, nur Audio',
  },
  { col: 'Abstract', label: 'Abstract', kind: 'area' },
  { col: 'TN vor Ort', label: 'TN vor Ort', kind: 'number' },
  { col: 'TN online', label: 'TN online', kind: 'number' },
  { col: 'Views nach 4 Wo.', label: 'Views nach 4 Wo.', kind: 'number' },
  { col: 'YouTube-Link', label: 'YouTube-Link', kind: 'url' },
  { col: 'Notizen', label: 'Notizen', kind: 'area' },
];

const isoOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Startwert eines Feldes: Datum als ISO für das Datumsfeld, sonst der Zellentext. */
function initial(talk: Talk, f: Field): string {
  const v = cell(talk.raw, f.col);
  if (f.kind !== 'date') return v;
  const d = parseDate(v);
  return d ? isoOf(d) : '';
}

/** Zellwert aus dem Formularwert (Datum zurück nach TT.MM.JJJJ). */
function toCell(f: Field, v: string): string {
  if (f.kind !== 'date') return v.trim();
  const d = parseDate(v);
  return d ? formatDate(d) : '';
}

/** Welche Felder das Formular für diesen Talk zeigt: nur Spalten, die in Lectures vorkommen. */
const factFields = (talk: Talk): Field[] => FIELDS.filter((f) => f.col in talk.raw);

/** Bottom-Sheet „Eckdaten bearbeiten“. Liefert nur geänderte Spalten. Speaker und TN gesamt sind nicht dabei. */
export function FactsSheet({
  talk,
  onClose,
  onSave,
}: {
  talk: Talk | null;
  onClose: () => void;
  onSave: (talk: Talk, set: Record<string, string>) => void;
}) {
  return (
    <Sheet open={talk !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="glass mx-auto w-full max-w-xl overflow-y-auto">
        {talk && <FactsForm key={talk.key} talk={talk} onSave={onSave} />}
      </SheetContent>
    </Sheet>
  );
}

function FactsForm({
  talk,
  onSave,
}: {
  talk: Talk;
  onSave: (talk: Talk, set: Record<string, string>) => void;
}) {
  const fields = factFields(talk);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.col, initial(talk, f)])),
  );
  const [error, setError] = useState('');
  const listId = useId();

  const set: Record<string, string> = {};
  for (const f of fields) {
    const v = values[f.col] ?? '';
    if (v.trim() !== initial(talk, f).trim()) set[f.col] = toCell(f, v);
  }
  const changed = Object.keys(set).length > 0;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!changed) return;
        try {
          checkLectureSet(set);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Eingabe ungültig.');
          return;
        }
        onSave(talk, set);
      }}
    >
      <SheetHeader className="pr-10">
        <SheetTitle>Eckdaten bearbeiten</SheetTitle>
        <SheetDescription>
          {talk.title}, {talk.names.join(', ')}. Es werden nur geänderte Zellen geschrieben.
        </SheetDescription>
      </SheetHeader>

      {fields.map((f) => {
        const value = values[f.col] ?? '';
        const change = (v: string): void => {
          setValues((prev) => ({ ...prev, [f.col]: v }));
          setError('');
        };
        if (f.kind === 'select') {
          const opts = f.options ?? [];
          const list = value && !opts.includes(value) ? [value, ...opts] : opts;
          return (
            <SelectField
              key={f.col}
              label={f.label}
              value={value}
              onChange={change}
              options={[{ value: '', label: 'leer' }, ...list.map((o) => ({ value: o, label: o }))]}
            />
          );
        }
        if (f.kind === 'area')
          return <TextArea key={f.col} label={f.label} value={value} onChange={change} rows={4} />;
        return (
          <TextField
            key={f.col}
            label={f.label}
            value={value}
            onChange={change}
            hint={f.hint}
            autoComplete="off"
            {...(f.kind === 'date' ? { type: 'date' } : {})}
            {...(f.kind === 'number' ? { inputMode: 'numeric' as const } : {})}
            {...(f.kind === 'url' ? { type: 'url', inputMode: 'url' as const } : {})}
            {...(f.col === 'Veröffentlichung' ? { list: listId } : {})}
          />
        );
      })}
      <datalist id={listId}>
        <option value="ja" />
        <option value="nein" />
      </datalist>

      {error && (
        <p role="alert" className="text-crit text-sm font-medium">
          {error}
        </p>
      )}

      <SheetFooter>
        <Button type="submit" disabled={!changed}>
          Speichern
        </Button>
        <SheetClose asChild>
          <Button type="button" variant="outline">
            Abbrechen
          </Button>
        </SheetClose>
      </SheetFooter>
    </form>
  );
}
