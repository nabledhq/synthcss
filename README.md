# synthcss
SynthCSS is a lightweight, opinionated CSS framework built specifically for AI agents, code generators, and dynamically created applications. Instead of optimizing for humans hand-authoring every class, SynthCSS provides a predictable set of semantic components, layout primitives, design tokens, and interaction patterns that AI can reliably underst

## Design tokens

All visual decisions (color, spacing, typography, radius, borders, shadows, sizing, focus and motion) are CSS custom properties defined on `:root` in [`src/tokens.css`](src/tokens.css). To restyle an interface, override a few tokens:

```css
:root { --color-primary: #YOUR_COLOR; --radius-md: 0.5rem; --space-3: 0.75rem; }
```

See [docs/tokens.md](docs/tokens.md) for the full token reference, override examples, guidance for AI agents and reduced-motion behavior. Run `npm test` to check that the tokens, the docs and the contrast requirements are in sync. It needs only Node.js 18 or later.
