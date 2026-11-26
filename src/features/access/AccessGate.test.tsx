import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdapterProvider } from '@/data/AdapterContext';
import { DemoAdapter } from '@/data/sheets/DemoAdapter';
import { SheetsError } from '@/data/sheets/SheetsAdapter';
import { AuthContext, type AuthState } from '@/auth/useAuth';
import { AuthProvider } from '@/auth/AuthProvider';
import { AccessGate } from './AccessGate';
import { useCurrentUser } from './CurrentUser';

function auth(over: Partial<AuthState>): AuthState {
  return {
    status: 'signed_out',
    email: null,
    error: null,
    isDemo: false,
    preload: () => undefined,
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
    getToken: () => Promise.resolve('t'),
    ...over,
  };
}

function Who() {
  const u = useCurrentUser();
  return <p>Hallo {u.name}</p>;
}

function renderGate(
  state: AuthState,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={state}>
        <AdapterProvider>
          <AccessGate>
            <Who />
          </AccessGate>
        </AdapterProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('AccessGate', () => {
  it('zeigt vor dem Login die Anmeldeseite und liest kein Sheet', () => {
    const spy = vi.spyOn(DemoAdapter.prototype, 'batchGet');
    renderGate(auth({ status: 'signed_out' }));
    expect(screen.getByRole('heading', { name: 'PSNG Orga' })).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Mit Google anmelden' });
    expect(btn).toBeEnabled();
    expect(spy).not.toHaveBeenCalled();
  });

  it('zeigt bei fehlender Client ID einen Einrichtungshinweis (Dev) und sperrt den Knopf', () => {
    renderGate(auth({ setupMissing: true }));
    expect(screen.getByRole('alert')).toHaveTextContent('Einrichtung fehlt: Google Client ID');
    expect(screen.getByRole('button', { name: 'Mit Google anmelden' })).toBeDisabled();
  });

  it('zeigt Anmeldefehler auf Deutsch', () => {
    renderGate(auth({ error: 'Anmeldung abgebrochen.' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Anmeldung abgebrochen.');
  });

  it('Person auf der Liste: App wird gerendert', async () => {
    renderGate(auth({ status: 'signed_in', email: 'DEMO@example.org ' }));
    expect(await screen.findByText('Hallo Demo')).toBeInTheDocument();
  });

  it('Person nicht auf der Liste: Kein Zugang mit E-Mail und Abmelden', async () => {
    renderGate(auth({ status: 'signed_in', email: 'fremd@example.org' }));
    expect(await screen.findByRole('heading', { name: 'Kein Zugang' })).toBeInTheDocument();
    expect(screen.getByText('fremd@example.org')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeInTheDocument();
  });

  it('Demo-Modus: durchgereicht ohne Login', async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <AdapterProvider>
            <AccessGate>
              <Who />
            </AccessGate>
          </AdapterProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Hallo Demo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mit Google anmelden' })).not.toBeInTheDocument();
  });

  /** Zugangsliste schon im Cache (z. B. aus dem Lesecache), aber veraltet: wird beim Öffnen neu gelesen. */
  function cachedClient() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(
      ['access', 'demo@example.org'],
      [{ email: 'demo@example.org', name: 'Demo', roles: new Set(['kern']) }],
      { updatedAt: 0 },
    );
    return client;
  }

  it('Neuladen scheitert am Netz, Liste ist bekannt: App läuft weiter', async () => {
    const spy = vi
      .spyOn(DemoAdapter.prototype, 'batchGet')
      .mockRejectedValue(new SheetsError('network', 'Keine Verbindung zu Google.'));
    renderGate(auth({ status: 'signed_in', email: 'demo@example.org' }), cachedClient());
    expect(await screen.findByText('Hallo Demo')).toBeInTheDocument();
    await waitFor(() => expect(spy).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('Hallo Demo')).toBeInTheDocument();
  });

  it('Freigabe entzogen: sperrt auch mit bekannter Liste', async () => {
    vi.spyOn(DemoAdapter.prototype, 'batchGet').mockRejectedValue(
      new SheetsError('forbidden', 'Keine Berechtigung.'),
    );
    renderGate(auth({ status: 'signed_in', email: 'demo@example.org' }), cachedClient());
    expect(await screen.findByRole('heading', { name: 'Keine Freigabe' })).toBeInTheDocument();
  });
});
