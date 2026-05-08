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

## Deployment (Cloudflare Pages via GitHub Actions)

Deploys are driven from
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). On
every push to `master` the workflow:

1. Checks out the repo without submodules, then runs
   `git submodule update --init --depth=1 upstream/rigor` so only
   the upstream we actually consume is fetched, shallow and
   non-recursive. (Cloudflare's own Git integration kept timing
   out at 10 minutes because `upstream/rigor` registers 8 nested
   submodules under `references/`, including the multi-GB
   `ruby/ruby` and two `git@github.com:` SSH URLs the build
   environment can't authenticate to.)
2. Sets up pnpm + Node.js, runs `pnpm install --frozen-lockfile`
   and `pnpm build` (the `prebuild` hook regenerates the EN
   reference tree from the submodule).
3. Calls `cloudflare/wrangler-action@v3` with
   `pages deploy dist --project-name=rigor-typedduck-fail
   --branch=master`.

[`public/_headers`](public/_headers) ships with the build for
security headers and long-lived caching of hashed Astro assets.
[`wrangler.toml`](wrangler.toml) keeps `name`,
`compatibility_date`, and `pages_build_output_dir` so `wrangler
pages deploy` works locally without arguments.

### Required configuration

GitHub repository **Secrets and variables → Actions → Secrets**:

- `CLOUDFLARE_API_TOKEN` — token with the **Cloudflare Pages —
  Edit** template applied (or equivalent custom permissions).
- `CLOUDFLARE_ACCOUNT_ID` — the account ID shown on the right side
  of the Cloudflare dashboard home.

Cloudflare side:

- A **Pages** project named `rigor-typedduck-fail` exists. (If the
  current project is Workers Builds, create a new Pages project via
  Workers & Pages → Create → Pages → Direct Upload, name it the
  same, and bind `rigor.typedduck.fail` as a custom domain.)
- The Cloudflare-side **Git integration is disabled** so it does
  not race the GitHub Actions workflow.

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
