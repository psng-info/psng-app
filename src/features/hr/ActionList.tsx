import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/ui/blocks';
import type { FlagGroup } from '@/domain/hr';
import { Button } from '@/ui/shadcn/button';
import { FlagTag } from './parts';

const SHOWN = 5;

/** Handlungsbedarf: Name, Pillen, Grund, Buddy. Keine Kontaktdaten. */
export function ActionList({ groups }: { groups: FlagGroup[] }) {
  const [all, setAll] = useState(false);
  if (groups.length === 0)
    return (
      <EmptyState tone="ok" icon={<CircleCheck className="size-5" />}>
        Nichts offen. Niemand wartet gerade auf eine Rückmeldung.
      </EmptyState>
    );
  const shown = all ? groups : groups.slice(0, SHOWN);
  return (
    <div className="flex flex-col gap-2">
      <ol className="border-line bg-surface divide-line divide-y overflow-hidden rounded-2xl border">
        {shown.map((g) => (
          <li key={g.person.key} className="flex flex-col gap-1.5 px-3 py-3 sm:px-4">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-display font-semibold">{g.person.name}</span>
              {g.person.buddy && (
                <span className="text-muted text-sm">Buddy: {g.person.buddy}</span>
              )}
            </div>
            <ul className="flex flex-col gap-1.5">
              {g.flags.map((f) => (
                <li
                  key={f.tag}
                  className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-baseline gap-x-2 text-sm"
                >
                  <FlagTag flag={f} />
                  <span className="min-w-0 leading-snug">{f.why}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {groups.length > SHOWN && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setAll((a) => !a)}
          className="text-accent self-start underline underline-offset-2"
        >
          {all ? 'Weniger anzeigen' : `Alle ${groups.length} anzeigen`}
        </Button>
      )}
    </div>
  );
}
