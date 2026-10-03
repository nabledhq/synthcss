import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkTokens, contrastRatio, parseColor } from "./check-tokens.mjs";

const css = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");
const docs = readFileSync(new URL("../docs/tokens.md", import.meta.url), "utf8");

const errorsFor = (c, d) => checkTokens(c, d).errors;

test("repository tokens and docs pass", () => {
  assert.deepEqual(errorsFor(css, docs), []);
});

test("fails when a required token is missing", () => {
  const broken = css.replace(/^\s*--color-surface-elevated:.*$/m, "");
  const errors = errorsFor(broken, docs);
  assert.ok(errors.some((e) => e.includes("missing required token --color-surface-elevated")), errors.join("\n"));
});

test("fails when a defined token is undocumented", () => {
  const broken = css.replace("--ease-standard:", "--ease-emphasized: ease-out;\n  --ease-standard:");
  const errors = errorsFor(broken, docs);
  assert.ok(errors.some((e) => e.includes("--ease-emphasized is not documented")), errors.join("\n"));
});

test("fails when a documented token does not exist", () => {
  const broken = docs.replace("| `--space-6` |", "| `--space-7` | `3rem` | Extra. |\n| `--space-6` |");
  const errors = errorsFor(css, broken);
  assert.ok(errors.some((e) => e.includes("documents --space-7")), errors.join("\n"));
});

test("fails when reduced motion does not zero a duration", () => {
  const broken = css.replace(/--duration-slow: 0ms;/, "--duration-slow: 100ms;");
  assert.ok(errorsFor(broken, docs).some((e) => e.includes("--duration-slow")));
  const missing = css.replace(/--duration-normal: 0ms;/, "");
  assert.ok(errorsFor(missing, docs).some((e) => e.includes("does not override --duration-normal")));
});

test("fails when contrast is below threshold", () => {
  const broken = css.replace(/--color-text-muted: #[0-9a-f]+;/, "--color-text-muted: #a0a0a0;");
  const errors = errorsFor(broken, docs);
  assert.ok(errors.some((e) => e.startsWith("contrast too low, --color-text-muted")), errors.join("\n"));
});

test("fails on color-named tokens and non-token declarations", () => {
  const broken = css.replace("--ease-standard:", "--blue-500: #0000ff;\n  --ease-standard:") + "\nbody { color: red; }\n";
  const errors = errorsFor(broken, docs);
  assert.ok(errors.some((e) => e.includes("--blue-500 is color-named")), errors.join("\n"));
  assert.ok(errors.some((e) => e.includes("only contain token definitions")), errors.join("\n"));
});

test("contrast math matches WCAG reference values", () => {
  const ratio = (a, b) => contrastRatio(parseColor(a), parseColor(b));
  assert.equal(ratio("#000", "#fff").toFixed(2), "21.00");
  assert.equal(ratio("#777777", "#ffffff").toFixed(2), "4.48");
  assert.equal(ratio("rgb(255 255 255)", "#ffffff").toFixed(2), "1.00");
});

test("fails when --color-accent is missing or too light", () => {
  const missing = css.replace(/^\s*--color-accent:.*$/m, "");
  assert.ok(errorsFor(missing, docs).some((e) => e.includes("missing required token --color-accent")));
  const light = css.replace(/--color-accent: #[0-9a-f]+;/, "--color-accent: #b9a6e8;");
  assert.ok(errorsFor(light, docs).some((e) => e.startsWith("contrast too low, --color-accent")));
});
