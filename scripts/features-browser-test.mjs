import { mockStreetTiles } from "./browser-map-fixtures.mjs";
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
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
  errors = [];
let page;
const check = (label) => {
  passed.push(label);
  console.log("PASS " + label);
};
async function open(context) {
  await mockStreetTiles(context);
  page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      /hiding the attribution|Error:.*(layer|source|expression)/i.test(m.text())
    )
      errors.push(m.text());
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator('.map-surface[data-provinces-loaded="true"]').waitFor();
  return page;
}
async function layers() {
  await page.getByLabel("Map layers", { exact: true }).click();
  await page
    .getByRole("region", { name: "Map layer controls", exact: true })
    .waitFor();
}
const closeLayers = () =>
  page.getByLabel("Close map layers", { exact: true }).click();
async function textDownload(button) {
  const pending = page.waitForEvent("download");
  await button.click();
  const d = await pending,
    chunks = [];
  for await (const chunk of await d.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
try {
  await fs.mkdir("test-results", { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1100 },
    acceptDownloads: true,
    reducedMotion: "reduce",
  });
  await open(context);
  await layers();
  await page
    .getByLabel("Boundary edition", { exact: true })
    .selectOption("legacy-2020");
  await page.getByLabel("Municipal boundaries", { exact: true }).check();
  await closeLayers();
  await page
    .getByLabel("Focus province", { exact: true })
    .selectOption("za-western-cape");
  await page
    .locator(
      '.map-surface[data-municipalities-loaded="true"][data-municipality-count="213"]',
    )
    .waitFor();
  await page
    .getByLabel("Focus municipality", { exact: true })
    .selectOption("za-municipality-cpt");
  assert.match(
    await page.locator(".entity-details h2").innerText(),
    /Cape Town/,
  );
  await layers();
  assert.match(
    await page
      .getByRole("region", { name: "Map layer controls", exact: true })
      .innerText(),
    /2020/,
  );
  await page
    .getByLabel("Municipal boundary level", { exact: true })
    .selectOption("district");
  await closeLayers();
  await page
    .locator(
      '.map-surface[data-municipalities-loaded="true"][data-municipality-count="52"]',
    )
    .waitFor();
  await page
    .getByLabel("Focus municipality", { exact: true })
    .selectOption("za-municipality-cpt");
  await layers();
  assert.equal(
    await page
      .getByLabel("Municipal boundary level", { exact: true })
      .inputValue(),
    "district",
  );
  await closeLayers();
  check(
    "Historical municipality levels load, join to directory records and synchronize selection",
  );
  await layers();
  await page
    .getByLabel("Map data overlay", { exact: true })
    .selectOption("za-unemployment-2026-q3");
  assert.equal(
    await page.getByLabel("Map census year", { exact: true }).isDisabled(),
    true,
  );
  await closeLayers();
  const legend = page.getByLabel("Map data legend", { exact: true });
  assert.match(await legend.innerText(), /2026/);
  await legend.locator("summary").click();
  assert.match(await legend.innerText(), /labour force/i);
  assert.match(await legend.innerText(), /no municipality estimates/);
  await page.getByLabel("Export visual report", { exact: true }).click();
  const html = await textDownload(
    page.getByRole("button", { name: "Download visual report", exact: true }),
  );
  assert.match(html, /Official unemployment rate/);
  assert.match(html, /Denominator:/);
  assert.doesNotMatch(html, /Colour shows provincial Census 2022 population/);
  await fs.writeFile("test-results/provincial-report.html", html);
  await page.getByLabel("Close report", { exact: true }).click();
  check(
    "Provincial rates show the correct period, denominator, source and report figure",
  );
  for (const [metric, period] of [
    ["za-gdp-growth-2025", "2025"],
    ["za-post-school-2022", "2022"],
    ["za-medical-aid-2025", "2025"],
  ]) {
    await layers();
    await page
      .getByLabel("Map data overlay", { exact: true })
      .selectOption(metric);
    await closeLayers();
    assert.match(await legend.innerText(), new RegExp(period));
  }
  await page.getByLabel("Canvas layout", { exact: true }).selectOption("split");
  const divider = page.getByRole("separator", {
    name: "Resize map and companion view",
    exact: true,
  });
  await divider.waitFor();
  await page
    .locator(
      '.map-surface[data-provinces-loaded="true"][data-municipalities-loaded="true"]',
    )
    .waitFor();
  assert.equal(await divider.getAttribute("aria-orientation"), "vertical");
  await divider.press("ArrowRight");
  assert.equal(await divider.getAttribute("aria-valuenow"), "55");
  await page.getByLabel("Back", { exact: true }).click();
  assert.equal(await divider.getAttribute("aria-valuenow"), "50");
  await page.getByLabel("Forward", { exact: true }).click();
  const box = await divider.boundingBox(),
    canvas = await page.locator(".has-canvas-split").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(canvas.x + canvas.width * 0.6, box.y + 80, {
    steps: 8,
  });
  await page.mouse.up();
  assert.ok(Math.abs(+(await divider.getAttribute("aria-valuenow")) - 60) <= 1);
  await page.reload({ waitUntil: "domcontentloaded" });
  await divider.waitFor();
  assert.ok(Math.abs(+(await divider.getAttribute("aria-valuenow")) - 60) <= 1);
  assert.equal(await page.locator(".persistent-map").isVisible(), true);
  await page.screenshot({ path: "test-results/desktop-split.png" });
  check(
    "Desktop split supports pointer/keyboard resize, undo/redo and persisted panel ratio",
  );
  await page
    .getByRole("button", { name: "Explore network", exact: true })
    .click();
  await page
    .getByLabel("Network start entity", { exact: true })
    .selectOption("za-exxaro-resources");
  await page
    .getByLabel("Network destination", { exact: true })
    .selectOption("za-thungela-resources");
  await page
    .getByLabel("Network maximum steps", { exact: true })
    .selectOption("2");
  assert.equal(await page.locator(".network-path li").count(), 2);
  assert.match(await page.locator(".network-path").innerText(), /Mafube/);
  assert.match(
    await page.locator(".network-path").innerText(),
    /against the arrow/,
  );
  assert.ok((await page.locator(".network-path a").count()) >= 2);
  await page
    .getByLabel("Network direction", { exact: true })
    .selectOption("outgoing");
  assert.match(
    await page.locator(".network-preview").innerText(),
    /No documented path/,
  );
  await page
    .getByLabel("Network direction", { exact: true })
    .selectOption("both");
  await page
    .getByRole("button", { name: "Show network on canvas", exact: true })
    .click();
  await page.locator(".network-result-note").waitFor();
  assert.equal(
    await page.getByLabel("Focus province", { exact: true }).inputValue(),
    "all",
  );
  assert.match(
    await page.locator(".network-result-note").innerText(),
    /2 connections/,
  );
  await page.getByLabel("Export visual report", { exact: true }).click();
  const report = await textDownload(
    page.getByRole("button", { name: "Download visual report", exact: true }),
  );
  assert.match(report, /Mafube/);
  assert.match(report, /Thungela/);
  assert.match(report, /2025-12-31/);
  await page.getByLabel("Close report", { exact: true }).click();
  await page.screenshot({ path: "test-results/desktop-network-split.png" });
  check(
    "Shortest network paths retain direction, evidence links and reporting dates in canvas and exports",
  );
  await page.getByRole("button", { name: "Close trace", exact: true }).click();
  await page
    .getByLabel("Canvas layout", { exact: true })
    .selectOption("single");
  await page
    .getByLabel("Search knowledge", { exact: true })
    .fill("Ellisras Hospital");
  const result = page.locator(".search-results").getByRole("button");
  assert.equal(await result.count(), 1);
  await result.click();
  assert.match(
    await page.locator(".entity-details").innerText(),
    /Municipality-published hospital locator/,
  );
  check(
    "Facility selection exposes its publisher locator and coordinate precision",
  );
  await page.getByLabel("Canvas layout", { exact: true }).selectOption("split");
  await page.getByLabel("Select country", { exact: true }).selectOption("BW");
  assert.equal(
    await page
      .getByRole("tab", { name: "Compare", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.equal(await page.locator(".canvas-split-view").isVisible(), true);
  await context.close();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await open(mobile);
  await page.getByLabel("Canvas layout", { exact: true }).selectOption("split");
  const mobileDivider = page.getByRole("separator", {
    name: "Resize map and companion view",
    exact: true,
  });
  await page.locator('.split-divider[aria-orientation="horizontal"]').waitFor();
  await mobileDivider.press("ArrowDown");
  assert.equal(await mobileDivider.getAttribute("aria-valuenow"), "55");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const map = await page.locator(".persistent-map").boundingBox(),
    companion = await page.locator(".canvas-split-view").boundingBox();
  assert.ok(companion.y >= map.y + map.height - 1);
  await page.screenshot({
    path: "test-results/mobile-split.png",
    fullPage: true,
  });
  check(
    "Mobile split stacks vertically, resizes by keyboard and avoids horizontal overflow",
  );
  await mobile.close();
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/features-browser-results.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
  console.log("PASS " + passed.length + " feature browser checks");
} catch (e) {
  if (page && !page.isClosed())
    await page
      .screenshot({ path: "test-results/features-failure.png", fullPage: true })
      .catch(() => {});
  throw e;
} finally {
  await browser.close();
}
