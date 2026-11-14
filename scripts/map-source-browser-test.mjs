import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { mockStreetTiles } from "./browser-map-fixtures.mjs";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const catalog = JSON.parse(await fs.readFile("data/knowledge.json", "utf8"));
const metrics = JSON.parse(
  await fs.readFile("data/provincial-indicators.json", "utf8"),
).metrics;
const sourceUrl = (id) => catalog.sources.find((s) => s.id === id).url;
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ||
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const passed = [],
  errors = [];
const check = (label) => {
  passed.push(label);
  console.log("PASS " + label);
};
let page;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  await mockStreetTiles(context);
  page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator('.map-surface[data-provinces-loaded="true"]').waitFor();
  await page.getByLabel("Map layers", { exact: true }).click();
  const municipal = page.locator('[data-layer-id="municipalities"]');
  await municipal.locator("summary").click();
  assert.equal(
    await municipal.locator("a").getAttribute("href"),
    sourceUrl("mdb-municipalities-2026"),
  );
  assert.match(await municipal.innerText(), /MDB 2026/);
  check("Published municipality edition links to the reviewed MDB source");
  await page
    .getByLabel("Boundary edition", { exact: true })
    .selectOption("legacy-2020");
  assert.equal(
    await municipal.locator("a").getAttribute("href"),
    sourceUrl("municipal-boundaries"),
  );
  assert.match(await municipal.innerText(), /2020/);
  check("Historical edition retains its own geometry citation");
  await municipal.locator("summary").click();
  const statistics = page.locator('[data-layer-id="statistics"]');
  const censusUrl = await statistics.locator("a").getAttribute("href");
  const metric = metrics.find((m) => m.id === "za-unemployment-2026-q3");
  await page
    .getByLabel("Map data overlay", { exact: true })
    .selectOption(metric.id);
  await statistics.locator("summary").click();
  assert.equal(
    await statistics.locator("a").getAttribute("href"),
    sourceUrl(metric.sourceIds[0]),
  );
  assert.ok((await statistics.innerText()).includes(metric.periodLabel));
  check("Provincial statistic shows its own period and source");
  await page
    .getByLabel("Map data overlay", { exact: true })
    .selectOption("population");
  assert.equal(await statistics.locator("a").getAttribute("href"), censusUrl);
  check("Census selection restores its Census reference");
  await page.getByLabel("Close map layers", { exact: true }).click();
  await page.getByLabel("Close map data legend", { exact: true }).click();
  assert.equal(
    await page.getByLabel("Map data legend", { exact: true }).count(),
    0,
  );
  await page.getByLabel("Map layers", { exact: true }).click();
  assert.equal(
    await page.getByLabel("Provincial statistics", { exact: true }).isChecked(),
    true,
  );
  await page
    .getByLabel("Map data overlay", { exact: true })
    .selectOption(metric.id);
  await page.getByLabel("Close map layers", { exact: true }).click();
  assert.equal(
    await page.getByLabel("Map data legend", { exact: true }).count(),
    0,
  );
  await page.getByLabel("Show map data legend", { exact: true }).click();
  assert.ok(
    (
      await page.getByLabel("Map data legend", { exact: true }).innerText()
    ).includes(metric.periodLabel),
  );
  check(
    "Closing the legend preserves its map layer and reopening shows the active metric",
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/source-browser-results.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: "test-results/source-failure.png", fullPage: true })
      .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
