#!/usr/bin/env node
// Dependency-free verification of the AI contract: synthcss.ai.json (canonical,
// machine-readable) and synthcss.llm.md (prompt-ready) against the framework CSS,
// package.json, each other, the showcase and the Pages workflow.
// It is also the generator of the one generated part of synthcss.llm.md: the
// Behaviors (SynthJS) section, rendered from the components' "behaviors" in
// synthcss.ai.json. --write rewrites that section, then verifies.
// Usage: node scripts/verify-ai-contract.mjs [--write] [--max-tokens=8000]
//   The size threshold can also be set with SYNTHCSS_AI_CONTRACT_MAX_TOKENS.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseTokens } from "./check-tokens.mjs";
import { buildBundle, classesInCss } from "./check-components.mjs";
import { parseBase } from "./check-base.mjs";

export const DEFAULT_MAX_TOKENS = 8000;
// Class selectors in the framework CSS that are internal helpers, not public API,
// and so are not required in the contract. Empty today: every class SynthCSS ships
// is public.
export const INTERNAL_CLASSES = [];
export const JSON_KEYS = [
  "synthcssVersion",
  "contractVersion",
  "tokens",
  "baseStyles",
  "layouts",
  "components",
  "intentMap",
  "compositionRules",
  "generationRules",
  "extension",
  "examples",
];
export const MD_SECTIONS = [
  "Design Tokens",
  "Layout Vocabulary",
  "Component Vocabulary",
  "Intent Mapping",
  "Behaviors (SynthJS)",
  "Composition Rules",
  "AI Generation Rules",
  "When the vocabulary is missing a pattern",
  "Not covered yet",
  "Valid Examples",
  "Invalid / Discouraged Examples",
];
const INVALID_SECTION = "Invalid / Discouraged Examples";
const EXTENSION_SECTION = "When the vocabulary is missing a pattern";
const NOT_COVERED_SECTION = "Not covered yet";
// The one fallback when the vocabulary lacks a pattern: a data-ui hook styled in
// this cascade layer.
export const EXTENSION_ATTRIBUTE = "data-ui";
export const EXTENSION_LAYER = "synth.ext";
export const GENERATION_RULES = 10;
// Parts whose state comes from one ARIA attribute. The contract must name that
// attribute in the part's entry (JSON and Markdown), and the Markdown must rule
// out aria-pressed, so models do not pick a different attribute per run.
export const STATE_ATTRIBUTES = { "nav-link": 'aria-current="page"', "tabs-item": 'aria-selected="true"' };
export const VALID_EXAMPLES = [2, 5];
// The showcase may round the size it prints; it must stay within this fraction.
export const SHOWCASE_SIZE_TOLERANCE = 0.1;
export const LLM_FILE = "synthcss.llm.md";
export const JSON_FILE = "synthcss.ai.json";
// SynthJS behaviors: components.<name>.behaviors entries, each with exactly these
// keys, rendered into this Markdown section. Each attribute is one intent with no
// aliases, and must be implemented by the runtime.
export const BEHAVIOR_SECTION = "Behaviors (SynthJS)";
export const BEHAVIOR_KEYS = ["intent", "attribute", "target", "requiredMarkup", "accessibility"];
export const SYNTH_JS_FILE = "src/js/synth.js";
const BEHAVIOR_ATTRIBUTE = /^data-synth-[a-z]+(-[a-z]+)*$/;

// `.name` not preceded by a word character, dot, slash or dash, so file names
// (synthcss.ai.json), URLs and "e.g." are not read as classes.
const CLASS_MENTION = /(?<![\w./-])\.([a-z][a-z0-9-]*)/g;
// A token family written as `--text-*` is not a token mention.
const TOKEN_MENTION = /(?<![\w-])(--[a-z][a-z0-9-]*)(?![\w*-])/g;
const CLASS_ATTR = /\bclass="([^"]*)"/g;

const sorted = (set) => [...set].sort();
const diff = (a, b) => sorted(new Set([...a].filter((x) => !b.has(x))));
const unescapeHtml = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

export function classAttrs(html) {
  return new Set([...html.matchAll(CLASS_ATTR)].flatMap((m) => m[1].split(/\s+/).filter(Boolean)));
}

// Every class and token named in a piece of text: `.class` mentions, class="…"
// attributes and `--token` mentions.
export function mentions(text) {
  const classes = classAttrs(text);
  for (const m of text.matchAll(CLASS_MENTION)) classes.add(m[1]);
  const tokens = new Set([...text.matchAll(TOKEN_MENTION)].map((m) => m[1]));
  return { classes, tokens };
}

export const estimateTokens = (text) => Math.ceil([...text].length / 4);

// Classes the note of an invalid example names as the correct alternative: the
// ones mentioned after "Use".
function alternativesOf(note) {
  const i = note.search(/\buse\b/i);
  return i === -1 ? null : mentions(note.slice(i)).classes;
}

function checkInvalidExample(where, html, note, cssClasses, cssTokens) {
  const errors = [];
  const alternatives = alternativesOf(note);
  if (!alternatives) {
    errors.push(`${where}: the note must name the correct alternative ("Use …")`);
    return errors;
  }
  for (const cls of sorted(alternatives)) {
    if (!cssClasses.has(cls)) errors.push(`${where}: the suggested alternative .${cls} is not a SynthCSS class`);
  }
  for (const token of sorted(mentions(note).tokens)) {
    if (!cssTokens.has(token)) errors.push(`${where}: the note mentions ${token}, which is not a SynthCSS token`);
  }
  for (const cls of sorted(classAttrs(html))) {
    if (cssClasses.has(cls) && !alternatives.has(cls)) {
      errors.push(`${where}: uses .${cls}, a real SynthCSS class; invalid examples may only use real classes the note names as the alternative`);
    }
  }
  return errors;
}

// Splits Markdown into its preamble and "## " sections (title → body text).
export function parseMarkdown(md) {
  const lines = md.split("\n");
  const sections = new Map();
  let title = null;
  const preamble = [];
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m && !line.startsWith("###")) {
      title = m[1];
      sections.set(title, []);
    } else if (title === null) preamble.push(line);
    else sections.get(title).push(line);
  }
  return { preamble: preamble.join("\n"), sections: new Map([...sections].map(([t, l]) => [t, l.join("\n")])) };
}

function subsection(body, title) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => new RegExp(`^###\\s+${title}\\s*$`, "i").test(l));
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i > start && /^###\s/.test(l));
  if (end === -1) end = lines.length;
  return lines.slice(start + 1, end);
}

const bullets = (lines) => lines.filter((l) => /^- \S/.test(l));

// Every string in the JSON contract except the invalid examples.
function jsonStrings(contract) {
  const out = [];
  const walk = (value, path) => {
    if (path === "examples.invalid") return;
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach((v) => walk(v, path));
    else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        out.push(k);
        walk(v, path ? `${path}.${k}` : k);
      }
    }
  };
  walk(contract, "");
  return out;
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isExample = (e) => isObject(e) && typeof e.html === "string" && typeof e.note === "string";
const isStrings = (a) => Array.isArray(a) && a.length > 0 && a.every((v) => typeof v === "string" && v.trim());
const isBehavior = (b) =>
  isObject(b) &&
  Object.keys(b).join() === BEHAVIOR_KEYS.join() &&
  BEHAVIOR_KEYS.slice(0, 4).every((k) => typeof b[k] === "string" && b[k].trim()) &&
  isStrings(b.accessibility);

function checkJsonShape(c) {
  const errors = [];
  for (const key of JSON_KEYS) if (!(key in c)) errors.push(`${JSON_FILE}: missing top-level key "${key}"`);
  for (const key of Object.keys(c)) if (!JSON_KEYS.includes(key)) errors.push(`${JSON_FILE}: unexpected top-level key "${key}"`);
  if (errors.length) return errors;
  if (typeof c.contractVersion !== "string" || !/^\d+\.\d+\.\d+$/.test(c.contractVersion)) {
    errors.push(`${JSON_FILE}: contractVersion must be a semver string such as "1.0.0"`);
  }
  for (const key of ["tokens", "layouts"]) {
    if (!isObject(c[key]) || !Object.values(c[key]).every((v) => typeof v === "string" && v.trim())) {
      errors.push(`${JSON_FILE}: ${key} must map each name to a short purpose string`);
    }
  }
  const base = c.baseStyles;
  if (
    !isObject(base) ||
    typeof base.note !== "string" ||
    !isObject(base.rules) ||
    !Object.values(base.rules).every((d) => isObject(d) && Object.values(d).every((v) => typeof v === "string"))
  ) {
    errors.push(`${JSON_FILE}: baseStyles must be { note, rules: { selector: { property: value } } }`);
  }
  if (!isObject(c.components)) errors.push(`${JSON_FILE}: components must be an object`);
  else {
    for (const [name, comp] of Object.entries(c.components)) {
      if (!isObject(comp) || typeof comp.intent !== "string" || !isObject(comp.parts) || !isObject(comp.variants)) {
        errors.push(`${JSON_FILE}: components.${name} must be { intent, parts: {class: purpose}, variants: {class: purpose}, behaviors? }`);
      } else if (comp.behaviors !== undefined && !(Array.isArray(comp.behaviors) && comp.behaviors.length && comp.behaviors.every(isBehavior))) {
        errors.push(`${JSON_FILE}: components.${name}.behaviors must be a list of { ${BEHAVIOR_KEYS.join(", ")} } with accessibility a list of strings`);
      }
    }
  }
  if (!Array.isArray(c.intentMap) || !c.intentMap.every((e) => isObject(e) && typeof e.intent === "string" && typeof e.use === "string")) {
    errors.push(`${JSON_FILE}: intentMap must be a list of { intent, use }`);
  }
  const cr = c.compositionRules;
  if (!isObject(cr) || !Array.isArray(cr.recommended) || !Array.isArray(cr.avoid)) {
    errors.push(`${JSON_FILE}: compositionRules must be { recommended: [], avoid: [] }`);
  }
  if (!Array.isArray(c.generationRules) || c.generationRules.length !== GENERATION_RULES) {
    errors.push(`${JSON_FILE}: generationRules must list exactly ${GENERATION_RULES} rules`);
  }
  const ext = c.extension;
  const strings = (a) => Array.isArray(a) && a.every((v) => typeof v === "string" && v.trim());
  const isItem = (n) =>
    isObject(n) && ["pattern", "use", "html"].every((k) => typeof n[k] === "string" && n[k].trim()) && (n.css === undefined || typeof n.css === "string");
  if (
    !isObject(ext) ||
    ![ext.rule, ext.attribute, ext.layer, ext.values].every((v) => typeof v === "string") ||
    !strings(ext.steps) ||
    !strings(ext.properties) ||
    !strings(ext.keywords) ||
    !Array.isArray(ext.notCovered) ||
    !ext.notCovered.every(isItem)
  ) {
    errors.push(`${JSON_FILE}: extension must be { rule, steps: [], attribute, layer, values, properties: [], keywords: [], notCovered: [{ pattern, use, html, css? }] }`);
  } else {
    if (ext.attribute !== EXTENSION_ATTRIBUTE) errors.push(`${JSON_FILE}: extension.attribute must be "${EXTENSION_ATTRIBUTE}"`);
    if (ext.layer !== EXTENSION_LAYER) errors.push(`${JSON_FILE}: extension.layer must be "${EXTENSION_LAYER}"`);
  }
  const ex = c.examples;
  if (!isObject(ex) || !Array.isArray(ex.valid) || !Array.isArray(ex.invalid) || ![...ex.valid, ...ex.invalid].every(isExample)) {
    errors.push(`${JSON_FILE}: examples must be { valid: [{ html, note }], invalid: [{ html, note }] }`);
  } else {
    const [min, max] = VALID_EXAMPLES;
    if (ex.valid.length < min || ex.valid.length > max) errors.push(`${JSON_FILE}: needs ${min}–${max} valid examples, found ${ex.valid.length}`);
    if (ex.invalid.length < 2) errors.push(`${JSON_FILE}: needs at least 2 invalid examples`);
  }
  return errors;
}

// The class names the JSON contract defines: layouts plus components with their
// parts and variants.
export function jsonVocabulary(c) {
  const classes = [...Object.keys(c.layouts)];
  for (const [name, comp] of Object.entries(c.components)) {
    classes.push(name, ...Object.keys(comp.parts), ...Object.keys(comp.variants));
  }
  return classes;
}

// Every SynthJS behavior, in contract order, with the component it belongs to.
export function behaviorsOf(contract) {
  return Object.entries(contract.components).flatMap(([component, comp]) =>
    (comp.behaviors ?? []).map((behavior) => ({ component, ...behavior })),
  );
}

// Backticks markup in free text for the Markdown: <tags>, [selectors],
// attr="value" pairs, data-synth-* attributes and .class mentions.
const CODE_IN_TEXT = /<[^>]+>|\[[^\]]+\]|\b[a-z][a-z-]*="[^"]*"|\bdata-synth-[a-z-]*[a-z]|(?<![\w./-])\.[a-z][a-z0-9-]*/g;
const codify = (text) => text.replace(CODE_IN_TEXT, (code) => `\`${code}\``);

// The body of the Markdown Behaviors (SynthJS) section, generated from the JSON.
export function renderBehaviors(contract) {
  const script = `https://cdn.jsdelivr.net/gh/nabledhq/synthcss@${contract.synthcssVersion}/dist/synth.js`;
  const lines = [
    "",
    `<!-- Generated from the components' "behaviors" in ${JSON_FILE} by \`npm run contract:write\`. Edit the JSON, not this section. -->`,
    "",
    `Optional SynthJS script, loaded after the stylesheet: \`<script src="${script}" defer></script>\`.`,
    "Declare interactivity with exactly one `data-synth-*` attribute per intent, as below: no aliases, no `data-synth-collapse`, no event handlers of your own. Triggers are `<button type=\"button\">`; state lives in `hidden` and ARIA attributes, which SynthJS keeps in sync. Without the script the page still renders; only these behaviors are inactive. After inserting markup later, call `Synth.init(element)`.",
  ];
  for (const b of behaviorsOf(contract)) {
    lines.push(
      "",
      `### \`${b.attribute}\` — ${b.intent}`,
      "",
      `- Component: \`.${b.component}\``,
      `- Target: ${codify(b.target)}`,
      "- Accessibility:",
      ...b.accessibility.map((line) => `  - ${codify(line)}`),
      "",
      "```html",
      b.requiredMarkup.trim(),
      "```",
    );
  }
  return lines.join("\n") + "\n";
}

// Replaces the body of the "## title" section of a Markdown file.
export function replaceSection(md, title, body) {
  const start = md.search(new RegExp(`^## ${title.replace(/[()]/g, "\\$&")}\\s*$`, "m"));
  if (start === -1) throw new Error(`${LLM_FILE} has no "## ${title}" section`);
  const head = md.indexOf("\n", start) + 1;
  const next = md.slice(head).search(/^## /m);
  return md.slice(0, head) + body + (next === -1 ? "" : "\n" + md.slice(head + next));
}

const DATA_UI = /\bdata-ui="([^"]*)"/g;
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/g;
const TOKEN_VALUE = /var\((--[a-z][a-z0-9-]*)\)/g;

// Checks CSS written under the extension rule: one `@layer synth.ext { … }` block
// whose selectors are all [data-ui="<name>"], whose properties are in
// extension.properties and whose values are var(--token)s plus extension.keywords.
// Returns the data-ui names it styles and the problems found.
export function checkExtensionCss(css, extension, cssTokens) {
  const errors = [];
  const names = new Set();
  const layer = extension.layer.replace(/\./g, "\\.");
  const block = new RegExp(`^@layer\\s+${layer}\\s*\\{([\\s\\S]*)\\}$`).exec(css.replace(/\/\*[\s\S]*?\*\//g, "").trim());
  if (!block) return { names, errors: [`must be a single @layer ${extension.layer} { … } block`] };
  const rest = block[1].replace(/([^{}]*)\{([^{}]*)\}/g, (_, selectors, decls) => {
    for (const selector of selectors.split(",").map((s) => s.trim())) {
      const m = new RegExp(`^\\[${extension.attribute}="([a-z][a-z0-9-]*)"\\]$`).exec(selector);
      if (m) names.add(m[1]);
      else errors.push(`selector "${selector}" must be [${extension.attribute}="<name>"] and nothing else`);
    }
    for (const decl of decls.split(";").map((d) => d.trim()).filter(Boolean)) {
      const i = decl.indexOf(":");
      if (i === -1) {
        errors.push(`cannot read the declaration "${decl}"`);
        continue;
      }
      const [prop, value] = [decl.slice(0, i).trim(), decl.slice(i + 1).trim()];
      if (!extension.properties.includes(prop)) errors.push(`property ${prop} is not in extension.properties`);
      const bare = value.replace(TOKEN_VALUE, (_, token) => {
        if (!cssTokens.has(token)) errors.push(`${prop} uses ${token}, which is not a SynthCSS token`);
        return " ";
      });
      for (const word of bare.split(/[\s,]+/).filter(Boolean)) {
        if (!extension.keywords.includes(word)) errors.push(`${prop}: "${word}" is not a var(--token) or an allowed keyword`);
      }
    }
    return "";
  });
  if (rest.trim()) errors.push(`unexpected CSS outside a rule: ${rest.trim()}`);
  return { names, errors };
}

// Inline styles may only override tokens: style="--grid-min: 12rem".
export function inlineStyleErrors(html, cssTokens) {
  const errors = [];
  for (const m of html.matchAll(/\bstyle="([^"]*)"/g)) {
    for (const decl of m[1].split(";").map((d) => d.trim()).filter(Boolean)) {
      const prop = decl.split(":")[0].trim();
      if (!prop.startsWith("--")) errors.push(`inline style "${decl}" is not a token override`);
      else if (!cssTokens.has(prop)) errors.push(`inline style overrides ${prop}, which is not a SynthCSS token`);
    }
  }
  return errors;
}

// Markup in valid examples and not-covered snippets: contract classes only,
// token-only inline styles, and extension CSS (from <style> blocks or a separate
// css string) that obeys the extension rule and styles hooks present in the HTML.
function checkMarkup(where, html, css, { vocab, cssClasses, cssTokens, extension }) {
  const errors = [];
  for (const cls of sorted(classAttrs(html))) {
    if (!cssClasses.has(cls)) errors.push(`${where} uses .${cls}, which is not a SynthCSS class`);
    else if (!vocab.has(cls)) errors.push(`${where} uses .${cls}, which is not in the contract vocabulary`);
  }
  for (const e of inlineStyleErrors(html, cssTokens)) errors.push(`${where}: ${e}`);
  const hooks = new Set([...html.replace(STYLE_BLOCK, "").matchAll(DATA_UI)].map((m) => m[1]));
  const sheets = [...html.matchAll(STYLE_BLOCK)].map((m) => m[1]);
  if (css !== undefined) sheets.push(css);
  const styled = new Set();
  for (const sheet of sheets) {
    const { names, errors: cssErrors } = checkExtensionCss(sheet, extension, cssTokens);
    for (const e of cssErrors) errors.push(`${where}: extension CSS ${e}`);
    names.forEach((n) => styled.add(n));
  }
  for (const n of sorted(styled)) if (!hooks.has(n)) errors.push(`${where}: CSS styles [data-ui="${n}"] but no element has data-ui="${n}"`);
  for (const n of sorted(hooks)) if (!styled.has(n)) errors.push(`${where}: data-ui="${n}" has no rule in @layer ${extension.layer}`);
  return errors;
}

// Items of the Markdown "Not covered yet" list: `- Pattern — use: \`<html>\``, or
// `- Pattern — use` followed by html and css code blocks.
export function parseNotCovered(body) {
  const items = [];
  const errors = [];
  let fence = null;
  for (const line of body.split("\n")) {
    if (fence) {
      if (/^```\s*$/.test(line)) {
        const item = items.at(-1);
        if (!item) errors.push(`${LLM_FILE}: Not covered yet has a code block before its first item`);
        else if (item[fence.lang] !== undefined) errors.push(`${LLM_FILE}: Not covered yet item "${item.pattern}" has two ${fence.lang} snippets`);
        else item[fence.lang] = fence.lines.join("\n").trim();
        fence = null;
      } else fence.lines.push(line);
      continue;
    }
    const open = /^```(html|css)\s*$/.exec(line);
    if (open) fence = { lang: open[1], lines: [] };
    else if (/^- /.test(line)) {
      const m = /^- (.+?) — (.+?)(?::\s*`(<[^`]+>)`)?$/.exec(line);
      if (!m) errors.push(`${LLM_FILE}: Not covered yet items must read "- Pattern — use: \`<html>\`", found: ${line}`);
      else items.push({ pattern: m[1], use: m[2], ...(m[3] ? { html: m[3] } : {}) });
    }
  }
  return { items, errors };
}

const plain = (s) => (s ?? "").replace(/`/g, "").replace(/\s+/g, " ").trim();
const backticked = (line) => [...(line ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1]);

export function verifyContract(files, { maxTokens = DEFAULT_MAX_TOKENS } = {}) {
  const errors = [];
  const warnings = [];
  const md = files.md ?? "";
  const size = { chars: [...md].length, tokens: estimateTokens(md) };
  if (size.tokens > maxTokens) {
    warnings.push(`${LLM_FILE} is ~${size.tokens} tokens, above the ${maxTokens}-token threshold; keep it compact`);
  }

  let contract;
  try {
    contract = JSON.parse(files.json);
  } catch (err) {
    return { errors: [`${JSON_FILE} is not valid JSON: ${err.message}`], warnings, size };
  }
  if (!isObject(contract)) return { errors: [`${JSON_FILE} must contain a JSON object`], warnings, size };
  const shape = checkJsonShape(contract);
  if (shape.length) return { errors: shape, warnings, size };

  const cssClasses = classesInCss(files.builtCss);
  const cssTokens = new Set(parseTokens(files.builtCss).root.keys());
  const publicClasses = new Set([...cssClasses].filter((c) => !INTERNAL_CLASSES.includes(c)));
  const { version } = JSON.parse(files.pkg);

  // Versions.
  if (contract.synthcssVersion !== version) {
    errors.push(`${JSON_FILE}: synthcssVersion is "${contract.synthcssVersion}" but package.json is "${version}"`);
  }

  // JSON vocabulary against the CSS.
  const vocabList = jsonVocabulary(contract);
  const vocab = new Set(vocabList);
  for (const cls of sorted(new Set(vocabList.filter((c, i) => vocabList.indexOf(c) !== i)))) {
    errors.push(`${JSON_FILE}: class .${cls} is listed more than once`);
  }
  const jsonMentions = mentions(jsonStrings(contract).join("\n"));
  for (const cls of sorted(new Set([...vocab, ...jsonMentions.classes]))) {
    if (!cssClasses.has(cls)) errors.push(`${JSON_FILE}: class .${cls} is not a selector in the SynthCSS CSS`);
  }
  for (const cls of diff(publicClasses, vocab)) {
    errors.push(`class .${cls} is in the SynthCSS CSS but missing from ${JSON_FILE} (add it to layouts or components, or to INTERNAL_CLASSES)`);
  }
  const jsonTokens = new Set(Object.keys(contract.tokens));
  for (const token of sorted(new Set([...jsonTokens, ...jsonMentions.tokens]))) {
    if (!cssTokens.has(token)) errors.push(`${JSON_FILE}: token ${token} is not defined on :root`);
  }
  for (const token of diff(cssTokens, jsonTokens)) errors.push(`token ${token} is defined on :root but missing from ${JSON_FILE}`);

  // Base styles against src/base.css.
  const baseRules = parseBase(files.baseCss ?? "").rules;
  const jsonBase = contract.baseStyles.rules;
  for (const [selector, decls] of baseRules) {
    if (JSON.stringify(jsonBase[selector]) !== JSON.stringify(decls)) {
      errors.push(`${JSON_FILE}: baseStyles.rules["${selector}"] must be ${JSON.stringify(decls)} as in src/base.css`);
    }
  }
  for (const selector of Object.keys(jsonBase)) {
    if (!baseRules.has(selector)) errors.push(`${JSON_FILE}: baseStyles.rules["${selector}"] is not a rule in src/base.css`);
  }

  const extension = contract.extension;
  const markupContext = { vocab, cssClasses, cssTokens, extension };
  contract.examples.valid.forEach((e, i) => {
    errors.push(...checkMarkup(`${JSON_FILE}: valid example ${i + 1}`, e.html, undefined, markupContext));
  });
  extension.notCovered.forEach((item, i) => {
    const where = `${JSON_FILE}: extension.notCovered ${i + 1} (${item.pattern})`;
    if (/<style\b/.test(item.html)) errors.push(`${where}: put fallback CSS in "css", not a <style> block`);
    if (item.css !== undefined && !item.use.includes(extension.attribute)) errors.push(`${where}: a fallback's "use" must name ${extension.attribute}`);
    errors.push(...checkMarkup(where, item.html, item.css, markupContext));
  });
  contract.examples.invalid.forEach((e, i) => {
    errors.push(...checkInvalidExample(`${JSON_FILE}: invalid example ${i + 1}`, e.html, e.note, cssClasses, cssTokens));
  });

  // SynthJS behaviors.
  const behaviors = behaviorsOf(contract);
  const seenAttributes = new Set();
  for (const b of behaviors) {
    const where = `${JSON_FILE}: components.${b.component}.behaviors ${b.attribute}`;
    if (!BEHAVIOR_ATTRIBUTE.test(b.attribute)) errors.push(`${where}: attribute must be data-synth-<name>`);
    if (seenAttributes.has(b.attribute)) errors.push(`${where}: attribute is listed more than once (one attribute per intent)`);
    seenAttributes.add(b.attribute);
    if (!new RegExp(`\\s${b.attribute}[\\s=>]`).test(b.requiredMarkup)) errors.push(`${where}: requiredMarkup must use ${b.attribute}`);
    if (!new RegExp(`class="([^"]*\\s)?${b.component}(\\s[^"]*)?"`).test(b.requiredMarkup)) {
      errors.push(`${where}: requiredMarkup must use .${b.component}`);
    }
    if (files.synthJs !== undefined && !files.synthJs.includes(`"${b.attribute}`) && !files.synthJs.includes(`[${b.attribute}`)) {
      errors.push(`${where}: ${SYNTH_JS_FILE} does not implement ${b.attribute}`);
    }
    errors.push(...checkMarkup(`${where}: requiredMarkup`, b.requiredMarkup, undefined, markupContext));
  }

  // Markdown.
  const { preamble, sections } = parseMarkdown(md);
  const header = /SynthCSS v?(\d+\.\d+\.\d+\S*)\s*·\s*contract v?(\d+\.\d+\.\d+)/.exec(preamble);
  if (!header) errors.push(`${LLM_FILE}: the header must state "SynthCSS <version> · contract <version>"`);
  else {
    if (header[1] !== version) errors.push(`${LLM_FILE}: states SynthCSS ${header[1]} but package.json is ${version}`);
    if (header[2] !== contract.contractVersion) {
      errors.push(`${LLM_FILE}: states contract ${header[2]} but ${JSON_FILE} has ${contract.contractVersion}`);
    }
  }
  for (const title of MD_SECTIONS) if (!sections.has(title)) errors.push(`${LLM_FILE}: missing section "## ${title}"`);
  for (const m of md.matchAll(/synthcss@(\d+\.\d+\.\d+\S*?)\//g)) {
    if (m[1] !== version) errors.push(`${LLM_FILE}: links to synthcss@${m[1]} but package.json is ${version}`);
  }

  const section = (title) => sections.get(title) ?? "";
  const mdVocab = mentions(section("Layout Vocabulary") + "\n" + section("Component Vocabulary")).classes;
  const mdTokens = mentions(section("Design Tokens")).tokens;
  const mdAll = mentions([preamble, ...[...sections].filter(([t]) => t !== INVALID_SECTION).map(([, b]) => b)].join("\n"));
  for (const cls of sorted(mdAll.classes)) {
    if (!cssClasses.has(cls)) errors.push(`${LLM_FILE}: class .${cls} is not a selector in the SynthCSS CSS`);
  }
  for (const token of sorted(mdAll.tokens)) {
    if (!cssTokens.has(token)) errors.push(`${LLM_FILE}: token ${token} is not defined on :root`);
  }
  for (const cls of diff(vocab, mdVocab)) errors.push(`class .${cls} is in ${JSON_FILE} but not in the ${LLM_FILE} vocabulary`);
  for (const cls of diff(mdVocab, vocab)) errors.push(`class .${cls} is in the ${LLM_FILE} vocabulary but not in ${JSON_FILE}`);
  // The Markdown may wrap names in backticks.
  if (!section("Design Tokens").replace(/`/g, "").replace(/\s+/g, " ").includes(contract.baseStyles.note.replace(/\s+/g, " "))) {
    errors.push(`${LLM_FILE}: the Design Tokens section must state the ${JSON_FILE} baseStyles note`);
  }
  for (const token of diff(jsonTokens, mdTokens)) errors.push(`token ${token} is in ${JSON_FILE} but not in the ${LLM_FILE} Design Tokens`);
  for (const token of diff(mdTokens, jsonTokens)) errors.push(`token ${token} is in the ${LLM_FILE} Design Tokens but not in ${JSON_FILE}`);

  for (const [part, attr] of Object.entries(STATE_ATTRIBUTES)) {
    const owner = Object.values(contract.components).find((comp) => part in comp.parts);
    if (owner && !owner.parts[part].includes(attr)) errors.push(`${JSON_FILE}: the .${part} entry must name its state attribute ${attr}`);
    const line = section("Component Vocabulary").split("\n").find((l) => l.includes(`\`.${part}\``));
    if (line && !line.includes(attr)) errors.push(`${LLM_FILE}: the .${part} entry must name its state attribute ${attr}`);
  }
  if (!/never\b[^\n]*`aria-pressed`/i.test(section("Component Vocabulary"))) {
    errors.push(`${LLM_FILE}: the Component Vocabulary must say never to use \`aria-pressed\``);
  }

  if (sections.has(BEHAVIOR_SECTION) && sections.get(BEHAVIOR_SECTION).trim() !== renderBehaviors(contract).trim()) {
    errors.push(`${LLM_FILE}: the ${BEHAVIOR_SECTION} section must be generated from ${JSON_FILE}; run npm run contract:write`);
  }

  const rows = section("Intent Mapping").split("\n").filter((l) => /^\s*\|/.test(l)).slice(2);
  if (rows.length !== contract.intentMap.length) {
    errors.push(`${LLM_FILE}: the Intent Mapping table has ${rows.length} rows, ${JSON_FILE} has ${contract.intentMap.length}`);
  }
  for (const [title, key] of [["Recommended", "recommended"], ["Avoid", "avoid"]]) {
    const lines = subsection(section("Composition Rules"), title);
    if (!lines) errors.push(`${LLM_FILE}: Composition Rules has no "### ${title}"`);
    else if (bullets(lines).length !== contract.compositionRules[key].length) {
      errors.push(`${LLM_FILE}: Composition Rules / ${title} has ${bullets(lines).length} items, ${JSON_FILE} has ${contract.compositionRules[key].length}`);
    }
  }
  const rules = section("AI Generation Rules").split("\n").filter((l) => /^\d+\.\s/.test(l));
  if (rules.length !== GENERATION_RULES) {
    errors.push(`${LLM_FILE}: AI Generation Rules must list exactly ${GENERATION_RULES} numbered rules, found ${rules.length}`);
  }

  const extensionMd = section(EXTENSION_SECTION);
  for (const phrase of [`${extension.attribute}="<name>"`, `@layer ${extension.layer}`, "var(--…)"]) {
    if (!extensionMd.includes(phrase)) errors.push(`${LLM_FILE}: ${EXTENSION_SECTION} must state \`${phrase}\``);
  }
  const steps = extensionMd.split("\n").filter((l) => /^\d+\.\s/.test(l));
  if (steps.length !== extension.steps.length) {
    errors.push(`${LLM_FILE}: ${EXTENSION_SECTION} has ${steps.length} numbered steps, ${JSON_FILE} extension.steps has ${extension.steps.length}`);
  }
  for (const [label, key] of [["Allowed properties:", "properties"], ["Allowed keywords:", "keywords"]]) {
    const listed = backticked(extensionMd.split("\n").find((l) => l.startsWith(label)));
    if (listed.join(",") !== extension[key].join(",")) {
      errors.push(`${LLM_FILE}: ${EXTENSION_SECTION} must have a "${label}" line listing extension.${key} in order`);
    }
  }
  const notCovered = parseNotCovered(section(NOT_COVERED_SECTION));
  errors.push(...notCovered.errors);
  if (notCovered.items.length !== extension.notCovered.length) {
    errors.push(`${LLM_FILE}: Not covered yet has ${notCovered.items.length} items, ${JSON_FILE} extension.notCovered has ${extension.notCovered.length}`);
  }
  notCovered.items.forEach((item, i) => {
    const twin = extension.notCovered[i];
    if (!twin) return;
    const same =
      plain(item.pattern) === plain(twin.pattern) &&
      plain(item.use) === plain(twin.use) &&
      item.html?.trim() === twin.html.trim() &&
      item.css?.trim() === twin.css?.trim();
    if (!same) errors.push(`${LLM_FILE}: Not covered yet item ${i + 1} (${item.pattern}) must match ${JSON_FILE} extension.notCovered ${i + 1}`);
  });

  const valid = [...section("Valid Examples").matchAll(/```html\n([\s\S]*?)```/g)].map((m) => m[1].trim());
  const jsonValid = contract.examples.valid.map((e) => e.html.trim());
  if (valid.join("\n\n") !== jsonValid.join("\n\n")) {
    errors.push(`${LLM_FILE}: the Valid Examples html blocks must match ${JSON_FILE} examples.valid, in order`);
  }

  const invalid = [];
  for (const line of section(INVALID_SECTION).split("\n").filter((l) => /^- /.test(l))) {
    const m = /^-\s+`([^`]+)`\s+—\s+(.+)$/.exec(line);
    if (!m) errors.push(`${LLM_FILE}: invalid example lines must read "- \`<html>\` — note", found: ${line}`);
    else invalid.push({ html: m[1], note: m[2] });
  }
  invalid.forEach((e, i) => {
    errors.push(...checkInvalidExample(`${LLM_FILE}: invalid example ${i + 1}`, e.html, e.note, cssClasses, cssTokens));
  });
  const mdInvalid = new Set(invalid.map((e) => e.html));
  const jsonInvalid = new Set(contract.examples.invalid.map((e) => e.html));
  for (const html of diff(jsonInvalid, mdInvalid)) errors.push(`${LLM_FILE}: missing the invalid example ${html} from ${JSON_FILE}`);
  for (const html of diff(mdInvalid, jsonInvalid)) errors.push(`${LLM_FILE}: invalid example ${html} is not in ${JSON_FILE}`);
  if (!invalid.some((e) => [...classAttrs(e.html)].some((c) => !cssClasses.has(c)))) {
    errors.push(`${LLM_FILE}: needs an invalid example with an invented class`);
  }
  if (!invalid.some((e) => /style="[^"]*(display:\s*flex|gap:)/.test(e.html))) {
    errors.push(`${LLM_FILE}: needs an invalid example with an inline-style flex/gap`);
  }

  errors.push(...checkPublishing(files, contract, size));
  return { errors, warnings, size };
}

function sectionHtml(html, id) {
  const start = html.search(new RegExp(`<section\\b[^>]*\\bid="${id}"`));
  if (start === -1) return null;
  const rest = html.slice(start + 1);
  const end = rest.search(/<section\b[^>]*\bid="|<\/main>|<footer class="sc-footer"/);
  return end === -1 ? rest : rest.slice(0, end);
}

const compactHtml = (html) => html.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();

// The showcase section, the Pages workflow and the docs that publish the contract.
export function checkPublishing({ showcaseHtml = "", workflow = "", readme = "", schemaDoc = "" }, contract, size) {
  const errors = [];
  const section = sectionHtml(showcaseHtml, "ai-contract");
  if (!section) errors.push('showcase/index.html: missing <section id="ai-contract">');
  else {
    if (!section.includes(`href="../${LLM_FILE}"`)) errors.push(`showcase AI Contract section must link to ../${LLM_FILE}`);
    if (!new RegExp(`<a\\b[^>]*href="\\.\\./${JSON_FILE.replace(".", "\\.")}"[^>]*\\bdownload\\b`).test(section)) {
      errors.push(`showcase AI Contract section must have a download link (<a href="../${JSON_FILE}" download>)`);
    }
    const shown = /≈\s*([\d,]+)\s*tokens/.exec(section);
    if (!shown) errors.push('showcase AI Contract section must show the approximate size ("≈ N tokens")');
    else {
      const n = Number(shown[1].replace(/,/g, ""));
      if (Math.abs(n - size.tokens) > size.tokens * SHOWCASE_SIZE_TOLERANCE) {
        errors.push(`showcase AI Contract section says ≈ ${shown[1]} tokens, but ${LLM_FILE} is ~${size.tokens}`);
      }
    }
    if (!/>Prompt</.test(section)) errors.push("showcase AI Contract example must show the natural-language prompt");
    const snippet = /<pre><code>([\s\S]*?)<\/code><\/pre>/.exec(section);
    const example = snippet && unescapeHtml(snippet[1]).trim();
    if (!example || !contract.examples.valid.some((e) => e.html.trim() === example)) {
      errors.push(`showcase AI Contract example snippet must be one of the ${JSON_FILE} valid examples`);
    } else {
      const demo = section.split('class="sc-demo"')[1]?.split('class="sc-code"')[0] ?? "";
      if (!compactHtml(demo).includes(compactHtml(example))) {
        errors.push("showcase AI Contract example must render the snippet's HTML live in an sc-demo");
      }
    }
  }
  if (!new RegExp(`href="#ai-contract"`).test(showcaseHtml)) errors.push("showcase navigation must link to #ai-contract");

  for (const file of [LLM_FILE, JSON_FILE]) {
    if (!new RegExp(`^\\s+cp\\b[^\\n]*\\b${file.replace(/\./g, "\\.")}\\b[^\\n]*_site/?\\s*$`, "m").test(workflow)) {
      errors.push(`pages.yml must copy ${file} into _site/`);
    }
    if (!workflow.includes(`- "${file}"`)) errors.push(`pages.yml push paths must include "${file}"`);
  }

  for (const file of [LLM_FILE, JSON_FILE, "docs/ai-contract.md"]) {
    if (!readme.includes(file)) errors.push(`README.md must mention ${file}`);
  }
  if (!/same (pull request|PR)/i.test(readme)) errors.push("README.md must say public API changes update the contract in the same pull request");
  if (!schemaDoc) errors.push("docs/ai-contract.md is missing");
  else {
    for (const key of JSON_KEYS) {
      if (!schemaDoc.includes(`\`${key}\``)) errors.push(`docs/ai-contract.md must document the "${key}" key`);
    }
  }
  return errors;
}

export function readRepoFiles(repo) {
  const read = (p) => {
    try {
      return readFileSync(resolve(repo, p), "utf8");
    } catch {
      return "";
    }
  };
  return {
    json: read(JSON_FILE),
    md: read(LLM_FILE),
    pkg: read("package.json"),
    builtCss: buildBundle(resolve(repo, "src/synthcss.css"), (p) => readFileSync(p, "utf8")),
    baseCss: read("src/base.css"),
    showcaseHtml: read("showcase/index.html"),
    workflow: read(".github/workflows/pages.yml"),
    readme: read("README.md"),
    schemaDoc: read("docs/ai-contract.md"),
    synthJs: read(SYNTH_JS_FILE),
  };
}

export function maxTokensFrom(argv, env) {
  const arg = argv.find((a) => a.startsWith("--max-tokens="))?.split("=")[1];
  const raw = arg ?? env.SYNTHCSS_AI_CONTRACT_MAX_TOKENS;
  if (raw === undefined || raw === "") return DEFAULT_MAX_TOKENS;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`invalid token threshold: ${raw}`);
  return n;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const maxTokens = maxTokensFrom(process.argv.slice(2), process.env);
  const files = readRepoFiles(repo);
  if (process.argv.includes("--write")) {
    files.md = replaceSection(files.md, BEHAVIOR_SECTION, renderBehaviors(JSON.parse(files.json)));
    writeFileSync(resolve(repo, LLM_FILE), files.md);
    console.log(`verify-ai-contract: wrote the ${BEHAVIOR_SECTION} section of ${LLM_FILE}.`);
  }
  const { errors, warnings, size } = verifyContract(files, { maxTokens });
  console.log(`verify-ai-contract: ${LLM_FILE} is ${size.chars} characters, ~${size.tokens} tokens (chars ÷ 4; threshold ${maxTokens}).`);
  for (const w of warnings) console.warn(`  WARN ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`  FAIL ${e}`);
    console.error(`\nverify-ai-contract: ${errors.length} problem(s) found.`);
    process.exit(1);
  }
  console.log(`verify-ai-contract: ${JSON_FILE} and ${LLM_FILE} match the CSS, package.json and each other.`);
}
