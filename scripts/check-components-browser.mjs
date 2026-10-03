#!/usr/bin/env node
// Optional browser check of the components on showcase/index.html at 375px and
// 1280px viewport width: tokens applied, states, focus rings, table scrolling,
// avatar sizes and .alert-icon placement, plus .tabs at 320px.
// Needs Playwright, which is not a dependency of this repository:
//   npm install --no-save playwright && npx playwright install chromium
// Usage: node scripts/check-components-browser.mjs

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "check-components-browser: Playwright is not installed.\n" +
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

// Tabs through the page until the focused element matches `selector`, then
// returns its computed outline. Keyboard focus is what triggers :focus-visible.
async function tabTo(page, selector) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.locator("body").focus();
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press("Tab");
    const outline = await page.evaluate((sel) => {
      const el = document.activeElement;
      if (!el?.matches(sel)) return null;
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    }, selector);
    if (outline) return outline;
  }
  return null;
}

const browser = await chromium.launch();
try {
  for (const width of [375, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    const consoleErrors = [];
    // Only local files matter; external images (badges) may be unreachable offline.
    page.on("console", (msg) => msg.type() === "error" && !/^https?:/.test(msg.location().url ?? "") && consoleErrors.push(msg.text()));
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("requestfailed", (req) => req.url().startsWith("file:") && consoleErrors.push(`failed to load ${req.url()}`));
    await page.goto(pageUrl, { waitUntil: "load" });

    const m = await page.evaluate(() => {
      const $ = (sel) => document.querySelector(sel);
      const css = (sel, prop, pseudo) => getComputedStyle($(sel), pseudo).getPropertyValue(prop);
      // Resolve a token to its computed color through a probe element.
      const probe = document.createElement("div");
      document.body.append(probe);
      const token = (name) => {
        probe.style.color = `var(${name})`;
        return getComputedStyle(probe).color;
      };
      const wraps = [...document.querySelectorAll("#components .table-wrap, #composed .table-wrap")].map((w) => ({
        overflowX: getComputedStyle(w).overflowX,
        scrolls: w.scrollWidth > w.clientWidth,
      }));
      // Nav and tabs: attribute-driven states and layout inside .stack / .cluster.
      const look = (el) => {
        const s = getComputedStyle(el);
        return [s.backgroundColor, s.color, s.boxShadow, s.borderTopColor].join("|");
      };
      function navAndTabs() {
        const links = [...document.querySelectorAll("#component-nav ~ .sc-demo .nav-link")];
        const current = links.find((a) => a.getAttribute("aria-current") === "page");
        const plain = links.find((a) => !a.hasAttribute("aria-current"));
        const items = [...document.querySelectorAll("#component-tabs ~ .sc-demo .tabs-item")];
        const selected = items.find((b) => b.getAttribute("aria-selected") === "true");
        const unselected = items.filter((b) => b.getAttribute("aria-selected") === "false");
        const lists = [...document.querySelectorAll("#component-nav ~ .sc-demo .nav")];
        const vertical = lists.find((l) => l.classList.contains("stack-sm"));
        const horizontal = lists.find((l) => l.classList.contains("cluster-sm"));
        const top = (el) => el.getBoundingClientRect().top;
        const rows = (list) => new Set([...list.children].map((li) => Math.round(top(li)))).size;
        const ls = getComputedStyle(lists[0]);
        return {
          navCurrentColor: getComputedStyle(current).color === token("--color-primary"),
          navCurrentDistinct: look(current) !== look(plain),
          navUnderline: getComputedStyle(plain).textDecorationLine,
          navReset: ls.listStyleType === "none" && ls.paddingInlineStart === "0px" && ls.marginTop === "0px",
          navVertical: rows(vertical) === vertical.children.length,
          navHorizontal: rows(horizontal) === 1,
          tabSelectedBg: getComputedStyle(selected).backgroundColor === token("--color-surface-elevated"),
          tabSelectedDistinct: unselected.every((b) => look(b) !== look(selected)),
          tabUnselectedSame: unselected.every((b) => look(b) === look(unselected[0])),
          tabTrackBg: getComputedStyle(selected.parentElement).backgroundColor === token("--color-surface"),
        };
      }
      // Avatars: fixed squares from --control-height with centered content;
      // .alert-icon beside the content, and plain alerts still a column flexbox.
      function avatarsAndAlerts() {
        const probeSize = document.createElement("div");
        probeSize.style.inlineSize = "var(--control-height)";
        document.body.append(probeSize);
        const control = probeSize.getBoundingClientRect().width;
        probeSize.remove();
        const avatars = [...document.querySelectorAll("#component-avatar ~ .sc-demo .avatar")];
        const box = (el) => el.getBoundingClientRect();
        const near = (a, b) => Math.abs(a - b) < 1;
        const expected = (el) => control * (el.classList.contains("avatar-sm") ? 0.75 : el.classList.contains("avatar-lg") ? 1.5 : 1);
        const centered = (el) => {
          const child = el.firstElementChild;
          const range = document.createRange();
          range.selectNodeContents(el);
          const inner = child ? box(child) : range.getBoundingClientRect();
          const outer = box(el);
          return near(inner.left + inner.width / 2, outer.left + outer.width / 2) && near(inner.top + inner.height / 2, outer.top + outer.height / 2);
        };
        const round = avatars.find((a) => a.classList.contains("avatar-round"));
        const square = avatars.find((a) => !a.classList.contains("avatar-round"));
        const accent = avatars.find((a) => a.classList.contains("avatar-accent"));
        const img = avatars.find((a) => a.tagName === "IMG");
        const iconAlert = document.querySelector("#component-alert ~ .sc-demo .alert:has(> .alert-icon)");
        const icon = iconAlert.querySelector(".alert-icon");
        const content = icon.nextElementSibling;
        const plainAlert = document.querySelector("#component-alert ~ .sc-demo .alert:not(:has(> .alert-icon))");
        return {
          avatarSizes: avatars.length > 0 && avatars.every((a) => near(box(a).width, expected(a)) && near(box(a).height, expected(a))),
          avatarCentered: avatars.filter((a) => a.tagName !== "IMG").every(centered),
          avatarRound: getComputedStyle(round).borderTopLeftRadius === getComputedStyle(probe).getPropertyValue("--radius-full").trim(),
          avatarSquareRadius: parseFloat(getComputedStyle(square).borderTopLeftRadius) > 0 && parseFloat(getComputedStyle(square).borderTopLeftRadius) < box(square).width / 2,
          avatarAccent: getComputedStyle(accent).color === token("--color-accent"),
          avatarImgCover: getComputedStyle(img).objectFit === "cover",
          alertIconBeside: box(icon).right <= box(content).left && near(box(icon).top, box(content).top),
          alertPlainColumn: getComputedStyle(plainAlert).display === "flex" && getComputedStyle(plainAlert).flexDirection === "column",
        };
      }
      const result = {
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        primaryBg: css("#components .button-primary", "background-color") === token("--color-primary"),
        dangerBg: css("#components .button-danger", "background-color") === token("--color-danger"),
        badgeColor: css("#components .badge-success", "color") === token("--color-success"),
        alertBorder: css("#components .alert-danger", "border-inline-start-color") === token("--color-danger"),
        cardShadow: css("#components .card", "box-shadow") !== "none",
        panelShadow: css("#components .panel", "box-shadow") === "none",
        disabledOpacity: parseFloat(css("#components .button[disabled]", "opacity")),
        busyIndicator: css('#components .button[aria-busy="true"]', "content", "::after") !== "none",
        invalidBorder: parseFloat(css('#components [aria-invalid="true"]', "border-top-width")),
        validBorder: parseFloat(css("#components .field input[type=text]", "border-top-width")),
        errorMarker: css("#components .field-error", "content", "::before"),
        numericAlign: css("#components .table .numeric", "text-align"),
        emptyAlign: css("#components .empty-state", "text-align"),
        wraps,
        ...navAndTabs(),
        ...avatarsAndAlerts(),
      };
      probe.remove();
      return result;
    });

    expect(consoleErrors.length === 0, `${width}px: console errors: ${consoleErrors.join("; ")}`);
    expect(!m.overflow, `${width}px: page overflows horizontally`);
    expect(m.primaryBg, `${width}px: .button-primary is not filled with --color-primary`);
    expect(m.dangerBg, `${width}px: .button-danger is not filled with --color-danger`);
    expect(m.badgeColor, `${width}px: .badge-success text is not --color-success`);
    expect(m.alertBorder, `${width}px: .alert-danger border is not --color-danger`);
    expect(m.cardShadow && m.panelShadow, `${width}px: .card should have a shadow and .panel none`);
    expect(m.disabledOpacity < 1, `${width}px: disabled button is not faded`);
    expect(m.busyIndicator, `${width}px: busy button shows no loading indicator`);
    expect(m.invalidBorder > m.validBorder, `${width}px: invalid field border is not thicker (${m.invalidBorder} vs ${m.validBorder})`);
    expect(/!/.test(m.errorMarker), `${width}px: .field-error has no marker`);
    expect(["end", "right"].includes(m.numericAlign), `${width}px: .numeric is not right-aligned`);
    expect(m.emptyAlign === "center", `${width}px: .empty-state is not centered`);
    expect(m.wraps.length > 0 && m.wraps.every((w) => w.overflowX === "auto"), `${width}px: .table-wrap does not scroll horizontally`);
    if (width === 375) expect(m.wraps.some((w) => w.scrolls), "375px: no table scrolls inside .table-wrap at phone width");
    expect(m.navCurrentColor, `${width}px: .nav-link[aria-current="page"] text is not --color-primary`);
    expect(m.navCurrentDistinct, `${width}px: .nav-link[aria-current="page"] looks like the other links`);
    expect(m.navUnderline === "none", `${width}px: .nav-link is underlined`);
    expect(m.navReset, `${width}px: .nav does not reset bullets, padding and margin`);
    expect(m.navVertical && m.navHorizontal, `${width}px: .nav does not follow .stack-sm (vertical) and .cluster-sm (horizontal)`);
    expect(m.tabSelectedBg && m.tabTrackBg, `${width}px: .tabs track or selected .tabs-item does not use its surface tokens`);
    expect(m.tabSelectedDistinct && m.tabUnselectedSame, `${width}px: aria-selected="true" is not distinct, or aria-selected="false" items differ`);

    expect(m.avatarSizes, `${width}px: .avatar sizes are not 0.75×, 1× and 1.5× --control-height squares`);
    expect(m.avatarCentered, `${width}px: .avatar content is not centered`);
    expect(m.avatarRound && m.avatarSquareRadius, `${width}px: .avatar-round is not a circle, or .avatar is not a rounded square`);
    expect(m.avatarAccent, `${width}px: .avatar-accent content is not --color-accent`);
    expect(m.avatarImgCover, `${width}px: img.avatar does not use object-fit: cover`);
    expect(m.alertIconBeside, `${width}px: .alert-icon is not to the left of the content, top-aligned`);
    expect(m.alertPlainColumn, `${width}px: an .alert without an icon is no longer a column flexbox`);

    for (const [what, sel] of [
      ["button", "#components .button"],
      ["text input", "#components .field input[type=text]"],
      ["select", "#components .field select"],
      ["checkbox", "#components .field input[type=checkbox]"],
      ["table-wrap", "#components .table-wrap"],
      ["nav-link", "#components .nav-link"],
      ["tabs-item", "#components .tabs-item"],
    ]) {
      const ring = await tabTo(page, sel);
      expect(ring && ring.style === "solid" && ring.width > 0, `${width}px: ${what} has no visible :focus-visible ring`);
    }
    await page.close();
  }

  // At 320px every .tabs on the page stays inside its container (it wraps).
  const narrow = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await narrow.goto(pageUrl, { waitUntil: "load" });
  const tabs = await narrow.evaluate(() =>
    [...document.querySelectorAll(".tabs")].map((t) => {
      const box = t.getBoundingClientRect();
      const parent = t.parentElement.getBoundingClientRect();
      return { overflows: t.scrollWidth > t.clientWidth || box.right > parent.right + 0.5, label: t.getAttribute("aria-label") };
    }),
  );
  expect(tabs.length > 0, "320px: no .tabs found on the showcase");
  for (const t of tabs) expect(!t.overflows, `320px: .tabs "${t.label}" overflows its container`);
  // A long tab list at 320px must wrap onto more rows rather than overflow. (The
  // showcase hero is measured separately; here only the tabs' own box counts.)
  const wide = await narrow.evaluate(() => {
    const t = document.querySelector("#components .tabs").cloneNode(true);
    for (let i = 0; i < 6; i++) t.append(t.firstElementChild.cloneNode(true));
    document.body.prepend(t);
    const right = Math.max(t.getBoundingClientRect().right, ...[...t.children].map((b) => b.getBoundingClientRect().right));
    const r = {
      overflow: t.scrollWidth > t.clientWidth || right > document.body.getBoundingClientRect().right + 0.5,
      rows: new Set([...t.children].map((b) => Math.round(b.getBoundingClientRect().top))).size,
    };
    t.remove();
    return r;
  });
  expect(!wide.overflow && wide.rows > 1, `320px: a long .tabs does not wrap (rows: ${wide.rows}, overflows: ${wide.overflow})`);
  await narrow.close();
} finally {
  await browser.close();
}

if (errors.length) {
  for (const e of errors) console.error(`  FAIL ${e}`);
  console.error(`\ncheck-components-browser: ${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log(
  "check-components-browser: components render with tokens, states, focus rings and scrolling tables at 375px and 1280px; avatars are centered squares and .alert-icon sits beside the content; .tabs wraps at 320px.",
);
