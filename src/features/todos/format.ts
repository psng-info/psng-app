import { formatShort } from '@/domain/dates';
import type { ConflictFn, Todo } from '@/domain/todos';

/** „31.12. · in 35 T.“, „20.11. · 6 T. drüber“, „26.11. · heute“. */
export function dueLabel(t: Todo, today: Date): string {
  if (!t.deadline || t.dd === null) return '';
  const rel = t.dd === 0 ? 'heute' : t.dd > 0 ? `in ${t.dd} T.` : `${-t.dd} T. drüber`;
  return `${formatShort(t.deadline, today)} · ${rel}`;
}

/** Nur https-Links werden Links, alles andere bleibt Text. */
export const isSafeLink = (s: string): boolean => /^https:\/\//.test(s);

export type { ConflictFn };
