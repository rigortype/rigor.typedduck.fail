---
title: "ADR-30 — `rigor-ffi`プラグインの形状"
description: "rigortype/rigor docs/adr/30-rigor-ffi-plugin-shape.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/30-rigor-ffi-plugin-shape.md"
sourcePath: "docs/adr/30-rigor-ffi-plugin-shape.md"
sourceSha: "c132cd02b7f4dd3230d3b597dabb8d020b9e1344f639ec6638d457d639a81caf"
sourceCommit: "fa9e1de7a00dc2aff56f6efa3045b4607650a647"
translationStatus: "stale"
sidebar:
  order: 4030
---

ADR-30 — `rigor-ffi` plugin shape

*（この翻訳は未完成です。原文を表示するには[英語版](https://github.com/rigortype/rigor/blob/master/docs/adr/30-rigor-ffi-plugin-shape.md)を参照してください。）*

Status: **proposed, 2026-05-25.** Records the decision to ship a
core `rigor-ffi` plugin covering the common `ffi` gem machinery
plus a family of per-library sub-plugins (`rigor-rbnacl`,
`rigor-ethon`, `rigor-ffi-rzmq`, `rigor-sassc`), and the
boundary that lets the same core also serve projects targeting
tenderlove's `ffx` gem (a strict FFI subset that transpiles to a
C extension at gem install time).

Grounding survey lives at
[`docs/notes/20260525-ffi-library-survey.md`](../../notes/20260525-ffi-library-survey/)
(five real `ffi` consumers + the four-repo tenderlove addendum).
