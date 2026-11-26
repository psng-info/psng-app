import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/auth/useAuth';
import { DATA_MODE } from './config';
import { DemoAdapter } from './sheets/DemoAdapter';
import { GoogleSheetsAdapter } from './sheets/GoogleSheetsAdapter';
import type { SheetsAdapter } from './sheets/SheetsAdapter';

const AdapterContext = createContext<SheetsAdapter | null>(null);

export function AdapterProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const adapter = useMemo<SheetsAdapter>(
    () => (DATA_MODE === 'demo' ? new DemoAdapter() : new GoogleSheetsAdapter(getToken)),
    [getToken],
  );
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>;
}

/** Der aktive Adapter: Demo (Fixtures) oder Google. */
// eslint-disable-next-line react-refresh/only-export-components
export function useSheets(): SheetsAdapter {
  const adapter = useContext(AdapterContext);
  if (!adapter) throw new Error('useSheets braucht AdapterProvider');
  return adapter;
}
