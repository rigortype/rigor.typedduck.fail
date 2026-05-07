# Rigor Documentation Site

This repository publishes the Rigor documentation with Astro Starlight.

## Local Commands

Run commands inside the Nix development shell:

```sh
nix develop
pnpm install
pnpm dev
```

The `predev` and `prebuild` scripts sync Markdown from the `upstream/rigor` submodule into Starlight's content tree.

## Content Layout

- Upstream source: `upstream/rigor` (submodule, currently `v0.1.1`)
- Generated English reference pages: `src/content/docs/reference/`
- Japanese translations: `src/content/docs/ja/reference/` (mirrors the EN tree path-for-path)

## Deployment (Cloudflare Pages)

Deployment settings live in the repository:

- [`wrangler.toml`](wrangler.toml) — Pages project name, compatibility
  date, and `pages_build_output_dir`. `wrangler pages deploy` reads
  this file and uploads `dist/` directly.
- [`public/_headers`](public/_headers) — security headers for every
  response and long-lived cache headers for hashed Astro assets.

Dashboard-side build settings (only needed when using the Git
integration rather than `wrangler pages deploy`):

- Build command: `pnpm install --frozen-lockfile && pnpm build`
- Build output directory: `dist`
- Submodules: enabled (the EN reference tree is generated from the
  `upstream/rigor` submodule at build time)

## Translation workflow

Each English reference page carries a body hash and the upstream commit it
was synced from in its frontmatter:

```yaml
sourcePath: "docs/handbook/01-getting-started.md"
sourceSha: "d09e0bf0…"   # SHA-256 of the post-normalisation EN body
sourceCommit: "9f40e221…"
```

A Japanese translation mirrors the same path under `src/content/docs/ja/`
and carries the same fields plus a translation status:

```yaml
sourcePath: "docs/handbook/01-getting-started.md"
sourceSha: "d09e0bf0…"        # the EN body sha that was translated
sourceCommit: "9f40e221…"     # the upstream commit that was translated
translationStatus: "translated"  # translated | pending | stale
```

When the EN body changes, its `sourceSha` changes too. Comparing the EN
`sourceSha` against the JA `sourceSha` is enough to detect drift, so
no separate manifest file is needed — every translation is
self-describing.

### Updating to a new upstream release

```sh
# 1. Bump the submodule.
git -C upstream/rigor fetch --tags
git -C upstream/rigor checkout v0.1.2
git add upstream/rigor

# 2. Re-sync. EN pages get fresh sourceSha / sourceCommit.
pnpm sync:docs

# 3. List drift.
pnpm check:translations

# 4. For a stale page, view what changed upstream between the
#    sourceCommit recorded in the JA file and HEAD.
pnpm check:translations --diff handbook/02-everyday-types.md
```

### Translating a stale or missing page

1. Open the EN page in `src/content/docs/reference/<path>` to see the new
   `sourceSha` / `sourceCommit`.
2. Open the JA mirror in `src/content/docs/ja/reference/<path>`. If
   `pnpm check:translations` reported the path as missing, run
   `pnpm bootstrap:translations` first to scaffold a skeleton (English
   body + `translationStatus: pending`).
3. Update the body. When done, copy the EN page's `sourceSha` and
   `sourceCommit` into the JA frontmatter and set
   `translationStatus: "translated"`.
4. Re-run `pnpm check:translations` — the page should now report as up
   to date.

### CI gating (optional)

Add `pnpm check:translations -- --strict` to CI to fail the build when
any translation drifts. By default the report is informational and
returns exit code 0.

## Copyrights

<a href="https://rigor.partial-eval.fail/">Rigor Documents</a> © 2026 by <a href="https://github.com/zonuexe">USAMI Kenta</a> is licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a><img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;">
