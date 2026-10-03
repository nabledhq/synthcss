# synthcss

[![Pledged to SynthCSS on nabled](https://nabled.ai/api/badges/projects/synthcss/pledged.svg)](https://nabled.ai/p/synthcss)

SynthCSS is a lightweight, opinionated CSS framework built specifically for AI agents, code generators, and dynamically created applications. Instead of optimizing for humans hand-authoring every class, SynthCSS provides a predictable set of semantic components, layout primitives, design tokens, and interaction patterns that AI can reliably underst

SynthCSS is crowdfunded on [nabled.ai](https://nabled.ai/p/synthcss).

## Install

Load the bundle from the jsDelivr CDN, pinned to a [release](https://github.com/nabledhq/synthcss/releases):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/nabledhq/synthcss@0.1.0/dist/synthcss.min.css">
```

| File | Contents |
| --- | --- |
| `dist/synthcss.css` | Everything: tokens, layout primitives and components in one file. |
| `dist/tokens.css` | Design tokens only. |
| `dist/layout.css` | Layout primitives only. Load `tokens.css` first. |
| `dist/components.css` | Components only. Load `tokens.css` first. |

Use `.min.css` for the minified file (jsDelivr minifies on request) or `.css` for the readable one. `@0.1` follows the latest 0.1.x patch release; pin an exact version in production. To self-host, download the files from a [GitHub release](https://github.com/nabledhq/synthcss/releases) or run `npm run build` and copy `dist/`. SynthCSS follows [semantic versioning](https://semver.org); while it is 0.x, a minor release may contain breaking changes. See [docs/releasing.md](docs/releasing.md) for how releases are made.

## Design tokens

All visual decisions (color, spacing, typography, radius, borders, shadows, sizing, focus and motion) are CSS custom properties defined on `:root` in [`src/tokens.css`](src/tokens.css). To restyle an interface, override a few tokens:

```css
:root { --color-primary: #YOUR_COLOR; --radius-md: 0.5rem; --space-3: 0.75rem; }
```

See [docs/tokens.md](docs/tokens.md) for the full token reference, override examples, guidance for AI agents and reduced-motion behavior. Run `npm test` to check that the tokens, the docs and the contrast requirements are in sync. It needs only Node.js 18 or later.

## Layout primitives

Eight intent-named layout classes in [`src/layout.css`](src/layout.css): `.container`, `.stack`, `.cluster`, `.grid`, `.sidebar`, `.split`, `.center` and `.cover`, plus `-sm`/`-lg` gap variants for `stack`, `cluster`, `grid`, `sidebar` and `split`. They respond to the space they are given, with no media queries or breakpoint classes. Load everything with the main bundle:

```html
<link rel="stylesheet" href="synthcss/src/synthcss.css">
```

See [docs/layout.md](docs/layout.md) for each primitive and a compact "AI Layout Vocabulary" table to give to a model, and [examples/layout.html](examples/layout.html) for a fixture page showing every primitive at narrow and wide widths.

## Components

Eight semantic components in [`src/components.css`](src/components.css), included in the main bundle: `.button`, `.field`, `.card`, `.badge`, `.alert`, `.panel`, `.table` and `.empty-state`, with a small set of variants (`.button-primary`, `.badge-success`, `.alert-danger`, …) and parts (`.card-header`, `.field-error`, …). They use only tokens, take their state from native attributes (`disabled`, `aria-busy="true"`, `aria-invalid="true"`) and need no JavaScript:

```html
<form class="card">
  <div class="field">
    <label class="field-label" for="email">Email</label>
    <input id="email" type="email" aria-invalid="true" aria-describedby="email-error">
    <p class="field-error" id="email-error">Enter a full email address.</p>
  </div>
  <div class="cluster-sm"><button type="submit" class="button button-primary">Save</button></div>
</form>
```

See [docs/components.md](docs/components.md) for each component's variants, composition with the layout primitives and accessibility notes, plus a compact "AI Component Reference" table to give to a model.

## AI contract

[`synthcss.llm.md`](synthcss.llm.md) is the whole public vocabulary in one prompt-ready file of about 2,800 tokens: every token, layout primitive, component, part and variant, an intent table, composition rules, ten generation rules and valid and invalid examples. Paste it into a model's context. [`synthcss.ai.json`](synthcss.ai.json) is the same contract as structured data and the canonical source. Both state the SynthCSS version they describe; the schema is in [docs/ai-contract.md](docs/ai-contract.md).

**Any change to the public API (a class or token added, renamed or removed, or a new version) must update both contract files in the same pull request.** `npm test` runs `scripts/verify-ai-contract.mjs`, which fails when the contract and the CSS or `package.json` disagree.

## Showcase

[`showcase/`](showcase/) is a static page built with SynthCSS that shows the tokens, layout primitives and components live, plus a composed settings screen and the AI contract, with copyable snippets and width-adjustable demos. Open `showcase/index.html` in a browser to preview it. It is published to GitHub Pages by [`.github/workflows/pages.yml`](.github/workflows/pages.yml). See [showcase/README.md](showcase/README.md) for local preview, deployment, the one-time Pages setting and how to add a section.
