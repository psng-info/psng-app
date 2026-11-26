import { expect, test } from '@playwright/test';

test('App-Rahmen lädt und Tabs wechseln den Hash', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'PSNG Orga', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Talks', level: 2 })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Hauptnavigation', exact: true });
  await nav.getByRole('link', { name: 'To-dos' }).click();
  await expect(page).toHaveURL(/#\/todos$/);
  await expect(page.getByRole('heading', { name: 'To-dos', level: 2 })).toBeVisible();

  await nav.getByRole('link', { name: 'Kandidat:innen' }).click();
  await expect(page).toHaveURL(/#\/kandidaten$/);

  await nav.getByRole('link', { name: 'Talks' }).click();
  await expect(page).toHaveURL(/#\/talks$/);
});
