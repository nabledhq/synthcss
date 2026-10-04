# Components

SynthCSS ships thirteen semantic components in [`src/components.css`](../src/components.css):
`.button`, `.field`, `.switch`, `.input-group`, `.card`, `.badge`, `.alert`, `.panel`,
`.table`, `.empty-state`, `.nav`, `.tabs` and `.avatar`. Each one names a UI intent, so a
model can map a request ("a delete button", "an on/off setting", "a URL with a copy
button", "an error message", "a table of invoices", "a segmented filter", "a user's
initials") to one predictable class.

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
- **State from native attributes, not classes.** Use `disabled`, `checked`,
  `aria-disabled="true"`, `aria-busy="true"`, `aria-invalid="true"`,
  `aria-current="page"` (current nav link) and `aria-selected="true"` (selected tab).
  There is no `.is-disabled`, `.button-loading`, `.field-invalid`, `.is-active` or
  `.tabs-item-selected`, and SynthCSS does not use `aria-pressed`.
- **Native elements.** Put `.button` on `<button>` or `<a>`, `.table` on `<table>`, and
  native `input`, `select` and `textarea` inside `.field`. Native focus and keyboard
  behavior are kept.
- **Focus.** Buttons, field controls, switches, input-group controls, nav links, tabs and a focusable `.table-wrap` show a
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
- **No JavaScript.** Interactivity (dialogs, toggles, tab panels, dropdowns, dismissible
  alerts) is optional: load [SynthJS](behaviors.md) and add `data-synth-*` attributes.

## AI Component Reference

Paste this table into a model's context together with the
[AI Layout Vocabulary](layout.md#ai-layout-vocabulary).

| Intent | Markup |
| --- | --- |
| Main action of a form or page | `<button class="button button-primary">` |
| Secondary or cancel action | `.button button-secondary`, or plain `.button` |
| Destructive action (delete, remove) | `.button button-danger` |
| Icon-only, smaller or larger button | `.button button-icon` + `aria-label="…"`; add `.button-sm` / `.button-lg` |
| Unavailable or in-progress action | `disabled` or `aria-disabled="true"`; `aria-busy="true"` |
| Labeled input with help or error text | `.field` > `.field-label` + native control + `.field-help` / `.field-error`; `aria-invalid="true"` on an invalid control |
| On/off setting that applies at once | `<label class="switch"><input type="checkbox" role="switch"> Text</label>`; `checked`, `disabled` |
| Input with an attached button or select | `.input-group` > `<input>` + `.button` and/or `<select>`; inside `.field` for a label |
| Self-contained item (project, product, user) | `.card` with `.card-header`, `.card-body`, `.card-footer`, `.card-media`, `.card-actions` |
| Short status label | `.badge` + `.badge-success` / `-warning` / `-danger` / `-info` |
| Message or notification | `.alert` + `.alert-info` / `-success` / `-warning` / `-danger`, `role="status"` or `role="alert"`; optional leading `<svg class="alert-icon">` |
| Flat group of secondary content | `.panel` with `.panel-header`, `.panel-body` |
| Tabular data | `<table class="table">` inside `.table-wrap`; `.table-hover`, `.numeric` cells |
| Nothing to show yet | `.empty-state` with heading, text and an optional action |
| Navigation links | `<ul class="nav stack-sm">` or `nav cluster-sm` > `<a class="nav-link">`; `aria-current="page"` on the current one |
| Tabs or segmented filter | `.tabs` + `role="tablist"` > `<button class="tabs-item" role="tab">`; `aria-selected="true"` / `"false"` |
| Person initials, photo, or an icon on a tinted tile | `.avatar` (+ `.avatar-round`, `.avatar-sm` / `.avatar-lg`, `.avatar-primary` / `-success` / `-warning` / `-danger` / `-info` / `-accent`) |

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

## `.switch`

### Purpose

An on/off toggle for a setting that takes effect at once ("Require admin approval",
"Email notifications"). It is a native `<input type="checkbox" role="switch">` inside a
`<label class="switch">` with its text. The checkbox is drawn as a track with a thumb;
`checked` and `disabled` are its only states, with no extra classes.

### Example

```html
<label class="switch"><input type="checkbox" role="switch" checked> Require admin approval</label>
```

### Variants

| State | Look |
| --- | --- |
| Off | A `--color-text-muted` track with the thumb at the start side. |
| `checked` | A `--color-primary` track with the thumb at the end side (the right in left-to-right text). |
| `disabled` | Faded track with a `not-allowed` cursor; the label text turns `--color-text-muted`. |

The track is 1.75 × `--space-5` wide and `--space-5` tall with `--radius-full` corners;
the thumb is a `--color-surface-elevated` circle with `--shadow-sm`. The track color and
thumb slide over `--duration-fast` with `--ease-standard`; with
`prefers-reduced-motion: reduce` those tokens are `0ms`, so the thumb jumps. There are
no size variants.

### Composition

Stack several switches in a `.stack-sm`, or put one in a `.field` with `.field-help`
under it. A switch looks the same inside and outside `.field`:

```html
<fieldset class="field">
  <legend class="field-label">Workspace</legend>
  <div class="stack-sm">
    <label class="switch"><input type="checkbox" role="switch" checked aria-describedby="approval-help"> Require admin approval</label>
    <label class="switch"><input type="checkbox" role="switch" disabled> Single sign-on</label>
  </div>
  <p class="field-help" id="approval-help">New members wait until an admin approves them.</p>
</fieldset>
```

### Accessibility

- `role="switch"` makes screen readers announce "on" / "off" instead of "checked".
- It stays a native checkbox: reachable with Tab, toggled with Space, and the wrapping
  label makes its text clickable. No script is needed.
- A `:focus-visible` ring from the `--focus-*` tokens shows on keyboard focus.
- The state is shown by the thumb position as well as the track color.

### Recommended use

Settings that apply immediately, such as preferences and feature toggles.

### Misuse

- An option that is only applied when a form is submitted, or a group of options; use a
  checkbox or radios in a `.field`.
- A switch without `role="switch"`, or outside its `<label class="switch">`.
- Classes such as `.is-on` or `.switch-checked`; use the `checked` attribute.

## `.input-group`

### Purpose

An input joined in one row with one or more buttons and/or selects: a URL with a Copy
button, a search box with a Search button, an amount with a currency select. Neighbours
share one border, only the outer corners are rounded, and every child has the same
height. No custom flex CSS is needed.

### Example

```html
<div class="input-group">
  <input type="url" readonly value="https://example.com/invite/4f2a" aria-label="Invite link">
  <button type="button" class="button">Copy</button>
</div>
```

### Variants

| Child | Behavior |
| --- | --- |
| `<input>` | Grows to fill the row (`flex: 1 1 auto; min-inline-size: 0`), at least `--input-height` tall. Styled with the same tokens as `.field` inputs, for any text-like `type`. |
| `<select>` | Keeps its own width, at least `--input-height` tall. |
| `.button` (any variant) | Keeps its own width, at least `--control-height` tall. |
| `disabled` on an input or select | Faded on `--color-surface` with a `not-allowed` cursor. |

Children overlap by `--border-width`, so shared borders are never doubled. The first
child keeps its start corners and the last child its end corners (`--radius-md`);
inner corners are square. A hovered or focused child is raised over its neighbours, so
its border and `:focus-visible` ring are never covered. `.input-group` is inline: on
its own it is as wide as its content, inside `.field` or a `.stack` it fills the
column. There are no size variants, vertical groups or text addons.

### Composition

Put an input group in a `.field` for its label, help and error text. The label points
at the input:

```html
<div class="field">
  <label class="field-label" for="amount">Amount</label>
  <div class="input-group">
    <input id="amount" type="number" aria-describedby="amount-help">
    <select aria-label="Currency"><option>EUR</option><option>USD</option></select>
    <button type="submit" class="button button-primary">Send</button>
  </div>
  <p class="field-help" id="amount-help">Sent within one business day.</p>
</div>
```

Put several groups in a `.stack`, or one next to other controls in a `.cluster`.

### Accessibility

- Label the input with a `<label for>` (inside `.field`) or with `aria-label`. A select
  without a visible label needs an `aria-label`.
- Buttons keep their own text; an icon-only `.button-icon` needs an `aria-label`.
- Every child keeps its own `:focus-visible` ring.
- Copying to the clipboard or submitting is the page's own script or form.

### Recommended use

Copy fields for links and keys, search boxes with a button, and amounts with a unit
select.

### Misuse

- Plain text or icons as children: text addons are not supported; put the text in the
  label or `.field-help`.
- Checkboxes, textareas or more than one input in a group.
- Wrapping buttons in a `.cluster` or writing custom flex CSS to attach them.

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

| Part | Use |
| --- | --- |
| `.alert-icon` | An `<svg>` (or `<img>`) as a direct child. The alert becomes two columns: the icon, 1.25em wide and one text line tall, sits at the top of the first; every other child stacks in the second with the usual gap. Alerts without it are unchanged. |

```html
<div class="alert alert-warning" role="status">
  <svg class="alert-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
  <h2>Trial ends in 3 days</h2>
  <p>Upgrade to keep your projects running.</p>
</div>
```

Wrap loose text in a `<p>` when the alert has an icon, so it lands in the content column.

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
- An `.alert-icon` is decoration: give it `aria-hidden="true"`; the text carries the
  message.

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

## `.nav`

### Purpose

A list of navigation links: main navigation, a settings menu, a section's sub-pages.
`.nav` goes on the `<ul>` and only resets the list (no bullets, margin or padding), so
the direction comes from a layout primitive: `.stack-*` for a vertical list,
`.cluster-*` for a horizontal one. Each link is an `<a class="nav-link">`. The current
page is marked with `aria-current="page"`, the single state attribute for navigation.

### Example

```html
<nav aria-label="Settings">
  <ul class="nav stack-sm" role="list">
    <li><a class="nav-link" href="/settings/general" aria-current="page">General</a></li>
    <li><a class="nav-link" href="/settings/members">Members</a></li>
    <li><a class="nav-link" href="/settings/billing">Billing</a></li>
  </ul>
</nav>
```

### Variants

| Class or attribute | Use |
| --- | --- |
| `.nav` | On the `<ul>` or `<ol>`: removes bullets, margin and padding. Sets no layout. |
| `.nav-link` | On each `<a href>`: an inline-flex row with `--space-2` between an optional leading `<svg>` and the label, `--space-2` / `--space-3` padding, `--radius-md` corners, no underline, inherited text color. Hover shows `--color-surface`. |
| `aria-current="page"` | On the link to the current page: a `--color-primary` tint and `--color-primary` text. |

There are no state classes: never add `.is-active`, `.active` or `.nav-link-current`;
put `aria-current="page"` on the link instead.

An icon before the label is sized to `1em`:

```html
<a class="nav-link" href="/projects">
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">…</svg>
  Projects
</a>
```

### Composition

Vertical in a `.sidebar` with `.stack-sm`, or horizontal in a header with `.cluster-sm`
inside `.split`:

```html
<header class="split">
  <a href="/">Acme</a>
  <nav aria-label="Main">
    <ul class="nav cluster-sm" role="list">
      <li><a class="nav-link" href="/projects" aria-current="page">Projects</a></li>
      <li><a class="nav-link" href="/team">Team</a></li>
      <li><a class="nav-link" href="/settings">Settings</a></li>
    </ul>
  </nav>
</header>
```

### Accessibility

- Wrap the list in `<nav>` with an `aria-label` when the page has more than one
  navigation region.
- Use `aria-current="page"` on exactly one link. Screen readers announce it as
  "current page", and SynthCSS styles it from the same attribute, so the visual and
  announced state never disagree.
- Add `role="list"` to keep list semantics in Safari/VoiceOver after the bullets are
  removed.
- Links show a `:focus-visible` ring from `--focus-width`, `--focus-color` and
  `--focus-offset`.

### Recommended use

Main and secondary navigation between pages, settings menus, documentation sidebars.

### Misuse

- Buttons that act on the current page; use `.button`.
- Switching views inside one page; use `.tabs`.
- State classes for the current link; use `aria-current="page"`.

## `.tabs`

### Purpose

A tab list or segmented control: an inline group of options on a `--color-surface`
track, where one option is selected. Each option is a `<button class="tabs-item"
role="tab">`; the selected one has `aria-selected="true"` and the others
`aria-selected="false"`. That is the single state attribute for tabs.

The component is CSS only. Moving focus with the arrow keys, updating `aria-selected`
and showing the matching panel are up to your own script.

### Example

```html
<div class="tabs" role="tablist" aria-label="Members">
  <button type="button" class="tabs-item" role="tab" aria-selected="true">All</button>
  <button type="button" class="tabs-item" role="tab" aria-selected="false">Admins</button>
  <button type="button" class="tabs-item" role="tab" aria-selected="false">Invited</button>
</div>
```

### Variants

| Class or attribute | Use |
| --- | --- |
| `.tabs` | The track: inline-flex, `--color-surface` background, a border, `--space-1` inner padding and gap, `--radius-md` corners. It wraps onto more lines instead of overflowing a narrow container. |
| `.tabs-item` | One option: a button reset with `--space-1` / `--space-3` padding, `--text-sm`, a transparent background and `--color-text-secondary` text. |
| `aria-selected="true"` | The selected option: `--color-surface-elevated` background, `--border-color` border and `--shadow-sm`, in `--color-text`. `aria-selected="false"` keeps the default look. |

Do not use `aria-pressed` or classes such as `.is-selected` for the selected option.

### Composition

Put a filter next to a heading with `.split`, or above content in a `.stack`. Inside
`.cluster` it sits in the row with other controls:

```html
<section class="stack">
  <header class="split">
    <h2>Members</h2>
    <div class="tabs" role="tablist" aria-label="Filter members">
      <button type="button" class="tabs-item" role="tab" aria-selected="true">Active</button>
      <button type="button" class="tabs-item" role="tab" aria-selected="false">Invited</button>
    </div>
  </header>
  <div class="table-wrap" role="region" aria-label="Members" tabindex="0">…</div>
</section>
```

### Accessibility

- Give the `.tabs` element `role="tablist"` and an `aria-label`, and each item
  `role="tab"` with `aria-selected="true"` or `"false"`.
- When the tabs switch panels, link each tab to its panel with `aria-controls` and give
  the panel `role="tabpanel"` and `aria-labelledby`. Panels are not styled by SynthCSS.
- Keyboard: the recommended pattern is a roving `tabindex` (only the selected tab is
  in the tab order) with arrow keys moving between tabs. The CSS does not do this; wrap
  the tabs and panels in `data-synth-tabs` and [SynthJS](behaviors.md#data-synth-tabs)
  does it, or write your own script.
- Items show a `:focus-visible` ring from the `--focus-*` tokens.

### Recommended use

Switching between views of the same content (All / Active / Archived), segmented
filters, and tabbed sections on one page.

### Misuse

- Navigating to other pages; use `.nav` with `aria-current="page"`.
- Toggle buttons with `aria-pressed`; SynthCSS tabs use `aria-selected`.
- A single on/off setting; use a `.switch`.

## `.avatar`

### Purpose

A small fixed square for a person's initials or photo, or an icon on a tinted tile. It
works on a `<span>`, a `<div>` or directly on an `<img>`. Content is centered both ways,
initials do not wrap, and anything larger is clipped.

### Example

```html
<span class="avatar avatar-round avatar-primary">AL</span>
<img class="avatar avatar-round" src="/people/ana.jpg" alt="Ana Lima">
<span class="avatar avatar-accent"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg></span>
```

### Variants

| Class | Use |
| --- | --- |
| `.avatar` | `--control-height` square with `--radius-md` corners on `--color-surface`, in `--color-text`. Initials in `--text-base`, semibold. |
| `.avatar-round` | A circle (`--radius-full`), the usual shape for people. |
| `.avatar-sm`, `.avatar-lg` | 0.75× and 1.5× `--control-height`, with `--text-sm` and `--text-2xl` initials. |
| `.avatar-primary`, `.avatar-success`, `.avatar-warning`, `.avatar-danger`, `.avatar-info`, `.avatar-accent` | A tone: the variant sets `--tone` to its color token, the background is `color-mix(in srgb, var(--tone) 12%, var(--color-background))` and the content is drawn in the tone. |

A child `<img>`, or `.avatar` on an `<img>`, fills the box with `object-fit: cover`. A
child `<svg>` takes 55% of the box; draw it with `currentColor` (`fill` or `stroke`) so
it takes the tone. `.avatar-accent` uses `--color-accent`, a violet with no status
meaning, for decorative tiles.

With the default tokens every tone meets 4.5:1 on its tint, and `npm test` checks it:
primary 6.21:1, success 5.02:1, warning 4.60:1, danger 5.02:1, info 5.14:1, accent
5.64:1. `--color-success` alone is 4.46:1 on its 12% tint, so `.avatar-success` draws
its content in `color-mix(in srgb, var(--tone) 90%, var(--color-text))`.

### Composition

Put an avatar in front of a name with `.cluster`, or at the start of a table cell or
list row. Size steps follow `--control-height`, so a compact theme shrinks them too:

```html
<ul class="stack-sm" role="list">
  <li class="cluster-sm">
    <span class="avatar avatar-round avatar-info avatar-sm" aria-hidden="true">BK</span>
    <span>Ben Kim</span>
  </li>
  <li class="cluster-sm">
    <img class="avatar avatar-round avatar-sm" src="/people/ana.jpg" alt="">
    <span>Ana Lima</span>
  </li>
</ul>
```

### Accessibility

- Next to the person's name, the avatar repeats it: hide initials with
  `aria-hidden="true"` and give a photo `alt=""`.
- On its own, name the person: `alt="Ana Lima"` on an `<img>`, or `role="img"` with
  `aria-label="Ana Lima"` on initials.
- Icons in a tile are decoration: `aria-hidden="true"` on the `<svg>`, with a visible
  label next to the tile.
- A tone is decoration too; do not use `.avatar-danger` as the only sign of an error.

### Recommended use

Members and authors in lists, tables and cards, account menus, and icon tiles on
dashboard stats.

### Misuse

- Long text: an avatar holds one to three characters.
- Buttons or links styled as avatars; wrap the avatar in a `.button` or `<a>` instead.
- Status dots, stacks or badges on avatars: SynthCSS has none of these.

## Verification

- `npm test` runs [`scripts/check-components.mjs`](../scripts/check-components.mjs). It
  needs only Node.js and checks that every component class exists in the built CSS
  (`src/synthcss.css` with its imports inlined) and no other class is added; that every
  declaration uses tokens defined in `tokens.css`, with no hex, `rgb()`, `hsl()` or named
  color literals and no hard-coded lengths; that text on every button, badge, alert,
  card, panel and avatar background (including every avatar tone on its tint), and on the
  current nav link and default and selected tabs, meets 4.5:1 contrast; that avatars are
  sized from `--control-height`, tones tint with 12% of `--tone`, and only an alert with
  an `.alert-icon` switches to a grid; that buttons, field controls, switches, input-group controls, nav links, tabs and `.table-wrap`
  have `:focus-visible` rings; that the switch is a native checkbox drawn with
  `appearance: none`, fills the track with `--color-primary` and moves the thumb when
  checked, and styles `:disabled`; that `.input-group` children overlap by one border,
  round only the outer corners, let the input grow and raise the focused child; that `.nav` resets the list without setting a layout,
  the current nav link (`aria-current="page"`) and selected tab
  (`aria-selected="true"`) are styled from those attributes, `aria-pressed` is not used
  and `.tabs` wraps; that buttons and fields have disabled
  styles, buttons a loading style, and the field error state changes the border width
  and adds a marker; that `.table-wrap` scrolls horizontally; that this page covers
  every component and has the reference table; and that every class in an `html` example
  in `README.md` and `docs/`, and on the showcase page, exists in the CSS.
- `npm run check:components:browser` loads the showcase in headless Chromium at 375px
  and 1280px and checks that the components render with their tokens, that tables
  scroll inside `.table-wrap` without the page overflowing, that the current nav link
  and the selected tab look different from the others, that `.tabs` does not overflow
  at 320px, that switches follow `checked` and `disabled` and toggle with Space, that
  `.input-group` children share one height and one border with rounded outer corners
  only, and that focus rings show and a focused input-group child is raised.
  It needs Playwright: run `npm install --no-save playwright` and
  `npx playwright install chromium` first.
- The [showcase](../showcase/index.html) shows every component and a composed settings
  screen built only from SynthCSS classes.
