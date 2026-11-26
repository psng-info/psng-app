import { useState } from 'react';
import type { Todo } from '@/domain/todos';
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
import { TextArea } from '@/ui/blocks/fields';

/** Notiz ergänzen. Der Text wird mit Datum unter die bestehende Notiz gehängt. */
export function NoteSheet({
  todo,
  onClose,
  onSave,
}: {
  todo: Todo | null;
  onClose: () => void;
  onSave: (todo: Todo, text: string) => void;
}) {
  return (
    <Sheet open={todo !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom">
        {todo && <NoteForm key={todo.id} todo={todo} onSave={onSave} />}
      </SheetContent>
    </Sheet>
  );
}

function NoteForm({ todo, onSave }: { todo: Todo; onSave: (t: Todo, text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSave(todo, text.trim());
      }}
    >
      <SheetHeader className="pr-10">
        <SheetTitle>
          Notiz zu <span className="font-mono">{todo.id}</span>
        </SheetTitle>
        <SheetDescription>{todo.title}</SheetDescription>
      </SheetHeader>
      {todo.note && (
        <p className="bg-surface border-line max-h-32 overflow-y-auto rounded-md border p-3 text-sm whitespace-pre-line">
          {todo.note}
        </p>
      )}
      <TextArea
        label="Neue Notiz"
        value={text}
        onChange={setText}
        hint="Wird mit dem heutigen Datum unter die bestehende Notiz geschrieben."
      />
      <SheetFooter>
        <Button type="submit" disabled={!text.trim()}>
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
