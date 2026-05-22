---
title: "Appendix — Installing Rigor"
description: "Imported from rigortype/rigor docs/handbook/appendix-installation.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/handbook/appendix-installation.md"
sourcePath: "docs/handbook/appendix-installation.md"
sourceSha: "9e1934581008b993ffebe3f7080bc52ec5b5ed15a6cda6cf4450b9881c9c6594"
sourceCommit: "1d0381f3ade3f4b208d95b9d649f1e80c381b775"
translationStatus: "pending"
sidebar:
  order: 1050
---

> [!NOTE]
> このページはまだ翻訳されていません。英語版の本文を参考表示しています。

Rigor is a tool, not a library — like a linter or a compiler, it
analyses your project but is not part of its runtime. **Do not add
it to your application's `Gemfile`.** A `Gemfile` entry would tie
your whole project to Rigor's Ruby version and pull Rigor's
dependencies into your application's dependency resolution. Install
Rigor on its own and point it at your project.

Rigor runs on Ruby 4.0. That is independent of the Ruby your own
code targets: the `target_ruby:` config key tells Rigor which Ruby
*your* project runs, and the two need not match. Rigor reads your
project — its source, its `Gemfile.lock`, its gems' `.rbs` files —
as data; it never loads your project's gems into its own process,
so nothing is lost by installing it separately.

## Recommended — a runtime version manager

[`mise`](https://mise.jdx.dev/) installs both Ruby 4.0 and Rigor and
pins them per project, with no `Gemfile` involvement:

```sh
mise use ruby@4.0
mise use gem:rigortype
```

`rigor` is then on your `PATH`. Commit the generated `mise.toml` so
every contributor — and every CI run — uses the same versions.

An on-`PATH` `rigor` is also what editor integrations expect: they
launch `rigor lsp` directly (see
[`docs/lsp-integration.md`](../../lsp-integration/)), with no
per-editor `bundle exec` prefix to configure.

## asdf

`asdf` follows the same model. Install a Ruby 4.0.x with the
[`asdf-ruby`](https://github.com/asdf-vm/asdf-ruby) plugin, select
it for the project, then install the gem into that Ruby:

```sh
asdf install ruby latest:4.0
asdf local ruby latest:4.0
gem install rigortype
```

`asdf` has no general-purpose gem backend, so the gem itself is
installed with `gem install` rather than an `asdf` command. `mise`
(above) is the more integrated option because its `gem:` backend
pins the gem the same way it pins Ruby.

## Simple alternative — gem install

If you already have a Ruby 4.0 on your `PATH`:

```sh
gem install rigortype
```

The gem is named `rigortype` — `rigor` was already taken on
RubyGems — and the executable it installs is `rigor`. This is the
quickest path, but it records nothing per project: a version
manager keeps the Rigor version pinned next to the project, so
local runs and CI cannot drift apart.

## Nix

If you use Nix, Rigor's flake exposes the executable as a package,
with Ruby 4.0 in its closure — nothing else need be on the host:

```sh
# Run without installing:
nix run github:rigortype/rigor#rigor -- check

# Or install it into your profile:
nix profile install github:rigortype/rigor
```

## Developing inside a container

If you develop inside a dev container, install Rigor on the **host
OS** rather than inside the container — running the analyser across
the container's filesystem and process boundary adds overhead. On
Windows, where a host-side Ruby 4.0 is harder to provide, installing
Rigor inside the container is the better choice.

## Continuous integration

Wiring Rigor into CI has its own appendix — see
[Appendix — Running Rigor in CI](../appendix-ci/).
