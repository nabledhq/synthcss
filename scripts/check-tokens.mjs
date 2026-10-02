#!/usr/bin/env node
// Dependency-free verification of src/tokens.css against the token spec and docs/tokens.md.
// Usage: node scripts/check-tokens.mjs [path/to/tokens.css] [path/to/tokens.md]

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const REQUIRED_TOKENS = [
  "--color-background",
  "--color-surface",
  "--color-surface-elevated",
  "--color-text",
  "--color-text-secondary",
  "--color-text-muted",
  "--color-border",
  "--color-primary",
  "--color-primary-hover",
  "--color-on-primary",
  "--color-success",
  "--color-warning",
  "--color-danger",
  "--color-info",
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-5",
  "--space-6",
  "--font-sans",
  "--font-mono",
  "--text-sm",
  "--text-base",
  "--text-lg",
  "--text-xl",
  "--text-2xl",
  "--text-3xl",
  "--weight-normal",
  "--weight-medium",
  "--weight-semibold",
  "--weight-bold",
  "--leading-tight",
  "--leading-normal",
  "--leading-relaxed",
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--radius-full",
  "--border-width",
  "--border-color",
  "--shadow-sm",
  "--shadow-md",
  "--shadow-lg",
  "--control-height",
  "--input-height",
  "--container-width",
  "--content-width",
  "--focus-color",
  "--focus-width",
  "--focus-offset",
  "--duration-fast",
  "--duration-normal",
  "--duration-slow",
  "--ease-standard",
];

export const MAX_TOKENS = 70;

// [foreground, background, minimum ratio]
export const CONTRAST_PAIRS = [
  ["--color-text", "--color-background", 4.5],
  ["--color-text", "--color-surface", 4.5],
  ["--color-text-secondary", "--color-background", 4.5],
  ["--color-text-secondary", "--color-surface", 4.5],
  ["--color-text-muted", "--color-background", 4.5],
  ["--color-on-primary", "--color-primary", 4.5],
  ["--focus-color", "--color-background", 3],
];

const COLOR_NAME_RE =
  /^--(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone|black|white|brown)(?:-|$)/;

// ---------------------------------------------------------------------------
// CSS parsing (just enough for a flat token file)
// ---------------------------------------------------------------------------

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

// Returns top-level blocks as { prelude, body }. Nested at-rule bodies can be parsed again.
export function parseBlocks(css) {
  const blocks = [];
  let depth = 0;
  let start = 0;
  let preludeStart = 0;
  let prelude = "";
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      if (depth === 0) {
        prelude = css.slice(preludeStart, i).trim();
        start = i + 1;
      }
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth < 0) throw new Error("Unbalanced '}' in CSS");
      if (depth === 0) {
        blocks.push({ prelude, body: css.slice(start, i) });
        preludeStart = i + 1;
      }
    } else if (ch === ";" && depth === 0) {
      preludeStart = i + 1; // skip top-level statements such as @charset / @import
    }
  }
  if (depth !== 0) throw new Error("Unbalanced '{' in CSS");
  return blocks;
}

export function parseDeclarations(body) {
  const decls = [];
  for (const part of body.split(";")) {
    const idx = part.indexOf(":");
    if (idx === -1) {
      if (part.trim()) decls.push({ prop: part.trim(), value: "" });
      continue;
    }
    decls.push({
      prop: part.slice(0, idx).trim(),
      value: part.slice(idx + 1).replace(/\s+/g, " ").trim(),
    });
  }
  return decls;
}

const normalize = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();

export function parseTokens(rawCss) {
  const css = stripComments(rawCss);
  const root = new Map();
  const reducedMotion = new Map();
  const otherDeclarations = [];
  const duplicates = [];

  for (const { prelude, body } of parseBlocks(css)) {
    const sel = normalize(prelude);
    if (sel === ":root") {
      for (const { prop, value } of parseDeclarations(body)) {
        if (!prop.startsWith("--")) {
          otherDeclarations.push(`${prop}: ${value}`);
          continue;
        }
        if (root.has(prop)) duplicates.push(prop);
        root.set(prop, value);
      }
    } else if (/^@media\b/.test(sel) && /prefers-reduced-motion\s*:\s*reduce/.test(sel)) {
      for (const inner of parseBlocks(body)) {
        if (normalize(inner.prelude) !== ":root") continue;
        for (const { prop, value } of parseDeclarations(inner.body)) {
          reducedMotion.set(prop, value);
        }
      }
    } else {
      otherDeclarations.push(`${prelude} { … }`);
    }
  }
  return { root, reducedMotion, otherDeclarations, duplicates };
}

// ---------------------------------------------------------------------------
// Color + contrast (WCAG 2.x)
// ---------------------------------------------------------------------------

export function resolveValue(name, tokens, seen = new Set()) {
  if (seen.has(name)) throw new Error(`circular var() reference at ${name}`);
  seen.add(name);
  if (!tokens.has(name)) throw new Error(`${name} is not defined`);
  const value = tokens.get(name).trim();
  const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(value);
  if (!m) return value;
  if (!tokens.has(m[1]) && m[2] !== undefined) return m[2].trim();
  return resolveValue(m[1], tokens, seen);
}

export function parseColor(value) {
  const v = value.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (m) {
    let hex = m[1];
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((c) => c + c).join("");
    if (hex.length !== 6 && hex.length !== 8) return null;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a };
  }
  m = /^rgba?\((.+)\)$/.exec(v);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const ch = (p) => (p.endsWith("%") ? (parseFloat(p) / 100) * 255 : parseFloat(p));
    const a = parts[3] === undefined ? 1 : parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    const [r, g, b] = parts.slice(0, 3).map(ch);
    if ([r, g, b, a].some(Number.isNaN)) return null;
    return { r, g, b, a };
  }
  if (v === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (v === "black") return { r: 0, g: 0, b: 0, a: 1 };
  return null;
}

function luminance({ r, g, b }) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------
// Docs
// ---------------------------------------------------------------------------

// Tokens documented in markdown tables: rows whose first cell is `--token`.
export function parseDocumentedTokens(markdown) {
  const documented = new Set();
  for (const line of markdown.split("\n")) {
    const m = /^\s*\|\s*`(--[\w-]+)`\s*\|/.exec(line);
    if (m) documented.add(m[1]);
  }
  return documented;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

export function checkTokens(css, markdown) {
  const errors = [];
  const notes = [];
  let parsed;
  try {
    parsed = parseTokens(css);
  } catch (err) {
    return { errors: [`tokens.css: ${err.message}`], notes };
  }
  const { root, reducedMotion, otherDeclarations, duplicates } = parsed;

  for (const name of REQUIRED_TOKENS) {
    if (!root.has(name)) errors.push(`missing required token ${name} on :root`);
  }
  for (const name of duplicates) errors.push(`token ${name} is defined more than once on :root`);
  if (root.size > MAX_TOKENS) errors.push(`${root.size} tokens defined; the limit is ${MAX_TOKENS}`);
  for (const name of root.keys()) {
    if (COLOR_NAME_RE.test(name)) errors.push(`token ${name} is color-named; use a semantic name`);
  }
  for (const decl of otherDeclarations) {
    errors.push(`tokens.css may only contain token definitions on :root, found: ${decl}`);
  }

  // Reduced motion
  const durations = [...root.keys()].filter((n) => n.startsWith("--duration-"));
  for (const name of durations) {
    const v = reducedMotion.get(name);
    if (v === undefined) errors.push(`reduced-motion block does not override ${name}`);
    else if (!/^0(ms|s)?$/.test(v)) errors.push(`reduced-motion block sets ${name} to "${v}", expected 0ms`);
  }

  // Spacing scale must increase monotonically
  const spaces = [...root.keys()]
    .filter((n) => /^--space-\d+$/.test(n))
    .sort((a, b) => Number(a.slice(8)) - Number(b.slice(8)));
  for (let i = 1; i < spaces.length; i++) {
    const prev = parseFloat(root.get(spaces[i - 1]));
    const cur = parseFloat(root.get(spaces[i]));
    if (!(cur > prev)) errors.push(`spacing scale is not increasing at ${spaces[i]}`);
  }

  // Contrast
  for (const [fg, bg, min] of CONTRAST_PAIRS) {
    let fgColor, bgColor;
    try {
      fgColor = parseColor(resolveValue(fg, root));
      bgColor = parseColor(resolveValue(bg, root));
    } catch (err) {
      errors.push(`contrast ${fg} on ${bg}: ${err.message}`);
      continue;
    }
    if (!fgColor || !bgColor) {
      errors.push(`contrast ${fg} on ${bg}: could not parse color value`);
      continue;
    }
    if (fgColor.a < 1 || bgColor.a < 1) {
      errors.push(`contrast ${fg} on ${bg}: colors must be opaque to be checked`);
      continue;
    }
    const ratio = contrastRatio(fgColor, bgColor);
    const line = `${fg} on ${bg}: ${ratio.toFixed(2)}:1 (min ${min}:1)`;
    if (ratio < min) errors.push(`contrast too low, ${line}`);
    else notes.push(line);
  }

  // Docs
  if (markdown !== undefined) {
    const documented = parseDocumentedTokens(markdown);
    for (const name of root.keys()) {
      if (!documented.has(name)) errors.push(`token ${name} is not documented in docs/tokens.md`);
    }
    for (const name of documented) {
      if (!root.has(name)) errors.push(`docs/tokens.md documents ${name}, which is not defined in tokens.css`);
    }
  }

  return { errors, notes, count: root.size };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const cssPath = resolve(process.argv[2] ?? `${repo}/src/tokens.css`);
  const docsPath = resolve(process.argv[3] ?? `${repo}/docs/tokens.md`);
  const { errors, notes, count } = checkTokens(readFileSync(cssPath, "utf8"), readFileSync(docsPath, "utf8"));
  for (const n of notes) console.log(`  ok  ${n}`);
  if (errors.length) {
    for (const e of errors) console.error(`  FAIL ${e}`);
    console.error(`\ncheck-tokens: ${errors.length} problem(s) found.`);
    process.exit(1);
  }
  console.log(`\ncheck-tokens: ${count} tokens defined, documented and passing.`);
}
