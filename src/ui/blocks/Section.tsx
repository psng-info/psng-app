import { useId, type ReactNode } from 'react';
import { cn } from '@/ui/lib/utils';

/** Abschnitt mit Überschrift (h3, die Seite hat h2), optional Zähler, Hinweis und Aktion rechts. */
export function Section({
  title,
  count,
  hint,
  action,
  id,
  className,
  children,
}: {
  title: string;
  count?: string | undefined;
  hint?: string | undefined;
  action?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section id={id} aria-labelledby={titleId} className={cn('scroll-mt-20', className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id={titleId} className="font-display text-xl font-semibold">
          {title}
          {count && <span className="text-muted ml-2 text-base font-medium">{count}</span>}
        </h3>
        {action}
      </div>
      {hint && <p className="text-muted -mt-2 mb-3 text-sm">{hint}</p>}
      {children}
    </section>
  );
}

/** Zwischenüberschrift innerhalb einer Karte oder Gruppe. */
export function SubHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h4 className={cn('font-display text-muted mb-2 text-sm font-semibold', className)}>
      {children}
    </h4>
  );
}
