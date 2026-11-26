import { cn } from '@/ui/lib/utils';
import { monthShort } from './format';

/**
 * Datumsmarke wie die Datumsschiene auf psng.info: Wochentag, Tageszahl, Monat in Himbeer.
 * Vergangene Termine bleiben gedämpft. Ohne Datum steht „?“ und „offen“.
 */
export function DateRail({
  date,
  today,
  upcoming,
  large = false,
}: {
  date: Date | null;
  today: Date;
  upcoming: boolean;
  large?: boolean;
}) {
  const weekday = date
    ? date.toLocaleDateString('de-DE', { weekday: 'short' }).replace(/\.$/, '')
    : '';
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center justify-start leading-none',
        large ? 'w-14' : 'w-11',
      )}
    >
      <span className="text-muted text-[0.6875rem] font-bold uppercase">{weekday || ' '}</span>
      <b
        className={cn(
          'font-display mt-1 font-semibold tabular-nums',
          large ? 'text-[2rem]' : 'text-2xl',
          !upcoming && 'text-muted',
        )}
      >
        {date ? String(date.getDate()).padStart(2, '0') : '?'}
      </b>
      <span
        className={cn(
          'mt-1 text-[0.6875rem] font-bold whitespace-nowrap uppercase',
          upcoming ? 'text-accent' : 'text-muted',
        )}
      >
        {date ? monthShort(date, today) : 'offen'}
      </span>
    </div>
  );
}
