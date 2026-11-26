import { createContext, useContext } from 'react';
import type { Flag, StepState, Talk } from '@/domain/talks/types';

/** Schreibaktionen, die die Karten auslösen. Ohne Provider bleibt alles nur lesbar. */
export interface TalkActions {
  editStep: (talk: Talk, step: StepState) => void;
  markDone: (talk: Talk, step: StepState) => void;
  editFacts: (talk: Talk) => void;
  applyFix: (talk: Talk, fix: NonNullable<Flag['fix']>) => void;
  /** `Talk|Schritt` der Schritte, die gerade geschrieben werden. */
  pendingSteps: ReadonlySet<string>;
  /** Talk-Schlüssel, deren Eckdaten gerade geschrieben werden. */
  pendingTalks: ReadonlySet<string>;
}

export const TalkActionsContext = createContext<TalkActions | null>(null);

export const useTalkActions = (): TalkActions | null => useContext(TalkActionsContext);
