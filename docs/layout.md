# Layout primitives

SynthCSS ships eight layout classes in [`src/layout.css`](../src/layout.css). Each one
names a layout intent: "stack these", "put these in a grid", "sidebar next to content".
Use them instead of writing flexbox or grid rules yourself.

Load the main bundle, which includes the [design tokens](tokens.md) and the layout primitives:

```html
<link rel="stylesheet" href="synthcss/src/synthcss.css">
```

How the primitives behave:

- **Intrinsic.** They respond to the width of their parent, not to the viewport. They
  use flexbox, grid, `min()`, `clamp()`, `minmax()` and `auto-fit`. There are no media
  queries and no breakpoint classes such as `md:grid-3`.
- **Token-based.** Every gap, padding and width is a token from `tokens.css`. Change
  `--space-4` and every default gap changes with it.
- **DOM order is visual order.** Nothing uses `order`, `*-reverse` or grid placement,
  so keyboard and screen reader order always match what is on screen.
- **Any element.** Put the classes on `div`, `nav`, `main`, `section`, `ul` and so on.
  They never look at the tag names of the children. On `ul` and `ol`, the gap-based
  primitives remove bullets and indent; add `role="list"` to keep list semantics in
  Safari/VoiceOver.
- **Gap, not margins.** The gap-based primitives set the spacing between children
  with `gap` and remove the block margins of direct children (for example the default
  margins of `<p>` and `<h2>`). This reset has zero specificity, so any rule you write
  wins. Because spacing belongs to the parent, primitives nest without leaking margins
  or gaps into each other.
- **Variants.** Only the gap-based primitives have variants: `-sm` uses `--space-2`,
  the default uses `--space-4` and `-lg` uses `--space-6`. A variant works on its own
  (`class="stack-lg"`) or next to the base class (`class="stack stack-lg"`).

Tokens used by the layout primitives:

| Token | Default | Used by |
| --- | --- | --- |
| `--container-width` | `72rem` | `.container` maximum width |
| `--content-width` | `42rem` | `.center` maximum inline size |
| `--sidebar-width` | `16rem` | `.sidebar` first child's preferred width |
| `--grid-min` | `16rem` | `.grid` minimum column width |
| `--space-2`, `--space-4`, `--space-6` | `0.5rem`, `1rem`, `2rem` | `-sm`, default and `-lg` gaps; `.container` padding (`--space-4` to `--space-6`) |

They are documented with the other tokens in [tokens.md](tokens.md#sizing). Override them
on `:root`, or on one element to change only that layout:

```html
<div class="grid" style="--grid-min: 12rem">…</div>
```

## AI Layout Vocabulary

Paste this table into a model's context.

| Intent | Class |
| --- | --- |
| Page-width wrapper, centered, with side padding | `.container` |
| Vertical list of blocks with even spacing | `.stack` |
| Row of small items that wraps (tags, buttons, links) | `.cluster` |
| Responsive cards or tiles, as many columns as fit | `.grid` |
| Narrow side panel next to main content, stacks when narrow | `.sidebar` (sidebar is the 1st child, main the 2nd) |
| Two groups pushed to opposite ends (header bar, toolbar) | `.split` |
| Readable, horizontally centered column of text | `.center` |
| Full-viewport-height section with vertically centered content | `.cover` (+ `.cover-main` on the centered child) |
| Tighter / looser spacing | add `-sm` / `-lg`: `stack`, `cluster`, `grid`, `sidebar`, `split` only |

Rules: no breakpoints, no `order`, no margins between children; nest primitives instead.

## `.container`

### Purpose

The outer wrapper of a page or a page section. It is centered, never wider than
`--container-width`, and keeps content away from the screen edges with padding.

### HTML example

```html
<main class="container">
  <h1>Settings</h1>
  …
</main>
```

### Variants

None. To change the width, override `--container-width`.

### Responsive behavior

Below `--container-width` it is the full width of its parent. Above that, it stops
growing and is centered with `margin-inline: auto`. Side padding is fluid:
`clamp(var(--space-4), 4vw, var(--space-6))`, so it grows from 1rem on phones to 2rem
on large screens. The padding is included in the maximum width (`box-sizing: border-box`).

### Recommended uses

- The `main` element, or each full-width band of a landing page (put the background on
  an outer element and `.container` inside it).
- Header and footer content that must line up with the page content.

### Common misuses

- Nesting a `.container` inside another `.container`. The padding is applied twice.
- Using it to narrow text. Use `.center` for readable text columns.
- Adding your own `max-width` or side margins. Override `--container-width` instead.

## `.stack`

### Purpose

Children placed one below the other with an even gap. This is the most common layout.

### HTML example

```html
<form class="stack">
  <label>Email <input type="email"></label>
  <label>Password <input type="password"></label>
  <button type="submit">Sign in</button>
</form>
```

### Variants

`.stack-sm` (`--space-2`), `.stack` (`--space-4`), `.stack-lg` (`--space-6`).

### Responsive behavior

A flex column; the same at every width. Children keep their normal width: block
elements fill the stack's width, as they would in normal flow, and the stack never
grows, shrinks or reorders them.

### Recommended uses

- Form fields, article content, card content, sidebar navigation links.
- Page sections: `<main class="container stack-lg">`.

### Common misuses

- Adding margins to children to space them. The gap already does this.
- Using a stack for items that should sit in a row. Use `.cluster` or `.split`.
- Expecting a button in a stack to keep its content width. Flex items stretch across
  the stack; wrap the button in a `.cluster` to keep it narrow.

## `.cluster`

### Purpose

A row of small items that wraps onto more lines when it runs out of space. Items are
vertically centered against each other.

### HTML example

```html
<ul class="cluster" role="list">
  <li><a href="/docs">Docs</a></li>
  <li><a href="/blog">Blog</a></li>
  <li><a href="/pricing">Pricing</a></li>
</ul>
```

### Variants

`.cluster-sm` (`--space-2`), `.cluster` (`--space-4`), `.cluster-lg` (`--space-6`).
The gap is the same between items and between wrapped lines.

### Responsive behavior

Items stay in one row while they fit, then wrap (`flex-wrap: wrap`). Items keep their
own width; they do not stretch.

### Recommended uses

- Tags, badges, chips, button groups, inline navigation, form actions, avatars.

### Common misuses

- Card grids. Use `.grid`, which gives equal-width columns.
- Pushing items to opposite ends. Use `.split`.
- Putting long text paragraphs in it. Each item is only as wide as its content.

## `.grid`

### Purpose

Equal-width columns. It fits as many columns as possible, each at least `--grid-min`
wide, and drops columns as space gets smaller.

### HTML example

```html
<ul class="grid" role="list">
  <li class="card">…</li>
  <li class="card">…</li>
  <li class="card">…</li>
</ul>
```

### Variants

`.grid-sm` (`--space-2`), `.grid` (`--space-4`), `.grid-lg` (`--space-6`).

### Responsive behavior

`grid-template-columns: repeat(auto-fit, minmax(min(var(--grid-min), 100%), 1fr))`.
With the default `--grid-min` of 16rem it shows one column on a 375px phone and three or
four on a 1280px desktop, depending on the space around the grid. `min(…, 100%)` means a column is never wider than the grid, so
it never overflows a narrow parent. Columns stretch to fill the row; with fewer items
than columns, the items share the full width.

### Recommended uses

- Card lists, product tiles, feature lists, dashboards of stat panels, image galleries.
- Change the column size for one grid with `style="--grid-min: 12rem"`.

### Common misuses

- Asking for an exact number of columns. The grid chooses the count from the space;
  change `--grid-min` instead.
- Placing items with `grid-column` or `grid-row`. That breaks DOM order.
- Using it for a sidebar layout with unequal columns. Use `.sidebar`.

## `.sidebar`

### Purpose

Two children side by side: a narrow sidebar (first child) and a main area (second
child) that takes the rest of the space. When there is not enough room, they stack.

### HTML example

```html
<div class="sidebar">
  <nav class="stack">…</nav>
  <main class="stack">…</main>
</div>
```

### Variants

`.sidebar-sm` (`--space-2`), `.sidebar` (`--space-4`), `.sidebar-lg` (`--space-6`).

### Responsive behavior

The first child has a basis of `--sidebar-width`. The second child grows to fill the
row and must be at least 50% of the layout wide. When both no longer fit on one row,
`flex-wrap` puts the main area under the sidebar and both become full width. This
happens from the layout's own width, so a `.sidebar` inside a narrow column stacks
even on a wide screen. There are no media queries. The sidebar always comes first, in
the DOM and on screen.

### Recommended uses

- Settings pages and docs with a navigation list next to the content.
- An image or avatar next to text (media object).
- A filter panel next to search results.

### Common misuses

- Putting more than two children in it. Wrap extra content in one of the two children.
- Putting the sidebar second in the DOM to show it on the right. Order is never
  changed; the first child is always the sidebar.
- Setting a fixed `width` on the main area. It sizes itself.

## `.split`

### Purpose

Two groups pushed to opposite ends of a row, for example a title on the left and
actions on the right.

### HTML example

```html
<header class="split">
  <a href="/">Brand</a>
  <nav class="cluster">…</nav>
</header>
```

### Variants

`.split-sm` (`--space-2`), `.split` (`--space-4`), `.split-lg` (`--space-6`).
The gap is the minimum space between the groups.

### Responsive behavior

`justify-content: space-between` places the first child at the start and the last at
the end; items are vertically centered. When the groups do not fit on one row, the
second wraps under the first and starts at the left edge. It never overflows.

### Recommended uses

- Site headers, card headers (title and menu), table toolbars, footers (copyright and
  links), "label ... value" rows.

### Common misuses

- Using it for more than two or three children. Space is shared between every child;
  group items into a `.cluster` first.
- Using it for equal columns. Use `.grid`.

## `.center`

### Purpose

A readable column of content that is never wider than `--content-width` and is centered
horizontally in its parent.

### HTML example

```html
<article class="center stack">
  <h1>Release notes</h1>
  <p>…</p>
</article>
```

### Variants

None. Override `--content-width` to change the width.

### Responsive behavior

Narrower than `--content-width`, it fills its parent. Wider, it stops at
`--content-width` and is centered with `margin-inline: auto`. It uses
`box-sizing: content-box`, so padding you add is outside the measure and the text
column keeps its width. It centers the box, not the text inside it.

### Recommended uses

- Articles, blog posts, documentation pages, sign-in forms, empty states.
- Inside a `.container`, to give long text a comfortable line length.

### Common misuses

- Expecting it to center text. Add `text-align: center` yourself if you want that.
- Expecting it to center vertically. Use `.cover`.
- Adding side padding without accounting for it; the box gets wider by the padding.

## `.cover`

### Purpose

A section at least as tall as the viewport with its main content vertically centered,
and optional content at the top and bottom.

### HTML example

```html
<section class="cover">
  <header>…</header>
  <div class="cover-main center stack">
    <h1>Welcome</h1>
    <a href="/start">Get started</a>
  </div>
  <footer>…</footer>
</section>
```

### Variants

None. Mark the centered child with `.cover-main`. If the cover has only one child, that
child is centered without the class.

### Responsive behavior

`min-block-size: 100vh`, and `100dvh` in browsers that support it, so mobile browser
toolbars do not cut it off. It has no fixed height, so it grows if the content is
taller than the screen. `.cover-main` gets `margin-block: auto`, which centers it
vertically; other children sit at the top and bottom, separated by `--space-4`.

### Recommended uses

- Landing page heroes, sign-in pages, error and empty-state pages, splash screens.

### Common misuses

- Setting a fixed `height`. Content then overflows on small screens.
- Putting more than one `.cover-main` in it.
- Using it for horizontal centering. Combine it with `.center` for that.

## Nesting

Primitives compose. Each controls only the space between its own direct children, so
nested primitives do not leak gaps or margins into each other:

```html
<div class="sidebar-lg">
  <nav class="stack-sm">…</nav>
  <main class="container stack">
    <header class="split">
      <h1>Reports</h1>
      <div class="cluster-sm"><button>Export</button><button>New</button></div>
    </header>
    <ul class="grid" role="list">
      <li class="stack-sm">…</li>
      <li class="stack-sm">…</li>
    </ul>
  </main>
</div>
```

## Verification

- `npm test` runs [`scripts/check-layout.mjs`](../scripts/check-layout.mjs). It needs only
  Node.js and checks that every primitive and every `-sm`/`-lg` variant is defined, that
  no other classes, media queries or order-changing properties exist, that spacing and
  sizes use `var(--token)` values defined in `tokens.css`, that `src/synthcss.css`
  bundles the file, that this page covers every primitive with all six sections and the
  vocabulary table, and that the fixture uses every class.
- [`examples/layout.html`](../examples/layout.html) shows every primitive and variant in
  a 375px frame and in a full-width frame, plus a nested example. Open it in a browser
  and also resize the window to about 375px and about 1280px wide (or use device
  emulation in the browser developer tools). Frames can be resized by dragging their
  bottom-right corner.
- `npm run check:layout:browser` loads the fixture in headless Chromium at 375px and
  1280px and checks that the grid drops columns, the sidebar stacks, the cluster and
  split wrap and nothing overflows horizontally. It needs Playwright, which is not a
  dependency of this repository: run `npm install --no-save playwright` and
  `npx playwright install chromium` first.
