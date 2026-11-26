import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '@/auth/AuthProvider';
import { AdapterProvider } from '@/data/AdapterContext';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <AdapterProvider>{children}</AdapterProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
