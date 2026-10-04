import { test } from "node:test";
import assert from "node:assert/strict";
import { classAttrs, connect, publicClasses, readContract } from "./helpers.js";

const contract = readContract();
const PUBLIC = publicClasses(contract);
const REQUIRED_PATTERNS = ["dashboard-header", "settings-form", "card-grid", "dialog", "tabs", "empty-state"];

test("list_components returns name, class and the contract intent of every component", async () => {
  const { call, close } = await connect();
  try {
    const { components } = await call("list_components");
    assert.deepEqual(
      components,
      Object.entries(contract.components).map(([name, comp]) => ({ name, class: `.${name}`, intent: comp.intent })),
    );
    for (const c of components) assert.ok(!c.intent.includes("\n"), `${c.name} intent is one line`);
  } finally {
    await close();
  }
});

test("get_component matches the contract for every component", async () => {
  const { call, close } = await connect();
  try {
    for (const [name, comp] of Object.entries(contract.components)) {
      const res = await call("get_component", { name });
      assert.equal(res.name, name);
      assert.equal(res.class, `.${name}`);
      assert.equal(res.intent, comp.intent);
      assert.deepEqual(res.variants, Object.entries(comp.variants).map(([cls, purpose]) => ({ class: cls, purpose })));
      assert.deepEqual(
        res.parts,
        Object.entries(comp.parts).map(([cls, purpose]) => ({ class: cls, purpose, placement: comp.placement?.[cls] ?? "inside" })),
      );
      assert.deepEqual(res.accessibility, comp.accessibility);
      assert.equal(res.example, comp.example);
      if (!comp.behaviors) assert.equal(res.behaviors, undefined, `${name} has no behaviors`);
      else {
        assert.equal(res.behaviors.length, comp.behaviors.length);
        res.behaviors.forEach((b, i) => {
          const { attributes, ...rest } = b;
          assert.deepEqual(rest, comp.behaviors[i]);
          const expected = Object.entries(contract.synthjs.attributes).filter(([, meta]) => meta.behavior === b.attribute);
          assert.deepEqual(attributes, expected.map(([attr, meta]) => ({ name: attr, ...meta })));
          assert.ok(attributes.some((a) => a.name === b.attribute), `${b.attribute} lists itself`);
        });
      }
    }
    const dropdown = (await call("get_component", { name: "nav" })).behaviors[0];
    assert.deepEqual(dropdown.attributes.map((a) => a.name), ["data-synth-dropdown", "data-synth-dropdown-trigger", "data-synth-dropdown-menu"]);
  } finally {
    await close();
  }
});

test("list_layouts and get_layout match the contract for every primitive", async () => {
  const { call, close } = await connect();
  try {
    const { layouts } = await call("list_layouts");
    assert.deepEqual(
      layouts,
      Object.keys(contract.primitives).map((name) => ({ name, class: `.${name}`, intent: contract.layouts[name] })),
    );
    for (const [name, prim] of Object.entries(contract.primitives)) {
      const res = await call("get_layout", { name });
      const described = (list) => (list ?? []).map((cls) => ({ class: cls, purpose: contract.layouts[cls] }));
      assert.equal(res.name, name);
      assert.equal(res.class, `.${name}`);
      assert.equal(res.intent, contract.layouts[name]);
      assert.deepEqual(res.variants, described(prim.variants));
      assert.deepEqual(res.modifiers, described(prim.modifiers));
      assert.deepEqual(res.parts, described(prim.parts).map((p) => ({ ...p, placement: prim.placement?.[p.class] ?? "inside" })));
      assert.equal(res.responsive, prim.responsive);
      assert.deepEqual(res.composition, prim.composition);
      assert.equal(res.example, prim.example);
      for (const v of [...res.variants, ...res.modifiers, ...res.parts]) assert.ok(v.purpose, `${v.class} has a purpose`);
    }
    assert.deepEqual((await call("get_layout", { name: "sidebar" })).modifiers.map((m) => m.class), ["sidebar-end"]);
    assert.deepEqual((await call("get_layout", { name: "cover" })).parts, [
      { class: "cover-main", purpose: contract.layouts["cover-main"], placement: "child" },
    ]);
  } finally {
    await close();
  }
});

test("get_example returns each required official pattern from the contract", async () => {
  const { call, close } = await connect();
  try {
    for (const pattern of REQUIRED_PATTERNS) {
      const res = await call("get_example", { pattern });
      assert.equal(res.pattern, pattern);
      assert.equal(res.html, contract.examples.patterns[pattern].html);
      assert.equal(res.note, contract.examples.patterns[pattern].note);
    }
    assert.ok(contract.examples.patterns.dialog.html.includes("data-synth-open"));
    assert.ok(contract.examples.patterns.tabs.html.includes("data-synth-tabs"));
  } finally {
    await close();
  }
});

// Every piece of HTML the contract offers as correct.
function officialExamples() {
  const out = [];
  for (const [name, p] of Object.entries(contract.examples.patterns)) out.push([`examples.patterns.${name}`, p.html]);
  contract.examples.valid.forEach((e, i) => out.push([`examples.valid ${i + 1}`, e.html]));
  for (const [name, comp] of Object.entries(contract.components)) {
    out.push([`components.${name}.example`, comp.example]);
    for (const b of comp.behaviors ?? []) out.push([`${b.attribute} requiredMarkup`, b.requiredMarkup]);
  }
  for (const [name, prim] of Object.entries(contract.primitives)) out.push([`primitives.${name}.example`, prim.example]);
  for (const item of contract.extension.notCovered) out.push([`notCovered ${item.pattern}`, item.html]);
  return out;
}

test("every official example validates with zero errors", async () => {
  const { call, close } = await connect();
  try {
    for (const [where, html] of officialExamples()) {
      const res = await call("validate_markup", { html });
      assert.deepEqual(res.issues.filter((i) => i.severity === "error"), [], where);
      assert.equal(res.valid, true, where);
    }
  } finally {
    await close();
  }
});

test("every class used in examples is a public, non-internal contract class", () => {
  for (const [where, html] of officialExamples()) {
    for (const cls of classAttrs(html)) assert.ok(PUBLIC.has(cls), `${where} uses .${cls}`);
  }
});

test("every intent target is a public, non-internal contract class", () => {
  assert.ok(contract.intents.length > 20);
  const attributes = new Set(Object.keys(contract.synthjs.attributes));
  for (const intent of contract.intents) {
    for (const cls of [intent.class, ...(intent.with ?? [])]) assert.ok(PUBLIC.has(cls), `intent .${cls}`);
    if (intent.attribute) assert.ok(attributes.has(intent.attribute), intent.attribute);
  }
  for (const name of Object.keys(contract.primitives)) assert.ok(contract.intents.some((i) => i.class === name), `an intent for .${name}`);
  for (const name of Object.keys(contract.components)) assert.ok(contract.intents.some((i) => i.class === name || i.with?.includes(name)), `an intent for .${name}`);
});
