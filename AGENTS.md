# AGENTS.md

Notes for agents working on the Rigor documentation site. The English
reference pages under `src/content/docs/reference/` are generated from
the `upstream/rigor` submodule by `scripts/sync-rigor-docs.mjs`; do not
edit them directly. Japanese translations live at the mirroring path
under `src/content/docs/ja/reference/` and are the only translated
content this repository owns. The translation workflow (sourceSha-based
drift detection, `pnpm check:translations`, `pnpm bootstrap:translations`)
is documented in [README.md](README.md).

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
