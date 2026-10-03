#!/usr/bin/env node
// Dependency-free verification of the base styles in src/base.css: zero-specificity
// rules inside @layer synth.base that apply the font, color and heading tokens, bundled
// in src/synthcss.css after tokens.css and before layout.css, and absent from the
// modular files.
// Usage: node scripts/check-base.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseBlocks, parseDeclarations, parseTokens } from "./check-tokens.mjs";
import { splitSelectors } from "./check-components.mjs";

export const BASE_LAYER = "synth.base";
// Element selector (without :where()) → the declarations it must have, and nothing else.
export const BASE_RULES = {
  html: {
    "font-family": "var(--font-sans)",
    "font-size": "100%",
    "line-height": "var(--leading-normal)",
    color: "var(--color-text)",
    background: "var(--color-background)",
  },
  "h1, h2, h3, h4": { "line-height": "var(--leading-tight)", "font-weight": "var(--weight-semibold)" },
  h1: { "font-size": "var(--text-3xl)" },
  h2: { "font-size": "var(--text-2xl)" },
  h3: { "font-size": "var(--text-xl)" },
  h4: { "font-size": "var(--text-lg)" },
  "code, kbd, pre, samp": { "font-family": "var(--font-mono)" },
};
export const MODULAR_FILES = ["tokens.css", "layout.css", "components.css"];

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const ZERO_SPECIFICITY = /^:where\(([^()]+)\)$/;

// Parses base.css into { layer, rules: Map(elements → { prop: value }), errors }.
// `elements` is the selector list inside :where(), normalized to "a, b".
export function parseBase(css) {
  const errors = [];
  const rules = new Map();
  const blocks = parseBlocks(stripComments(css));
  if (blocks.length !== 1 || !/^@layer\s/.test(blocks[0].prelude)) {
    return { errors: [`base.css must contain exactly one @layer ${BASE_LAYER} { … } block and nothing else`], rules };
  }
  const layer = blocks[0].prelude.replace(/^@layer\s+/, "").trim();
  if (layer !== BASE_LAYER) errors.push(`base.css must use @layer ${BASE_LAYER}, found @layer ${layer}`);
  for (const { prelude, body } of parseBlocks(blocks[0].body)) {
    const selectors = splitSelectors(prelude);
    const m = selectors.length === 1 && ZERO_SPECIFICITY.exec(selectors[0]);
    if (!m) {
      errors.push(`base.css: selector "${prelude}" must be a single :where(…) so it has zero specificity`);
      continue;
    }
    const elements = splitSelectors(m[1]).join(", ");
    if (rules.has(elements)) errors.push(`base.css: :where(${elements}) is defined more than once`);
    rules.set(elements, Object.fromEntries(parseDeclarations(body).filter((d) => d.prop).map((d) => [d.prop, d.value])));
  }
  return { errors, rules };
}

export function checkBaseCss(baseCss, tokensCss) {
  let parsed;
  try {
    parsed = parseBase(baseCss);
  } catch (err) {
    return [`base.css: ${err.message}`];
  }
  const { rules } = parsed;
  const errors = [...parsed.errors];
  const tokens = parseTokens(tokensCss).root;
  for (const [elements, decls] of Object.entries(BASE_RULES)) {
    const actual = rules.get(elements);
    if (!actual) {
      errors.push(`base.css has no :where(${elements}) rule`);
      continue;
    }
    for (const [prop, value] of Object.entries(decls)) {
      if (actual[prop] !== value) errors.push(`base.css: :where(${elements}) must set ${prop}: ${value}, found ${actual[prop] ?? "nothing"}`);
    }
    for (const prop of Object.keys(actual)) {
      if (!(prop in decls)) errors.push(`base.css: :where(${elements}) sets ${prop}, which is not a base style (no resets)`);
    }
  }
  for (const elements of rules.keys()) {
    if (!(elements in BASE_RULES)) errors.push(`base.css: unexpected rule :where(${elements})`);
  }
  for (const [elements, decls] of rules) {
    for (const [prop, value] of Object.entries(decls)) {
      for (const m of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
        if (!tokens.has(m[1])) errors.push(`base.css: :where(${elements}) { ${prop} } references ${m[1]}, which is not defined in tokens.css`);
      }
    }
  }
  return errors;
}

const importsOf = (css) => [...stripComments(css).matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s]+)/g)].map((m) => m[1]);

export function checkBundle(bundleCss) {
  const imports = importsOf(bundleCss);
  const [t, b, l, c] = ["tokens.css", "base.css", "layout.css", "components.css"].map((f) => imports.indexOf(f));
  if (b === -1) return ["src/synthcss.css does not import base.css"];
  const errors = [];
  if (t === -1 || b < t) errors.push("src/synthcss.css must import base.css after tokens.css");
  if ((l !== -1 && b > l) || (c !== -1 && b > c)) errors.push("src/synthcss.css must import base.css before layout.css and components.css");
  return errors;
}

// The modular files must work without the base layer and must not pull it in.
export function checkModular(modular) {
  const errors = [];
  for (const [file, css] of Object.entries(modular)) {
    const code = stripComments(css);
    if (importsOf(code).includes("base.css")) errors.push(`${file} must not import base.css`);
    if (/@layer\b/.test(code)) errors.push(`${file} must not use @layer; base styles live only in base.css`);
  }
  return errors;
}

export function checkBase({ baseCss, tokensCss, bundleCss, modular }) {
  return [...checkBaseCss(baseCss, tokensCss), ...checkBundle(bundleCss), ...checkModular(modular)];
}

export function readRepoFiles(repo) {
  const read = (p) => readFileSync(resolve(repo, p), "utf8");
  return {
    baseCss: read("src/base.css"),
    tokensCss: read("src/tokens.css"),
    bundleCss: read("src/synthcss.css"),
    modular: Object.fromEntries(MODULAR_FILES.map((f) => [f, read(`src/${f}`)])),
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = checkBase(readRepoFiles(repo));
  if (errors.length) {
    for (const e of errors) console.error(`  FAIL ${e}`);
    console.error(`\ncheck-base: ${errors.length} problem(s) found.`);
    process.exit(1);
  }
  console.log(`check-base: ${Object.keys(BASE_RULES).length} zero-specificity rules in @layer ${BASE_LAYER}, bundled after tokens.css and absent from the modular files.`);
}
