#!/usr/bin/env node
// Dependency-free verification of the semantic components in src/components.css,
// the built bundle (src/synthcss.css with its imports inlined), docs/components.md
// and the class usage in every doc example and the showcase.
// Usage: node scripts/check-components.mjs

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { contrastRatio, parseBlocks, parseColor, parseDeclarations, parseTokens, resolveValue } from "./check-tokens.mjs";

// Every class each component ships. The first entry is the base class.
export const COMPONENTS = {
  button: ["button", "button-primary", "button-secondary", "button-danger", "button-sm", "button-lg", "button-icon"],
  field: ["field", "field-label", "field-help", "field-error"],
  card: ["card", "card-header", "card-body", "card-footer", "card-media", "card-actions"],
  badge: ["badge", "badge-success", "badge-warning", "badge-danger", "badge-info"],
  alert: ["alert", "alert-info", "alert-success", "alert-warning", "alert-danger"],
  panel: ["panel", "panel-header", "panel-body"],
  table: ["table", "table-wrap", "table-hover", "numeric"],
  "empty-state": ["empty-state"],
};
export const COMPONENT_NAMES = Object.keys(COMPONENTS);
export const COMPONENT_CLASSES = Object.values(COMPONENTS).flat();

// Variants that change color: [variant, base]. Their text/background pair is
// contrast-checked with the base rule's declarations merged in.
const COLOR_VARIANTS = [
  ["button", "button"],
  ["button-primary", "button"],
  ["button-secondary", "button"],
  ["button-danger", "button"],
  ["badge", "badge"],
  ["badge-success", "badge"],
  ["badge-warning", "badge"],
  ["badge-danger", "badge"],
  ["badge-info", "badge"],
  ["alert", "alert"],
  ["alert-info", "alert"],
  ["alert-success", "alert"],
  ["alert-warning", "alert"],
  ["alert-danger", "alert"],
  ["card", "card"],
  ["panel", "panel"],
];

export const DOC_SECTIONS = ["Purpose", "Example", "Variants", "Composition", "Accessibility", "Recommended use"];
export const MAX_REFERENCE_ROWS = 15;

const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const NAMED_COLOR =
  /(?:^|[\s,(])(white|black|red|green|blue|gray|grey|silver|yellow|orange|purple|pink|brown|navy|teal|maroon|olive|lime|aqua|cyan|magenta|fuchsia|gold|indigo|violet|crimson|tomato|coral|salmon|beige|ivory|khaki|lavender|linen|snow|azure|tan|wheat)(?=$|[\s,)])/i;
// Properties whose whole value is one color.
const COLOR_PROPS = /^(color|background-color|border(-(block|inline|top|right|bottom|left)(-(start|end))?)?-color|outline-color|accent-color|caret-color|fill|stroke|text-decoration-color|column-rule-color)$/;
// A color value may only be a token, a mix of two tokens or a keyword.
const TOKEN_COLOR = /^(var\(--[\w-]+\)|color-mix\(in srgb, var\(--[\w-]+\) \d+%, var\(--[\w-]+\)\)|transparent|currentColor|inherit)$/i;
const SPACING_PROPS = /^(gap|row-gap|column-gap|padding|padding-[\w-]+|margin|margin-[\w-]+)$/;
// Fixed units are not allowed; em and % (relative to the text or parent) are.
const HARD_CODED_LENGTH = /(?:^|[^\w-])(-?\d*\.?\d+)(px|rem|ch|ex|pt|pc|cm|mm|in|q|vw|vh|vmin|vmax|svh|lvh|dvh|svw|lvw|dvw)\b/i;
const TOKEN_PROPS = {
  "font-size": /^var\(--text-[\w-]+\)$/,
  "font-weight": /^var\(--weight-[\w-]+\)$/,
  "line-height": /^var\(--leading-[\w-]+\)$/,
  "border-radius": /^var\(--radius-[\w-]+\)$/,
  "box-shadow": /^(var\(--shadow-[\w-]+\)|none)$/,
  "font-family": /^(var\(--font-[\w-]+\)|inherit)$/,
};

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Splits a selector list on top-level commas (not the ones inside :where()).
export function splitSelectors(prelude) {
  const out = [];
  let depth = 0;
  let current = "";
  for (const ch of prelude) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else current += ch;
  }
  out.push(current.trim());
  return out.map((s) => s.replace(/\s+/g, " ")).filter(Boolean);
}

const classesOf = (selector) => [...selector.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);

export function parseRules(rawCss) {
  const rules = [];
  const atRules = [];
  for (const { prelude, body } of parseBlocks(stripComments(rawCss))) {
    if (prelude.startsWith("@")) {
      atRules.push({ prelude, body });
      continue;
    }
    const selectors = splitSelectors(prelude);
    const decls = parseDeclarations(body).filter((d) => d.prop);
    rules.push({ selectors, selector: selectors.join(", "), decls });
  }
  return { rules, atRules };
}

// Inlines @import url("x.css") statements, like a bundler would.
export function buildBundle(entry, read) {
  const seen = new Set();
  const inline = (path) => {
    if (seen.has(path)) return "";
    seen.add(path);
    return read(path).replace(/@import\s+(?:url\()?\s*["']?([^"')\s]+)["']?\s*\)?\s*;/g, (_, file) =>
      inline(resolve(dirname(path), file)),
    );
  };
  return inline(entry);
}

export function classesInCss(css) {
  const out = new Set();
  for (const { selectors } of parseRules(css).rules) for (const s of selectors) classesOf(s).forEach((c) => out.add(c));
  return out;
}

function colorOf(value, tokens) {
  const v = value.trim();
  let m = /^var\((--[\w-]+)\)$/.exec(v);
  if (m) return parseColor(resolveValue(m[1], tokens));
  m = /^color-mix\(in srgb, var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)\)$/.exec(v);
  if (m) {
    const a = parseColor(resolveValue(m[1], tokens));
    const b = parseColor(resolveValue(m[3], tokens));
    const p = Number(m[2]) / 100;
    if (!a || !b) return null;
    return { r: a.r * p + b.r * (1 - p), g: a.g * p + b.g * (1 - p), b: a.b * p + b.b * (1 - p), a: 1 };
  }
  return null;
}

export function checkComponentsCss(componentsCss, tokensCss) {
  const errors = [];
  let parsed;
  try {
    parsed = parseRules(componentsCss);
  } catch (err) {
    return [`components.css: ${err.message}`];
  }
  const { rules, atRules } = parsed;
  const tokens = parseTokens(tokensCss).root;
  const allowed = new Set(COMPONENT_CLASSES);
  const where = (r, d) => `${r.selector} { ${d.prop}: ${d.value} }`;
  const has = (pred) => rules.some(pred);
  const sel = (r, re) => r.selectors.some((s) => re.test(s));
  const decl = (r, prop, re = /./) => r.decls.some((d) => d.prop === prop && re.test(d.value));

  for (const { prelude } of atRules) {
    if (!/^@keyframes\s+synthcss-[\w-]+$/.test(prelude)) {
      errors.push(`components.css may only use @keyframes synthcss-* at-rules (no media queries), found: ${prelude}`);
    }
  }

  // Classes: every listed class exists, and nothing else is added.
  const used = new Set(rules.flatMap((r) => r.selectors.flatMap(classesOf)));
  for (const cls of COMPONENT_CLASSES) if (!used.has(cls)) errors.push(`class .${cls} is not defined in components.css`);
  for (const cls of used) if (!allowed.has(cls)) errors.push(`unexpected class .${cls} in components.css`);

  // Declarations: tokens only.
  for (const r of rules) {
    for (const d of r.decls) {
      const w = where(r, d);
      if (d.prop.startsWith("--")) errors.push(`components.css must not define custom properties: ${w}`);
      if (COLOR_LITERAL.test(d.value)) errors.push(`hard-coded color literal in ${w}; use a var(--color-*) token`);
      if (NAMED_COLOR.test(d.value)) errors.push(`named color in ${w}; use a var(--color-*) token`);
      if (COLOR_PROPS.test(d.prop) && !TOKEN_COLOR.test(d.value)) {
        errors.push(`color in ${w} must be a var(--token), a color-mix() of two tokens, transparent or currentColor`);
      }
      if (HARD_CODED_LENGTH.test(d.value)) errors.push(`hard-coded length in ${w}; use a var(--token)`);
      if (SPACING_PROPS.test(d.prop) && !/^(0|auto)$/.test(d.value) && !/var\(--space-\d+\)/.test(d.value)) {
        errors.push(`spacing in ${w} must use a var(--space-N) token`);
      }
      if (TOKEN_PROPS[d.prop] && !TOKEN_PROPS[d.prop].test(d.value)) errors.push(`${w} must use a matching var(--token)`);
      for (const m of d.value.matchAll(/var\(\s*(--[\w-]+)/g)) {
        if (!tokens.has(m[1])) errors.push(`${w} references ${m[1]}, which is not defined in tokens.css`);
      }
    }
  }

  // Every component styles itself through tokens.
  for (const [name, classes] of Object.entries(COMPONENTS)) {
    const own = rules.filter((r) => r.selectors.some((s) => classesOf(s).some((c) => classes.includes(c))));
    if (!own.some((r) => r.decls.some((d) => /var\(--[\w-]+\)/.test(d.value)))) {
      errors.push(`component .${name} has no rule that uses a var(--token)`);
    }
  }

  // Focus: visible :focus-visible rings on every interactive component.
  const focusRing = (r) => decl(r, "outline", /var\(--focus-width\).*var\(--focus-color\)/);
  const focusTargets = [
    ["button", /\.button\b[^\s]*:focus-visible/],
    ["field controls (input)", /\.field\b.*\binput\b.*:focus-visible/],
    ["field controls (textarea)", /\.field\b.*\btextarea\b.*:focus-visible/],
    ["field controls (select)", /\.field\b.*\bselect\b.*:focus-visible/],
    ["table-wrap", /\.table-wrap:focus-visible/],
  ];
  for (const [what, re] of focusTargets) {
    if (!has((r) => sel(r, re) && focusRing(r))) {
      errors.push(`${what} needs a :focus-visible rule with outline: var(--focus-width) solid var(--focus-color)`);
    }
  }
  if (rules.some((r) => r.decls.some((d) => /^outline(-style)?$/.test(d.prop) && /^(none|0)$/.test(d.value)))) {
    errors.push("components.css must not remove focus outlines");
  }

  // Disabled and loading states.
  const disabled = (re) => has((r) => sel(r, re) && decl(r, "cursor", /^not-allowed$/));
  if (!disabled(/^\.button:disabled$/)) errors.push(".button:disabled must be styled (with cursor: not-allowed)");
  if (!disabled(/^\.button\[aria-disabled="true"\]$/)) errors.push('.button[aria-disabled="true"] must be styled (with cursor: not-allowed)');
  if (!disabled(/^\.field\b.*:disabled$/)) errors.push(".field controls need a :disabled rule (with cursor: not-allowed)");
  if (!has((r) => sel(r, /^\.button\[aria-busy="true"\]$/))) errors.push('.button[aria-busy="true"] must be styled');
  if (!has((r) => sel(r, /^\.button\[aria-busy="true"\]::after$/) && decl(r, "content") && decl(r, "animation"))) {
    errors.push('.button[aria-busy="true"]::after must draw a CSS-only loading indicator');
  }

  // Field error state must change more than color.
  const invalid = rules.filter((r) => sel(r, /^\.field\b.*\[aria-invalid="true"\]$/));
  if (!invalid.length) errors.push('.field controls need an [aria-invalid="true"] rule');
  else if (!invalid.some((r) => r.decls.some((d) => /^border(-[\w-]+)?-width$/.test(d.prop)))) {
    errors.push('.field [aria-invalid="true"] must change the border width, not only its color');
  }
  if (!has((r) => sel(r, /^\.field-error::before$/) && decl(r, "content", /^"[^"]+"/))) {
    errors.push(".field-error::before must add a visible marker so errors do not rely on color alone");
  }

  // Table behavior.
  if (!has((r) => sel(r, /^\.table-wrap$/) && decl(r, "overflow-x", /^auto$/))) errors.push(".table-wrap must set overflow-x: auto");
  if (!has((r) => sel(r, /\.table-hover\b.*:hover/))) errors.push(".table-hover must style hovered rows");
  if (!has((r) => sel(r, /\.numeric$/) && decl(r, "text-align", /^(end|right)$/) && decl(r, "font-variant-numeric", /tabular-nums/))) {
    errors.push(".numeric cells must be right-aligned with tabular-nums");
  }

  // Contrast of text on each variant's background.
  const plainDecls = (cls) => rules.filter((r) => r.selectors.includes(`.${cls}`)).flatMap((r) => r.decls);
  const last = (decls, props) => decls.filter((d) => props.includes(d.prop)).at(-1)?.value;
  for (const [variant, base] of COLOR_VARIANTS) {
    const decls = variant === base ? plainDecls(base) : [...plainDecls(base), ...plainDecls(variant)];
    const fg = last(decls, ["color"]);
    const bg = last(decls, ["background", "background-color"]);
    if (!fg || !bg) {
      errors.push(`.${variant} must set both color and background`);
      continue;
    }
    try {
      const a = colorOf(fg, tokens);
      const b = colorOf(bg, tokens);
      if (!a || !b) throw new Error("could not resolve colors");
      const ratio = contrastRatio(a, b);
      if (ratio < 4.5) errors.push(`contrast too low in .${variant}: ${ratio.toFixed(2)}:1 (min 4.5:1)`);
    } catch (err) {
      errors.push(`contrast of .${variant}: ${err.message}`);
    }
  }
  return errors;
}

export function checkBundle(bundleCss) {
  const imports = [...stripComments(bundleCss).matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s]+)/g)].map((m) => m[1]);
  const l = imports.indexOf("layout.css");
  const c = imports.indexOf("components.css");
  if (c === -1) return ["src/synthcss.css does not import components.css"];
  if (c < l) return ["src/synthcss.css must import components.css after layout.css"];
  return [];
}

function sectionOf(lines, heading) {
  const start = lines.findIndex((l) => heading.test(l));
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end === -1) end = lines.length;
  return lines.slice(start + 1, end);
}

export function checkDocs(markdown) {
  const errors = [];
  const lines = markdown.split("\n");
  for (const name of COMPONENT_NAMES) {
    const section = sectionOf(lines, new RegExp(`^##\\s+\`\\.${name}\`\\s*$`));
    if (!section) {
      errors.push(`docs/components.md has no "## \`.${name}\`" section`);
      continue;
    }
    for (const h of DOC_SECTIONS) {
      if (!section.some((l) => new RegExp(`^###\\s+${h}\\s*$`, "i").test(l))) {
        errors.push(`docs/components.md section .${name} is missing "### ${h}"`);
      }
    }
    const text = section.join("\n");
    if (!text.includes("```html")) errors.push(`docs/components.md section .${name} has no html code block`);
    for (const cls of COMPONENTS[name]) {
      if (!text.includes(`.${cls}`) && !new RegExp(`class="[^"]*\\b${cls}\\b`).test(text)) {
        errors.push(`docs/components.md section .${name} does not document .${cls}`);
      }
    }
    if (!/\b(stack|cluster|split|grid)\b/.test(text)) errors.push(`docs/components.md section .${name} shows no composition with a layout primitive`);
  }
  const alert = (sectionOf(lines, /^##\s+`\.alert`\s*$/) ?? []).join("\n");
  if (!alert.includes('role="alert"') || !alert.includes('role="status"')) {
    errors.push('docs/components.md .alert examples must use role="alert" and role="status"');
  }
  const button = (sectionOf(lines, /^##\s+`\.button`\s*$/) ?? []).join("\n");
  if (!/button-icon[^\n]*aria-label|aria-label[^\n]*button-icon/.test(button)) {
    errors.push("docs/components.md must require aria-label on .button-icon");
  }

  const reference = sectionOf(lines, /^##\s+AI Component Reference\s*$/i);
  if (!reference) {
    errors.push('docs/components.md has no "## AI Component Reference" section');
  } else {
    const rows = reference.filter((l) => /^\s*\|/.test(l)).slice(2);
    if (rows.length > MAX_REFERENCE_ROWS) errors.push(`AI Component Reference has ${rows.length} rows, max ${MAX_REFERENCE_ROWS}`);
    for (const name of COMPONENT_NAMES) {
      if (!rows.some((r) => r.includes(`\`.${name}`) || r.includes(`class="${name}`))) {
        errors.push(`AI Component Reference table does not mention .${name}`);
      }
    }
  }
  return errors;
}

const unescapeHtml = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const classAttrs = (html) => [...html.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean));

// Every class in an ```html block of the docs and in the showcase must exist in
// the built CSS (the showcase may also use its own sc- classes).
export function checkClassUsage({ cssClasses, showcaseClasses, docs, showcaseHtml }) {
  const errors = [];
  for (const [file, markdown] of Object.entries(docs)) {
    for (const block of markdown.matchAll(/```html\n([\s\S]*?)```/g)) {
      for (const cls of new Set(classAttrs(block[1]))) {
        if (!cssClasses.has(cls)) errors.push(`${file}: html example uses .${cls}, which is not in the built CSS`);
      }
    }
  }
  const snippets = [...showcaseHtml.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => unescapeHtml(m[1]));
  for (const cls of new Set(snippets.flatMap(classAttrs))) {
    if (!cssClasses.has(cls)) errors.push(`showcase snippet uses .${cls}, which is not in the built CSS`);
  }
  for (const cls of new Set(classAttrs(showcaseHtml))) {
    if (!cssClasses.has(cls) && !showcaseClasses.has(cls)) {
      errors.push(`showcase/index.html uses .${cls}, which is neither in the built CSS nor in showcase.css`);
    }
  }
  return errors;
}

export function checkComponents(files) {
  let cssClasses;
  let showcaseClasses;
  try {
    cssClasses = classesInCss(files.builtCss);
    showcaseClasses = classesInCss(files.showcaseCss);
  } catch (err) {
    return [`could not parse CSS: ${err.message}`];
  }
  const missing = COMPONENT_CLASSES.filter((c) => !cssClasses.has(c)).map((c) => `class .${c} is missing from the built CSS`);
  return [
    ...missing,
    ...checkComponentsCss(files.componentsCss, files.tokensCss),
    ...checkBundle(files.bundleCss),
    ...checkDocs(files.componentDocs),
    ...checkClassUsage({ cssClasses, showcaseClasses, docs: files.docs, showcaseHtml: files.showcaseHtml }),
  ];
}

export function readRepoFiles(repo) {
  const read = (p) => readFileSync(resolve(repo, p), "utf8");
  const docs = { "README.md": read("README.md") };
  for (const f of readdirSync(resolve(repo, "docs")).filter((f) => f.endsWith(".md"))) docs[`docs/${f}`] = read(`docs/${f}`);
  return {
    builtCss: buildBundle(resolve(repo, "src/synthcss.css"), (p) => readFileSync(p, "utf8")),
    bundleCss: read("src/synthcss.css"),
    componentsCss: read("src/components.css"),
    tokensCss: read("src/tokens.css"),
    componentDocs: docs["docs/components.md"] ?? "",
    docs,
    showcaseHtml: read("showcase/index.html"),
    showcaseCss: read("showcase/showcase.css"),
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = checkComponents(readRepoFiles(repo));
  if (errors.length) {
    for (const e of errors) console.error(`  FAIL ${e}`);
    console.error(`\ncheck-components: ${errors.length} problem(s) found.`);
    process.exit(1);
  }
  console.log(
    `check-components: ${COMPONENT_NAMES.length} components (${COMPONENT_CLASSES.length} classes) built with tokens, documented, and every doc and showcase class exists.`,
  );
}
