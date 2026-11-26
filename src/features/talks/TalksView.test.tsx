import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth/AuthProvider';
import { AdapterProvider } from '@/data/AdapterContext';
import { DemoAdapter } from '@/data/sheets/DemoAdapter';
import { AccessGate } from '@/features/access/AccessGate';
import { TalksView } from './TalksView';

const TODAY = new Date(2026, 10, 26);

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <AdapterProvider>
          <AccessGate>
            <TalksView today={TODAY} />
          </AccessGate>
        </AdapterProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('TalksView (Demo-Daten)', () => {
  it('zeigt Hero, Kachel-Filter und klappt Karten auf', async () => {
    setup();

    const hero = await screen.findByRole('article', { name: 'Nächster Talk' });
    expect(within(hero).getByText('in 4 Tagen')).toBeInTheDocument();
    expect(within(hero).getByText(/Zwei Perspektiven/)).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 3, name: /^Talks/ });
    const list = heading.closest('section') as HTMLElement;
    expect(heading).toHaveTextContent('(12)');

    const tile = screen.getByRole('button', { name: /Anstehend/ });
    fireEvent.click(tile);
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    expect(heading).toHaveTextContent('(4 von 12)');
    expect(screen.getByRole('button', { name: /Filter entfernen: Kachel/ })).toBeInTheDocument();

    // Der nächste Talk ist offen, ein weiterer lässt sich per Klick öffnen
    const summaries = within(list).getAllByText(/Breathing and Body/);
    const details = summaries[0]?.closest('details');
    expect(details).not.toHaveAttribute('open');
    fireEvent.click(summaries[0] as HTMLElement);
    expect(details).toHaveAttribute('open');
    expect(within(details as HTMLElement).getByText(/^Ablauf/)).toBeVisible();
    expect(
      within(details as HTMLElement).getByRole('button', { name: /Kontakt anzeigen/ }),
    ).toBeInTheDocument();
    expect(within(details as HTMLElement).queryByText(/@/)).not.toBeInTheDocument();
  });

  it('schreibt: Owner eines Schritts ändern und einen Schritt abhaken', async () => {
    const append = vi.spyOn(DemoAdapter.prototype, 'append');
    setup();
    await screen.findByRole('article', { name: 'Nächster Talk' });

    const edit = await screen.findByRole('button', {
      name: /^Raum bzw\. Zoom organisiert bearbeiten/,
    });
    fireEvent.click(edit);
    const sheet = await screen.findByRole('dialog');
    const save = within(sheet).getByRole('button', { name: 'Speichern' });
    expect(save).toBeDisabled();
    fireEvent.change(within(sheet).getByLabelText('Owner'), { target: { value: 'Lokale Orga' } });
    fireEvent.click(save);

    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    const row = append.mock.calls[0]?.[2] as string[];
    expect(row.slice(2)).toEqual(['Raum/Zoom', '', 'Lokale Orga', 'Demo', '']);
    expect(
      await screen.findByRole('button', {
        name: 'Raum bzw. Zoom organisiert bearbeiten, Owner: Lokale Orga',
      }),
    ).toBeInTheDocument();

    const box = screen.getAllByRole('checkbox', { name: /^Als erledigt markieren:/ })[0];
    if (!box) throw new Error('kein offener Schritt');
    fireEvent.click(box);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(2));
    expect((append.mock.calls[1]?.[2] as string[])[3]).toBe('erledigt');
  });
});
