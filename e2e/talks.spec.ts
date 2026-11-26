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
