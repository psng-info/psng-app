/** Hash-Link zu einem Talk, z. B. `#/talks/30.11.2026%20%C2%B7%20Name`. */
export const talkHref = (key: string): string => `#/talks/${encodeURIComponent(key)}`;

/** DOM-Id der Talk-Karte (Zeilennummer im Sheet ist eindeutig). */
export const cardId = (t: { row: number }): string => `talk-${t.row}`;
