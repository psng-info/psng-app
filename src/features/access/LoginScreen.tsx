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
        className="bg-surface border-line w-full max-w-sm rounded-2xl border px-6 pt-8 pb-6 text-center shadow-[0_12px_32px_-16px_var(--glow)]"
      >
        <span className="border-line bg-surface mx-auto flex size-20 items-center justify-center overflow-hidden rounded-full border">
          <img src="/psng-logo.png" alt="PSNG Logo" width={72} height={72} className="size-18" />
        </span>
        <h1 id="login-title" className="font-display mt-5 text-2xl font-semibold tracking-tight">
          PSNG <span className="text-accent">Orga</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">Psychedelic Student Network Germany</p>
        <p className="border-line mt-5 border-t pt-5 text-[0.9375rem] leading-relaxed">
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
