import { describe, expect, it } from 'vitest';
import { hrConflict } from './conflict';
import { buildPeople } from './model';
import { hrMood, flagGroups, byProgress } from './rank';
import { raw, TODAY } from './test-helpers';

const r = raw([
  { Vorname: 'Ida', Nachname: 'Brunner', 'Pipeline-Status': 'Core' },
  { Vorname: 'Lasse', Nachname: 'Moritz', 'Pipeline-Status': 'Helper' },
  { Vorname: 'Emil (Emmo)', Nachname: 'Sandoval', 'Pipeline-Status': 'Pause' },
  { Vorname: 'Jo', Nachname: 'Kurz', 'Pipeline-Status': 'Pause' },
  { Vorname: 'Max', Nachname: 'Aktiv', 'Pipeline-Status': 'Review' },
]);
r.abbrueche.push(['Ansgar', '', 'Abgebrochen Keine Zeit']);
r.formular.push(['1.11.', 'Franka Formular', 'f@x.org', '', 'ja']);
const people = buildPeople(r, TODAY);

describe('hrConflict', () => {
  it('findet abgeschlossene Person per Vorname mit Buchstabengrenzen', () => {
    expect(hrConflict('Mit Ida Termin klären', people)).toEqual({
      first: 'Ida',
      status: 'Core',
      grund: '',
    });
    expect(hrConflict('Ida', people)?.first).toBe('Ida');
    expect(hrConflict('(Ida) fragen', people)?.first).toBe('Ida');
    expect(hrConflict('Ida, Lasse', people)?.first).toBe('Ida');
  });
  it('keine Treffer in Wörtern oder bei Klein-/Großschreibung', () => {
    expect(hrConflict('Idaho besuchen', people)).toBeNull();
    expect(hrConflict('Ich lasse das', people)).toBeNull();
    expect(hrConflict('Frida meldet sich', people)).toBeNull();
  });
  it('Vorname bis zur Klammer, mind. 3 Zeichen', () => {
    expect(hrConflict('Emil melden', people)?.first).toBe('Emil');
    expect(hrConflict('Emmo melden', people)).toBeNull();
    expect(hrConflict('Jo anrufen', people)).toBeNull();
  });
  it('aktive Personen und reine Formular-Personen zählen nicht', () => {
    expect(hrConflict('Max und Franka', people)).toBeNull();
  });
  it('Abbruch liefert den Status-Text als Grund', () => {
    expect(hrConflict('Ansgar fragen', people)).toEqual({
      first: 'Ansgar',
      status: 'Abbruch',
      grund: 'Abgebrochen Keine Zeit',
    });
  });
});

describe('Ranking', () => {
  it('Handlungsbedarf: dringend vor neu vor warn, dann Stufe, dann Name', () => {
    const rr = raw([
      {
        Vorname: 'Zoe',
        Nachname: 'A',
        'Pipeline-Status': '1:1 geführt',
        'Letzter Kontakt': '18.11.2026',
      },
      {
        Vorname: 'Ana',
        Nachname: 'B',
        'Pipeline-Status': 'Review',
        'Letzter Kontakt': '25.11.2026',
      },
      {
        Vorname: 'Bea',
        Nachname: 'C',
        'Pipeline-Status': 'Warte auf Termin',
        'Letzter Kontakt': '10.11.2026',
      },
    ]);
    rr.formular.push(['1.11.', 'Neu Person', 'n@x.org', '', 'ja']);
    const g = flagGroups(buildPeople(rr, TODAY));
    expect(g.map((x) => [x.person.name, x.rank])).toEqual([
      ['Bea C', 0],
      ['Neu Person', 1],
      ['Zoe A', 2],
      ['Ana B', 2],
    ]);
  });
  it('Personenliste: weitester Fortschritt zuerst, bei Gleichstand laufende vor angehaltenen', () => {
    const rr = raw([
      { Vorname: 'Ada', Nachname: 'X', 'Pipeline-Status': 'Pause', '1:1 am': '1.11.2026' },
      { Vorname: 'Bo', Nachname: 'X', 'Pipeline-Status': '1:1 geführt', '1:1 am': '1.11.2026' },
      {
        Vorname: 'Cy',
        Nachname: 'X',
        'Pipeline-Status': 'Probeaufgabe läuft',
        'Aufgabe vereinbart': 'TRUE',
      },
    ]);
    expect(
      buildPeople(rr, TODAY)
        .sort(byProgress)
        .map((p) => p.buddy || p.name),
    ).toEqual(['Cy X', 'Bo X', 'Ada X']);
  });
});

describe('hrMood', () => {
  it('leere Pipeline: Abzug, Zähler im Text', () => {
    const m = hrMood([], TODAY);
    expect(m.score).toBe(85);
    expect(m.factors.map((f) => f.text)).toEqual(['Pipeline leer']);
  });
  it('rote Fälle ziehen bis 40 ab, Kontakte der letzten 7 Tage geben Punkte', () => {
    const rr = raw(
      Array.from({ length: 7 }, (_, i) => ({
        Vorname: `P${i}`,
        Nachname: 'X',
        'Pipeline-Status': 'Probeaufgabe läuft',
        Deadline: '01.11.2026',
        'Letzter Kontakt': '25.11.2026',
      })),
    );
    const m = hrMood(buildPeople(rr, TODAY), TODAY);
    expect(m.factors.find((f) => f.text.includes('dringend'))?.value).toBe(-40);
    expect(m.factors.find((f) => f.text.includes('Kontakte'))?.value).toBe(10);
  });
  it('Quote aufgenommen/abgebrochen erst ab 3 Fällen', () => {
    const rr = raw([
      {
        Vorname: 'A',
        Nachname: 'X',
        'Pipeline-Status': 'Core',
        'Team-Entscheidung': 'TRUE',
        Benachrichtigt: 'TRUE',
        Integriert: 'TRUE',
      },
      { Vorname: 'B', Nachname: 'X', 'Pipeline-Status': 'Abgesagt' },
    ]);
    expect(
      hrMood(buildPeople(rr, TODAY), TODAY).factors.some((f) => f.text.includes('aufgenommen')),
    ).toBe(false);
    rr.kandidaten.push(rr.kandidaten[2] ?? []);
    expect(
      hrMood(buildPeople(rr, TODAY), TODAY).factors.some((f) => f.text.includes('aufgenommen')),
    ).toBe(true);
  });
});
