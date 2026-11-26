import { useState } from 'react';
import type { FlagGroup } from '@/domain/hr';
import { Button } from '@/ui/shadcn/button';
import { FlagPill } from './parts';

const SHOWN = 8;

/** Handlungsbedarf: Name, Pillen, Grund, Buddy. Keine Kontaktdaten. */
export function ActionList({ groups }: { groups: FlagGroup[] }) {
  const [all, setAll] = useState(false);
  if (groups.length === 0) return <p className="text-muted text-sm">Nichts offen.</p>;
  const shown = all ? groups : groups.slice(0, SHOWN);
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2">
        {shown.map((g) => (
          <li
            key={g.person.key}
            className="border-line bg-surface flex flex-col gap-1.5 rounded-lg border p-3"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-display font-semibold">{g.person.name}</span>
              {g.person.buddy && (
                <span className="text-muted text-sm">Buddy: {g.person.buddy}</span>
              )}
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {g.flags.map((f) => (
                <li key={f.tag}>
                  <FlagPill flag={f} />
                </li>
              ))}
            </ul>
            <p className="text-sm">{g.flags.map((f) => f.why).join(' · ')}</p>
          </li>
        ))}
      </ol>
      {groups.length > SHOWN && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setAll((a) => !a)}
          className="self-start"
        >
          {all ? 'Weniger anzeigen' : `Alle ${groups.length} anzeigen`}
        </Button>
      )}
    </div>
  );
}
