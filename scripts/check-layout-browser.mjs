#!/usr/bin/env node
// Optional browser check of examples/layout.html at 375px and 1280px viewport width.
// Needs Playwright, which is not a dependency of this repository:
//   npm install --no-save playwright && npx playwright install chromium
// Usage: node scripts/check-layout-browser.mjs

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "check-layout-browser: Playwright is not installed.\n" +
      "Run `npm install --no-save playwright && npx playwright install chromium`, then try again.",
  );
  process.exit(2);
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureUrl = pathToFileURL(resolve(repo, "examples/layout.html")).href;

// Runs in the page. Returns measurements for one frame.
function measure(name) {
  const frame = document.querySelector(`[data-fixture="${name}"]`);
  const rect = (el) => el.getBoundingClientRect();
  const tops = (el) => [...el.children].map((c) => Math.round(rect(c).top));
  const one = (sel) => frame.querySelector(`[data-check="${sel}"]`);
  const out = { overflow: frame.scrollWidth > frame.clientWidth };
  const grid = one("grid");
  if (grid) out.gridColumns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  const sidebar = one("sidebar");
  if (sidebar) {
    const [a, b] = [...sidebar.children].map(rect);
    out.sidebarStacked = b.top >= a.bottom;
    out.sidebarFirstIsSidebar = sidebar.children[0].tagName === "NAV" && (b.top >= a.bottom || a.left < b.left);
  }
  const cluster = one("cluster");
  if (cluster) out.clusterRows = new Set(tops(cluster)).size;
  const split = one("split");
  if (split) {
    const [a, b] = [...split.children].map(rect);
    out.splitWrapped = b.top >= a.bottom;
    out.splitEnds = Math.abs(rect(split).right - b.right) < 1 && Math.abs(rect(split).left - a.left) < 1;
  }
  const cover = frame.querySelector(".cover");
  if (cover) {
    const main = cover.querySelector(":scope > .cover-main") ?? cover.firstElementChild;
    const c = rect(cover);
    const m = rect(main);
    out.coverCentered = Math.abs((c.top + c.bottom) / 2 - (m.top + m.bottom) / 2) < 2;
  }
  return out;
}

function nestedMeasure(name) {
  const frame = document.querySelector(`[data-fixture="${name}"]`);
  const ps = [...frame.querySelectorAll(".grid-sm > .stack-sm > *")];
  const grid = frame.querySelector(".grid-sm");
  return {
    overflow: frame.scrollWidth > frame.clientWidth,
    childMargins: ps.every((p) => {
      const s = getComputedStyle(p);
      return s.marginTop === "0px" && s.marginBottom === "0px";
    }),
    gridGap: getComputedStyle(grid).rowGap,
    stackGap: getComputedStyle(ps[0].parentElement).rowGap,
    gridColumns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
  };
}

const errors = [];
const expect = (ok, msg) => {
  if (!ok) errors.push(msg);
};

const browser = await chromium.launch();
try {
  for (const width of [375, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(fixtureUrl);
    const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(!docOverflow, `${width}px: page overflows horizontally`);

    for (const size of ["narrow", "wide"]) {
      const narrow = size === "narrow" || width < 600;
      const at = `${width}px ${size} frame`;
      for (const p of ["container", "stack", "cluster", "grid", "sidebar", "split", "center", "cover"]) {
        const m = await page.evaluate(measure, `${p}-${size}`);
        expect(!m.overflow, `${at}: .${p} overflows horizontally`);
        if (p === "grid") {
          if (narrow) expect(m.gridColumns === 1, `${at}: .grid has ${m.gridColumns} columns, expected 1`);
          else expect(m.gridColumns >= 3, `${at}: .grid has ${m.gridColumns} columns, expected 3 or more`);
        }
        if (p === "sidebar") {
          expect(m.sidebarStacked === narrow, `${at}: .sidebar ${narrow ? "should" : "should not"} stack`);
          expect(m.sidebarFirstIsSidebar, `${at}: .sidebar changed visual order`);
        }
        if (p === "cluster") {
          if (narrow) expect(m.clusterRows > 1, `${at}: .cluster did not wrap`);
          else expect(m.clusterRows === 1, `${at}: .cluster wrapped (${m.clusterRows} rows)`);
        }
        if (p === "split") {
          expect(m.splitWrapped === narrow, `${at}: .split ${narrow ? "should" : "should not"} wrap`);
          if (!narrow) expect(m.splitEnds, `${at}: .split items are not at opposite ends`);
        }
        if (p === "cover") expect(m.coverCentered, `${at}: .cover main child is not vertically centered`);
      }
      const n = await page.evaluate(nestedMeasure, `nested-${size}`);
      expect(!n.overflow, `${at}: nested example overflows horizontally`);
      expect(n.childMargins, `${at}: nested children have block margins`);
      expect(n.gridGap === "8px" && n.stackGap === "8px", `${at}: nested gaps leaked (grid ${n.gridGap}, stack ${n.stackGap})`);
      if (narrow) expect(n.gridColumns === 1, `${at}: nested grid has ${n.gridColumns} columns, expected 1`);
      else expect(n.gridColumns >= 2, `${at}: nested grid has ${n.gridColumns} columns, expected 2 or more`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (errors.length) {
  for (const e of errors) console.error(`  FAIL ${e}`);
  console.error(`\ncheck-layout-browser: ${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log("check-layout-browser: layouts respond correctly at 375px and 1280px with no horizontal overflow.");
