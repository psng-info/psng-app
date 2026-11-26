import { useId, type ReactNode } from 'react';
import { cn } from '@/ui/lib/utils';

const control =
  'border-input bg-card text-foreground min-h-11 w-full min-w-0 rounded-md border px-3 py-2 text-base disabled:opacity-50 aria-[invalid=true]:border-crit';

export interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  className?: string | undefined;
  /** Rendert das Eingabeelement mit den nötigen Attributen. */
  children: (a: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/** Beschriftung, Eingabe, Hinweis und Fehlertext mit sauberer Verknüpfung. */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  const text = error ?? hint;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-muted text-sm font-medium">
        {label}
      </label>
      {children({ id, describedBy: text ? msgId : undefined, invalid: !!error })}
      {text && (
        <p id={msgId} className={cn('text-sm', error ? 'text-crit' : 'text-muted')}>
          {text}
        </p>
      )}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  error?: string | undefined;
  hint?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, 'truncate')}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  className,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  hint?: string | undefined;
  className?: string | undefined;
} & Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'id' | 'className'>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={control}
          {...rest}
        />
      )}
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  error,
  hint,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  hint?: string | undefined;
  rows?: number;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, 'resize-y')}
        />
      )}
    </Field>
  );
}

export { control as controlClass };
