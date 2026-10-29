const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.route("**/three.min.js", route => route.abort());
  await page.route("**/fonts.googleapis.com/**", route => route.abort());
  await page.route("**/fonts.gstatic.com/**", route => route.abort());
});

test("budget lock calculates a range and transfers to the quote builder", async ({ page }) => {
  await page.goto("/#budget");
  await expect(page.getByRole("heading", { name: "Turn a budget into a ceiling." })).toBeVisible();
  await page.locator("#budget-market").selectOption("diesel");
  await page.locator("#budget-price").fill("0.650");
  await page.locator("#budget-volume").fill("200000");
  await page.locator("#budget-months").selectOption("6");
  await page.getByRole("button", { name: "Calculate budget lock" }).click();
  await expect(page.locator("#budget-output")).toBeVisible();
  await expect(page.locator("#budget-result-title")).toHaveText("Diesel & heating oil");
  await expect(page.locator(".budget-chart-row")).toHaveCount(2);
  await expect(page.locator("#budget-chance")).toContainText("%");
  await page.getByRole("button", { name: "Open in quote builder" }).click();
  await expect(page).toHaveURL(/#price$/);
  await expect(page.locator("#tk-title")).toHaveText("Diesel & heating oil");
  await expect(page.locator("#usage")).toHaveValue("200000");
});

test("main journey places a protection and shows it in the risk desk", async ({ page }) => {
  await page.goto("/#price");
  await page.locator('.tile[data-id="diesel"]').click();
  await page.locator("#usage").fill("250000");
  const handle = page.locator('.handle[data-k="k1"]');
  const before = await handle.getAttribute("aria-valuenow");
  await handle.focus();
  await page.keyboard.press("ArrowUp");
  const after = await page.locator('.handle[data-k="k1"]').getAttribute("aria-valuenow");
  expect(Number(after)).toBeGreaterThan(Number(before));
  await page.locator("#buy").click();
  await expect(page.locator("#login")).toBeVisible();
  await page.locator("#l-email").fill("finance@example.com");
  await page.locator("#l-pass").fill("prototype-pass");
  await page.locator("#l-go").click();
  await expect(page.locator("#overlay")).toBeVisible();
  await page.locator("#c1").check();
  await page.locator("#c2").check();
  await page.locator("#m-confirm").click();
  await expect(page).toHaveURL(/#desk$/);
  await expect(page.locator("#desk-body")).toContainText("Diesel & heating oil");
  await expect(page.locator("#desk-body .tbl")).toBeVisible();
});

test("landing keeps the 3D canvas and ticker without marketing clutter", async ({ page }) => {
  await page.goto("/#home");
  await expect(page.getByRole("heading", { name: "Keep commodity costs within budget." })).toBeVisible();
  await expect(page.locator("#peak-cv")).toBeAttached();
  await expect(page.locator(".ticker")).toBeVisible();
  await expect(page.locator("#ticker .tk-chip")).toHaveCount(50);
  await expect(page.locator("#pk-hero .btn")).toHaveCount(1);
  await expect(page.locator(".pk-meta, .pillars, .uses, .story, .band")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const fonts = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    heading: getComputedStyle(document.querySelector("#pk-hero h1")).fontFamily,
  }));
  expect(fonts.heading).toBe(fonts.body);
  expect(fonts.body).toContain("Geist");
});

test("budget lock remains within a 375px mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#budget");
  await page.getByRole("button", { name: "Calculate budget lock" }).click();
  await expect(page.locator("#budget-output")).toBeVisible();
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByRole("button", { name: "Open in quote builder" })).toBeVisible();
});

