import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const VIEWS = ['talks', 'todos', 'kandidaten'] as const;
const SCHEMES = ['light', 'dark'] as const;

async function setScheme(page: Page, scheme: (typeof SCHEMES)[number]): Promise<void> {
  await page.addInitScript((s) => localStorage.setItem('psng-theme', s), scheme);
}

for (const scheme of SCHEMES) {
  for (const view of VIEWS) {
    test(`axe: #/${view} (${scheme}) ohne schwere Verstöße`, async ({ page }) => {
      await setScheme(page, scheme);
      await page.goto(`/#/${view}`);
      await expect(page.locator('h2').first()).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      if (view === 'talks') {
        // Alle Karten öffnen, damit Ablauf und Eckdaten mitgeprüft werden.
        const closed = page.locator('details:not([open]) > summary');
        while ((await closed.count()) > 0) await closed.first().click();
      }
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const bad = result.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(
        bad.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.slice(0, 3).map((n) => n.target),
        })),
      ).toEqual([]);
    });
  }
}

test('Tastatur: Tab erreicht Navigation, Fokus ist sichtbar', async ({ page }) => {
  await page.goto('/#/todos');
  await expect(page.getByRole('heading', { name: 'To-dos', level: 2 })).toBeVisible();
  await page.keyboard.press('Tab');
  const outline = await page.evaluate<{ style: string; shadow: string } | null>(`(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    return { style: cs.outlineStyle, shadow: cs.boxShadow };
  })()`);
  expect(outline).not.toBeNull();
  expect(outline?.style !== 'none' || outline?.shadow !== 'none').toBe(true);
});

test('Sheet hält den Fokus und gibt ihn zurück', async ({ page }) => {
  await page.goto('/#/todos');
  const trigger = page.getByRole('button', { name: 'Neues To-do' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Mehrmals Tab: der Fokus bleibt im Dialog
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate<boolean>(
        `document.querySelector('[role=dialog]').contains(document.activeElement)`,
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
