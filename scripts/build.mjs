#!/usr/bin/env node
// Dependency-free build of the distributable stylesheets and the optional SynthJS
// script in dist/.
// dist/ is not committed on main: the release workflow builds it and tags a
// release commit that contains it, which is what jsDelivr serves.
// Usage: node scripts/build.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const REPO_URL = "https://github.com/nabledhq/synthcss";
// Standalone files. synthcss.css is the bundle with every @import inlined.
export const OUTPUTS = ["synthcss.css", "tokens.css", "base.css", "layout.css", "components.css"];
// Scripts: dist file → source under src/. Copied as they are, with the banner; no
// bundler and no minifier (jsDelivr serves .min.js on request, like .min.css).
export const SCRIPTS = { "synth.js": "js/synth.js" };

const IMPORT = /^@import\s+url\(\s*["']?([^"')]+)["']?\s*\)\s*;[ \t]*$/gm;
const toLf = (text) => text.replace(/\r\n/g, "\n");

export const banner = (version, file) =>
  `/*! SynthCSS v${version} | ${file} | MIT License | ${REPO_URL} */\n`;

// Replaces each top-level `@import url("x.css");` with the contents of x.css,
// resolved relative to the importing file and inlined recursively.
export function inlineImports(css, readFile, seen = new Set()) {
  return toLf(css).replace(IMPORT, (_, path) => {
    if (seen.has(path)) throw new Error(`circular @import of ${path}`);
    return inlineImports(readFile(path), readFile, new Set([...seen, path])).trimEnd();
  });
}

export function build(version, readSrc) {
  return Object.fromEntries([
    ...OUTPUTS.map((file) => [file, banner(version, file) + inlineImports(readSrc(file), readSrc).trimEnd() + "\n"]),
    ...Object.entries(SCRIPTS).map(([file, src]) => [file, banner(version, file) + toLf(readSrc(src)).trimEnd() + "\n"]),
  ]);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const { version } = JSON.parse(readFileSync(resolve(repo, "package.json"), "utf8"));
  const outputs = build(version, (file) => readFileSync(resolve(repo, "src", file), "utf8"));
  mkdirSync(resolve(repo, "dist"), { recursive: true });
  for (const [file, text] of Object.entries(outputs)) writeFileSync(resolve(repo, "dist", file), text);
  console.log(`build: wrote ${Object.keys(outputs).map((f) => `dist/${f}`).join(", ")} for v${version}.`);
}
