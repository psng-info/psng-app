import { useQuery } from '@tanstack/react-query';
import type { Values } from '@/domain/rows';
import { useSheets } from '../AdapterContext';
import { RANGES, REFETCH, SHEET_IDS, STALE_MS } from '../config';

export interface TalksData {
  lectures: Values;
  speakers: Values;
  steps: Values;
  reports: Values;
  speakerForm: Values;
}

/** Ein batchGet für alle fünf Talk-Tabs. Das Modell baut das Feature, hier nur Rohwerte. */
export function useTalksData() {
  const sheets = useSheets();
  return useQuery({
    queryKey: ['talks'],
    staleTime: STALE_MS.talks,
    refetchInterval: REFETCH.talks,
    queryFn: async (): Promise<TalksData> => {
      const r = RANGES.talks;
      const [lectures, speakers, steps, reports, speakerForm] = await sheets.batchGet(
        SHEET_IDS.lectures,
        [r.lectures, r.speakers, r.steps, r.reports, r.speakerForm],
      );
      return {
        lectures: lectures ?? [],
        speakers: speakers ?? [],
        steps: steps ?? [],
        reports: reports ?? [],
        speakerForm: speakerForm ?? [],
      };
    },
  });
}
