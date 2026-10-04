import { test } from "node:test";
import assert from "node:assert/strict";
import { connect, readContract } from "./helpers.js";

const contract = readContract();
const versions = { synthVersion: contract.synthcssVersion, contractVersion: contract.contractVersion };
const TOOL_NAMES = ["list_components", "get_component", "list_layouts", "get_layout", "resolve_intent", "validate_markup", "get_example"];

test("lists exactly the 7 read-only tools over the SDK client", async () => {
  const { client, close } = await connect();
  try {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 7);
    assert.deepEqual(tools.map((t) => t.name), TOOL_NAMES);
    for (const tool of tools) {
      assert.equal(tool.inputSchema.type, "object");
      assert.ok(tool.description.length > 20, tool.name);
      assert.equal(tool.annotations.readOnlyHint, true);
      assert.equal(tool.annotations.openWorldHint, false);
    }
    const schema = tools.find((t) => t.name === "get_example").inputSchema;
    assert.deepEqual(schema.required, ["pattern"]);
    assert.match(schema.properties.pattern.description, /dashboard-header/);
  } finally {
    await close();
  }
});

test("server metadata reports the SynthCSS and contract versions", async () => {
  const { client, close } = await connect();
  try {
    const info = client.getServerVersion();
    assert.equal(info.name, "synthmcp");
    assert.equal(info.version, contract.synthcssVersion);
    assert.ok(info.title.includes(`SynthCSS ${contract.synthcssVersion}`), info.title);
    assert.ok(info.title.includes(`contract ${contract.contractVersion}`), info.title);
    const instructions = client.getInstructions();
    assert.ok(instructions.includes(contract.synthcssVersion) && instructions.includes(contract.contractVersion));
  } finally {
    await close();
  }
});

test("every tool response, success or error, includes synthVersion and contractVersion", async () => {
  const { call, close } = await connect();
  try {
    const calls = [
      ["list_components", {}],
      ["get_component", { name: "card" }],
      ["get_component", { name: "nope" }],
      ["list_layouts", {}],
      ["get_layout", { name: "grid" }],
      ["get_layout", { name: "nope" }],
      ["resolve_intent", { intent: "a row of buttons that wraps" }],
      ["resolve_intent", { intent: "zzzz qqqq" }],
      ["validate_markup", { html: '<div class="stack"></div>' }],
      ["get_example", { pattern: "tabs" }],
      ["get_example", { pattern: "nope" }],
      ["no_such_tool", {}],
    ];
    for (const [name, args] of calls) {
      const res = await call(name, args);
      assert.equal(res.synthVersion, versions.synthVersion, name);
      assert.equal(res.contractVersion, versions.contractVersion, name);
    }
  } finally {
    await close();
  }
});

test("unknown names, patterns, tools and bad arguments return structured errors and never throw", async () => {
  const { call, close } = await connect();
  try {
    const component = await call("get_component", { name: "carousel" });
    assert.equal(component.isError, true);
    assert.equal(component.error, "not-found");
    assert.equal(component.name, "carousel");
    assert.deepEqual(component.available, Object.keys(contract.components));

    const typo = await call("get_component", { name: "buton" });
    assert.equal(typo.suggestion, "button");
    const variant = await call("get_component", { name: "button-primary" });
    assert.equal(variant.error, "not-found");
    assert.equal(variant.suggestion, "button", "a variant points at its component");

    const layout = await call("get_layout", { name: "masonry" });
    assert.equal(layout.error, "not-found");
    assert.deepEqual(layout.available, Object.keys(contract.primitives));
    assert.equal((await call("get_layout", { name: "button" })).error, "not-found", "components are not layouts");

    const example = await call("get_example", { pattern: "pricing-table" });
    assert.equal(example.error, "not-found");
    assert.equal(example.pattern, "pricing-table");
    assert.deepEqual(example.available, Object.keys(contract.examples.patterns));

    const tool = await call("suggest_structure", {});
    assert.equal(tool.error, "unknown-tool");
    assert.equal(tool.available.length, 7);

    for (const [name, args] of [
      ["get_component", {}],
      ["get_component", { name: 42 }],
      ["get_layout", { name: "  " }],
      ["resolve_intent", {}],
      ["validate_markup", { html: null }],
      ["get_example", { pattern: ["tabs"] }],
    ]) {
      const res = await call(name, args);
      assert.equal(res.error, "invalid-arguments", `${name} ${JSON.stringify(args)}`);
      assert.equal(res.isError, true);
    }
    const huge = await call("validate_markup", { html: "<p>".repeat(100000) });
    assert.equal(huge.error, "too-large");
    for (const name of ["__proto__", "constructor", "toString"]) {
      assert.equal((await call("get_component", { name })).error, "not-found", name);
      assert.equal((await call("get_layout", { name })).error, "not-found", name);
      assert.equal((await call("get_example", { pattern: name })).error, "not-found", name);
    }
  } finally {
    await close();
  }
});

test("successful calls are not flagged as errors", async () => {
  const { call, close } = await connect();
  try {
    assert.equal((await call("get_component", { name: ".Button " })).isError, false);
    assert.equal((await call("validate_markup", { html: '<span class="badge-success">x</span>' })).isError, false, "invalid markup is a successful validation");
  } finally {
    await close();
  }
});
