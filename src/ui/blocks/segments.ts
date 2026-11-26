/** done = erledigt, implied = vor dem Talk, late/soon = überfällig/bald fällig, open = offen, unk = nicht erfasst. */
export type SegmentKind = 'done' | 'implied' | 'late' | 'soon' | 'open' | 'unk';

export const SEGMENT_LABEL: Record<SegmentKind, string> = {
  done: 'erledigt',
  implied: 'vor dem Talk',
  soon: 'bald fällig',
  late: 'überfällig',
  open: 'offen',
  unk: 'nicht erfasst',
};
