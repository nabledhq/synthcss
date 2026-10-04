// SynthMCP only reads the contract and its tool arguments: no process spawning, no
// network, no file writes. This scans its source for the APIs that would break that.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const files = readdirSync(SRC)
  .filter((f) => f.endsWith(".js") || f.endsWith(".mjs") || f.endsWith(".cjs"))
  .map((f) => ({ file: f, text: readFileSync(join(SRC, f), "utf8") }));

const FORBIDDEN = [
  ["child_process", /\bchild_process\b/],
  ["net", /["'](?:node:)?net["']/],
  ["http(s)", /["'](?:node:)?https?2?["']|\bhttps?\s*\.\s*(?:request|get|createServer)\b/],
  ["fetch", /\bfetch\b/],
  ["other network APIs", /\b(?:XMLHttpRequest|WebSocket|EventSource)\b|["'](?:node:)?(?:dgram|tls|dns|http2)["']/],
  ["writeFile", /\bwriteFile(?:Sync)?\b/],
  ["appendFile", /\bappendFile(?:Sync)?\b/],
  ["createWriteStream", /\bcreateWriteStream\b/],
  ["mkdir", /\bmkdir(?:Sync)?\b|\bmkdtemp(?:Sync)?\b/],
  ["rm", /\brm(?:Sync)?\s*\(|\brmdir(?:Sync)?\b|\.rm\b/],
  ["unlink", /\bunlink(?:Sync)?\b/],
  ["other fs writes", /\b(?:rename|copyFile|truncate|ftruncate|symlink|chmod|chown|utimes|cp)(?:Sync)?\s*\(/],
  ["eval", /\beval\s*\(|\bnew Function\s*\(/],
];
// Imports SynthMCP may use; a new one must be added here on purpose.
const ALLOWED_IMPORTS = new Set([
  "node:fs",
  "node:module",
  "node:url",
  "parse5",
  "@modelcontextprotocol/sdk/server/index.js",
  "@modelcontextprotocol/sdk/server/stdio.js",
  "@modelcontextprotocol/sdk/types.js",
]);

test("scans every source file", () => {
  assert.deepEqual(files.map((f) => f.file).sort(), ["contract.js", "index.js", "intent.js", "server.js", "tools.js", "validate.js"]);
});

test("src/ uses no process, network or file-write APIs", () => {
  for (const { file, text } of files) {
    for (const [what, pattern] of FORBIDDEN) assert.doesNotMatch(text, pattern, `src/${file} uses ${what}`);
  }
});

test("src/ imports only the MCP SDK, parse5 and read-only Node modules", () => {
  for (const { file, text } of files) {
    assert.doesNotMatch(text, /\brequire\s*\(|\bimport\s*\(/, `src/${file} must not load modules dynamically`);
    for (const m of text.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']/gm)) {
      const spec = m[1];
      if (spec.startsWith("./")) continue;
      assert.ok(ALLOWED_IMPORTS.has(spec), `src/${file} imports ${spec}`);
    }
    for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']node:fs["']/g)) {
      assert.deepEqual(m[1].split(",").map((s) => s.trim()).filter(Boolean), ["readFileSync"], `src/${file} may only read files`);
    }
  }
});

test("the scan catches forbidden APIs", () => {
  const hits = (text) => FORBIDDEN.filter(([, p]) => p.test(text)).map(([what]) => what);
  assert.deepEqual(hits('import { exec } from "node:child_process";'), ["child_process"]);
  assert.deepEqual(hits('import net from "net";'), ["net"]);
  assert.deepEqual(hits('import https from "node:https";'), ["http(s)"]);
  assert.deepEqual(hits("await fetch(url)"), ["fetch"]);
  assert.deepEqual(hits("fs.writeFileSync(p, s)"), ["writeFile"]);
  assert.deepEqual(hits("appendFile(p, s)"), ["appendFile"]);
  assert.deepEqual(hits("createWriteStream(p)"), ["createWriteStream"]);
  assert.deepEqual(hits("mkdirSync(p)"), ["mkdir"]);
  assert.deepEqual(hits("fs.rm(p)"), ["rm"]);
  assert.deepEqual(hits("unlinkSync(p)"), ["unlink"]);
});
