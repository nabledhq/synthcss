# Releasing SynthCSS

SynthCSS uses [semantic versioning](https://semver.org). The version in `package.json`
is the single source of truth. A merge to `main` that changes it publishes a release:
no manual tagging and no npm account.

## What a release is

- **`dist/`** holds the distributable stylesheets. `npm run build` writes them from
  `src/`: `dist/synthcss.css` is the bundle with every `@import` inlined, and
  `dist/tokens.css`, `dist/layout.css` and `dist/components.css` are the parts on
  their own. A new file in `src/` must be added to `OUTPUTS` in `scripts/build.mjs`
  to be published on its own; anything imported by `src/synthcss.css` is always in
  the bundle. Each file starts
  with a `/*! SynthCSS vX.Y.Z … */` banner. `dist/` is ignored on `main`, so changes to
  `src/` never need a rebuild.
- **A git tag `vX.Y.Z`**, created by
  [`.github/workflows/release.yml`](../.github/workflows/release.yml). It points at a
  "Release vX.Y.Z" commit on top of the merge commit that adds the built `dist/`. That
  commit is only reachable through the tag, never merged into `main`. The workflow also
  creates a GitHub release that attaches the `dist/` files and lists the CDN links.
- **The CDN.** jsDelivr serves any tag of a public GitHub repository, with no setup:

  ```text
  https://cdn.jsdelivr.net/gh/nabledhq/synthcss@X.Y.Z/dist/synthcss.css      exact version
  https://cdn.jsdelivr.net/gh/nabledhq/synthcss@X.Y.Z/dist/synthcss.min.css  minified by jsDelivr
  https://cdn.jsdelivr.net/gh/nabledhq/synthcss@X.Y/dist/synthcss.min.css    latest X.Y.z
  https://cdn.jsdelivr.net/gh/nabledhq/synthcss@X/dist/synthcss.min.css      latest X.y.z
  ```

  The release workflow asks jsDelivr to refresh the `@X` and `@X.Y` aliases so they
  point at the new release straight away.

## Choosing the version

While SynthCSS is 0.x:

- **Minor** (`0.1.0` → `0.2.0`): new features, and any breaking change, such as a
  renamed or removed token or class, or a token whose meaning changes.
- **Patch** (`0.1.0` → `0.1.1`): fixes that do not change the public API.

From 1.0.0, breaking changes need a major bump.

## Making a release

1. On a branch, bump the version in `package.json`, by hand or with:

   ```sh
   npm version minor --no-git-tag-version   # or: patch, major, or an exact 0.2.0
   ```

   In the same change, set `synthcssVersion` in `synthcss.ai.json` and the version in
   the header (and CDN link) of `synthcss.llm.md` to the new version. `npm test` fails
   until they match (see [ai-contract.md](ai-contract.md)).

2. Open a pull request and merge it into `main`.
3. On merge, the **Release** workflow runs `npm test`, builds `dist/`, pushes the
   `vX.Y.Z` tag and creates the GitHub release. If the tag already exists it does
   nothing, so merging other changes to `package.json` is safe. It can also be started
   by hand from the Actions tab.

To preview the release files locally, run `npm run build` and open `dist/`.

Never move or delete a published tag: jsDelivr caches tagged files permanently, so
pinned URLs would keep serving the old files. Release a new patch version instead.
