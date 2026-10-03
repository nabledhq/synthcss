# SynthCSS AI Contract

Version: SynthCSS 0.2.0 · contract 1.1.0 · machine-readable twin: synthcss.ai.json

The complete public vocabulary of SynthCSS. Use only the classes and tokens listed here; anything else does not exist.
Load: `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/nabledhq/synthcss@0.2.0/dist/synthcss.min.css">`

## Design Tokens

CSS custom properties on `:root`. Use them through `var()`; restyle by overriding them on `:root`.

Base styles apply `--font-sans`, `--color-text` and `--color-background` to the page and the `--text-*` scale to `h1`–`h4`. Override the tokens to restyle.

- `--color-background` — page background
- `--color-surface` — subtle background for panels, table heads, footers
- `--color-surface-elevated` — background of raised surfaces (cards, buttons)
- `--color-text` — main text
- `--color-text-secondary` — body text of cards and panels
- `--color-text-muted` — hints, metadata, placeholders
- `--color-border` — default border color
- `--color-primary` — brand accent; main actions
- `--color-primary-hover` — hover state of primary elements
- `--color-on-primary` — text on primary or danger fills
- `--color-success` — success status
- `--color-warning` — warning status
- `--color-danger` — errors and destructive actions
- `--color-info` — neutral informational status
- `--space-1` — 0.25rem spacing step
- `--space-2` — 0.5rem spacing step (-sm gaps)
- `--space-3` — 0.75rem spacing step
- `--space-4` — 1rem spacing step (default gap)
- `--space-5` — 1.5rem spacing step
- `--space-6` — 2rem spacing step (-lg gaps)
- `--font-sans` — UI font stack
- `--font-mono` — code font stack
- `--text-sm` — small text
- `--text-base` — body text size
- `--text-lg` — large text, card titles
- `--text-xl` — small headings
- `--text-2xl` — section headings
- `--text-3xl` — page titles
- `--weight-normal` — regular weight
- `--weight-medium` — labels and buttons
- `--weight-semibold` — headings
- `--weight-bold` — strong emphasis
- `--leading-tight` — line height for headings and controls
- `--leading-normal` — line height for body text
- `--leading-relaxed` — line height for long-form text
- `--radius-sm` — small corner radius
- `--radius-md` — default radius (controls, panels)
- `--radius-lg` — card radius
- `--radius-full` — pills and circles
- `--border-width` — default border width
- `--border-color` — default border color (follows `--color-border`)
- `--shadow-sm` — subtle elevation
- `--shadow-md` — card elevation
- `--shadow-lg` — overlay elevation
- `--control-height` — button height
- `--input-height` — text input height
- `--container-width` — max width of `.container`
- `--content-width` — readable text width (.center)
- `--sidebar-width` — sidebar basis in `.sidebar`
- `--grid-min` — minimum column width in `.grid`; override inline per grid
- `--focus-color` — focus ring color
- `--focus-width` — focus ring width
- `--focus-offset` — focus ring offset
- `--duration-fast` — hover and state transitions
- `--duration-normal` — standard transitions
- `--duration-slow` — larger movements; spinner speed
- `--ease-standard` — default easing curve

## Layout Vocabulary

Work on any element. No breakpoints: they adapt to the space they get.

- `.container` — centered page-width wrapper with side padding
- `.stack` — vertical flow with tokenized spacing
- `.stack-sm` — stack with a tighter gap
- `.stack-lg` — stack with a looser gap
- `.cluster` — wrapping row of small items (tags, buttons, links)
- `.cluster-sm` — cluster with a tighter gap
- `.cluster-lg` — cluster with a looser gap
- `.grid` — responsive equal columns, as many as fit (min `--grid-min`)
- `.grid-sm` — grid with a tighter gap
- `.grid-lg` — grid with a looser gap
- `.sidebar` — 1st child narrow side panel, 2nd child main area; stacks when narrow
- `.sidebar-sm` — sidebar with a tighter gap
- `.sidebar-lg` — sidebar with a looser gap
- `.split` — two groups pushed to opposite ends of a row; wraps when tight
- `.split-sm` — split with a tighter gap
- `.split-lg` — split with a looser gap
- `.center` — readable, horizontally centered column of text
- `.cover` — full-viewport-height section, main child vertically centered
- `.cover-main` — the child of `.cover` that is vertically centered

## Component Vocabulary

Naming: component, component-variant, component-part. State comes from attributes, never classes.

- `.button` — an action, on `<button>` or `<a href>`
  - variant `.button-primary` — main action of a form or page
  - variant `.button-secondary` — alternative or cancel action
  - variant `.button-danger` — destructive action (delete, remove)
  - variant `.button-sm` — smaller button
  - variant `.button-lg` — larger button
  - variant `.button-icon` — square icon-only button; needs `aria-label`
- `.field` — one labeled form control with help or error text
  - part `.field-label` — the `<label>` of the control
  - part `.field-help` — hint text under the control
  - part `.field-error` — error message; pair with `aria-invalid="true"`
- `.card` — raised self-contained item (project, product, user)
  - part `.card-header` — title area
  - part `.card-body` — main content; grows to align footers
  - part `.card-footer` — bottom bar on the surface color
  - part `.card-media` — full-width image or video
  - part `.card-actions` — wrapping row of buttons or links
- `.badge` — short status label
  - variant `.badge-success` — positive status
  - variant `.badge-warning` — needs attention
  - variant `.badge-danger` — failed or blocked
  - variant `.badge-info` — neutral information
- `.alert` — message box; `role="status"` or `role="alert"`
  - variant `.alert-info` — neutral information
  - variant `.alert-success` — action succeeded
  - variant `.alert-warning` — needs attention
  - variant `.alert-danger` — error
- `.panel` — flat bordered group of secondary content
  - part `.panel-header` — title area with a bottom border
  - part `.panel-body` — content area
- `.table` — tabular data on a native `<table>`
  - part `.table-wrap` — bordered wrapper that scrolls wide tables; add `tabindex="0"`
  - part `.numeric` — right-aligned tabular-number cell
  - variant `.table-hover` — highlight the hovered row
- `.empty-state` — nothing to show yet: icon, heading, text, action

## Intent Mapping

| Intent | Use |
| --- | --- |
| Page or section wrapper | `.container` |
| Vertical list of blocks | `.stack` |
| Row of tags, buttons or links | `.cluster` |
| Responsive cards or tiles | `.grid` (+ `style="--grid-min: …"`) |
| Side navigation next to content | `.sidebar` |
| Header or toolbar with two ends | `.split` |
| Readable text column | `.center` |
| Full-screen centered page | `.cover` + `.cover-main` |
| Tighter or looser spacing | -sm / -lg on stack, cluster, grid, sidebar, split |
| Main action | `.button button-primary` |
| Destructive action | `.button button-danger` |
| Labeled input with help or error | `.field` + `.field-label` + `.field-help` / `.field-error` |
| Self-contained item | `.card` + parts |
| Status label | `.badge` + `.badge-success` / -warning / -danger / -info |
| Message or notification | `.alert` + `.alert-info` / -success / -warning / -danger |
| Secondary grouped content | `.panel` + `.panel-header` / `.panel-body` |
| Tabular data | `.table-wrap` > `.table`; `.table-hover`, `.numeric` |
| No data yet | `.empty-state` |

## Composition Rules

### Recommended

- Wrap each page in `.container` and give it a `.stack` or `.stack-lg`.
- Nest primitives: `.split` for headers, `.cluster` for button rows, `.grid` of `.card` for collections.
- Combine a component part with a layout primitive on one element, e.g. `class="card-footer split"`.
- Put components on native elements: `<button>`, `<a href>`, `<table>`, `<label>` + `<input>`.
- Wrap every `.table` in `.table-wrap`.

### Avoid

- Margins between siblings; spacing comes from gap variants.
- Wrapper `<div>`s that add no layout intent.
- Restyling a component with extra CSS; override tokens on `:root` instead.
- Classes for state (is-active, disabled); use attributes.
- Visual reordering (order, *-reverse); DOM order is visual order.

## AI Generation Rules

1. Use only the classes and tokens in this contract; never invent class names.
2. Build structure from layout primitives and nest them; never write custom flex or grid CSS.
3. Set spacing with the -sm / -lg gap variants, never with margins or utility classes.
4. Never use inline styles except a token override such as `style="--grid-min: 12rem"`.
5. In any custom CSS, reference tokens with `var()`; never hard-code colors, px/rem sizes, shadows or durations.
6. Put components on semantic native elements and keep one component per element.
7. Express state with attributes: `disabled`, `aria-disabled="true"`, `aria-busy="true"`, `aria-invalid="true"`.
8. Pick variants by meaning, not look: `button-danger` for destructive actions, `badge-success` for success.
9. Write no media queries or breakpoint classes; primitives adapt to the space they get.
10. Keep it accessible: `aria-label` on `.button-icon`, `role="status"` or `role="alert"` on `.alert`, a `<label for>` on every control.

## Valid Examples

Page: container + stack, split header, grid of cards with a status badge.

```html
<main class="container stack-lg">
  <header class="split">
    <h1>Projects</h1>
    <button type="button" class="button button-primary">New project</button>
  </header>
  <ul class="grid" role="list">
    <li class="card">
      <div class="card-header"><h2>Atlas</h2></div>
      <div class="card-body">Design system migration.</div>
      <div class="card-footer split-sm"><span class="badge badge-success">Active</span></div>
    </li>
  </ul>
</main>
```

Form: field with an error from aria-invalid, actions in a cluster.

```html
<form class="card">
  <div class="field">
    <label class="field-label" for="email">Email</label>
    <input id="email" type="email" aria-invalid="true" aria-describedby="email-error">
    <p class="field-error" id="email-error">Enter a full email address.</p>
  </div>
  <div class="cluster-sm">
    <button type="submit" class="button button-primary">Save</button>
    <button type="button" class="button">Cancel</button>
  </div>
</form>
```

Data view: split header with an action, scrollable table with status badges.

```html
<section class="stack">
  <header class="split">
    <h3>Team</h3>
    <button type="button" class="button button-primary">Invite</button>
  </header>
  <div class="table-wrap" tabindex="0">
    <table class="table">
      <thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Ana</td><td>Admin</td><td><span class="badge badge-success">Active</span></td></tr>
        <tr><td>Ben</td><td>Editor</td><td><span class="badge badge-warning">Invited</span></td></tr>
      </tbody>
    </table>
  </div>
</section>
```

## Invalid / Discouraged Examples

Never generate these. Each line: wrong markup — why — what to use instead.

- `<div class="flex-row-gap-large-center">…</div>` — Invented class. Use .cluster-lg.
- `<div style="display:flex; gap:16px">…</div>` — Inline flex and gap. Use .cluster.
- `<button class="btn btn-primary">Save</button>` — Another framework's names. Use .button and .button-primary.
- `<span class="badge badge-red">Failed</span>` — Color-named variant. Use .badge and .badge-danger.
- `<p class="mt-4">Saved.</p>` — Spacing utility. Use .stack on the parent.
