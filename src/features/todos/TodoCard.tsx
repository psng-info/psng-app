import { Check, CircleAlert, ExternalLink, LoaderCircle, NotebookPen } from 'lucide-react';
import { formatShort } from '@/domain/dates';
import type { ConflictInfo, GroupKey, Todo } from '@/domain/todos';
import { OwnerChip, Pill, type Tone } from '@/ui/blocks';
import { QueueButton } from '@/features/ai/QueueButton';
import { OFFLINE_HINT, useOnline } from '@/data/online';
import { Button } from '@/ui/shadcn/button';
import { Checkbox } from '@/ui/shadcn/checkbox';
import { cn } from '@/ui/lib/utils';
import { dueLabel, isSafeLink } from './format';

const statusTone = (status: string): Tone =>
  status === 'erledigt' ? 'ok' : status === 'wartet' ? 'warn' : 'neutral';

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
  highlight = false,
  isMember,
  conflict,
  onComplete,
  onNote,
}: {
  todo: Todo;
  today: Date;
  group: GroupKey;
  pending: boolean;
  /** Von `#/todos/<id>` angesprungen. */
  highlight?: boolean;
  isMember: (owner: string) => boolean;
  conflict?: ConflictInfo | null;
  onComplete: (t: Todo) => void;
  onNote: (t: Todo) => void;
}) {
  const online = useOnline();
  const completed = t.status === 'erledigt' || pending;
  const due = dueLabel(t, today);
  const showBei = t.delegatedTo && t.delegatedTo !== t.waitingFor;
  return (
    <article
      id={`todo-${t.id}`}
      tabIndex={-1}
      aria-label={`${t.id} ${t.title}`}
      aria-busy={pending || undefined}
      className={cn(
        'bg-surface border-line scroll-mt-20 rounded-lg border p-3 outline-none',
        highlight && 'border-accent ring-accent ring-2',
        t.late && 'border-l-crit border-l-4',
        t.isDone && !pending && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-1">
        <span className="flex size-11 shrink-0 items-center justify-center">
          <Checkbox
            checked={completed}
            disabled={t.isDone || pending || !online}
            title={online ? undefined : OFFLINE_HINT}
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
        {!t.isDone && <QueueButton kind="todos" id={t.id} label={`${t.id} ${t.title}`} />}
        {!t.isDone && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNote(t)}
            disabled={!online}
            aria-label={`Notiz zu ${t.id} ergänzen`}
            title={online ? 'Notiz ergänzen' : OFFLINE_HINT}
          >
            <NotebookPen aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
        {t.prio && (
          <Pill tone={t.prio === 'A' ? 'crit' : t.prio === 'B' ? 'warn' : 'neutral'}>
            Prio {t.prio}
          </Pill>
        )}
        <Pill
          tone={statusTone(t.status)}
          icon={t.status === 'erledigt' ? <Check aria-hidden="true" className="size-3.5" /> : null}
        >
          {t.status}
        </Pill>
        {group !== 'Ebene' && t.level && <Pill>{t.level}</Pill>}
        {group !== 'Modus' && t.mode && <Pill>{t.mode}</Pill>}
        {t.area && <Pill>{t.area}</Pill>}
        {conflict && (
          <span title={conflict.reason}>
            <Pill tone="crit">{conflict.label}</Pill>
          </span>
        )}
        {due && (
          <Pill
            tone={t.late ? 'crit' : t.week ? 'warn' : 'neutral'}
            icon={t.late ? <CircleAlert aria-hidden="true" className="size-3" /> : null}
            className="font-mono"
          >
            {due}
            {t.late && <span className="sr-only"> (überfällig)</span>}
          </Pill>
        )}
      </div>

      {(t.waitingFor || showBei || t.nextStep || t.note) && (
        <dl className="mt-3 space-y-1 pl-1">
          {t.waitingFor && <Row term="Wartet auf">{t.waitingFor}</Row>}
          {showBei && (
            <Row term="Bei">
              <OwnerChip name={t.delegatedTo} member={isMember(t.delegatedTo)} />
            </Row>
          )}
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
