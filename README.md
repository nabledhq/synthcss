# synthcss

[![Pledged to SynthCSS on nabled](https://nabled.ai/api/badges/projects/synthcss/pledged.svg)](https://nabled.ai/p/synthcss)

SynthCSS is a lightweight, opinionated CSS framework built specifically for AI agents, code generators, and dynamically created applications. Instead of optimizing for humans hand-authoring every class, SynthCSS provides a predictable set of semantic components, layout primitives, design tokens, and interaction patterns that AI can reliably underst

SynthCSS is crowdfunded on [nabled.ai](https://nabled.ai/p/synthcss).

## Install

Load the bundle from the jsDelivr CDN, pinned to a [release](https://github.com/nabledhq/synthcss/releases):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/nabledhq/synthcss@0.10.0/dist/synthcss.min.css">
```

| File | Contents |
| --- | --- |
| `dist/synthcss.css` | Everything: tokens, base styles, layout primitives and components in one file. |
| `dist/tokens.css` | Design tokens only. |
| `dist/base.css` | Base styles only (page font and colors, `h1`–`h4` sizes). Load `tokens.css` first. |
| `dist/layout.css` | Layout primitives only. Load `tokens.css` first. |
| `dist/components.css` | Components only. Load `tokens.css` first. |
| `dist/synth.js` | Optional [SynthJS](docs/behaviors.md) behaviors script (`<script src="…/dist/synth.js" defer>`). Not needed for any styling. |

Use `.min.css` for the minified file (jsDelivr minifies on request) or `.css` for the readable one. `@0.10` follows the latest 0.10.x patch release; pin an exact version in production. To self-host, download the files from a [GitHub release](https://github.com/nabledhq/synthcss/releases) or run `npm run build` and copy `dist/`. SynthCSS follows [semantic versioning](https://semver.org); while it is 0.x, a minor release may contain breaking changes. See [docs/releasing.md](docs/releasing.md) for how releases are made.

## Design tokens

All visual decisions (color, spacing, typography, radius, borders, shadows, sizing, focus and motion) are CSS custom properties defined on `:root` in [`src/tokens.css`](src/tokens.css). To restyle an interface, override a few tokens:

```css
:root { --color-primary: #YOUR_COLOR; --radius-md: 0.5rem; --space-3: 0.75rem; }
```

The main bundle also applies the tokens to plain markup: `--font-sans`, `--color-text` and `--color-background` on the page and the `--text-*` scale on `h1`–`h4`, in a zero-specificity `synth.base` cascade layer that any rule of your own overrides ([`src/base.css`](src/base.css)). See [docs/tokens.md](docs/tokens.md) for the full token reference, override examples, guidance for AI agents and reduced-motion behavior. Run `npm install` once, then `npm test` to check that the tokens, the docs and the contrast requirements are in sync. It needs Node.js 20 or later. The core package's only dependency is the dev dependency happy-dom, for the SynthJS tests; `npm install` also installs the [SynthMCP](docs/mcp.md) workspace and its two dependencies.

## Layout primitives

Eight intent-named layout classes in [`src/layout.css`](src/layout.css): `.container`, `.stack`, `.cluster`, `.grid`, `.sidebar`, `.split`, `.center` and `.cover`, plus `-sm`/`-lg` gap variants for `stack`, `cluster`, `grid`, `sidebar` and `split`, and a `.sidebar-end` modifier that puts the sidebar's narrow column on the right. They respond to the space they are given, with no media queries or breakpoint classes. Load everything with the main bundle:

```html
<link rel="stylesheet" href="synthcss/src/synthcss.css">
```

See [docs/layout.md](docs/layout.md) for each primitive and a compact "AI Layout Vocabulary" table to give to a model, and [examples/layout.html](examples/layout.html) for a fixture page showing every primitive at narrow and wide widths.

## Components

Thirteen semantic components in [`src/components.css`](src/components.css), included in the main bundle: `.button`, `.field`, `.switch`, `.input-group`, `.card`, `.badge`, `.alert`, `.panel`, `.table`, `.empty-state`, `.nav`, `.tabs` and `.avatar`, with a small set of variants (`.button-primary`, `.badge-success`, `.alert-danger`, `.avatar-round`, …) and parts (`.card-header`, `.field-error`, `.alert-icon`, `.nav-link`, `.tabs-item`, …). They use only tokens, take their state from native attributes (`disabled`, `aria-busy="true"`, `aria-invalid="true"`, `aria-current="page"` on the current `.nav-link`, `aria-selected="true"` on the selected `.tabs-item`) and need no JavaScript:

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

## Behaviors (SynthJS)

[`dist/synth.js`](docs/behaviors.md) is an optional, dependency-free script that makes the markup interactive. Declare the intent with one `data-synth-*` attribute and SynthJS handles the events and keeps `hidden` and the ARIA state in sync: `data-synth-open` (modal `<dialog>`, focus returns to the opener), `data-synth-dismiss` (close a dialog or hide a `[data-synth-dismissible]` alert), `data-synth-toggle` (show or hide a section, with `aria-expanded`), `data-synth-tabs` (tab panels with arrow, Home and End keys) and `data-synth-dropdown` (a list of links that closes on an outside click or Escape). CSS-only pages keep working without it.

```html
<script src="https://cdn.jsdelivr.net/gh/nabledhq/synthcss@0.10.0/dist/synth.js" defer></script>

<button type="button" class="button" data-synth-toggle="filters">Filters</button>
<div id="filters" class="panel" hidden>…</div>
```

It initializes itself on load; call `Synth.init(element)` after inserting markup (repeated calls are safe). See [docs/behaviors.md](docs/behaviors.md) for each behavior's markup, accessibility and common misuse, plus a compact "AI Behavior Reference" table.

## AI contract

[`synthcss.llm.md`](synthcss.llm.md) is the whole public vocabulary in one prompt-ready file of about 7,000 tokens: every token, layout primitive, component, part and variant, an intent table, the SynthJS behaviors (`data-synth-*`), composition rules, ten generation rules, the one legal fallback when the vocabulary lacks a pattern (`data-ui="<name>"` styled inside `@layer synth.ext` with tokens only) with a "Not covered yet" list, and valid and invalid examples, including a full app-shell page. Paste it into a model's context. [`synthcss.ai.json`](synthcss.ai.json) is the same contract as structured data and the canonical source. Both state the SynthCSS version they describe; the schema is in [docs/ai-contract.md](docs/ai-contract.md).

**Any change to the public API (a class, token or `data-synth-*` behavior added, renamed or removed, or a new version) must update both contract files in the same pull request.** The Behaviors (SynthJS) section of `synthcss.llm.md` is generated from the JSON with `npm run contract:write`. `npm test` runs `scripts/verify-ai-contract.mjs`, which fails when the contract and the CSS or `package.json` disagree.

## SynthMCP

[SynthMCP](docs/mcp.md) (`packages/synthmcp/`) is a stdio [MCP](https://modelcontextprotocol.io) server that lets coding agents query and validate SynthCSS instead of carrying the whole contract in their prompt. Every answer comes from `synthcss.ai.json`. It has seven read-only tools:

- `list_components` and `get_component`;
- `list_layouts` and `get_layout`;
- `resolve_intent`, which maps "a row of buttons that wraps" to `.cluster`;
- `validate_markup`, which flags unknown classes, misused variants and parts, `data-synth-*` mistakes and accessibility gaps;
- `get_example`.

Start it with `npm run --silent mcp`, `npx synthmcp` or `node packages/synthmcp/src/server.js`. See [docs/mcp.md](docs/mcp.md) for client configuration and every tool's arguments and responses. It is a separate workspace package: the stylesheets and SynthJS do not depend on it.

## Showcase

[`showcase/`](showcase/) is a static page built with SynthCSS that shows the tokens, layout primitives and components live, plus a composed settings screen, the AI contract and SynthMCP, with copyable snippets and width-adjustable demos. Open `showcase/index.html` in a browser to preview it. It is published to GitHub Pages by [`.github/workflows/pages.yml`](.github/workflows/pages.yml). See [showcase/README.md](showcase/README.md) for local preview, deployment, the one-time Pages setting and how to add a section.
