import { createContext, useContext } from 'react';

export type AuthStatus = 'signed_out' | 'signing_in' | 'signed_in';

export interface AuthState {
  status: AuthStatus;
  /** E-Mail der angemeldeten Person (nur im Speicher). */
  email: string | null;
  /** Deutsche Fehlermeldung der letzten Anmeldung. */
  error: string | null;
  /** True im Demo-Modus: keine Google-Aufrufe, Abmelden nicht möglich. */
  isDemo: boolean;
  /** True, wenn VITE_GOOGLE_CLIENT_ID fehlt: Anmeldung ist dann nicht möglich. */
  setupMissing?: boolean;
  /** Lädt das Google-Skript vor, damit der Klick auf „Mit Google anmelden“ direkt den Popup öffnet. */
  preload: () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Gültiges Token. `forceRefresh` nach 401. */
  getToken: (forceRefresh?: boolean) => Promise<string>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth braucht AuthProvider');
  return ctx;
}
