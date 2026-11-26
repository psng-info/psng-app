import { useId, useState } from 'react';
import {
  LEVELS,
  MODES,
  PRIOS,
  validateNewTodo,
  type NewTodoFields,
  type TodoErrors,
} from '@/domain/todos';
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
import { SelectField, TextField } from './fields';

const NEW_STATUSES = ['offen', 'läuft', 'wartet', 'geparkt'] as const;

const EMPTY: NewTodoFields = {
  'To-do': '',
  Status: 'offen',
  Ebene: 'Schritt',
  Modus: 'selbst',
  Ziel: '',
  Bereich: '',
  Prio: 'B',
  Deadline: '',
  'Wartet auf': '',
  'Delegiert an': '',
};

const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

/** Neues To-do als Bottom-Sheet. Prüft nach den Regeln der Spezifikation, schreibt nichts selbst. */
export function NewTodoSheet({
  open,
  onClose,
  onCreate,
  goals,
  areas,
  people,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (fields: NewTodoFields) => void;
  goals: string[];
  areas: string[];
  people: string[];
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="glass mx-auto w-full max-w-xl">
        {open && <NewForm onCreate={onCreate} goals={goals} areas={areas} people={people} />}
      </SheetContent>
    </Sheet>
  );
}

function NewForm({
  onCreate,
  goals,
  areas,
  people,
}: {
  onCreate: (f: NewTodoFields) => void;
  goals: string[];
  areas: string[];
  people: string[];
}) {
  const [f, setF] = useState<NewTodoFields>(EMPTY);
  const [errors, setErrors] = useState<TodoErrors>({});
  const areaList = useId();
  const peopleList = useId();
  const set =
    <K extends keyof NewTodoFields>(k: K) =>
    (v: string) => {
      setF((prev) => ({ ...prev, [k]: v }));
      setErrors((prev) => ({ ...prev, [k]: undefined }));
    };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const found = validateNewTodo(f);
        setErrors(found);
        if (Object.keys(found).length === 0) onCreate(f);
      }}
    >
      <SheetHeader className="pr-10">
        <SheetTitle>Neues To-do</SheetTitle>
        <SheetDescription>
          Bekommt automatisch ID, Quelle „App“ und das heutige Erfassungsdatum.
        </SheetDescription>
      </SheetHeader>

      <TextField
        label="To-do"
        value={f['To-do']}
        onChange={set('To-do')}
        error={errors['To-do']}
        autoComplete="off"
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Status"
          value={f.Status}
          onChange={set('Status')}
          options={opts(NEW_STATUSES)}
        />
        <SelectField
          label="Prio"
          value={f.Prio}
          onChange={set('Prio')}
          options={[{ value: '', label: 'keine' }, ...opts(PRIOS)]}
        />
        <SelectField label="Ebene" value={f.Ebene} onChange={set('Ebene')} options={opts(LEVELS)} />
        <SelectField label="Modus" value={f.Modus} onChange={set('Modus')} options={opts(MODES)} />
        <SelectField
          label="Ziel"
          value={f.Ziel}
          onChange={set('Ziel')}
          options={[{ value: '', label: 'kein Ziel' }, ...opts(goals)]}
        />
        <TextField
          label="Bereich"
          value={f.Bereich}
          onChange={set('Bereich')}
          list={areaList}
          autoComplete="off"
        />
        <TextField
          label="Deadline"
          type="date"
          value={f.Deadline}
          onChange={set('Deadline')}
          error={errors.Deadline}
        />
        <TextField
          label="Delegiert an"
          value={f['Delegiert an']}
          onChange={set('Delegiert an')}
          error={errors['Delegiert an']}
          hint={errors['Delegiert an'] ? undefined : 'Mehrere mit Komma'}
          list={peopleList}
          autoComplete="off"
        />
      </div>
      {f.Status === 'wartet' && (
        <TextField
          label="Wartet auf"
          value={f['Wartet auf']}
          onChange={set('Wartet auf')}
          error={errors['Wartet auf']}
          list={peopleList}
          autoComplete="off"
        />
      )}
      <datalist id={areaList}>
        {areas.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <datalist id={peopleList}>
        {people.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {Object.keys(errors).some((k) => errors[k as keyof TodoErrors]) && (
        <p role="alert" className="text-crit text-sm">
          Bitte die markierten Felder prüfen.
        </p>
      )}
      <SheetFooter>
        <Button type="submit">Anlegen</Button>
        <SheetClose asChild>
          <Button type="button" variant="outline">
            Abbrechen
          </Button>
        </SheetClose>
      </SheetFooter>
    </form>
  );
}
