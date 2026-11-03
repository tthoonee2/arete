const { test, expect } = require("@playwright/test");

test.use({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "no-preference",
  launchOptions: {
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
  },
});

test("desktop runs ambient, pointer and scroll-driven 3D animation", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("/#home");
  await page.waitForFunction(() => typeof PK !== "undefined" && PK.ready, null, { timeout: 60_000 });
  await expect(page.locator("#peak-cv")).toHaveClass("on");
  await expect(page.locator("#peak")).not.toHaveClass(/static/);
  expect(await page.evaluate(() => PK.run)).toBe(true);
  expect(await page.evaluate(() => PK.asset)).toBe("tripo-alpine-horn");
  expect(await page.evaluate(() => PK.triangles)).toBe(23262);
  const stats = await page.evaluate(() => PK.stats());
  expect(stats.triangles).toBeLessThan(30000);
  expect(stats.calls).toBeLessThan(40);

  await page.mouse.move(240, 420);
  await page.waitForFunction(() => Math.abs(PK.pointer.x) > 0.05);
  const before = await page.evaluate(() => ({ x: PK.pointer.x, y: PK.pointer.y }));
  await page.mouse.move(1160, 620);
  await page.waitForFunction(previous => Math.abs(PK.pointer.x - previous.x) > 0.2, before);
  expect(await page.evaluate(() => PK.run)).toBe(true);

  await page.evaluate(() => {
    const peak = document.querySelector("#peak");
    window.scrollTo(0, (peak.offsetHeight - innerHeight) * 0.28);
  });
  await page.waitForFunction(() => PK.p > 0.25 && PK.ps > 0.04);
  const heroOpacity = await page.locator("#pk-hero").evaluate(element => Number(getComputedStyle(element).opacity));
  expect(heroOpacity).toBeLessThan(1);
  expect(errors).toEqual([]);
});
