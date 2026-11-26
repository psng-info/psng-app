import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '@/auth/AuthProvider';
import { AdapterProvider } from '@/data/AdapterContext';
import { TODAY, oneTalk } from '@/domain/talks/test-helpers';
import { TalkBody } from './TalkBody';

function renderBody(lecture: Record<string, string>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <AdapterProvider>
          <TalkBody talk={oneTalk(lecture)} ctx={{ today: TODAY, isMember: () => false }} />
        </AdapterProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('TalkBody: Links aus Zellen', () => {
  const held = {
    Datum: '01.11.2026',
    Speaker: 'Anna Beispiel',
    Titel: 'T',
    Status: 'durchgeführt',
  };

  it('YouTube-Link mit https wird ein Link', () => {
    renderBody({ ...held, 'YouTube-Link': 'https://youtu.be/abc' });
    expect(screen.getByRole('link', { name: /Aufnahme auf YouTube/ })).toHaveAttribute(
      'href',
      'https://youtu.be/abc',
    );
  });

  it('javascript:-Wert wird nie ein Link, auch wenn „youtu“ darin steht', () => {
    renderBody({ ...held, 'YouTube-Link': 'javascript:alert("youtu")' });
    expect(screen.queryByRole('link', { name: /Aufnahme auf YouTube/ })).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="javascript"]')).toBeNull();
    expect(screen.getByText('Noch kein YouTube-Link.')).toBeInTheDocument();
  });
});
