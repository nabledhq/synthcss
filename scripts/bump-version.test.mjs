import { test } from "node:test";
import assert from "node:assert/strict";
import { bumpFiles, nextVersion } from "./bump-version.mjs";

const files = {
  "package.json": '{\n  "name": "synthcss",\n  "version": "0.2.0",\n  "private": true\n}\n',
  "packages/synthmcp/package.json": '{\n  "name": "synthmcp",\n  "version": "0.2.0",\n  "dependencies": { "synthcss": "file:../.." }\n}\n',
  "synthcss.ai.json": '{\n  "synthcssVersion": "0.2.0",\n  "contractVersion": "1.0.0"\n}\n',
  "synthcss.llm.md":
    "# SynthCSS\r\n\r\nVersion: SynthCSS 0.2.0 · contract 1.0.0\r\n\r\nLoad: `https://cdn.jsdelivr.net/gh/nabledhq/synthcss@0.2.0/dist/synthcss.min.css`\r\n",
  "README.md":
    '<link href="https://cdn.jsdelivr.net/gh/nabledhq/synthcss@0.2.0/dist/synthcss.min.css">\n\n`@0.2` follows the latest 0.2.x patch release.\n',
};

test("computes the next version", () => {
  assert.equal(nextVersion("0.2.0", "patch"), "0.2.1");
  assert.equal(nextVersion("0.2.3", "minor"), "0.3.0");
  assert.equal(nextVersion("0.2.3", "major"), "1.0.0");
  assert.equal(nextVersion("0.2.3", "1.4.0"), "1.4.0");
  assert.throws(() => nextVersion("0.2.0", "huge"), /unknown bump/);
});

test("updates every version reference and keeps line endings", () => {
  const out = bumpFiles(files, "0.2.0", "0.3.0");
  assert.ok(out["package.json"].includes('"version": "0.3.0"'));
  assert.ok(out["packages/synthmcp/package.json"].includes('"version": "0.3.0"'), "SynthMCP tracks the SynthCSS version");
  assert.ok(out["synthcss.ai.json"].includes('"synthcssVersion": "0.3.0"'));
  assert.ok(out["synthcss.ai.json"].includes('"contractVersion": "1.0.0"'), "contract version is separate");
  assert.ok(out["synthcss.llm.md"].includes("Version: SynthCSS 0.3.0 · contract 1.0.0\r\n"));
  assert.ok(out["synthcss.llm.md"].includes("synthcss@0.3.0/dist"));
  assert.ok(out["README.md"].includes("synthcss@0.3.0/dist"));
  assert.ok(out["README.md"].includes("`@0.3` follows the latest 0.3.x"));
  for (const text of Object.values(out)) assert.ok(!text.includes("0.2.0"), text);
});

test("fails loudly when a file no longer states the version", () => {
  const reworded = { ...files, "synthcss.llm.md": "# SynthCSS\n" };
  assert.throws(() => bumpFiles(reworded, "0.2.0", "0.3.0"), /synthcss\.llm\.md: expected to find/);
});
