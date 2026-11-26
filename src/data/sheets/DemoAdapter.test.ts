import { describe, expect, it } from 'vitest';
import { RANGES, SHEET_IDS } from '../config';
import { DemoAdapter } from './DemoAdapter';
import { SheetsError } from './SheetsAdapter';

describe('DemoAdapter', () => {
  it('ordnet Bereiche über den Tab-Namen den Fixtures zu', async () => {
    const demo = new DemoAdapter(0);
    const r = RANGES.talks;
    const [lectures, speakers, steps, reports, form] = await demo.batchGet(SHEET_IDS.lectures, [
      r.lectures,
      r.speakers,
      r.steps,
      r.reports,
      r.speakerForm,
    ]);
    expect(lectures?.[0]).toContain('Datum');
    expect(speakers?.[0]).toContain('Name');
    expect(steps?.[0]).toContain('Schritt');
    expect(reports?.length).toBeGreaterThan(1);
    expect(form?.length).toBeGreaterThan(1);
    const [todos] = await demo.batchGet(SHEET_IDS.todos, [RANGES.todos]);
    expect(todos?.length).toBeGreaterThan(5);
    const [kand, abbr, formular, notizen] = await demo.batchGet(SHEET_IDS.hr, [
      RANGES.hr.kandidaten,
      RANGES.hr.abbrueche,
      RANGES.hr.formular,
      RANGES.hr.notizen,
    ]);
    expect([kand, abbr, formular, notizen].every((v) => (v?.length ?? 0) > 1)).toBe(true);
  });

  it('liefert die Demo-Zugangsliste', async () => {
    const [access] = await new DemoAdapter(0).batchGet(SHEET_IDS.lectures, [RANGES.access]);
    expect(access?.[1]).toEqual(['demo@example.org', 'Demo', 'kern, hr, admin']);
  });

  it('Schreiben ändert nur die Kopie im Speicher', async () => {
    const demo = new DemoAdapter(0);
    await demo.updateCell(SHEET_IDS.lectures, 'Lectures!B2', 'Neuer Wert');
    await demo.append(SHEET_IDS.lectures, "'Talk-Schritte'!A1", ['a', true]);
    const [lectures, steps] = await demo.batchGet(SHEET_IDS.lectures, [
      RANGES.talks.lectures,
      RANGES.talks.steps,
    ]);
    expect(lectures?.[1]?.[1]).toBe('Neuer Wert');
    expect(steps?.at(-1)).toEqual(['a', 'TRUE']);
    const fresh = await new DemoAdapter(0).batchGet(SHEET_IDS.lectures, [RANGES.talks.lectures]);
    expect(fresh[0]?.[1]?.[1]).not.toBe('Neuer Wert');
  });

  it('unbekannter Tab: not_found', async () => {
    await expect(
      new DemoAdapter(0).batchGet(SHEET_IDS.lectures, ['Nope!A1:B2']),
    ).rejects.toBeInstanceOf(SheetsError);
  });
});
