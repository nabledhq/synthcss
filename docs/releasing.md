# Releasing SynthCSS

SynthCSS uses [semantic versioning](https://semver.org). The version in `package.json`
is the single source of truth. Releases are automatic: every merge to `main` that
changes what the CDN serves is released as a new version, with no manual tagging and no
npm account.

## What a release is

- **`dist/`** holds the distributable stylesheets. `npm run build` writes them from
  `src/`: `dist/synthcss.css` is the bundle with every `@import` inlined, and
  `dist/tokens.css`, `dist/base.css`, `dist/layout.css` and `dist/components.css` are the parts on
  their own. A new file in `src/` must be added to `OUTPUTS` in `scripts/build.mjs`
  to be published on its own; anything imported by `src/synthcss.css` is always in
  the bundle. Each file starts
  with a `/*! SynthCSS vX.Y.Z … */` banner. `dist/` is ignored on `main`, so changes to
  `src/` never need a rebuild.
- **A git tag `vX.Y.Z`**, created by
  [`.github/workflows/release.yml`](../.github/workflows/release.yml). It points at a
  "Build vX.Y.Z" commit on top of `main` that adds the built `dist/`. That
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

## How a merge is released

The **Release** workflow runs on every push to `main` and decides from the merge:

| The merge… | Result |
| --- | --- |
| changes `src/`, `synthcss.llm.md` or `synthcss.ai.json` | Minor bump and release. |
| … and the pull request is labelled `release:patch` | Patch bump and release. |
| … and the pull request is labelled `release:major` | Major bump and release. |
| … and the pull request is labelled `release:skip` | No release; the change ships with the next one. |
| already changes `version` in `package.json` | Released as that version, with no extra bump. |
| changes nothing the CDN serves (docs, showcase, scripts, CI) | No release. |

To bump, the workflow runs `node scripts/bump-version.mjs <minor|patch|major>`. It
updates every file that states the version (`package.json`, `synthcssVersion` in
`synthcss.ai.json`, the header and CDN link of `synthcss.llm.md`, and the README's CDN
snippet). The workflow runs `npm test`, commits "Release vX.Y.Z" to `main` and pushes it.
It then builds `dist/`, pushes the `vX.Y.Z` tag and creates the GitHub release. If the
tag already exists it does nothing.

Pull requests should not change the version themselves. The workflow bumps it after
the merge, so feature branches never conflict on the version lines. Pull `main` after a
release, because the workflow adds a commit to it.

## Releasing by hand

- **From the Actions tab:** run the **Release** workflow and pick `minor`, `patch` or
  `major`. `none` releases the current version if it has no tag yet.
- **In a pull request:** run `node scripts/bump-version.mjs patch` (or `minor`, `major`,
  or an exact `0.4.0`), commit the result and merge. The workflow releases that version
  without bumping again.

To preview the release files locally, run `npm run build` and open `dist/`.

Never move or delete a published tag: jsDelivr caches tagged files permanently, so
pinned URLs would keep serving the old files. Release a new patch version instead.
