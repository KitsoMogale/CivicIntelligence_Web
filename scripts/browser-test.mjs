import { mockStreetTiles } from "./browser-map-fixtures.mjs";
import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const executablePath =
  process.env.BROWSER_EXECUTABLE ||
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
await fs.access(executablePath);
await fs.mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
let activePage;
const errors = [],
  warnings = [],
  checks = [];
const check = (label) => {
  checks.push(label);
  console.log("PASS " + label);
};
const screenshot = (page, name, fullPage = true) =>
  page.screenshot({ path: "test-results/" + name + ".png", fullPage });
async function download(page, button) {
  const pending = page.waitForEvent("download");
  await button.click();
  const file = await pending;
  const chunks = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
async function search(page, text) {
  await page.getByLabel("Search knowledge", { exact: true }).fill(text);
  await page.locator(".search-results").getByRole("button").first().click();
}
function observe(page) {
  activePage = page;
  page.setDefaultTimeout(90000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/hiding the attribution/i.test(message.text()))
      warnings.push(message.text());
  });
  page.on("request", (request) => {
    if (request.url().includes("api.openai.com"))
      errors.push("Unexpected paid-provider browser request");
  });
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
    reducedMotion: "reduce",
  });
  await mockStreetTiles(context);
  const page = await context.newPage();
  observe(page);
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: "South Africa ZA", exact: true })
    .waitFor();
  await page.locator('.map-surface[data-loaded="true"]').waitFor();
  await page.locator('.map-surface[data-provinces-loaded="true"]').waitFor();
  assert.equal(
    await page
      .getByLabel("Focus province", { exact: true })
      .locator("option")
      .count(),
    10,
  );
  assert.equal(await page.locator(".map-error").count(), 0);
  assert.ok(
    (await page.locator(".maplibregl-canvas").boundingBox()).height > 300,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await screenshot(page, "desktop-map");
  check("World map and all nine province geometries load without overflow");
  const bank = page.locator('.map-entity[data-entity-ids*="za-sarb"]');
  await bank.click();
  if (await page.locator(".map-cluster-list").count())
    await page
      .locator(".map-cluster-list")
      .getByRole("button", { name: "South African Reserve Bank", exact: true })
      .click();
  await page
    .locator(".entity-details")
    .getByRole("heading", { name: "South African Reserve Bank", exact: true })
    .waitFor();
  check("Clustered map markers open the correct entity evidence");
  await page.getByLabel("Hide assistant", { exact: true }).click();
  await page.waitForFunction(() => {
    const a = document.querySelector(".maplibregl-canvas"),
      b = document.querySelector(".map-surface");
    return (
      a &&
      b &&
      Math.abs(
        a.getBoundingClientRect().width - b.getBoundingClientRect().width,
      ) < 2
    );
  });
  await page.getByLabel("Open assistant", { exact: true }).click();
  check("Map resizes after assistant collapse");
  await page
    .getByLabel("Focus province", { exact: true })
    .selectOption("za-north-west");
  await page
    .locator(".entity-details")
    .getByRole("heading", { name: "North West", exact: true })
    .waitFor();
  await page.getByLabel("Map layers", { exact: true }).click();
  await page
    .getByLabel("Map data overlay", { exact: true })
    .selectOption("population");
  await page
    .getByLabel("Map marker layer", { exact: true })
    .selectOption("cities");
  await page.getByLabel("Close map layers", { exact: true }).click();
  await page.getByLabel("Map data legend", { exact: true }).waitFor();
  await screenshot(page, "desktop-provinces");
  check("Province focus, population overlay and city layer work");
  await page.getByLabel("Focus province", { exact: true }).selectOption("all");
  await page.getByLabel("Map layers", { exact: true }).click();
  await page
    .getByLabel("Map marker layer", { exact: true })
    .selectOption("infrastructure");
  await page
    .getByLabel("Map data overlay", { exact: true })
    .selectOption("change");
  await page.getByLabel("Close map layers", { exact: true }).click();
  assert.ok(
    (await page.getByRole("button", { name: /Open.*Power Station/ }).count()) ||
      (await page
        .getByRole("button", { name: /Explore.*nearby entities/ })
        .count()),
  );
  check("Infrastructure locators and Census-change overlay work");
  await page
    .getByRole("button", { name: "Government & politics", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Expand Parliament", exact: true })
    .click();
  await page
    .getByRole("button", { name: "View National Assembly", exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".react-flow__attribution").isVisible(),
    true,
  );
  await page
    .getByRole("button", { name: "View Parliament", exact: true })
    .click();
  assert.ok(await page.locator(".entity-details .source-card").count());
  check("Hierarchy expansion and visible React Flow attribution");
  await page
    .getByRole("button", { name: "Industries & businesses", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Expand Exxaro Resources Limited",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "View Mafube", exact: true }).click();
  await page
    .locator(".evidence-connections")
    .getByRole("button")
    .filter({ hasText: "Exxaro Resources Limited" })
    .click();
  await page.getByLabel("Relationship evidence", { exact: true }).waitFor();
  assert.ok(
    (
      await page
        .getByLabel("Relationship evidence", { exact: true })
        .innerText()
    ).includes("50%"),
  );
  assert.ok(
    (
      await page
        .getByLabel("Relationship evidence", { exact: true })
        .innerText()
    ).includes("2025-12-31"),
  );
  await screenshot(page, "desktop-mining");
  check(
    "Mining company-to-operation evidence preserves 50% joint-venture reporting date",
  );
  await page.getByRole("tab", { name: "Relationships", exact: true }).click();
  await page.locator(".relationship-surface canvas").first().waitFor();
  check("Progressive Cytoscape relationship graph renders");
  await page
    .getByRole("button", { name: "Infrastructure & systems", exact: true })
    .click();
  await page
    .getByRole("button", { name: "View Transmission · NTCSA", exact: true })
    .waitFor();
  assert.equal(await page.locator(".react-flow__node").count(), 4);
  check(
    "Electricity flow remains four functional stages after asset expansion",
  );
  await page
    .locator(".panel-tabs")
    .getByRole("button", { name: "Assistant", exact: true })
    .click();
  await page
    .getByRole("button", { name: "From power station to home", exact: true })
    .click();
  await page.locator(".action-receipt").first().waitFor();
  assert.ok(
    await page
      .locator(".conversation")
      .getByText("Electricity follows a simplified path:", { exact: false })
      .isVisible(),
  );
  await page.getByLabel("Hide assistant", { exact: true }).click();
  await page.getByLabel("Open assistant", { exact: true }).click();
  assert.ok(
    await page
      .locator(".conversation")
      .getByText("Electricity follows a simplified path:", { exact: false })
      .isVisible(),
  );
  check("Credential-free guide actions work and chat survives panel collapse");
  await page.getByRole("tab", { name: "Data", exact: true }).click();
  await page.getByLabel("Chart type", { exact: true }).selectOption("pie");
  await page.getByText("View accessible data table", { exact: true }).click();
  assert.equal(await page.locator(".data-view tbody tr").count(), 9);
  await page
    .getByLabel("Population dataset", { exact: true })
    .selectOption("za-census-2011");
  await page.getByLabel("Chart type", { exact: true }).selectOption("trend");
  assert.ok(
    await page.getByText("one more person", { exact: false }).isVisible(),
  );
  await screenshot(page, "desktop-census");
  check("Both Census datasets, chart types and discrepancy note are available");
  await page.getByRole("tab", { name: "Compare", exact: true }).click();
  await page
    .getByLabel("Comparison indicator", { exact: true })
    .selectOption("NY.GDP.MKTP.KD.ZG");
  await page
    .getByLabel("Comparison year", { exact: true })
    .selectOption("2024");
  assert.match(
    await page.locator(".comparison-view .evidence-table").first().innerText(),
    /-2[.,]78%/,
  );
  await page
    .getByLabel("Comparison display", { exact: true })
    .selectOption("history");
  await page.getByText("View historical data table", { exact: true }).click();
  assert.equal(
    await page.locator(".comparison-view details tbody tr").count(),
    11,
  );
  await screenshot(page, "desktop-comparison");
  check(
    "Matching-year comparisons preserve negative GDP growth and eleven historical observations",
  );
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await page
    .getByLabel("Timeline through year", { exact: true })
    .selectOption("2019");
  await page
    .getByLabel("Timeline entity", { exact: true })
    .selectOption("za-belfast-mine");
  assert.equal(await page.locator(".timeline-event").count(), 1);
  assert.equal(await page.locator(".timeline-event time").innerText(), "2019");
  await screenshot(page, "desktop-history");
  check("Timeline filters retain year-only precision");
  await page.getByLabel("Save exploration", { exact: true }).click();
  await page.getByLabel("Saved explorations", { exact: true }).click();
  await page
    .getByRole("dialog", { name: "Saved explorations", exact: true })
    .waitFor();
  const notes = page.getByLabel(/Notes for/).first();
  await notes.fill("Verify Belfast source and operating history.");
  const exportedInvestigation = JSON.parse(
    await download(
      page,
      page
        .getByRole("button", { name: "Export investigation", exact: true })
        .first(),
    ),
  );
  assert.equal(exportedInvestigation.context.timelineYear, 2019);
  assert.equal(exportedInvestigation.context.timelineEntity, "za-belfast-mine");
  assert.ok(exportedInvestigation.note.includes("Verify Belfast"));
  await page.getByLabel("Close dialog", { exact: true }).click();
  await page.getByRole("tab", { name: "Compare", exact: true }).click();
  await page.getByLabel("Saved explorations", { exact: true }).click();
  await page
    .getByRole("button", { name: "Open exploration ↗", exact: true })
    .first()
    .click();
  assert.equal(
    await page.getByLabel("Timeline entity", { exact: true }).inputValue(),
    "za-belfast-mine",
  );
  assert.equal(
    await page
      .getByLabel("Timeline through year", { exact: true })
      .inputValue(),
    "2019",
  );
  check("Investigations preserve notes and restore full exploration filters");
  await page.getByRole("tab", { name: "Compare", exact: true }).click();
  await page.getByLabel("Export visual report", { exact: true }).click();
  await page
    .getByLabel("Report notes", { exact: true })
    .fill("<script>report must escape notes</script>");
  const html = await download(
    page,
    page.getByRole("button", { name: "Download visual report", exact: true }),
  );
  assert.ok(html.includes("<svg"));
  assert.ok(html.includes("Source register"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>report"));
  await fs.writeFile("test-results/sample-report.html", html);
  await page.getByLabel("Close report", { exact: true }).click();
  const snapshot = JSON.parse(
    await download(
      page,
      page.getByLabel("Export knowledge snapshot", { exact: true }),
    ),
  );
  assert.equal(snapshot.comparison.year, 2024);
  check(
    "Visual HTML reports and comparison JSON exports include evidence and escape notes",
  );
  await search(page, "Reserve Bank");
  await page
    .locator(".entity-details")
    .getByRole("heading", { name: "South African Reserve Bank", exact: true })
    .waitFor();
  check("Global search finds the correct record in expanded catalogue");
  await page.getByLabel("South African directory", { exact: true }).click();
  await page.getByLabel("Search directory", { exact: true }).fill("eThekwini");
  assert.equal(await page.locator(".directory-page tbody tr").count(), 1);
  await page.getByLabel("Search directory", { exact: true }).fill("");
  await page
    .getByLabel("Show former municipality codes", { exact: true })
    .check();
  assert.ok(
    (await page.getByRole("status").innerText()).includes(
      "35 matching records",
    ),
  );
  await page
    .getByLabel("Directory type", { exact: true })
    .selectOption("national");
  await page.getByLabel("Search directory", { exact: true }).fill("Health");
  await page
    .getByRole("link", { name: "Open on canvas ↗", exact: true })
    .click();
  await page
    .locator(".entity-details")
    .getByRole("heading", { name: "Department of Health", exact: true })
    .waitFor();
  check(
    "Directory separates former codes and opens national institutions on canvas",
  );
  await page.getByLabel("Source review", { exact: true }).click();
  await page
    .getByLabel("Search source register", { exact: true })
    .fill("Census");
  await page
    .getByLabel("Review status for census", { exact: true })
    .selectOption("needs-review");
  await page
    .getByLabel("Review note for census", { exact: true })
    .fill("Check the one-person 2011 national-total discrepancy.");
  const decisions = JSON.parse(
    await download(
      page,
      page.getByRole("button", { name: "Export review notes", exact: true }),
    ),
  );
  assert.equal(decisions.decisions.census.status, "needs-review");
  assert.ok(decisions.decisions.census.note.includes("one-person"));
  const valid = await fs.readFile("data/knowledge.json");
  await page
    .getByLabel("Validate knowledge bundle", { exact: true })
    .setInputFiles({
      name: "proposal.json",
      mimeType: "application/json",
      buffer: valid,
    });
  await page
    .getByRole("heading", {
      name: "Proposal passes structural validation",
      exact: true,
    })
    .waitFor();
  await page
    .getByLabel("Validate knowledge bundle", { exact: true })
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        '{"sources":[],"entities":[],"relationships":[],"datasets":[]}',
      ),
    });
  await page
    .getByRole("heading", { name: "Proposal needs corrections", exact: true })
    .waitFor();
  await screenshot(page, "source-review", false);
  check(
    "Source review saves decisions and rejects invalid proposals without a server write",
  );
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Select country", { exact: true }).selectOption("BW");
  await page
    .getByRole("heading", { name: "Botswana BW", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("tab", { name: "Hierarchy", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page.getByRole("tab", { name: "Compare", exact: true }).isEnabled(),
    true,
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: "Botswana BW", exact: true })
    .waitFor();
  check("Country coverage is explicit and navigation survives reload");
  await context.close();
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await mockStreetTiles(mobileContext);
  const mobile = await mobileContext.newPage();
  observe(mobile);
  await mobile.goto(base, { waitUntil: "domcontentloaded" });
  await mobile.locator('.map-surface[data-provinces-loaded="true"]').waitFor();
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await screenshot(mobile, "mobile-map");
  await mobile
    .getByLabel("Focus province", { exact: true })
    .selectOption("za-gauteng");
  await mobile.locator(".assistant-panel:not([hidden])").waitFor();
  const panel = await mobile.locator(".assistant-panel").boundingBox();
  assert.ok(
    panel.width >= 388 &&
      panel.x < 2 &&
      Math.abs(panel.y + panel.height - 844) < 3,
  );
  await screenshot(mobile, "mobile-assistant");
  await mobile.getByLabel("Close assistant", { exact: true }).click();
  await mobile.getByRole("tab", { name: "Compare", exact: true }).click();
  await mobile
    .getByLabel("Comparison indicator", { exact: true })
    .selectOption("NY.GDP.MKTP.KD.ZG");
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await screenshot(mobile, "mobile-comparison");
  check(
    "Mobile map, full-width assistant sheet and comparison view fit the viewport",
  );
  await mobile.route("**/api/chat", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Test service unavailable" }),
    }),
  );
  await mobile.getByLabel("Open assistant", { exact: true }).click();
  await mobile
    .locator(".panel-tabs")
    .getByRole("button", { name: "Assistant", exact: true })
    .click();
  await mobile
    .getByLabel("Ask Civic Intelligence", { exact: true })
    .fill("Show electricity");
  await mobile.getByLabel("Send message", { exact: true }).click();
  await mobile
    .locator(".message-error")
    .getByText("Test service unavailable", { exact: false })
    .waitFor();
  check("Assistant service failures have a visible recovery state");
  await mobileContext.close();
  assert.deepEqual(warnings, [], "React Flow attribution warning is absent");
  assert.deepEqual(errors, [], "No uncaught browser errors");
  check("No attribution warnings or uncaught browser errors");
  await fs.writeFile(
    "test-results/browser-report.json",
    JSON.stringify({ base, passed: checks, errors, warnings }, null, 2),
  );
} catch (error) {
  if (activePage) {
    try {
      await screenshot(activePage, "failure");
      await fs.writeFile(
        "test-results/failure-dom.txt",
        await activePage.locator("body").ariaSnapshot(),
      );
    } catch {}
  }
  await fs.writeFile(
    "test-results/browser-report.json",
    JSON.stringify(
      { base, passed: checks, errors, warnings, failure: String(error) },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
