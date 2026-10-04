// The seven SynthMCP tools. Each handler takes the contract model and the tool
// arguments and returns a plain object; a structured { error, … } object stands for
// a failed call. Handlers never throw for bad input.

import { resolveIntent } from "./intent.js";
import { closest, MAX_HTML_LENGTH, validateMarkup } from "./validate.js";

const noArgs = { type: "object", properties: {}, additionalProperties: false };
const oneString = (key, description) => ({
  type: "object",
  properties: { [key]: { type: "string", description } },
  required: [key],
  additionalProperties: false,
});

const purposes = (map) => Object.entries(map ?? {}).map(([cls, purpose]) => ({ class: cls, purpose }));
// Accepts "button", ".button" or " Button ".
const cleanName = (name) => name.trim().replace(/^\./, "").toLowerCase();

function stringArg(args, key) {
  const value = args?.[key];
  if (typeof value !== "string" || !value.trim()) {
    return { error: "invalid-arguments", message: `"${key}" must be a non-empty string.` };
  }
  return null;
}

function notFound(model, key, value, available) {
  const name = cleanName(value);
  const owner = model.classes.get(name)?.owner;
  const suggestion = available.includes(owner) ? owner : closest(name, available);
  return { error: "not-found", [key]: value, available, ...(suggestion ? { suggestion } : {}) };
}

function listComponents(model) {
  return {
    components: Object.entries(model.components).map(([name, comp]) => ({ name, class: `.${name}`, intent: comp.intent })),
  };
}

function getComponent(model, args) {
  const bad = stringArg(args, "name");
  if (bad) return bad;
  const name = cleanName(args.name);
  const comp = Object.hasOwn(model.components, name) ? model.components[name] : null;
  if (!comp) return notFound(model, "name", args.name, Object.keys(model.components));
  const attributes = Object.entries(model.synthAttributes);
  return {
    name,
    class: `.${name}`,
    intent: comp.intent,
    variants: purposes(comp.variants),
    parts: purposes(comp.parts).map((p) => ({ ...p, placement: comp.placement?.[p.class] ?? "inside" })),
    accessibility: comp.accessibility ?? [],
    ...(comp.behaviors
      ? {
          behaviors: comp.behaviors.map((b) => ({
            ...b,
            attributes: attributes.filter(([, meta]) => meta.behavior === b.attribute).map(([attr, meta]) => ({ name: attr, ...meta })),
          })),
        }
      : {}),
    example: comp.example,
  };
}

function listLayouts(model) {
  return {
    layouts: Object.keys(model.primitives).map((name) => ({ name, class: `.${name}`, intent: model.layouts[name] })),
  };
}

function getLayout(model, args) {
  const bad = stringArg(args, "name");
  if (bad) return bad;
  const name = cleanName(args.name);
  const prim = Object.hasOwn(model.primitives, name) ? model.primitives[name] : null;
  if (!prim) return notFound(model, "name", args.name, Object.keys(model.primitives));
  const described = (list) => (list ?? []).map((cls) => ({ class: cls, purpose: model.layouts[cls] }));
  return {
    name,
    class: `.${name}`,
    intent: model.layouts[name],
    variants: described(prim.variants),
    modifiers: described(prim.modifiers),
    parts: described(prim.parts).map((p) => ({ ...p, placement: prim.placement?.[p.class] ?? "inside" })),
    responsive: prim.responsive,
    composition: prim.composition,
    example: prim.example,
  };
}

function resolve(model, args) {
  return stringArg(args, "intent") ?? resolveIntent(model.intents, args.intent);
}

function validate(model, args) {
  if (typeof args?.html !== "string") return { error: "invalid-arguments", message: '"html" must be a string.' };
  if (args.html.length > MAX_HTML_LENGTH) {
    return { error: "too-large", message: `"html" is ${args.html.length} characters; the limit is ${MAX_HTML_LENGTH}.` };
  }
  return validateMarkup(model, args.html);
}

function getExample(model, args) {
  const bad = stringArg(args, "pattern");
  if (bad) return bad;
  const pattern = cleanName(args.pattern);
  const example = Object.hasOwn(model.patterns, pattern) ? model.patterns[pattern] : null;
  if (!example) return notFound(model, "pattern", args.pattern, Object.keys(model.patterns));
  return { pattern, html: example.html, note: example.note };
}

export const TOOLS = [
  {
    name: "list_components",
    description: "List every public SynthCSS component: name, class and a one-line intent.",
    inputSchema: () => noArgs,
    run: listComponents,
  },
  {
    name: "get_component",
    description:
      "One SynthCSS component: intent, class, variants, parts (with placement), accessibility expectations, SynthJS behaviors and data-synth-* attributes when it has any, and a minimal example.",
    inputSchema: (model) => oneString("name", `Component name from list_components: ${Object.keys(model.components).join(", ")}.`),
    run: getComponent,
  },
  {
    name: "list_layouts",
    description: "List the SynthCSS layout primitives: name, class and a one-line intent.",
    inputSchema: () => noArgs,
    run: listLayouts,
  },
  {
    name: "get_layout",
    description: "One SynthCSS layout primitive: intent, class, gap variants, modifiers, parts, responsive behavior, recommended composition and an example.",
    inputSchema: (model) => oneString("name", `Layout primitive from list_layouts: ${Object.keys(model.primitives).join(", ")}.`),
    run: getLayout,
  },
  {
    name: "resolve_intent",
    description:
      'Map a plain-language UI need to the SynthCSS class to use, by deterministic keyword scoring against the contract. Returns { class, classes, reason, alternatives? } or { error: "no-match" }.',
    inputSchema: () => oneString("intent", 'What the markup should do, e.g. "a row of buttons that wraps".'),
    run: resolve,
  },
  {
    name: "validate_markup",
    description:
      "Check HTML against the SynthCSS contract: unknown or internal classes, unsupported variants, misplaced parts, unknown data-synth-* attributes, unresolved targets and accessibility expectations. Classes outside the SynthCSS namespace are ignored. valid is false when any issue is an error.",
    inputSchema: () => oneString("html", `An HTML fragment or a full document, at most ${MAX_HTML_LENGTH} characters.`),
    run: validate,
  },
  {
    name: "get_example",
    description: "The official SynthCSS example (HTML and a note) for a UI pattern.",
    inputSchema: (model) => oneString("pattern", `Pattern name: ${Object.keys(model.patterns).join(", ")}.`),
    run: getExample,
  },
];

// Runs a tool and wraps its answer with the versions. Never throws.
export function callTool(model, name, args) {
  const tool = TOOLS.find((t) => t.name === name);
  let payload;
  if (!tool) payload = { error: "unknown-tool", name, available: TOOLS.map((t) => t.name) };
  else {
    try {
      payload = tool.run(model, args ?? {});
    } catch (err) {
      payload = { error: "internal-error", message: err.message };
    }
  }
  return { synthVersion: model.synthVersion, contractVersion: model.contractVersion, ...payload };
}
