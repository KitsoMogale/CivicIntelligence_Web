import { mockStreetTiles } from "./browser-map-fixtures.mjs";
import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
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
  warnings = [];
let active;
const check = (label) => {
  passed.push(label);
  console.log("PASS " + label);
};
async function observe(context) {
  await mockStreetTiles(context);
  const page = await context.newPage();
  active = page;
  page.setDefaultTimeout(90000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      /hiding the attribution|Error:.*(layer|source|expression)/i.test(m.text())
    )
      warnings.push(m.text());
  });
  return page;
}
const camera = async (page) =>
  JSON.parse(await page.locator(".map-surface").getAttribute("data-camera"));
async function layers(page) {
  await page.getByLabel("Map layers", { exact: true }).click();
  await page
    .getByRole("region", { name: "Map layer controls", exact: true })
    .waitFor();
}
async function closeLayers(page) {
  await page.getByLabel("Close map layers", { exact: true }).click();
}
try {
  await fs.mkdir("test-results", { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    acceptDownloads: true,
    reducedMotion: "reduce",
  });
  const page = await observe(context);
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page
    .locator('.map-surface[data-loaded="true"][data-provinces-loaded="true"]')
    .waitFor();
  await layers(page);
  assert.equal(await page.locator(".canvas-layer-row").count(), 11);
  await page.getByLabel("Cities & towns", { exact: true }).uncheck();
  await page.getByLabel("Institutions", { exact: true }).uncheck();
  await page
    .getByLabel("Information density", { exact: true })
    .selectOption("detailed");
  await page
    .getByLabel("Map data overlay", { exact: true })
    .selectOption("population");
  await page
    .getByLabel("Map census year", { exact: true })
    .selectOption("2011");
  const mining = page.locator('[data-layer-id="mining"].canvas-layer-row');
  await mining.locator("summary").click();
  await page.getByLabel("Mining operations opacity", { exact: true }).focus();
  await page
    .getByLabel("Mining operations opacity", { exact: true })
    .press("Home");
  await page
    .getByLabel("Mining operations opacity", { exact: true })
    .press("ArrowRight");
  assert.equal(
    await page
      .getByLabel("Mining operations opacity", { exact: true })
      .inputValue(),
    "1",
  );
  await page.getByLabel("Move Mining operations up", { exact: true }).click();
  const ordered = await page
    .locator(".canvas-layer-row")
    .first()
    .getAttribute("data-layer-id");
  assert.equal(ordered, "evidence");
  await closeLayers(page);
  await page
    .locator('.map-entity[data-layer-id="infrastructure"]')
    .first()
    .waitFor();
  assert.equal(
    await page.locator('.map-entity[data-layer-id="cities"]').count(),
    0,
  );
  assert.equal(
    await page.locator('.map-entity[data-layer-id="institutions"]').count(),
    0,
  );
  assert.ok(await page.locator('.map-entity[data-layer-id="mining"]').count());
  await page
    .getByLabel("Map data legend", { exact: true })
    .getByText("Population · Census 2011", { exact: true })
    .waitFor();
  check(
    "Independent thematic layers, native marker layers, ordering, opacity and Census 2011 overlay",
  );
  await page
    .getByLabel("Focus province", { exact: true })
    .selectOption("za-gauteng");
  await page.getByLabel("Close assistant", { exact: true }).click();
  const focused = await camera(page);
  await page.getByRole("tab", { name: "Hierarchy", exact: true }).click();
  await page.locator(".react-flow").waitFor();
  assert.equal(
    await page
      .locator('.react-flow__node[data-id="za-gauteng"] .is-selected')
      .count(),
    1,
  );
  await page
    .locator('.react-flow__node:not([data-id="za-gauteng"]) .node-main')
    .first()
    .click({ modifiers: ["Control"] });
  assert.ok(
    (await page.locator(".selection-status").textContent()).includes(
      "2 selected",
    ),
  );
  if (await page.getByLabel("Close assistant", { exact: true }).isVisible())
    await page.getByLabel("Close assistant", { exact: true }).click();
  await page.getByRole("tab", { name: "Map", exact: true }).click();
  assert.deepEqual(await camera(page), focused);
  check(
    "Province context, selected entity and map camera survive mode changes",
  );
  await page.getByRole("tab", { name: "Data", exact: true }).click();
  await page.locator(".chart-selection").waitFor();
  assert.match(await page.locator(".chart-selection").textContent(), /Gauteng/);
  await page.locator(".data-view details summary").click();
  await page
    .locator(".data-view")
    .getByRole("button", { name: "Western Cape", exact: true })
    .click();
  assert.equal(await page.locator(".selected-data-row").count(), 1);
  await page.getByRole("tab", { name: "Map", exact: true }).click();
  assert.deepEqual(await camera(page), focused);
  if (await page.getByLabel("Close assistant", { exact: true }).isVisible())
    await page.getByLabel("Close assistant", { exact: true }).click();
  check(
    "Census charts and accessible tables reflect and update the shared province selection",
  );
  await page.getByLabel("Focus province", { exact: true }).selectOption("all");
  await page.getByRole("button", { name: "World view", exact: true }).click();
  await page.locator('.map-surface[data-scope="World"]').waitFor();
  assert.equal(
    +(await page.locator(".map-surface").getAttribute("data-visible-count")),
    0,
  );
  const world = await camera(page),
    box = await page.locator(".maplibregl-canvas").boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.65);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.7 + 70,
    box.y + box.height * 0.65 - 25,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForFunction(
    (before) =>
      document.querySelector(".map-surface").getAttribute("data-camera") !==
      before,
    JSON.stringify(world),
  );
  await page.keyboard.press("Control+z");
  assert.deepEqual(await camera(page), world);
  await page.getByLabel("Back", { exact: true }).click();
  assert.ok((await camera(page)).zoom > 3);
  await page.getByLabel("Forward", { exact: true }).click();
  assert.equal((await camera(page)).zoom, 1.5);
  await page.getByLabel("Back", { exact: true }).click();
  check("Semantic scope and reversible camera navigation");
  await layers(page);
  await page
    .getByLabel("Information density", { exact: true })
    .selectOption("overview");
  await closeLayers(page);
  assert.ok(
    +(await page.locator(".map-surface").getAttribute("data-visible-count")) <=
      12,
  );
  await layers(page);
  await page
    .getByLabel("Information density", { exact: true })
    .selectOption("detailed");
  await page.getByLabel("Mining operations", { exact: true }).uncheck();
  await closeLayers(page);
  const station = page.getByTitle(/Kusile Power Station/i).first();
  await station.click();
  if (await page.locator(".map-cluster-list").count())
    await page
      .locator(".map-cluster-list")
      .getByRole("button", { name: /Kusile Power Station/i })
      .click();
  await page.getByLabel("Map selection evidence", { exact: true }).waitFor();
  await page.getByLabel("Close assistant", { exact: true }).click();
  await page.getByRole("button", { name: "Isolate", exact: true }).click();
  assert.equal(
    +(await page.locator(".map-surface").getAttribute("data-visible-count")),
    1,
  );
  await page.getByRole("button", { name: "Show all", exact: true }).click();
  check("Independent density, source-linked selection and isolation");
  await page
    .getByLabel("Canvas layout", { exact: true })
    .selectOption("overlay");
  await page.getByRole("tab", { name: "Relationships", exact: true }).click();
  await page.locator(".canvas-floating-view .relationship-surface").waitFor();
  assert.equal(await page.locator(".persistent-map").isVisible(), true);
  await page
    .getByRole("button", { name: "Trace connections", exact: true })
    .click();
  assert.ok(
    (await page.locator(".selection-status").textContent()).includes(
      "selected",
    ),
  );
  await page.screenshot({
    path: "test-results/canvas-desktop-overlay.png",
    fullPage: true,
  });
  check(
    "Map and relationship overlay share selection and sourced connection tracing",
  );
  await page.getByLabel("Save exploration", { exact: true }).click();
  await page.getByLabel("Saved explorations", { exact: true }).click();
  await page
    .getByRole("dialog", { name: "Saved explorations", exact: true })
    .waitFor();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export investigation", exact: true })
    .first()
    .click();
  const download = await downloadEvent;
  let content = "";
  for await (const chunk of await download.createReadStream()) content += chunk;
  const saved = JSON.parse(content);
  assert.equal(saved.context.layout, "overlay");
  assert.equal(saved.context.layers.length, 11);
  assert.ok(saved.context.camera.zoom);
  await page.getByLabel("Close dialog", { exact: true }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".canvas-floating-view .relationship-surface").waitFor();
  assert.equal(
    await page.getByLabel("Canvas layout", { exact: true }).inputValue(),
    "overlay",
  );
  check(
    "Investigation export and reload preserve camera, complete layers, layout and selection",
  );
  await context.close();
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const mobile = await observe(mobileContext);
  await mobile.goto(base, { waitUntil: "domcontentloaded" });
  await mobile.locator('.map-surface[data-provinces-loaded="true"]').waitFor();
  await layers(mobile);
  assert.equal(
    await mobile.locator(".country-overview-card").isVisible(),
    false,
  );
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await mobile
    .getByLabel("Information density", { exact: true })
    .selectOption("detailed");
  await mobile.getByLabel("Cities & towns", { exact: true }).uncheck();
  await mobile.screenshot({
    path: "test-results/canvas-mobile-layers.png",
    fullPage: true,
  });
  await closeLayers(mobile);
  await mobile
    .getByLabel("Canvas layout", { exact: true })
    .selectOption("overlay");
  await mobile.getByRole("tab", { name: "Hierarchy", exact: true }).click();
  await mobile.locator(".canvas-floating-view .react-flow").waitFor();
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await mobile.screenshot({
    path: "test-results/canvas-mobile-overlay.png",
    fullPage: true,
  });
  check(
    "Touch viewport fits layer controls and synchronized overlay without page overflow",
  );
  await mobileContext.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  check(
    "No uncaught errors, MapLibre layer errors or React Flow attribution warning",
  );
  await fs.writeFile(
    "test-results/canvas-browser-report.json",
    JSON.stringify({ base, passed, errors, warnings }, null, 2),
  );
} catch (error) {
  if (active)
    try {
      await active.screenshot({
        path: "test-results/canvas-failure.png",
        fullPage: true,
      });
      await fs.writeFile(
        "test-results/canvas-failure-dom.txt",
        await active.locator("body").ariaSnapshot(),
      );
    } catch {}
  await fs.writeFile(
    "test-results/canvas-browser-report.json",
    JSON.stringify(
      { base, passed, errors, warnings, failure: String(error) },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
