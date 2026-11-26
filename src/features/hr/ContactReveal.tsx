import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { contactOf, type Person } from '@/domain/hr';
import { Button } from '@/ui/shadcn/button';

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  };
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="text-muted text-xs">{label}</div>
        <div className="font-mono text-sm break-all">{value}</div>
      </div>
      <Button type="button" variant="outline" size="icon" onClick={copy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span className="sr-only">{copied ? `${label} kopiert` : `${label} kopieren`}</span>
      </Button>
    </div>
  );
}

/** Kontaktdaten stehen erst nach Klick im DOM, nie in Listen, Suche oder Beschriftungen. */
export function ContactReveal({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);
  const { mail, tel } = contactOf(person);
  if (!mail && !tel) return null;
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        {open ? 'Kontakt verbergen' : 'Kontakt anzeigen'}
      </Button>
      {open && (
        <div className="border-line bg-bg mt-2 flex flex-col gap-2 rounded-md border p-3">
          {mail && <CopyRow label="E-Mail" value={mail} />}
          {tel && <CopyRow label="Telefon" value={tel} />}
        </div>
      )}
    </div>
  );
}
