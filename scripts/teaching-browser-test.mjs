import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright-core";
import {
  mockStreetTiles,
  mockSatelliteTiles,
} from "./browser-map-fixtures.mjs";
const base =
  process.env.TEST_BASE_URL || process.argv[2] || "http://127.0.0.1:3100";
await fs.mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ||
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
  timeout: 120000,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--renderer-process-limit=2",
  ],
});
const source = {
  title: "Test water authority",
  url: "https://example.org/water",
  date: "2026",
};
function component(id, kind, title, x = 0) {
  return {
    id,
    kind,
    title,
    x,
    y: 0,
    width: 560,
    height: 420,
    text: "Illustrative browser test, not real country data.",
    nodes: [],
    edges: [],
    series: [],
    chartType: "bar",
    events: [],
    markers: [],
    center: [24, -29],
    zoom: 4,
    sources: [source],
    asOf: "Test fixture",
    highlighted: [],
    filter: "",
    collapsed: [],
  };
}
const flow = {
  ...component("water-flow", "flow", "Water supply"),
  nodes: [
    {
      id: "source",
      label: "Water source",
      detail: "The selected source feeds treatment.",
    },
    { id: "home", label: "Homes", detail: "Water arrives after treatment." },
  ],
  edges: [{ id: "pipe", source: "source", target: "home", label: "Supply" }],
};
const chart = {
  ...component("water-chart", "chart", "Water comparison", 600),
  series: [
    {
      name: "Water",
      unit: "test units",
      points: [
        { label: "A", value: 10 },
        { label: "B", value: null },
      ],
    },
  ],
};
const map = {
  ...component("water-map", "map", "Water locations"),
  y: 460,
  markers: [
    {
      id: "site",
      label: "Test site",
      detail: "A test coordinate only.",
      longitude: 24,
      latitude: -29,
      precision: "approximate",
      sourceUrl: source.url,
    },
  ],
};
const network = {
  ...component("water-network", "relationships", "Water connections", 600),
  y: 460,
  nodes: flow.nodes,
  edges: flow.edges,
};
const timeline = {
  ...component("water-history", "timeline", "Water history"),
  y: 920,
  events: [
    {
      id: "event-a",
      date: "2020",
      label: "Test event",
      detail: "An illustrative dated event.",
    },
  ],
};
const checks = [],
  errors = [];
const check = (label) => {
  checks.push(label);
  console.log("PASS " + label);
};
let mode = "initial",
  pending;
let activePage;
try {
  const page = await browser.newPage({
    viewport: { width: 1500, height: 1000 },
    reducedMotion: "reduce",
  });
  activePage = page;
  page.setDefaultTimeout(90000);
  page.on("pageerror", (error) => errors.push(error.message.split("?")[0]));
  await mockStreetTiles(page);
  await mockSatelliteTiles(page);
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { ai: "configured", model: "gpt-6-luna" } }),
  );
  await page.route("**/api/chat", async (route) => {
    const request = route.request().postDataJSON();
    if (mode === "stale")
      await new Promise((resolve) => {
        pending = resolve;
      });
    let commands =
      mode === "initial"
        ? [flow, chart, map, network, timeline].map((component) => ({
            type: "upsert_component",
            component,
          }))
        : [
            {
              type: "highlight_elements",
              componentId: flow.id,
              ids: ["source"],
            },
          ];
    const text = "This explanation has a source [1].";
    const events = [
      { type: "delta", text },
      {
        type: "done",
        actions: [],
        sourceIds: [],
        commands,
        revision: request.revision,
        sources: [source],
        citations: [{ ...source, start: 30, end: 33 }],
        engine: "gpt-6-luna",
      },
    ];
    await route.fulfill({
      contentType: "application/x-ndjson",
      body: events.map((e) => JSON.stringify(e)).join("\n") + "\n",
    });
  });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator(".app-shell").waitFor();
  console.log((await page.locator(".view-bar").ariaSnapshot()).slice(0, 1600));
  await page
    .getByRole("button", { name: "Teaching canvas", exact: true })
    .click();
  await page
    .getByLabel("Ask Civic Intelligence")
    .fill("Explain water supply visually");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page.locator('.teaching-board[data-component-count="5"]').waitFor();
  await page
    .getByRole("button", { name: "Fit teaching canvas", exact: true })
    .click();
  await page
    .locator(
      '.teaching-component[aria-label="Water supply"] .react-flow__node[data-id="source"]',
    )
    .waitFor();
  await page
    .getByRole("button", { name: "Open Test site", exact: true })
    .waitFor();
  await page
    .locator('.inline-citation[href="https://example.org/water"]')
    .waitFor();
  check(
    "AI response creates coexisting diagrams, chart, map, network and timeline with clickable citation",
  );
  const visual = page.locator('.teaching-component[aria-label="Water supply"]');
  await visual.locator('.react-flow__node[data-id="source"]').click();
  await visual
    .locator(".teaching-inspector")
    .getByText("The selected source feeds treatment.", { exact: true })
    .waitFor();
  check(
    "selecting a diagram element opens its details without losing selection to the outer board",
  );
  await visual
    .getByRole("button", { name: "Collapse children", exact: true })
    .click();
  assert.equal(
    await visual.locator('.react-flow__node[data-id="home"]').count(),
    0,
  );
  await visual
    .getByRole("button", { name: "Expand children", exact: true })
    .click();
  await visual.locator('.react-flow__node[data-id="home"]').waitFor();
  check("diagram children can collapse and expand");
  mode = "followup";
  await page
    .getByLabel("Ask Civic Intelligence")
    .fill("Highlight the selected step");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await visual
    .getByRole("button", { name: "Remove highlight", exact: true })
    .waitFor();
  assert.equal(await page.locator(".teaching-component").count(), 5);
  check("follow-up highlights an existing element and preserves other visuals");
  await page
    .getByRole("button", { name: "Close Water comparison", exact: true })
    .click();
  await page.locator('.teaching-board[data-component-count="4"]').waitFor();
  await page
    .getByRole("button", { name: "Undo canvas change", exact: true })
    .click();
  await page.locator('.teaching-board[data-component-count="5"]').waitFor();
  check("closing visuals and undo restore the full previous component");
  mode = "stale";
  await page
    .getByLabel("Ask Civic Intelligence")
    .fill("Highlight that step again");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page.getByRole("button", { name: "Add visual", exact: true }).click();
  await page.locator('.teaching-board[data-component-count="6"]').waitFor();
  assert.ok(pending);
  pending();
  await page
    .getByText(
      "Your canvas changed while the AI was responding. Ask again to use the current canvas.",
      { exact: false },
    )
    .waitFor();
  check("an edit during an AI response prevents stale changes from applying");
  await page.screenshot({
    path: "test-results/teaching-desktop.png",
    fullPage: true,
  });
  await page.reload();
  await page.locator('.teaching-board[data-component-count="6"]').waitFor();
  await page
    .locator(
      '.teaching-component[aria-label="Water supply"] .react-flow__node[data-id="source"]',
    )
    .waitFor();
  await page
    .getByRole("button", { name: "Open Test site", exact: true })
    .waitFor();
  check("teaching canvas persists after reload");
  await page.setViewportSize({ width: 390, height: 844 });
  if (
    await page
      .getByRole("button", { name: "Close assistant", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Close assistant", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Fit teaching canvas", exact: true })
    .click();
  assert.ok(await page.locator(".teaching-toolbar").isVisible());
  await page.screenshot({
    path: "test-results/teaching-mobile.png",
    fullPage: true,
  });
  check(
    "canvas toolbar and pan/zoom board remain available on a phone viewport",
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/teaching-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (error) {
  await fs.mkdir("test-results", { recursive: true });
  if (activePage) {
    await activePage
      .screenshot({ path: "test-results/teaching-failure.png", fullPage: true })
      .catch(() => {});
    await fs.writeFile(
      "test-results/teaching-dom.txt",
      await activePage
        .locator(".teaching-workspace")
        .ariaSnapshot()
        .catch(() => "Canvas unavailable"),
    );
  }
  await fs.writeFile(
    "test-results/teaching-failure.json",
    JSON.stringify(
      { checks, error: String(error).split("?")[0], errors },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
