import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MAX_TOKENS, estimateTokens, maxTokensFrom, readRepoFiles, verifyContract } from "./verify-ai-contract.mjs";

const repo = new URL("..", import.meta.url).pathname;
const files = readRepoFiles(repo);
const contract = JSON.parse(files.json);

const errorsWith = (changes, options) => verifyContract({ ...files, ...changes }, options).errors;
const assertError = (errors, text) => assert.ok(errors.some((e) => e.includes(text)), `expected "${text}" in:\n${errors.join("\n")}`);
// Edits a deep copy of the JSON contract.
const withJson = (edit) => {
  const c = structuredClone(contract);
  edit(c);
  return { json: JSON.stringify(c, null, 2) };
};

test("the repository contract passes", () => {
  const { errors, warnings, size } = verifyContract(files);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.ok(size.tokens < DEFAULT_MAX_TOKENS, `synthcss.llm.md is ~${size.tokens} tokens`);
});

test("estimates size as characters ÷ 4 and warns, without failing, above the threshold", () => {
  assert.equal(estimateTokens("x".repeat(400)), 100);
  assert.equal(estimateTokens("x".repeat(401)), 101);
  const { errors, warnings, size } = verifyContract(files, { maxTokens: 100 });
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], new RegExp(`~${size.tokens} tokens, above the 100-token threshold`));
  assert.equal(maxTokensFrom([], {}), 8000);
  assert.equal(maxTokensFrom(["--max-tokens=500"], {}), 500);
  assert.equal(maxTokensFrom([], { SYNTHCSS_AI_CONTRACT_MAX_TOKENS: "600" }), 600);
  assert.throws(() => maxTokensFrom(["--max-tokens=lots"], {}));
});

test("fails when a fake class is added to the contract", () => {
  const json = withJson((c) => (c.layouts["stack-xl"] = "stack with a huge gap"));
  assertError(errorsWith(json), "synthcss.ai.json: class .stack-xl is not a selector");
  const variant = withJson((c) => (c.components.button.variants["button-ghost"] = "subtle action"));
  assertError(errorsWith(variant), "synthcss.ai.json: class .button-ghost is not a selector");
  const mention = withJson((c) => c.intentMap.push({ intent: "Hero", use: ".hero" }));
  assertError(errorsWith(mention), "synthcss.ai.json: class .hero is not a selector");
  const md = files.md.replace("- `.center` —", "- `.middle` — centered box\n- `.center` —");
  assertError(errorsWith({ md }), "synthcss.llm.md: class .middle is not a selector");
  assertError(errorsWith({ md }), "class .middle is in the synthcss.llm.md vocabulary but not in synthcss.ai.json");
});

test("fails when a class is deleted from the contract", () => {
  const layout = withJson((c) => delete c.layouts["cover-main"]);
  assertError(errorsWith(layout), "class .cover-main is in the SynthCSS CSS but missing from synthcss.ai.json");
  const part = withJson((c) => delete c.components.table.parts.numeric);
  assertError(errorsWith(part), "class .numeric is in the SynthCSS CSS but missing from synthcss.ai.json");
  const md = files.md.replace(/^- `\.split-lg` — .*\n/m, "");
  assertError(errorsWith({ md }), "class .split-lg is in synthcss.ai.json but not in the synthcss.llm.md vocabulary");
});

test("lists nav and tabs with their intent rows and one state attribute each", () => {
  assert.ok(contract.components.nav.parts["nav-link"]);
  assert.ok(contract.components.tabs.parts["tabs-item"]);
  assert.ok(contract.intentMap.some((e) => e.intent === "Navigation links" && e.use === ".nav + .nav-link"));
  assert.ok(contract.intentMap.some((e) => e.intent === "Tabs or segmented filter" && e.use === ".tabs + .tabs-item"));
  assert.match(files.md, /^\| Navigation links \| `\.nav` \+ `\.nav-link` \|$/m);
  assert.match(files.md, /^\| Tabs or segmented filter \| `\.tabs` \+ `\.tabs-item` \|$/m);
  const tabs = withJson((c) => delete c.components.tabs);
  assertError(errorsWith(tabs), "class .tabs-item is in the SynthCSS CSS but missing from synthcss.ai.json");
  const md = files.md.replace("| Navigation links | `.nav` + `.nav-link` |\n", "");
  assertError(errorsWith({ md }), "the Intent Mapping table has");
});

test("lists switch and input-group with intent rows and one valid example each", () => {
  assert.ok(contract.components.switch);
  assert.ok(contract.components["input-group"]);
  assert.ok(contract.intentMap.some((e) => e.intent === "On/off setting" && e.use.includes(".switch")));
  assert.ok(contract.intentMap.some((e) => e.intent === "Input with an attached button or select" && e.use === ".input-group"));
  assert.match(files.md, /^\| On\/off setting \| `\.switch` .*\|$/m);
  assert.match(files.md, /^\| Input with an attached button or select \| `\.input-group` \|$/m);
  for (const cls of ["switch", "input-group"]) {
    const uses = contract.examples.valid.filter((e) => new RegExp(`class="${cls}"`).test(e.html));
    assert.equal(uses.length, 1, `.${cls} appears in exactly one valid example`);
  }
  assert.ok(contract.examples.valid.some((e) => /<label class="switch"><input type="checkbox" role="switch"/.test(e.html)));
  const json = withJson((c) => delete c.components["input-group"]);
  assertError(errorsWith(json), "class .input-group is in the SynthCSS CSS but missing from synthcss.ai.json");
  const md = files.md.replace(/^- `\.switch` — .*\n/m, "");
  assertError(errorsWith({ md }), "class .switch is in synthcss.ai.json but not in the synthcss.llm.md vocabulary");
});

test("fails when the contract drops or changes a state attribute, or allows aria-pressed", () => {
  const json = withJson((c) => (c.components.tabs.parts["tabs-item"] = "<button role=\"tab\">; selected: aria-pressed=\"true\""));
  assertError(errorsWith(json), 'synthcss.ai.json: the .tabs-item entry must name its state attribute aria-selected="true"');
  const md = files.md.replace(/^(  - part `\.nav-link` — .*?); current page: `aria-current="page"`$/m, "$1");
  assertError(errorsWith({ md }), 'synthcss.llm.md: the .nav-link entry must name its state attribute aria-current="page"');
  const pressed = files.md.replace("Never `aria-pressed` or state classes", "Avoid state classes");
  assertError(errorsWith({ md: pressed }), "never to use `aria-pressed`");
});

test("fails when a class is added to the CSS but not to the contract", () => {
  const builtCss = files.builtCss + "\n.button-ghost { color: var(--color-text); }\n";
  assertError(errorsWith({ builtCss }), "class .button-ghost is in the SynthCSS CSS but missing from synthcss.ai.json");
});

test("fails when a token is renamed", () => {
  const json = withJson((c) => {
    c.tokens["--space-7"] = c.tokens["--space-6"];
    delete c.tokens["--space-6"];
  });
  assertError(errorsWith(json), "synthcss.ai.json: token --space-7 is not defined on :root");
  assertError(errorsWith(json), "token --space-6 is defined on :root but missing from synthcss.ai.json");
  const md = files.md.replace("- `--radius-full` —", "- `--radius-pill` —");
  assertError(errorsWith({ md }), "synthcss.llm.md: token --radius-pill is not defined on :root");
  assertError(errorsWith({ md }), "token --radius-full is in synthcss.ai.json but not in the synthcss.llm.md Design Tokens");
  const builtCss = files.builtCss.replace("--ease-standard:", "--ease-default:");
  assertError(errorsWith({ builtCss }), "synthcss.ai.json: token --ease-standard is not defined on :root");
  assertError(errorsWith({ builtCss }), "token --ease-default is defined on :root but missing from synthcss.ai.json");
});

test("fails when an invalid example uses a real class it does not name as the alternative", () => {
  const json = withJson((c) => (c.examples.invalid[0].html = '<div class="cluster flex-row-gap-large-center">…</div>'));
  assertError(errorsWith(json), "synthcss.ai.json: invalid example 1: uses .cluster, a real SynthCSS class");
  const md = files.md.replace('`<p class="mt-4">Saved.</p>`', '`<p class="cluster mt-4">Saved.</p>`');
  assertError(errorsWith({ md }), "synthcss.llm.md: invalid example 5: uses .cluster, a real SynthCSS class");
  // .badge is real but exempt: the note names it as the correct alternative.
  assert.ok(contract.examples.invalid.some((e) => e.html.includes('class="badge badge-red"')));
  const noAlternative = withJson((c) => (c.examples.invalid[3].note = "Color-named variant."));
  assertError(errorsWith(noAlternative), 'invalid example 4: the note must name the correct alternative ("Use …")');
  const fakeAlternative = withJson((c) => (c.examples.invalid[0].note = "Invented class. Use .row."));
  assertError(errorsWith(fakeAlternative), "the suggested alternative .row is not a SynthCSS class");
});

test("fails when the Markdown and JSON examples drift apart", () => {
  const json = withJson((c) => c.examples.invalid.pop());
  assertError(errorsWith(json), "is not in synthcss.ai.json");
  const md = files.md.replace("New project</button>", "Add project</button>");
  assertError(errorsWith({ md }), "Valid Examples html blocks must match");
  const noInline = files.md.replace(/^- `<div style=.*\n/m, "");
  assertError(errorsWith({ md: noInline }), "needs an invalid example with an inline-style flex/gap");
});

test("fails when versions do not match package.json", () => {
  // Read the current version so the test keeps passing after a release bump.
  const { version } = JSON.parse(files.pkg);
  const json = withJson((c) => (c.synthcssVersion = "0.0.9"));
  assertError(errorsWith(json), `synthcssVersion is "0.0.9" but package.json is "${version}"`);
  const pkg = files.pkg.replace(`"version": "${version}"`, '"version": "99.0.0"');
  assertError(errorsWith({ pkg }), `states SynthCSS ${version} but package.json is 99.0.0`);
  assertError(errorsWith({ pkg }), `links to synthcss@${version} but package.json is 99.0.0`);
  const contractVersion = withJson((c) => (c.contractVersion = "2.0.0"));
  assertError(errorsWith(contractVersion), `states contract ${contract.contractVersion} but synthcss.ai.json has 2.0.0`);
});

test("fails when the JSON shape or Markdown sections are wrong", () => {
  assertError(errorsWith({ json: "{" }), "synthcss.ai.json is not valid JSON");
  assertError(errorsWith(withJson((c) => delete c.intentMap)), 'missing top-level key "intentMap"');
  assertError(errorsWith(withJson((c) => c.generationRules.pop())), "generationRules must list exactly 10 rules");
  const noIntent = files.md.replace("## Intent Mapping", "## Intents");
  assertError(errorsWith({ md: noIntent }), 'missing section "## Intent Mapping"');
  const nineRules = files.md.replace(/^10\. .*\n/m, "");
  assertError(errorsWith({ md: nineRules }), "exactly 10 numbered rules, found 9");
  const noAvoid = files.md.replace("### Avoid", "### Don't");
  assertError(errorsWith({ md: noAvoid }), 'Composition Rules has no "### Avoid"');
});

test("fails when the base styles drift from src/base.css or the Markdown", () => {
  const size = withJson((c) => (c.baseStyles.rules.h1["font-size"] = "var(--text-2xl)"));
  assertError(errorsWith(size), 'baseStyles.rules["h1"] must be {"font-size":"var(--text-3xl)"}');
  const extra = withJson((c) => (c.baseStyles.rules.h5 = { "font-size": "var(--text-base)" }));
  assertError(errorsWith(extra), 'baseStyles.rules["h5"] is not a rule in src/base.css');
  const baseCss = files.baseCss.replace("var(--text-lg)", "var(--text-base)");
  assertError(errorsWith({ baseCss }), 'baseStyles.rules["h4"] must be {"font-size":"var(--text-base)"}');
  assertError(errorsWith(withJson((c) => delete c.baseStyles.note)), "baseStyles must be { note, rules");
  const md = files.md.replace(/^Base styles apply .*$/m, "");
  assertError(errorsWith({ md }), "Design Tokens section must state the synthcss.ai.json baseStyles note");
});

test("reads `--text-*` as a token family, not a token", () => {
  assert.deepEqual(errorsWith({ md: files.md.replace("## Layout Vocabulary", "The `--space-*` scale.\n\n## Layout Vocabulary") }), []);
  assertError(errorsWith({ md: files.md.replace("## Layout Vocabulary", "Use `--space-7`.\n\n## Layout Vocabulary") }), "token --space-7");
});

test("fails when the showcase, Pages workflow or README stop publishing the contract", () => {
  const noDownload = files.showcaseHtml.replace('href="../synthcss.ai.json" download', 'href="../synthcss.ai.json"');
  assertError(errorsWith({ showcaseHtml: noDownload }), "must have a download link");
  const wrongSize = files.showcaseHtml.replace(/≈ [\d,]+ tokens/, "≈ 9,000 tokens");
  assertError(errorsWith({ showcaseHtml: wrongSize }), "says ≈ 9,000 tokens");
  const workflow = files.workflow.replace("cp synthcss.llm.md synthcss.ai.json _site/", "cp synthcss.llm.md _site/");
  assertError(errorsWith({ workflow }), "pages.yml must copy synthcss.ai.json into _site/");
  const readme = files.readme.replace(/same pull request/g, "next release");
  assertError(errorsWith({ readme }), "same pull request");
});
