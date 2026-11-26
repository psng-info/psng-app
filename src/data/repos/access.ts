import { useQuery } from '@tanstack/react-query';
import { col, rowsOf, type Values } from '@/domain/rows';
import { RANGES, SHEET_IDS, STALE_MS } from '../config';
import { useSheets } from '../AdapterContext';
import { SheetsError } from '../sheets/SheetsAdapter';
import { requireColumns } from '../sheets/table';

export type Role = 'kern' | 'hr' | 'admin';
const ROLES: readonly Role[] = ['kern', 'hr', 'admin'];

export interface AccessEntry {
  email: string;
  name: string;
  roles: Set<Role>;
}

export const normEmail = (e: string): string => e.trim().toLowerCase();

/**
 * Tab Zugang: E-Mail, Name, Rollen (kommagetrennt). Unbekannte Rollen werden ignoriert.
 * Wer auf der Liste steht, aber keine gültige Rolle hat, bekommt `kern` (die Liste selbst ist die Freigabe).
 */
export function parseAccess(values: Values): AccessEntry[] {
  requireColumns(values, ['E-Mail', 'Name', 'Rollen'], 'Zugang');
  const out: AccessEntry[] = [];
  for (const row of rowsOf(values)) {
    const email = normEmail(col(row, 'E-Mail'));
    if (!email.includes('@')) continue;
    const roles = new Set<Role>();
    for (const part of col(row, 'Rollen')
      .toLowerCase()
      .split(/[\s,;]+/)) {
      const role = ROLES.find((r) => r === part);
      if (role) roles.add(role);
    }
    if (roles.size === 0) roles.add('kern');
    out.push({ email, name: col(row, 'Name') || email.split('@')[0] || email, roles });
  }
  return out;
}

export function findAccess(list: AccessEntry[], email: string): AccessEntry | undefined {
  const wanted = normEmail(email);
  return list.find((e) => e.email === wanted);
}

/** Zugangsliste aus dem Lecture-Sheet. Erst laden, wenn angemeldet. */
export function useAccessList(email: string | null) {
  const sheets = useSheets();
  return useQuery({
    queryKey: ['access', email],
    enabled: email !== null,
    staleTime: STALE_MS.access,
    retry: (count, err) => count < 1 && !(err instanceof SheetsError),
    queryFn: async () => {
      const [values] = await sheets.batchGet(SHEET_IDS.lectures, [RANGES.access]);
      return parseAccess(values ?? []);
    },
  });
}
