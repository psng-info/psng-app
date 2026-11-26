import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AI_ENABLED } from '@/data/config';
import {
  addFree as addFreeTo,
  emptyQueue,
  parseQueue,
  queueCount,
  removeFree as removeFreeFrom,
  serializeQueue,
  setNote as setNoteIn,
  STORAGE_KEY,
  type Queue,
  type QueueKind,
} from '@/domain/ai/queue';

export interface AiApi {
  enabled: boolean;
  queue: Queue;
  count: number;
  setNote: (kind: QueueKind, id: string, text: string) => void;
  addFree: (text: string) => void;
  removeFree: (index: number) => void;
  clear: () => void;
}

const OFF: AiApi = {
  enabled: false,
  queue: emptyQueue(),
  count: 0,
  setNote: () => undefined,
  addFree: () => undefined,
  removeFree: () => undefined,
  clear: () => undefined,
};

const AiContext = createContext<AiApi>(OFF);

// eslint-disable-next-line react-refresh/only-export-components
export const useAi = (): AiApi => useContext(AiContext);

function load(): Queue {
  try {
    return parseQueue(localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyQueue();
  }
}

/** Hält die Warteschlange. Ohne `VITE_AI=on` ist alles aus und es wird nichts gespeichert. */
export function AiProvider({ children }: { children: ReactNode }) {
  if (!AI_ENABLED) return <AiContext.Provider value={OFF}>{children}</AiContext.Provider>;
  return <AiState>{children}</AiState>;
}

function AiState({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Queue>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeQueue(queue));
    } catch {
      // localStorage gesperrt: die Schlange gilt dann nur bis zum Neuladen
    }
  }, [queue]);

  const setNote = useCallback(
    (kind: QueueKind, id: string, text: string) => setQueue((q) => setNoteIn(q, kind, id, text)),
    [],
  );
  const addFree = useCallback((text: string) => setQueue((q) => addFreeTo(q, text)), []);
  const removeFree = useCallback((i: number) => setQueue((q) => removeFreeFrom(q, i)), []);
  const clear = useCallback(() => setQueue(emptyQueue()), []);

  const value = useMemo<AiApi>(
    () => ({ enabled: true, queue, count: queueCount(queue), setNote, addFree, removeFree, clear }),
    [queue, setNote, addFree, removeFree, clear],
  );
  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}
