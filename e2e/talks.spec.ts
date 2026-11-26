import { expect, test } from '@playwright/test';

test('Talks: Kachel filtern, Karte öffnen, Ablauf sehen', async ({ page }) => {
  await page.goto('/#/talks');
  await expect(page.getByRole('article', { name: 'Nächster Talk' })).toBeVisible();

  const tile = page.getByRole('button', { name: /^\d+\s*Gehalten/ });
  await tile.click();
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Filter entfernen: Kachel/ })).toBeVisible();

  const card = page.locator('details').first();
  await card.locator('summary').click();
  await expect(card).toHaveAttribute('open', '');
  await expect(card.getByRole('heading', { name: /^Ablauf/ })).toBeVisible();
  await expect(card.getByRole('button', { name: /Kontakt anzeigen/ })).toBeVisible();
});

test('Talks: kein horizontaler Überlauf bei 375px, auch mit offener Karte', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#/talks');
  await expect(page.getByRole('article', { name: 'Nächster Talk' })).toBeVisible();
  await page.locator('details summary').nth(1).click();
  await expect(page.locator('details[open]').first()).toBeVisible();
  const overflow = await page.evaluate<number>(
    'document.documentElement.scrollWidth - window.innerWidth',
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('Talks: Schritt-Owner ändern, Schritt abhaken, Verknüpfte To-dos (Demo)', async ({ page }) => {
  // Die Demo-Daten gehen von heute = 26.11.2026 aus.
  await page.clock.setFixedTime(new Date(2026, 10, 26, 10, 0));
  await page.goto('/#/talks');
  const card = page.locator('details[open]').first();
  await expect(card.getByRole('heading', { name: /^Ablauf/ })).toBeVisible();

  // Owner und Notiz im Bottom-Sheet ändern
  await card.getByRole('button', { name: /^Raum bzw\. Zoom organisiert bearbeiten/ }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('button', { name: 'Speichern' })).toBeDisabled();
  await sheet.getByLabel('Owner').selectOption('Lokale Orga');
  await sheet.getByLabel('Notiz').fill('Raum 3 reserviert');
  await sheet.getByRole('button', { name: 'Speichern' }).click();
  await expect(sheet).toBeHidden();
  await expect(
    card.getByRole('button', { name: 'Raum bzw. Zoom organisiert bearbeiten, Owner: Lokale Orga' }),
  ).toBeVisible();
  await expect(card.getByText('Raum 3 reserviert')).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Gespeichert: Raum/Zoom.' }),
  ).toBeVisible();

  // Schritt direkt abhaken: der Fortschritt steigt
  const progress = card.getByRole('heading', { name: /^Ablauf/ });
  const before = Number(/(\d+) von/.exec((await progress.textContent()) ?? '')?.[1]);
  const box = card.getByRole('checkbox', { name: /^Als erledigt markieren:/ }).first();
  const label = (await box.getAttribute('aria-label')) ?? '';
  await box.click();
  await expect(card.getByRole('heading', { name: /^Ablauf/ })).toContainText(`${before + 1} von`);
  await expect(card.getByRole('checkbox', { name: label })).toHaveCount(0);

  // Eckdaten: Ort ändern
  await card.getByRole('button', { name: 'Eckdaten bearbeiten' }).click();
  await sheet.getByLabel('Ort', { exact: true }).fill('Seminarraum 12');
  await sheet.getByRole('button', { name: 'Speichern' }).click();
  await expect(card.getByText('Seminarraum 12')).toBeVisible();
});

test('Talks: Verknüpfte To-dos führen zum To-do', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 26, 10, 0));
  await page.goto(`/#/talks/${encodeURIComponent('03.12.2026 · Selina Marquardt')}`);
  const card = page.locator('details[open]').first();
  await expect(card.getByRole('heading', { name: /^Verknüpfte To-dos \(1\)/ })).toBeVisible();
  await card.getByRole('link', { name: /T61/ }).click();
  await expect(page).toHaveURL(/#\/todos\/T61$/);
  await expect(page.getByRole('article', { name: /T61/ })).toBeFocused();
});
