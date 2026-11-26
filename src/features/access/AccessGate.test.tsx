import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdapterProvider } from '@/data/AdapterContext';
import { DemoAdapter } from '@/data/sheets/DemoAdapter';
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

function renderGate(state: AuthState) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
});
