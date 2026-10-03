#!/usr/bin/env node
// Dependency-free verification of the layout primitives in src/layout.css,
// the main bundle, docs/layout.md and the examples/layout.html fixture.
// Usage: node scripts/check-layout.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseBlocks, parseDeclarations, parseTokens } from "./check-tokens.mjs";

export const PRIMITIVES = ["container", "stack", "cluster", "grid", "sidebar", "split", "center", "cover"];
export const GAP_PRIMITIVES = ["stack", "cluster", "grid", "sidebar", "split"];
export const VARIANTS = GAP_PRIMITIVES.flatMap((p) => [`${p}-sm`, `${p}-lg`]);
export const HELPER_CLASSES = ["cover-main", "sidebar-end"];
// .sidebar-end swaps which sidebar child is the narrow column. Each selector must
// beat the base sidebar rule for the same child and set (or reset) every property
// the base rules set on it.
export const SIDEBAR_END_RULES = [
  { child: ":first-child", decls: { "flex-basis": "0", "flex-grow": "999", "min-inline-size": "50%" } },
  { child: ":last-child:not(:first-child)", decls: { "flex-basis": "var(--sidebar-width)", "flex-grow": "1", "min-inline-size": "auto" } },
];
const SIDEBAR_END_SELECTOR = ".sidebar-end:is(.sidebar, .sidebar-sm, .sidebar-lg) > ";
export const DOC_SECTIONS = [
  "Purpose",
  "HTML example",
  "Variants",
  "Responsive behavior",
  "Recommended uses",
  "Common misuses",
];

const SPACING_PROPS = /^(gap|row-gap|column-gap|padding|padding-[\w-]+|margin|margin-[\w-]+)$/;
// Units that would mean a hard-coded size. %, vw, vh and dvh are relative and allowed.
const HARD_CODED_LENGTH = /(?:^|[^\w-])(-?\d*\.?\d+)(px|rem|em|ch|ex|pt|pc|cm|mm|in|q|vmin|vmax|svh|lvh|svw|lvw|dvw)\b/i;
const REORDERING_PROPS = /^(order|grid-area|grid-row|grid-row-start|grid-row-end|grid-column|grid-column-start|grid-column-end|direction)$/;

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

export function parseRules(rawCss) {
  const rules = [];
  const atRules = [];
  for (const { prelude, body } of parseBlocks(stripComments(rawCss))) {
    if (prelude.startsWith("@")) {
      atRules.push(prelude);
      continue;
    }
    const classes = new Set([...prelude.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
    // Selectors that are just ".name", for the "class exists" check.
    const plain = new Set(
      prelude
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^\.[a-zA-Z][\w-]*$/.test(s))
        .map((s) => s.slice(1)),
    );
    const decls = parseDeclarations(body).filter((d) => d.prop);
    rules.push({ selector: prelude.replace(/\s+/g, " "), classes, plain, decls });
  }
  return { rules, atRules };
}

export function checkLayoutCss(layoutCss, tokensCss) {
  const errors = [];
  let parsed;
  try {
    parsed = parseRules(layoutCss);
  } catch (err) {
    return [`layout.css: ${err.message}`];
  }
  const { rules, atRules } = parsed;
  const tokens = parseTokens(tokensCss).root;

  for (const at of atRules) {
    errors.push(`layout.css must not use at-rules such as media queries or breakpoints, found: ${at}`);
  }

  const allowed = new Set([...PRIMITIVES, ...VARIANTS, ...HELPER_CLASSES]);
  const used = new Set(rules.flatMap((r) => [...r.classes]));
  for (const cls of [...PRIMITIVES, ...VARIANTS]) {
    if (!rules.some((r) => r.plain.has(cls))) errors.push(`class .${cls} is not defined in layout.css`);
  }
  for (const cls of used) {
    if (!allowed.has(cls)) errors.push(`unexpected class .${cls}; only the primitives and their -sm/-lg gap variants are allowed`);
  }

  // Each variant must set its own gap from a spacing token, different from the base.
  const gapOf = (cls) => {
    let value;
    for (const r of rules) if (r.plain.has(cls)) for (const d of r.decls) if (d.prop === "gap") value = d.value;
    return value;
  };
  for (const p of GAP_PRIMITIVES) {
    const base = gapOf(p);
    if (!base || !/^var\(--space-\d+\)$/.test(base)) errors.push(`.${p} must set gap to a var(--space-N) token`);
    for (const v of [`${p}-sm`, `${p}-lg`]) {
      const gap = gapOf(v);
      if (!gap || !/^var\(--space-\d+\)$/.test(gap)) errors.push(`.${v} must set gap to a var(--space-N) token`);
      else if (gap === base) errors.push(`.${v} uses the same gap as .${p}`);
    }
    const n = (v) => Number(/--space-(\d+)/.exec(gapOf(v) ?? "")?.[1]);
    if (!(n(`${p}-sm`) < n(p) && n(p) < n(`${p}-lg`))) errors.push(`.${p}-sm < .${p} < .${p}-lg gap order is wrong`);
  }

  for (const { child, decls } of SIDEBAR_END_RULES) {
    const rule = rules.find((r) => r.selector === SIDEBAR_END_SELECTOR + child);
    if (!rule) {
      errors.push(`layout.css has no "${SIDEBAR_END_SELECTOR}${child}" rule`);
      continue;
    }
    for (const [prop, value] of Object.entries(decls)) {
      if (!rule.decls.some((d) => d.prop === prop && d.value === value)) {
        errors.push(`${rule.selector} must set ${prop}: ${value}`);
      }
    }
  }

  for (const { selector, decls } of rules) {
    for (const { prop, value } of decls) {
      const where = `${selector} { ${prop}: ${value} }`;
      if (REORDERING_PROPS.test(prop)) errors.push(`reading-order-changing property in ${where}`);
      if (/-reverse\b/.test(value) || /\bdense\b/.test(value)) errors.push(`reading-order-changing value in ${where}`);
      if (HARD_CODED_LENGTH.test(value)) errors.push(`hard-coded length in ${where}; use a var(--token)`);
      if (SPACING_PROPS.test(prop) && !/^(0|auto)$/.test(value) && !/var\(--space-\d+\)/.test(value)) {
        errors.push(`spacing in ${where} must use a var(--space-N) token`);
      }
      for (const m of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
        if (!tokens.has(m[1])) errors.push(`${where} references ${m[1]}, which is not defined in tokens.css`);
      }
    }
  }
  return errors;
}

export function checkBundle(bundleCss) {
  const imports = [...stripComments(bundleCss).matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s]+)/g)].map((m) => m[1]);
  const errors = [];
  const t = imports.indexOf("tokens.css");
  const l = imports.indexOf("layout.css");
  if (t === -1) errors.push("src/synthcss.css does not import tokens.css");
  if (l === -1) errors.push("src/synthcss.css does not import layout.css");
  if (t !== -1 && l !== -1 && t > l) errors.push("src/synthcss.css must import tokens.css before layout.css");
  return errors;
}

export function checkDocs(markdown) {
  const errors = [];
  const lines = markdown.split("\n");
  const sectionOf = (cls) => {
    const start = lines.findIndex((l) => new RegExp(`^##\\s+\`\\.${cls}\`\\s*$`).test(l));
    if (start === -1) return null;
    let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
    if (end === -1) end = lines.length;
    return lines.slice(start + 1, end);
  };
  for (const cls of PRIMITIVES) {
    const section = sectionOf(cls);
    if (!section) {
      errors.push(`docs/layout.md has no "## \`.${cls}\`" section`);
      continue;
    }
    for (const name of DOC_SECTIONS) {
      if (!section.some((l) => new RegExp(`^###\\s+${name}\\s*$`, "i").test(l))) {
        errors.push(`docs/layout.md section .${cls} is missing "### ${name}"`);
      }
    }
    if (!section.join("\n").includes("```html")) errors.push(`docs/layout.md section .${cls} has no html code block`);
  }
  const vocabStart = lines.findIndex((l) => /^##\s+AI Layout Vocabulary\s*$/i.test(l));
  if (vocabStart === -1) {
    errors.push('docs/layout.md has no "## AI Layout Vocabulary" section');
  } else {
    const rows = [];
    for (let i = vocabStart + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) {
      if (/^\s*\|/.test(lines[i])) rows.push(lines[i]);
    }
    for (const cls of PRIMITIVES) {
      if (!rows.some((r) => r.includes(`\`.${cls}\``) || r.includes(`\`${cls}\``))) {
        errors.push(`AI Layout Vocabulary table does not mention .${cls}`);
      }
    }
  }
  return errors;
}

export function checkFixture(html) {
  const errors = [];
  if (!/href="[^"]*synthcss\.css"/.test(html)) errors.push("examples/layout.html must load src/synthcss.css");
  const classes = new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
  for (const cls of [...PRIMITIVES, ...VARIANTS, ...HELPER_CLASSES]) {
    if (!classes.has(cls)) errors.push(`examples/layout.html does not use .${cls}`);
  }
  if (/<script\b/i.test(html)) errors.push("examples/layout.html must not use JavaScript");
  return errors;
}

export function checkLayout({ layoutCss, tokensCss, bundleCss, docs, fixture }) {
  return [
    ...checkLayoutCss(layoutCss, tokensCss),
    ...checkBundle(bundleCss),
    ...checkDocs(docs),
    ...checkFixture(fixture),
  ];
}

export function readRepoFiles(repo) {
  const read = (p) => readFileSync(resolve(repo, p), "utf8");
  return {
    layoutCss: read("src/layout.css"),
    tokensCss: read("src/tokens.css"),
    bundleCss: read("src/synthcss.css"),
    docs: read("docs/layout.md"),
    fixture: read("examples/layout.html"),
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = checkLayout(readRepoFiles(repo));
  if (errors.length) {
    for (const e of errors) console.error(`  FAIL ${e}`);
    console.error(`\ncheck-layout: ${errors.length} problem(s) found.`);
    process.exit(1);
  }
  console.log(
    `check-layout: ${PRIMITIVES.length} primitives and ${VARIANTS.length} variants defined with tokens, bundled, documented and in the fixture.`,
  );
}
