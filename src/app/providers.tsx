import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '@/auth/AuthProvider';
import { AdapterProvider } from '@/data/AdapterContext';
import { DATA_MODE } from '@/data/config';
import { AiProvider } from '@/features/ai/AiContext';
import { APP_VERSION, CACHE_MAX_AGE, createIdbPersister, shouldPersist } from '@/data/persist';

/** Im Sheets-Modus hält der Lesecache (IndexedDB) To-dos, Talks und Zugangsliste bis zu 7 Tage vor. Im Demo-Modus gibt es keinen. */
export function Providers({ children }: { children: ReactNode }) {
  const demo = DATA_MODE === 'demo';
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            // gcTime muss mindestens so lang sein wie der Cache, sonst wird er beim Wiederherstellen verworfen.
            ...(demo ? {} : { gcTime: CACHE_MAX_AGE }),
          },
        },
      }),
  );
  const [persister] = useState(createIdbPersister);

  const inner = (
    <AuthProvider>
      <AdapterProvider>
        <AiProvider>{children}</AiProvider>
      </AdapterProvider>
    </AuthProvider>
  );

  if (demo) return <QueryClientProvider client={client}>{inner}</QueryClientProvider>;
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        buster: APP_VERSION,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersist },
      }}
    >
      {inner}
    </PersistQueryClientProvider>
  );
}
