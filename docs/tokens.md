# Design tokens

SynthCSS keeps every visual decision in one file, [`src/tokens.css`](../src/tokens.css).
Each token is a CSS custom property on `:root`. Components and layout primitives read
tokens through `var(--token)`, so changing a token changes every rule that uses it.

Include the file before any other SynthCSS or app styles:

```html
<link rel="stylesheet" href="synthcss/src/tokens.css">
```

The defaults are a neutral light theme with a desaturated slate-blue primary. They are
not tied to any brand. Text colors meet WCAG AA, and `npm test` checks this (see
[Verification](#verification)).

## Reference

### Color

| Token | Default | Purpose |
| --- | --- | --- |
| `--color-background` | `#ffffff` | Page background. |
| `--color-surface` | `#f6f7f9` | Background for cards, panels, wells and other grouped content. |
| `--color-surface-elevated` | `#ffffff` | Background for raised layers: popovers, menus, dialogs. Pair with a shadow. |
| `--color-text` | `#1b1f24` | Main body and heading text. |
| `--color-text-secondary` | `#3d4651` | Supporting text: descriptions, labels, table cells. |
| `--color-text-muted` | `#5c6672` | Low-emphasis text: hints, placeholders, metadata, timestamps. |
| `--color-border` | `#d5dae0` | Default color for dividers and component outlines. |
| `--color-primary` | `#3b5778` | Accent color for primary actions, links and selected states. |
| `--color-primary-hover` | `#2f4762` | Hover and active state of primary elements. |
| `--color-on-primary` | `#ffffff` | Text and icons placed on `--color-primary`. |
| `--color-success` | `#2f7a4f` | Success state: confirmations, valid input. |
| `--color-warning` | `#9a5b0c` | Warning state: needs attention, not blocking. |
| `--color-danger` | `#b3362e` | Error and destructive state: errors, delete actions. |
| `--color-info` | `#2f6694` | Neutral informational state: tips, notices. |

### Spacing

A rem scale that only increases. Use it for padding, margins and gaps.

| Token | Default | Purpose |
| --- | --- | --- |
| `--space-1` | `0.25rem` | Hairline gaps, such as between an icon and its label. |
| `--space-2` | `0.5rem` | Tight padding inside small controls and between related items. |
| `--space-3` | `0.75rem` | Default padding inside controls and compact cards. |
| `--space-4` | `1rem` | Default gap between elements and default card padding. |
| `--space-5` | `1.5rem` | Space between groups of content. |
| `--space-6` | `2rem` | Space between page sections. |

### Typography

Font stacks use only system fonts. Nothing is downloaded.

| Token | Default | Purpose |
| --- | --- | --- |
| `--font-sans` | `system-ui, -apple-system, "Segoe UI", Roboto, …, sans-serif` | Default font for all UI text. |
| `--font-mono` | `ui-monospace, SFMono-Regular, Menlo, …, monospace` | Code, keyboard input, tabular data. |
| `--text-sm` | `0.875rem` | Small text: captions, hints, dense tables. |
| `--text-base` | `1rem` | Body text and controls. |
| `--text-lg` | `1.125rem` | Lead paragraphs and small headings. |
| `--text-xl` | `1.25rem` | Section headings. |
| `--text-2xl` | `1.5rem` | Page headings. |
| `--text-3xl` | `1.875rem` | Hero and display headings. |
| `--weight-normal` | `400` | Body text. |
| `--weight-medium` | `500` | Labels, buttons, emphasized UI text. |
| `--weight-semibold` | `600` | Headings and table headers. |
| `--weight-bold` | `700` | Strong emphasis and display headings. |
| `--leading-tight` | `1.25` | Headings and single-line controls. |
| `--leading-normal` | `1.5` | Body text. |
| `--leading-relaxed` | `1.75` | Long-form reading content. |

### Radius

| Token | Default | Purpose |
| --- | --- | --- |
| `--radius-sm` | `0.25rem` | Small elements: badges, checkboxes, tags. |
| `--radius-md` | `0.375rem` | Default for buttons, inputs and cards. |
| `--radius-lg` | `0.75rem` | Large containers: dialogs, panels. |
| `--radius-full` | `9999px` | Pills, avatars, fully rounded shapes. |

### Borders

| Token | Default | Purpose |
| --- | --- | --- |
| `--border-width` | `1px` | Default stroke width for borders and dividers. |
| `--border-color` | `var(--color-border)` | Default border color. Override this to change borders without changing `--color-border`. |

### Shadows

Subtle and low-opacity. Use them for elevation only, not for decoration.

| Token | Default | Purpose |
| --- | --- | --- |
| `--shadow-sm` | `0 1px 2px rgb(16 24 40 / 0.05)` | Slight lift: cards, raised buttons. |
| `--shadow-md` | `0 2px 6px rgb(16 24 40 / 0.07), 0 1px 2px rgb(16 24 40 / 0.04)` | Floating elements: dropdowns, popovers. |
| `--shadow-lg` | `0 8px 24px rgb(16 24 40 / 0.08), 0 2px 6px rgb(16 24 40 / 0.04)` | Top layer: dialogs, toasts. |

### Sizing

| Token | Default | Purpose |
| --- | --- | --- |
| `--control-height` | `2.5rem` | Height of buttons and other single-line controls. |
| `--input-height` | `2.5rem` | Height of text inputs and selects. Keep it equal to `--control-height` so they line up. |
| `--container-width` | `72rem` | Maximum width of the main page container (`.container`). |
| `--content-width` | `42rem` | Maximum width of readable text blocks, about 65–75 characters per line. Used by `.center`. |
| `--sidebar-width` | `16rem` | Preferred width of the first child of a `.sidebar` layout before it wraps. |
| `--grid-min` | `16rem` | Minimum column width of a `.grid` before it drops a column. |

### Focus

| Token | Default | Purpose |
| --- | --- | --- |
| `--focus-color` | `var(--color-primary)` | Focus ring color. Must contrast at least 3:1 with `--color-background`. |
| `--focus-width` | `2px` | Focus ring thickness. |
| `--focus-offset` | `2px` | Gap between the element and its focus ring. |

### Motion

| Token | Default | Purpose |
| --- | --- | --- |
| `--duration-fast` | `120ms` | Small state changes: hover, focus, color. |
| `--duration-normal` | `200ms` | Default for most transitions: expanding, fading. |
| `--duration-slow` | `320ms` | Large movements: dialogs, drawers, page-level transitions. |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default easing curve for all transitions. |

## Reduced motion

When the user sets `prefers-reduced-motion: reduce`, `src/tokens.css` overrides all
`--duration-*` tokens to `0ms` on `:root`:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
  }
}
```

A transition such as `transition: background-color var(--duration-fast) var(--ease-standard)`
then finishes immediately, with no extra CSS. Write durations as tokens, never as raw
`ms` values, so this works everywhere. If you set your own `--duration-*` values, wrap
them in the same media query or put them before `tokens.css`, so the reduced-motion
override still wins.

## Overriding tokens

Load your own stylesheet after `tokens.css` and redefine the tokens you want to change
on `:root`:

```css
:root { --color-primary: #YOUR_COLOR; --radius-md: 0.5rem; --space-3: 0.75rem; }
```

Every rule that uses `var(--color-primary)`, `var(--radius-md)` or `var(--space-3)`
picks up the new values. You can also override tokens on any element to restyle only
that part of the page:

```css
.sidebar { --space-4: 0.75rem; --text-base: 0.875rem; }
```

Two tokens default to another token: `--border-color` is `var(--color-border)` and
`--focus-color` is `var(--color-primary)`. The browser resolves these where they are
defined, on `:root`. If you override `--color-border` or `--color-primary` on `:root`,
they follow automatically. If you override them on a nested element, set
`--border-color` or `--focus-color` on that element too.

If you change `--color-primary`, check that `--color-on-primary` still contrasts at
least 4.5:1 with it, and change `--color-primary-hover` to match. See
[`examples/tokens.html`](../examples/tokens.html) for a working demo.

## For AI agents

- Always write `var(--token)` instead of raw values. Do not hard-code hex colors, `px`
  or `rem` sizes, font stacks, shadows or durations when a token exists.
- Restyle by overriding tokens on `:root`. Do not rewrite component rules.
- Use semantic color tokens for their stated purpose. For example, use
  `--color-danger` for destructive actions, not because you want red.
- If text is placed on `--color-primary`, color it with `--color-on-primary`.

Common requests and the tokens to change:

| Request | Tokens to change | Example |
| --- | --- | --- |
| "More compact" | `--space-1` … `--space-6`, `--control-height`, `--input-height`, optionally `--text-base` | `:root { --space-3: 0.5rem; --space-4: 0.75rem; --space-5: 1rem; --space-6: 1.5rem; --control-height: 2rem; --input-height: 2rem; }` |
| "Rounder" | `--radius-sm`, `--radius-md`, `--radius-lg` | `:root { --radius-sm: 0.5rem; --radius-md: 0.75rem; --radius-lg: 1.25rem; }` |
| "Different accent" | `--color-primary`, `--color-primary-hover`, `--color-on-primary` (`--focus-color` follows `--color-primary`) | `:root { --color-primary: #6b4e8a; --color-primary-hover: #573f71; --color-on-primary: #ffffff; }` |

Keep the spacing scale increasing (`--space-1` < `--space-2` < …) when you change it.

## Verification

`npm test` (or `npm run check:tokens`) runs [`scripts/check-tokens.mjs`](../scripts/check-tokens.mjs). It needs only Node.js and checks that:

- every required token is defined on `:root` in `src/tokens.css`, with no duplicates,
  no color-named tokens (such as `--blue-500`) and no more than 70 tokens in total;
- every defined token has a row in the tables above, and every token in the tables exists;
- the `prefers-reduced-motion: reduce` block sets every `--duration-*` token to `0ms`;
- these contrast ratios meet their minimums:
  - `--color-text` and `--color-text-secondary` on `--color-background` and on `--color-surface`: at least 4.5:1
  - `--color-text-muted` on `--color-background`: at least 4.5:1
  - `--color-on-primary` on `--color-primary`: at least 4.5:1
  - `--focus-color` on `--color-background`: at least 3:1

When you add or rename a token, add it to the matching table in this file in the same change.
