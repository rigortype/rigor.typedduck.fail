---
title: "Date / Time / DateTime method coverage audit"
description: "English translation of the JA-native upstream audit for Date/Time method coverage."
sourceSha: "0a0bcfbf55709d3233d3f3571a9db02b15528830bd622f3c85916a8a0176f867"
sourceCommit: "1d0381f3ade3f4b208d95b9d649f1e80c381b775"
translationStatus: "translated"
---

Generated 2026-05-23 as the Phase 1 artifact of a `rigor-type-coverage-uplift`
session (Phase 4 / Slice 4 of the post-`c9a535a` coverage-uplift line).

Unlike the String / Integer / Hash / Math audits, the Date / Time conclusion is
**not** a list of dispatch-tier additions. The reader surface is already
catalog-ready; the single blocker is a missing type carrier. This document
records that finding. The carrier was authorised and implemented (see § 4);
the 🟦 rows below are now ✅.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Folded via `Constant[Date]` / `Constant[Time]` carrier |
| 🚫 | Out of scope (destructive / nondeterministic / machine-dependent) |

---

## 1. Current state

`Date` / `DateTime` / `Time` are already registered in `CATALOG_BY_CLASS`
(`constant_folding.rb`), with `DATE_CATALOG` / `TIME_CATALOG` extracted from C
source. Reader methods (`year` / `month` / `day` / `hour` / `wday` / `leap?` /
`strftime` / `iso8601` / `next_day` / `>>` …) are classified as `:leaf` and
**fold-eligible**.

Yet precision uplift does not occur because `Date` / `Time` are not in
`Type::Constant`'s `SCALAR_CLASSES` (`lib/rigor/type/constant.rb`), and
`ConstantFolding`'s `foldable_constant_value?` also rejects both classes.
`Date.new(2026,1,1)` stops at `Nominal[Date]`, and `.year` on it widens to
the RBS tier's `Integer`.

The spec integration fixtures `date_catalog/demo.rb` and `time_catalog.rb`
explicitly state "a future `Constant<Date>` carrier would be eligible to fold
them", fixing the current `Nominal` answer as a regression guard against
unsound carriers. This audit formalises that "future carrier" as a decision item.

---

## 2. Method classification (Date / DateTime)

When all arguments to `Date.new(...)` are `Constant[Integer]`, the following
become foldable to `Constant` (catalog classification confirmed, backed by
`date_catalog/demo.rb`):

| Group | Methods | Folds to | Status |
|-------|---------|----------|--------|
| Integer readers | `year` `month`/`mon` `day`/`mday` `wday` `yday` `cwyear` `cweek` `cwday` `jd` | `Constant[Integer]` | ✅ |
| bool predicates | `leap?` `julian?` `gregorian?` `sunday?`…`saturday?` | `Constant[bool]` | ✅ |
| String readers | `to_s` `iso8601` `strftime(fmt)` `httpdate` `rfc3339` | `Constant[String]` | ✅ |
| Date navigation | `next_day` `prev_day` `next_month` `prev_year` `succ` `>>` `<<` `next` | `Constant[Date]` | ✅ |
| DateTime additions | `hour` `min` `sec` `offset` `zone` | `Constant[Integer\|String]` | ✅ |
| Comparison | `<=>` `==` `<` `>` (Date × Date) | `Constant[bool\|Integer]` | ✅ |
| Destructive | (Date is immutable. None apply.) | — | — |

---

## 3. Method classification (Time)

When all arguments to `Time.utc(...)` / `Time.gm(...)` / `Time.at(epoch)` are constants:

| Group | Methods | Folds to | Status |
|-------|---------|----------|--------|
| Integer readers | `year` `month` `day` `hour` `min` `sec` `wday` `yday` `usec` `nsec` `utc_offset` | `Constant[Integer]` | ✅ |
| bool predicates | `utc?`/`gmt?` `sunday?`…`saturday?` `dst?` | `Constant[bool]` | ✅ |
| String readers | `strftime(fmt)` `to_s` `ctime`/`asctime` `inspect` | `Constant[String]` | ✅ |
| Time navigation | `getutc`/`getgm` `+` `-`(Numeric) `round` `floor` `ceil` | `Constant[Time]` | ✅ |
| Destructive | `localtime` `gmtime` `utc` | — | 🚫 Blocklisted |
| Machine-dependent | `getlocal` | — | 🚫 Added to `TIME_CATALOG` blocklist |
| Nondeterministic | `Time.now` / `Time.at` / `Time.local` / `Time.new` | — | 🚫 Not carrier-eligible (local zone dependent) |

**Note on Time mutability:** `Time#localtime` / `gmtime` / `utc` modify the
receiver in-place via `time_modify`. `Time` is not purely immutable. When
making it a `Constant[Time]` carrier, it must be frozen via `value.dup.freeze`
(same as `String` / `Set`; `localtime` on a frozen `Time` raises `FrozenError`
→ fold declines via rescue, sound). `TIME_CATALOG` already blocklists the
three pseudo-mutators.

---

## 4. Implementation (new carrier, authorised and executed)

Date / Time precision uplift **cannot be achieved by adding a dispatch tier** —
it required a type system change: adding new scalar carriers to `Type::Constant`.
Following the precedent of the `Set` carrier, the following was implemented:

1. **`lib/rigor/type/constant.rb`**
   - Added `require "date"` at the top (`Date` / `DateTime` are stdlib; `Time` is core).
   - Added `Date` (`DateTime` is a subclass of `Date`, so covered) and `Time` to
     `SCALAR_CLASSES`.
   - Extracted the freeze branch in `initialize` into `freezable_carrier?`, adding
     `Date` / `Time` to the `value.dup.freeze` targets (`localtime` on frozen
     `Time` raises `FrozenError` → fold declines via rescue, sound).
   - Specialised `describe` — `Date#inspect` uses astronomical Julian day notation
     which is unreadable, so use `iso8601` (`"2026-01-01"`) instead. `Time#inspect`
     is concise as `"2026-01-01 00:00:00 UTC"` so left as-is.

2. **`constant_folding.rb`**
   - Added `Date` / `Time` to the permitted class set
     (`FOLDABLE_CONSTANT_CLASSES`) in `foldable_constant_value?`. Reader methods
     fold automatically via the catalog (`catalog_allows?`), so no UNARY/BINARY
     Set additions needed.

3. **Constructor folding** (entry point producing `Constant[Date]` / `Constant[Time]`)
   - `Date.new(y,m,d)` / `DateTime.new(...)` — `date_new_lift` in
     `MethodDispatcher#meta_new` (same location and shape as `range_new_lift` /
     `regexp_new_lift`).
   - `Time.utc(...)` / `Time.gm(...)` — Tier D `TimeFolding` module (wired in
     `dispatch_stdlib_module_tiers`). UTC-fixed, so machine-independent.
   - `Time.now` / `Time.at` / `Time.local` / `Time.new` / `Date.today` /
     `Date.parse` are **out of scope** — nondeterministic or local-zone dependent.

4. **FP discipline —排除 machine dependence**
   - Only `Time.utc` / `gm` are folded (UTC-fixed). `Time.at` / `Time.local` /
     `Time.new` (without explicit offset) depend on the analysis machine's zone,
     so out of scope.
   - Added `Time#getlocal` to `TIME_CATALOG`'s blocklist — not a mutator, but the
     result depends on the analysis machine's zone, so folding from `Constant[Time]`
     (always UTC) would bake host-dependent values into the type. `getutc` / `getgm`
     remain foldable (UTC results).
   - `rigor check lib` clean, 4345 examples 0 failures — regression fixed.
