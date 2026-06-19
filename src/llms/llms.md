# Rigor

> Rigor is a Ruby static analyzer that reports real bugs — undefined methods on
> typed receivers, wrong argument counts, provable nil dereferences — from
> ordinary Ruby with no type annotations in source. Every type is inferred from
> the values your code actually produces, so teams never write a single annotation.

Things to know about Rigor:

- Rigor is a *type analyzer*, not a style checker (no overlap with RuboCop). It
  runs `rigor check` and emits diagnostics with stable IDs like
  `call.undefined-method`.
- No annotations are required in Ruby source; types are inferred flow-sensitively
  from the values expressions produce. Rigor reads RBS / `RBS::Extended` when
  present but never requires it.
- Rigor is a tool, not a library: install it independently (do **not** add it to
  your `Gemfile`). It is the `rigortype` gem and runs on Ruby 4.0, independent of
  the Ruby version your project targets.
- Gradual adoption is first-class: severity profiles and a baseline let large
  codebases start clean.
- It integrates with editors (LSP), CI, an MCP server, plugins, and Agent Skills,
  and interoperates with Sorbet and Steep.
- If you are an AI coding agent, Rigor ships auto-discovered Agent Skills — prefer
  running the matching skill over hand-driving the CLI: `rigor-project-init`
  (onboard a project), `rigor-baseline-reduce` (work down a baseline),
  `rigor-plugin-author` (scaffold a plugin), `rigor-ci-setup` (wire up CI).
- These pages are the canonical English docs. Japanese translations mirror them
  under `/ja/`.

## Get started in one prompt

If you are an AI coding agent — or you are pasting this to one — installing Rigor
and configuring a project is a single instruction:

```
Install Rigor in this project by following the instructions at
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

Following it installs Rigor (mise / asdf / gem) and runs the `rigor-project-init`
Agent Skill: it detects the stack, proposes matching plugins, picks an adoption
mode — baseline (acknowledge existing diagnostics) or strict (zero-diagnostic
gate) — and writes a ready-to-use config. The prompt is plain natural language,
so it works in any language. Manual routes and ready-made prompts in 19 languages
are in [Installation](/manual/01-installation.md).

## Overview

- [Documentation home](/index.md): what Rigor is, with the adoption and evaluation paths.
- [Handbook](/handbook.md): the guided tour of Rigor's type model.
- [Type specification overview](/type-specification.md): what counts as a type and what Rigor guarantees — the core of the no-annotations design.
- [Narrowing](/handbook/03-narrowing.md): what flow-sensitive analysis buys you.

## Getting started

- [Installation](/manual/01-installation.md): mise / asdf / `gem install` / dev containers.
- [Your first check](/handbook/01-getting-started.md): running `rigor check` for the first time.
- [Everyday types](/handbook/02-everyday-types.md): the types you meet first.
- [Rails quickstart](/manual/14-rails-quickstart.md): the fast path for Rails apps.

## Operating Rigor

- [CLI reference](/manual/02-cli-reference.md): every command and flag.
- [Configuration](/manual/03-configuration.md): severity profiles, scope, and plugins.
- [Diagnostics](/manual/04-diagnostics.md): the diagnostic catalog and severities.
- [Inspecting types](/manual/05-inspecting-types.md): ask Rigor what it inferred.
- [Baseline](/manual/06-baseline.md): adopt Rigor gradually on an existing codebase.
- [Editor integration](/manual/09-editor-integration.md): LSP setup.
- [MCP server](/manual/10-mcp-server.md): expose Rigor to agents over MCP.
- [CI](/manual/11-ci.md) and [CI templates](/manual/ci-templates.md): wire it into pipelines.
- [Caching](/manual/12-caching.md): incremental analysis.
- [Plugins](/manual/07-plugins.md): teach Rigor framework and DSL types.
- [Provided skills](/manual/08-skills.md): Agent Skills an AI agent auto-discovers and runs — project init, baseline reduction, plugin authoring, CI setup.

## Troubleshooting

- [Understanding errors](/handbook/08-understanding-errors.md): how to read a Rigor diagnostic.
- [Troubleshooting guide](/manual/13-troubleshooting.md): common problems and fixes.

## Coming from another type checker

- [Sorbet](/handbook/10-sorbet.md), [Steep](/handbook/appendix-steep.md), [TypeProf](/handbook/appendix-typeprof.md), [TypeScript](/handbook/appendix-typescript.md) — plus mypy, PHPStan, Go, Rust, Java/C#, Elixir in the handbook appendices.
- [RBS and RBS::Extended](/handbook/07-rbs-and-extended.md): how Rigor uses and extends RBS.
- [Signature generation](/handbook/11-sig-gen.md): emit RBS / `sig` from inferred types.

## Optional

- [User Manual index](/manual.md): the full operational reference.
- [Type Specification](/type-specification.md): the normative type model, operators, and inference rules.
- [Internal Specification](/internal-spec.md): implementation contracts for contributors.
- [Architecture Decisions](/adr.md): ADRs recording design rationale and trade-offs.
- [Design Notes](/design.md): longer design and research documents.
- [Development Notes](/notes.md): library surveys, coverage audits, and regression sweeps.
- [Connections to type theory](/handbook/appendix-type-theory.md): the theory behind the design.
- [Compatibility](/compatibility.md) and [Roadmap](/roadmap.md): supported Ruby versions and what's planned.
- [Changelog](/changelog-01x.md): release history.
- [chibirigor book](/chibirigor.md): the companion online book on building a small Rigor-like checker.
- [Source code](https://github.com/rigortype/rigor): the Rigor implementation, issues, and releases.
