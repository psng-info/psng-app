import { describe, expect, it } from 'vitest';
import { buildPeople, buddyName, contactOf, formAnswers, personKey } from './model';
import { raw, TODAY } from './test-helpers';

const KH = raw().kandidaten[0] ?? [];
const FH = [
  'Zeitstempel',
  'Vor- und Nachname',
  'E-Mail',
  'Handynummer',
  'Einverständnis',
  'Warum PSNG?',
];

describe('buildPeople', () => {
  it('Neu eingegangen: ohne Formular „Formular fehlt“, mit Formular „Bereit für 1:1“', () => {
    const r = raw(
      [
        { Vorname: 'Anna', Nachname: 'Alt', 'Pipeline-Status': 'Neu eingegangen' },
        {
          Vorname: 'Ben',
          Nachname: 'Bunt',
          'Pipeline-Status': 'Neu eingegangen',
          'E-Mail': 'b@x.org',
        },
        { Vorname: 'Cem', Nachname: 'Cord', 'Pipeline-Status': 'Neu eingegangen' },
      ],
      {
        formular: [
          FH,
          ['1.11.2026', 'Ben Bunt', 'B@x.org', '', 'ja', 'Weil'],
          ['2.11.2026', 'Cem Cord', 'andere@x.org', '', 'ja', ''],
        ],
      },
    );
    const ps = buildPeople(r, TODAY);
    expect(ps.map((p) => p.stage)).toEqual(['Formular fehlt', 'Bereit für 1:1', 'Bereit für 1:1']);
    expect(ps.every((p) => p.source === 'kandidat' && p.row !== null)).toBe(true);
  });

  it('Abbrüche: Status „Abbruch“, nicht beschreibbar, eigener Schlüssel', () => {
    const r = raw([{ Vorname: 'Thea', Nachname: 'Lindner', 'Pipeline-Status': 'Abgesagt' }]);
    r.abbrueche.push(['Thea', 'Lindner', 'Abgebrochen Keine Antwort']);
    const [k, a] = buildPeople(r, TODAY);
    expect(k?.key).toBe('p-thea_lindner');
    expect(a?.key).toBe('a-thea_lindner');
    expect(a?.status).toBe('Abbruch');
    expect(a?.editable).toBe(false);
    expect(a?.row).toBeNull();
    expect(a?.closed).toBe(true);
  });

  it('nur Formular: Person ohne Zeile, bekannte Mail oder Name zählt nicht', () => {
    const r = raw([{ Vorname: 'Ben', Nachname: 'Bunt', 'E-Mail': 'b@x.org' }], {
      formular: [
        FH,
        ['1.11.', 'Ben B.', 'b@x.org', '', 'ja', ''],
        ['2.11.', 'Dora Dorn', 'd@x.org', '+49 1', 'ja', 'Neugier'],
        ['3.11.', 'Dora Dorn', 'd@x.org', '+49 1', 'ja', 'Neugier neu'],
      ],
    });
    const ps = buildPeople(r, TODAY);
    const f = ps.filter((p) => p.formOnly);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({
      name: 'Dora Dorn',
      status: 'Nur Formular',
      stage: 'Nur Formular',
      key: 'f-dora_dorn',
      editable: false,
      row: null,
    });
    expect(f[0]?.flags).toEqual([
      { lvl: 'new', tag: 'Neu', why: 'Formular da, noch keine Zeile im Tab Kandidaten' },
    ]);
    expect(f[0]?.form?.['Warum PSNG?']).toBe('Neugier neu');
  });

  it('neueste Notiz je Person: Datum gewinnt, bei Gleichstand die spätere Zeile', () => {
    const r = raw([{ Vorname: 'Ben', Nachname: 'Bunt' }], {
      notizen: [
        ['Datum', 'Person', 'Quelle', 'Notiz', 'Von'],
        ['05.11.2026', 'Ben Bunt', '', 'alt', ''],
        ['10.11.2026', 'Ben Bunt', '', 'A', ''],
        ['10.11.2026', 'ben  bunt', '', 'B', ''],
        ['01.11.2026', 'Ben Bunt', '', 'ganz alt', ''],
      ],
    });
    expect(buildPeople(r, TODAY)[0]?.note?.['Notiz']).toBe('B');
  });

  it('Vorname und Nachname fehlen: „(ohne Namen)“ nur mit Mail', () => {
    const r = raw([{ 'E-Mail': 'x@y.org' }]);
    expect(buildPeople(r, TODAY)[0]?.name).toBe('(ohne Namen)');
  });
});

describe('Hilfen', () => {
  it('personKey und buddyName', () => {
    expect(personKey('p', 'Emil (Emmo)  Sandoval')).toBe('p-emil_(emmo)_sandoval');
    expect(buddyName('Lennert (geplant)')).toBe('Lennert');
    expect(buddyName(undefined)).toBe('');
  });

  it('Kontakt: Kandidaten-Zeile vor Formular', () => {
    const r = raw([{ Vorname: 'Ben', Nachname: 'Bunt' }], {
      formular: [FH, ['1.11.', 'Ben Bunt', 'f@x.org', '+49 2', 'ja', '']],
    });
    const p = buildPeople(r, TODAY)[0];
    expect(p && contactOf(p)).toEqual({ mail: 'f@x.org', tel: '+49 2' });
  });

  it('Formularantworten: ohne Name, Mail, Telefon, Zeitstempel, Einwilligung, leere Felder', () => {
    const r = raw([{ Vorname: 'Ben', Nachname: 'Bunt' }], {
      formular: [FH, ['1.11.', 'Ben Bunt', 'f@x.org', '+49 2', 'Ich stimme zu', 'Weil']],
    });
    const p = buildPeople(r, TODAY)[0];
    expect(p && formAnswers(p)).toEqual([{ label: 'Warum PSNG?', value: 'Weil' }]);
  });

  it('Kopfzeile bleibt unberührt', () => {
    expect(KH[0]).toBe('Vorname');
  });
});
