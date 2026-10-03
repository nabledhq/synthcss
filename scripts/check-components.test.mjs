import { test } from "node:test";
import assert from "node:assert/strict";
import { checkComponents, readRepoFiles, COMPONENT_CLASSES, MAX_REFERENCE_ROWS } from "./check-components.mjs";

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
  assertError(errorsWith({ componentDocs: longRef }), `max ${MAX_REFERENCE_ROWS}`);
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

test("fails when an avatar is not sized from --control-height or loses its shape", () => {
  const fixed = withCss((css) => css.replace(/(\.avatar \{[^}]*)inline-size: var\(--control-height\);/, "$1inline-size: var(--input-height);"));
  assertError(errorsWith(fixed), ".avatar must set inline-size: var(--control-height)");
  const sm = withCss((css) => css.replace(/(\.avatar-sm \{[^}]*)block-size: calc\(var\(--control-height\) \* 0\.75\);/, "$1block-size: var(--control-height);"));
  assertError(errorsWith(sm), ".avatar-sm must set block-size to calc(var(--control-height) * N)");
  const round = withCss((css) => css.replace(/(\.avatar-round \{[^}]*)var\(--radius-full\)/, "$1var(--radius-lg)"));
  assertError(errorsWith(round), ".avatar-round must set border-radius: var(--radius-full)");
  const cover = withCss((css) => css.replace("object-fit: cover;\n}\n\n.avatar > :where(img)", "object-fit: fill;\n}\n\n.avatar > :where(img)"));
  assertError(errorsWith(cover), ".avatar images must use object-fit: cover");
});

test("fails when an avatar tone does not tint through --tone", () => {
  const token = withCss((css) => css.replace(".avatar-accent { --tone: var(--color-accent); }", ".avatar-accent { --tone: var(--color-info); }"));
  assertError(errorsWith(token), ".avatar-accent must set --tone: var(--color-accent)");
  const mix = withCss((css) => css.replace("var(--tone) 12%, var(--color-background)", "var(--tone) 20%, var(--color-background)"));
  assertError(errorsWith(mix), "must use background: color-mix(in srgb, var(--tone) 12%, var(--color-background))");
  const literal = withCss((css) => css.replace(".avatar-info { --tone: var(--color-info); }", ".avatar-info { --tone: 1rem; }"));
  assertError(errorsWith(literal), "must be a var(--color-*) token");
  const other = withCss((css) => css + "\n.avatar { --size: var(--control-height); }\n");
  assertError(errorsWith(other), "must not define custom properties other than --tone");
});

test("fails when an avatar tone's foreground has too little contrast on its tint", () => {
  const success = withCss((css) => css.replace("color-mix(in srgb, var(--tone) 90%, var(--color-text))", "var(--tone)"));
  assertError(errorsWith(success), "contrast too low in .avatar-success: 4.46:1");
  const tokensCss = files.tokensCss.replace(/--color-accent: #[0-9a-f]+;/, "--color-accent: #a78bfa;");
  assertError(errorsWith({ tokensCss }), "contrast too low in .avatar-accent");
});

test("fails when .alert-icon does not switch the alert layout or .alert itself changes", () => {
  const noGrid = withCss((css) => css.replace(/(\.alert:has\(> \.alert-icon\) \{[^}]*)display: grid;/, "$1"));
  assertError(errorsWith(noGrid), ".alert:has(> .alert-icon) must switch to display: grid");
  const changed = withCss((css) => css.replace(/(\.alert \{[^}]*)display: flex;/, "$1display: grid;"));
  assertError(errorsWith(changed), ".alert must stay display: flex");
});

const SWITCH = '.switch > input[type="checkbox"]';

test("fails when the switch is not a restyled native checkbox driven by :checked and :disabled", () => {
  const native = withCss((css) => css.replace(/(\.switch > input\[type="checkbox"\] \{[^}]*?)\n  appearance: none;/, "$1"));
  assertError(errorsWith(native), `${SWITCH} must set appearance: none`);
  const noThumb = withCss((css) => css.replace(/(\.switch > input\[type="checkbox"\]::before \{[^}]*?)content: "";/, "$1"));
  assertError(errorsWith(noThumb), `${SWITCH}::before must draw the thumb`);
  const color = withCss((css) => css.replace(/(\.switch > input\[type="checkbox"\]:checked \{[^}]*?)background: var\(--color-primary\)/, "$1background: var(--color-info)"));
  assertError(errorsWith(color), `${SWITCH}:checked must fill the track with var(--color-primary)`);
  const still = withCss((css) => css.replace(`${SWITCH}:checked::before {`, `${SWITCH}:hover::before {`));
  assertError(errorsWith(still), "must move the thumb to the end side");
  const motion = withCss((css) => css.replace("transition: inset-inline-start var(--duration-fast) var(--ease-standard);", "transition: inset-inline-start 0.2s ease;"));
  assertError(errorsWith(motion), `${SWITCH}::before must transition with var(--duration-fast) var(--ease-standard)`);
  const noDisabled = withCss((css) => css.replace(`${SWITCH}:disabled {`, `${SWITCH}:indeterminate {`));
  assertError(errorsWith(noDisabled), `${SWITCH}:disabled must be styled`);
  const noLabel = withCss((css) => css.replace(".switch:has(> input:disabled) {", ".switch:has(> input:invalid) {"));
  assertError(errorsWith(noLabel), ".switch:has(> input:disabled) must style the label");
  const noFocus = withCss((css) => css.replace(`${SWITCH}:focus-visible {`, `${SWITCH}:focus {`));
  assertError(errorsWith(noFocus), "switch needs a :focus-visible rule");
  const literal = withCss((css) => css.replace(/(\.switch > input\[type="checkbox"\]::before \{[^}]*?)background: var\(--color-surface-elevated\)/, "$1background: white"));
  assertError(errorsWith(literal), "named color");
});

test("fails when the input group doubles borders, rounds inner corners or lets the focus ring be covered", () => {
  const doubled = withCss((css) => css.replace("margin-inline-start: calc(var(--border-width) * -1);", "margin-inline-start: 0;"));
  assertError(errorsWith(doubled), "must overlap by one border");
  const inner = withCss((css) => css.replace(/(\.input-group > :where\(:not\(:last-child\)\) \{[^}]*?)border-start-end-radius: 0;/, "$1"));
  assertError(errorsWith(inner), ".input-group > :where(:not(:last-child)) must set border-start-end-radius: 0");
  const outer = withCss((css) => css.replace(/(\.input-group > :where\(:not\(:first-child\)\) \{[^}]*?)border-end-start-radius: 0;/, "$1"));
  assertError(errorsWith(outer), ".input-group > :where(:not(:first-child)) must set border-end-start-radius: 0");
  const noGrow = withCss((css) => css.replace("flex: 1 1 auto;", "flex: none;"));
  assertError(errorsWith(noGrow), ".input-group inputs must grow");
  const shrink = withCss((css) => css.replace(/(\.input-group > :where\(select, \.button\) \{[^}]*?)flex: none;/, "$1flex: 1 1 auto;"));
  assertError(errorsWith(shrink), ".input-group buttons and selects must keep their size");
  const covered = withCss((css) => css.replace(/(\.input-group > :focus-visible \{[^}]*?)z-index: 2;/, "$1"));
  assertError(errorsWith(covered), ".input-group > :focus-visible must raise the focused child");
  const noFocus = withCss((css) => css.replace(".input-group > :where(input, select):focus-visible {", ".input-group > :where(input, select):focus {"));
  assertError(errorsWith(noFocus), "input-group controls needs a :focus-visible rule");
  const height = withCss((css) => css.replace(/(\.input-group > :where\(input, select\) \{[^}]*?)min-block-size: var\(--input-height\);/, "$1min-block-size: 2rem;"));
  assertError(errorsWith(height), "hard-coded length");
  assertError(errorsWith(height), ".input-group controls must set min-block-size: var(--input-height)");
  const block = withCss((css) => css.replace(/(\.input-group \{[^}]*?)display: inline-flex;/, "$1display: block;"));
  assertError(errorsWith(block), ".input-group must be a flex row");
});

test("margins may use --border-width but no other non-spacing token", () => {
  const radius = withCss((css) => css.replace("margin-inline-start: calc(var(--border-width) * -1);", "margin-inline-start: calc(var(--radius-sm) * -1);"));
  assertError(errorsWith(radius), "must use a var(--space-N) token");
});
