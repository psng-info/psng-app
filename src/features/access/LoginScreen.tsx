import { useEffect } from 'react';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/ui/shadcn/button';

/** Erste Seite im Sheets-Modus. Vor dem Login wird kein Sheet gelesen. */
export function LoginScreen({ notice }: { notice?: string | null }) {
  const { status, error, signIn, preload } = useAuth();
  const busy = status === 'signing_in';
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
        {message && (
          <p role="alert" className="text-crit bg-crit-soft mt-4 rounded-md px-3 py-2 text-sm">
            {message}
          </p>
        )}
        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          onClick={() => void signIn()}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Anmeldung läuft …' : 'Mit Google anmelden'}
        </Button>
      </section>
    </main>
  );
}
