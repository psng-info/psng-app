import type { Values } from '@/domain/rows';
import { SHEET_IDS, TABS } from '../config';
import { SheetsError, type SheetsAdapter } from './SheetsAdapter';
import { parseCell, splitRange } from './table';

interface TalksFixture {
  lectures: Values;
  speakers: Values;
  steps: Values;
  reports: Values;
  speakerForm: Values;
}
interface TodosFixture {
  todos: Values;
}
interface HrFixture {
  kandidaten: Values;
  abbrueche: Values;
  formular: Values;
  notizen: Values;
}

export const DEMO_EMAIL = 'demo@example.org';

const DEMO_ACCESS: Values = [
  ['E-Mail', 'Name', 'Rollen'],
  [DEMO_EMAIL, 'Demo', 'kern, hr, admin'],
];

/** Fixtures werden nur im Demo-Build mitgeliefert: bei `VITE_DATA=sheets` fällt dieser Zweig weg. */
async function loadFixtures(): Promise<Map<string, Values>> {
  if (import.meta.env.VITE_DATA === 'sheets') {
    throw new SheetsError('unknown', 'Demo-Daten sind in diesem Build nicht enthalten.');
  }
  const [talks, todos, hr] = await Promise.all([
    import('../../../tests/fixtures/talks.json'),
    import('../../../tests/fixtures/todos.json'),
    import('../../../tests/fixtures/hr.json'),
  ]);
  const t: TalksFixture = talks.default;
  const d: TodosFixture = todos.default;
  const h: HrFixture = hr.default;
  const key = (id: string, tab: string) => `${id}|${tab}`;
  return new Map<string, Values>([
    [key(SHEET_IDS.lectures, TABS.lectures), t.lectures],
    [key(SHEET_IDS.lectures, TABS.speaker), t.speakers],
    [key(SHEET_IDS.lectures, TABS.steps), t.steps],
    [key(SHEET_IDS.lectures, TABS.reports), t.reports],
    [key(SHEET_IDS.lectures, TABS.speakerForm), t.speakerForm],
    [key(SHEET_IDS.lectures, TABS.access), DEMO_ACCESS],
    [key(SHEET_IDS.todos, TABS.todos), d.todos],
    [key(SHEET_IDS.hr, TABS.kandidaten), h.kandidaten],
    [key(SHEET_IDS.hr, TABS.abbrueche), h.abbrueche],
    [key(SHEET_IDS.hr, TABS.formular), h.formular],
    [key(SHEET_IDS.hr, TABS.notizen), h.notizen],
  ]);
}

const copy = (v: Values): Values => v.map((r) => [...r]);

/** Liest die Fixtures, schreibt nur in eine Kopie im Speicher (nach Neuladen wieder weg). */
export class DemoAdapter implements SheetsAdapter {
  private store: Promise<Map<string, Values>> | null = null;

  constructor(private readonly delayMs = 150) {}

  private data(): Promise<Map<string, Values>> {
    this.store ??= loadFixtures().then((m) => new Map([...m].map(([k, v]) => [k, copy(v)])));
    return this.store;
  }

  private async tab(spreadsheetId: string, range: string): Promise<Values> {
    const { tab } = splitRange(range);
    const found = (await this.data()).get(`${spreadsheetId}|${tab}`);
    if (!found) throw new SheetsError('not_found', 'Tab oder Bereich nicht gefunden.');
    return found;
  }

  private wait(): Promise<void> {
    return this.delayMs > 0 ? new Promise((r) => setTimeout(r, this.delayMs)) : Promise.resolve();
  }

  async batchGet(spreadsheetId: string, ranges: string[]): Promise<Values[]> {
    await this.wait();
    return Promise.all(ranges.map(async (r) => copy(await this.tab(spreadsheetId, r))));
  }

  async updateCell(spreadsheetId: string, a1: string, value: string | boolean): Promise<void> {
    await this.wait();
    const values = await this.tab(spreadsheetId, a1);
    const cell = parseCell(splitRange(a1).cells);
    if (!cell) throw new SheetsError('unknown', 'Zelle ungültig.');
    const row = (values[cell.row - 1] ??= []);
    while (row.length < cell.col) row.push('');
    row[cell.col] = typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : value;
  }

  async append(spreadsheetId: string, range: string, row: (string | boolean)[]): Promise<void> {
    await this.wait();
    const values = await this.tab(spreadsheetId, range);
    values.push(row.map((c) => (typeof c === 'boolean' ? (c ? 'TRUE' : 'FALSE') : c)));
  }
}
