// Loads synthcss.ai.json, the single source of truth, and indexes it for the tools.
// Nothing here knows a SynthCSS class name: every class, part, variant, rule,
// attribute, intent and example comes from the contract file.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildIntentIndex } from "./intent.js";

// Test-only override of the contract path (also settable with the contractPath option).
export const CONTRACT_ENV = "SYNTHMCP_CONTRACT";

// The contract of the linked synthcss package (the repository root in the workspace).
// A published synthmcp package has no synthcss dependency and carries a copy of the
// contract next to src/ instead, added by the release workflow.
export function resolveContractPath({ contractPath, env = process.env } = {}) {
  if (contractPath) return contractPath;
  if (env[CONTRACT_ENV]) return env[CONTRACT_ENV];
  try {
    return createRequire(import.meta.url).resolve("synthcss/synthcss.ai.json");
  } catch {
    return fileURLToPath(new URL("../synthcss.ai.json", import.meta.url));
  }
}

export function loadContract(options = {}) {
  const path = resolveContractPath(options);
  let contract;
  try {
    contract = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`synthmcp: cannot read the SynthCSS contract at ${path}: ${err.message}`);
  }
  return buildModel(contract);
}

const entries = (o) => Object.entries(o ?? {});

// Indexes a parsed contract. Classes map to { kind, owner, purpose, placement? }:
//   component / primitive    the base class (owner is itself)
//   variant                  component variant; needs its base on the same element
//   gap-variant              layout variant; works on its own or next to its base
//   modifier                 layout modifier; needs its primitive (or a gap variant)
//   part                     lives in a fixed place relative to its base (placement)
export function buildModel(contract) {
  const classes = new Map();
  const add = (cls, info) => {
    if (!classes.has(cls)) classes.set(cls, info);
  };
  const layouts = contract.layouts ?? {};
  const components = contract.components ?? {};
  const primitives = contract.primitives ?? {};

  for (const [name, comp] of entries(components)) {
    add(name, { kind: "component", owner: name, purpose: comp.intent });
    for (const [part, purpose] of entries(comp.parts)) {
      add(part, { kind: "part", owner: name, purpose, placement: comp.placement?.[part] ?? "inside" });
    }
    for (const [variant, purpose] of entries(comp.variants)) add(variant, { kind: "variant", owner: name, purpose });
  }
  for (const [name, prim] of entries(primitives)) {
    add(name, { kind: "primitive", owner: name, purpose: layouts[name] });
    for (const v of prim.variants ?? []) add(v, { kind: "gap-variant", owner: name, purpose: layouts[v] });
    for (const m of prim.modifiers ?? []) add(m, { kind: "modifier", owner: name, purpose: layouts[m] });
    for (const p of prim.parts ?? []) add(p, { kind: "part", owner: name, purpose: layouts[p], placement: prim.placement?.[p] ?? "inside" });
  }

  const internalClasses = new Set(contract.internal?.classes ?? []);
  const a11y = new Map();
  for (const [name, comp] of entries(components)) {
    for (const rule of comp.accessibility ?? []) {
      if (!a11y.has(rule.class)) a11y.set(rule.class, []);
      a11y.get(rule.class).push({ component: name, ...rule });
    }
  }
  // Base names, longest first, so "input-group-x" belongs to input-group, not input.
  const families = [...Object.keys(components), ...Object.keys(primitives)].sort((a, b) => b.length - a.length);

  return {
    contract,
    synthVersion: contract.synthcssVersion,
    contractVersion: contract.contractVersion,
    layouts,
    components,
    primitives,
    classes,
    families,
    publicClasses: [...classes.keys()].filter((c) => !internalClasses.has(c)),
    internalClasses,
    internalAttributes: new Set(contract.internal?.attributes ?? []),
    synthAttributes: contract.synthjs?.attributes ?? {},
    a11y,
    intents: buildIntentIndex(contract.intents ?? []),
    patterns: contract.examples?.patterns ?? {},
  };
}

// The classes of one family: a base and everything owned by it.
export function familyClasses(model, owner, kinds) {
  return [...model.classes].filter(([cls, info]) => info.owner === owner && kinds.includes(info.kind) && !model.internalClasses.has(cls)).map(([cls]) => cls);
}
