import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { DATA_MODE, GOOGLE_CLIENT_ID } from '@/data/config';
import { clearAllLocalData } from '@/data/clearLocal';
import { DEMO_EMAIL } from '@/data/sheets/DemoAdapter';
import { AuthError, fetchUserEmail, GoogleSession } from './google';
import { AuthContext, type AuthState, type AuthStatus } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  return DATA_MODE === 'demo' ? (
    <DemoAuth>{children}</DemoAuth>
  ) : (
    <GoogleAuth>{children}</GoogleAuth>
  );
}

function DemoAuth({ children }: { children: ReactNode }) {
  const value = useMemo<AuthState>(
    () => ({
      status: 'signed_in',
      email: DEMO_EMAIL,
      error: null,
      isDemo: true,
      preload: () => undefined,
      signIn: () => Promise.resolve(),
      signOut: () => Promise.resolve(),
      getToken: () => Promise.resolve('demo'),
    }),
    [],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function GoogleAuth({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session] = useState(() => (GOOGLE_CLIENT_ID ? new GoogleSession(GOOGLE_CLIENT_ID) : null));
  const [status, setStatus] = useState<AuthStatus>('signed_out');
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preload = useCallback(() => {
    session?.prepare().catch(() => undefined);
  }, [session]);

  // Letzte angemeldete E-Mail (nur im Speicher), um einen Kontowechsel zu erkennen.
  const lastEmail = useRef<string | null>(null);

  const signIn = useCallback(async () => {
    if (!session) return;
    setError(null);
    setStatus('signing_in');
    try {
      const token = await session.signIn();
      let next: string;
      try {
        next = await fetchUserEmail(token);
      } catch (e) {
        // Ohne E-Mail keine Zugangsprüfung: das Token nicht im Speicher liegen lassen.
        await session.revoke();
        throw e;
      }
      if (lastEmail.current !== null && lastEmail.current !== next) {
        // Anderes Konto als vorher (z. B. nach Ablauf neu angemeldet): nichts vom alten Konto behalten.
        queryClient.clear();
        await clearAllLocalData();
      } else {
        // Gleiches Konto: alte Fehler (z. B. „Anmeldung abgelaufen“ in der Zugangsprüfung) verwerfen
        // und alles mit dem neuen Token frisch laden. Ohne das bliebe die Anmeldeseite stehen.
        queryClient.removeQueries({ queryKey: ['access'] });
        void queryClient.invalidateQueries();
      }
      lastEmail.current = next;
      setEmail(next);
      setStatus('signed_in');
    } catch (e) {
      setStatus('signed_out');
      setError(e instanceof AuthError ? e.message : 'Anmeldung fehlgeschlagen.');
    }
  }, [session, queryClient]);

  const signOut = useCallback(async () => {
    await session?.revoke();
    queryClient.clear();
    await clearAllLocalData();
    lastEmail.current = null;
    setEmail(null);
    setError(null);
    setStatus('signed_out');
  }, [session, queryClient]);

  const getToken = useCallback(
    (force?: boolean) => {
      if (!session) return Promise.reject(new AuthError('failed', 'Nicht angemeldet.'));
      return session.getToken(force);
    },
    [session],
  );

  const value = useMemo<AuthState>(
    () => ({
      status,
      email,
      error,
      isDemo: false,
      setupMissing: !GOOGLE_CLIENT_ID,
      preload,
      signIn,
      signOut,
      getToken,
    }),
    [status, email, error, preload, signIn, signOut, getToken],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
