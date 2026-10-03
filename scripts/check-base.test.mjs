import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBase, isPageOrHeadingSelector, parseBase, readRepoFiles } from "./check-base.mjs";

const repo = new URL("..", import.meta.url).pathname;
const files = readRepoFiles(repo);

const errorsWith = (changes) => checkBase({ ...files, ...changes });
const assertError = (errors, text) => assert.ok(errors.some((e) => e.includes(text)), errors.join("\n"));

test("repository base files pass", () => {
  assert.deepEqual(errorsWith({}), []);
});

test("parses the zero-specificity rules of the layer", () => {
  const { errors, rules } = parseBase(files.baseCss);
  assert.deepEqual(errors, []);
  assert.equal(rules.get("h1")["font-size"], "var(--text-3xl)");
  assert.equal(rules.get("html")["font-family"], "var(--font-sans)");
});

test("fails when the rules are not wrapped in @layer synth.base", () => {
  const unlayered = files.baseCss.replace(/@layer synth\.base \{([\s\S]*)\}\s*$/, "$1");
  assertError(errorsWith({ baseCss: unlayered }), "exactly one @layer synth.base");
  const renamed = files.baseCss.replace("@layer synth.base", "@layer base");
  assertError(errorsWith({ baseCss: renamed }), "must use @layer synth.base");
});

test("fails on a selector with specificity", () => {
  const baseCss = files.baseCss.replace(":where(h1) {", "h1 {");
  assertError(errorsWith({ baseCss }), 'selector "h1" must be a single :where(…)');
});

test("fails when a heading size or page style is wrong or missing", () => {
  const wrong = files.baseCss.replace("var(--text-2xl)", "var(--text-xl)");
  assertError(errorsWith({ baseCss: wrong }), ":where(h2) must set font-size: var(--text-2xl)");
  const missing = files.baseCss.replace("color: var(--color-text);", "");
  assertError(errorsWith({ baseCss: missing }), ":where(html) must set color: var(--color-text)");
});

test("fails on resets and extra rules", () => {
  const reset = files.baseCss.replace("font-size: 100%;", "font-size: 100%;\n    margin: 0;");
  assertError(errorsWith({ baseCss: reset }), "sets margin, which is not a base style");
  const extra = files.baseCss.replace(/\}\s*$/, "  :where(h5) { font-size: var(--text-base); }\n}\n");
  assertError(errorsWith({ baseCss: extra }), "unexpected rule :where(h5)");
});

test("fails when the bundle misses base.css or loads it in the wrong place", () => {
  const without = files.bundleCss.replace('@import url("base.css");', "");
  assertError(errorsWith({ bundleCss: without }), "does not import base.css");
  const late = without.replace('@import url("components.css");', '@import url("components.css");\n@import url("base.css");');
  assertError(errorsWith({ bundleCss: late }), "before layout.css and components.css");
  const early = without.replace('@import url("tokens.css");', '@import url("base.css");\n@import url("tokens.css");');
  assertError(errorsWith({ bundleCss: early }), "after tokens.css");
});

test("fails when a modular file pulls in base styles", () => {
  const modular = { ...files.modular, "layout.css": '@import url("base.css");\n' + files.modular["layout.css"] };
  assertError(errorsWith({ modular }), "layout.css must not import base.css");
});

test("fails when a modular file styles the page or bare headings", () => {
  for (const [file, rule, selector] of [
    ["tokens.css", ":where(html) { font-family: var(--font-sans); }", ":where(html)"],
    ["layout.css", "body { color: var(--color-text); }", "body"],
    ["components.css", ":where(h1) { font-size: var(--text-3xl); }", ":where(h1)"],
    ["components.css", "@media (min-width: 40rem) { h1, h2 { font-size: var(--text-2xl); } }", "h2"],
  ]) {
    const modular = { ...files.modular, [file]: files.modular[file] + "\n" + rule + "\n" };
    assertError(errorsWith({ modular }), `${file}: "${selector}" styles the page or headings`);
  }
});

test("allows component-scoped heading rules", () => {
  assert.ok(!isPageOrHeadingSelector(".card-header :where(h1, h2, h3, h4, h5, h6)"));
  assert.ok(!isPageOrHeadingSelector(":root"));
  assert.ok(isPageOrHeadingSelector(":where(h1, h2)"));
});
