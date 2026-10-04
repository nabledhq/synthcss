# SynthMCP

SynthMCP is a [Model Context Protocol](https://modelcontextprotocol.io) server for
SynthCSS. A coding agent connected to it can look up components and layouts, map a
plain-language need to a class, fetch official examples and validate the markup it
generates. It does this through seven tools instead of the whole contract in its
prompt.

Every answer comes from [`synthcss.ai.json`](../synthcss.ai.json), the canonical
[AI contract](ai-contract.md). SynthMCP has no class list of its own. It reads the
contract once at startup, so a change to the contract changes its answers with no code
change.

- **Transport:** stdio only. There is no hosted server, no network access and no
  authentication.
- **Read-only:** it reads the contract and its tool arguments. It never writes files,
  runs commands, opens network connections or reads any other path. A test scans its
  source for those APIs.
- **Package:** [`packages/synthmcp/`](../packages/synthmcp/), an npm workspace of this
  repository. Its only runtime dependencies are `@modelcontextprotocol/sdk` (the MCP
  transport) and `parse5` (HTML parsing). The SynthCSS stylesheets and SynthJS never
  import anything from it, and the core `synthcss` package gains no dependency.
- **Requirements:** Node.js 18 or later.

## Run it

From a checkout of this repository, after `npm install`:

```sh
npm run --silent mcp                   # the root script, delegates to the workspace
npx synthmcp                           # the synthmcp bin
node packages/synthmcp/src/server.js   # the file itself
```

All three start the same stdio server. Pass `--silent` to `npm run mcp`: without it,
npm prints a `> synthcss mcp` banner to stdout, which is the protocol stream. The server
writes nothing until a client connects. Stop it with Ctrl+C.

Once SynthMCP is published to npm (see [Versioning](#versioning)), `npx -y synthmcp`
runs it with no checkout.

### Client configuration

Claude Desktop (`claude_desktop_config.json`) and other clients that take an
`mcpServers` map:

```json
{
  "mcpServers": {
    "synthcss": {
      "command": "node",
      "args": ["/absolute/path/to/synthcss/packages/synthmcp/src/server.js"]
    }
  }
}
```

Use `"command": "npx", "args": ["-y", "synthmcp"]` for the published package instead
of a checkout.

Claude Code:

```sh
claude mcp add synthcss -- node /absolute/path/to/synthcss/packages/synthmcp/src/server.js
# or, from the published package:
claude mcp add synthcss -- npx -y synthmcp
```

The server announces itself as `synthmcp`, with the SynthCSS version as its version and
`SynthMCP (SynthCSS <version>, contract <version>)` as its title. Its instructions name
both versions too.

## Tools

Every tool returns one text content item holding compact JSON. Every response,
including errors, starts with `synthVersion` (the SynthCSS version the contract
describes) and `contractVersion`. A failed call returns a structured
`{ "error": "…", … }` object and is flagged with `isError`. It never throws. Bad
arguments give `invalid-arguments`, and an unknown tool name gives `unknown-tool` with
the list of tools.

Class names are written as the `class` attribute uses them (`button button-primary`).
The `class` field of a result is the selector form (`.button-primary`).

| Tool | Arguments | Returns |
| --- | --- | --- |
| `list_components` | none | `{ components: [{ name, class, intent }] }` |
| `get_component` | `name` | intent, class, variants, parts, accessibility, behaviors (SynthJS), example |
| `list_layouts` | none | `{ layouts: [{ name, class, intent }] }` |
| `get_layout` | `name` | intent, class, variants, modifiers, parts, responsive, composition, example |
| `resolve_intent` | `intent` | `{ class, classes, attribute?, reason, score, alternatives? }` or `no-match` |
| `validate_markup` | `html` | `{ valid, issues: [{ type, severity, value, message, suggestion? }] }` |
| `get_example` | `pattern` | `{ pattern, html, note }` |

The examples below are real responses, shortened where marked with `…`.

### `list_components`

Every public component with its base class and its one-line intent from the contract.

```json
// list_components {}
{"synthVersion":"0.9.0","contractVersion":"1.4.0","components":[{"name":"button","class":".button","intent":"an action, on <button> or <a href>"},{"name":"field","class":".field","intent":"one labeled form control with help or error text"},…]}
```

### `get_component({ name })`

Everything the contract says about one component:

- its variants and parts, each with its purpose;
- each part's `placement`: `inside` the component (the default), a direct `child` of
  it, or `wraps` it like `table-wrap`;
- its checkable accessibility expectations;
- its SynthJS behaviors, when it has any, each with the `data-synth-*` attributes that
  belong to it;
- a minimal example.

`name` may be written `badge`, `.badge` or `Badge`.

```json
// get_component {"name":"badge"}
{"synthVersion":"0.9.0","contractVersion":"1.4.0","name":"badge","class":".badge","intent":"short status label","variants":[{"class":"badge-success","purpose":"positive status"},{"class":"badge-warning","purpose":"needs attention"},{"class":"badge-danger","purpose":"failed or blocked"},{"class":"badge-info","purpose":"neutral information"}],"parts":[],"accessibility":[],"example":"<span class=\"badge badge-success\">Active</span>"}

// get_component {"name":"carousel"}
{"synthVersion":"0.9.0","contractVersion":"1.4.0","error":"not-found","name":"carousel","available":["button","field","switch","input-group","card","badge","alert","panel","table","empty-state","nav","tabs","avatar"]}
```

An unknown name also gets a `suggestion` when one is close. For example, `buton` and
`button-primary` both suggest `button`.

### `list_layouts`

The eight layout primitives, each with its class and intent.

```json
// list_layouts {}
{"synthVersion":"0.9.0","contractVersion":"1.4.0","layouts":[{"name":"container","class":".container","intent":"centered page-width wrapper with side padding"},{"name":"stack","class":".stack","intent":"vertical flow with tokenized spacing"},{"name":"cluster","class":".cluster","intent":"wrapping row of small items (tags, buttons, links)"},…]}
```

### `get_layout({ name })`

One primitive. The result lists:

- its gap `variants`, which work on their own (`class="stack-lg"`);
- its `modifiers`, which need the primitive on the same element (`sidebar sidebar-end`);
- its `parts` (`cover-main`);
- how it responds to width;
- how to compose it;
- an example.

An unknown name returns `not-found` with the available primitives.

```json
// get_layout {"name":"cluster"}
{"synthVersion":"0.9.0","contractVersion":"1.4.0","name":"cluster","class":".cluster","intent":"wrapping row of small items (tags, buttons, links)","variants":[{"class":"cluster-sm","purpose":"cluster with a tighter gap"},{"class":"cluster-lg","purpose":"cluster with a looser gap"}],"modifiers":[],"parts":[],"responsive":"items stay in one row while they fit, then wrap; items keep their own width","composition":["Rows of buttons, tags, badges or inline links.","Use .cluster-sm for the actions of a form, a .card-footer or a .split header."],"example":"<div class=\"cluster-sm\">\n  <button type=\"button\" class=\"button button-primary\">Save</button>\n  <button type=\"button\" class=\"button\">Cancel</button>\n</div>"}
```

### `resolve_intent({ intent })`

Maps a plain-language need to a class by deterministic keyword scoring against the
contract's `intents` section. No language model is involved.

1. The request is lowercased and split into words. Filler words such as "a", "of" and
   "that" are dropped, and the rest are stemmed, so "wraps" and "wrapping" both match
   "wrap".
2. Each intent scores one point for each request word that one of its keywords covers,
   plus 0.5 for each multi-word keyword it matches.
3. The highest score wins. A tie goes to the intent listed first in the contract.
4. Up to three other matching intents come back as `alternatives`.

Below a score of 1 (no keyword matched) the answer is `no-match`.

The result gives:

- `classes`: everything to write in the class attribute (`button button-danger`);
- `attribute`: the SynthJS attribute, when the intent is a behavior;
- `reason`: one line on why this class fits.

```json
// resolve_intent {"intent":"a row of buttons that wraps"}
{"synthVersion":"0.9.0","contractVersion":"1.4.0","class":".cluster","classes":"cluster","reason":"Wrapping row of small items (buttons, tags, links) that keep their own width.","score":2,"alternatives":[{"class":".button","classes":"button","reason":"An action on a native <button> or <a href>.","score":1}]}

// resolve_intent {"intent":"delete this project"}
{"synthVersion":"0.9.0","contractVersion":"1.4.0","class":".button-danger","classes":"button button-danger","reason":"A destructive action (delete, remove).","score":1}

// resolve_intent {"intent":"qwzx blorp"}
{"synthVersion":"0.9.0","contractVersion":"1.4.0","error":"no-match","intent":"qwzx blorp","message":"No contract intent scored at least 1. …"}
```

"Sidebar next to main content" resolves to `.sidebar`, the contract's primitive for a
narrow column beside the main area. `.split` is for two groups pushed to opposite ends
of a row, such as a header bar.

### `validate_markup({ html })`

Parses an HTML fragment or a full document with parse5, the way a browser would, and
checks it against the contract. Only classes in the SynthCSS namespace are checked:

- contract classes;
- names that start with a contract base class and a dash, such as `card-title` or
  `stack-xl`;
- names that start with `synth-`.

Every other class is the author's own and is ignored (`my-header`, `btn`, `mt-4`).

| `type` | Severity | Reported when |
| --- | --- | --- |
| `unknown-class` | error | A namespaced class is not in the contract. |
| `unsupported-variant` | error | A component variant has no base class on its element (`button-danger` without `button`). A layout modifier has no primitive (`sidebar-end` without `sidebar`). A base class carries a variant it does not have (`badge badge-red`). |
| `internal-class` | error | A class is listed in the contract's `internal.classes`. |
| `invalid-part` | error | A part is outside its component or in the wrong place (`card-header` outside `.card`, `cover-main` not a direct child of `.cover`, `table-wrap` not around a `.table`), or a component has no such part (`card-title` inside `.card`). |
| `unknown-data-attribute` | error | A `data-synth-*` attribute is one SynthJS does not read, or is an internal marker (`data-synth`). |
| `invalid-target` | error | A `data-synth-*` target does not resolve within the markup: `data-synth-open` or `data-synth-toggle` names a missing id, or `data-synth-open` points at an element that is not a `<dialog>`. Or a `data-synth-dismiss` is outside any `<dialog>` and `[data-synth-dismissible]`, or a `data-synth-tabs` contains no `role="tab"`. |
| `a11y` | per rule | A component's `accessibility` expectations are not met: `.button` on a `<div>`, `.button-icon` without `aria-label`, `.alert` without `role="status"` or `role="alert"`, `.tabs` without `role="tablist"` and a label, or `.tabs-item` without `role="tab"` and `aria-selected`. Some, like `tabindex="0"` on `.table-wrap`, are warnings. |

`suggestion` is the closest public name by edit distance. For a variant without its
base, it is the class attribute to use. `valid` is `false` when any issue is an
`error`. Warnings alone keep it `true`. Each distinct issue is reported once. The input
is limited to 200,000 characters.

```json
// validate_markup {"html":"<div class=\"cluster my-actions\"><button type=\"button\" class=\"button-danger\" data-synth-open=\"confirm\">Delete</button></div>"}
{"synthVersion":"0.9.0","contractVersion":"1.4.0","valid":false,"issues":[{"type":"unsupported-variant","severity":"error","value":"button-danger","message":".button-danger is a variant of .button and needs class \"button\" on the same element.","suggestion":"button button-danger"},{"type":"invalid-target","severity":"error","value":"data-synth-open=\"confirm\"","message":"data-synth-open points at id \"confirm\", but no element in the markup has that id."}]}
```

The ids a `data-synth-*` attribute names must be in the same markup you validate.
Validate the whole composed fragment rather than one element at a time.

### `get_example({ pattern })`

The official example for a pattern, from the contract's `examples.patterns`:
`dashboard-header`, `settings-form`, `card-grid`, `dialog`, `tabs` or `empty-state`.
Every official example validates with zero errors. An unknown pattern returns
`not-found` with the available names.

```json
// get_example {"pattern":"dashboard-header"}
{"synthVersion":"0.9.0","contractVersion":"1.4.0","pattern":"dashboard-header","html":"<header class=\"split\">\n  <div class=\"stack-sm\">\n    <h1>Dashboard</h1>\n    <p>Updated 5 minutes ago.</p>\n  </div>\n  <div class=\"cluster-sm\">\n    <button type=\"button\" class=\"button\">Export</button>\n    <button type=\"button\" class=\"button button-primary\">New report</button>\n  </div>\n</header>","note":"Page header: .split puts the title group and the actions at opposite ends; the actions sit in a .cluster-sm with the main action last."}

// get_example {"pattern":"pricing"}
{"synthVersion":"0.9.0","contractVersion":"1.4.0","error":"not-found","pattern":"pricing","available":["dashboard-header","settings-form","card-grid","dialog","tabs","empty-state"]}
```

## Relationship to `synthcss.ai.json` and SynthJS

SynthMCP is a query layer over the contract, not a second source of truth.

| Tool output | Contract source |
| --- | --- |
| components, variants, parts | `components.<name>.intent`, `.variants`, `.parts`, `.placement` |
| accessibility expectations, `a11y` issues | `components.<name>.accessibility` |
| layouts | `layouts` (intents) and `primitives` (variants, modifiers, parts, responsive, composition, example) |
| SynthJS behaviors and attributes, `data-synth-*` checks | `components.<name>.behaviors` and `synthjs.attributes` |
| `internal-class` issues, internal markers | `internal` |
| `resolve_intent` | `intents` |
| `get_example`, component and layout examples | `examples.patterns`, `components.<name>.example`, `primitives.<name>.example` |

Contract 1.4.0 added these sections for SynthMCP: `primitives`, `synthjs`, `internal`,
`intents`, `examples.patterns`, and the components' `placement`, `accessibility` and
`example`. They are listed in [ai-contract.md](ai-contract.md).
`scripts/verify-ai-contract.mjs` checks them against the CSS and SynthJS on every
`npm test`. For example, every intent target must be a public class, every
`data-synth-*` attribute must be used by `src/js/synth.js`, and every example must use
contract classes only. Change the contract and SynthMCP's answers change with it.

[SynthJS](behaviors.md) is the optional runtime behind the `data-synth-*` attributes.
SynthMCP does not run it. It reports what the contract says about each behavior and
checks that markup uses the attributes the way SynthJS reads them.

SynthMCP resolves the contract through the `synthcss` package. In this repository,
that is the workspace link to the repository root, so it always reads the
`synthcss.ai.json` next to the stylesheets. For tests, the `SYNTHMCP_CONTRACT`
environment variable or the `contractPath` option of `createSynthServer()` points it at
another file.

## Versioning

SynthMCP is released with SynthCSS and carries the same version. The release workflow
bumps `packages/synthmcp/package.json` together with the core package (see
[releasing.md](releasing.md)). Every response reports two versions:

- `synthVersion`: the SynthCSS version of the contract it reads;
- `contractVersion`: the format version of the contract. Its minor is bumped for
  additive changes, its major for breaking ones.

The published npm package contains a copy of the contract it was released and tested
with. The core `synthcss` package is not on npm, so the copy takes the place of the
workspace link. Publishing needs the `NPM_TOKEN` repository secret.

## Development

```sh
npm install         # installs the workspace and links the synthmcp bin
npm test            # all checks, including the SynthMCP tests
npm run test:mcp    # only the SynthMCP tests
```

The tests use the SDK client over in-memory and stdio transports. They cover the seven
tools, contract fidelity for every component and layout, intent resolution, each issue
type, every official example, contract drift through a modified fixture and a scan of
`packages/synthmcp/src/` for process, network and file-write APIs.

`suggest_structure` is deferred, and so are editing user files, generating CSS, hosted
or authenticated MCP and network access.
