import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
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
  const [error, setError] = useState<string | null>(
    GOOGLE_CLIENT_ID ? null : 'Die Google Client ID fehlt (VITE_GOOGLE_CLIENT_ID). Siehe README.',
  );

  const preload = useCallback(() => {
    session?.prepare().catch(() => undefined);
  }, [session]);

  const signIn = useCallback(async () => {
    if (!session) return;
    setError(null);
    setStatus('signing_in');
    try {
      const token = await session.signIn();
      setEmail(await fetchUserEmail(token));
      setStatus('signed_in');
    } catch (e) {
      setStatus('signed_out');
      setError(e instanceof AuthError ? e.message : 'Anmeldung fehlgeschlagen.');
    }
  }, [session]);

  const signOut = useCallback(async () => {
    await session?.revoke();
    queryClient.clear();
    await clearAllLocalData();
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
    () => ({ status, email, error, isDemo: false, preload, signIn, signOut, getToken }),
    [status, email, error, preload, signIn, signOut, getToken],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
