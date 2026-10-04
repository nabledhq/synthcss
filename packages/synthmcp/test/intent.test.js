import { test } from "node:test";
import assert from "node:assert/strict";
import { connect, readContract } from "./helpers.js";
import { MIN_SCORE, normalize, stem } from "../src/intent.js";

const contract = readContract();

test("normalizes and stems deterministically", () => {
  assert.deepEqual(normalize("A row of items/buttons that WRAPS"), ["row", "item", "button", "wrap"]);
  assert.equal(stem("wrapping"), "wrap");
  assert.equal(stem("wrapped"), "wrap");
  assert.equal(stem("entries"), "entry");
  assert.equal(stem("boxes"), "box");
  assert.equal(stem("class"), "class");
});

test("resolves a wrapping row of items to .cluster", async () => {
  const { call, close } = await connect();
  try {
    const res = await call("resolve_intent", { intent: "a row of items/buttons that wraps" });
    assert.equal(res.class, ".cluster");
    assert.equal(res.classes, "cluster");
    assert.equal(res.reason, contract.intents.find((i) => i.class === "cluster").reason);
    assert.ok(res.score >= MIN_SCORE);
    for (const alt of res.alternatives ?? []) assert.ok(alt.score <= res.score);
  } finally {
    await close();
  }
});

// The specification asked for .split here. The contract maps this need to .sidebar
// ("Side navigation next to content" in intentMap; .split is "two groups pushed to
// opposite ends of a row"), and every answer must come from the contract.
test("resolves a sidebar next to main content to .sidebar, the contract's primitive for it", async () => {
  const { call, close } = await connect();
  try {
    const res = await call("resolve_intent", { intent: "sidebar next to main content" });
    assert.equal(res.class, ".sidebar");
    assert.equal(contract.intentMap.find((e) => e.intent === "Side navigation next to content").use, ".sidebar");
  } finally {
    await close();
  }
});

test("returns no-match below the threshold for nonsense", async () => {
  const { call, close } = await connect();
  try {
    for (const intent of ["qwzx blorptastic frumious", "the of and a", "1234 5678", "!!!"]) {
      const res = await call("resolve_intent", { intent });
      assert.equal(res.error, "no-match", intent);
      assert.equal(res.intent, intent);
      assert.equal(res.isError, true);
    }
  } finally {
    await close();
  }
});

test("maps common needs to the contract's classes, with companion classes and SynthJS attributes", async () => {
  const { call, close } = await connect();
  try {
    const cases = [
      ["page wrapper with max width", ".container", "container"],
      ["stack the form fields vertically", ".stack", "stack"],
      ["responsive cards, as many columns as fit", ".grid", "grid"],
      ["header with the title on the left and actions on the right", ".split", "split"],
      ["delete button", ".button-danger", "button button-danger"],
      ["main call to action", ".button-primary", "button button-primary"],
      ["show an error message under the email input", ".field", "field"],
      ["on/off toggle switch for a setting", ".switch", "switch"],
      ["status pill", ".badge", "badge"],
      ["nothing to show yet, no results", ".empty-state", "empty-state"],
      ["full screen sign in page", ".cover", "cover"],
      ["data table with rows and columns", ".table", "table"],
    ];
    for (const [intent, cls, classes] of cases) {
      const res = await call("resolve_intent", { intent });
      assert.equal(res.class, cls, intent);
      assert.equal(res.classes, classes, intent);
    }
    const modal = await call("resolve_intent", { intent: "open a confirmation modal" });
    assert.equal(modal.class, ".button");
    assert.equal(modal.attribute, "data-synth-open");
    const tabs = await call("resolve_intent", { intent: "switch between panels" });
    assert.equal(tabs.attribute, "data-synth-tabs");
  } finally {
    await close();
  }
});

test("is deterministic", async () => {
  const { call, close } = await connect();
  try {
    const a = await call("resolve_intent", { intent: "row of tags" });
    const b = await call("resolve_intent", { intent: "row of tags" });
    assert.deepEqual(a, b);
  } finally {
    await close();
  }
});
