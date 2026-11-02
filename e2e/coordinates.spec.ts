import { expect, test, type Page } from "@playwright/test";

async function openFTC(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem("coordinate-test-seeded")) return;
    localStorage.setItem("coordinate-test-seeded", "true");
    localStorage.setItem(
      "pedro_session_recovery_v1",
      JSON.stringify({
        version: "1.5.0",
        startPoint: { x: 70.75, y: 70.75, headingDeg: -90 },
        lines: [
          {
            kind: "atomic",
            id: "ftc-path",
            color: "#4e79a7",
            endPoint: { x: 70.75, y: 47.25 },
            controlPoints: [],
            heading: { type: "constant", degrees: -90 },
          },
        ],
        fieldPoints: [{ x: 30, y: 40 }],
        shapes: [],
        settings: {
          coordinateSystem: "ftc",
          distanceUnit: "tiles",
          tileSize: 23.5,
        },
      }),
    );
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("End X", { exact: true })).toHaveValue("1");
}

async function snapshot(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("pedro_session_recovery_v1") ?? "{}"),
  );
}

test("FTC edits keep canonical geometry and survive recovery", async ({
  page,
}) => {
  await openFTC(page);
  await page.getByLabel("End X", { exact: true }).fill("2");
  await expect(page.getByLabel("End Y", { exact: true })).toHaveValue("0");
  await expect
    .poll(async () => (await snapshot(page)).lines?.[0].endPoint)
    .toEqual({ x: 70.75, y: 23.75 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("End X", { exact: true })).toHaveValue("2");
  expect((await snapshot(page)).fieldPoints).toEqual([{ x: 30, y: 40 }]);
});

test("switching frames changes numbers without moving the path", async ({
  page,
}) => {
  await openFTC(page);
  const marker = page.locator('[aria-label="Path 1 end point"]');
  const before = await marker.boundingBox();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Coordinate frame").selectOption("pedro");
  await page.getByLabel("Distance units").selectOption("inches");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByLabel("End X", { exact: true })).toHaveValue("70.75");
  await expect(page.getByLabel("End Y", { exact: true })).toHaveValue("47.25");
  expect(await marker.boundingBox()).toEqual(before);
});

test("project export retains coordinate preferences", async ({ page }) => {
  await openFTC(page);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Export project as PP JSON" })
    .click();
  const download = await downloaded;
  const stream = (await download.createReadStream())!;
  let text = "";
  for await (const chunk of stream) text += chunk.toString();
  const doc = JSON.parse(text);
  expect(doc.coordinates).toEqual({
    coordinateSystem: "ftc",
    distanceUnit: "tiles",
    tileSize: 23.5,
  });
  expect(doc.lines[0].endPoint).toEqual({ x: 70.75, y: 47.25 });
});
