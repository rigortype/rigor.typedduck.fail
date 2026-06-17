# Vendored syntax-highlighting grammars

TextMate grammars loaded into Expressive Code (Shiki) via
`expressiveCode.shiki.langs` in [`astro.config.mjs`](../../astro.config.mjs).
Shiki 4.x (the version Starlight pulls in) bundles `ruby` but **not** `rbs`,
so a fenced ` ```rbs ` block fell back to unhighlighted `txt` and emitted a
build warning (`The language could not be found`). These files fix that.

## `rbs.tmLanguage.json`

The Ruby signature (`.rbs`) grammar, scope `source.rbs` — the same grammar
GitHub Linguist uses for `.rbs` files.

- **Source:** <https://github.com/soutaro/vscode-rbs-syntax>
  (`syntaxes/rbs.tmLanguage.json`)
- **Author:** Seiei Miyagi and Soutaro Matsumoto (a core RBS / Steep
  maintainer)
- **License:** MIT
- **Pinned at:** commit `875006de0d15f845aa0b447ec321657ba8db248f`
  (package version 0.3.1, 2025-03-24)
- **Vendored verbatim** — do not hand-edit. To update, re-copy the file
  from upstream and bump the commit hash above.

The Sorbet `rbi` dialect is **not** vendored: `.rbi` files are valid Ruby, so
`astro.config.mjs` aliases `rbi → ruby` via `expressiveCode.shiki.langAlias`
instead of shipping a separate grammar.
