import { expect, test } from '@playwright/test';

test.describe('Kandidat:innen (Demo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/kandidaten');
    await expect(page.getByRole('heading', { name: 'Kandidat:innen', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible();
  });

  test('Pipeline-Kachel filtert die Personenliste', async ({ page }) => {
    const anselm = page.getByRole('article', { name: 'Anselm Rieder' });
    await expect(anselm).toBeVisible();
    await page.getByRole('button', { name: /Review/, pressed: false }).first().click();
    await expect(page.getByRole('article', { name: 'Konstantin Fehr' })).toBeVisible();
    await expect(anselm).toHaveCount(0);
    await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
    await expect(anselm).toBeVisible();
  });

  test('Kontaktdaten erst nach Klick sichtbar', async ({ page }) => {
    const card = page.getByRole('article', { name: 'Anselm Rieder' });
    await expect(page.locator('body')).not.toContainText('example.org');
    await card.getByRole('button', { name: 'Kontakt anzeigen' }).click();
    await expect(card.getByText('anselm.rieder@example.org')).toBeVisible();
    await card.getByRole('button', { name: 'Kontakt verbergen' }).click();
    await expect(page.locator('body')).not.toContainText('example.org');
  });

  test('Checklisten-Schritt abhaken schreibt und aktualisiert den Fortschritt', async ({ page }) => {
    const card = page.getByRole('article', { name: 'Marlene Oswald' });
    await card.getByText('Checkliste').click();
    const box = card.getByRole('checkbox', { name: /Aufgabe \/ Projekt vereinbart/ });
    await expect(box).not.toBeChecked();
    await box.click();
    await expect(box).toBeChecked();
    await expect(card.getByText(/Nächster Schritt: Regelmäßige Check-ins/)).toBeVisible();
  });

  test('Status per Bottom-Sheet ändern', async ({ page }) => {
    const card = page.getByRole('article', { name: 'Marlene Oswald' });
    await card.getByRole('button', { name: 'Status ändern' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Review', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(card.getByText('Review', { exact: true }).first()).toBeVisible();
  });
});
