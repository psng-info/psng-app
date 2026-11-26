import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthState } from '@/auth/useAuth';
import { AdapterProvider } from '@/data/AdapterContext';
import { DemoAdapter } from '@/data/sheets/DemoAdapter';
import { SheetsError } from '@/data/sheets/SheetsAdapter';
import { CurrentUserContext } from '@/features/access/CurrentUser';
import { TodosView } from './TodosView';

const auth: AuthState = {
  status: 'signed_in',
  email: 'demo@example.org',
  error: null,
  isDemo: true,
  preload: () => undefined,
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
  getToken: () => Promise.resolve('t'),
};

function setup(param?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = { email: 'demo@example.org', name: 'Demo', roles: new Set(['kern' as const]) };
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <AdapterProvider>
          <CurrentUserContext.Provider value={{ user, team: [{ ...user }] }}>
            <TodosView {...(param ? { param } : {})} />
          </CurrentUserContext.Provider>
        </AdapterProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return {
    click: (el: HTMLElement) => {
      fireEvent.click(el);
      return Promise.resolve();
    },
    type: (el: HTMLElement, text: string) => {
      fireEvent.change(el, { target: { value: text } });
      return Promise.resolve();
    },
    clear: (el: HTMLElement) => {
      fireEvent.change(el, { target: { value: '' } });
      return Promise.resolve();
    },
    selectOptions: (el: HTMLElement, value: string) => {
      fireEvent.change(el, { target: { value } });
      return Promise.resolve();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 26, 10));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TodosView', () => {
  it('zeigt Lage, Ziele und Spalten; Kachel filtert und lässt sich abwählen', async () => {
    const user = setup();
    const tile = await screen.findByRole('button', { name: /Überfällig/ });
    expect(tile).toHaveTextContent('2');
    expect(screen.getByRole('img', { name: 'Onboarding: 5 von 12 erledigt' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Liste/ })).toHaveTextContent('24');

    await user.click(tile);
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: /Liste/ })).toHaveTextContent('2');
    expect(
      screen.getByRole('button', { name: 'Filter entfernen: Kachel: Überfällig' }),
    ).toBeInTheDocument();

    await user.click(tile);
    expect(screen.getByRole('heading', { name: /Liste/ })).toHaveTextContent('24');
  });

  it('#/todos/<id>: sucht die ID, zeigt Erledigte und hebt das To-do hervor', async () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    setup('T116');
    const card = await screen.findByRole('article', { name: /T116/ });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('searchbox', { name: 'Suche' })).toHaveValue('T116');
    expect(screen.getByLabelText('Erledigte anzeigen')).toBeChecked();
    await waitFor(() => expect(card).toHaveFocus());
    expect(card.className).toContain('ring-2');
  });

  it('Suche und Erledigte anzeigen', async () => {
    const user = setup();
    await screen.findByRole('heading', { name: /Liste/ });
    await user.type(screen.getByRole('searchbox', { name: 'Suche' }), 'Marquardt');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await user.clear(screen.getByRole('searchbox', { name: 'Suche' }));
    await user.click(screen.getByLabelText('Erledigte anzeigen'));
    expect(screen.getAllByRole('article').length).toBeGreaterThan(24);
  });

  it('Abhaken schreibt ins Demo-Sheet und blendet das To-do danach aus', async () => {
    const user = setup();
    const cell = vi.spyOn(DemoAdapter.prototype, 'updateCell');
    const box = await screen.findByRole('checkbox', {
      name: /Als erledigt markieren: Heute fälliges/,
    });
    await user.click(box);
    await waitFor(() => expect(cell).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.queryByRole('article', { name: /T116/ })).toBeNull());
  });

  it('Fehler beim Abhaken: Rollback und Meldung ohne Zellinhalt', async () => {
    const user = setup();
    vi.spyOn(DemoAdapter.prototype, 'updateCell').mockRejectedValue(
      new SheetsError(
        'row_missing',
        'Zeile für T116 nicht gefunden. Neu laden und nochmal versuchen.',
      ),
    );
    await user.click(
      await screen.findByRole('checkbox', { name: /Als erledigt markieren: Heute fälliges/ }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Zeile für T116 nicht gefunden');
    expect(await screen.findByRole('article', { name: /T116/ })).toBeInTheDocument();
  });

  it('Neues To-do: Validierung (Prio A braucht Deadline), dann anlegen', async () => {
    const user = setup();
    const append = vi.spyOn(DemoAdapter.prototype, 'append');
    await user.click(await screen.findByRole('button', { name: 'Neues To-do' }));
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: 'Anlegen' }));
    expect(within(sheet).getByText('Bitte beschreiben, was zu tun ist.')).toBeInTheDocument();

    await user.type(within(sheet).getByLabelText('To-do'), 'Poster drucken');
    await user.selectOptions(within(sheet).getByLabelText('Prio'), 'A');
    await user.click(within(sheet).getByRole('button', { name: 'Anlegen' }));
    expect(within(sheet).getByText('Prio A braucht eine Deadline.')).toBeInTheDocument();
    expect(append).not.toHaveBeenCalled();

    await user.selectOptions(within(sheet).getByLabelText('Prio'), 'B');
    await user.click(within(sheet).getByRole('button', { name: 'Anlegen' }));
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    const row = append.mock.calls[0]?.[2] as string[];
    expect(row[0]).toBe('T118');
    expect(row[1]).toBe('Poster drucken');
  });
});
