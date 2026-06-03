---
name: sync-upstream
description: Pull the latest upstream Rigor docs into this site, detect translation drift, translate stale or missing Japanese pages, ship the change as two commits — one for the submodule bump, one for the translation updates — and push them by default. Use when the user asks to "follow the latest Rigor", "track v0.x.y", "pull upstream", or any equivalent.
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

### Handbook & User Manual sidebar drift (manual)

Two sidebar groups in
[`astro.config.mjs`](../../../astro.config.mjs) list their pages
**explicitly** rather than via `autogenerate`:

- **Handbook** — chapters `01`–`NN` plus the appendix sub-groups.
- **User Manual** — the `reference/manual` index plus its numbered
  chapters (`01`–`NN`). It is listed explicitly so that it stops at
  its own chapters and does **not** recurse into
  `reference/manual/plugins/`, which is promoted to its own
  top-level **Plugin Reference** group (autogenerated — new plugin
  pages there still appear without config edits).

Every other section (`type-specification`, `internal-spec`, `adr`,
`design`, `notes`, and the **Plugin Reference** plugin group)
discovers its pages automatically. The handbook and user-manual
chapter lists do **not** — a new, renamed, or removed handbook
chapter/appendix or user-manual chapter will be silently absent
from (or 404 in) the sidebar until you update the `items` array by
hand. (The plugin pages under `reference/manual/plugins/` are fine
either way — they autogenerate.)

So whenever this sync touched anything under
`src/content/docs/reference/handbook/` or added/renamed/removed a
numbered chapter directly under `src/content/docs/reference/manual/`
(not the `plugins/` subdir), diff the directory against the config:

```sh
ls upstream/rigor/docs/handbook/*.md
ls upstream/rigor/docs/manual/*.md       # top-level manual chapters only
```

Compare each file list (ignoring `README.md`, which maps to the
group root slug — `reference/handbook` / `reference/manual`)
against the corresponding `items` array in `astro.config.mjs`. For
each added page, insert a `{ slug: 'reference/handbook/<name>' }`
or `{ slug: 'reference/manual/<name>' }` entry in the right group
(numbered chapters in order; handbook appendices: "Coming from
another type checker" vs "Connections to type theory" per the
upstream README's table of contents). Remove entries for deleted
pages. Fold this config edit into the **second** commit alongside
the translations.

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

### Japanese term & typography rules

Two layers enforce the Japanese conventions — apply both:

**Front-loaded (judgement, while translating).** The translation memory
[`../../../docs/ja/translation-glossary.md`](../../../docs/ja/translation-glossary.md)
is `@`-imported by `CLAUDE.md`, so it is already in your context. Apply
its decision criteria as you translate — which terms to translate vs keep
katakana (by audience establishment / clarity / misunderstanding risk),
ruby vs paren glossing, and the **sense-divergent** terms that must stay
katakana (アイデンティティ≠同一性, アサーション≠表明, リレーション≠関係,
bare 頑健性 as a generic word, …). A script cannot make these calls.

**Post-correction (deterministic, after translating).** Two idempotent,
code-aware normalisers enforce the settled mechanical rules so your free
translation does not have to remember every mapping:

```sh
node scripts/normalize-ja-terms.mjs <files...>       # long-vowel ー + settled 1:1 訳語
node scripts/normalize-ja-typography.mjs <files...>  # CJK/ASCII spacing, full-width parens, ？！
```

`normalize-ja-terms.mjs` enforces the katakana long-vowel DROP/KEEP rule
and the settled katakana→kanji translations (評価器, 認識器, 比較器, 走査,
実体化, 単一化, 多重集合, 分類体系, 由来, ロバストネス原則, 言語サーバー, …);
the full per-term ledger is
[`../../../docs/ja/katakana-longvowel-ledger.md`](../../../docs/ja/katakana-longvowel-ledger.md).
It does **not** add ruby/paren glosses — place those by hand on the first
occurrence while translating. New settled terms get added to its lists +
the ledger.

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

Run both normalisers (above) on the touched files after translating —
they are idempotent and safe on already-normalised content. For
JA-native upstream files whose `src/content/docs/ja/reference/<path>`
just got auto-overwritten by `sync-rigor-docs.mjs`, run the
**typography** normaliser on those too (upstream may not follow this
site's spacing). The **terms** normaliser intentionally skips
`sourceLanguage: "ja"` pages — word-choice / long-vowel unification is
not applied to upstream-owned JA-native content (see
translation-glossary.md § 翻訳対象外).

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
# Also stage astro.config.mjs if the handbook sidebar changed (Step 3).
git commit -m "Translate <area> for <target-ref>"
```

Pick a message that summarises the *content area* you changed
(e.g. "Translate handbook updates for v0.1.2", "Refresh reference
index translations after slice 7 merge"). If only a handful of
pages changed, list them in the body. If you touched both
directions (forward + reverse), say so in the body so reviewers
know to look under both `src/content/docs/ja/` and `translations/en/`.

## Step 6 — push

By default, push the new commits once the work is committed and
`check-translations.mjs` is green:

```sh
git push
```

This pushes both commits (the submodule bump and the translation
update) to the current branch's upstream in one go. Notes:

- **Push even for a bump-only run** (submodule moved but no translation
  drift) — the pointer change should still land.
- **Nothing to push** when the submodule had no new commits (the
  "Already up to date" edge case) — skip silently.
- **Do not** open a PR; pushing to the working branch is the publish
  flow for this repo. Open a PR only if the user explicitly asks.
- If `git push` fails (no upstream tracking, non-fast-forward, auth),
  stop and report the failure with the local commit SHAs so the user
  can push manually — do not force-push.

If the user said "commit but don't push" (or similar) for this run,
honour that and skip the push.

## Step 7 — report to the user

Tell the user:
- which upstream ref was checked out;
- how many pages changed (translated / still stale / still missing);
- the two commit SHAs;
- whether the commits were pushed (and to which branch);
- anything deferred and why.

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
