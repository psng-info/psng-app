import { expect, test } from '@playwright/test';

test('Offline: Stand im Kopf, Schreib-Aktionen gesperrt, online wieder frei', async ({
  page,
  context,
}) => {
  await page.goto('/#/todos');
  const neu = page.getByRole('button', { name: 'Neues To-do' });
  await expect(neu).toBeEnabled();

  await context.setOffline(true);
  await expect(page.getByText(/^Offline, Stand \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/)).toBeVisible();
  await expect(
    page.getByText('Offline: Änderungen sind erst mit Verbindung möglich.'),
  ).toBeVisible();
  await expect(neu).toBeDisabled();
  await expect(
    page.getByRole('checkbox', { name: /Als erledigt markieren/ }).first(),
  ).toBeDisabled();

  await context.setOffline(false);
  await expect(neu).toBeEnabled();
  await expect(page.getByText(/^Offline, Stand/)).toHaveCount(0);
});
