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
   The frontmatter (YAML) is exempt for the same reason.
5. **Markdown list markers keep their space.** The space after `1.`,
   `2.`, `-`, `*`, `+` is required syntax; do not collapse it even if
   the next character is Japanese. The normaliser drops `.` from its
   ASCII boundary set for this reason.

`scripts/normalize-ja-typography.mjs` applies these rules in bulk:

```sh
node scripts/normalize-ja-typography.mjs src/content/docs/ja/**/*.md
```

The script is safe to re-run; it skips fenced code blocks and
Markdown link URLs. Newly bootstrapped skeleton pages contain the
English body verbatim, so translators must apply the convention as
they replace the body — the script catches any oversight.
