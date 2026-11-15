import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  mockStreetTiles,
  mockSatelliteTiles,
} from "./browser-map-fixtures.mjs";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
await fs.mkdir("test-results", { recursive: true });
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
  errors = [],
  imageryRequests = [];
const check = (label) => {
  passed.push(label);
  console.log("PASS " + label);
};
let page;
async function open(options = {}, status = () => 200) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
    acceptDownloads: true,
    ...options,
  });
  await mockStreetTiles(context);
  await mockSatelliteTiles(context, status);
  // No paid service can accidentally be requested by these key-free checks.
  await context.route("https://api.maptiler.com/**", (route) => route.abort());
  page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().startsWith("https://tiles.maps.eox.at/"))
      imageryRequests.push(request.url());
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page
    .locator(
      '.map-surface[data-provinces-loaded="true"][data-street-status="ready"]',
    )
    .waitFor();
  const assistant = page.getByLabel("Close assistant", { exact: true });
  if (await assistant.isVisible()) await assistant.click();
  return context;
}
async function choose(id) {
  await page.getByLabel("Map layers", { exact: true }).click();
  await page.getByLabel("Basemap", { exact: true }).selectOption(id);
  await page.getByLabel("Close map layers", { exact: true }).click();
}
const ready = (id, status = "ready") =>
  page
    .locator(
      `.map-surface[data-basemap="${id}"][data-basemap-status="${status}"]`,
    )
    .waitFor();
const camera = () =>
  page.locator(".map-surface").getAttribute("data-camera").then(JSON.parse);
async function download(button) {
  const pending = page.waitForEvent("download");
  await button.click();
  return fs.readFile(await (await pending).path(), "utf8");
}
try {
  const context = await open();
  assert.equal(imageryRequests.length, 0);
  await page
    .getByLabel("Focus province", { exact: true })
    .selectOption("za-gauteng");
  await page.waitForFunction(
    () =>
      JSON.parse(
        document.querySelector(".map-surface").getAttribute("data-camera"),
      ).zoom > 5,
  );
  const before = await camera();
  await choose("satellite");
  await ready("satellite");
  assert.deepEqual(await camera(), before);
  assert.equal(
    await page.getByLabel("Focus province", { exact: true }).inputValue(),
    "za-gauteng",
  );
  const credits = page.getByLabel("Map sources and edition", { exact: true });
  assert.match(await credits.innerText(), /EOxCloudless.*2016/);
  assert.match(await credits.innerText(), /not live/);
  assert.equal(
    await credits
      .getByRole("link", { name: /EOxCloudless/ })
      .getAttribute("href"),
    "https://cloudless.eox.at",
  );
  assert.equal(
    await page
      .locator(
        ".map-entity span:not(.map-dot):not(.map-cluster-count),.map-entity[title]",
      )
      .count(),
    0,
  );
  check(
    "Satellite loads only on selection, preserves location and area, and shows dated credits without entity cards",
  );

  await page.getByLabel("Save exploration", { exact: true }).click();
  await page.getByLabel("Saved explorations", { exact: true }).click();
  const investigation = JSON.parse(
    await download(
      page.getByRole("button", { name: "Export investigation", exact: true }),
    ),
  );
  assert.equal(investigation.context.basemap, "satellite");
  assert.equal(investigation.context.region, "za-gauteng");
  await page.getByLabel("Close dialog", { exact: true }).click();
  await page.getByLabel("Export visual report", { exact: true }).click();
  const report = await download(
    page.getByRole("button", { name: "Download visual report", exact: true }),
  );
  assert.match(report, /modified Copernicus Sentinel data 2016/);
  assert.match(report, /Online imagery is not embedded/);
  assert.match(report, /reference geography instead/);
  await page.getByLabel("Close report", { exact: true }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await ready("satellite");
  assert.deepEqual(await camera(), before);
  check(
    "Saved views and reload retain satellite mode; offline reports identify imagery and use reference geography",
  );

  const zoomIn = page.getByRole("button", { name: "Zoom in", exact: true });
  for (let i = 0; i < 20 && (await zoomIn.isEnabled()); i++)
    await zoomIn.click();
  await page.waitForFunction(
    () =>
      JSON.parse(
        document.querySelector(".map-surface").getAttribute("data-camera"),
      ).zoom === 19,
  );
  assert.ok(imageryRequests.length > 0);
  assert.ok(
    imageryRequests.every(
      (url) => +new URL(url).pathname.split("/").at(-3) <= 14,
    ),
  );
  await page.screenshot({ path: "test-results/satellite-desktop.png" });
  await choose("reference");
  await ready("reference", "off");
  await choose("streets");
  await ready("streets");
  assert.equal((await camera()).zoom, 19);
  assert.equal(
    await page
      .locator(".maplibregl-ctrl-attrib-inner")
      .getByRole("link", { name: "https://cloudless.eox.at", exact: true })
      .count(),
    0,
  );
  check(
    "Deep zoom uses native imagery limits; switching to streets removes the old source and retains zoom",
  );
  await context.close();

  let first = true,
    fail = true;
  const offline = await open({}, () => {
    if (fail && first) {
      first = false;
      return 503;
    }
    return 200;
  });
  await choose("satellite");
  await ready("satellite", "error");
  assert.match(
    await page
      .getByLabel("Map sources and edition", { exact: true })
      .innerText(),
    /reference map shown/,
  );
  fail = false;
  await page
    .getByRole("button", { name: "Retry satellite", exact: true })
    .click();
  await ready("satellite");
  check(
    "A failed image keeps the reference fallback even when other tiles succeed, and retry restores imagery",
  );
  await offline.close();

  const mobile = await open({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await choose("satellite");
  await ready("satellite");
  const link = page
    .getByLabel("Map sources and edition", { exact: true })
    .getByRole("link", { name: /EOxCloudless/ });
  assert.equal(await link.isVisible(), true);
  assert.equal(
    await link.evaluate((el) => {
      const rect = el.getClientRects()[0];
      return el.contains(
        document.elementFromPoint(rect.x + 5, rect.y + rect.height / 2),
      );
    }),
    true,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page
    .getByRole("button", { name: "Open knowledge explorer", exact: true })
    .click();
  await page.getByLabel("Select country", { exact: true }).selectOption("BW");
  await page
    .getByLabel("Knowledge explorer", { exact: true })
    .getByRole("button", { name: "Close navigation", exact: true })
    .click();
  await page
    .locator('.map-surface[data-areas-country="BW"][data-areas-loaded="true"]')
    .waitFor();
  await ready("satellite");
  await page.screenshot({ path: "test-results/satellite-mobile.png" });
  check(
    "Mobile satellite credit remains visible, fits the screen and works when changing countries",
  );
  await mobile.close();
  assert.deepEqual(errors, []);
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: "test-results/satellite-failure.png" })
      .catch(() => {});
  throw error;
} finally {
  await fs.writeFile(
    "test-results/satellite-checks.json",
    JSON.stringify(
      {
        passed,
        errors,
        syntheticTiles: true,
        imageryRequests: imageryRequests.length,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
