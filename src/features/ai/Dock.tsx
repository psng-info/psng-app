import { useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { AiError, requestPlan } from '@/data/ai';
import { HR_QUERY_KEY } from '@/data/repos/hr';
import { TALKS_KEY, type TalksData } from '@/data/repos/talks';
import { useCreateTodo, useTodosData, useUpdateTodo } from '@/data/repos/todos';
import { useUpdateCandidate } from '@/data/repos/hr';
import { useLogStep, useUpdateLecture } from '@/data/repos/talks';
import { buildPreview, type Lookup, type PreviewItem } from '@/domain/ai/preview';
import { buildRequest, type RequestData } from '@/domain/ai/request';
import { emptyPlan, type AiMode, type AiPlan } from '@/domain/ai/plan';
import { queueSummary } from '@/domain/ai/queue';
import { buildPeople, type HrRaw } from '@/domain/hr';
import { buildTalksModel } from '@/domain/talks/model';
import { parseTodos } from '@/domain/todos';
import { useCurrentUser, useHasRole } from '@/features/access/CurrentUser';
import { useToday } from '@/features/todos/useTodos';
import { Button } from '@/ui/shadcn/button';
import { useAi } from './AiContext';
import { PreviewSheet } from './PreviewSheet';

/** Leiste unten („N vorgemerkt · Mit Claude verarbeiten“). Nur mit `VITE_AI=on` und nur wenn etwas vorgemerkt ist. */
export function AiDock() {
  const ai = useAi();
  if (!ai.enabled) return null;
  return <DockBar />;
}

const errText = (e: unknown): string =>
  e instanceof AiError || (e instanceof Error && e.name === 'SheetsError')
    ? e.message
    : 'Das hat nicht geklappt. Später nochmal versuchen.';

function DockBar() {
  const ai = useAi();
  const qc = useQueryClient();
  const { getToken } = useAuth();
  const user = useCurrentUser();
  const isHr = useHasRole('hr');
  const today = useToday();
  const todosRaw = useTodosData();

  const updateTodo = useUpdateTodo();
  const createTodo = useCreateTodo();
  const updateCandidate = useUpdateCandidate();
  const updateLecture = useUpdateLecture();
  const logStep = useLogStep();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [thorough, setThorough] = useState(false);
  const [plan, setPlan] = useState<AiPlan>(emptyPlan());
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const data = useMemo<RequestData>(() => {
    const talks = qc.getQueryData<TalksData>(TALKS_KEY);
    const hr = isHr ? qc.getQueryData<HrRaw>(HR_QUERY_KEY) : undefined;
    return {
      todos: parseTodos(todosRaw.data, today),
      talks: talks ? buildTalksModel(talks, today).talks : [],
      people: hr ? buildPeople(hr, today) : [],
    };
    // Die Daten ändern sich mit den Abfragen; `open` stellt beim Öffnen einen frischen Stand sicher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, todosRaw.data, today, isHr, open, busy]);

  const lookup = useMemo<Lookup>(() => {
    const todos = new Map(data.todos.map((t) => [t.id, t]));
    const people = new Map(data.people.map((p) => [p.key, p]));
    const talks = new Map(data.talks.map((t) => [t.key, t]));
    return {
      todo: (id) => {
        const t = todos.get(id);
        return t ? { title: t.title, raw: { ...t.raw } } : undefined;
      },
      person: (key) => {
        const p = people.get(key);
        return p ? { name: p.name, k: p.k } : undefined;
      },
      talk: (key) => {
        const t = talks.get(key);
        return t ? { raw: { ...t.raw } } : undefined;
      },
    };
  }, [data]);

  async function run(nextExtras: string[], mode: AiMode, previous: AiPlan | null): Promise<void> {
    setBusy(true);
    setError('');
    setDone('');
    try {
      const req = buildRequest(ai.queue, data, { mode, today, extra: nextExtras, previous });
      const next = await requestPlan(req, getToken);
      setPlan(next);
      setExtras(nextExtras);
      setItems((old) => buildPreview(next, lookup, old));
      setOpen(true);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function write(): Promise<void> {
    const chosen = items.filter((i) => i.ok && !i.blocked);
    setWriting(true);
    setError('');
    let n = 0;
    try {
      for (const i of chosen) {
        switch (i.kind) {
          case 'todo':
            await updateTodo.mutateAsync({ id: i.todoId, set: i.set });
            break;
          case 'new':
            await createTodo.mutateAsync(i.fields);
            break;
          case 'hr':
            await updateCandidate.mutateAsync({ key: i.key, name: i.name, set: i.set });
            break;
          case 'talk':
            await updateLecture.mutateAsync({ key: i.talkKey, set: i.set });
            break;
          case 'step':
            await logStep.mutateAsync({
              talk: i.talkKey,
              step: i.step,
              status: i.status,
              owner: i.owner,
              note: i.note,
              by: user.name,
            });
            break;
        }
        n++;
      }
      ai.clear();
      setOpen(false);
      setItems([]);
      setExtras([]);
      setDone(`${n} ${n === 1 ? 'Änderung' : 'Änderungen'} ins Sheet geschrieben.`);
    } catch (e) {
      const ids = new Set(chosen.slice(0, n).map((i) => i.id));
      setItems((old) => old.filter((i) => !ids.has(i.id)));
      setError(`${errText(e)}${n ? ` ${n} Änderung(en) sind schon geschrieben.` : ''}`);
    } finally {
      setWriting(false);
    }
  }

  const close = (): void => {
    setOpen(false);
    setItems([]);
    setExtras([]);
  };

  if (ai.count === 0 && !open && !done && !error) return null;
  return (
    <>
      <div
        role="region"
        aria-label="Für Claude vorgemerkt"
        className="glass border-line fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t md:bottom-0"
      >
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-2 px-4 py-2">
          <p className="min-w-0 flex-1 text-sm" role="status">
            {ai.count > 0 ? (
              <>
                <b>{ai.count} vorgemerkt</b>
                <span className="text-muted"> · {queueSummary(ai.queue)}</span>
              </>
            ) : (
              done || error
            )}
            {ai.count > 0 && error && <span className="text-crit block">{error}</span>}
          </p>
          {ai.count > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={ai.clear} disabled={busy}>
                <X aria-hidden="true" />
                Leeren
              </Button>
              <Button
                size="sm"
                onClick={() => void run([], thorough ? 'thorough' : 'fast', null)}
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles aria-hidden="true" />
                )}
                {busy ? 'Claude denkt …' : 'Mit Claude verarbeiten'}
              </Button>
            </>
          )}
          {ai.count === 0 && (done || error) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDone('');
                setError('');
              }}
            >
              OK
            </Button>
          )}
        </div>
      </div>
      {open && (
        <PreviewSheet
          items={items}
          extras={extras}
          thorough={thorough}
          busy={busy}
          writing={writing}
          error={error}
          onToggle={(id, ok) => setItems((old) => old.map((i) => (i.id === id ? { ...i, ok } : i)))}
          onThorough={setThorough}
          onRedo={(extra) => void run([...extras, extra], thorough ? 'thorough' : 'fast', plan)}
          onWrite={() => void write()}
          onClose={close}
        />
      )}
    </>
  );
}
