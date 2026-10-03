#!/usr/bin/env node
// Optional browser check of showcase/index.html at 375px and 1280px viewport width.
// Needs Playwright, which is not a dependency of this repository:
//   npm install --no-save playwright && npx playwright install chromium
// Usage: node scripts/check-showcase-browser.mjs

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "check-showcase-browser: Playwright is not installed.\n" +
      "Run `npm install --no-save playwright && npx playwright install chromium`, then try again.",
  );
  process.exit(2);
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pageUrl = pathToFileURL(resolve(repo, "showcase/index.html")).href;

const errors = [];
const expect = (ok, msg) => {
  if (!ok) errors.push(msg);
};

const browser = await chromium.launch();
try {
  for (const width of [375, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (msg) => msg.type() === "error" && consoleErrors.push(msg.text()));
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("requestfailed", (req) => consoleErrors.push(`failed to load ${req.url()}`));
    await page.goto(pageUrl, { waitUntil: "load" });

    const m = await page.evaluate(() => {
      const root = document.documentElement;
      const css = (sel, prop) => getComputedStyle(document.querySelector(sel)).getPropertyValue(prop);
      const cols = (sel) => getComputedStyle(document.querySelector(sel)).gridTemplateColumns.split(" ").length;
      return {
        overflow: root.scrollWidth > root.clientWidth,
        tokens: getComputedStyle(root).getPropertyValue("--color-primary").trim() !== "",
        gridDisplay: css("#why .grid", "display"),
        whyColumns: cols("#why .grid"),
        copyButtons: document.querySelectorAll(".sc-code .sc-copy").length,
        codeBlocks: document.querySelectorAll(".sc-code").length,
        tokenValues: [...document.querySelectorAll("[data-token]")].every((el) => el.textContent.trim() !== ""),
      };
    });
    expect(consoleErrors.length === 0, `${width}px: console errors: ${consoleErrors.join("; ")}`);
    expect(!m.overflow, `${width}px: page overflows horizontally`);
    expect(m.tokens, `${width}px: SynthCSS tokens are not loaded`);
    expect(m.gridDisplay === "grid", `${width}px: SynthCSS layout classes are not applied`);
    if (width === 375) expect(m.whyColumns === 1, `${width}px: "Why" grid has ${m.whyColumns} columns, expected 1`);
    else expect(m.whyColumns >= 3, `${width}px: "Why" grid has ${m.whyColumns} columns, expected 3 or more`);
    expect(m.copyButtons === m.codeBlocks && m.codeBlocks > 0, `${width}px: not every code sample has a copy button`);
    expect(m.tokenValues, `${width}px: some live token values are empty`);

    // Responsive frames: shrink each frame with its slider and check the layout responds.
    const frames = await page.evaluate(() => {
      const measure = () => {
        const grid = document.querySelector("#frame-grid .grid-sm");
        const [a, b] = [...document.querySelector("#frame-sidebar .sidebar").children].map((c) => c.getBoundingClientRect());
        const tops = [...document.querySelector("#frame-cluster .cluster-sm").children].map((c) => Math.round(c.getBoundingClientRect().top));
        const [s1, s2] = [...document.querySelector("#frame-split .split").children].map((c) => c.getBoundingClientRect());
        return {
          gridColumns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
          sidebarStacked: b.top >= a.bottom,
          clusterRows: new Set(tops).size,
          splitWrapped: s2.top >= s1.bottom,
        };
      };
      const setAll = (value) => {
        for (const input of document.querySelectorAll("input[data-frame]")) {
          input.value = value;
          input.dispatchEvent(new Event("input"));
        }
      };
      setAll(100);
      const wide = measure();
      setAll(20);
      const narrow = measure();
      setAll(100);
      return { wide, narrow };
    });
    expect(frames.narrow.gridColumns < frames.wide.gridColumns || width === 375, `${width}px: grid columns did not reduce`);
    expect(frames.narrow.gridColumns === 1, `${width}px: narrow grid frame has ${frames.narrow.gridColumns} columns`);
    expect(frames.narrow.sidebarStacked, `${width}px: sidebar did not stack in the narrow frame`);
    expect(frames.narrow.clusterRows > 1, `${width}px: cluster did not wrap in the narrow frame`);
    expect(frames.narrow.splitWrapped, `${width}px: split did not wrap in the narrow frame`);
    if (width === 1280) {
      expect(!frames.wide.sidebarStacked, "1280px: sidebar is stacked in the wide frame");
      expect(frames.wide.clusterRows === 1, "1280px: cluster wrapped in the wide frame");
      expect(!frames.wide.splitWrapped, "1280px: split wrapped in the wide frame");
    }

    // Copy button copies the snippet text.
    const copied = await page.evaluate(async () => {
      const block = document.querySelector(".sc-code");
      block.querySelector(".sc-copy").click();
      await new Promise((r) => setTimeout(r, 100));
      let text = null;
      try {
        text = await navigator.clipboard.readText();
      } catch {}
      return { text, expected: block.querySelector("code").textContent, label: block.querySelector(".sc-copy").textContent };
    });
    expect(copied.label === "Copied", `${width}px: copy button reported "${copied.label}"`);
    if (copied.text !== null) expect(copied.text === copied.expected, `${width}px: clipboard text does not match the snippet`);

    await context.close();
  }
} finally {
  await browser.close();
}

if (errors.length) {
  for (const e of errors) console.error(`  FAIL ${e}`);
  console.error(`\ncheck-showcase-browser: ${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log("check-showcase-browser: showcase renders at 375px and 1280px with no console errors or horizontal overflow.");
