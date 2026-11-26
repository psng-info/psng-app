import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { OFFLINE_HINT, useOnline } from '@/data/online';
import type { QueueKind } from '@/domain/ai/queue';
import { TextArea } from '@/ui/blocks/fields';
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
import { useAi } from './AiContext';

const KIND_TEXT: Record<QueueKind, string> = {
  todos: 'zu diesem To-do',
  people: 'zu dieser Person',
  talks: 'zu diesem Talk',
};

/** „Für Claude vormerken“: Notiz in die Warteschlange, noch nichts geschrieben. Ohne Schalter nicht da. */
export function QueueButton({
  kind,
  id,
  label,
}: {
  kind: QueueKind;
  id: string;
  /** Anzeigename für Screenreader und Titel. */
  label: string;
}) {
  const ai = useAi();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  if (!ai.enabled) return null;
  const queued = ai.queue[kind][id];
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        disabled={!online}
        aria-label={`Für Claude vormerken: ${label}`}
        title={online ? (queued ? 'Vorgemerkt, bearbeiten' : 'Für Claude vormerken') : OFFLINE_HINT}
        className={queued ? 'text-accent' : undefined}
      >
        <Sparkles aria-hidden="true" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="glass mx-auto w-full max-w-xl">
          {open && (
            <QueueForm
              key={id}
              label={label}
              kind={kind}
              initial={queued ?? ''}
              onSave={(text) => {
                ai.setNote(kind, id, text);
                setOpen(false);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function QueueForm({
  label,
  kind,
  initial,
  onSave,
}: {
  label: string;
  kind: QueueKind;
  initial: string;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(text);
      }}
    >
      <SheetHeader className="pr-10">
        <SheetTitle>Für Claude vormerken</SheetTitle>
        <SheetDescription>{label}</SheetDescription>
      </SheetHeader>
      <TextArea
        label={`Was gibt es Neues ${KIND_TEXT[kind]}?`}
        value={text}
        onChange={setText}
        hint="Es wird noch nichts geschrieben. Du siehst erst eine Vorschau. Keine Kontaktdaten eintippen."
      />
      <SheetFooter>
        <Button type="submit">
          {text.trim() ? 'Vormerken' : initial ? 'Entfernen' : 'Vormerken'}
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
