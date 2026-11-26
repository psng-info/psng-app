import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import type { PreviewItem } from '@/domain/ai/preview';
import { Pill, type Tone } from '@/ui/blocks';
import { TextField } from '@/ui/blocks/fields';
import { Button } from '@/ui/shadcn/button';
import { Checkbox } from '@/ui/shadcn/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/ui/shadcn/sheet';

const KIND: Record<PreviewItem['kind'], { text: string; tone: Tone }> = {
  todo: { text: 'To-do', tone: 'neutral' },
  new: { text: 'Neu', tone: 'accent' },
  hr: { text: 'HR', tone: 'warn' },
  talk: { text: 'Talk', tone: 'ok' },
  step: { text: 'Schritt', tone: 'ok' },
};

/** Vorschau der Änderungen: Haken pro Eintrag, „Ergänzen/korrigieren“, erst „Ins Sheet schreiben“ schreibt. */
export function PreviewSheet({
  items,
  extras,
  thorough,
  busy,
  writing,
  error,
  onToggle,
  onThorough,
  onRedo,
  onWrite,
  onClose,
}: {
  items: PreviewItem[];
  extras: string[];
  thorough: boolean;
  busy: boolean;
  writing: boolean;
  error: string;
  onToggle: (id: string, ok: boolean) => void;
  onThorough: (v: boolean) => void;
  onRedo: (extra: string) => void;
  onWrite: () => void;
  onClose: () => void;
}) {
  const [extra, setExtra] = useState('');
  const chosen = items.filter((i) => i.ok && !i.blocked).length;
  const working = busy || writing;
  return (
    <Sheet open onOpenChange={(open) => !open && !working && onClose()}>
      <SheetContent side="bottom" className="glass mx-auto w-full max-w-2xl">
        <SheetHeader className="pr-10">
          <SheetTitle>Vorschau</SheetTitle>
          <SheetDescription>
            {items.length
              ? 'Häkchen raus, was nicht übernommen werden soll. Geschrieben wird erst mit dem Knopf unten.'
              : 'Claude hat nichts zu ändern gefunden.'}
          </SheetDescription>
        </SheetHeader>

        {extras.length > 0 && (
          <p className="text-muted text-sm">Ergänzt: {extras.map((e) => `„${e}“`).join(' · ')}</p>
        )}

        <ul className="flex flex-col gap-2" aria-label="Vorgeschlagene Änderungen">
          {items.map((i) => (
            <li key={i.id} className="bg-surface border-line flex gap-1 rounded-lg border p-2">
              <span className="flex size-11 shrink-0 items-center justify-center">
                <Checkbox
                  checked={i.ok && !i.blocked}
                  disabled={!!i.blocked || working}
                  onCheckedChange={(v) => onToggle(i.id, v === true)}
                  aria-label={`Übernehmen: ${i.label}`}
                />
              </span>
              <div className="min-w-0 flex-1 py-2">
                <p className="flex flex-wrap items-center gap-2">
                  <Pill tone={KIND[i.kind].tone}>{KIND[i.kind].text}</Pill>
                  <b className="font-medium break-words">{i.label}</b>
                </p>
                {i.why && <p className="text-muted mt-0.5 text-sm">{i.why}</p>}
                <ul className="mt-1 space-y-0.5 text-sm">
                  {i.lines.map((l) => (
                    <li key={l.col} className="break-words whitespace-pre-line">
                      <span className="text-muted">{l.col}: </span>
                      {l.old && (
                        <>
                          <del className="text-muted">{l.old}</del>
                          <span aria-hidden="true"> → </span>
                          <span className="sr-only"> ersetzt durch </span>
                        </>
                      )}
                      <ins className="no-underline font-medium">{l.next || '(leer)'}</ins>
                    </li>
                  ))}
                </ul>
                {i.blocked && (
                  <p role="note" className="text-crit mt-1 text-sm">
                    Nicht schreibbar: {i.blocked}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!extra.trim() || working) return;
            onRedo(extra.trim());
            setExtra('');
          }}
        >
          <TextField
            className="flex-1"
            label="Ergänzen oder korrigieren"
            value={extra}
            onChange={setExtra}
            hint="Claude überarbeitet den Vorschlag. Abgewählte Einträge bleiben abgewählt."
          />
          <Button type="submit" variant="outline" disabled={!extra.trim() || working}>
            Neu berechnen
          </Button>
        </form>

        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={thorough}
            onChange={(e) => onThorough(e.target.checked)}
            disabled={working}
            className="size-5"
          />
          Gründlich (stärkeres Modell, kostet mehr, zählt dreifach)
        </label>

        {error && (
          <p role="alert" className="text-crit text-sm">
            {error}
          </p>
        )}
        {busy && (
          <p role="status" className="text-accent flex items-center gap-2 text-sm">
            <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            Claude überarbeitet …
          </p>
        )}

        <SheetFooter>
          <Button onClick={onWrite} disabled={chosen === 0 || working}>
            {writing ? 'Schreibt …' : `Ins Sheet schreiben (${chosen})`}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={working}>
            Zurück
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
