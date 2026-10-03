# Components

SynthCSS ships eight semantic components in [`src/components.css`](../src/components.css):
`.button`, `.field`, `.card`, `.badge`, `.alert`, `.panel`, `.table` and `.empty-state`.
Each one names a UI intent, so a model can map a request ("a delete button", "an
error message", "a table of invoices") to one predictable class.

They are part of the main bundle, together with the [design tokens](tokens.md) and the
[layout primitives](layout.md):

```html
<link rel="stylesheet" href="synthcss/src/synthcss.css">
```

How the components behave:

- **Token-based.** Every color, space, radius, font size, weight and shadow is a
  `var(--token)` from `tokens.css`. There are no color literals: status tints such as the
  badge and alert backgrounds are a `color-mix()` of two tokens. Override tokens on
  `:root` to restyle every component at once.
- **Naming.** `.component` for the base, `.component-variant` for a variant
  (`.button-danger`) and `.component-part` for a part (`.card-header`). The one
  exception is the `.numeric` table cell.
- **State from native attributes, not classes.** Use `disabled`,
  `aria-disabled="true"`, `aria-busy="true"` and `aria-invalid="true"`. There is no
  `.is-disabled`, `.button-loading` or `.field-invalid`.
- **Native elements.** Put `.button` on `<button>` or `<a>`, `.table` on `<table>`, and
  native `input`, `select` and `textarea` inside `.field`. Native focus and keyboard
  behavior are kept.
- **Focus.** Buttons, field controls and a focusable `.table-wrap` show a
  `:focus-visible` ring made of `--focus-width`, `--focus-color` and `--focus-offset`.
- **Disabled.** Disabled buttons and controls are faded and show a `not-allowed`
  cursor. The variant color stays recognizable, so a disabled danger button still looks
  like a danger button.
- **Responsive.** Components size to their container. Buttons and badges never grow
  wider than their parent, fields fill their column, and tables scroll inside
  `.table-wrap`. There are no media queries.
- **Composable.** Parts never set a layout, so you can add a layout primitive to them:
  `class="card-footer split"`, `class="card-body stack"`. Arbitrary headings and
  paragraphs inside cards, panels, alerts and empty states lose their outer margins and
  are spaced by the component.
- **No JavaScript.**

## AI Component Reference

Paste this table into a model's context together with the
[AI Layout Vocabulary](layout.md#ai-layout-vocabulary).

| Intent | Markup |
| --- | --- |
| Main action of a form or page | `<button class="button button-primary">` |
| Secondary or cancel action | `.button button-secondary`, or plain `.button` |
| Destructive action (delete, remove) | `.button button-danger` |
| Icon-only action | `.button button-icon` + `aria-label="…"` |
| Smaller or larger button | add `.button-sm` / `.button-lg` |
| Unavailable or in-progress action | `disabled` or `aria-disabled="true"`; `aria-busy="true"` |
| Labeled input with help or error text | `.field` > `.field-label` + native control + `.field-help` / `.field-error` |
| Invalid input | `aria-invalid="true"` on the control + `.field-error` text |
| Self-contained item (project, product, user) | `.card` with `.card-header`, `.card-body`, `.card-footer`, `.card-media`, `.card-actions` |
| Short status label | `.badge` + `.badge-success` / `-warning` / `-danger` / `-info` |
| Message or notification | `.alert` + `.alert-info` / `-success` / `-warning` / `-danger`, `role="status"` or `role="alert"` |
| Flat group of secondary content | `.panel` with `.panel-header`, `.panel-body` |
| Tabular data | `<table class="table">` inside `.table-wrap`; `.table-hover`, `.numeric` cells |
| Nothing to show yet | `.empty-state` with heading, text and an optional action |

Rules: state comes from attributes, never from classes; put components on native
elements; arrange them with `.stack`, `.cluster`, `.split` and `.grid`.

## `.button`

### Purpose

An action. Put it on a native `<button>` for actions and on `<a href>` for navigation
that should look like a button.

### Example

```html
<div class="cluster-sm">
  <button type="submit" class="button button-primary">Save</button>
  <button type="button" class="button button-secondary">Cancel</button>
</div>
```

### Variants

| Class or attribute | Use |
| --- | --- |
| `.button` | Neutral default: bordered, on the elevated surface. |
| `.button-primary` | The main action. Filled with `--color-primary`. |
| `.button-secondary` | An alternative action. Outlined in `--color-primary`. |
| `.button-danger` | A destructive action. Filled with `--color-danger`. |
| `.button-sm`, `.button-lg` | 0.8× and 1.2× `--control-height`, with smaller or larger text. |
| `.button-icon` | A square, icon-only button. Combines with the sizes and colors. |
| `disabled` / `aria-disabled="true"` | Faded, `not-allowed` cursor, no hover change. |
| `aria-busy="true"` | Loading: ignores pointer input and shows a spinning ring after the label. |

Icons: an inline `<svg>` (or `<img>`) inside the button is sized to `1em` and separated
from the label by `--space-2`:

```html
<button type="button" class="button button-primary">
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">…</svg>
  New project
</button>
<button type="button" class="button button-icon" aria-label="Delete project">
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">…</svg>
</button>
<button type="submit" class="button button-primary" aria-busy="true">Saving…</button>
```

### Composition

Group buttons with `.cluster` (wrapping row) and push a group to the end of a bar with
`.split`:

```html
<header class="split">
  <h1>Projects</h1>
  <div class="cluster-sm">
    <a class="button button-secondary" href="/import">Import</a>
    <button type="button" class="button button-primary">New project</button>
  </div>
</header>
```

### Accessibility

- `.button-icon` has no visible text, so it must have an `aria-label` (or visually
  hidden text). Mark the icon `aria-hidden="true"`.
- `disabled` removes the button from the tab order. Use `aria-disabled="true"` when the
  button must stay focusable (for example to show a tooltip explaining why). CSS cannot
  stop activation of an `aria-disabled` button or of a busy button by keyboard, so the
  app must ignore it; on a link, also remove `href`.
- Keep a text label while loading (for example "Saving…"); the spinner is decorative and
  stays still when the user asks for reduced motion.
- Use `<button type="button">` for actions that are not form submissions.

### Recommended use

- One `.button-primary` per form or view; everything else secondary or default.
- `.button-danger` only for actions that destroy or remove data.
- Start labels with a verb: "Save changes", "Delete project".

### Misuse

- `<div class="button">` or `<span class="button">`: not focusable and not announced as a
  button. Use `<button>`.
- Classes that do not exist, such as `button-destructive` or `button-loading`: use
  `.button-danger` and `aria-busy="true"`.
- An icon-only button without `aria-label`.

## `.field`

### Purpose

One form control with its label, optional help text and optional error message.
Native controls are only styled **inside** `.field`: SynthCSS does not restyle form
elements globally. Styled controls: `input` with no type or with type `text`, `email`,
`password` or `number`, plus `textarea`, `select`, `checkbox` and `radio`.

### Example

```html
<div class="field">
  <label class="field-label" for="email">Email</label>
  <input id="email" type="email" autocomplete="email" aria-describedby="email-help">
  <p class="field-help" id="email-help">We send the receipt here.</p>
</div>
```

### Variants

| Part or state | Use |
| --- | --- |
| `.field-label` | The `<label>` (or `<legend>` in a fieldset). |
| `.field-help` | Hint text under the control, in `--color-text-muted`. |
| `.field-error` | Error message in `--color-danger`, with a "!" marker in front. |
| `aria-invalid="true"` | Error state of the control: a thicker danger border with a heavy start edge. |
| `disabled` | Faded control on `--color-surface` with a `not-allowed` cursor; the label is muted. |

The error state never relies on color alone: the border gets thicker, and the
`.field-error` message adds text and a marker.

```html
<div class="field">
  <label class="field-label" for="name">Name</label>
  <input id="name" type="text" aria-invalid="true" aria-describedby="name-error">
  <p class="field-error" id="name-error">Enter your name.</p>
</div>
```

Checkboxes and radios go inside their label. Group several with
`<fieldset class="field">` and a `<legend class="field-label">`:

```html
<fieldset class="field">
  <legend class="field-label">Visibility</legend>
  <label><input type="radio" name="visibility" checked> Private</label>
  <label><input type="radio" name="visibility"> Public</label>
</fieldset>
```

### Composition

Put fields in a `.stack` form, place short fields side by side with `.grid`, and the
buttons in a `.cluster`:

```html
<form class="stack">
  <div class="grid" style="--grid-min: 14rem">
    <div class="field"><label class="field-label" for="first">First name</label><input id="first" type="text"></div>
    <div class="field"><label class="field-label" for="last">Last name</label><input id="last" type="text"></div>
  </div>
  <div class="cluster-sm"><button type="submit" class="button button-primary">Save</button></div>
</form>
```

### Accessibility

- Every control needs a label: `<label for>` pointing at the control's `id`, or a label
  wrapping a checkbox or radio.
- Connect help and error text with `aria-describedby`.
- Set `aria-invalid="true"` only after the user has entered or submitted a value, and
  remove it when the value is fixed.
- Controls keep their native focus and keyboard behavior; the focus ring uses
  `--focus-color`.

### Recommended use

- One `.field` per control (or per checkbox or radio group).
- Use the matching input `type` and `autocomplete` value; mobile keyboards depend on it.

### Misuse

- A control outside `.field`: it keeps the browser's default look.
- Using a placeholder instead of a `.field-label`.
- Showing an error only by making the border red: add `aria-invalid="true"` and a
  `.field-error` message.

## `.card`

### Purpose

A raised, self-contained block for one item: a project, a product, a user, a summary.
Optional parts, in any order: `.card-media`, `.card-header`, `.card-body`,
`.card-actions`, `.card-footer`.

### Example

```html
<article class="card">
  <header class="card-header">
    <h3>Atlas</h3>
    <p>Updated 2 hours ago</p>
  </header>
  <div class="card-body"><p>Customer analytics dashboard.</p></div>
  <div class="card-actions">
    <a class="button button-primary" href="/atlas">Open</a>
    <button type="button" class="button">Share</button>
  </div>
  <footer class="card-footer">3 members</footer>
</article>
```

### Variants

| Part | Use |
| --- | --- |
| `.card` | Elevated surface, border, `--radius-lg`, `--shadow-md`, `--space-5` padding; children are spaced by `--space-4`. |
| `.card-media` | Image or illustration across the full card width; at the top or bottom it also covers the padding. Use it on a wrapper or directly on `<img>`. |
| `.card-header` | Title area: headings use `--text-lg`, paragraphs are small and muted. |
| `.card-body` | Main text; grows so footers line up across a row of cards. |
| `.card-actions` | A wrapping row of buttons or links. |
| `.card-footer` | Full-width strip on `--color-surface` with a top border, for metadata. |

A card without parts works too: `<div class="card"><h3>…</h3><p>…</p></div>`.

### Composition

Lay out cards with `.grid`. Parts accept layout primitives, for example a header with a
badge on the right (`.split`) or a footer with text and actions:

```html
<ul class="grid" role="list">
  <li class="card">
    <div class="card-header split-sm"><h3>Production</h3><span class="badge badge-success">Healthy</span></div>
    <p class="card-body">Deployed 2 hours ago</p>
    <footer class="card-footer split-sm">
      <span>v2.4.1</span>
      <div class="card-actions"><button type="button" class="button button-sm">Logs</button></div>
    </footer>
  </li>
</ul>
```

### Accessibility

- Use a heading inside `.card-header` so screen reader users can jump between cards.
- Use `<article>` for stand-alone items and `<li>` when cards are in a list
  (`<ul class="grid" role="list">`).
- Give `.card-media` images a meaningful `alt`, or `alt=""` when decorative.
- Avoid making the whole card a link with nested buttons inside; put the link on the
  heading or in `.card-actions`.

### Recommended use

Items in a collection, dashboards, summaries, and forms that need visual weight (a
`<form class="card">`).

### Misuse

- Nesting a `.card` inside a `.card`: use a `.panel` inside instead.
- Cards for every block on a page; plain sections or `.panel` are lighter.

## `.badge`

### Purpose

A short, non-interactive label for status, counts or categories.

### Example

```html
<span class="badge badge-success">Active</span>
```

### Variants

| Class | Use |
| --- | --- |
| `.badge` | Neutral label (draft, category, count). |
| `.badge-success` | Done, healthy, paid. |
| `.badge-warning` | Needs attention soon. |
| `.badge-danger` | Failed, overdue, error. |
| `.badge-info` | Informational, beta, role. |

Status badges use the status color for text and border on a 10% tint of it; the text
contrast is checked by `npm test`.

### Composition

Put badges next to a heading with `.cluster` or at the end of a row with `.split`; list
several in a `.cluster`:

```html
<div class="cluster-sm">
  <h2>Atlas</h2>
  <span class="badge badge-info">Beta</span>
</div>
<ul class="cluster-sm" role="list">
  <li class="badge">design</li>
  <li class="badge">api</li>
</ul>
```

### Accessibility

- The text carries the meaning; the color only reinforces it. "Failed" reads correctly
  without color, a red dot does not.
- Badges are not interactive. For a filter or a removable tag, use a `.button`.

### Recommended use

One or two words. Status in tables and cards, roles, counts.

### Misuse

- Sentences in a badge; use an `.alert`.
- `<a class="badge">` or `<button class="badge">`: badges have no focus or hover state.

## `.alert`

### Purpose

A message box for status, success, warnings and errors. Headings, paragraphs, lists
and buttons can go inside in any order without special parts: children are spaced by
`--space-2`, and buttons keep their own width.

### Example

```html
<div class="alert alert-success" role="status">
  <p>Settings saved.</p>
</div>
```

### Variants

| Class | Use | Role |
| --- | --- | --- |
| `.alert` | Neutral note. | none |
| `.alert-info` | Information, tips. | `role="status"` |
| `.alert-success` | An action succeeded. | `role="status"` |
| `.alert-warning` | Something needs attention soon. | `role="status"` |
| `.alert-danger` | An error the user must deal with now. | `role="alert"` |

Every alert has a thick start border, so it reads as a callout even without color; the
variant also tints the background. Body text stays `--color-text`.

```html
<div class="alert alert-danger" role="alert">
  <h2>Payment failed</h2>
  <p>Your card was declined. Update it to keep your projects running.</p>
  <a class="button button-sm" href="/billing">Update card</a>
</div>
```

### Composition

Put an alert at the top of a `.stack` (page or form), and actions inside it in a
`.cluster`:

```html
<main class="container stack">
  <div class="alert alert-warning" role="status">
    <p>Your trial ends in 3 days.</p>
    <div class="cluster-sm">
      <a class="button button-primary button-sm" href="/billing">Upgrade</a>
      <button type="button" class="button button-sm">Remind me later</button>
    </div>
  </div>
  <h1>Dashboard</h1>
</main>
```

### Accessibility

- `role="alert"` interrupts screen readers immediately; use it only for errors that
  need attention now (`.alert-danger`).
- `role="status"` is announced politely; use it for success, info and warnings.
- Live regions announce content that is added to the page. Alerts that are present when
  the page loads can omit the role.
- Start the message with what happened ("Payment failed"), so it is clear without
  color.

### Recommended use

Form submission results, page-level warnings, error summaries.

### Misuse

- Using an alert as a decorative box for normal content; use a `.panel`.
- Several `role="alert"` messages at once; summarize them in one.

## `.panel`

### Purpose

A flat, bordered group for secondary content: sidebars, settings groups, summaries
inside a card. Visually lighter than `.card`: `--color-surface` background, no shadow,
a smaller radius and less padding. Optional parts: `.panel-header` (with a bottom border)
and `.panel-body`.

### Example

```html
<section class="panel">
  <header class="panel-header"><h2>Usage this month</h2></header>
  <div class="panel-body"><p>1,204 of 5,000 build minutes used.</p></div>
</section>
```

### Variants

| Part | Use |
| --- | --- |
| `.panel` | Surface background, border, `--radius-md`, `--space-4` padding; children spaced by `--space-3`. |
| `.panel-header` | Title row with a divider; headings use `--text-base`. |
| `.panel-body` | Content in `--color-text-secondary`. |

### Composition

A panel header with an action uses `.split`; a panel is a good sidebar in `.sidebar`:

```html
<div class="sidebar">
  <nav class="panel" aria-label="Settings">
    <ul class="stack-sm" role="list"><li><a href="/general">General</a></li></ul>
  </nav>
  <section class="panel">
    <header class="panel-header split-sm"><h2>Members</h2><button type="button" class="button button-sm">Invite</button></header>
    <div class="panel-body stack-sm"><p>…</p></div>
  </section>
</div>
```

### Accessibility

- A panel is only visual grouping. Use `<section>` with a heading (or `aria-labelledby`)
  when it is a real region, `<nav>` with `aria-label` for navigation, and `<div>`
  otherwise.

### Recommended use

Secondary information, filters, settings groups, and grouping inside a `.card`.

### Misuse

- A panel for the main item of a list; use a `.card` so it stands out.

## `.table`

### Purpose

Tabular data in a native `<table>`: header and body rows, row borders, optional hover
highlight and right-aligned numbers. Wrap it in `.table-wrap` so a wide table scrolls
horizontally on narrow screens instead of overflowing the page.

### Example

```html
<div class="table-wrap" role="region" aria-label="Invoices" tabindex="0">
  <table class="table">
    <thead>
      <tr><th scope="col">Invoice</th><th scope="col">Customer</th><th scope="col" class="numeric">Amount</th></tr>
    </thead>
    <tbody>
      <tr><td>INV-1042</td><td>Northwind</td><td class="numeric">1,250.00</td></tr>
      <tr><td>INV-1043</td><td>Contoso</td><td class="numeric">89.90</td></tr>
    </tbody>
  </table>
</div>
```

### Variants

| Class | Use |
| --- | --- |
| `.table` | On `<table>`: full width, collapsed borders, `--text-sm`, header row on `--color-surface`. Styles `caption`, `thead`, `tbody` and `tfoot`. |
| `.table-wrap` | Wrapper with `overflow-x: auto`, a border and rounded corners. |
| `.table-hover` | Add to the table to highlight the hovered body row. |
| `.numeric` | On `<th>` or `<td>`: right-aligned, tabular figures, no wrapping. |

### Composition

Put the table in a `.stack` with its heading, or in a `.panel` or `.card`. Use badges
and small buttons in cells, grouped with `.cluster`:

```html
<section class="stack-sm">
  <h2>Members</h2>
  <div class="table-wrap" role="region" aria-label="Members" tabindex="0">
    <table class="table table-hover">
      <thead><tr><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
      <tbody>
        <tr><th scope="row">Ada</th><td><span class="badge badge-success">Active</span></td>
          <td><div class="cluster-sm"><button type="button" class="button button-sm">Edit</button></div></td></tr>
      </tbody>
    </table>
  </div>
</section>
```

### Accessibility

- Use `<th scope="col">` for column headers and `<th scope="row">` for row headers;
  add a `<caption>` or label the wrapper.
- A scrolling `.table-wrap` should have `tabindex="0"`, `role="region"` and an
  `aria-label` (or `aria-labelledby`), so keyboard users can focus and scroll it; it
  then shows a focus ring.
- Hover is only a visual aid; do not rely on it to reveal content.

### Recommended use

Lists of records with comparable columns: invoices, members, logs. Apply `.numeric`
to amounts, counts and dates you compare vertically.

### Misuse

- Tables for page layout; use `.grid`, `.sidebar` or `.split`.
- A wide table without `.table-wrap`; it widens the page on phones.

## `.empty-state`

### Purpose

What a list, table or page shows when there is nothing in it yet: a centered stack of an
optional icon or illustration, a heading, a description and an optional action.

### Example

```html
<div class="empty-state">
  <h2>No projects yet</h2>
  <p>Create a project to start tracking deployments.</p>
  <a class="button button-primary" href="/projects/new">New project</a>
</div>
```

### Variants

There are no variants. A direct `<svg>` or `<img>` child is shown as a
`calc(var(--space-6) * 2)` wide icon in `--color-text-muted`; text is limited to
`--content-width` and centered.

```html
<div class="empty-state">
  <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">…</svg>
  <h2>No results</h2>
  <p>Try a different search term.</p>
</div>
```

### Composition

Put it inside a `.card` or `.panel` where the list would be, and group several actions
in a `.cluster`:

```html
<section class="panel">
  <header class="panel-header"><h2>Webhooks</h2></header>
  <div class="empty-state">
    <h3>No webhooks yet</h3>
    <p>Send deployment events to your own services.</p>
    <div class="cluster-sm">
      <button type="button" class="button button-primary">Add webhook</button>
      <a class="button" href="/docs/webhooks">Read the docs</a>
    </div>
  </div>
</section>
```

### Accessibility

- Use a real heading at the right level for the page outline.
- Mark decorative icons `aria-hidden="true"`, or give illustrations a meaningful `alt`.
- If the empty state replaces content after a search or filter, announce it by placing
  it inside an element with `role="status"`.

### Recommended use

Empty lists and tables, no search results, first-run screens. Say what is missing and
what to do next.

### Misuse

- Using it for errors; use an `.alert`.
- Leaving a list or table blank instead of showing an empty state.

## Verification

- `npm test` runs [`scripts/check-components.mjs`](../scripts/check-components.mjs). It
  needs only Node.js and checks that every component class exists in the built CSS
  (`src/synthcss.css` with its imports inlined) and no other class is added; that every
  declaration uses tokens defined in `tokens.css`, with no hex, `rgb()`, `hsl()` or named
  color literals and no hard-coded lengths; that text on every button, badge, alert,
  card and panel background meets 4.5:1 contrast; that buttons, field controls and
  `.table-wrap` have `:focus-visible` rings; that buttons and fields have disabled
  styles, buttons a loading style, and the field error state changes the border width
  and adds a marker; that `.table-wrap` scrolls horizontally; that this page covers
  every component and has the reference table; and that every class in an `html` example
  in `README.md` and `docs/`, and on the showcase page, exists in the CSS.
- `npm run check:components:browser` loads the showcase in headless Chromium at 375px
  and 1280px and checks that the components render with their tokens, that tables
  scroll inside `.table-wrap` without the page overflowing, and that focus rings show.
  It needs Playwright: run `npm install --no-save playwright` and
  `npx playwright install chromium` first.
- The [showcase](../showcase/index.html) shows every component and a composed settings
  screen built only from SynthCSS classes.
