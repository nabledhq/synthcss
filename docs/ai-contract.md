# AI contract

SynthCSS ships its full public vocabulary as an AI contract in two files at the
repository root. An agent can learn every class and token from one file in one context
window, with no need to crawl these docs or read `src/`.

| File | For | Notes |
| --- | --- | --- |
| [`synthcss.ai.json`](../synthcss.ai.json) | Tools and agents that read structured data | The canonical, machine-readable contract. |
| [`synthcss.llm.md`](../synthcss.llm.md) | Pasting into a prompt | A terse twin of the JSON, one line per item, about 7,000 tokens. Hand-written, except the Behaviors (SynthJS) section, which is generated from the JSON. |

Both are published next to the showcase on GitHub Pages
(`<site>/synthcss.llm.md`, `<site>/synthcss.ai.json`) and are in every release tag.

## `synthcss.ai.json` schema

Class names are written **without** the leading dot. Token names keep their `--`.

| Key | Type | Contents |
| --- | --- | --- |
| `synthcssVersion` | string | The SynthCSS version the contract describes. Must equal `version` in `package.json`. |
| `contractVersion` | string (semver) | Version of the contract format. Bump the major for a breaking change to this schema. |
| `tokens` | object | Token name → short purpose, for every custom property on `:root` in `src/tokens.css`. |
| `baseStyles` | object | `{ note, rules }`: what the base styles in `src/base.css` apply. `note` is a one-sentence summary that the Markdown Design Tokens section repeats; `rules` maps each selector (without `:where()`) to its declarations, exactly as in `src/base.css`. |
| `layouts` | object | Layout class → intent: the eight primitives, their `-sm` / `-lg` gap variants, `cover-main` and `sidebar-end`. |
| `primitives` | object | Layout primitive (one of the eight) → `{ variants, modifiers?, parts?, placement?, responsive, composition, example }`. Every `layouts` class belongs to exactly one primitive: as the primitive itself, a gap variant (used on its own or next to the base class), a modifier (needs the primitive or one of its variants on the same element, e.g. `sidebar-end`) or a part (`cover-main`). `placement` says where a part sits (see `components`), `responsive` how it adapts, `composition` how to combine it and `example` is minimal HTML. |
| `components` | object | Component base class → `{ intent, parts, variants, behaviors?, placement?, accessibility, example }`. `parts` and `variants` map class → purpose (empty `{}` when there are none); variants need the base class on the same element. `behaviors` (optional) lists the [SynthJS](behaviors.md) behaviors that belong to the component, each `{ intent, attribute, target, requiredMarkup, accessibility }`: `attribute` is the one `data-synth-*` attribute for the intent, `target` says what it points at, `requiredMarkup` is minimal valid HTML and `accessibility` a list of what SynthJS guarantees or the author must add. `placement` (optional) maps a part to `"inside"` (a descendant of the base class, the default for parts not listed), `"child"` (a direct child) or `"wraps"` (an ancestor, like `table-wrap`). `accessibility` lists checkable expectations, each `{ expectation, class, elements?, attributes?, values?, severity }`: elements with `class` must be one of `elements` (tag names) and carry one of `attributes`, with a value from `values` when given; `severity` is `"error"` or `"warning"`. `example` is minimal HTML. |
| `synthjs` | object | `{ attributes }`: every `data-synth-*` attribute SynthJS reads → `{ behavior, value, purpose, targetElements?, closest?, contains? }`. `behavior` is the behavior attribute it belongs to; `value` is `"id"` (names the target element's id; `targetElements` limits its tag) or `"none"` (a bare attribute); `closest` lists selectors one of which must match the element or an ancestor; `contains` lists groups of selectors, each group matched by a descendant. Selectors are a tag name, `[attr]` or `[attr="value"]`. |
| `internal` | object | `{ note, classes, attributes }`: markers SynthCSS or SynthJS set themselves and markup must never contain (`data-synth`, on the style element SynthJS injects). `classes` is empty today: every class SynthCSS ships is public. |
| `intentMap` | array | `{ intent, use }` pairs: a plain-language need and the markup to use for it. |
| `intents` | array | `{ class, with?, attribute?, reason, keywords }`: the intent index SynthMCP's `resolve_intent` scores a request against. `class` is the public class to use, `with` the classes it needs on the same element (`button` for `button-primary`), `attribute` a SynthJS attribute when the intent is a behavior, `reason` one line on why, and `keywords` the words and short phrases that select it. |
| `compositionRules` | object | `{ recommended: [], avoid: [] }`: how to combine primitives and components. |
| `generationRules` | array | Exactly 10 rules an agent must follow when generating SynthCSS markup. |
| `extension` | object | The one fallback when the vocabulary lacks a pattern: `{ rule, steps, attribute, layer, values, properties, keywords, notCovered }`. `attribute` is `"data-ui"`, `layer` is `"synth.ext"`; `steps` is the rule in order; `properties` lists the CSS properties extension rules may set and `keywords` the bare words allowed next to `var(--…)` values. `notCovered` lists patterns with no class of their own, each `{ pattern, use, html }` for a composition of existing classes, plus `css` for a `data-ui` fallback. |
| `examples` | object | `{ valid: [], invalid: [], patterns: {} }`, each item `{ html, note }`. 2–5 valid examples (one is a full app-shell page); invalid ones show what not to generate. `patterns` maps a pattern name (`dashboard-header`, `settings-form`, `card-grid`, `dialog`, `tabs`, `empty-state`) to its official example, served by SynthMCP's `get_example`. |

`primitives`, `synthjs`, `internal`, `intents`, `examples.patterns` and the components'
`placement`, `accessibility` and `example` were added in contract 1.4.0 for
[SynthMCP](mcp.md). They are JSON only: `synthcss.llm.md` stays a compact prompt and
does not repeat them.

```json
{
  "synthcssVersion": "0.1.0",
  "contractVersion": "1.0.0",
  "tokens": { "--space-4": "1rem spacing step (default gap)" },
  "baseStyles": { "note": "Base styles apply --font-sans, … Override the tokens to restyle.", "rules": { "h1": { "font-size": "var(--text-3xl)" } } },
  "layouts": { "stack": "vertical flow with tokenized spacing" },
  "components": {
    "badge": { "intent": "short status label", "parts": {}, "variants": { "badge-success": "positive status" } },
    "button": {
      "intent": "…", "parts": {}, "variants": { "…": "…" },
      "behaviors": [{
        "intent": "show or hide a section", "attribute": "data-synth-toggle", "target": "the id of any element; …",
        "requiredMarkup": "<button type=\"button\" class=\"button\" data-synth-toggle=\"filters\">Filters</button>\n<div id=\"filters\" hidden>…</div>",
        "accessibility": ["aria-expanded on the button follows the target's hidden state", "…"]
      }]
    }
  },
  "intentMap": [{ "intent": "Vertical list of blocks", "use": ".stack" }],
  "compositionRules": { "recommended": ["…"], "avoid": ["…"] },
  "generationRules": ["Use only the classes and tokens in this contract; never invent class names.", "…"],
  "extension": {
    "rule": "…", "steps": ["…"], "attribute": "data-ui", "layer": "synth.ext", "values": "tokens only: …",
    "properties": ["color", "padding-inline-start", "…"], "keywords": ["solid", "none"],
    "notCovered": [{ "pattern": "Timeline", "use": "fallback, …", "html": "<ol class=\"stack\" role=\"list\">…</ol>", "css": "@layer synth.ext { … }" }]
  },
  "examples": {
    "valid": [{ "html": "<ul class=\"cluster\" role=\"list\">…</ul>", "note": "…" }],
    "invalid": [{ "html": "<div class=\"flex-row-gap-large-center\">…</div>", "note": "Invented class. Use .cluster-lg." }]
  }
}
```

In free text (intents, rules, notes) classes are written as `.name` and tokens as
`--name`; the verifier reads those mentions too, so every one must exist. A token
family written as `--text-*` is not read as a token.

An invalid example's `note` says why the markup is wrong and then names the correct
alternative after the word "Use". An invalid example may only contain a real SynthCSS
class if its note names that class as the alternative (for example
`badge badge-red` with "Use .badge and .badge-danger").

## `synthcss.llm.md` layout

A version header (`SynthCSS <version> · contract <version>`), then these `##` sections:
Design Tokens, Layout Vocabulary, Component Vocabulary, Intent Mapping, Behaviors
(SynthJS) (generated, see below), Composition
Rules (with `### Recommended` and `### Avoid`), AI Generation Rules (numbered 1–10),
When the vocabulary is missing a pattern (the extension rule as numbered steps, then an
`Allowed properties:` and an `Allowed keywords:` line listing the JSON arrays in order),
Not covered yet (one line per `extension.notCovered` item:
`` - Pattern — use: `<html>` ``, or `- Pattern — use` followed by an `html` and a `css`
code block for a fallback), Valid Examples (one `html` code block each) and Invalid /
Discouraged Examples (one line each: `` - `<html>` — note ``). It is written by hand;
keep it in step with the JSON.

The Behaviors (SynthJS) section is the exception: `npm run contract:write`
(`node scripts/verify-ai-contract.mjs --write`) renders it from the components'
`behaviors` entries, in component order, and the verifier fails when it differs from
that rendering. Edit the JSON, then run the command; there is no separate registry of
behaviors.

## The extension rule

When nothing in the vocabulary fits, there is one legal fallback: compose from the
primitives first; otherwise mark the element with `data-ui="<name>"` and style it only
with `[data-ui="<name>"]` selectors inside `@layer synth.ext { … }`, using `var(--…)`
token values (plus the keywords `solid` and `none`), adding no class names and setting
no property that a SynthCSS class on the same element already sets. SynthCSS's own
layout and component rules are unlayered, so they win over anything in `synth.ext`.

## Changing the contract

Any change to the public API (a class or token added, renamed or removed, or a
`data-synth-*` behavior) must update **both** files in the same pull request. Bump
`contractVersion`'s minor for additions to the format (1.3.0 added `behaviors`, 1.4.0 the
sections SynthMCP reads) and its
major for breaking changes. Version bumps are automatic: the release
workflow updates `synthcssVersion` and the Markdown header with
[`scripts/bump-version.mjs`](../scripts/bump-version.mjs) (see [releasing.md](releasing.md)).

`npm test` runs [`scripts/verify-ai-contract.mjs`](../scripts/verify-ai-contract.mjs)
(also `npm run check:ai-contract`). It needs only Node.js and fails when:

- a class in either file is not a selector in the built CSS (`src/synthcss.css` with its
  imports inlined), or a token is not defined on `:root`;
- a class in the CSS is missing from the JSON `layouts` / `components`, or a `:root`
  token is missing from `tokens`. Internal helper classes are excluded by listing them
  in the contract's `internal.classes` (empty today: every class is public);
- `baseStyles.rules` differs from the rules in `src/base.css`, or the Markdown Design
  Tokens section does not state `baseStyles.note`;
- the classes in the Markdown Layout and Component Vocabulary, or the tokens in its
  Design Tokens section, differ from the JSON;
- an invalid example uses a real class that its note does not name as the alternative;
- `synthcssVersion` or the Markdown header does not match `package.json`, or the
  Markdown header's contract version does not match `contractVersion`;
- a Markdown section is missing, the intent table, composition rules or valid and
  invalid examples differ from the JSON, or there are not exactly 10 generation rules;
- the extension rule is broken: `extension.attribute` is not `data-ui` or
  `extension.layer` not `synth.ext`; CSS in a `<style>` block of a valid example or in a
  `notCovered` item's `css` is not one `@layer synth.ext { … }` block of
  `[data-ui="…"]` rules with listed properties and token values; a styled `data-ui`
  name has no element, or an element's `data-ui` has no rule; a valid example or
  `notCovered` snippet uses a class outside the contract or an inline style other than a
  token override; or the Markdown extension section and Not covered yet list differ
  from the JSON;
- a `behaviors` entry lacks one of its five keys or has another, two entries share an
  attribute, an attribute is not `data-synth-<name>`, its `requiredMarkup` does not use
  the attribute and the component's class or breaks the markup rules above,
  `src/js/synth.js` does not implement the attribute, or the Markdown Behaviors
  (SynthJS) section is not the rendering of the JSON;
- a 1.4 section is malformed or inconsistent: a `layouts` class is not covered by exactly
  one `primitives` entry, a `placement` or `accessibility` rule names a class that is not
  the component's or primitive's own, a component or primitive `example` or an
  `examples.patterns` item breaks the markup rules above, a `synthjs.attributes` entry
  does not belong to a behavior or is not used by `src/js/synth.js` (or a behavior
  attribute is missing from it), or an `intents` entry names a class that is not public
  or an attribute that is not a behavior;
- the showcase AI Contract section, the Pages workflow or the README no longer publish
  and describe the contract.

It also prints the size of `synthcss.llm.md` in characters and estimated tokens
(characters ÷ 4, no tokenizer) and warns, without failing, above 8,000 tokens. Set
another threshold with `node scripts/verify-ai-contract.mjs --max-tokens=6000` or the
`SYNTHCSS_AI_CONTRACT_MAX_TOKENS` environment variable. The showcase prints the
estimate too; update it when the file grows or shrinks by more than 10%.
