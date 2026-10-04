import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONTRACT_ENV, loadContract, resolveContractPath } from "../src/index.js";
import { REPO_CONTRACT, connect, readContract } from "./helpers.js";

// A modified copy of the repository contract, written to a temporary file.
function fixture(edit) {
  const contract = readContract();
  edit(contract);
  const dir = mkdtempSync(join(tmpdir(), "synthmcp-"));
  const path = join(dir, "synthcss.ai.json");
  writeFileSync(path, JSON.stringify(contract));
  return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

function drifted(contract) {
  contract.synthcssVersion = "9.9.9";
  contract.contractVersion = "9.0.0";
  contract.components.badge.intent = "tiny status chip";
  contract.components.badge.variants["badge-neutral"] = "no status meaning";
  contract.primitives.stack.responsive = "always a column";
  contract.intents.unshift({ class: "badge", reason: "Drifted intent.", keywords: ["flibbertigibbet"] });
  contract.examples.patterns["pricing-table"] = { html: '<div class="grid">…</div>', note: "Plans side by side." };
  delete contract.examples.patterns["empty-state"];
  contract.synthjs.attributes["data-synth-collapse"] = { behavior: "data-synth-toggle", value: "id", purpose: "drift" };
}

test("by default the server reads the repository's synthcss.ai.json through the synthcss package", () => {
  const path = resolveContractPath({ env: {} });
  assert.equal(path, new URL(REPO_CONTRACT).pathname);
  assert.equal(loadContract({ env: {} }).contractVersion, readContract().contractVersion);
});

test("drift: a modified contract loaded through the override changes every tool's output", async () => {
  const { path, cleanup } = fixture(drifted);
  const { client, call, close } = await connect({ contractPath: path });
  try {
    assert.equal(client.getServerVersion().version, "9.9.9");
    const list = await call("list_components");
    assert.equal(list.synthVersion, "9.9.9");
    assert.equal(list.contractVersion, "9.0.0");
    assert.equal(list.components.find((c) => c.name === "badge").intent, "tiny status chip");
    const badge = await call("get_component", { name: "badge" });
    assert.ok(badge.variants.some((v) => v.class === "badge-neutral"));
    assert.equal((await call("get_layout", { name: "stack" })).responsive, "always a column");
    assert.equal((await call("resolve_intent", { intent: "flibbertigibbet" })).class, ".badge");
    assert.equal((await call("get_example", { pattern: "pricing-table" })).note, "Plans side by side.");
    assert.equal((await call("get_example", { pattern: "empty-state" })).error, "not-found");
    const markup = await call("validate_markup", {
      html: '<span class="badge badge-neutral">x</span><button type="button" class="button" data-synth-collapse="x">x</button><div id="x"></div>',
    });
    assert.deepEqual(markup.issues, []);
  } finally {
    await close();
    cleanup();
  }
  // The same markup is invalid against the repository contract.
  const repo = await connect();
  try {
    const markup = await repo.call("validate_markup", { html: '<span class="badge badge-neutral">x</span>' });
    assert.equal(markup.valid, false);
  } finally {
    await repo.close();
  }
});

test(`the ${CONTRACT_ENV} environment variable overrides the contract path`, () => {
  const { path, cleanup } = fixture(drifted);
  try {
    assert.equal(resolveContractPath({ env: { [CONTRACT_ENV]: path } }), path);
    assert.equal(loadContract({ env: { [CONTRACT_ENV]: path } }).synthVersion, "9.9.9");
    assert.equal(resolveContractPath({ contractPath: "/x.json", env: { [CONTRACT_ENV]: path } }), "/x.json", "the option wins");
  } finally {
    cleanup();
  }
});

test("a missing or broken contract fails at startup with a clear message", () => {
  assert.throws(() => loadContract({ contractPath: "/nonexistent/synthcss.ai.json" }), /cannot read the SynthCSS contract at \/nonexistent/);
  const dir = mkdtempSync(join(tmpdir(), "synthmcp-"));
  try {
    const broken = join(dir, "broken.json");
    writeFileSync(broken, "{ nope");
    assert.throws(() => loadContract({ contractPath: broken }), /cannot read the SynthCSS contract/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
