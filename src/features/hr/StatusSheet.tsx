import { Check } from 'lucide-react';
import { useState } from 'react';
import { PIPELINE_STATUS, type Person } from '@/domain/hr';
import { cn } from '@/ui/lib/utils';
import { Button } from '@/ui/shadcn/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/ui/shadcn/sheet';

export type SheetMode = 'status' | 'review';

interface Props {
  person: Person | null;
  mode: SheetMode;
  onClose: () => void;
  onStatus: (status: string) => void;
  onReview: (text: string) => void;
}

/** Bottom-Sheet: Status wählen oder Review-Ergebnis eintragen. */
export function StatusSheet({ person, mode, onClose, onStatus, onReview }: Props) {
  return (
    <Sheet open={person !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="glass mx-auto max-w-lg">
        {person && mode === 'status' && (
          <>
            <SheetHeader>
              <SheetTitle>Status ändern</SheetTitle>
              <SheetDescription>{person.name}</SheetDescription>
            </SheetHeader>
            <ul className="flex flex-col gap-1">
              {PIPELINE_STATUS.map((s) => {
                const current = person.status === s;
                return (
                  <li key={s}>
                    <button
                      type="button"
                      aria-pressed={current}
                      onClick={() => onStatus(s)}
                      className={cn(
                        'flex min-h-11 w-full items-center justify-between rounded-md border px-3 text-left text-base',
                        current
                          ? 'border-accent bg-accent-soft text-accent font-bold'
                          : 'border-line bg-surface',
                      )}
                    >
                      {s}
                      {current && <Check className="size-4" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {person && mode === 'review' && (
          <ReviewForm key={person.key} person={person} onSave={onReview} onCancel={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ReviewForm({
  person,
  onSave,
  onCancel,
}: {
  person: Person;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(person.k['Review / Ergebnis'] ?? '');
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(text.trim());
      }}
    >
      <SheetHeader>
        <SheetTitle>Review-Ergebnis</SheetTitle>
        <SheetDescription>{person.name}</SheetDescription>
      </SheetHeader>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Ergebnis
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="border-input bg-card min-h-24 w-full rounded-md border p-3 text-base"
        />
      </label>
      <SheetFooter>
        <Button type="submit">Speichern</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
      </SheetFooter>
    </form>
  );
}
