import { useState } from 'react';
import { initialOwner, OWNER_OTHER as OTHER, ownerOptions } from './owners';
import { STEP_LOG_STATUS } from '@/domain/talks/write';
import type { StepState, Talk } from '@/domain/talks/types';
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

/** Was das Sheet liefert: Owner nur, wenn er sich geändert hat, leerer Status = Status bleibt. */
export interface StepEdit {
  status: string;
  owner: string;
  note: string;
}

const STATUS_LABEL: Record<string, string> = {
  erledigt: 'erledigt',
  offen: 'offen',
  'nicht nötig': 'nicht nötig',
};

/** Bottom-Sheet für einen Ablauf-Schritt: Owner, Status, Notiz. Schreibt selbst nichts. */
export function StepSheet({
  target,
  team,
  onClose,
  onSave,
}: {
  target: { talk: Talk; step: StepState } | null;
  team: string[];
  onClose: () => void;
  onSave: (talk: Talk, step: StepState, edit: StepEdit) => void;
}) {
  return (
    <Sheet open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom">
        {target && (
          <StepForm
            key={`${target.talk.key}|${target.step.def.key}`}
            talk={target.talk}
            step={target.step}
            team={team}
            onSave={onSave}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function StepForm({
  talk,
  step,
  team,
  onSave,
}: {
  talk: Talk;
  step: StepState;
  team: string[];
  onSave: (talk: Talk, step: StepState, edit: StepEdit) => void;
}) {
  const options = ownerOptions(team);
  const [start] = useState(() => initialOwner(step.owner, options));
  const [choice, setChoice] = useState(start.choice);
  const [custom, setCustom] = useState(start.custom);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');

  const owner = (choice === OTHER ? custom : choice).trim();
  const ownerChanged = owner !== '' && owner.toLowerCase() !== step.owner.trim().toLowerCase();
  const changed = ownerChanged || status !== '' || note.trim() !== '';

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (changed) onSave(talk, step, { status, owner: ownerChanged ? owner : '', note });
      }}
    >
      <SheetHeader className="pr-10">
        <SheetTitle>{step.def.label}</SheetTitle>
        <SheetDescription>
          {talk.title}, {talk.names.join(', ')}
        </SheetDescription>
      </SheetHeader>

      <SelectField
        label="Owner"
        value={choice}
        onChange={setChoice}
        options={[
          ...(choice ? [] : [{ value: '', label: 'Owner wählen' }]),
          ...options.map((o) => ({ value: o, label: o })),
          { value: OTHER, label: 'Anderer Name …' },
        ]}
      />
      {choice === OTHER && (
        <TextField label="Name" value={custom} onChange={setCustom} autoComplete="off" />
      )}
      <SelectField
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: '', label: 'Status bleibt' },
          ...STEP_LOG_STATUS.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s })),
        ]}
      />
      <TextArea
        label="Notiz"
        value={note}
        onChange={setNote}
        rows={3}
        hint="Wird mit Datum und deinem Namen im Log von Talk-Schritte gespeichert."
      />
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
