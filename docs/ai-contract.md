# AI contract

SynthCSS ships its full public vocabulary as an AI contract in two files at the
repository root. An agent can learn every class and token from one file in one context
window, with no need to crawl these docs or read `src/`.

| File | For | Notes |
| --- | --- | --- |
| [`synthcss.ai.json`](../synthcss.ai.json) | Tools and agents that read structured data | The canonical, machine-readable contract. |
| [`synthcss.llm.md`](../synthcss.llm.md) | Pasting into a prompt | A terse hand-written twin of the JSON, one line per item, about 3,900 tokens. |

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
| `components` | object | Component base class → `{ intent, parts, variants }`. `parts` and `variants` map class → purpose (empty `{}` when there are none). |
| `intentMap` | array | `{ intent, use }` pairs: a plain-language need and the markup to use for it. |
| `compositionRules` | object | `{ recommended: [], avoid: [] }`: how to combine primitives and components. |
| `generationRules` | array | Exactly 10 rules an agent must follow when generating SynthCSS markup. |
| `examples` | object | `{ valid: [], invalid: [] }`, each item `{ html, note }`. 2–4 valid examples; invalid ones show what not to generate. |

```json
{
  "synthcssVersion": "0.1.0",
  "contractVersion": "1.0.0",
  "tokens": { "--space-4": "1rem spacing step (default gap)" },
  "baseStyles": { "note": "Base styles apply --font-sans, … Override the tokens to restyle.", "rules": { "h1": { "font-size": "var(--text-3xl)" } } },
  "layouts": { "stack": "vertical flow with tokenized spacing" },
  "components": {
    "badge": { "intent": "short status label", "parts": {}, "variants": { "badge-success": "positive status" } }
  },
  "intentMap": [{ "intent": "Vertical list of blocks", "use": ".stack" }],
  "compositionRules": { "recommended": ["…"], "avoid": ["…"] },
  "generationRules": ["Use only the classes and tokens in this contract; never invent class names.", "…"],
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
Design Tokens, Layout Vocabulary, Component Vocabulary, Intent Mapping, Composition
Rules (with `### Recommended` and `### Avoid`), AI Generation Rules (numbered 1–10),
Valid Examples (one `html` code block each) and Invalid / Discouraged Examples (one
line each: `` - `<html>` — note ``). It is written by hand; keep it in step with the
JSON.

## Changing the contract

Any change to the public API (a class or token added, renamed or removed) must update
**both** files in the same pull request. Version bumps are automatic: the release
workflow updates `synthcssVersion` and the Markdown header with
[`scripts/bump-version.mjs`](../scripts/bump-version.mjs) (see [releasing.md](releasing.md)).

`npm test` runs [`scripts/verify-ai-contract.mjs`](../scripts/verify-ai-contract.mjs)
(also `npm run check:ai-contract`). It needs only Node.js and fails when:

- a class in either file is not a selector in the built CSS (`src/synthcss.css` with its
  imports inlined), or a token is not defined on `:root`;
- a class in the CSS is missing from the JSON `layouts` / `components`, or a `:root`
  token is missing from `tokens`. Internal helper classes can be excluded through the
  `INTERNAL_CLASSES` allowlist in the script (empty today: every class is public);
- `baseStyles.rules` differs from the rules in `src/base.css`, or the Markdown Design
  Tokens section does not state `baseStyles.note`;
- the classes in the Markdown Layout and Component Vocabulary, or the tokens in its
  Design Tokens section, differ from the JSON;
- an invalid example uses a real class that its note does not name as the alternative;
- `synthcssVersion` or the Markdown header does not match `package.json`, or the
  Markdown header's contract version does not match `contractVersion`;
- a Markdown section is missing, the intent table, composition rules or valid and
  invalid examples differ from the JSON, or there are not exactly 10 generation rules;
- the showcase AI Contract section, the Pages workflow or the README no longer publish
  and describe the contract.

It also prints the size of `synthcss.llm.md` in characters and estimated tokens
(characters ÷ 4, no tokenizer) and warns, without failing, above 8,000 tokens. Set
another threshold with `node scripts/verify-ai-contract.mjs --max-tokens=6000` or the
`SYNTHCSS_AI_CONTRACT_MAX_TOKENS` environment variable. The showcase prints the
estimate too; update it when the file grows or shrinks by more than 10%.
