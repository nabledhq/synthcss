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

test("fails when nav or tabs lose their focus ring", () => {
  const nav = withCss((css) => css.replace(".nav-link:focus-visible {", ".nav-link:focus {"));
  assertError(errorsWith(nav), "nav-link needs a :focus-visible rule");
  const tabs = withCss((css) => css.replace(".tabs-item:focus-visible {", ".tabs-item:focus {"));
  assertError(errorsWith(tabs), "tabs-item needs a :focus-visible rule");
});

test("fails when .nav does not reset the list or sets a layout", () => {
  const bullets = withCss((css) => css.replace(/(\.nav \{[^}]*)list-style: none;/, "$1"));
  assertError(errorsWith(bullets), ".nav must remove list bullets");
  const padding = withCss((css) => css.replace(/(\.nav \{[^}]*)padding: 0;/, "$1"));
  assertError(errorsWith(padding), ".nav must reset the list padding to 0");
  const display = withCss((css) => css.replace(".nav {\n", ".nav {\n  display: flex;\n"));
  assertError(errorsWith(display), ".nav must not set display");
});

test("fails when nav and tabs state does not come from aria-current and aria-selected", () => {
  const current = withCss((css) => css.replaceAll('.nav-link[aria-current="page"]', '.nav-link[data-current]'));
  assertError(errorsWith(current), '.nav-link[aria-current="page"] must change the background or text color');
  const hover = withCss((css) => css.replace(/(\.nav-link:hover \{\n  background: )var\(--color-surface\)/, "$1var(--color-surface-elevated)"));
  assertError(errorsWith(hover), ".nav-link:hover must use background: var(--color-surface)");
  const pressed = withCss((css) => css.replaceAll('.tabs-item[aria-selected="true"]', '.tabs-item[aria-pressed="true"]'));
  assertError(errorsWith(pressed), '.tabs-item[aria-selected="true"] must use background: var(--color-surface-elevated)');
  assertError(errorsWith(pressed), "must not style aria-pressed");
  const flat = withCss((css) =>
    css.replace(/(\.tabs-item\[aria-selected="true"\] \{\n)  border-color: var\(--border-color\);\n([^}]*)  box-shadow: var\(--shadow-sm\);\n/, "$1$2"),
  );
  assertError(errorsWith(flat), "must look raised");
  const opaque = withCss((css) => css.replace(/(\.tabs-item \{[^}]*background: )transparent;/, "$1var(--color-surface);"));
  assertError(errorsWith(opaque), ".tabs-item must have a transparent background by default");
  const state = withCss((css) => css + '\n.tabs-item-selected { background: var(--color-surface-elevated); color: var(--color-text); }\n');
  assertError(errorsWith(state), "unexpected class .tabs-item-selected");
});

test("fails when .tabs can overflow instead of wrapping", () => {
  const nowrap = withCss((css) => css.replace(/(\.tabs \{[^}]*)flex-wrap: wrap;/, "$1flex-wrap: nowrap;"));
  assertError(errorsWith(nowrap), ".tabs must set flex-wrap: wrap");
});

test("fails when the current nav link or a tab has too little contrast", () => {
  const nav = withCss((css) => css.replace("var(--color-primary) 10%, var(--color-background)", "var(--color-primary) 70%, var(--color-background)"));
  assertError(errorsWith(nav), 'contrast too low in .nav-link[aria-current="page"]');
  const tab = withCss((css) => css.replace(/(\.tabs-item \{[^}]*color: )var\(--color-text-secondary\)/, "$1var(--color-border)"));
  assertError(errorsWith(tab), "contrast too low in .tabs-item");
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
