import { cn } from '@/ui/lib/utils';
import { initialsOf } from './initials';

/** Initialen statt Fotos (öffentliches Repo). Teammitglieder rosé, Rollen und Gruppen neutral. */
export function Avatar({
  name,
  member = false,
  className,
}: {
  name: string;
  member?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] leading-none font-bold',
        member ? 'bg-accent-soft text-accent' : 'bg-line text-muted',
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Person mit Initialen und Name, nur zur Anzeige. */
export function OwnerChip({ name, member = false }: { name: string; member?: boolean }) {
  if (!name) return null;
  return (
    <span className="border-line bg-surface inline-flex min-h-6 items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs whitespace-nowrap">
      <Avatar name={name} member={member} />
      {name}
    </span>
  );
}
