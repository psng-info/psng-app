import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '@/auth/AuthProvider';
import { AdapterProvider } from '@/data/AdapterContext';
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
});
