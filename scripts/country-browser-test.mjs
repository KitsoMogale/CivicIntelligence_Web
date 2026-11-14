import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { mockStreetTiles } from "./browser-map-fixtures.mjs";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const profiles = JSON.parse(
  await fs.readFile("data/country-profiles.json", "utf8"),
);
const areas = JSON.parse(await fs.readFile("data/world-regions.json", "utf8"));
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
const errors = [],
  passed = [];
let page;
const check = (name) => {
  passed.push(name);
  console.log("PASS " + name);
};
try {
  await fs.mkdir("test-results", { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await mockStreetTiles(context);
  page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator('.map-surface[data-loaded="true"]').waitFor();
  const country = page.getByLabel("Select country", { exact: true });
  const close = page.getByLabel("Close assistant", { exact: true });
  if (await close.isVisible()) await close.click();
  const choose = async (code) => {
    await country.selectOption(code);
    const p = profiles.find((p) => p.code === code);
    if (p.boundary.file && code !== "ZA")
      await page
        .locator(
          `.map-surface[data-areas-country="${code}"][data-areas-loaded="true"]`,
        )
        .waitFor();
  };
  await choose("GB");
  assert.equal(
    await page.locator(".map-surface").getAttribute("data-area-count"),
    "4",
  );
  const scotland = areas.find(
    (r) => r.country === "GB" && r.name === "Scotland",
  );
  await page
    .getByLabel("Focus administrative area", { exact: true })
    .selectOption(scotland.entityId);
  assert.equal(
    await page
      .getByLabel("Focus administrative area", { exact: true })
      .inputValue(),
    scotland.entityId,
  );
  check(
    "Country-specific regions load and focus without South African controls",
  );
  await page.getByLabel("Map layers", { exact: true }).click();
  assert.equal(
    await page.getByLabel("Boundary edition", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByLabel("Ward boundaries", { exact: true }).count(),
    0,
  );
  await page.getByLabel("Close map layers", { exact: true }).click();
  await choose("BW");
  await page
    .getByRole("button", {
      name: "Country structure and coverage",
      exact: true,
    })
    .click();
  let dialog = page.getByRole("dialog", {
    name: "Country structure and coverage",
    exact: true,
  });
  const bw = await dialog.innerText();
  assert.match(bw, /31/);
  assert.match(bw, /2017/);
  assert.match(bw, /Traditional administration/);
  assert.match(bw, /Electoral geography/);
  await page.getByLabel("Close country profile", { exact: true }).click();
  check(
    "Botswana separates reference districts, councils and electoral schemes",
  );
  await choose("NA");
  const options = await page
    .getByLabel("Focus administrative area", { exact: true })
    .locator("option")
    .allTextContents();
  for (const name of ["Kavango East", "Kavango West", "Zambezi", "//Kharas"])
    assert.ok(options.includes(name));
  assert.ok(!options.includes("Cunene"));
  assert.equal(options.length, 15);
  await page
    .getByRole("button", {
      name: "Country structure and coverage",
      exact: true,
    })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Country structure and coverage",
    exact: true,
  });
  assert.match(await dialog.innerText(), /2011/);
  assert.match(await dialog.innerText(), /IGO/);
  await page.screenshot({ path: "test-results/country-namibia-profile.png" });
  await page.getByLabel("Close country profile", { exact: true }).click();
  await page
    .getByLabel("Focus administrative area", { exact: true })
    .selectOption("");
  // Let the country camera finish its deliberate map animation before hitting a polygon.
  await page.waitForTimeout(1000);
  const surface = page.locator(".map-surface"),
    box = await surface.boundingBox();
  await surface.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await page.waitForFunction(
    () =>
      !!document.querySelector('[aria-label="Focus administrative area"]')
        ?.value,
  );
  assert.equal(await country.inputValue(), "NA");
  check("Native area clicks focus the polygon without switching country");
  await page
    .getByLabel("Focus administrative area", { exact: true })
    .selectOption(
      areas.find((r) => r.country === "NA" && r.name === "Kavango East")
        .entityId,
    );
  await page.screenshot({ path: "test-results/country-namibia-map.png" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .locator('.map-surface[data-areas-country="NA"][data-areas-loaded="true"]')
    .waitFor();
  assert.equal(await country.inputValue(), "NA");
  assert.equal(
    await page
      .getByLabel("Focus administrative area", { exact: true })
      .inputValue(),
    areas.find((r) => r.country === "NA" && r.name === "Kavango East").entityId,
  );
  const credit = await page
    .locator(".maplibregl-ctrl-attrib-inner")
    .innerText();
  assert.match(credit, /Namibia/);
  assert.doesNotMatch(credit, /South Africa|Municipal Demarcation Board/);
  check(
    "Foreign selection survives reload and attribution follows the active geography",
  );
  check(
    "Namibia has 14 correct reference regions and discloses the publisher date conflict",
  );
  await choose("MC");
  assert.equal(await country.inputValue(), "MC");
  await choose("ZA");
  await page.locator('.map-surface[data-provinces-loaded="true"]').waitFor();
  assert.equal(
    await page
      .locator(
        ".map-entity .map-marker-label,.map-entity[title],.map-entity.show-label",
      )
      .count(),
    0,
  );
  await page.locator(".map-entity").first().hover();
  assert.equal(await page.locator(".map-entity .map-marker-label").count(), 0);
  check(
    "Microstates are selectable and entity dots have no persistent or hover name cards",
  );
  await choose("NA");
  const finalClose = page.getByLabel("Close assistant", { exact: true });
  if (await finalClose.isVisible()) await finalClose.click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: "test-results/country-mobile.png" });
  check("Country switching preserves a usable mobile viewport");
  assert.deepEqual(errors, []);
  check("No browser runtime errors");
  await context.close();
} catch (e) {
  if (page)
    await page
      .screenshot({ path: "test-results/country-failure.png" })
      .catch(() => {});
  throw e;
} finally {
  await fs.writeFile(
    "test-results/country-checks.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
  await browser.close();
}
