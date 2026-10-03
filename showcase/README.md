# SynthCSS showcase

A single static page that shows what SynthCSS is, why it is AI-first, and live demos
of its design tokens, layout primitives and components, plus a composed interface built
only from SynthCSS classes. It is built with SynthCSS itself and
published to GitHub Pages.

| File | Purpose |
| --- | --- |
| `index.html` | The page. Loads the real framework from `../src/synthcss.css`. |
| `showcase.css` | Showcase-only styles (base typography, demo boxes, frames, copy buttons). Every class starts with `sc-`, and every value is a `var(--token)` from `src/tokens.css`. |
| `showcase.js` | Optional vanilla JS: copy buttons, frame-width sliders, the motion demo and live token values. The page works without it. |

There is no build step and no dependency. Token values are never copied into the
showcase: swatches and specimens use `var(--…)`, and the values printed next to them
are read from the stylesheet at runtime.

## Local preview

Open `showcase/index.html` directly in a browser. The stylesheet link is relative
(`../src/synthcss.css`), so it works from a checkout.

Clipboard access is more reliable over HTTP, so you can also run a static server from
the **repository root** (not from `showcase/`, or `../src/` will not resolve):

```sh
python3 -m http.server 8000
# then open http://localhost:8000/showcase/
```

`npx serve .` works too. Run `npm test` to check the page against the framework
(see [Checks](#checks)).

## Deployment

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) deploys the page with the
official `actions/configure-pages`, `actions/upload-pages-artifact` and
`actions/deploy-pages` actions. It runs on every push to `main` that changes
`showcase/**`, a framework stylesheet (`src/**.css`) or the workflow itself, and can be
started by hand from the Actions tab (`workflow_dispatch`).

The build job runs `npm test`, then assembles a temporary `_site/` folder that mirrors
the repository layout:

```text
_site/
  index.html        generated redirect to showcase/
  showcase/         index.html, showcase.css, showcase.js
  src/              tokens.css, layout.css, components.css, synthcss.css
```

Because `showcase/` sits next to `src/`, the same relative link works locally and on
Pages. The page is served at `https://<owner>.github.io/synthcss/showcase/` and the site
root forwards there. Nothing generated is committed.

GitHub Pages lets browsers cache files for 10 minutes, so after a deploy a returning
visitor could get the new page with old stylesheets. To prevent that, the workflow
appends `?v=<commit>` to the page's stylesheet and script links and to the `@import`
URLs in the deployed `src/synthcss.css`, so every deploy loads fresh files. Only the
deployed copies change; the files in the repository keep plain links.

### One-time setup

A maintainer must do this once after the workflow is merged: in the repository open
**Settings → Pages** and set **Source** to **GitHub Actions**. Then push to `main` or run
the workflow manually.

## Adding a section

Each part of the page is one self-contained `<section id="...">` inside `<main>`. To show
a new primitive or component, append a section:

```html
<section id="buttons" class="sc-band" aria-labelledby="buttons-title">
  <div class="container stack-lg">
    <h2 id="buttons-title">Buttons</h2>
    <article class="sc-card stack">
      <div class="sc-demo">…live demo using the real classes…</div>
      <div class="sc-code"><pre><code>&lt;button class="…"&gt;Save&lt;/button&gt;</code></pre></div>
    </article>
  </div>
</section>
```

- Lay it out with SynthCSS primitives and tokens. Only add rules to `showcase.css` for
  things the framework does not ship, prefix their classes with `sc-` and use
  `var(--token)` for every value.
- Put every snippet in `<div class="sc-code"><pre><code>`, HTML-escaped. `showcase.js`
  adds the copy button. Keep snippets to 15 lines or fewer and use only real SynthCSS
  classes and tokens.
- Add a link to the new section in the hero navigation if it is a main section.
- New framework files under `src/` are published automatically; load them through
  `src/synthcss.css`.

## Checks

`npm test` runs [`scripts/check-showcase.mjs`](../scripts/check-showcase.mjs) (Node.js
only). It checks that the page loads the framework bundle and no other stylesheet, that
every section and hero item exists, that every token is rendered with `var(--…)`, that
every layout primitive has a demo, description and snippet, that grid, sidebar, cluster
and split have width-adjustable frames, that every component has an article with a live
demo of all its classes and a snippet, that the composed interface (`data-composed`)
uses only SynthCSS classes and at least six components, that there are at least three intent examples,
that snippets are short and use only real classes and tokens, that `showcase.css` only
styles `sc-` classes with no hard-coded colors or token values, and that the workflow
and this README cover the required steps.

[`scripts/check-components.mjs`](../scripts/check-components.mjs) also checks that every
class on the page and in its snippets exists in the built CSS.

`npm run check:components:browser` tabs through the component demos in headless Chromium
and checks focus rings, states and that tables scroll inside `.table-wrap` at 375px.

`npm run check:showcase:browser` loads the page in headless Chromium at 375px and 1280px
and checks for console errors, horizontal page overflow, applied styles, copy buttons
and the responsive frames. It needs Playwright, which is not a dependency of this
repository: run `npm install --no-save playwright` and `npx playwright install chromium`
first.
