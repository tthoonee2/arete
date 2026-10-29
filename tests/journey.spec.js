const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.view.active')).toHaveAttribute('id', 'v-home');
});

test('Budget lock calculates and transfers a zero-cost case to the quote builder', async ({ page }) => {
  await page.goto('/index.html#budget');
  await expect(page.locator('#v-budget')).toBeVisible();
  await page.locator('#budget-market').selectOption('brent');
  await page.locator('#budget-price').fill('75');
  await page.locator('#budget-volume').fill('12000');
  await page.locator('#budget-months').selectOption('6');
  await page.locator('input[name="structure"][value="zero_cost"]').check();
  await page.locator('#budget-calculate').click();
  await expect(page.locator('#budget-cost')).toHaveText('$0');
  await expect(page.locator('#budget-open-quote')).toBeEnabled();
  await expect(page.locator('#budget-chart')).toHaveAttribute('aria-label', /Without protection/);
  await page.locator('#budget-open-quote').click();
  await expect(page.locator('#v-price')).toBeVisible();
  await expect(page.locator('#state-usage, #usage')).first().toBeVisible();
});

test('Keyboard repricing, demo sign-in and protection confirmation journey', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/index.html#price');
  await expect(page.locator('#v-price')).toBeVisible();
  const firstSlider = page.locator('#v-price .sl-h').first();
  await firstSlider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await expect(page.locator('.modal-back.open')).toBeVisible();
  const modal = page.locator('.modal-back.open');
  const email = modal.locator('input[type="email"]');
  if (await email.count()) await email.fill('demo@example.com');
  const submit = modal.getByRole('button', { name: /sign in|continue|demo/i }).last();
  await submit.click();
  await expect(page.locator('.modal-back.open')).toHaveCount(0);
  const protect = page.getByRole('button', { name: /protect|confirm|get protection/i }).last();
  if (await protect.count()) {
    await protect.click();
    await expect(page.locator('body')).toContainText(/risk desk|confirmation|request/i);
  }
  expect(errors).toEqual([]);
});

test('Budget lock has no horizontal overflow on a 375px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/index.html#budget');
  await page.locator('#budget-calculate').click();
  await expect(page.locator('#budget-open-quote')).toBeEnabled();
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  await expect(page.locator('#budget-calculate')).toBeVisible();
});
