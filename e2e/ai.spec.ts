import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Mit VITE_AI=on und Demo-Daten: der Planer ist ein Mock ohne Netzwerk (siehe playwright.config.ts).
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 26, 10, 0));
  await page.goto('/#/todos');
  await expect(page.getByRole('heading', { name: 'Lage' })).toBeVisible();
});

test('Vormerken, Vorschau, abwählen, schreiben', async ({ page }) => {
  await page.getByRole('button', { name: /Für Claude vormerken: T116/ }).click();
  const note = page.getByRole('dialog');
  await note.getByLabel(/Was gibt es Neues/).fill('Ist erledigt, Poster hängt');
  await note.getByRole('button', { name: 'Vormerken' }).click();

  const dock = page.getByRole('region', { name: 'Für Claude vorgemerkt' });
  await expect(dock).toContainText('1 vorgemerkt');
  // Vor dem Verarbeiten steht noch nichts im Sheet.
  await expect(page.getByRole('article', { name: /T116/ })).not.toContainText(
    'erledigt 26.11.2026',
  );

  await dock.getByRole('button', { name: 'Mit Claude verarbeiten' }).click();
  const preview = page.getByRole('dialog', { name: 'Vorschau' });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('T116');
  await expect(preview.locator('del', { hasText: 'offen' })).toBeVisible();
  await expect(preview.locator('ins', { hasText: 'erledigt' }).first()).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
    [],
  );

  await preview.getByRole('button', { name: 'Ins Sheet schreiben (1)' }).click();
  await expect(dock).toContainText('1 Änderung ins Sheet geschrieben.');
  await page.getByLabel('Erledigte anzeigen').check();
  await expect(page.getByRole('article', { name: /T116/ })).toContainText('erledigt 26.11.2026');
  await expect(page.getByRole('article', { name: /T116/ })).toContainText('26.11.: Ist erledigt');
});

test('Abgewählte Änderung wird nicht geschrieben', async ({ page }) => {
  await page.getByRole('button', { name: /Für Claude vormerken: T116/ }).click();
  await page
    .getByRole('dialog')
    .getByLabel(/Was gibt es Neues/)
    .fill('nur eine Info');
  await page.getByRole('dialog').getByRole('button', { name: 'Vormerken' }).click();
  await page.getByRole('button', { name: 'Mit Claude verarbeiten' }).click();
  const preview = page.getByRole('dialog', { name: 'Vorschau' });
  await preview.getByRole('checkbox', { name: /Übernehmen: T116/ }).click();
  await expect(preview.getByRole('button', { name: 'Ins Sheet schreiben (0)' })).toBeDisabled();
});

test('Freie Notiz: neues To-do, „Ergänzen/korrigieren“ ändert den Vorschlag', async ({ page }) => {
  await page.getByRole('button', { name: 'Freie Notiz für Claude vormerken' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Notiz', { exact: true })
    .fill('Flyer für Januar drucken');
  await page.getByRole('dialog').getByRole('button', { name: 'Vormerken' }).click();
  await page.getByRole('button', { name: 'Mit Claude verarbeiten' }).click();

  const preview = page.getByRole('dialog', { name: 'Vorschau' });
  await expect(preview).toContainText('Flyer für Januar drucken');
  await expect(preview).toContainText('Prio: B');

  await preview.getByLabel('Ergänzen oder korrigieren').fill('Prio A');
  await preview.getByRole('button', { name: 'Neu berechnen' }).click();
  await expect(preview).toContainText('Prio: A');
  await expect(preview).toContainText('Ergänzt: „Prio A“');

  await preview.getByRole('button', { name: /Ins Sheet schreiben \(1\)/ }).click();
  await expect(page.getByRole('article', { name: /T118 Flyer/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Für Claude vorgemerkt' })).toContainText(
    '1 Änderung ins Sheet geschrieben.',
  );
});

test('Vorgemerktes bleibt nach Neuladen, „Leeren“ räumt auf', async ({ page }) => {
  await page.getByRole('button', { name: /Für Claude vormerken: T116/ }).click();
  await page
    .getByRole('dialog')
    .getByLabel(/Was gibt es Neues/)
    .fill('merk dir das');
  await page.getByRole('dialog').getByRole('button', { name: 'Vormerken' }).click();
  await page.reload();
  const dock = page.getByRole('region', { name: 'Für Claude vorgemerkt' });
  await expect(dock).toContainText('1 vorgemerkt');
  await dock.getByRole('button', { name: 'Leeren' }).click();
  await expect(dock).toHaveCount(0);
});

test('Kandidat:innen und Talks: Vormerken ohne Kontaktdaten im Speicher', async ({ page }) => {
  await page.goto('/#/kandidaten');
  await expect(page.locator('h2').first()).toBeVisible();
  const btn = page.getByRole('button', { name: /^Für Claude vormerken:/ }).first();
  await btn.click();
  await page
    .getByRole('dialog')
    .getByLabel(/Was gibt es Neues/)
    .fill('Hat sich gemeldet');
  await page.getByRole('dialog').getByRole('button', { name: 'Vormerken' }).click();
  await expect(page.getByRole('region', { name: 'Für Claude vorgemerkt' })).toContainText(
    '1 Person',
  );
  // Notizen zu Personen werden nie im Browser gespeichert.
  const stored = await page.evaluate(() => localStorage.getItem('psng.ai.queue.v1'));
  expect(stored).not.toContain('Hat sich gemeldet');
});
