import { useMemo, type ReactNode } from 'react';
import { useAuth } from '@/auth/useAuth';
import { findAccess, useAccessList } from '@/data/repos/access';
import { SheetsError } from '@/data/sheets/SheetsAdapter';
import { Button } from '@/ui/shadcn/button';
import { CurrentUserContext, type AccessInfo } from './CurrentUser';
import { LoginScreen } from './LoginScreen';

/** Zeigt Anmeldung, Hinweise oder (bei Zugang) die App. Vor dem Login wird nichts gelesen. */
export function AccessGate({ children }: { children: ReactNode }) {
  const { status, email, signOut } = useAuth();
  const signedIn = status === 'signed_in' && email !== null;
  const access = useAccessList(signedIn ? email : null);

  const info = useMemo<AccessInfo | null>(() => {
    if (!signedIn || !access.data) return null;
    const entry = findAccess(access.data, email);
    return entry ? { user: entry, team: access.data } : null;
  }, [signedIn, email, access.data]);

  if (!signedIn) return <LoginScreen />;

  if (access.isPending) {
    return (
      <Message title="Zugang wird geprüft" busy>
        Einen Moment.
      </Message>
    );
  }

  if (access.isError) {
    const err = access.error;
    if (err instanceof SheetsError && err.kind === 'unauthenticated') {
      return <LoginScreen notice={err.message} />;
    }
    const forbidden = err instanceof SheetsError && err.kind === 'forbidden';
    return (
      <Message title={forbidden ? 'Keine Freigabe' : 'Zugang konnte nicht geprüft werden'}>
        <p>
          {forbidden
            ? 'Keine Freigabe für das Lecture-Sheet. Frag Lennert oder jemanden mit Admin-Rolle, ob du in Google Drive Zugriff bekommst.'
            : err.message}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {!forbidden && (
            <Button type="button" onClick={() => void access.refetch()}>
              Erneut versuchen
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Abmelden
          </Button>
        </div>
      </Message>
    );
  }

  if (!info) {
    return (
      <Message title="Kein Zugang">
        <p>
          Angemeldet als <strong className="break-all">{email}</strong>.
        </p>
        <p className="mt-2">
          Frag Lennert oder jemanden mit Admin-Rolle, ob du in den Tab Zugang eingetragen wirst.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          onClick={() => void signOut()}
        >
          Abmelden
        </Button>
      </Message>
    );
  }

  return <CurrentUserContext.Provider value={info}>{children}</CurrentUserContext.Provider>;
}

function Message({
  title,
  busy = false,
  children,
}: {
  title: string;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <section
        aria-labelledby="gate-title"
        aria-busy={busy}
        role={busy ? 'status' : undefined}
        className="bg-surface border-line w-full max-w-sm rounded-lg border p-6 text-center shadow-sm"
      >
        <img src="/psng-logo.png" alt="" width={56} height={56} className="mx-auto size-14" />
        <h1 id="gate-title" className="font-display mt-4 text-xl font-semibold">
          {title}
        </h1>
        <div className="text-muted mt-2">{children}</div>
      </section>
    </main>
  );
}
