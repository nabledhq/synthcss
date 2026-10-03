#!/usr/bin/env node
// Dependency-free version bump. Updates every file that states the SynthCSS
// version, so npm test (verify-ai-contract) keeps passing after the bump.
// Usage: node scripts/bump-version.mjs <patch|minor|major|X.Y.Z>
// Prints the new version.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function nextVersion(current, bump) {
  if (SEMVER.test(bump)) return bump;
  const m = SEMVER.exec(current);
  if (!m) throw new Error(`package.json version "${current}" is not X.Y.Z`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`unknown bump "${bump}": use patch, minor, major or X.Y.Z`);
}

// File → replacements as [pattern built from the old version, replacement for the new one].
// Each pattern must match at least once, so a reworded file fails loudly instead of
// being released with a stale version.
export const TARGETS = {
  "package.json": (from, to) => [[`"version": "${from}"`, `"version": "${to}"`]],
  "synthcss.ai.json": (from, to) => [[`"synthcssVersion": "${from}"`, `"synthcssVersion": "${to}"`]],
  "synthcss.llm.md": (from, to) => [
    [`Version: SynthCSS ${from} `, `Version: SynthCSS ${to} `],
    [`synthcss@${from}/`, `synthcss@${to}/`],
  ],
  "README.md": (from, to) => {
    const [fromMinor, toMinor] = [from, to].map((v) => v.split(".").slice(0, 2).join("."));
    return [
      [`synthcss@${from}/`, `synthcss@${to}/`],
      [`\`@${fromMinor}\` follows the latest ${fromMinor}.x`, `\`@${toMinor}\` follows the latest ${toMinor}.x`],
    ];
  },
};

export function bumpFiles(files, from, to) {
  const out = {};
  for (const [file, replacements] of Object.entries(TARGETS)) {
    let text = files[file];
    for (const [find, replace] of replacements(from, to)) {
      const pattern = new RegExp(esc(find), "g");
      if (!pattern.test(text)) throw new Error(`${file}: expected to find ${JSON.stringify(find)}`);
      text = text.replace(pattern, replace);
    }
    out[file] = text;
  }
  return out;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const read = (file) => readFileSync(resolve(repo, file), "utf8");
  const from = JSON.parse(read("package.json")).version;
  const to = nextVersion(from, process.argv[2] ?? "");
  if (to === from) throw new Error(`already at ${to}`);
  const files = Object.fromEntries(Object.keys(TARGETS).map((file) => [file, read(file)]));
  for (const [file, text] of Object.entries(bumpFiles(files, from, to))) writeFileSync(resolve(repo, file), text);
  console.log(to);
}
