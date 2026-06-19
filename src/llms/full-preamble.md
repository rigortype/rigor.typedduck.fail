# Rigor — Full documentation text

> Rigor is a Ruby static analyzer that reports real bugs — undefined methods on
> typed receivers, wrong argument counts, provable nil dereferences — from
> ordinary Ruby with no type annotations in source. Every type is inferred from
> the values your code actually produces.

This file concatenates the canonical English Handbook, User Manual, Plugin
Reference, and Type Specification in reading order, for direct LLM ingestion.
Each page below is delimited by a `---` rule, its title as a single H1, and a
`Source:` line linking the live page. For the curated index see
https://rigor.typedduck.fail/llms.txt ; for the complete page list — ADRs,
internal spec, design and development notes, changelog — see
https://rigor.typedduck.fail/sitemap-index.xml . Japanese translations mirror
these pages under /ja/.

For AI agents: installing Rigor and configuring a project is one instruction —

```
Install Rigor in this project by following the instructions at
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

It runs the `rigor-project-init` Agent Skill. See the "Provided skills" page in
the User Manual section below.
