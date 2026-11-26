import { describe, expect, it } from 'vitest';
import {
  TALK_TILES,
  actionItems,
  findLectureRow,
  gapsOf,
  speakerPool,
  stats,
  talkKey,
} from './model';
import { STEPS } from './steps';
import { LECTURE_HEADERS, TODAY, flagOf, modelOf, oneTalk, stepOf, table } from './test-helpers';

const base = { Titel: 'Titel', Speaker: 'Anna Beispiel', Format: 'online' };

describe('talkKey', () => {
  it('Datum plus Speaker-Zelle, getrimmt', () => {
    expect(talkKey(new Date(2026, 11, 3), ' Anna Beispiel ')).toBe('03.12.2026 · Anna Beispiel');
  });
  it('ohne Datum', () => {
    expect(talkKey(null, 'Anna')).toBe('ohne Datum · Anna');
  });
});

describe('Schritt-Status', () => {
  const upcoming = { ...base, Datum: '03.12.2026', Status: 'fix' };

  it('jeder Talk hat 19 Schritte in Tabellenreihenfolge', () => {
    const t = oneTalk(upcoming);
    expect(t.steps).toHaveLength(19);
    expect(t.steps.map((s) => s.def.key)).toEqual(STEPS.map((s) => s.key));
  });

  it('auto: Status und Datum', () => {
    const t = oneTalk(upcoming);
    expect(stepOf(t, 'Anfrage')).toMatchObject({ status: 'done', isAuto: true });
    expect(stepOf(t, 'Zusage').status).toBe('done');
    const idea = oneTalk({ ...base, Datum: '03.12.2026', Status: 'Idee' });
    expect(stepOf(idea, 'Anfrage').status).toBe('open');
    expect(stepOf(idea, 'Zusage').status).toBe('open');
    const undated = oneTalk({ ...base, Status: 'fix' });
    expect(stepOf(undated, 'Zusage').status).toBe('open');
  });

  it('auto: Moderation, Freigaben, Views, Durchgeführt per TN', () => {
    const t = oneTalk({
      ...upcoming,
      Moderation: 'Eric',
      Veröffentlichung: 'ja',
      'Views nach 4 Wo.': '12',
      'TN online': '5',
    });
    expect(stepOf(t, 'Moderation').status).toBe('done');
    expect(stepOf(t, 'Freigaben').status).toBe('done');
    expect(stepOf(t, 'Views').status).toBe('done');
    expect(stepOf(t, 'Durchgeführt').status).toBe('done');
  });

  it('auto: Formular über Speaker-Spalte, über Formular-Antwort, sonst offen', () => {
    const none = oneTalk(upcoming);
    expect(stepOf(none, 'Formular').status).toBe('open');
    const viaSheet = oneTalk(upcoming, {
      speakers: [{ Name: 'Anna Beispiel', 'Formular eingegangen': '09.11.2026' }],
    });
    expect(stepOf(viaSheet, 'Formular').status).toBe('done');
    const viaForm = oneTalk(upcoming, {
      speakerForm: [{ 'Vollständiger Name / Full name': 'Dr. Anna Beispiel' }],
    });
    expect(stepOf(viaForm, 'Formular').status).toBe('done');
  });

  it('auto: Dank nur, wenn alle Speaker Endorsement angefragt/ja haben', () => {
    const two = { ...upcoming, Speaker: 'Anna Beispiel und Bernd Muster' };
    const half = oneTalk(two, {
      speakers: [
        { Name: 'Anna Beispiel', Endorsement: 'ja' },
        { Name: 'Bernd Muster', Endorsement: 'offen' },
      ],
    });
    expect(stepOf(half, 'Dank').status).toBe('open');
    const all = oneTalk(two, {
      speakers: [
        { Name: 'Anna Beispiel', Endorsement: 'ja' },
        { Name: 'Bernd Muster', Endorsement: 'angefragt' },
      ],
    });
    expect(stepOf(all, 'Dank').status).toBe('done');
    expect(stepOf(oneTalk({ ...upcoming, Speaker: '' }), 'Dank').status).toBe('open');
  });

  it('auto: Talk-Bericht über Bericht oder Freitext', () => {
    const viaText = oneTalk({ ...upcoming, 'Was gut lief': 'Alles' });
    expect(stepOf(viaText, 'Talk-Bericht').status).toBe('done');
    const viaReport = oneTalk(upcoming, {
      reports: [{ Lecture: '03.12.2026 · Anna Beispiel' }],
    });
    expect(stepOf(viaReport, 'Talk-Bericht').status).toBe('done');
  });

  it('implied: gehaltener Talk, Phase vor Tag; Phase 3 bleibt offen und kann überfällig sein', () => {
    const t = oneTalk({ ...base, Datum: '04.11.2026', Status: 'durchgeführt' });
    expect(stepOf(t, 'Raum/Zoom').status).toBe('implied');
    expect(stepOf(t, 'Moderation').status).toBe('implied');
    expect(stepOf(t, 'Durchgeführt').status).toBe('done');
    expect(stepOf(t, 'Recap')).toMatchObject({ status: 'open', late: true });
  });

  it('implied: vergangenes Datum reicht, auch ohne Status', () => {
    const t = oneTalk({ ...base, Datum: '04.11.2026', Status: 'fix' });
    expect(stepOf(t, 'Reminder').status).toBe('implied');
  });

  it('unk: SOP-Schritt nach dem Talk bei Datum vor 29.10.2026', () => {
    const t = oneTalk({ ...base, Datum: '09.06.2026', Status: 'veröffentlicht' });
    expect(stepOf(t, 'Recap').status).toBe('unk');
    expect(stepOf(t, 'Website').status).toBe('unk');
    // ohne sop-Markierung bleibt es offen
    expect(stepOf(t, 'Views').status).toBe('open');
    expect(stepOf(t, 'Raum/Zoom').status).toBe('implied');
  });

  it('na: abgesagt oder pausiert macht alles „nicht nötig“', () => {
    for (const Status of ['abgesagt', 'pausiert']) {
      const t = oneTalk({ ...base, Datum: '03.12.2026', Status });
      expect(t.steps.every((s) => s.status === 'na')).toBe(true);
    }
  });

  it('na: when-Regeln (Apero/Geschenk nur vor Ort, YouTube/Website nur bei Freigabe, Interessierte nur mit Bericht)', () => {
    const online = oneTalk(upcoming);
    expect(stepOf(online, 'Apero').status).toBe('na');
    expect(stepOf(online, 'Geschenk').status).toBe('na');
    expect(stepOf(online, 'Interessierte').status).toBe('na');
    const hybrid = oneTalk({ ...upcoming, Format: 'Hybrid' });
    expect(stepOf(hybrid, 'Apero').status).toBe('open');
    const noPub = oneTalk({ ...upcoming, Veröffentlichung: 'Nein, bitte nicht' });
    expect(stepOf(noPub, 'YouTube').status).toBe('na');
    expect(stepOf(noPub, 'Website').status).toBe('na');
    expect(stepOf(noPub, 'Views').status).toBe('na');
    const withInterest = oneTalk(upcoming, {
      reports: [
        {
          Lecture: '03.12.2026 · Anna Beispiel',
          'Neue Interessierte fürs Mitmachen (Name + Kontakt)': 'Frieda Muster',
        },
      ],
    });
    expect(stepOf(withInterest, 'Interessierte').status).toBe('open');
  });

  it('YouTube: auto über Link', () => {
    const t = oneTalk({ ...upcoming, 'YouTube-Link': 'https://youtu.be/demo' });
    expect(stepOf(t, 'YouTube')).toMatchObject({ status: 'done', isAuto: true });
  });

  it('Log: nicht nötig und erledigt', () => {
    const key = '03.12.2026 · Anna Beispiel';
    const t = oneTalk(upcoming, {
      steps: [
        { Talk: key, Schritt: 'Raum/Zoom', Status: 'erledigt' },
        { Talk: key, Schritt: 'Reminder', Status: 'nicht nötig' },
      ],
    });
    expect(stepOf(t, 'Raum/Zoom')).toMatchObject({ status: 'done', isAuto: false });
    expect(stepOf(t, 'Reminder').status).toBe('na');
  });

  it('Log: je Feld gewinnt der letzte nicht leere Eintrag', () => {
    const key = '03.12.2026 · Anna Beispiel';
    const t = oneTalk(upcoming, {
      steps: [
        { Talk: key, Schritt: 'Ankündigung', Status: 'offen', Owner: 'Mia', Notiz: 'Entwurf' },
        { Talk: key, Schritt: 'Ankündigung', Status: 'erledigt' },
      ],
    });
    const s = stepOf(t, 'Ankündigung');
    expect(s).toMatchObject({ status: 'done', owner: 'Mia', ownerFromLog: true });
    expect(s.lastNote?.note).toBe('Entwurf');
    expect(s.lastStatus?.status).toBe('erledigt');
  });

  it('Owner: Standard je Rolle', () => {
    const t = oneTalk(upcoming);
    expect(stepOf(t, 'Anfrage').owner).toBe('Polina');
    expect(stepOf(t, 'Ankündigung').owner).toBe('Stela');
    expect(stepOf(t, 'Raum/Zoom').owner).toBe('Polina'); // online: Koordination
    expect(stepOf(t, 'Interessierte').owner).toBe('Lennert');
    expect(stepOf(t, 'Website').owner).toBe('Lennert');
    expect(stepOf(t, 'YouTube').owner).toBe('');
    expect(stepOf(t, 'YouTube').ownerFromLog).toBe(false);
    const withOwner = oneTalk({ ...upcoming, Owner: 'Mia' });
    expect(stepOf(withOwner, 'Anfrage').owner).toBe('Mia');
    const onsite = oneTalk({ ...upcoming, Format: 'vor Ort' });
    expect(stepOf(onsite, 'Raum/Zoom').owner).toBe('Lokale Orga');
    expect(stepOf(onsite, 'Apero').owner).toBe('Lokale Orga');
    const bpsa = oneTalk({ ...upcoming, Format: 'vor Ort', Reihe: 'BPSA-Lecture' });
    expect(stepOf(bpsa, 'Raum/Zoom').owner).toBe('Eric');
    expect(stepOf(bpsa, 'Apero').owner).toBe('BPSA-Orga');
  });

  it('Fälligkeit: Datum plus Tage; late und soon', () => {
    const t = oneTalk(upcoming); // 03.12., heute 26.11.
    expect(stepOf(t, 'Raum/Zoom').due).toEqual(new Date(2026, 10, 5));
    expect(stepOf(t, 'Raum/Zoom').late).toBe(true);
    expect(stepOf(t, 'Moderation')).toMatchObject({ late: false, soon: true }); // heute fällig
    expect(stepOf(t, 'Reminder')).toMatchObject({ late: false, soon: true }); // in 5 Tagen
    expect(stepOf(t, 'Durchgeführt')).toMatchObject({ late: false, soon: false }); // in 8 Tagen
    const done = stepOf(oneTalk({ ...upcoming, Moderation: 'Eric' }), 'Moderation');
    expect(done).toMatchObject({ late: false, soon: false });
  });

  it('ohne Datum keine Fälligkeit', () => {
    const t = oneTalk({ ...base, Status: 'fix' });
    expect(stepOf(t, 'Raum/Zoom')).toMatchObject({ due: null, late: false, soon: false });
  });
});

describe('Flags', () => {
  const upcoming = { ...base, Datum: '03.12.2026', Status: 'fix' };

  it('keine Flags bei abgesagt', () => {
    expect(oneTalk({ ...upcoming, Status: 'abgesagt' }).flags).toEqual([]);
  });

  it('Überfällig (crit) mit Owner, Bald fällig (warn) mit Datum', () => {
    const t = oneTalk(upcoming);
    const late = flagOf(t, 'Überfällig');
    expect(late?.level).toBe('crit');
    expect(late?.why).toContain('Raum bzw. Zoom organisiert (Polina)');
    expect(late?.why).toContain('Grafik und Ankündigung online (Stela)');
    const soon = flagOf(t, 'Bald fällig');
    expect(soon?.level).toBe('warn');
    expect(soon?.why).toContain('Moderation steht bis 26.11.');
    expect(soon?.why).toContain('Speaker erinnert, Technik geklärt bis 01.12.');
  });

  it('Owner fehlt (crit) bei offenem Schritt ohne Owner, weg mit Log-Owner', () => {
    expect(flagOf(oneTalk(upcoming), 'Owner fehlt')).toMatchObject({
      level: 'crit',
      why: 'Aufnahme geschnitten, auf YouTube',
    });
    const t = oneTalk(upcoming, {
      steps: [{ Talk: '03.12.2026 · Anna Beispiel', Schritt: 'YouTube', Owner: 'Lennert' }],
    });
    expect(flagOf(t, 'Owner fehlt')).toBeUndefined();
  });

  it('Ort fehlt: crit ≤7 Tage, warn ≤21, sonst nichts', () => {
    const f = (Datum: string, extra: Record<string, string> = {}) =>
      flagOf(oneTalk({ ...base, Format: 'vor Ort', Status: 'fix', Datum, ...extra }), 'Ort fehlt');
    expect(f('03.12.2026')?.level).toBe('crit'); // 7 Tage
    expect(f('15.12.2026')?.level).toBe('warn'); // 19 Tage
    expect(f('17.12.2026')?.level).toBe('warn'); // 21 Tage
    expect(f('18.12.2026')).toBeUndefined(); // 22 Tage
    expect(f('03.12.2026', { Ort: 'Raum 1' })).toBeUndefined();
    expect(flagOf(oneTalk(upcoming), 'Ort fehlt')).toBeUndefined(); // online
    expect(f('04.11.2026')).toBeUndefined(); // vergangen
  });

  it('Abstract fehlt: nur anstehend und ≤21 Tage', () => {
    expect(flagOf(oneTalk(upcoming), 'Abstract fehlt')?.level).toBe('warn');
    expect(flagOf(oneTalk({ ...upcoming, Abstract: 'Text' }), 'Abstract fehlt')).toBeUndefined();
    expect(flagOf(oneTalk({ ...upcoming, Datum: '18.12.2026' }), 'Abstract fehlt')).toBeUndefined();
    expect(flagOf(oneTalk({ ...upcoming, Datum: '04.11.2026' }), 'Abstract fehlt')).toBeUndefined();
  });

  it('Freigabe (crit): YouTube-Link trotz Veröffentlichung = nein', () => {
    const t = oneTalk({
      ...base,
      Datum: '04.11.2026',
      Status: 'veröffentlicht',
      'YouTube-Link': 'https://youtu.be/demo',
      Veröffentlichung: 'nein',
    });
    expect(flagOf(t, 'Freigabe')?.level).toBe('crit');
  });

  it('Status: YouTube-Link, aber nicht veröffentlicht, mit Fix', () => {
    const t = oneTalk({
      ...base,
      Datum: '04.11.2026',
      Status: 'durchgeführt',
      'YouTube-Link': 'https://youtu.be/demo',
      'TN gesamt': '10',
    });
    const f = flagOf(t, 'Status');
    expect(f?.level).toBe('warn');
    expect(f?.fix).toEqual({
      set: { Status: 'veröffentlicht' },
      label: 'Status auf veröffentlicht',
    });
    const ok = oneTalk({
      ...base,
      Datum: '04.11.2026',
      Status: 'veröffentlicht',
      'YouTube-Link': 'https://youtu.be/demo',
      'TN gesamt': '10',
    });
    expect(flagOf(ok, 'Status')).toBeUndefined();
  });

  it('Status: vergangen, aber noch fix/angefragt/Idee/leer, mit Fix', () => {
    for (const Status of ['fix', 'angefragt', 'Idee', '']) {
      const f = flagOf(oneTalk({ ...base, Datum: '04.11.2026', Status }), 'Status');
      expect(f?.fix?.set).toEqual({ Status: 'durchgeführt' });
    }
    const done = oneTalk({ ...base, Datum: '04.11.2026', Status: 'durchgeführt' });
    expect(flagOf(done, 'Status')).toBeUndefined();
  });

  it('Zahlen: vergangen ohne Teilnehmende', () => {
    const past = { ...base, Datum: '04.11.2026', Status: 'durchgeführt' };
    expect(flagOf(oneTalk(past), 'Zahlen')?.level).toBe('warn');
    expect(flagOf(oneTalk({ ...past, 'TN gesamt': '20' }), 'Zahlen')).toBeUndefined();
    expect(
      flagOf(oneTalk({ ...past, 'TN vor Ort': '5', 'TN online': '7' }), 'Zahlen'),
    ).toBeUndefined();
    expect(flagOf(oneTalk(upcoming), 'Zahlen')).toBeUndefined();
  });

  it('Speaker: fehlt im Tab Speaker', () => {
    expect(flagOf(oneTalk(upcoming), 'Speaker')?.why).toContain(
      'Anna Beispiel fehlt im Tab Speaker',
    );
    const known = oneTalk(upcoming, { speakers: [{ Name: 'Dr. Anna Beispiel' }] });
    expect(flagOf(known, 'Speaker')).toBeUndefined();
  });

  it('Schreibweise: Name weicht um einen Buchstaben von der E-Mail ab', () => {
    const t = oneTalk(
      { ...upcoming, Speaker: 'Nils Kampmann' },
      { speakers: [{ Name: 'Nils Kampmann', 'E-Mail': 'nils.kampman@example.org' }] },
    );
    expect(flagOf(t, 'Schreibweise')?.why).toContain('kampman');
    const fine = oneTalk(
      { ...upcoming, Speaker: 'Nils Kampmann' },
      { speakers: [{ Name: 'Nils Kampmann', 'E-Mail': 'nils.kampmann@example.org' }] },
    );
    expect(flagOf(fine, 'Schreibweise')).toBeUndefined();
  });
});

describe('Zuordnung', () => {
  const upcoming = { ...base, Datum: '03.12.2026', Status: 'fix' };

  it('Speaker je Name, Doppel-Speaker', () => {
    const t = oneTalk(
      { ...upcoming, Speaker: 'Anna Beispiel und Bernd Muster' },
      { speakers: [{ Name: 'A. Beispiel' }] },
    );
    expect(t.names).toEqual(['Anna Beispiel', 'Bernd Muster']);
    expect(t.speakers[0]?.speaker?.name).toBe('A. Beispiel');
    expect(t.speakers[1]?.speaker).toBeNull();
  });

  it('Formular: gleiche E-Mail (auch bei anderem Namen), letzte Antwort gewinnt', () => {
    const t = oneTalk(upcoming, {
      speakers: [{ Name: 'Anna Beispiel', 'E-Mail': 'Anna@Example.org' }],
      speakerForm: [
        {
          'Vollständiger Name / Full name': 'Anna B.',
          'E-Mail': 'anna@example.org',
          Zeitstempel: 'alt',
        },
        { 'Vollständiger Name / Full name': 'Anna Beispiel', 'E-Mail': '', Zeitstempel: 'neu' },
        { 'Vollständiger Name / Full name': 'Jemand Anderes', 'E-Mail': 'x@example.org' },
      ],
    });
    expect(t.speakers[0]?.form?.['Zeitstempel']).toBe('neu');
  });

  it('Lecture-Zeilen zählen nur mit Speaker oder Titel; Titel-Platzhalter', () => {
    const m = modelOf({
      lectures: [{ Datum: '03.12.2026' }, { Titel: 'Nur Titel' }, { Speaker: 'Nur Speaker' }],
    });
    expect(m.talks.map((t) => t.title)).toEqual(['Nur Titel', '(ohne Titel)']);
    expect(m.talks[0]?.key).toBe('ohne Datum · ');
    expect(m.talks[0]?.row).toBe(3);
  });

  it('Log: exakter Schlüssel', () => {
    const t = oneTalk(upcoming, {
      steps: [{ Talk: '03.12.2026 · Anna Beispiel', Schritt: 'Recap', Status: 'erledigt' }],
    });
    expect(t.log).toHaveLength(1);
  });

  it('Log: Fallback über Speaker-Namen, nur wenn genau ein Talk passt', () => {
    const unique = oneTalk(upcoming, {
      steps: [{ Talk: '01.12.2026 · A. Beispiel', Schritt: 'Recap', Status: 'erledigt' }],
    });
    expect(unique.log).toHaveLength(1);

    const m = modelOf({
      lectures: [
        { ...base, Datum: '03.12.2026', Status: 'fix' },
        { ...base, Datum: '15.12.2026', Status: 'fix' },
      ],
      steps: [
        { Talk: '01.12.2026 · Anna Beispiel', Schritt: 'Recap', Status: 'erledigt' },
        { Talk: '15.12.2026 · Anna Beispiel', Schritt: 'Recap', Status: 'erledigt' },
      ],
    });
    expect(m.talks[0]?.log).toHaveLength(0); // mehrdeutig, bleibt unzugeordnet
    expect(m.talks[1]?.log).toHaveLength(1); // exakter Treffer
  });

  it('Log: Zeilen ohne Talk oder Schritt fallen weg', () => {
    const t = oneTalk(upcoming, {
      steps: [
        { Talk: '03.12.2026 · Anna Beispiel', Schritt: '' },
        { Talk: '', Schritt: 'Recap' },
      ],
    });
    expect(t.log).toHaveLength(0);
  });

  it('Berichte: Lecture-Feld mit Datum und Speaker', () => {
    const m = modelOf({
      lectures: [upcoming, { ...upcoming, Datum: '15.12.2026' }],
      reports: [
        { Lecture: '03.12.2026 · Anna Beispiel' },
        { Lecture: 'ohne Datum · Anna Beispiel' },
        { Lecture: '03.12.2026 · Bernd Muster' },
      ],
    });
    expect(m.talks[0]?.reports).toHaveLength(2); // Datum passt; „ohne Datum“ passt auf beide
    expect(m.talks[1]?.reports).toHaveLength(1);
  });

  it('Berichte: „Falls nicht in der Liste“ mit gleichem Datum und Nachname', () => {
    const fallback = {
      Lecture: '',
      'Falls nicht in der Liste: Datum': '03.12.2026',
      'Falls nicht in der Liste: Speaker und Titel': 'Beispiel, Impulsvortrag',
    };
    expect(oneTalk(upcoming, { reports: [fallback] }).reports).toHaveLength(1);
    const wrongDate = { ...fallback, 'Falls nicht in der Liste: Datum': '04.12.2026' };
    expect(oneTalk(upcoming, { reports: [wrongDate] }).reports).toHaveLength(0);
    const wrongName = {
      ...fallback,
      'Falls nicht in der Liste: Speaker und Titel': 'Muster, Vortrag',
    };
    expect(oneTalk(upcoming, { reports: [wrongName] }).reports).toHaveLength(0);
  });

  it('next: frühester anstehender, nicht abgesagter Talk', () => {
    const m = modelOf({
      lectures: [
        { ...base, Datum: '15.12.2026', Status: 'fix', Speaker: 'C' },
        { ...base, Datum: '28.11.2026', Status: 'abgesagt', Speaker: 'B' },
        { ...base, Datum: '03.12.2026', Status: 'fix', Speaker: 'A' },
        { ...base, Datum: '01.11.2026', Status: 'durchgeführt', Speaker: 'Z' },
      ],
    });
    expect(m.next?.names).toEqual(['A']);
    expect(modelOf({ lectures: [] }).next).toBeNull();
  });
});

describe('findLectureRow', () => {
  const values = table(LECTURE_HEADERS, [
    { Datum: '03.12.2026', Speaker: 'Anna Beispiel' },
    { Datum: '03.12.2026', Speaker: 'Dr. Bernd Muster' },
    { Datum: '', Speaker: 'Lotte Sander' },
  ]);
  it('exakte Speaker-Zelle, Zeile 1 = Kopf', () => {
    expect(findLectureRow(values, '03.12.2026 · Anna Beispiel')).toBe(2);
  });
  it('sonst nameMatch bei gleichem Datum', () => {
    expect(findLectureRow(values, '03.12.2026 · Bernd Muster')).toBe(3);
  });
  it('Datum muss passen', () => {
    expect(findLectureRow(values, '04.12.2026 · Anna Beispiel')).toBeNull();
  });
  it('ohne Datum', () => {
    expect(findLectureRow(values, 'ohne Datum · Lotte Sander')).toBe(4);
    expect(findLectureRow(values, 'ohne Datum · Anna Beispiel')).toBeNull();
  });
  it('null bei fehlender Spalte oder leerer Tabelle', () => {
    expect(findLectureRow([['Titel']], '03.12.2026 · X')).toBeNull();
    expect(findLectureRow([], '03.12.2026 · X')).toBeNull();
  });
  it('exakter Treffer geht vor nameMatch', () => {
    const v = table(LECTURE_HEADERS, [
      { Datum: '03.12.2026', Speaker: 'Dr. Anna Beispiel' },
      { Datum: '03.12.2026', Speaker: 'Anna Beispiel' },
    ]);
    expect(findLectureRow(v, '03.12.2026 · Anna Beispiel')).toBe(3);
  });
  it('Talk ohne Speaker: nie eine Leerzeile treffen', () => {
    const v = table(LECTURE_HEADERS, [
      { Datum: '', Speaker: '', Titel: '' },
      { Datum: '', Speaker: '', Titel: 'Idee Mikrodosierung' },
    ]);
    expect(findLectureRow(v, 'ohne Datum · ')).toBe(3);
  });
  it('mehrdeutiger Schlüssel: null statt der ersten Zeile', () => {
    const v = table(LECTURE_HEADERS, [
      { Datum: '', Speaker: '', Titel: 'Idee A' },
      { Datum: '', Speaker: '', Titel: 'Idee B' },
    ]);
    expect(findLectureRow(v, 'ohne Datum · ')).toBeNull();
    const twice = table(LECTURE_HEADERS, [
      { Datum: '03.12.2026', Speaker: 'Anna Beispiel' },
      { Datum: '03.12.2026', Speaker: 'Anna Beispiel' },
    ]);
    expect(findLectureRow(twice, '03.12.2026 · Anna Beispiel')).toBeNull();
  });
});

describe('Lücken', () => {
  it('Monate der nächsten 4 ohne Talk, abgesagte zählen nicht', () => {
    const m = modelOf({
      lectures: [
        { ...base, Datum: '03.12.2026', Status: 'fix' },
        { ...base, Datum: '10.02.2027', Status: 'abgesagt' },
        { ...base, Datum: '15.11.2026', Status: 'durchgeführt' }, // laufender Monat zählt nicht
      ],
    });
    expect(m.gaps).toEqual([new Date(2027, 0, 1), new Date(2027, 1, 1), new Date(2027, 2, 1)]);
  });
  it('gapsOf über Jahreswechsel', () => {
    expect(gapsOf([], new Date(2026, 10, 26))).toHaveLength(4);
    expect(
      gapsOf([{ date: new Date(2027, 0, 5), status: 'fix' }], new Date(2026, 10, 26)),
    ).toHaveLength(3);
  });
});

describe('actionItems', () => {
  const ytOwner = (key: string) => ({ Talk: key, Schritt: 'YouTube', Owner: 'Lennert' });
  const model = modelOf({
    lectures: [
      { ...base, Datum: '19.01.2027', Status: 'fix', Speaker: 'Nils Kampmann' }, // nur warn
      {
        ...base,
        Datum: '04.11.2026',
        Status: 'durchgeführt',
        Speaker: 'Paula Past',
        'TN gesamt': '9',
      },
      { ...base, Datum: '15.12.2026', Status: 'fix', Speaker: 'Fritz Fern' },
      { ...base, Datum: '03.12.2026', Status: 'fix', Speaker: 'Nora Nah' },
      { ...base, Datum: '17.12.2026', Status: 'abgesagt', Speaker: 'Abi Abgesagt' },
    ],
    steps: [ytOwner('19.01.2027 · Nils Kampmann')],
  });
  const items = actionItems(model, TODAY);

  it('crit vor warn, anstehend vor vergangen, nah vor fern, Lücken zuletzt', () => {
    expect(items.map((i) => i.label)).toEqual([
      '03.12. · Nora Nah',
      '15.12. · Fritz Fern',
      '04.11. · Paula Past',
      '19.01.27 · Nils Kampmann',
      'Februar 2027',
      'März 2027',
    ]);
    expect(items.map((i) => i.rank)).toEqual([0, 0, 0, 1, 1, 1]);
  });
  it('Lücken sind Semesterplan-Flags ohne Talk', () => {
    const gap = items[4];
    expect(gap?.talk).toBeNull();
    expect(gap?.flags[0]).toMatchObject({ level: 'warn', tag: 'Semesterplan' });
    expect(gap?.flags[0]?.why).toContain('Ziel laut SOP: ein Talk pro Monat');
  });
  it('abgesagte Talks tauchen nicht auf', () => {
    expect(items.some((i) => i.talk?.names.includes('Abi Abgesagt'))).toBe(false);
  });
});

describe('Kacheln', () => {
  const model = modelOf({
    lectures: [
      { ...base, Datum: '03.12.2026', Status: 'fix', Speaker: 'Nora Nah' },
      { ...base, Datum: '04.11.2026', Status: 'durchgeführt', Speaker: 'Paula Past' },
      { ...base, Datum: '17.12.2026', Status: 'abgesagt', Speaker: 'Abi Abgesagt' },
    ],
  });
  const count = (k: string): string[] =>
    model.talks
      .filter((t) => TALK_TILES.find((x) => x.k === k)?.test(t))
      .map((t) => t.names.join());

  it('hat die sieben Kacheln der Spezifikation in Reihenfolge', () => {
    expect(TALK_TILES.map((t) => t.k)).toEqual(['up', 'late', 'soon', 'own', 'dq', 'rec', 'held']);
    expect(TALK_TILES.map((t) => t.level)).toEqual([
      undefined,
      'crit',
      'warn',
      'crit',
      'warn',
      'warn',
      undefined,
    ]);
  });
  it('Prädikate', () => {
    expect(count('up')).toEqual(['Nora Nah']);
    expect(count('late')).toEqual(['Nora Nah', 'Paula Past']);
    expect(count('soon')).toEqual(['Nora Nah', 'Paula Past']); // Paula: Views fällig am 02.12.
    expect(count('own')).toEqual(['Nora Nah', 'Paula Past']);
    expect(count('dq')).toEqual(['Nora Nah', 'Paula Past']); // Speaker fehlt im Tab / Zahlen
    expect(count('rec')).toEqual(['Paula Past']);
    expect(count('held')).toEqual(['Paula Past']);
  });
});

describe('stats', () => {
  const model = modelOf({
    lectures: [
      {
        ...base,
        Datum: '04.11.2026',
        Status: 'durchgeführt',
        Speaker: 'B',
        'TN gesamt': '15',
        'Views nach 4 Wo.': '40',
      },
      {
        ...base,
        Datum: '01.10.2026',
        Status: 'veröffentlicht',
        Speaker: 'A',
        'TN vor Ort': '4',
        'TN online': '6',
      },
      { ...base, Datum: '03.12.2026', Status: 'fix', Speaker: 'C', 'TN gesamt': '99' },
      { ...base, Status: 'durchgeführt', Speaker: 'D' }, // ohne Datum: nicht in der Zahlen-Liste
    ],
  });
  it('gehaltene Talks mit Datum, älteste zuerst, Summen und Durchschnitt', () => {
    const s = stats(model);
    expect(s.rows.map((r) => r.talk.names.join())).toEqual(['A', 'B']);
    expect(s.rows.map((r) => r.tn)).toEqual([10, 15]);
    expect(s.rows.map((r) => r.views)).toEqual([0, 40]);
    expect(s.totalTn).toBe(25);
    expect(s.totalViews).toBe(40);
    expect(s.averageTn).toBe(13); // 12,5 gerundet
    expect(s.maxTn).toBe(15);
    expect(s.maxViews).toBe(40);
  });
  it('ohne gehaltene Talks', () => {
    const s = stats(modelOf({ lectures: [] }));
    expect(s).toMatchObject({ rows: [], totalTn: 0, averageTn: null, maxTn: 1, maxViews: 1 });
  });
});

describe('speakerPool', () => {
  const model = modelOf({
    lectures: [
      { ...base, Datum: '04.11.2026', Status: 'durchgeführt', Speaker: 'Zoe Zett' },
      { ...base, Datum: '03.12.2026', Status: 'fix', Speaker: 'Ida Idee' },
    ],
    speakers: [
      { Name: 'Zoe Zett', Status: 'gesprochen', Endorsement: 'ja' },
      { Name: 'Yara Ypsilon', Status: 'gesprochen', Endorsement: 'offen' },
      { Name: 'Ida Idee', Status: 'zugesagt' },
      { Name: 'Max Mystery', Status: 'Wunsch' },
      { Name: 'Nina Nichts' },
      { Name: 'Ben Bereit', Status: 'Idee' },
    ],
  });
  const pool = speakerPool(model);
  it('Status-Kacheln: bekannte in Reihenfolge, unbekannte danach', () => {
    expect(pool.statuses).toEqual([
      { status: 'Idee', count: 1 },
      { status: 'zugesagt', count: 1 },
      { status: 'gesprochen', count: 2 },
      { status: 'Wunsch', count: 1 },
      { status: 'ohne Status', count: 1 },
    ]);
  });
  it('Endorsements unter den gesprochenen', () => {
    expect(pool.endorsements).toEqual({ yes: 1, spoken: 2 });
    expect(
      speakerPool(modelOf({ speakers: [{ Name: 'X', Status: 'Idee' }] })).endorsements,
    ).toBeNull();
  });
  it('Einträge: weiterer Status zuerst, dann Name; mit Talk-Verknüpfung', () => {
    expect(pool.entries.map((e) => e.speaker.name)).toEqual([
      'Yara Ypsilon',
      'Zoe Zett',
      'Ida Idee',
      'Ben Bereit',
      'Max Mystery',
      'Nina Nichts',
    ]);
    expect(pool.entries.find((e) => e.speaker.name === 'Ida Idee')?.talk?.key).toBe(
      '03.12.2026 · Ida Idee',
    );
    expect(pool.entries.find((e) => e.speaker.name === 'Yara Ypsilon')?.talk).toBeNull();
  });
});
