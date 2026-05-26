---
title: "FFIライブラリ使用状況調査 — `rigor-ffi`設計の基礎（2026-05-25）"
description: "rigortype/rigor docs/notes/20260525-ffi-library-survey.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260525-ffi-library-survey.md"
sourcePath: "docs/notes/20260525-ffi-library-survey.md"
sourceSha: "3f1b028b24a631a99cd41206305d376fd493e700c1de29e3556f00e334a89316"
sourceCommit: "fa9e1de7a00dc2aff56f6efa3045b4607650a647"
translationStatus: "stale"
sidebar:
  order: 20266525
---

*(この翻訳は未完成です。原文を表示するには[英語版](https://github.com/rigortype/rigor/blob/master/docs/notes/20260525-ffi-library-survey.md)を参照してください。)*

Status: research note, no design commitments. Prerequisite for a future
`rigor-ffi` plugin that should make FFI-binding gems statically analysable
to the level required by [ADR-0](../../adr/0-concept/) /
[ADR-1](../../adr/1-types/) and the [robustness
principle](../../type-specification/robustness-principle/).

The end goal is **type-checking Ruby code that *uses* these gems** —
i.e. user code calling `Ethon::Easy#perform`, `RbNaCl::SecretBox#encrypt`,
`ZMQ::Context#socket`, etc.
