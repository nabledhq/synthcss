# synthcss

[![Pledged to SynthCSS on nabled](https://nabled.ai/api/badges/projects/synthcss/pledged.svg)](https://nabled.ai/p/synthcss)

SynthCSS is a lightweight, opinionated CSS framework built specifically for AI agents, code generators, and dynamically created applications. Instead of optimizing for humans hand-authoring every class, SynthCSS provides a predictable set of semantic components, layout primitives, design tokens, and interaction patterns that AI can reliably underst

SynthCSS is crowdfunded on [nabled.ai](https://nabled.ai/p/synthcss).

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

## Showcase

[`showcase/`](showcase/) is a static page built with SynthCSS that shows the tokens, layout primitives and components live, plus a composed settings screen, with copyable snippets and width-adjustable demos. Open `showcase/index.html` in a browser to preview it. It is published to GitHub Pages by [`.github/workflows/pages.yml`](.github/workflows/pages.yml). See [showcase/README.md](showcase/README.md) for local preview, deployment, the one-time Pages setting and how to add a section.
