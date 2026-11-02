import { expect, test } from "@playwright/test";

test("a first visit precaches the app for offline reload without removing other caches", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#point-1-0")).toBeVisible();
  await page.evaluate(async () => {
    await caches.open("unrelated-app-cache");
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#point-1-0")).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByAltText("Field", { exact: true })
        .evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => caches.keys())).toContain(
    "unrelated-app-cache",
  );
  expect(errors).toEqual([]);
});
