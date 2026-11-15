// Requires a locally configured NEXT_PUBLIC_MAPTILER_KEY and a restarted/rebuilt app.
// Default: local provider fixtures. --live: one real Cape Town view (limited tile use).
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  mockStreetTiles,
  mockSatelliteTiles,
  mockMapTiler,
  isMapTilerImagePath,
} from "./browser-map-fixtures.mjs";
const live = process.argv.includes("--live");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const output = live ? "maptiler-live" : "maptiler-mocked";
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
  responses = [];
let page,
  stage = "opening local app",
  tileRequests = 0,
  pageErrors = 0,
  failTiles = false;
const check = (label) => {
  passed.push(label);
  console.log("PASS " + label);
};
async function choose(basemap) {
  await page.getByLabel("Map layers", { exact: true }).click();
  await page.getByLabel("Basemap", { exact: true }).selectOption(basemap);
  await page.getByLabel("Close map layers", { exact: true }).click();
}
const ready = (basemap, status = "ready") =>
  page
    .locator(
      `.map-surface[data-basemap="${basemap}"][data-basemap-status="${status}"]`,
    )
    .waitFor();
const camera = () =>
  page.locator(".map-surface").getAttribute("data-camera").then(JSON.parse);
try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    reducedMotion: "reduce",
  });
  await mockStreetTiles(context);
  await mockSatelliteTiles(context);
  if (live) {
    await context.route("https://api.maptiler.com/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (isMapTilerImagePath(path) && ++tileRequests > 48)
        return route.abort();
      return route.continue();
    });
  } else await mockMapTiler(context, () => (failTiles ? 403 : 200));
  page = await context.newPage();
  page.setDefaultTimeout(60000);
  // Never log browser errors, response bodies or full request URLs: they can contain keys.
  page.on("pageerror", () => pageErrors++);
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.hostname === "api.maptiler.com")
      responses.push({ path: url.pathname, status: response.status() });
  });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page
    .locator(
      '.map-surface[data-provinces-loaded="true"][data-street-status="ready"]',
    )
    .waitFor();
  stage = "checking the configured satellite option";
  await page.getByLabel("Map layers", { exact: true }).click();
  assert.equal(
    await page
      .getByLabel("Basemap", { exact: true })
      .locator('option[value="satellite-detail"]')
      .count(),
    1,
    "Detailed imagery is missing: restart the app after setting its browser key",
  );
  await page.getByLabel("Close map layers", { exact: true }).click();
  check("Local app detects the configured map key and offers detailed imagery");
  if (live) {
    stage = "focusing Cape Town using the map controls";
    await page
      .getByRole("textbox", { name: "Search knowledge", exact: true })
      .fill("Cape Town");
    await page
      .locator(".search-results")
      .getByRole("button", { name: "Cape Town City", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Locate on map", exact: true })
      .click();
    await page.locator('.map-surface[data-provinces-loaded="true"]').waitFor();
    await page.waitForFunction(
      () =>
        JSON.parse(
          document.querySelector(".map-surface").getAttribute("data-camera"),
        ).zoom >= 8,
    );
    const close = page.getByRole("button", {
      name: "Close assistant",
      exact: true,
    });
    if (await close.isVisible()) await close.click();
    const zoomIn = page.getByRole("button", { name: "Zoom in", exact: true });
    while ((await camera()).zoom < 17) await zoomIn.click();
  }
  const before = await camera();
  stage = "loading detailed imagery";
  await choose("satellite-detail");
  await ready("satellite-detail");
  assert.deepEqual(await camera(), before);
  assert.ok(
    responses.some(
      (r) => r.path === "/tiles/satellite-v2/tiles.json" && r.status === 200,
    ),
  );
  assert.ok(
    responses.some((r) => isMapTilerImagePath(r.path) && r.status === 200),
  );
  assert.equal(
    await page.getByRole("link", { name: "MapTiler", exact: true }).isVisible(),
    true,
  );
  assert.match(
    await page
      .getByLabel("Map sources and edition", { exact: true })
      .innerText(),
    /dates vary.*not live/,
  );
  check(
    live
      ? "Real MapTiler imagery loads over Cape Town at building-view zoom with visible credits"
      : "Documented satellite-v2 endpoint renders tiles with provider credits and preserves the camera",
  );
  if (!live) {
    assert.match(
      await page.locator(".maplibregl-ctrl-attrib-inner").innerText(),
      /Test imagery provider/,
    );
    stage = "checking provider failure recovery";
    await choose("reference");
    await ready("reference", "off");
    failTiles = true;
    await choose("satellite-detail");
    await ready("satellite-detail", "error");
    assert.match(
      await page
        .getByLabel("Map sources and edition", { exact: true })
        .innerText(),
      /reference map shown/,
    );
    failTiles = false;
    await page
      .getByRole("button", { name: "Retry satellite", exact: true })
      .click();
    await ready("satellite-detail");
    check(
      "Denied imagery requests fall back to reference geography and retry recovers",
    );
    await choose("streets");
    await ready("streets");
    assert.equal(
      await page.getByRole("link", { name: "MapTiler", exact: true }).count(),
      0,
    );
    assert.doesNotMatch(
      await page.locator(".maplibregl-ctrl-attrib-inner").innerText(),
      /Test imagery provider/,
    );
    check("Switching to streets removes the imagery source and its credits");
  }
  await page.screenshot({ path: `test-results/${output}.png` });
  assert.equal(pageErrors, 0);
  assert.ok(
    responses.every((r) => r.status === 200 || (!live && r.status === 403)),
  );
} catch {
  console.log("FAIL " + stage + "; request URLs and credentials are omitted.");
  if (page && !page.isClosed())
    await page
      .screenshot({ path: `test-results/${output}-failure.png` })
      .catch(() => {});
  process.exitCode = 1;
} finally {
  await fs.writeFile(
    `test-results/${output}.json`,
    JSON.stringify(
      { live, passed, pageErrors, tileRequests, responses },
      null,
      2,
    ),
  );
  await browser.close();
}
