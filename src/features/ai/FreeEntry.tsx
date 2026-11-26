import { Sparkles } from 'lucide-react';
import { useState } from 'react';
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

/** Kopfzeilen-Knopf: freie Notiz vormerken (neues To-do oder Info zu einem bestehenden). */
export function FreeEntryButton() {
  const ai = useAi();
  const [open, setOpen] = useState(false);
  if (!ai.enabled) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Freie Notiz für Claude vormerken"
        title="Freie Notiz für Claude vormerken"
      >
        <Sparkles aria-hidden="true" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="glass mx-auto w-full max-w-xl">
          {open && (
            <FreeForm
              onSave={(text) => {
                ai.addFree(text);
                setOpen(false);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function FreeForm({ onSave }: { onSave: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSave(text);
      }}
    >
      <SheetHeader className="pr-10">
        <SheetTitle>Freie Notiz vormerken</SheetTitle>
        <SheetDescription>
          Neues To-do oder Info zu einem bestehenden (mit ID, z. B. „T116 Zusage ist da“).
        </SheetDescription>
      </SheetHeader>
      <TextArea
        label="Notiz"
        value={text}
        onChange={setText}
        hint="Es wird noch nichts geschrieben. Keine Kontaktdaten eintippen."
      />
      <SheetFooter>
        <Button type="submit" disabled={!text.trim()}>
          Vormerken
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
