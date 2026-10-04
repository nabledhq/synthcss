// validate_markup: parses HTML with parse5 and checks it against the contract.
// Only classes in the SynthCSS namespace are checked (contract classes, names that
// start with a contract base class plus "-", and synth-*); any other class is the
// author's own and is ignored.

import { parse, parseFragment } from "parse5";
import { familyClasses } from "./contract.js";

export const MAX_HTML_LENGTH = 200000;
const DOCUMENT = /^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype\b|html[\s>])/i;
const SYNTH_ATTRIBUTE = /^data-synth(?:-|$)/;

export function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

// The closest candidate by edit distance (first in contract order on a tie), if any
// is close enough to be a plausible typo or near-miss.
export function closest(name, candidates) {
  let best = null;
  let bestDistance = Infinity;
  for (const c of candidates) {
    const d = editDistance(name, c);
    if (d < bestDistance) [best, bestDistance] = [c, d];
  }
  return best !== null && bestDistance <= Math.max(3, Math.ceil(name.length / 2)) ? best : undefined;
}

// Elements in document order, each { node, tag, attrs, classes, parent }.
function elementsOf(root) {
  const out = [];
  const visit = (node, parent) => {
    let el = parent;
    if (node.tagName) {
      const attrs = new Map(node.attrs.map((a) => [a.name, a.value]));
      el = { node, tag: node.tagName, attrs, classes: (attrs.get("class") ?? "").split(/\s+/).filter(Boolean), parent, children: [] };
      if (parent) parent.children.push(el);
      out.push(el);
    }
    for (const child of node.childNodes ?? []) visit(child, el);
    if (node.content) for (const child of node.content.childNodes ?? []) visit(child, el);
  };
  visit(root, null);
  return out;
}

const ancestors = function* (el) {
  for (let p = el.parent; p; p = p.parent) yield p;
};
const descendants = function* (el) {
  for (const child of el.children) {
    yield child;
    yield* descendants(child);
  }
};

// Contract selectors: a tag name, [attr] or [attr="value"].
function matches(el, selector) {
  const attr = /^\[([a-z][a-z0-9-]*)(?:="([^"]*)")?\]$/.exec(selector);
  if (attr) return el.attrs.has(attr[1]) && (attr[2] === undefined || el.attrs.get(attr[1]) === attr[2]);
  return el.tag === selector;
}
const anyMatch = (els, selectors) => [...els].some((el) => selectors.some((s) => matches(el, s)));

const PLACEMENT_TEXT = { inside: "inside", child: "a direct child of", wraps: "around" };

export function validateMarkup(model, html) {
  const root = DOCUMENT.test(html) ? parse(html) : parseFragment(html);
  const elements = elementsOf(root);
  const ids = new Map();
  for (const el of elements) if (el.attrs.has("id") && !ids.has(el.attrs.get("id"))) ids.set(el.attrs.get("id"), el);

  const issues = [];
  const seen = new Set();
  const report = (type, severity, value, message, suggestion) => {
    const key = `${type}|${value}|${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({ type, severity, value, message, ...(suggestion ? { suggestion } : {}) });
  };
  const has = (el, cls) => el.classes.includes(cls);
  const familyOf = (cls) => model.families.find((f) => cls.startsWith(`${f}-`));
  // The element carries the family's base class (or, for a layout, a gap variant).
  const BASE_KINDS = ["component", "primitive", "gap-variant"];
  const hasBase = (el, owner) => el.classes.some((c) => model.classes.get(c)?.owner === owner && BASE_KINDS.includes(model.classes.get(c).kind));

  for (const el of elements) {
    for (const cls of new Set(el.classes)) {
      if (model.internalClasses.has(cls)) {
        report("internal-class", "error", cls, `.${cls} is internal to SynthCSS; never write it in markup.`, closest(cls, model.publicClasses));
        continue;
      }
      const info = model.classes.get(cls);
      if (info) {
        checkKnownClass(el, cls, info);
        checkA11y(el, cls);
        continue;
      }
      const family = familyOf(cls);
      if (!family && !cls.startsWith("synth-")) continue;
      if (family && hasBase(el, family)) {
        const pool = familyClasses(model, family, ["variant", "gap-variant", "modifier"]);
        report(
          "unsupported-variant",
          "error",
          cls,
          `.${family} has no variant .${cls}.${pool.length ? ` Its variants: ${pool.map((c) => `.${c}`).join(", ")}.` : ""}`,
          closest(cls, pool.length ? pool : model.publicClasses),
        );
      } else if (family && [...ancestors(el)].some((a) => has(a, family)) && familyClasses(model, family, ["part"]).length) {
        const pool = familyClasses(model, family, ["part"]);
        report("invalid-part", "error", cls, `.${family} has no part .${cls}. Its parts: ${pool.map((c) => `.${c}`).join(", ")}.`, closest(cls, pool));
      } else {
        report("unknown-class", "error", cls, `.${cls} is not a SynthCSS class; use only classes from the contract.`, closest(cls.replace(/^synth-/, ""), model.publicClasses));
      }
    }
    for (const [name, value] of el.attrs) if (SYNTH_ATTRIBUTE.test(name)) checkSynthAttribute(el, name, value);
  }

  function checkKnownClass(el, cls, info) {
    const { kind, owner } = info;
    if (kind === "variant" && !has(el, owner)) {
      report("unsupported-variant", "error", cls, `.${cls} is a variant of .${owner} and needs class "${owner}" on the same element.`, `${owner} ${cls}`);
    } else if (kind === "modifier" && !hasBase(el, owner)) {
      const bases = familyClasses(model, owner, ["primitive", "gap-variant"]);
      report("unsupported-variant", "error", cls, `.${cls} modifies .${owner}; put it next to ${bases.map((c) => `.${c}`).join(" or ")} on the same element.`, `${owner} ${cls}`);
    } else if (kind === "part") {
      const ok =
        info.placement === "child"
          ? Boolean(el.parent && has(el.parent, owner))
          : info.placement === "wraps"
            ? [...descendants(el)].some((d) => has(d, owner))
            : [...ancestors(el)].some((a) => has(a, owner));
      if (!ok) {
        report("invalid-part", "error", cls, `.${cls} is a part of .${owner}; it must be ${PLACEMENT_TEXT[info.placement]} an element with class "${owner}".`);
      }
    }
  }

  function checkA11y(el, cls) {
    for (const rule of model.a11y.get(cls) ?? []) {
      if (rule.elements && !rule.elements.includes(el.tag)) {
        report("a11y", rule.severity, cls, `${rule.expectation} Found <${el.tag}>.`);
      }
      if (rule.attributes) {
        const present = rule.attributes.filter((a) => el.attrs.has(a));
        if (!present.length) report("a11y", rule.severity, cls, `${rule.expectation} Missing ${rule.attributes.join(" or ")}.`);
        else if (rule.values && !present.some((a) => rule.values.includes(el.attrs.get(a).trim()))) {
          report("a11y", rule.severity, cls, `${rule.expectation} Found ${present.map((a) => `${a}="${el.attrs.get(a)}"`).join(" ")}.`);
        }
      }
    }
  }

  function checkSynthAttribute(el, name, value) {
    if (model.internalAttributes.has(name)) {
      report("unknown-data-attribute", "error", name, `${name} is an internal marker SynthJS sets itself; never write it in markup.`);
      return;
    }
    const meta = model.synthAttributes[name];
    if (!meta) {
      const known = Object.keys(model.synthAttributes);
      report("unknown-data-attribute", "error", name, `${name} is not a SynthJS attribute. Known: ${known.join(", ")}.`, closest(name, known));
      return;
    }
    if (meta.value === "id") {
      const id = value.trim();
      const target = id && ids.get(id);
      if (!id) report("invalid-target", "error", name, `${name} needs the id of its target element (${meta.purpose}).`);
      else if (!target) report("invalid-target", "error", `${name}="${id}"`, `${name} points at id "${id}", but no element in the markup has that id.`);
      else if (meta.targetElements && !meta.targetElements.includes(target.tag)) {
        report("invalid-target", "error", `${name}="${id}"`, `${name} must point at ${meta.targetElements.map((t) => `<${t}>`).join(" or ")}, found <${target.tag} id="${id}">.`);
      }
    }
    if (meta.closest && !anyMatch([el, ...ancestors(el)], meta.closest)) {
      report("invalid-target", "error", name, `${name} must be on or inside ${meta.closest.join(" or ")}; nothing in the markup encloses it.`);
    }
    for (const group of meta.contains ?? []) {
      if (!anyMatch(descendants(el), group)) report("invalid-target", "error", name, `${name} must contain ${group.join(" or ")}.`);
    }
  }

  return { valid: !issues.some((i) => i.severity === "error"), issues };
}
