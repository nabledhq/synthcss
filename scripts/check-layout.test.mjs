import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLayout, readRepoFiles } from "./check-layout.mjs";

const repo = new URL("..", import.meta.url).pathname;
const files = readRepoFiles(repo);

const errorsWith = (changes) => checkLayout({ ...files, ...changes });
const assertError = (errors, text) => assert.ok(errors.some((e) => e.includes(text)), errors.join("\n"));

test("repository layout files pass", () => {
  assert.deepEqual(errorsWith({}), []);
});

test("fails when a primitive is missing", () => {
  const layoutCss = files.layoutCss.replace(/\.center \{[\s\S]*?\}/, "");
  assertError(errorsWith({ layoutCss }), "class .center is not defined");
});

test("fails when a variant is missing or extra variants are added", () => {
  const missing = files.layoutCss.replace(".split-lg { gap: var(--space-6); }", "");
  assertError(errorsWith({ layoutCss: missing }), ".split-lg uses the same gap as .split");
  const extra = files.layoutCss + "\n.container-sm { padding-inline: var(--space-2); }\n";
  assertError(errorsWith({ layoutCss: extra }), "unexpected class .container-sm");
});

test("fails on hard-coded spacing and undefined tokens", () => {
  const hardCoded = files.layoutCss.replace(".stack-sm { gap: var(--space-2); }", ".stack-sm { gap: 8px; }");
  assertError(errorsWith({ layoutCss: hardCoded }), "hard-coded length");
  const undefinedToken = files.layoutCss.replace("var(--grid-min)", "var(--grid-minimum)");
  assertError(errorsWith({ layoutCss: undefinedToken }), "--grid-minimum, which is not defined");
});

test("fails on media queries and reading-order changes", () => {
  const media = files.layoutCss + "\n@media (min-width: 40rem) { .grid { gap: var(--space-5); } }\n";
  assertError(errorsWith({ layoutCss: media }), "must not use at-rules");
  const order = files.layoutCss.replace("flex-direction: column;", "flex-direction: column-reverse;");
  assertError(errorsWith({ layoutCss: order }), "reading-order-changing value");
  const orderProp = files.layoutCss + "\n.sidebar > :first-child { order: 2; }\n";
  assertError(errorsWith({ layoutCss: orderProp }), "reading-order-changing property");
});

test("fails when the bundle does not include layout.css", () => {
  assertError(errorsWith({ bundleCss: '@import url("tokens.css");' }), "does not import layout.css");
});

test("fails when docs miss a section or the vocabulary table", () => {
  const noMisuses = files.docs.replace(/(## `\.cover`[\s\S]*?)### Common misuses/, "$1### Pitfalls");
  assertError(errorsWith({ docs: noMisuses }), 'section .cover is missing "### Common misuses"');
  const noVocab = files.docs.replace("## AI Layout Vocabulary", "## Vocabulary");
  assertError(errorsWith({ docs: noVocab }), "AI Layout Vocabulary");
});

test("fails when the fixture does not use a variant", () => {
  const fixture = files.fixture.replaceAll("grid-lg", "grid");
  assertError(errorsWith({ fixture }), "does not use .grid-lg");
});

test("fails when .sidebar-end is missing, incomplete or not in the fixture", () => {
  const noReset = files.layoutCss.replace("  min-inline-size: auto;\n", "");
  assertError(errorsWith({ layoutCss: noReset }), "must set min-inline-size: auto");
  const weaker = files.layoutCss.replace(
    ".sidebar-end:is(.sidebar, .sidebar-sm, .sidebar-lg) > :first-child",
    ".sidebar-end > :first-child",
  );
  assertError(errorsWith({ layoutCss: weaker }), 'no ".sidebar-end:is(.sidebar, .sidebar-sm, .sidebar-lg) > :first-child" rule');
  const reversed = files.layoutCss.replace("flex-grow: 999;\n  min-inline-size: 50%;\n}\n\n.sidebar-end", "flex-direction: row-reverse;\n}\n\n.sidebar-end");
  assertError(errorsWith({ layoutCss: reversed }), "reading-order-changing value");
  const fixture = files.fixture.replaceAll(" sidebar-end", "");
  assertError(errorsWith({ fixture }), "does not use .sidebar-end");
});
