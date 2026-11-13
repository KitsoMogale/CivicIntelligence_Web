import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { mockStreetTiles } from "./browser-map-fixtures.mjs";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const wards = JSON.parse(await fs.readFile("data/ward-index.json", "utf8"));
const selected = wards.find((w) => w.id === "ward-52308005");
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
  requests = [];
let page;
const check = (name) => {
  passed.push(name);
  console.log("PASS " + name);
};
async function context(options = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1100 },
    acceptDownloads: true,
    reducedMotion: "reduce",
    ...options,
  });
  await mockStreetTiles(ctx);
  return ctx;
}
async function open(ctx) {
  page = await ctx.newPage();
  page.setDefaultTimeout(90000);
  page.on("pageerror", (e) => {
    errors.push(e.stack ?? e.message);
    console.log("PAGE ERROR", e.stack ?? e.message);
  });
  page.on("request", (r) => {
    if (r.url().includes("/data/za-")) requests.push(r.url());
  });
  page.on("console", (m) => {
    if (
      /hiding the attribution|Error:.*(layer|source|expression)/i.test(m.text())
    )
      errors.push(m.text());
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator('.map-surface[data-provinces-loaded="true"]').waitFor();
  const close = page.getByLabel("Close assistant", { exact: true });
  if (await close.isVisible()) await close.click();
}
async function layers() {
  await page.getByLabel("Map layers", { exact: true }).click();
  await page.getByLabel("Map layer controls", { exact: true }).waitFor();
}
async function closeLayers() {
  await page.getByLabel("Close map layers", { exact: true }).click();
}
const camera = () =>
  page.locator(".map-surface").getAttribute("data-camera").then(JSON.parse);
async function chooseWard(checkCancellation = false) {
  const staleFile = "/data/za-municipalities-2026/local/ETH.geojson";
  let release = () => {};
  let cancelledRequest;
  let startedRequest;
  if (checkCancellation) {
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route("**" + staleFile, async (route) => {
      await gate;
      await route.continue().catch(() => {});
    });
    startedRequest = page.waitForRequest((r) => r.url().endsWith(staleFile));
    cancelledRequest = page.waitForEvent("requestfailed", {
      predicate: (r) => r.url().endsWith(staleFile),
    });
  }
  await layers();
  assert.equal(
    await page.getByLabel("Boundary edition", { exact: true }).inputValue(),
    "mdb-2026",
  );
  assert.equal(
    await page
      .locator('[data-layer-id="municipalities"] a')
      .getAttribute("href"),
    "https://www.arcgis.com/home/item.html?id=82c7a6d178454ddcb4dc1ef6bf2a4303",
  );
  await page.getByLabel("Ward boundaries", { exact: true }).check();
  await closeLayers();
  await page
    .getByLabel("Focus province", { exact: true })
    .selectOption("za-kwazulu-natal");
  if (startedRequest) await startedRequest;
  await page
    .getByLabel("Focus municipality", { exact: true })
    .selectOption("za-municipality-kzn238");
  if (cancelledRequest) {
    await cancelledRequest;
    release();
    await page.unroute("**" + staleFile);
  }
  await page
    .locator('.map-surface[data-wards-loaded="true"][data-ward-count="37"]')
    .waitFor();
  await page
    .getByLabel("Focus ward", { exact: true })
    .selectOption(selected.id);
  await page.waitForFunction(
    () =>
      Number(
        document
          .querySelector(".map-surface")
          .getAttribute("data-highlighted-wards"),
      ) > 0,
  );
}
async function download(button) {
  const pending = page.waitForEvent("download");
  await button.click();
  const d = await pending;
  const chunks = [];
  for await (const chunk of await d.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
try {
  await fs.mkdir("test-results", { recursive: true });
  const ctx = await context();
  await open(ctx);
  await page.locator('.map-surface[data-street-status="ready"]').waitFor();
  assert.equal(
    await page.locator(".map-source-status a").getAttribute("href"),
    "https://www.openstreetmap.org/copyright",
  );
  check(
    "Street basemap loads with visible OSM credit (synthetic tiles; no public-server automation)",
  );
  await chooseWard(true);
  const panel = page.getByLabel("Ward boundary controls", { exact: true });
  assert.match(await panel.innerText(), /52308005/);
  assert.match(await panel.innerText(), /self-intersection was repaired/);
  assert.equal(
    await panel
      .getByRole("link", { name: "Original publisher geometry", exact: true })
      .getAttribute("href"),
    "/data/za-ward-original/52308005.geojson",
  );
  assert.equal(
    requests
      .filter((url) => url.includes("/za-wards-2026/"))
      .every((url) => url.endsWith("/KZN238.geojson")),
    true,
  );
  check(
    "Official ward file is scoped to its parent, highlights natively and exposes the documented original",
  );
  await page.screenshot({ path: "test-results/accurate-ward-desktop.png" });
  // Clear the selection without moving, then click a known interior navigation point on the real polygon.
  await page.getByLabel("Focus ward", { exact: true }).selectOption("");
  const c = await camera(),
    box = await page.locator(".map-surface").boundingBox();
  const merc = ([lon, lat]) => [
    (lon + 180) / 360,
    (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2,
  ];
  const a = merc(selected.center),
    b = merc(c.center),
    scale = 512 * 2 ** c.zoom;
  await page.mouse.click(
    box.x + box.width / 2 + (a[0] - b[0]) * scale,
    box.y + box.height / 2 + (a[1] - b[1]) * scale,
  );
  await page.waitForFunction(
    (id) => document.querySelector('[aria-label="Focus ward"]').value === id,
    selected.id,
  );
  check(
    "Clicking the actual ward polygon selects its official identifier and municipality",
  );
  await page.getByLabel("Save exploration", { exact: true }).click();
  await page.getByLabel("Saved explorations", { exact: true }).click();
  const saved = JSON.parse(
    await download(
      page.getByRole("button", { name: "Export investigation", exact: true }),
    ),
  );
  assert.equal(saved.context.selectedWardId, selected.id);
  assert.equal(saved.context.boundaryEdition, "mdb-2026");
  assert.equal(saved.context.basemap, "streets");
  await page.getByLabel("Close dialog", { exact: true }).click();
  await page.getByLabel("Export visual report", { exact: true }).click();
  const report = await download(
    page.getByRole("button", { name: "Download visual report", exact: true }),
  );
  assert.match(report, /52308005/);
  assert.match(report, /self-intersection/);
  assert.match(report, /No ward population/);
  assert.match(report, /street tiles are not embedded/);
  await fs.writeFile("test-results/ward-report.html", report);
  await page.getByLabel("Close report", { exact: true }).click();
  check(
    "Saved investigations and offline reports retain the ward, edition, attribution and repair evidence",
  );
  for (let i = 0; i < 8; i++)
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(
        document.querySelector(".map-surface").getAttribute("data-camera"),
      ).zoom === 19,
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('.map-surface[data-wards-loaded="true"]').waitFor();
  assert.equal((await camera()).zoom, 19);
  assert.equal(
    await page.getByLabel("Focus ward", { exact: true }).inputValue(),
    selected.id,
  );
  check("Street-level zoom19 and ward selection survive reload");
  await layers();
  await page
    .getByLabel("Boundary edition", { exact: true })
    .selectOption("legacy-2020");
  assert.match(
    await page
      .locator('[data-layer-id="municipalities"] a')
      .getAttribute("href"),
    /geoboundaries|humdata/,
  );
  await closeLayers();
  assert.match(await panel.innerText(), /Select the MDB 2026 boundary edition/);
  await layers();
  await page
    .getByLabel("Boundary edition", { exact: true })
    .selectOption("mdb-2026");
  await closeLayers();
  assert.equal(
    await page.getByLabel("Focus ward", { exact: true }).inputValue(),
    "",
  );
  await page
    .getByLabel("Focus province", { exact: true })
    .selectOption("za-gauteng");
  assert.match(await panel.innerText(), /Choose a local municipality/);
  await page.getByLabel("Select country", { exact: true }).selectOption("BW");
  assert.equal(await panel.count(), 0);
  check(
    "Historical edition and country/province changes clear unrelated ward selections",
  );
  await ctx.close();
  const mobile = await context({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await open(mobile);
  await chooseWard();
  assert.equal(
    await page.getByLabel("Close assistant", { exact: true }).isVisible(),
    false,
  );
  const wardIsReachable = () =>
    page.evaluate(() => {
      const select = document.querySelector('[aria-label="Focus ward"]');
      const rect = select.getBoundingClientRect();
      return (
        document
          .elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
          ?.closest("select") === select
      );
    });
  assert.equal(
    await wardIsReachable(),
    true,
    "Ward selector must be reachable above other mobile panels",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "test-results/accurate-ward-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Canvas layout", { exact: true }).selectOption("split");
  await page.locator('.split-divider[aria-orientation="horizontal"]').waitFor();
  assert.equal(
    await page.getByLabel("Focus ward", { exact: true }).isVisible(),
    true,
  );
  assert.equal(await page.locator(".map-source-status a").isVisible(), true);
  assert.equal(
    await wardIsReachable(),
    true,
    "Split layout must leave the ward selector reachable",
  );
  for (const label of ["Focus province", "Focus municipality"]) {
    assert.equal(
      await page.getByLabel(label, { exact: true }).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          document
            .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
            ?.closest("select") === el
        );
      }),
      true,
      label + " must be reachable in mobile split",
    );
  }
  assert.equal(
    await page.locator(".map-source-status a").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return (
        document
          .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          ?.closest("a") === el
      );
    }),
    true,
    "OSM credit must stay unobstructed",
  );
  await page.screenshot({
    path: "test-results/accurate-ward-mobile-split.png",
    fullPage: true,
  });
  check(
    "Mobile and stacked split retain an accessible ward selector, visible credit and no overflow",
  );
  await mobile.close();
  const offline = await context();
  let fail = true;
  await mockStreetTiles(offline, () => (fail ? 503 : 200));
  await open(offline);
  await page.locator('.map-surface[data-street-status="error"]').waitFor();
  assert.match(
    await page.locator(".map-source-status").innerText(),
    /reference map shown/,
  );
  fail = false;
  await page
    .getByRole("button", { name: "Retry streets", exact: true })
    .click();
  await page.locator('.map-surface[data-street-status="ready"]').waitFor();
  let wardFailure = true;
  await page.route("**/data/za-wards-2026/KZN238.geojson", (r) =>
    wardFailure
      ? r.fulfill({ status: 503, body: "Simulated unavailable boundary" })
      : r.continue(),
  );
  await layers();
  await page.getByLabel("Ward boundaries", { exact: true }).check();
  await closeLayers();
  await page
    .getByLabel("Focus province", { exact: true })
    .selectOption("za-kwazulu-natal");
  await page
    .getByLabel("Focus municipality", { exact: true })
    .selectOption("za-municipality-kzn238");
  await page
    .getByRole("button", { name: "Retry wards", exact: true })
    .waitFor();
  wardFailure = false;
  await page.getByRole("button", { name: "Retry wards", exact: true }).click();
  await page
    .locator('.map-surface[data-wards-loaded="true"][data-ward-count="37"]')
    .waitFor();
  check(
    "Unavailable streets fall back to reference geography; street and ward retries recover",
  );
  await offline.close();
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/accuracy-browser-results.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
  console.log("PASS " + passed.length + " accuracy browser checks");
} catch (error) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: "test-results/accuracy-failure.png", fullPage: true })
      .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
