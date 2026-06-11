import { expect, test } from '@playwright/test';

test('renders the scaffold shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#render-canvas')).toBeVisible();
  await expect(page.getByTestId('status')).toHaveText('Ready');
});
