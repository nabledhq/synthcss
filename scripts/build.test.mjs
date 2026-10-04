import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build, inlineImports, OUTPUTS, SCRIPTS } from "./build.mjs";

const fakeSrc = {
  "synthcss.css": '/* bundle */\r\n@import url("tokens.css");\r\n@import url(\'layout.css\');\r\n',
  "tokens.css": ":root { --space-1: 0.25rem; }\n",
  "base.css": "@layer synth.base { :where(html) { color: red; } }\n",
  "layout.css": ".stack { gap: var(--space-1); }\n",
  "components.css": ".card { padding: var(--space-1); }\n",
  "js/synth.js": '(function () {\r\n  window.Synth = {};\r\n})();\r\n',
};
const read = (file) => fakeSrc[file];

test("inlines every @import of the bundle in order", () => {
  const css = inlineImports(fakeSrc["synthcss.css"], read);
  assert.equal(css, "/* bundle */\n:root { --space-1: 0.25rem; }\n.stack { gap: var(--space-1); }\n");
});

test("stamps every output with the version and file name", () => {
  const outputs = build("1.2.3", read);
  assert.deepEqual(Object.keys(outputs), [...OUTPUTS, "synth.js"]);
  for (const file of Object.keys(outputs)) assert.ok(outputs[file].startsWith(`/*! SynthCSS v1.2.3 | ${file} |`), outputs[file]);
  assert.ok(!outputs["synthcss.css"].includes("@import"));
});

test("fails on a circular @import", () => {
  const loop = { "a.css": '@import url("b.css");', "b.css": '@import url("a.css");' };
  assert.throws(() => inlineImports(loop["a.css"], (f) => loop[f]), /circular @import/);
});

test("the built bundle contains the synth.base layer; the modular files do not", () => {
  const src = new URL("../src/", import.meta.url);
  const outputs = build("0.0.0", (file) => readFileSync(new URL(file, src), "utf8"));
  const bundle = outputs["synthcss.css"];
  assert.ok(bundle.includes("@layer synth.base {"), "synthcss.css has no @layer synth.base");
  for (const rule of [":where(html) {", "font-family: var(--font-sans);", ":where(h1) { font-size: var(--text-3xl); }"]) {
    assert.ok(bundle.includes(rule), `synthcss.css is missing ${rule}`);
  }
  assert.ok(bundle.indexOf("@layer synth.base") > bundle.indexOf(":root {"), "base styles must follow the tokens");
  for (const file of ["tokens.css", "layout.css", "components.css"]) {
    assert.ok(!outputs[file].includes("synth.base"), `${file} includes the base layer`);
    assert.ok(!outputs[file].includes(":where(html)"), `${file} styles html`);
  }
});

test("copies src/js/synth.js to synth.js as it is, after the banner", () => {
  assert.deepEqual(SCRIPTS, { "synth.js": "js/synth.js" });
  const outputs = build("1.2.3", read);
  assert.equal(outputs["synth.js"], "/*! SynthCSS v1.2.3 | synth.js | MIT License | https://github.com/nabledhq/synthcss */\n(function () {\n  window.Synth = {};\n})();\n");
});

test("the built synth.js is a plain IIFE defining window.Synth, with no import or require", () => {
  const src = new URL("../src/", import.meta.url);
  const js = build("0.0.0", (file) => readFileSync(new URL(file, src), "utf8"))["synth.js"];
  const code = js.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  assert.ok(code.startsWith("(function () {"), "synth.js must start with an IIFE");
  assert.ok(code.endsWith("})();"), "synth.js must end by calling the IIFE");
  assert.ok(code.includes("window.Synth ="), "synth.js must define window.Synth");
  assert.doesNotMatch(code, /^\s*(import|export)\b|\bimport\s*\(|\brequire\s*\(/m);
});

test("package.json has no runtime dependencies", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.dependencies, undefined);
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}), ["happy-dom"]);
});
