import { ChevronDown, Pencil } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { OFFLINE_HINT, useOnline } from '@/data/online';
import { formatDate, parseDate } from '@/domain/dates';
import { formAnswers, progress, STEPS, type HrSet, type Person, type Step } from '@/domain/hr';
import { cn } from '@/ui/lib/utils';
import { Button } from '@/ui/shadcn/button';
import { Checkbox } from '@/ui/shadcn/checkbox';
import { ContactReveal } from './ContactReveal';
import { DateText, FlagPill, ProgressBar, StageBadge } from './parts';

interface Props {
  person: Person;
  today: Date;
  onEdit: (person: Person, set: HrSet) => void;
  onStatus: (person: Person) => void;
  onReview: (person: Person) => void;
}

function Fact({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn('flex flex-col', wide && 'col-span-2')}>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

export function PersonCard({ person: p, today, onEdit, onStatus, onReview }: Props) {
  const online = useOnline();
  const g = progress(p);
  const k = p.k;
  const where = [k['Stadt / Uni'], k['Status & Fach']].filter(Boolean).join(' · ');
  const answers = formAnswers(p);
  const note = p.note;
  const noteText = note?.['Notiz'] ?? '';

  return (
    <article
      aria-labelledby={`hr-${p.key}`}
      className="border-line bg-surface flex flex-col gap-3 rounded-lg border p-4"
    >
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4
            id={`hr-${p.key}`}
            className="font-display text-lg leading-tight font-semibold break-words"
          >
            {p.name}
          </h4>
          {where && <p className="text-muted mt-0.5 text-sm break-words">{where}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StageBadge stage={p.stage} />
        </div>
      </header>

      {p.flags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Handlungsbedarf">
          {p.flags.map((f) => (
            <li key={f.tag}>
              <FlagPill flag={f} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <ProgressBar progress={g} />
        <p className="text-muted text-sm">{g.text}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        {k['Interesse / Bereich'] && (
          <Fact wide label="Interesse">
            {k['Interesse / Bereich']}
          </Fact>
        )}
        {k['Zeit pro Woche'] && <Fact label="Zeit pro Woche">{k['Zeit pro Woche']}</Fact>}
        {!p.formOnly && <Fact label="Buddy">{k['Buddy'] || '–'}</Fact>}
        {!p.formOnly && (
          <>
            <Fact label="1:1 am">
              <DateText d={parseDate(k['1:1 am'])} today={today} />
            </Fact>
            <Fact label="Deadline">
              <DateText d={p.dl} today={today} />
            </Fact>
            <Fact label="Letzter Kontakt">
              <DateText d={p.last} today={today} />
            </Fact>
            {p.wv && (
              <Fact label="Wiedervorlage">
                <DateText d={p.wv} today={today} />
              </Fact>
            )}
            {k['Probeaufgabe'] && (
              <Fact wide label="Probeaufgabe">
                {k['Probeaufgabe']}
              </Fact>
            )}
            {k['Review / Ergebnis'] && (
              <Fact wide label="Review">
                {k['Review / Ergebnis']}
              </Fact>
            )}
          </>
        )}
      </dl>

      {(noteText || k['Kommentar']) && (
        <div className="bg-bg rounded-md p-3">
          <p className="text-muted text-xs">
            {noteText
              ? `Letzte Notiz${note?.['Datum'] ? ` · ${note['Datum']}` : ''}${note?.['Von'] ? ` · ${note['Von']}` : ''}`
              : 'Kommentar'}
          </p>
          <p className="mt-1 line-clamp-4 text-sm whitespace-pre-wrap">
            {noteText || k['Kommentar']}
          </p>
        </div>
      )}

      {p.editable && (
        <details className="group">
          <summary className="hover:bg-accent-soft -mx-2 flex min-h-11 cursor-pointer items-center rounded-md px-2 text-sm font-medium">
            Checkliste
            <ChevronDown
              className="ml-auto size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ul className="mt-1 flex flex-col">
            {STEPS.map((st, i) => (
              <StepRow
                key={st.text}
                step={st}
                state={g.checks[i] ?? 'open'}
                value={st.col ? (k[st.col] ?? '') : ''}
                today={today}
                onTick={(set) => onEdit(p, set)}
                onReview={() => onReview(p)}
              />
            ))}
          </ul>
        </details>
      )}

      {answers.length > 0 && (
        <details className="group">
          <summary className="hover:bg-accent-soft -mx-2 flex min-h-11 cursor-pointer items-center rounded-md px-2 text-sm font-medium">
            Formularantworten
            <ChevronDown
              className="ml-auto size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <dl className="mt-1 flex flex-col gap-2">
            {answers.map((a) => (
              <Fact key={a.label} label={a.label}>
                {a.value}
              </Fact>
            ))}
          </dl>
        </details>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-2">
        <ContactReveal person={p} />
        {p.editable && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!online}
            title={online ? undefined : OFFLINE_HINT}
            onClick={() => onStatus(p)}
          >
            <Pencil aria-hidden="true" />
            Status ändern
          </Button>
        )}
      </footer>
    </article>
  );
}

function StepRow({
  step,
  state,
  value,
  today,
  onTick,
  onReview,
}: {
  step: Step;
  state: 'done' | 'implied' | 'open';
  value: string;
  today: Date;
  onTick: (set: HrSet) => void;
  onReview: () => void;
}) {
  const done = state === 'done';
  const col = step.col;
  const id = useId();
  let control: ReactNode;
  let hint: string | null = null;

  if (step.kind === 'auto') {
    control = (
      <span className="inline-flex size-11 items-center justify-center text-sm" aria-hidden="true">
        {done ? '✓' : '○'}
      </span>
    );
    hint = done ? 'automatisch erkannt' : 'automatisch';
  } else if (step.kind === 'note') {
    control = (
      <Button type="button" variant="outline" size="sm" onClick={onReview}>
        {value ? 'Ergebnis ändern' : 'Ergebnis eintragen'}
      </Button>
    );
  } else if (step.kind === 'date') {
    control = (
      <Checkbox
        id={id}
        checked={done}
        disabled={done}
        onCheckedChange={(c) => c === true && col && onTick({ [col]: formatDate(today) })}
      />
    );
    hint = value || null;
  } else {
    control = (
      <Checkbox
        id={id}
        checked={done}
        onCheckedChange={(c) => col && onTick({ [col]: c === true })}
      />
    );
    hint = state === 'implied' ? 'gilt als erledigt' : null;
  }

  const labelled = step.kind === 'box' || step.kind === 'date';
  return (
    <li className="flex min-h-11 items-center gap-1">
      {labelled ? (
        <label htmlFor={id} className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center">{control}</span>
          <span className={cn('flex-1 text-sm', done && 'text-muted')}>
            {step.text}
            {hint && <span className="text-muted ml-2 font-mono text-xs">{hint}</span>}
          </span>
        </label>
      ) : (
        <div className="flex min-h-11 flex-1 items-center gap-1">
          {step.kind === 'auto' && control}
          <span className={cn('flex-1 text-sm', done && 'text-muted')}>
            {step.text}
            {hint && <span className="text-muted ml-2 text-xs">{hint}</span>}
          </span>
          {step.kind === 'note' && control}
        </div>
      )}
    </li>
  );
}
