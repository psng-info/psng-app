import { describe, expect, it } from 'vitest';
import { flagsOf, type FlagInput } from './flags';
import { TODAY } from './test-helpers';

const D = (d: number, m = 11, y = 2026) => new Date(y, m - 1, d);
const base = (o: Partial<FlagInput> = {}): FlagInput => ({
  k: {},
  status: 'Warte auf Termin',
  isAbbruch: false,
  active: true,
  last: D(25),
  dl: null,
  wv: null,
  ...o,
});
const tags = (p: FlagInput) => flagsOf(p, TODAY).map((f) => `${f.lvl}:${f.tag}`);

describe('flagsOf', () => {
  it('Deadline überfällig: crit mit Tagen', () => {
    const f = flagsOf(base({ dl: D(19) }), TODAY);
    expect(f[0]).toEqual({ lvl: 'crit', tag: 'Überfällig', why: 'Deadline 19.11., 7 Tage drüber' });
    expect(flagsOf(base({ dl: D(25) }), TODAY)[0]?.why).toBe('Deadline 25.11., 1 Tag drüber');
  });
  it('Deadline in 0 bis 7 Tagen: heute und ≤2 crit, sonst warn', () => {
    expect(flagsOf(base({ dl: D(26) }), TODAY)[0]).toMatchObject({
      lvl: 'crit',
      why: 'Deadline heute',
    });
    expect(flagsOf(base({ dl: D(28) }), TODAY)[0]).toMatchObject({
      lvl: 'crit',
      why: 'Deadline 28.11., in 2 Tagen',
    });
    expect(flagsOf(base({ dl: D(29) }), TODAY)[0]?.lvl).toBe('warn');
    expect(flagsOf(base({ dl: D(27) }), TODAY)[0]?.why).toBe('Deadline 27.11., in 1 Tag');
    expect(tags(base({ dl: D(4, 12) }))).toEqual([]);
  });
  it('Follow-up bei Warte auf Termin ab 4 Tagen, crit ab 8', () => {
    expect(tags(base({ last: D(23) }))).toEqual([]);
    expect(tags(base({ last: D(22) }))).toEqual(['warn:Follow-up']);
    expect(tags(base({ last: D(18) }))).toEqual(['crit:Follow-up']);
  });
  it('Kontakt: über 7 Tage warn, über 14 crit, fehlend warn', () => {
    const s = { status: '1:1 geführt' };
    expect(tags(base({ ...s, last: D(19) }))).toEqual([]);
    expect(tags(base({ ...s, last: D(18) }))).toEqual(['warn:Kontakt']);
    expect(tags(base({ ...s, last: D(11) }))).toEqual(['crit:Kontakt']);
    expect(flagsOf(base({ ...s, last: null }), TODAY)[0]?.why).toBe(
      'Kein letzter Kontakt eingetragen',
    );
  });
  it('Check-in bei Probeaufgabe: Check-in sonst 1:1 als Bezug, >10 warn, >17 crit', () => {
    const s = { status: 'Probeaufgabe läuft' };
    expect(tags(base({ ...s, k: { 'Letzter Check-in': '16.11.2026' } }))).toEqual([]);
    expect(tags(base({ ...s, k: { 'Letzter Check-in': '15.11.2026' } }))).toEqual([
      'warn:Check-in',
    ]);
    expect(tags(base({ ...s, k: { '1:1 am': '01.11.2026' } }))).toEqual(['crit:Check-in']);
    expect(tags(base({ ...s, k: {} }))).toEqual([]);
  });
  it('Review ohne Team-Entscheidung: Weekly', () => {
    expect(tags(base({ status: 'Review' }))).toEqual(['warn:Weekly']);
    expect(tags(base({ status: 'Review', k: { 'Team-Entscheidung': 'TRUE' } }))).toEqual([
      'crit:Rückmeldung',
    ]);
  });
  it('Rückmeldung: Entscheidung ohne Benachrichtigung, auch für abgeschlossene, nie für Abbrüche', () => {
    const k = { 'Team-Entscheidung': 'TRUE', Benachrichtigt: 'FALSE', Integriert: 'TRUE' };
    expect(tags(base({ status: 'Core', active: false, k }))).toEqual(['crit:Rückmeldung']);
    expect(tags(base({ status: 'Abbruch', active: false, isAbbruch: true, k }))).toEqual([]);
  });
  it('Integration offen bei Core und Helper, auch abgeschlossen', () => {
    expect(tags(base({ status: 'Helper', active: false }))).toEqual(['warn:Integration']);
    expect(tags(base({ status: 'Core', active: false, k: { Integriert: 'TRUE' } }))).toEqual([]);
    expect(tags(base({ status: 'Pause', active: false }))).toEqual([]);
  });
  it('Wiedervorlage feuert auch für abgeschlossene: fällig crit, ≤7 Tage warn', () => {
    const c = { status: 'Pool', active: false };
    expect(flagsOf(base({ ...c, wv: D(17) }), TODAY)[0]).toEqual({
      lvl: 'crit',
      tag: 'Wiedervorlage',
      why: 'Wiedervorlage fällig seit 17.11.',
    });
    expect(flagsOf(base({ ...c, wv: D(3, 12) }), TODAY)[0]).toMatchObject({
      lvl: 'warn',
      why: 'Wiedervorlage 03.12., in 7 Tagen',
    });
    expect(tags(base({ ...c, wv: D(4, 12) }))).toEqual([]);
  });
  it('abgeschlossene Personen: keine Deadline- und Kontakt-Flags', () => {
    expect(tags(base({ status: 'Pause', active: false, last: null, dl: D(1) }))).toEqual([]);
  });
  it('Datum in anderem Jahr bekommt zweistelliges Jahr', () => {
    expect(
      flagsOf(base({ wv: D(3, 1, 2027), status: 'Pool', active: false }), D(1, 1, 2027))[0]?.why,
    ).toBe('Wiedervorlage 03.01., in 2 Tagen');
  });
});
