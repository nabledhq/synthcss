import { test } from "node:test";
import assert from "node:assert/strict";
import { checkComponents, readRepoFiles, COMPONENT_CLASSES } from "./check-components.mjs";

const repo = new URL("..", import.meta.url).pathname;
const files = readRepoFiles(repo);

const errorsWith = (changes) => checkComponents({ ...files, ...changes });
const assertError = (errors, text) => assert.ok(errors.some((e) => e.includes(text)), errors.join("\n"));
// Edits components.css, and the built CSS the same way.
const withCss = (edit) => ({ componentsCss: edit(files.componentsCss), builtCss: edit(files.builtCss) });

test("repository component files pass", () => {
  assert.deepEqual(errorsWith({}), []);
});

test("every listed component class exists in the built CSS", () => {
  for (const cls of COMPONENT_CLASSES) assert.match(files.builtCss, new RegExp(`\\.${cls}\\b`), `.${cls}`);
});

test("fails when a component class is missing or an extra variant is added", () => {
  const missing = withCss((css) => css.replaceAll(".badge-info", ".badge-other"));
  assertError(errorsWith(missing), "class .badge-info is missing from the built CSS");
  assertError(errorsWith(missing), "unexpected class .badge-other");
  const extra = withCss((css) => css + "\n.button-destructive { color: var(--color-danger); background: var(--color-background); }\n");
  assertError(errorsWith(extra), "unexpected class .button-destructive");
});

test("fails when the bundle does not import components.css", () => {
  const bundleCss = files.bundleCss.replace('@import url("components.css");', "");
  assertError(errorsWith({ bundleCss }), "does not import components.css");
});

test("fails on raw color literals, named colors and custom properties", () => {
  const hex = withCss((css) => css.replace("background: var(--color-danger);", "background: #b3362e;"));
  assertError(errorsWith(hex), "hard-coded color literal");
  const rgb = withCss((css) => css.replace("color: var(--color-on-primary);", "color: rgb(255 255 255);"));
  assertError(errorsWith(rgb), "hard-coded color literal");
  const hsl = withCss((css) => css + "\n.panel { border-color: hsl(0 0% 80%); }\n");
  assertError(errorsWith(hsl), "hard-coded color literal");
  const named = withCss((css) => css + "\n.badge { color: white; }\n");
  assertError(errorsWith(named), "named color");
  const custom = withCss((css) => css + "\n.alert { --alert-color: var(--color-info); }\n");
  assertError(errorsWith(custom), "must not define custom properties");
});

test("fails on undefined tokens, hard-coded lengths and non-token spacing", () => {
  const undefinedToken = withCss((css) => css.replace("var(--shadow-md)", "var(--shadow-xl)"));
  assertError(errorsWith(undefinedToken), "--shadow-xl, which is not defined");
  const length = withCss((css) => css + "\n.card { padding: 24px; }\n");
  assertError(errorsWith(length), "hard-coded length");
  const font = withCss((css) => css + "\n.badge { font-size: 0.8em; }\n");
  assertError(errorsWith(font), "must use a matching var(--token)");
});

test("fails when focus-visible styles are missing or outlines are removed", () => {
  const noButtonFocus = withCss((css) => css.replace(".button:focus-visible {", ".button:focus {"));
  assertError(errorsWith(noButtonFocus), "button needs a :focus-visible rule");
  const noFieldFocus = withCss((css) => css.replace(".field :where(input, textarea, select):focus-visible", ".field :where(input):focus-visible"));
  assertError(errorsWith(noFieldFocus), "field controls (select) needs a :focus-visible rule");
  const noOutline = withCss((css) => css + "\n.button { outline: none; }\n");
  assertError(errorsWith(noOutline), "must not remove focus outlines");
});

test("fails when disabled or loading selectors are missing", () => {
  const noDisabled = withCss((css) => css.replace(".button:disabled,\n", ""));
  assertError(errorsWith(noDisabled), ".button:disabled must be styled");
  const noAriaDisabled = withCss((css) => css.replace(',\n.button[aria-disabled="true"] {', " {"));
  assertError(errorsWith(noAriaDisabled), '.button[aria-disabled="true"] must be styled');
  const noFieldDisabled = withCss((css) => css.replace(".field :where(input, textarea, select):disabled {", ".field :where(input, textarea, select):read-only {"));
  assertError(errorsWith(noFieldDisabled), ".field controls need a :disabled rule");
  const noSpinner = withCss((css) => css.replace('.button[aria-busy="true"]::after', '.button[aria-busy="true"]::before'));
  assertError(errorsWith(noSpinner), "loading indicator");
});

test("fails when the field error state relies on color alone", () => {
  const colorOnly = withCss((css) =>
    css.replace(/(\)\[aria-invalid="true"\] \{\n  border-color: var\(--color-danger\);\n)[^}]*\}/, "$1}"),
  );
  assertError(errorsWith(colorOnly), "must change the border width");
  const noMarker = withCss((css) => css.replace(".field-error::before {", ".field-error::marker {"));
  assertError(errorsWith(noMarker), "visible marker");
});

test("fails when tables cannot scroll or numbers are not tabular", () => {
  const noScroll = withCss((css) => css.replace("overflow-x: auto;", "overflow-x: visible;"));
  assertError(errorsWith(noScroll), ".table-wrap must set overflow-x: auto");
  const noNumeric = withCss((css) => css.replace("font-variant-numeric: tabular-nums;", ""));
  assertError(errorsWith(noNumeric), ".numeric cells");
});

test("fails when a variant's text contrast is too low", () => {
  const low = withCss((css) => css.replace("var(--color-success) 10%, var(--color-background)", "var(--color-success) 60%, var(--color-background)"));
  assertError(errorsWith(low), "contrast too low in .badge-success");
});

test("fails when docs miss a component, a section or the reference table", () => {
  const noEmpty = files.componentDocs.replace("## `.empty-state`", "## Empty state");
  assertError(errorsWith({ componentDocs: noEmpty }), 'no "## `.empty-state`" section');
  const noA11y = files.componentDocs.replace(/(## `\.table`[\s\S]*?)### Accessibility/, "$1### Notes");
  assertError(errorsWith({ componentDocs: noA11y }), 'section .table is missing "### Accessibility"');
  const noRef = files.componentDocs.replace("## AI Component Reference", "## Reference");
  assertError(errorsWith({ componentDocs: noRef }), "AI Component Reference");
  const longRef = files.componentDocs.replace("| Nothing to show yet |", "| Extra | `.x` |\n".repeat(5) + "| Nothing to show yet |");
  assertError(errorsWith({ componentDocs: longRef }), "max 15");
  const noRoles = files.componentDocs.replaceAll('role="alert"', 'role="note"');
  assertError(errorsWith({ componentDocs: noRoles }), 'role="alert" and role="status"');
});

test("fails when doc examples or the showcase use classes that are not in the CSS", () => {
  const docs = { ...files.docs, "docs/components.md": files.docs["docs/components.md"].replaceAll('class="button button-primary"', 'class="btn btn-primary"') };
  assertError(errorsWith({ docs }), "docs/components.md: html example uses .btn");
  const showcaseHtml = files.showcaseHtml.replace('&lt;span class="badge badge-success"&gt;', '&lt;span class="badge badge-ok"&gt;');
  assertError(errorsWith({ showcaseHtml }), "showcase snippet uses .badge-ok");
  const live = files.showcaseHtml.replace('<span class="badge badge-info">Pro plan</span>', '<span class="pill">Pro plan</span>');
  assertError(errorsWith({ showcaseHtml: live }), "uses .pill, which is neither");
});
