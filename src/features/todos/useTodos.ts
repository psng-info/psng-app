import { useMemo } from 'react';
import { useTodosData } from '@/data/repos/todos';
import { formatDate, startOfDay } from '@/domain/dates';
import { parseTodos } from '@/domain/todos';

/** Heute als lokale Mitternacht. Ändert sich nur, wenn der Tag wechselt. */
export function useToday(): Date {
  const key = formatDate(new Date());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => startOfDay(new Date()), [key]);
}

/** To-dos aus dem Sheet, geparst. Die Abfrage bleibt sichtbar (isPending, error, refetch). */
export function useTodos() {
  const query = useTodosData();
  const today = useToday();
  const todos = useMemo(() => parseTodos(query.data, today), [query.data, today]);
  return { ...query, todos, today };
}
