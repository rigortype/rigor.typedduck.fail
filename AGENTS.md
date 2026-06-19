# AGENTS.md

Notes for agents working on the Rigor documentation site. The English
reference pages are generated from the `upstream/rigor` submodule by
`scripts/sync-rigor-docs.mjs` directly into the docs content root
(`src/content/docs/<section>/…`, e.g. `handbook/`, `manual/`, `adr/`) — there
is no `reference/` URL namespace, and they are git-ignored; do not edit them
directly. Japanese translations live at the mirroring path under
`src/content/docs/ja/<section>/…` and are the only translated content this
repository owns. The generated EN tree is kept out of git by a `.gitignore`
allow-list (`/src/content/docs/*` minus the hand-authored splash pages and the
`ja/` tree), so new upstream top-level dirs are ignored automatically. The
translation workflow (sourceSha-based drift detection, `pnpm
check:translations`, `pnpm bootstrap:translations`) is documented in
[README.md](README.md).

## chibirigor book (separate navigation topic)

The [chibirigor](https://github.com/rigortype/chibirigor) online book is
hosted alongside the reference docs as an independent navigation
**topic** (via the `starlight-sidebar-topics` plugin in
`astro.config.mjs`): the sidebar/topic switcher is separate from the
reference docs, but full-text search stays shared. Only the book prose
under `book/v2/{en,ja}` is published — **v2 supersedes v1; v1 is no longer
synced.**

- **Source:** the `upstream/chibirigor` submodule.
  `scripts/sync-chibirigor-docs.mjs` (run by `pnpm sync:chibirigor`, and
  by `prebuild`/`predev` via `pnpm sync:all`) generates **two editions**.
  The EN edition (`book/v2/en`) → `src/content/docs/chibirigor/` (root
  locale) with figures at `public/chibirigor/figures/`; the JA edition
  (`book/v2/ja`) → `src/content/docs/ja/chibirigor/` with figures at
  `public/ja/chibirigor/figures/`. The figures are copied per-locale
  because the SVGs carry localised text. `STYLE.md` (a contributor guide
  the EN edition ships) is **not** published. All outputs are git-ignored
  and regenerated on every build — do not edit or commit them.
- **Upstream-owned, two editions.** EN pages are stamped
  `sourceLanguage: "en"`, JA pages `sourceLanguage: "ja"`. Neither is a
  translation target this repo owns, and neither is subject to the
  terminology normalizer (`normalize-ja-terms.mjs`). The **typography
  normalizer** (`normalize-ja-typography.mjs`) IS applied during sync (its
  CJK rules are no-ops on EN, but its table-cell pipe escaping is needed on
  both), and the sync also converts upstream **GitHub-style alerts**
  (`> [!NOTE]` / `[!TIP]` / `[!IMPORTANT]`) into Starlight asides
  (`:::note` / `:::tip`; `IMPORTANT` → a `:::note` titled `Important`/`重要`),
  since Starlight does not render the GitHub syntax. Content fixes belong
  upstream in `rigortype/chibirigor`.
- **Source links go to GitHub.** The sync script rewrites links to the
  Ruby example sources (`*/examples/`, `*/dist/`, `*.rb`) to point at the
  chibirigor GitHub repo; inter-page `.md` links become on-site
  `/chibirigor/…` (EN) or `/ja/chibirigor/…` (JA) routes; figure `.svg`
  links become the per-locale `/chibirigor/figures/…` or
  `/ja/chibirigor/figures/…`. A cross-locale `../ja/…` link from an EN page
  falls back to a (path-normalised) GitHub URL.
- **Bilingual topic.** Both editions ship, so the chibirigor topic and its
  sidebar items are locale-agnostic (`slug` / `autogenerate` resolve to the
  current locale's page); the topic `link` is `/chibirigor/`. See the
  comments in `astro.config.mjs`.

## Japanese typography convention

Body prose in Japanese pages follows the no-space-between-CJK-and-Latin
convention. Apply these rules whenever you write or edit a Japanese
page:

1. **No space between Japanese and ASCII.** Write `Rigorのリッチな型`,
   not `Rigor のリッチな型`. The same applies at boundaries with
   bold/italic markers and inline-code backticks: `**要求しない**こと`,
   `RubyのRBS`, `` `consistent`の挙動 ``.
2. **Full-width parens in Japanese context.** A `(...)` whose content
   sits in Japanese prose becomes `（...）`. Markdown link URLs
   `[text](url)` keep half-width `()` because they are syntax. A pure
   ASCII expression like `consistent(A, B)` keeps its inner half-width
   parens; only the surrounding paren group becomes full-width when the
   surrounding context contains Japanese.
3. **Full-width `？` `！` after Japanese.** `見えるか？` not `見えるか?`.
   Question and exclamation marks inside code (e.g. `String?` in RBS,
   `!=` in Ruby) stay half-width.
4. **Code fences and inline code are exempt.** Anything inside a fenced
   code block or between backticks preserves Western spacing as-is.
5. **YAML frontmatter is exempt.** The `---` block at the top of every
   page is parsed as YAML at build time, so its colons, hyphens, and
   structure must not be normalised. The script splits the file on the
   closing `---` and only touches the body.
6. **Markdown list markers keep their space.** The space after `1.`,
   `2.`, `-`, `*`, `+` is required syntax; do not collapse it even if
   the next character is Japanese. The normaliser drops `.` from its
   ASCII boundary set for this reason.
7. **Label colons keep their space.** Patterns like `**型仕様**: 型モデル`
   or `text: ハンドブックを読む` rely on the space after `:` for
   readability and (in YAML) for parseability. The normaliser drops `:`
   from its ASCII boundary set for this reason.
8. **Bracketed tag labels keep their space.** A `[tag] ラベル` separator —
   notably the language-picker entries `[ja] 日本語` / `[zh-Hans] 简体中文` —
   keeps the space so the CJK entries stay consistent with the Latin-script
   siblings (`[fr] Français`, `[pt-BR] Português`) that the no-space rule
   never touches. The normaliser drops `]` from its ASCII boundary set for
   this reason.

`scripts/normalize-ja-typography.mjs` applies these rules in bulk:

```sh
node scripts/normalize-ja-typography.mjs src/content/docs/ja/**/*.md
```

The script is safe to re-run; it skips fenced code blocks and
Markdown link URLs. Newly bootstrapped skeleton pages contain the
English body verbatim, so translators must apply the convention as
they replace the body — the script catches any oversight.

### Emphasis markers (`**`/`*`) next to punctuation

CommonMark's emphasis "flanking" rules count CJK punctuation
(`。、「」（）` etc.) as Unicode punctuation, so `**`/`*` wedged between
punctuation and a letter fails to open/close and the raw marker leaks
into the HTML. Two distinct cases:

1. **CJK punctuation adjacency** (e.g. `読める。**最大`, `分岐点は**「型`).
   Handled automatically by the `remark-cjk-friendly` remark plugin wired
   into `astro.config.mjs` — no manual workaround needed.
2. **ASCII punctuation immediately before a closing delimiter, followed by
   a non-space** (e.g. `**ステータス:**Accepted`, `*POPL 2008.*occurrence`).
   The plugin does **not** cover this — it breaks in plain English
   CommonMark too. The no-space sweep above can *introduce* it by deleting
   the space the English source had. Fix by keeping a space after the
   label/citation (`**ステータス:** Accepted`, `*POPL 2008.* occurrence` —
   an ASCII↔ASCII boundary, so the space is correct) or moving the
   punctuation outside the markers.

`node scripts/scan-leaked-emphasis.mjs` (run after `pnpm build`) scans the
built HTML and reports any `**`/`*` that leaked into rendered prose; the
expected baseline is zero (intentional literal `\*` globs aside).

The separate `<strong>` workaround documented in the translation glossary
(for `**` adjacent to `<ruby>`/`</ruby>` tags) is unrelated to the plugin
and still applies — that is ASCII `<`/`>` adjacency, not CJK punctuation.

## Table-cell pipes (`|` inside code spans)

This site renders Markdown through micromark / remark-gfm, whose table
tokenizer splits a row on **every** unescaped `|` — even one inside a
`` `code span` ``. So a table cell like `` `T | U` `` or `` `<:` 、`|`（join） ``
is mis-split: text after the pipe is dropped and the unbalanced backticks can
leak `<...>` to the HTML parser as raw tags. cmark-gfm / mdBook (what upstream
Rigor renders with) protect code-span pipes instead, which is why the same
source renders cleanly upstream but breaks here. The fix is the GFM escape
`\|`, which renders as a literal `|` on both engines.

This is handled mechanically, so you rarely write it by hand:

- `scripts/escape-table-pipes.mjs` escapes code-span pipes on table rows
  (idempotent, fence- and frontmatter-aware). `sync-rigor-docs.mjs` applies it
  to every generated EN / ja-native page (after the `sourceSha` is computed, so
  drift detection is unaffected), and `normalize-ja-typography.mjs` applies it
  at the end of `transform` (so it covers chibirigor too and any manual
  normalizer run). The normalizer strips `\|` only **outside** table rows; a
  table row's escapes are load-bearing and are preserved.
- A bare `|`-as-"or" in **plain** cell text (not a code span), e.g.
  `Float|Integer`, is a separate breakage the escaper cannot fix safely — wrap
  the value in a code span and escape it, or write `\|`.
- `node scripts/scan-table-pipes.mjs` (run over the source tree) reports any
  table row that still carries an unescaped code-span pipe; the expected
  baseline is zero. Fix a hit with `node scripts/escape-table-pipes.mjs <file>`.

## Repo-root source links (plugins, examples, lib, sig, …)

Upstream prose links a plugin, example, or source file by its path relative to
the repo root — `[…](../../plugins/rigor-sorbet/)`, `[…](../../examples/rigor-web/)`,
`[…](../../lib/rigor/type/top.rb)`, `[…](../../sig/rigor/inference.rbs)`. Those
paths escape the upstream `docs/` tree and have **no on-site route** (the
published plugin reference pages live at `/manual/plugins/<slug>/`, autogenerated
from `src/content/docs/manual/plugins/`; there is no `/plugins/`, `/lib/`, … route),
so on this site every such link 404s. `sync-rigor-docs.mjs`'s `rewriteMarkdownLinks`
rewrites links into the repo-root **source/asset** trees — the allow-list in
`scripts/repo-source-dirs.mjs` (`REPO_SOURCE_DIRS`: `plugins`, `examples`, `lib`,
`sig`, `spec`, `references`, `data`, `schemas`, `skills`):

- A **bare `plugins/<slug>` directory whose slug has a published reference page**
  (`docs/manual/plugins/<slug>.md`) → the on-site page `/manual/plugins/<slug>/`,
  as a route-relative link. The reference-slug set is read from the manual dir at
  sync time, so a new/removed upstream reference page is picked up automatically.
- **Anything else under those trees** (plugin/example/`lib`/`sig`/… sources, dirs
  without a reference page, the bare `plugins/`/`examples/` listing) → the
  upstream GitHub repo (`tree` for directories, `blob` for files).
- Escapes **outside** the allow-list keep the historical behavior — `.md` →
  GitHub, anything else passes through untouched. This is deliberate: a deny-list
  would also mis-route malformed on-site cross-refs (a stray `../docs/…` the
  author meant as an on-site page, a bare `../../08-skills/`) into broken GitHub
  URLs. Those are upstream content bugs; leave them.
- A **docs-root file** (e.g. the archived `CHANGELOG-<minor>.md`, split out of the
  repo-root `CHANGELOG.md`) keeps repo-root links written **without** the `../` —
  `[…](examples/<x>/README.md)`, `[…](plugins/<slug>/README.md)`. These *look* like
  in-docs links but resolve to a non-existent `docs/examples/…`, so the rewriter
  redirects them the same way (a published plugin → its on-site manual page, else
  GitHub `tree`, collapsing a trailing `/README.md` to the directory). Gated on a
  real `REPO_SOURCE_DIRS` first segment **and** a missing docs file, so a genuine
  in-docs page is never touched. (A rewriter-only fix: this never changes upstream
  prose, so it shifts the EN `sourceSha` — restamp the affected JA mirror.)

The generated EN tree gets this for free on every sync. The hand-owned JA
mirrors (`src/content/docs/ja/**`) and EN overrides (`translations/en/**`) are
**not** rewritten by the sync script, so they must match the convention by hand;
`scripts/scan-source-links.mjs` is the guard (route-aware, sharing
`REPO_SOURCE_DIRS` with the sync rewriter):

- `node scripts/scan-source-links.mjs` scans the whole content tree and reports
  any relative link that resolves to a repo-root source dir with no on-site route
  (locale-aware; `manual/`, `adr/`, … cross-links are never flagged). Expected
  baseline is **zero**.
- `node scripts/scan-source-links.mjs --fix <glob> …` rewrites those in place
  (and, fix-only, retargets bare plugin-source **GitHub** URLs that have a manual
  page back to the on-site page, so JA readers land on the JA reference page).
  Run it over the owned trees, e.g. `'src/content/docs/ja/**/*.md'
  'translations/en/**/*.md'`.

When a rewriter change shifts link rendering without changing upstream prose,
the EN `sourceSha` moves and `check-translations` will flag the affected pages
as stale even though their translation is current. Restamp only those
verified-equivalent pages with `node scripts/restamp-translation-sha.mjs
<en-relpath> …` (it copies `sourceSha`/`sourceCommit` from the regenerated EN
page into the JA mirror or `translations/en` override, body untouched).

## English labels

Sidebar/section labels and other English output should read as native,
idiomatic English, not a calque of the Japanese — e.g. 開発レポート is
`Development Notes` (matching the upstream `notes/` directory), not
`Development Reports`.
