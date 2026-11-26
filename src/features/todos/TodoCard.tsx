import { CircleAlert, ExternalLink, LoaderCircle, NotebookPen } from 'lucide-react';
import { formatShort } from '@/domain/dates';
import type { ConflictInfo, GroupKey, Todo } from '@/domain/todos';
import { Badge } from '@/ui/shadcn/badge';
import { Button } from '@/ui/shadcn/button';
import { Checkbox } from '@/ui/shadcn/checkbox';
import { cn } from '@/ui/lib/utils';
import { dueLabel, isSafeLink } from './format';

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
      <dt className="text-muted">{term}</dt>
      <dd className="min-w-0 break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}

export function TodoCard({
  todo: t,
  today,
  group,
  pending,
  conflict,
  onComplete,
  onNote,
}: {
  todo: Todo;
  today: Date;
  group: GroupKey;
  pending: boolean;
  conflict?: ConflictInfo | null;
  onComplete: (t: Todo) => void;
  onNote: (t: Todo) => void;
}) {
  const completed = t.status === 'erledigt' || pending;
  const due = dueLabel(t, today);
  const showBei = t.delegatedTo && t.delegatedTo !== t.waitingFor;
  return (
    <article
      aria-label={`${t.id} ${t.title}`}
      aria-busy={pending || undefined}
      className={cn(
        'bg-surface border-line rounded-lg border p-3',
        t.late && 'border-l-crit border-l-4',
        t.isDone && !pending && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-1">
        <span className="flex size-11 shrink-0 items-center justify-center">
          <Checkbox
            checked={completed}
            disabled={t.isDone || pending}
            onCheckedChange={() => onComplete(t)}
            aria-label={`Als erledigt markieren: ${t.title}`}
            className="relative after:absolute after:-inset-3 after:content-['']"
          />
        </span>
        <div className="min-w-0 flex-1 pt-2.5">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-muted font-mono text-xs">{t.id}</span>
            <span className={cn('font-medium break-words', completed && 'line-through')}>
              {t.title}
            </span>
          </p>
        </div>
        {!t.isDone && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNote(t)}
            aria-label={`Notiz zu ${t.id} ergänzen`}
            title="Notiz ergänzen"
          >
            <NotebookPen aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
        {t.prio && (
          <Badge variant={t.prio === 'A' ? 'destructive' : t.prio === 'B' ? 'warn' : 'outline'}>
            Prio {t.prio}
          </Badge>
        )}
        <Badge
          variant={t.status === 'erledigt' ? 'ok' : t.status === 'wartet' ? 'warn' : 'outline'}
        >
          {t.status}
        </Badge>
        {group !== 'Ebene' && t.level && <Badge variant="secondary">{t.level}</Badge>}
        {group !== 'Modus' && t.mode && <Badge variant="outline">{t.mode}</Badge>}
        {t.area && <Badge variant="outline">{t.area}</Badge>}
        {conflict && (
          <Badge variant="destructive" title={conflict.reason}>
            {conflict.label}
          </Badge>
        )}
        {due && (
          <Badge
            variant={t.late ? 'destructive' : t.week ? 'warn' : 'outline'}
            className="font-mono"
          >
            {t.late && <CircleAlert className="size-3" aria-hidden="true" />}
            {due}
            {t.late && <span className="sr-only"> (überfällig)</span>}
          </Badge>
        )}
      </div>

      {(t.waitingFor || showBei || t.nextStep || t.note) && (
        <dl className="mt-3 space-y-1 pl-1">
          {t.waitingFor && <Row term="Wartet auf">{t.waitingFor}</Row>}
          {showBei && <Row term="Bei">{t.delegatedTo}</Row>}
          {t.nextStep && <Row term="Als Nächstes">{t.nextStep}</Row>}
          {t.note && <Row term="Notiz">{t.note}</Row>}
        </dl>
      )}

      <p className="text-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 font-mono text-xs">
        {t.source && <span>{t.source}</span>}
        {isSafeLink(t.link) && (
          <a
            href={t.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent inline-flex min-h-11 items-center gap-1 underline-offset-2 hover:underline"
          >
            öffnen
            <ExternalLink className="size-3" aria-hidden="true" />
            <span className="sr-only">(neuer Tab)</span>
          </a>
        )}
        {t.doneOn && <span>erledigt {t.doneOn}</span>}
        {t.touched && <span>bearbeitet {formatShort(t.touched, today)}</span>}
      </p>

      {pending && (
        <p role="status" className="text-accent mt-2 flex items-center gap-2 pl-1 text-sm">
          <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          Speichert …
        </p>
      )}
    </article>
  );
}
