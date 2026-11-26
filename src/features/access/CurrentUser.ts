import { createContext, useContext } from 'react';
import type { AccessEntry, Role } from '@/data/repos/access';

export interface CurrentUser {
  email: string;
  name: string;
  roles: Set<Role>;
}

export interface AccessInfo {
  user: CurrentUser;
  /** Alle Personen der Zugangsliste (Teamnamen für Owner-Auswahl). */
  team: AccessEntry[];
}

export const CurrentUserContext = createContext<AccessInfo | null>(null);

function useAccessInfo(): AccessInfo {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser braucht AccessGate');
  return ctx;
}

/** Angemeldete Person aus der Zugangsliste. Nur innerhalb von AccessGate. */
export function useCurrentUser(): CurrentUser {
  return useAccessInfo().user;
}

/** Teamliste aus dem Tab Zugang. */
export function useTeam(): AccessEntry[] {
  return useAccessInfo().team;
}

export function useHasRole(role: Role): boolean {
  return useCurrentUser().roles.has(role);
}
