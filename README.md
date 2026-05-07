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

- Upstream source: `upstream/rigor`
- Generated English reference pages: `src/content/docs/reference/`
- Japanese translations: `src/content/docs/ja/`

Cloudflare Pages should use:

- Build command: `pnpm install --frozen-lockfile && pnpm build`
- Build output directory: `dist`
- Submodules: enabled

## Copyrights

<a href="https://rigor.partial-eval.fail/">Rigor Documents</a> © 2026 by <a href="https://github.com/zonuexe">USAMI Kenta</a> is licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a><img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;">
