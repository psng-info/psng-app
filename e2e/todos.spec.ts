import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Die Demo-Daten gehen von heute = 26.11.2026 aus.
  await page.clock.setFixedTime(new Date(2026, 10, 26, 10, 0));
  await page.goto('/#/todos');
  await expect(page.getByRole('heading', { name: 'Lage' })).toBeVisible();
});

test('Kachel filtert die Liste, Chip entfernt den Filter', async ({ page }) => {
  const count = page.getByRole('heading', { name: /^Liste/ });
  await expect(count).toContainText('24');
  await page.getByRole('button', { name: /Überfällig/ }).click();
  await expect(count).toContainText('2');
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('button', { name: 'Filter entfernen: Kachel: Überfällig' }).click();
  await expect(count).toContainText('24');
});

test('To-do abhaken', async ({ page }) => {
  await page.getByRole('checkbox', { name: /Als erledigt markieren: Heute fälliges/ }).click();
  await expect(page.getByRole('article', { name: /T116/ })).toHaveCount(0);
  await page.getByLabel('Erledigte anzeigen').check();
  const card = page.getByRole('article', { name: /T116/ });
  await expect(card).toContainText('erledigt 26.11.2026');
});

test('Neues To-do anlegen', async ({ page }) => {
  await page.getByRole('button', { name: 'Neues To-do' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('To-do', { exact: true }).fill('Poster für Dezember drucken');
  await sheet.getByLabel('Prio').selectOption('A');
  await sheet.getByRole('button', { name: 'Anlegen' }).click();
  await expect(sheet.getByText('Prio A braucht eine Deadline.')).toBeVisible();
  await sheet.getByLabel('Deadline').fill('2026-12-02');
  await sheet.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.getByRole('article', { name: /T118 Poster/ })).toBeVisible();
  await expect(page.getByRole('article', { name: /T118/ })).toContainText('App 26.11.2026');
});
