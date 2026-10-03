#!/usr/bin/env node
// Optional browser check of the base styles: fixture pages that load the bundle
// (src/synthcss.css) or only the modular files, measured with computed styles.
// Needs Playwright, which is not a dependency of this repository:
//   npm install --no-save playwright && npx playwright install chromium
// Usage: node scripts/check-base-browser.mjs

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "check-base-browser: Playwright is not installed.\n" +
      "Run `npm install --no-save playwright && npx playwright install chromium`, then try again.",
  );
  process.exit(2);
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (file) => pathToFileURL(resolve(repo, "src", file)).href;
const BUNDLE = [src("synthcss.css")];
const MODULAR = ["tokens.css", "layout.css", "components.css"].map(src);

const MARKUP = `
  <h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><h4>Heading 4</h4>
  <p>Plain paragraph with <code>code</code>.</p>
  <div class="card"><div class="card-header"><h2>Card title</h2></div><div class="card-body">Body</div></div>
  <div class="alert alert-info" role="status"><h3>Alert title</h3><p>Text</p></div>
  <section class="panel"><div class="panel-header"><h2>Panel title</h2></div><div class="panel-body">Body</div></section>
  <div class="empty-state"><h2>Nothing yet</h2><p>Text</p></div>`;

const FIXTURES = {
  bundle: { sheets: BUNDLE, css: "" },
  inter: { sheets: BUNDLE, css: ':root { --font-sans: "Inter", sans-serif; }' },
  author: { sheets: BUNDLE, css: "body { font-family: serif; } h1 { font-size: 10px; }" },
  modular: { sheets: MODULAR, css: "" },
};

const page = ({ sheets, css }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SynthCSS base fixture</title>
${sheets.map((href) => `  <link rel="stylesheet" href="${href}">`).join("\n")}
  <style>${css}</style>
</head>
<body>${MARKUP}
</body>
</html>
`;

// Runs in the page.
function measure() {
  const root = document.documentElement;
  const cs = (el) => getComputedStyle(el);
  const $ = (sel) => document.querySelector(sel);
  // Resolve a token to a computed value through a probe element.
  const probe = document.createElement("div");
  document.body.append(probe);
  const token = (prop, name) => {
    probe.style.setProperty(prop, `var(${name})`);
    const value = cs(probe).getPropertyValue(prop);
    probe.style.removeProperty(prop);
    return value;
  };
  const heading = (sel) => {
    const s = cs($(sel));
    return { fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, color: s.color };
  };
  const out = {
    tokens: {
      fontSans: token("font-family", "--font-sans"),
      fontMono: token("font-family", "--font-mono"),
      text: token("color", "--color-text"),
      background: token("background-color", "--color-background"),
      sizes: Object.fromEntries(["--text-3xl", "--text-2xl", "--text-xl", "--text-lg"].map((t) => [t, token("font-size", t)])),
      weight: token("font-weight", "--weight-semibold"),
    },
    html: { fontFamily: cs(root).fontFamily, fontSize: cs(root).fontSize, color: cs(root).color, background: cs(root).backgroundColor },
    body: { fontFamily: cs(document.body).fontFamily },
    p: { fontFamily: cs($("body > p")).fontFamily },
    code: { fontFamily: cs($("code")).fontFamily },
    headings: Object.fromEntries(["h1", "h2", "h3", "h4"].map((h) => [h, heading(`body > ${h}`)])),
    components: Object.fromEntries(
      [".card-header h2", ".alert h3", ".panel-header h2", ".empty-state h2"].map((sel) => [sel, heading(sel)]),
    ),
  };
  probe.remove();
  return out;
}

const errors = [];
const expect = (ok, msg) => {
  if (!ok) errors.push(msg);
};
const fonts = (value) => value.replace(/["']/g, "").replace(/\s*,\s*/g, ",").trim();

const dir = mkdtempSync(join(tmpdir(), "synthcss-base-"));
const browser = await chromium.launch();
try {
  const results = {};
  for (const [name, fixture] of Object.entries(FIXTURES)) {
    const file = join(dir, `${name}.html`);
    writeFileSync(file, page(fixture));
    const tab = await browser.newPage();
    const failed = [];
    tab.on("requestfailed", (req) => failed.push(req.url()));
    await tab.goto(pathToFileURL(file).href, { waitUntil: "load" });
    expect(failed.length === 0, `${name}: failed to load ${failed.join(", ")}`);
    results[name] = await tab.evaluate(measure);
    await tab.close();
  }
  const { bundle, inter, author, modular } = results;

  // The bundle alone applies the tokens to the page and the headings.
  expect(fonts(bundle.body.fontFamily) === fonts(bundle.tokens.fontSans), `bundle: body font-family is ${bundle.body.fontFamily}, not --font-sans`);
  expect(bundle.html.fontSize === "16px", `bundle: html font-size is ${bundle.html.fontSize}, expected 100% (16px)`);
  expect(bundle.html.color === bundle.tokens.text, "bundle: html color is not --color-text");
  expect(bundle.html.background === bundle.tokens.background, "bundle: html background is not --color-background");
  expect(fonts(bundle.code.fontFamily) === fonts(bundle.tokens.fontMono), `bundle: code font-family is ${bundle.code.fontFamily}, not --font-mono`);
  for (const [h, t] of [["h1", "--text-3xl"], ["h2", "--text-2xl"], ["h3", "--text-xl"], ["h4", "--text-lg"]]) {
    const got = bundle.headings[h];
    expect(got.fontSize === bundle.tokens.sizes[t], `bundle: ${h} font-size is ${got.fontSize}, expected ${t} (${bundle.tokens.sizes[t]})`);
    expect(got.fontWeight === bundle.tokens.weight, `bundle: ${h} font-weight is ${got.fontWeight}, expected --weight-semibold`);
  }

  // Overriding --font-sans on :root restyles the page.
  for (const el of ["body", "p"]) {
    expect(fonts(inter[el].fontFamily) === "Inter,sans-serif", `inter: ${el} font-family is ${inter[el].fontFamily}, expected the --font-sans override`);
  }

  // Author rules beat the base layer.
  expect(fonts(author.body.fontFamily) === "serif", `author: body { font-family: serif } lost, got ${author.body.fontFamily}`);
  expect(author.headings.h1.fontSize === "10px", `author: h1 { font-size: 10px } lost, got ${author.headings.h1.fontSize}`);

  // Component headings render the same with and without the base layer.
  for (const [sel, got] of Object.entries(bundle.components)) {
    const before = modular.components[sel];
    expect(JSON.stringify(got) === JSON.stringify(before), `${sel} changed: ${JSON.stringify(before)} → ${JSON.stringify(got)}`);
  }

  // The modular files alone apply no base styles.
  expect(fonts(modular.body.fontFamily) !== fonts(modular.tokens.fontSans), "modular: body uses --font-sans without the base layer");
  expect(modular.headings.h1.fontSize !== modular.tokens.sizes["--text-3xl"], "modular: h1 uses --text-3xl without the base layer");
  expect(modular.headings.h1.fontWeight !== modular.tokens.weight, "modular: h1 uses --weight-semibold without the base layer");
} finally {
  await browser.close();
  rmSync(dir, { recursive: true, force: true });
}

if (errors.length) {
  for (const e of errors) console.error(`  FAIL ${e}`);
  console.error(`\ncheck-base-browser: ${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log(
  "check-base-browser: the bundle applies --font-sans, colors and the heading scale; author rules and component headings win; modular files apply no base styles.",
);
