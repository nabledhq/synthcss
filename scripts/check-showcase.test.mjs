import { test } from "node:test";
import assert from "node:assert/strict";
import { checkShowcase, readRepoFiles } from "./check-showcase.mjs";

const repo = new URL("..", import.meta.url).pathname;
const files = readRepoFiles(repo);

const errorsWith = (changes) => checkShowcase({ ...files, ...changes });
const assertError = (errors, text) => assert.ok(errors.some((e) => e.includes(text)), errors.join("\n"));

test("repository showcase files pass", () => {
  assert.deepEqual(errorsWith({}), []);
});

test("fails when the framework stylesheet is not loaded or a third-party one is", () => {
  const noBundle = files.html.replace('href="../src/synthcss.css"', 'href="synthcss.css"');
  assertError(errorsWith({ html: noBundle }), "must load the framework");
  const cdn = files.html.replace(
    '<link rel="stylesheet" href="showcase.css">',
    '<link rel="stylesheet" href="showcase.css">\n  <link rel="stylesheet" href="https://cdn.example.com/bootstrap.min.css">',
  );
  assertError(errorsWith({ html: cdn }), "extra stylesheet");
  assertError(errorsWith({ html: cdn }), "third-party CSS framework");
});

test("fails when a section, hero item or layout example is missing", () => {
  assertError(errorsWith({ html: files.html.replace('id="responsive"', 'id="other"') }), 'missing <section id="responsive">');
  assertError(errorsWith({ html: files.html.replaceAll("CSS designed to be written", "CSS written") }), "tagline");
  assertError(errorsWith({ html: files.html.replace('id="layout-cover"', 'id="layout-x"') }), "missing example for .cover");
});

test("fails when a token is not rendered", () => {
  const html = files.html.replaceAll("var(--shadow-lg)", "none").replaceAll("<code>--shadow-lg</code>", "");
  assertError(errorsWith({ html }), "token --shadow-lg is not shown");
});

test("fails when a responsive demo has no width control", () => {
  const html = files.html.replace('data-frame="frame-split"', 'data-frame="frame-x"');
  assertError(errorsWith({ html }), ".split frame has no width slider");
});

test("fails when snippets use made-up classes or tokens, or are too long", () => {
  const madeUp = files.html.replace('&lt;ul class="cluster" role="list"&gt;', '&lt;ul class="flex-row" role="list"&gt;');
  assertError(errorsWith({ html: madeUp }), "uses .flex-row, which is not a SynthCSS class");
  const token = files.html.replace("--radius-md: 0.5rem;", "--corner: 0.5rem;");
  assertError(errorsWith({ html: token }), "uses --corner, which is not a SynthCSS token");
  const long = files.html.replace("&lt;li&gt;Design&lt;/li&gt;", "&lt;li&gt;Design&lt;/li&gt;\n".repeat(16));
  assertError(errorsWith({ html: long }), "lines, max 15");
});

test("fails when showcase.css hard-codes values or restyles framework classes", () => {
  const color = files.showcaseCss.replace("background: var(--color-surface);", "background: #f6f7f9;");
  assertError(errorsWith({ showcaseCss: color }), "hard-coded color");
  const value = files.showcaseCss.replace("padding: var(--space-3);", "padding: 0.75rem;");
  assertError(errorsWith({ showcaseCss: value }), "hard-codes the token value 0.75rem");
  const framework = files.showcaseCss + "\n.stack { gap: var(--space-1); }\n";
  assertError(errorsWith({ showcaseCss: framework }), "targets the framework class .stack");
  const redefine = files.showcaseCss + "\n.sc-page { --color-primary: var(--color-info); }\n";
  assertError(errorsWith({ showcaseCss: redefine }), "must not define custom properties");
});

test("fails when the workflow misses a Pages action or permission", () => {
  assertError(errorsWith({ workflow: files.workflow.replace("actions/deploy-pages@", "someone/deploy@") }), "actions/deploy-pages");
  assertError(errorsWith({ workflow: files.workflow.replace("id-token: write", "id-token: read") }), "id-token: write");
  assertError(errorsWith({ workflow: "" }), "pages.yml is missing");
});

test("fails when the docs miss the manual Pages step", () => {
  const showcaseReadme = files.showcaseReadme.replaceAll("Settings → Pages", "settings");
  assertError(errorsWith({ showcaseReadme }), "Settings → Pages");
});

test("fails when a component is missing from the showcase", () => {
  const html = files.html.replace('id="component-empty-state"', 'id="component-x"');
  assertError(errorsWith({ html }), "missing example for .empty-state");
  const noVariant = files.html.replace('<li class="badge badge-info">Beta</li>', "");
  assertError(errorsWith({ html: noVariant }), ".badge live demo does not show .badge-info");
});

test("fails when the composed interface is missing or uses non-SynthCSS classes", () => {
  assertError(errorsWith({ html: files.html.replace("data-composed", "data-x") }), "missing the data-composed interface");
  const custom = files.html.replace('<div class="alert alert-warning" role="status">\n                <h4>Your trial', '<div class="sc-box" role="status">\n                <h4>Your trial');
  assertError(errorsWith({ html: custom }), "composed: uses .sc-box");
});

test("fails when SynthJS or a behavior demo is missing", () => {
  const noScript = files.html.replace('<script src="../src/js/synth.js" defer></script>', "");
  assertError(errorsWith({ html: noScript }), "must load SynthJS");
  assertError(errorsWith({ html: files.html.replace('id="behaviors"', 'id="other"') }), 'missing <section id="behaviors">');
  assertError(errorsWith({ html: files.html.replace('id="behavior-dropdown"', 'id="behavior-x"') }), "missing example for data-synth-dropdown");
  const noDemo = files.html.replace('data-synth-toggle="demo-filters"', "");
  assertError(errorsWith({ html: noDemo }), "data-synth-toggle example has no live demo");
});
