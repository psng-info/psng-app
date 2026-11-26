import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

// Sheets-Modus mit Client ID, Google selbst ist ersetzt: kein Netz, kein Popup.
vi.mock('@/data/config', async (orig) => ({
  ...(await orig<typeof import('@/data/config')>()),
  DATA_MODE: 'sheets',
  GOOGLE_CLIENT_ID: 'test-client',
}));
vi.mock('@/data/clearLocal', () => ({ clearAllLocalData: vi.fn(() => Promise.resolve()) }));

const google = vi.hoisted(() => ({
  emails: [] as (string | Error)[],
  revoke: vi.fn(() => Promise.resolve()),
}));
vi.mock('./google', async (orig) => {
  const real = await orig<typeof import('./google')>();
  class FakeSession {
    prepare = () => Promise.resolve();
    signIn = () => Promise.resolve('token');
    getToken = () => Promise.resolve('token');
    revoke = google.revoke;
    hasToken = () => true;
  }
  return {
    ...real,
    GoogleSession: FakeSession,
    fetchUserEmail: () => {
      const next = google.emails.shift();
      return next instanceof Error
        ? Promise.reject(next)
        : Promise.resolve(next ?? 'a@example.org');
    },
  };
});

function Probe() {
  const auth = useAuth();
  return (
    <>
      <p>
        {auth.status} {auth.email ?? '-'} {auth.error ?? ''}
      </p>
      <button type="button" onClick={() => void auth.signIn()}>
        anmelden
      </button>
    </>
  );
}

function setup() {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  const signIn = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'anmelden' }));
    await waitFor(() => expect(screen.queryByText(/signing_in/)).not.toBeInTheDocument());
  };
  return { client, signIn };
}

beforeEach(() => {
  google.emails = [];
  google.revoke.mockClear();
});

describe('GoogleAuth', () => {
  it('neu anmelden nach Fehler: alte Zugangsprüfung wird verworfen, nicht stehen gelassen', async () => {
    const { client, signIn } = setup();
    await signIn();
    // Zugangsprüfung ist gescheitert (Token abgelaufen) …
    client
      .getQueryCache()
      .build(client, { queryKey: ['access', 'a@example.org'] })
      .setState({
        status: 'error',
        error: new Error('Anmeldung abgelaufen'),
      });
    // … dieselbe Person meldet sich neu an
    await signIn();
    expect(client.getQueryState(['access', 'a@example.org'])).toBeUndefined();
    expect(screen.getByText(/signed_in a@example.org/)).toBeInTheDocument();
  });

  it('Kontowechsel: Daten des vorherigen Kontos werden gelöscht', async () => {
    google.emails = ['a@example.org', 'b@example.org'];
    const { client, signIn } = setup();
    await signIn();
    client.setQueryData(['todos'], [['ID'], ['T01']]);
    await signIn();
    expect(client.getQueryData(['todos'])).toBeUndefined();
    expect(screen.getByText(/signed_in b@example.org/)).toBeInTheDocument();
  });

  it('E-Mail nicht lesbar: Token wird verworfen, Fehler auf Deutsch', async () => {
    const { AuthError } = await import('./google');
    google.emails = [new AuthError('failed', 'Die E-Mail-Adresse konnte nicht gelesen werden.')];
    const { signIn } = setup();
    await signIn();
    expect(google.revoke).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/signed_out - Die E-Mail-Adresse/)).toBeInTheDocument();
  });
});
