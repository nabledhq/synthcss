import { test } from "node:test";
import assert from "node:assert/strict";
import { buildModel } from "../src/index.js";
import { connect, readContract } from "./helpers.js";
import { closest, editDistance } from "../src/validate.js";

const contract = readContract();

async function validate(html, options) {
  const { call, close } = await connect(options);
  try {
    return await call("validate_markup", { html });
  } finally {
    await close();
  }
}
const ofType = (res, type) => res.issues.filter((i) => i.type === type);

test("edit distance and closest names", () => {
  assert.equal(editDistance("kitten", "sitting"), 3);
  assert.equal(editDistance("", "abc"), 3);
  assert.equal(closest("buton", ["badge", "button", "card"]), "button");
  assert.equal(closest("zzzzzzzzzzzz", ["badge"]), undefined, "no suggestion when nothing is close");
});

test("unknown-class: an invented class in the SynthCSS namespace, with the closest public name", async () => {
  // stak-lg is outside the namespace (no contract base "stak"), so it is the author's own.
  const res = await validate('<div class="stak-lg">…</div><div class="synth-grid">…</div><p class="button-ghost">…</p>');
  assert.equal(res.valid, false);
  const issues = ofType(res, "unknown-class");
  assert.deepEqual(issues.map((i) => i.value), ["synth-grid", "button-ghost"]);
  assert.ok(issues.every((i) => i.severity === "error"));
  assert.equal(issues[0].suggestion, "grid", "synth- is dropped before matching");
  assert.ok(contract.components.button.variants[issues[1].suggestion], "suggests a real button variant");
});

test("arbitrary user classes are ignored", async () => {
  const res = await validate('<div class="my-header hero flex-row-gap-large-center btn btn-primary mt-4 user-avatar"><span class="stackable">x</span></div>');
  assert.deepEqual(res.issues, []);
  assert.equal(res.valid, true);
  const mixed = await validate('<div class="cluster my-row"><button type="button" class="button js-save">Save</button></div>');
  assert.deepEqual(mixed.issues, []);
});

test("unsupported-variant: a variant without its base, an unknown variant on a base, a modifier without its primitive", async () => {
  const res = await validate(
    '<button type="button" class="button-danger">Delete</button>' +
      '<span class="badge badge-red">Failed</span>' +
      '<div class="stack stack-xl">…</div>' +
      '<div class="sidebar-end"><main>…</main><aside>…</aside></div>',
  );
  const issues = ofType(res, "unsupported-variant");
  assert.deepEqual(issues.map((i) => i.value), ["button-danger", "badge-red", "stack-xl", "sidebar-end"]);
  assert.equal(issues[0].suggestion, "button button-danger");
  assert.ok(contract.components.badge.variants[issues[1].suggestion], "suggests a real badge variant");
  assert.ok(["stack-sm", "stack-lg"].includes(issues[2].suggestion));
  assert.equal(issues[3].suggestion, "sidebar sidebar-end");
  assert.equal(res.valid, false);

  const ok = await validate('<div class="sidebar-lg sidebar-end"><main>…</main><aside>…</aside></div><div class="stack-lg">…</div>');
  assert.deepEqual(ok.issues, [], "gap variants stand alone and carry the modifier");
});

test("internal-class: classes the contract marks internal", async () => {
  const fixture = structuredClone(contract);
  fixture.internal.classes = ["synth-focus-ring"];
  const res = await validate('<button type="button" class="button synth-focus-ring">Save</button>', { model: buildModel(fixture) });
  assert.deepEqual(res.issues.map((i) => [i.type, i.severity, i.value]), [["internal-class", "error", "synth-focus-ring"]]);
  assert.equal(res.valid, false);
  // The repository contract has no internal classes today.
  assert.deepEqual(contract.internal.classes, []);
});

test("invalid-part: a part outside its component, in the wrong place, or one the component lacks", async () => {
  const res = await validate(
    '<div class="card-header"><h2>Atlas</h2></div>' +
      '<article class="card"><h2 class="card-title">Atlas</h2></article>' +
      '<div class="cover"><div><div class="cover-main">…</div></div></div>' +
      '<div class="table-wrap" tabindex="0"><table><tr><td class="numeric">1</td></tr></table></div>',
  );
  const issues = ofType(res, "invalid-part");
  assert.deepEqual(issues.map((i) => i.value), ["card-header", "card-title", "cover-main", "table-wrap", "numeric"]);
  assert.equal(issues[1].suggestion, "card-header");
  assert.match(issues[2].message, /direct child/);
  assert.match(issues[3].message, /around/);

  const ok = await validate(
    '<article class="card"><div class="card-header"><h2>Atlas</h2></div><div class="card-footer split-sm">…</div></article>' +
      '<main class="cover"><form class="cover-main center stack">…</form></main>' +
      '<div class="table-wrap" tabindex="0"><table class="table"><tr><td class="numeric">1</td></tr></table></div>',
  );
  assert.deepEqual(ok.issues, []);
});

test("unknown-data-attribute: data-synth-* attributes SynthJS does not read, and internal markers", async () => {
  const res = await validate('<button type="button" class="button" data-synth-collapse="filters">Filters</button><div id="filters" hidden>…</div><style data-synth></style>');
  const issues = ofType(res, "unknown-data-attribute");
  assert.deepEqual(issues.map((i) => i.value), ["data-synth-collapse", "data-synth"]);
  assert.ok(Object.hasOwn(contract.synthjs.attributes, issues[0].suggestion));
  assert.match(issues[1].message, /internal/);
  assert.equal(res.valid, false);
});

test("invalid-target: data-synth-* targets that do not resolve within the fragment", async () => {
  const res = await validate(
    '<button type="button" class="button" data-synth-open="missing">Open</button>' +
      '<button type="button" class="button" data-synth-open="not-a-dialog">Open</button><div id="not-a-dialog">…</div>' +
      '<button type="button" class="button" data-synth-toggle="">Toggle</button>' +
      '<button type="button" class="button" data-synth-dismiss>Close</button>' +
      '<div data-synth-tabs><p>No tabs here</p></div>' +
      '<ul data-synth-dropdown-menu hidden><li>…</li></ul>',
  );
  const issues = ofType(res, "invalid-target");
  assert.deepEqual(issues.map((i) => i.value), [
    'data-synth-open="missing"',
    'data-synth-open="not-a-dialog"',
    "data-synth-toggle",
    "data-synth-dismiss",
    "data-synth-tabs",
    "data-synth-dropdown-menu",
  ]);
  assert.match(issues[1].message, /<dialog>/);
  assert.equal(res.valid, false);
});

test("valid data-synth-* usage passes", async () => {
  const html = [
    '<button type="button" class="button" data-synth-open="d1">Open</button>',
    '<dialog id="d1" aria-labelledby="d1-title"><h2 id="d1-title">Hi</h2><button type="button" class="button" data-synth-dismiss>Close</button></dialog>',
    '<button type="button" class="button" data-synth-toggle="more">More</button><div id="more" hidden>…</div>',
    '<div class="alert alert-info" role="status" data-synth-dismissible><p>Saved.</p><button type="button" class="button button-sm" data-synth-dismiss>Dismiss</button></div>',
    '<div data-synth-dropdown><button type="button" class="button">Account</button><ul class="nav stack-sm" role="list" data-synth-dropdown-menu hidden><li><a class="nav-link" href="/me">Me</a></li></ul></div>',
    contract.examples.patterns.tabs.html,
  ].join("\n");
  const res = await validate(html);
  assert.deepEqual(res.issues, []);
  assert.equal(res.valid, true);
});

test("a11y: the contract's accessibility expectations, with their severity", async () => {
  const res = await validate(
    '<div class="button">Save</div>' +
      '<button type="button" class="button button-icon"><svg aria-hidden="true"></svg></button>' +
      '<div class="alert alert-danger">Failed</div>' +
      '<div class="tabs" role="group"><button type="button" class="tabs-item" aria-pressed="true">Week</button></div>' +
      '<div class="table-wrap"><table class="table"></table></div>',
  );
  const issues = ofType(res, "a11y");
  assert.deepEqual(
    issues.map((i) => [i.value, i.severity]),
    [
      ["button", "error"],
      ["button-icon", "error"],
      ["alert", "error"],
      ["tabs", "error"],
      ["tabs", "error"],
      ["tabs-item", "error"],
      ["tabs-item", "error"],
      ["table-wrap", "warning"],
    ],
  );
  assert.match(issues[0].message, /Found <div>/);
  assert.match(issues[3].message, /Found role="group"/);
  for (const issue of issues) {
    const rules = Object.values(contract.components).flatMap((c) => c.accessibility);
    assert.ok(rules.some((r) => r.class === issue.value && issue.message.startsWith(r.expectation)), issue.message);
  }
  assert.equal(res.valid, false);
});

test("warnings alone keep the markup valid", async () => {
  const res = await validate('<div class="field"><label class="field-label">Name <input type="text"></label></div>');
  assert.deepEqual(res.issues.map((i) => [i.type, i.severity, i.value]), [["a11y", "warning", "field-label"]]);
  assert.equal(res.valid, true);
});

test("parses full documents and template content, and reports each issue once", async () => {
  const doc = await validate('<!doctype html><html lang="en"><body class="container"><template><span class="badge-info">x</span></template></body></html>');
  assert.deepEqual(doc.issues.map((i) => i.value), ["badge-info"]);
  const repeated = await validate('<span class="badge-info">a</span><span class="badge-info">b</span>');
  assert.equal(repeated.issues.length, 1);
  assert.deepEqual((await validate("")).issues, []);
  assert.deepEqual((await validate("<div class=\"stack\"><p>unclosed")).issues, [], "parse5 recovers like a browser");
});
