import { CircleAlert, ExternalLink, LoaderCircle, NotebookPen } from 'lucide-react';
import { Fragment } from 'react';
import { formatShort } from '@/domain/dates';
import type { ConflictInfo, GroupKey, Todo } from '@/domain/todos';
import { OwnerChip, Pill } from '@/ui/blocks';
import { OFFLINE_HINT, useOnline } from '@/data/online';
import { Button } from '@/ui/shadcn/button';
import { Checkbox } from '@/ui/shadcn/checkbox';
import { cn } from '@/ui/lib/utils';
import { dueLabel, isSafeLink } from './format';

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 text-sm">
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
  // Kopfzeile unter dem Titel: Fälligkeit zuerst (einzige Fläche, nur wenn drängend), dann Text.
  const meta = [
    t.prio
      ? {
          key: 'prio',
          node: <span className={cn(t.prio === 'A' && 'text-fg font-bold')}>Prio {t.prio}</span>,
        }
      : null,
    t.status && t.status !== 'offen' && t.status !== 'erledigt'
      ? { key: 'status', node: <span>{t.status}</span> }
      : null,
    group !== 'Ebene' && t.level ? { key: 'level', node: <span>{t.level}</span> } : null,
    group !== 'Modus' && t.mode ? { key: 'mode', node: <span>{t.mode}</span> } : null,
    t.area ? { key: 'area', node: <span>{t.area}</span> } : null,
  ].filter((m): m is { key: string; node: React.JSX.Element } => m !== null);
  const urgent = t.late || t.week;
  return (
    <article
      id={`todo-${t.id}`}
      tabIndex={-1}
      aria-label={`${t.id} ${t.title}`}
      aria-busy={pending || undefined}
      className={cn(
        'bg-surface border-line scroll-mt-20 rounded-xl border pt-0.5 pb-2.5 outline-none',
        highlight && 'border-accent ring-accent ring-2',
        t.late && !t.isDone && 'border-crit/50',
      )}
    >
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-start">
        <span className="flex size-11 items-center justify-center">
          <Checkbox
            checked={completed}
            disabled={t.isDone || pending || !online}
            title={online ? undefined : OFFLINE_HINT}
            onCheckedChange={() => onComplete(t)}
            aria-label={`Als erledigt markieren: ${t.title}`}
            className="relative after:absolute after:-inset-3 after:content-['']"
          />
        </span>
        <div className="min-w-0 pt-2.5">
          <p
            className={cn(
              'font-display text-[0.9375rem] leading-snug font-medium break-words',
              completed && 'text-muted line-through',
            )}
          >
            {t.title}
          </p>
          <p className="text-muted mt-1 text-xs leading-6">
            {due && !t.isDone && (
              <span className="mr-2">
                {urgent ? (
                  <Pill
                    tone={t.late ? 'crit' : 'warn'}
                    icon={t.late ? <CircleAlert aria-hidden="true" className="size-3" /> : null}
                  >
                    {due}
                    {t.late && <span className="sr-only"> (überfällig)</span>}
                  </Pill>
                ) : (
                  <span className="text-fg">{due}</span>
                )}
              </span>
            )}
            {conflict && (
              <span title={conflict.reason} className="mr-2">
                <Pill tone="crit">{conflict.label}</Pill>
              </span>
            )}
            {/* Trenner hängt am vorigen Wort (geschütztes Leerzeichen): kein „·“ am Zeilenanfang. */}
            {meta.map((m, i) => (
              <Fragment key={m.key}>
                {m.node}
                {i < meta.length - 1 && '\u00a0· '}
              </Fragment>
            ))}
          </p>
        </div>
        {!t.isDone ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNote(t)}
            disabled={!online}
            aria-label={`Notiz zu ${t.id} ergänzen`}
            title={online ? 'Notiz ergänzen' : OFFLINE_HINT}
            className="text-muted hover:text-fg"
          >
            <NotebookPen aria-hidden="true" />
          </Button>
        ) : (
          <span />
        )}
      </div>

      {(t.waitingFor || showBei || t.nextStep || t.note) && (
        <dl className="mt-2.5 space-y-1 pr-3 pl-11">
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

      {(t.id || t.source || isSafeLink(t.link) || t.isDone || t.doneOn || t.touched) && (
        <p className="text-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-0 pr-3 pl-11 text-xs">
          {t.id && <span className="font-mono">{t.id}</span>}
          {t.source && <span>{t.source}</span>}
          {isSafeLink(t.link) && (
            <a
              href={t.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent -my-3 inline-flex min-h-11 items-center gap-1 font-bold underline-offset-2 hover:underline"
            >
              öffnen
              <ExternalLink className="size-3" aria-hidden="true" />
              <span className="sr-only">(neuer Tab)</span>
            </a>
          )}
          {(t.isDone || t.doneOn) && (
            <span>
              {t.status === 'verworfen' ? 'verworfen' : 'erledigt'}
              {t.doneOn ? ` ${t.doneOn}` : ''}
            </span>
          )}
          {t.touched && <span>bearbeitet {formatShort(t.touched, today)}</span>}
        </p>
      )}

      {pending && (
        <p role="status" className="text-accent mt-2 flex items-center gap-2 pl-11 text-sm">
          <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          Speichert …
        </p>
      )}
    </article>
  );
}
