import { useEffect } from 'react';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/ui/shadcn/button';

/** Erste Seite im Sheets-Modus. Vor dem Login wird kein Sheet gelesen. */
export function LoginScreen({ notice }: { notice?: string | null }) {
  const { status, error, signIn, preload, setupMissing } = useAuth();
  const busy = status === 'signing_in';
  const missingId = setupMissing === true;
  const message = notice ?? error;

  useEffect(() => {
    preload();
  }, [preload]);

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <section
        aria-labelledby="login-title"
        className="bg-surface border-line w-full max-w-sm rounded-lg border p-6 text-center shadow-sm"
      >
        <img
          src="/psng-logo.png"
          alt="PSNG Logo"
          width={72}
          height={72}
          className="mx-auto size-18"
        />
        <h1 id="login-title" className="font-display mt-4 text-2xl font-semibold">
          PSNG Orga
        </h1>
        <p className="text-muted mt-2">
          Für das Kernteam des PSNG. Melde dich mit dem Google-Konto an, mit dem du die PSNG-Sheets
          nutzt.
        </p>
        {missingId && (
          <div
            role="alert"
            className="text-crit bg-crit-soft mt-4 rounded-md px-3 py-2 text-left text-sm"
          >
            {import.meta.env.DEV ? (
              <>
                <p className="font-medium">Einrichtung fehlt: Google Client ID.</p>
                <p className="mt-1">
                  Lege in <code className="font-mono">.env.local</code> die Zeile{' '}
                  <code className="font-mono">VITE_GOOGLE_CLIENT_ID=…</code> an und starte den
                  Server neu. Ohne Login geht <code className="font-mono">npm run dev:demo</code>.
                  Die Schritte stehen im README unter „Google-Login einrichten“.
                </p>
              </>
            ) : (
              <p className="font-medium">Anmeldung gerade nicht möglich.</p>
            )}
          </div>
        )}
        {message && !missingId && (
          <p role="alert" className="text-crit bg-crit-soft mt-4 rounded-md px-3 py-2 text-sm">
            {message}
          </p>
        )}
        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          onClick={() => void signIn()}
          disabled={busy || missingId}
          aria-busy={busy}
        >
          {busy ? 'Anmeldung läuft …' : 'Mit Google anmelden'}
        </Button>
      </section>
    </main>
  );
}
