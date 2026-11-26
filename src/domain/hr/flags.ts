import { daysFrom, formatShort, parseDate } from '@/domain/dates';
import { yes } from '@/domain/text';
import type { Flag, Rec } from './types';

export interface FlagInput {
  k: Rec;
  status: string;
  isAbbruch: boolean;
  active: boolean;
  last: Date | null;
  dl: Date | null;
  wv: Date | null;
}

const tage = (n: number) => `${n} ${n === 1 ? 'Tag' : 'Tage'}`;
const inTagen = (n: number) => `in ${n} ${n === 1 ? 'Tag' : 'Tagen'}`;

/** Handlungsbedarf einer Person. Regeln wie Referenz-Modul H. Heute wird übergeben. */
export function flagsOf(p: FlagInput, today: Date): Flag[] {
  const { k, status } = p;
  const flags: Flag[] = [];
  const fmt = (d: Date) => formatShort(d, today);

  if (p.active) {
    if (p.dl) {
      const dd = daysFrom(p.dl, today);
      if (dd < 0) {
        flags.push({
          lvl: 'crit',
          tag: 'Überfällig',
          why: `Deadline ${fmt(p.dl)}, ${tage(-dd)} drüber`,
        });
      } else if (dd <= 7) {
        flags.push({
          lvl: dd <= 2 ? 'crit' : 'warn',
          tag: 'Deadline',
          why: dd === 0 ? 'Deadline heute' : `Deadline ${fmt(p.dl)}, ${inTagen(dd)}`,
        });
      }
    }
    if (p.last) {
      const ago = -daysFrom(p.last, today);
      if (status === 'Warte auf Termin' && ago >= 4) {
        flags.push({
          lvl: ago >= 8 ? 'crit' : 'warn',
          tag: 'Follow-up',
          why: `Keine Antwort seit ${ago} Tagen (${fmt(p.last)}), Follow-up schicken`,
        });
      } else if (ago > 7) {
        flags.push({
          lvl: ago > 14 ? 'crit' : 'warn',
          tag: 'Kontakt',
          why: `Letzter Kontakt vor ${ago} Tagen (${fmt(p.last)})`,
        });
      }
    } else {
      flags.push({ lvl: 'warn', tag: 'Kontakt', why: 'Kein letzter Kontakt eingetragen' });
    }
    if (status === 'Probeaufgabe läuft') {
      const ref = parseDate(k['Letzter Check-in']) ?? parseDate(k['1:1 am']);
      if (ref) {
        const ago = -daysFrom(ref, today);
        if (ago > 10) {
          flags.push({
            lvl: ago > 17 ? 'crit' : 'warn',
            tag: 'Check-in',
            why: `Letzter Check-in vor ${ago} Tagen, Buddy meldet sich`,
          });
        }
      }
    }
    if (status === 'Review' && !yes(k['Team-Entscheidung'])) {
      flags.push({
        lvl: 'warn',
        tag: 'Weekly',
        why: 'Review da, Ergebnis ins nächste Weekly bringen',
      });
    }
  }

  // Diese Regeln gelten auch für abgeschlossene Personen.
  if (!p.isAbbruch && yes(k['Team-Entscheidung']) && !yes(k['Benachrichtigt'])) {
    flags.push({
      lvl: 'crit',
      tag: 'Rückmeldung',
      why: 'Team hat entschieden, innerhalb von 48 h benachrichtigen',
    });
  }
  if ((status === 'Core' || status === 'Helper') && !yes(k['Integriert'])) {
    flags.push({
      lvl: 'warn',
      tag: 'Integration',
      why: 'Integrations-Checkliste offen, danach nach Members verschieben',
    });
  }
  if (p.wv) {
    const dd = daysFrom(p.wv, today);
    if (dd <= 7) {
      flags.push({
        lvl: dd <= 0 ? 'crit' : 'warn',
        tag: 'Wiedervorlage',
        why:
          dd <= 0
            ? `Wiedervorlage fällig seit ${fmt(p.wv)}`
            : `Wiedervorlage ${fmt(p.wv)}, ${inTagen(dd)}`,
      });
    }
  }
  return flags;
}
