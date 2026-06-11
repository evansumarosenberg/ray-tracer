import { expect, test } from '@playwright/test';

test('renders the scaffold shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#render-canvas')).toBeVisible({ timeout: 3_000 });
  await expect(page.getByTestId('status')).toBeVisible();
});
