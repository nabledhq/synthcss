import { test } from "node:test";
import assert from "node:assert/strict";
import { build, inlineImports, OUTPUTS } from "./build.mjs";

const fakeSrc = {
  "synthcss.css": '/* bundle */\r\n@import url("tokens.css");\r\n@import url(\'layout.css\');\r\n',
  "tokens.css": ":root { --space-1: 0.25rem; }\n",
  "layout.css": ".stack { gap: var(--space-1); }\n",
  "components.css": ".card { padding: var(--space-1); }\n",
};
const read = (file) => fakeSrc[file];

test("inlines every @import of the bundle in order", () => {
  const css = inlineImports(fakeSrc["synthcss.css"], read);
  assert.equal(css, "/* bundle */\n:root { --space-1: 0.25rem; }\n.stack { gap: var(--space-1); }\n");
});

test("stamps every output with the version and file name", () => {
  const outputs = build("1.2.3", read);
  assert.deepEqual(Object.keys(outputs), OUTPUTS);
  for (const file of OUTPUTS) assert.ok(outputs[file].startsWith(`/*! SynthCSS v1.2.3 | ${file} |`), outputs[file]);
  assert.ok(!outputs["synthcss.css"].includes("@import"));
});

test("fails on a circular @import", () => {
  const loop = { "a.css": '@import url("b.css");', "b.css": '@import url("a.css");' };
  assert.throws(() => inlineImports(loop["a.css"], (f) => loop[f]), /circular @import/);
});
