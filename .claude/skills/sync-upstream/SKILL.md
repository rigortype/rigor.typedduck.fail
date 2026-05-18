---
name: sync-upstream
description: Pull the latest upstream Rigor docs into this site, detect translation drift, translate stale or missing Japanese pages, and ship the change as two commits — one for the submodule bump, one for the translation updates. Use when the user asks to "follow the latest Rigor", "track v0.x.y", "pull upstream", or any equivalent.
---

# Sync upstream Rigor docs and propagate translations

This repository publishes the Rigor documentation. English reference
pages under `src/content/docs/reference/` are generated from the
`upstream/rigor` git submodule by `scripts/sync-rigor-docs.mjs`. The
matching Japanese pages live under `src/content/docs/ja/reference/`
and carry a `sourceSha` / `sourceCommit` pair that records the EN
source they were translated from.

A small number of upstream documents are authored natively in
Japanese (e.g. the Matsumoto paper reviews and the Steep
cross-check triage note). For these, the sync script flips its
default behaviour:

- `src/content/docs/ja/reference/<path>` receives the upstream
  Japanese content verbatim — it is the canonical JA page and is
  auto-overwritten on every sync.
- `src/content/docs/reference/<path>` (the EN tree) is populated
  from a hand-edited English translation under
  `translations/en/<path>`. If no translation exists yet, a stub
  banner is shown above the original Japanese text.

The script detects JA-native upstream files by either (1) an
explicit `sourceLanguage: ja` frontmatter marker on the upstream
file, or (2) a fallback CJK byte-ratio threshold (> 40%).

This skill takes the repo from `current upstream pin` to `latest
upstream` in two clean commits:

1. **Submodule bump** — only the `upstream/rigor` pointer moves.
2. **Translation update** — JA pages whose `sourceSha` no longer
   matches the EN page, plus EN translations of JA-native upstream
   files whose `sourceSha` no longer matches, get re-translated
   and re-stamped.

## Step 1 — confirm scope and target with the user

Before touching anything, decide what "upstream" means for this run:

- **A specific tag/version** (e.g. "v0.1.2"): the user asked for it.
- **The latest tag** (default if the user said "track latest" or
  similar): list tags after fetching and pick the highest semver.
- **Upstream HEAD on main**: only if the user explicitly says so.

Run:

```sh
git -C upstream/rigor fetch --tags --prune
git -C upstream/rigor tag -l --sort=-v:refname | head -5
git -C upstream/rigor log --oneline HEAD..origin/main | head -10
```

Show the user the candidate target and confirm before proceeding if
the choice is non-obvious. If the working tree has uncommitted
changes outside `src/content/docs/ja/`, stop and report.

## Step 2 — first commit: bump the submodule

```sh
git -C upstream/rigor checkout <target-ref>     # tag or commit
node scripts/sync-rigor-docs.mjs                 # refresh EN tree, sourceSha, sourceCommit
git add upstream/rigor
git commit -m "Bump upstream/rigor to <target-ref>"
```

The EN tree is gitignored, so only the submodule pointer is staged.
Use the form `Bump upstream/rigor to vX.Y.Z` for tagged targets, or
`Bump upstream/rigor to <short-sha>` otherwise.

After this commit, the working tree should be clean except for any
JA files you are about to update — verify with `git status`.

## Step 3 — survey translation drift

```sh
node scripts/check-translations.mjs
```

The output reports two directions independently:

- **Forward (en → ja)** — for EN-native upstream sources: which
  JA mirror pages under `src/content/docs/ja/reference/` are
  translated / stale / missing.
- **Reverse (ja → en)** — for JA-native upstream sources: which
  hand-edited EN translations under `translations/en/` are
  translated / stale / missing.

Decide what to act on:

- **`missing`** (forward) entries are new upstream EN pages with
  no JA mirror. Run `node scripts/check-translations.mjs --bootstrap`
  to scaffold them. The bootstrap copies the EN body verbatim and
  marks `translationStatus: pending` so the page renders in
  fallback until translated. **Do not commit bootstrap-only
  changes**; either translate them in this run, or revert the
  bootstrap and leave a note for a follow-up.
- **`stale`** (forward) entries are existing JA pages whose
  `sourceSha` no longer matches the new EN page. Inspect the
  upstream diff:

  ```sh
  node scripts/check-translations.mjs --diff <handbook/02-everyday-types.md>
  ```

  This prints the upstream `git diff` between the JA page's
  recorded `sourceCommit` and current upstream HEAD, scoped to
  that file.
- **`missing reverse`** entries are new JA-native upstream pages
  with no English translation yet under `translations/en/`. Write
  the English translation directly at
  `translations/en/<output-path>` with a minimal frontmatter
  (`title`, `sourceSha`, `sourceCommit`, `translationStatus:
  "translated"`) — see Step 4.
- **`stale reverse`** entries are existing English translations
  whose `sourceSha` no longer matches the upstream JA source.
  Update them like any other stale translation.
- **`translated`** entries (both directions) are up to date.
  Skip them.

## Step 4 — translate the stale / missing pages

### Forward direction (en → ja, the common case)

For each EN-native page that needs work:

1. Read the new English page at
   `src/content/docs/reference/<path>` to capture the current text
   and the new `sourceSha` / `sourceCommit` values.
2. Read the JA page at `src/content/docs/ja/reference/<path>` for
   any existing translation (only meaningful for stale entries — for
   missing/bootstrap pages the body is still English).
3. Apply the upstream diff to the JA translation. For small edits,
   patch the existing translation; for major rewrites, retranslate
   the changed sections from scratch. Preserve unchanged paragraphs.
4. Update the frontmatter:
   - copy the new `sourceSha` and `sourceCommit` from the EN page
   - set `translationStatus: "translated"`
   - keep `sourcePath`, `editUrl`, `sidebar` etc. as-is

### Reverse direction (ja → en, for JA-native upstream)

For each JA-native upstream file that needs an English translation
(or has a stale one):

1. Read the upstream JA source at
   `src/content/docs/ja/reference/<path>` (which sync-rigor-docs.mjs
   auto-overwrites from upstream) or at
   `upstream/rigor/docs/<sourcePath>`.
2. Read the existing translation at `translations/en/<path>` if
   one exists.
3. Write the English translation to `translations/en/<path>`.
   Minimal frontmatter:

   ```yaml
   ---
   title: "<English title>"
   description: "<one-line description>"
   sourceSha: "<the upstream JA file's sourceSha>"
   sourceCommit: "<the upstream JA file's sourceCommit>"
   translationStatus: "translated"
   ---
   ```

   `sync-rigor-docs.mjs` will overlay this translation onto
   `src/content/docs/reference/<path>` on the next sync, stamping
   the upstream `sourcePath` / `editUrl` / `sidebar` / `sourceDate`
   for you — your translation file does not need to carry those.
4. Re-run `node scripts/sync-rigor-docs.mjs` to refresh the EN
   tree; the JA-native page count should report `EN-translated`
   instead of `stub`.

### Japanese typography rules

Always follow the conventions documented in
[../../../AGENTS.md](../../../AGENTS.md). Summarised:

- **No space** between Japanese and ASCII (or `**`, `_`, `` ` ``).
- **Full-width parens** `（…）` when the paren group sits in
  Japanese context. Markdown link URLs `[text](url)` keep half-width.
- **Full-width `？` `！`** after Japanese. Code (e.g. `String?`)
  stays half-width.
- **Markdown list markers** keep their required space (`1. text`,
  `- text`). Code fences and frontmatter are exempt.

After translating, run the normaliser on the touched files:

```sh
node scripts/normalize-ja-typography.mjs <files...>
```

It is idempotent — safe to run on already-normalised content. For
JA-native upstream files whose `src/content/docs/ja/reference/<path>`
just got auto-overwritten by `sync-rigor-docs.mjs`, also run the
normaliser on those — upstream may not follow this site's
typography convention.

### When NOT to fully translate this turn

If the drift is large (many files, or a major restructure of
upstream) and translating everything would make this run unwieldy,
prefer a partial pass:

- Translate the user-facing entry pages first
  (handbook chapters, reference index, type-spec overview).
- Leave deeper pages (ADRs, internal-spec deep dives, design notes)
  with `translationStatus: "stale"` and a note to the user about
  what was deferred.

Confirm the partial scope with the user before committing.

## Step 5 — verify and second commit

After all translations are written:

```sh
node scripts/check-translations.mjs
```

The pages you touched should now report as up to date. Pages you
chose not to translate stay listed as stale or missing — that is OK
as long as the user agreed to defer them.

Then commit:

```sh
git add src/content/docs/ja/ translations/en/
git commit -m "Translate <area> for <target-ref>"
```

Pick a message that summarises the *content area* you changed
(e.g. "Translate handbook updates for v0.1.2", "Refresh reference
index translations after slice 7 merge"). If only a handful of
pages changed, list them in the body. If you touched both
directions (forward + reverse), say so in the body so reviewers
know to look under both `src/content/docs/ja/` and `translations/en/`.

## Step 6 — report to the user

Tell the user:
- which upstream ref was checked out;
- how many pages changed (translated / still stale / still missing);
- the two commit SHAs;
- anything deferred and why.

Do not push or open a PR unless the user explicitly asks.

## Edge cases

- **Submodule had no new commits**: stop after `git -C upstream/rigor
  fetch`. Report `Already up to date` and skip the rest.
- **`sync:docs` fails**: fix the underlying issue before committing.
  Do not stage a partial sync.
- **Pre-existing dirty JA files**: if `git status` shows pending JA
  changes before you start, stash them or ask the user — they may
  be in-flight translations that should not be folded into this run.
- **A JA page diverged manually** (frontmatter `sourceSha` does not
  match any past EN sha): treat it as stale and re-translate against
  the current EN page. Mention the divergence in the commit body so
  reviewers can audit.
- **A JA-native upstream file shows up in `src/content/docs/ja/reference/`
  as auto-overwritten with typography changes**: that's expected;
  the JA tree for JA-native sources mirrors upstream verbatim. Just
  re-run `scripts/normalize-ja-typography.mjs` on the affected
  files to re-apply this site's conventions.
- **`translations/en/<path>` exists for a path the upstream no
  longer carries**: leave it for now — `check-translations.mjs`
  will simply skip orphaned EN translations. If it stays unused
  across two syncs, propose removing it.
