# SynthCSS AI Contract

Version: SynthCSS 0.7.0 · contract 1.1.0 · machine-readable twin: synthcss.ai.json

The complete public vocabulary of SynthCSS. Use only the classes and tokens listed here; anything else does not exist.
Load: `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/nabledhq/synthcss@0.7.0/dist/synthcss.min.css">`

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
- `--color-accent` — decorative violet with no status meaning (avatar tiles)
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
- `.sidebar-end` — with a sidebar class: last child is the narrow column (right), 1st child the main area
- `.split` — two groups pushed to opposite ends of a row; wraps when tight
- `.split-sm` — split with a tighter gap
- `.split-lg` — split with a looser gap
- `.center` — readable, horizontally centered column of text
- `.cover` — full-viewport-height section, main child vertically centered
- `.cover-main` — the child of `.cover` that is vertically centered

## Component Vocabulary

Naming: component, component-variant, component-part. State comes from attributes, never classes.
One state attribute each: current nav link `aria-current="page"`; selected tab `role="tab"` + `aria-selected="true"` (others `"false"`). Never `aria-pressed` or state classes (active, is-active, selected).

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
- `.switch` — on/off toggle: `<label class="switch"><input type="checkbox" role="switch"> Text</label>`; state from `checked` / `disabled`
- `.input-group` — one `<input>` joined with `.button` and/or `<select>` children; shared borders, outer corners rounded; put in `.field` for a label
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
  - part `.alert-icon` — leading `<svg aria-hidden="true">` as a direct child; sits left of the content, top-aligned
- `.panel` — flat bordered group of secondary content
  - part `.panel-header` — title area with a bottom border
  - part `.panel-body` — content area
- `.table` — tabular data on a native `<table>`
  - part `.table-wrap` — bordered wrapper that scrolls wide tables; add `tabindex="0"`
  - part `.numeric` — right-aligned tabular-number cell
  - variant `.table-hover` — highlight the hovered row
- `.empty-state` — nothing to show yet: icon, heading, text, action
- `.nav` — list reset for navigation links on `<ul>`; add `.stack-sm` (vertical) or `.cluster-sm` (horizontal)
  - part `.nav-link` — an `<a href>` in `.nav`, optional leading `<svg>`; current page: `aria-current="page"`
- `.tabs` — tab list or segmented filter; `role="tablist"` + `aria-label`; wraps when narrow. CSS only: arrow keys and panel switching are your script
  - part `.tabs-item` — `<button role="tab">`; selected: `aria-selected="true"`, others `aria-selected="false"`
- `.avatar` — fixed square for initials, a photo or an icon, on `<span>`, `<div>` or `<img>`
  - variant `.avatar-round` — circle; usual for people
  - variant `.avatar-sm` — smaller (0.75× `--control-height`)
  - variant `.avatar-lg` — larger (1.5× `--control-height`)
  - variant `.avatar-primary` — primary tint
  - variant `.avatar-success` — success tint
  - variant `.avatar-warning` — warning tint
  - variant `.avatar-danger` — danger tint
  - variant `.avatar-info` — info tint
  - variant `.avatar-accent` — violet tint with no status meaning

## Intent Mapping

| Intent | Use |
| --- | --- |
| Page or section wrapper | `.container` |
| Vertical list of blocks | `.stack` |
| Row of tags, buttons or links | `.cluster` |
| Responsive cards or tiles | `.grid` (+ `style="--grid-min: …"`) |
| Side navigation next to content | `.sidebar` |
| Main content with a narrow side column on the right | `.sidebar` (or -sm/-lg) + `.sidebar-end` |
| Header or toolbar with two ends | `.split` |
| Readable text column | `.center` |
| Full-screen centered page | `.cover` + `.cover-main` |
| Tighter or looser spacing | -sm / -lg on stack, cluster, grid, sidebar, split |
| Main action | `.button button-primary` |
| Destructive action | `.button button-danger` |
| Labeled input with help or error | `.field` + `.field-label` + `.field-help` / `.field-error` |
| On/off setting | `.switch` on a `<label>` around `<input type="checkbox" role="switch">` |
| Input with an attached button or select | `.input-group` |
| Self-contained item | `.card` + parts |
| Status label | `.badge` + `.badge-success` / -warning / -danger / -info |
| Message or notification | `.alert` + `.alert-info` / -success / -warning / -danger; optional `.alert-icon` |
| Secondary grouped content | `.panel` + `.panel-header` / `.panel-body` |
| Tabular data | `.table-wrap` > `.table`; `.table-hover`, `.numeric` |
| No data yet | `.empty-state` |
| Navigation links | `.nav` + `.nav-link` |
| Tabs or segmented filter | `.tabs` + `.tabs-item` |
| Person initials or photo | `.avatar` / `.avatar-round` |
| Icon on a tinted tile | `.avatar` + `.avatar-primary` / -success / -warning / -danger / -info / -accent |

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
- `aria-pressed` or classes for the current link or selected tab; use `aria-current="page"` on `.nav-link`, `aria-selected="true"` on `.tabs-item`.

## AI Generation Rules

1. Use only the classes and tokens in this contract; never invent class names.
2. Build structure from layout primitives and nest them; never write custom flex or grid CSS.
3. Set spacing with the -sm / -lg gap variants, never with margins or utility classes.
4. Never use inline styles except a token override such as `style="--grid-min: 12rem"`.
5. In any custom CSS, reference tokens with `var()`; never hard-code colors, px/rem sizes, shadows or durations.
6. Put components on semantic native elements and keep one component per element.
7. Express state with attributes: `disabled`, `checked`, `aria-disabled="true"`, `aria-busy="true"`, `aria-invalid="true"`, `aria-current="page"` (nav), `aria-selected="true"` (tabs).
8. Pick variants by meaning, not look: `button-danger` for destructive actions, `badge-success` for success.
9. Write no media queries or breakpoint classes; primitives adapt to the space they get.
10. Keep it accessible: `aria-label` on `.button-icon`, `role="status"` or `role="alert"` on `.alert`, a `<label for>` on every control.

## Valid Examples

Page: container + stack, split header with nav, tabs filter beside the main action, grid of cards with a status badge.

```html
<main class="container stack-lg">
  <header class="split">
    <h1>Projects</h1>
    <nav aria-label="Main">
      <ul class="nav cluster-sm" role="list">
        <li><a class="nav-link" href="/projects" aria-current="page">Projects</a></li>
        <li><a class="nav-link" href="/team">Team</a></li>
      </ul>
    </nav>
  </header>
  <div class="split">
    <div class="tabs" role="tablist" aria-label="Filter projects">
      <button type="button" class="tabs-item" role="tab" aria-selected="true">Active</button>
      <button type="button" class="tabs-item" role="tab" aria-selected="false">Archived</button>
    </div>
    <button type="button" class="button button-primary">New project</button>
  </div>
  <ul class="grid" role="list">
    <li class="card">
      <div class="card-header"><h2>Atlas</h2></div>
      <div class="card-body">Design system migration.</div>
      <div class="card-footer split-sm"><span class="badge badge-success">Active</span></div>
    </li>
  </ul>
</main>
```

Form: field with an error from aria-invalid, an invite link with a Copy button, a switch, actions in a cluster.

```html
<form class="card">
  <div class="field">
    <label class="field-label" for="email">Email</label>
    <input id="email" type="email" aria-invalid="true" aria-describedby="email-error">
    <p class="field-error" id="email-error">Enter a full email address.</p>
  </div>
  <div class="field">
    <label class="field-label" for="invite">Invite link</label>
    <div class="input-group"><input id="invite" type="url" readonly value="https://example.com/i/4f2a"><button type="button" class="button">Copy</button></div>
  </div>
  <label class="switch"><input type="checkbox" role="switch" checked> Require admin approval</label>
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

Dashboard: main content first, narrow column on the right; an alert with an icon, an icon tile in a card, and people as avatars.

```html
<div class="sidebar-lg sidebar-end" style="--sidebar-width: 20rem">
  <main class="stack">
    <h1>Dashboard</h1>
    <div class="alert alert-info" role="status">
      <svg class="alert-icon" aria-hidden="true" viewBox="0 0 24 24">…</svg>
      <p>Billing moves to the 1st of each month.</p>
    </div>
    <div class="grid">
      <div class="card">
        <div class="cluster-sm"><span class="avatar avatar-accent"><svg aria-hidden="true" viewBox="0 0 24 24">…</svg></span><h2>Revenue</h2></div>
        <p>$12,400 this month.</p>
      </div>
      <div class="card">…</div>
    </div>
  </main>
  <aside class="panel">
    <div class="panel-header"><h2>Activity</h2></div>
    <ul class="panel-body stack-sm" role="list">
      <li class="cluster-sm"><span class="avatar avatar-round avatar-sm avatar-primary" aria-hidden="true">AL</span><span>Ana merged #42</span></li>
      <li class="cluster-sm"><img class="avatar avatar-round avatar-sm" src="/ben.jpg" alt=""><span>Ben joined</span></li>
    </ul>
  </aside>
</div>
```

## Invalid / Discouraged Examples

Never generate these. Each line: wrong markup — why — what to use instead.

- `<div class="flex-row-gap-large-center">…</div>` — Invented class. Use .cluster-lg.
- `<div style="display:flex; gap:16px">…</div>` — Inline flex and gap. Use .cluster.
- `<button class="btn btn-primary">Save</button>` — Another framework's names. Use .button and .button-primary.
- `<span class="badge badge-red">Failed</span>` — Color-named variant. Use .badge and .badge-danger.
- `<p class="mt-4">Saved.</p>` — Spacing utility. Use .stack on the parent.
- `<a class="nav-link active" href="/team">Team</a>` — State class. Use .nav-link with aria-current="page".
- `<button class="tabs-item" aria-pressed="true">Week</button>` — aria-pressed for a tab. Use .tabs-item with role="tab" and aria-selected="true".
- `<span class="user-avatar rounded-full">AL</span>` — Invented classes. Use .avatar and .avatar-round.
