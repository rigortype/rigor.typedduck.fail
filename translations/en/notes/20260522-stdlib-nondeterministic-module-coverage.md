---
title: "Standard library nondeterministic / excluded module coverage"
description: "English translation of the JA-native upstream audit for nondeterministic stdlib modules."
sourceSha: "7698c9205a21bc98d387e1e36c6448ace80a7e4a3f55f98e559bc8f91a489b07"
sourceCommit: "1d0381f3ade3f4b208d95b9d649f1e80c381b775"
translationStatus: "translated"
---

Generated 2026-05-22. Companion to the deterministic-group document (`20260522-stdlib-deterministic-module-coverage.md`).
Covers modules where folding to `Constant[T]` is **principally impossible or of little practical value**.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🚫 | Out of scope (side-effecting / nondeterministic / negligible precision gain) |
| 🔲 | Limited precision uplift potential (return-value refinements, etc.) |
| 🔷 | RBS provides sufficient precision |

---

## Exclusion criteria

Modules in this group meet at least one of the following:

1. **Side effects**: modifies the filesystem, network, or OS process.
2. **Nondeterminism**: returns different output on each call with the same arguments (random numbers, timestamps, etc.).
3. **Return value is untyped**: `Marshal.load` — return type is statically unknown even with literal input.
4. **Negligible folding benefit**: computation is deterministic but the constant value has no practical use in type inference (Base64 / Digest).

---

## 1. SecureRandom

`SecureRandom.methods - Module.methods` → 12 methods (Ruby 4.0.5):
`:alphanumeric, :base64, :bytes, :gen_random, :hex, :rand, :random_bytes, :random_number, :urlsafe_base64, :uuid, :uuid_v4, :uuid_v7`

**Exclusion reason:** Reads from the OS random source, so every call returns a different value.
`hex(n)` return type is `String` (could add `non-empty-string` refinement),
`uuid` / `uuid_v4` / `uuid_v7` return type is already `String` in RBS.

| Method | Return type | Status | Notes |
|--------|-------------|--------|-------|
| `hex(n)` | String (hex) | 🚫 | Nondeterministic. RBS says `String`. |
| `base64(n)` | String | 🚫 | Nondeterministic. |
| `urlsafe_base64(n)` | String | 🚫 | Nondeterministic. |
| `random_bytes(n)` / `bytes(n)` | String (binary) | 🚫 | Nondeterministic. |
| `gen_random(n)` | String | 🚫 | Nondeterministic (internal implementation). |
| `rand` / `random_number` | Float\|Integer | 🚫 | Nondeterministic. |
| `uuid` / `uuid_v4` | String | 🚫 | Nondeterministic. |
| `uuid_v7` | String | 🚫 | Nondeterministic (includes timestamp component). |
| `alphanumeric(n)` | String | 🚫 | Nondeterministic. |

---

## 2. Random

`Random.methods - Class.methods` → 7 methods:
`:bytes, :new_seed, :rand, :random_number, :seed, :srand, :urandom`

**Exclusion reason:** Class methods depend on global random state.
`Random.new(seed)` instances are deterministic with a fixed seed,
but instance method precision uplift is out of scope for ConstantFolding (carries instance state).

| Method | Status | Notes |
|--------|--------|-------|
| `rand` / `random_number` | 🚫 | Global random. |
| `bytes(n)` | 🚫 | Nondeterministic. |
| `srand(seed)` | 🚫 | Side effect (modifies global state). |
| `seed` / `new_seed` | 🚫 | Nondeterministic. |
| `urandom(n)` | 🚫 | OS random source. |

---

## 3. FileUtils

`FileUtils.methods - Module.methods` → 57 methods (representative sample).

**Exclusion reason:** Dedicated to filesystem side effects.
Return values are operation target paths or `nil` — no meaningful precision uplift.

| Category | Example methods | Status |
|----------|----------------|--------|
| File copy / move | `cp`, `cp_r`, `mv`, `install` | 🚫 |
| File deletion | `rm`, `rm_f`, `rm_r`, `rm_rf` | 🚫 |
| Directory operations | `mkdir`, `mkdir_p`, `rmdir` | 🚫 |
| Links | `ln`, `ln_s`, `ln_sf`, `ln_sr` | 🚫 |
| Permissions | `chmod`, `chmod_R`, `chown`, `chown_R` | 🚫 |
| Comparison | `cmp` / `compare_file`, `identical?` | 🚫 |
| Utilities | `pwd` / `getwd`, `cd` / `chdir`, `touch` | 🚫 |
| Metadata | `commands`, `options`, `options_of`, `have_option?` | 🚫 |

---

## 4. Marshal

`Marshal.methods - Module.methods` → `:dump, :load, :restore`

**Exclusion reason (user decision):** `dump` is deterministic (same object → same byte sequence),
but there is no practical use for the resulting binary string as a literal type.
`load` / `restore` reconstructs arbitrary Ruby objects from binary, so the return type is `untyped` (not statically inferrable).
Despite being deterministic, Marshal offers no practical benefit for type inference.

| Method | Status | Notes |
|--------|--------|-------|
| `dump(obj)` | 🚫 | Deterministic but no use case for the return (binary String) as a constant. |
| `load(str)` / `restore(str)` | 🚫 | Return type is `untyped`. |

---

## 5. GC

`GC.methods - Module.methods` → 20 methods.

**Exclusion reason:** GC operations return runtime state (heap usage, object count, etc.).
Values vary by execution environment and timing even for the same code.

| Category | Example methods | Status |
|----------|----------------|--------|
| Statistics | `count`, `stat`, `stat_heap`, `total_time` | 🚫 |
| GC execution / control | `start`, `compact`, `disable`, `enable` | 🚫 |
| Configuration | `config`, `measure_total_time`, `stress` | 🚫 |
| Verification | `verify_compaction_references`, `verify_internal_consistency` | 🚫 |

---

## 6. Base64 (borderline group)

Demoted to a bundled gem in Ruby 4.0 (requires `require "base64"`).
`Base64.methods - Module.methods` → `:decode64, :encode64, :strict_decode64, :strict_encode64, :urlsafe_decode64, :urlsafe_encode64`

**Exclusion reason (why not in the deterministic group):**

| Aspect | Detail |
|--------|--------|
| Determinism | ✓ Same input always produces same output |
| Constant-folding benefit | ✗ No practical use for `encode64("hello")` → `"aGVsbG8=\n"` as a constant in type inference |
| Return type precision | △ Always `String` (already in RBS). Could add `non-empty-string` refinement but impact is small |
| Bundled gem issue | Requires `require "base64"` (Ruby 4.0+). Receiver type recognition depends on gem availability |

**Future promotion condition:** If a dedicated `non-empty-string` / `base64-string` refinement is introduced,
consider moving to the deterministic group and attaching refinements to `strict_encode64` / `urlsafe_encode64`.

| Method | Status | Notes |
|--------|--------|-------|
| `encode64(str)` | 🚫 | Deterministic. No folding benefit. Notable for including newlines (`\n`). |
| `strict_encode64(str)` | 🚫 | No-newline variant. Same. |
| `urlsafe_encode64(str)` | 🚫 | URL-safe variant. Same. |
| `decode64(str)` | 🚫 | Decoding. Returns binary String. |
| `strict_decode64(str)` | 🚫 | Strict variant. `ArgumentError` on invalid input. |
| `urlsafe_decode64(str)` | 🚫 | URL-safe variant. Same. |

---

## 7. Digest (borderline group)

`Digest.methods - Module.methods` → `:hexencode` (only 1 function at the module level).
In practice, `Digest::MD5.hexdigest(str)` / `Digest::SHA256.hexdigest(str)` etc. class methods are the targets.

**Exclusion reason (why not in the deterministic group):**

| Aspect | Detail |
|--------|--------|
| Determinism | ✓ Cryptographic hash functions are deterministic |
| Constant-folding benefit | ✗ Actual hash values for test literal inputs have no type inference use |
| Return type precision | △ `hexdigest` → fixed-length hex string (MD5: 32 chars, SHA256: 64 chars). Could attach a dedicated `hex-string` / `md5-hex-string` refinement |
| Return length | Varies by digest algorithm. Generic refinement loses length information |

**Future promotion condition:** If length-bearing refinements like `hex-string` / `md5-hex-string` / `sha256-hex-string`
are added to `imported-built-in-types.md`, consider moving to the deterministic group and attaching refinements.

| Method / Class | Status | Notes |
|----------------|--------|-------|
| `Digest.hexencode(str)` | 🚫 | Converts input string to hex representation. No folding benefit. |
| `Digest::MD5.hexdigest(str)` | 🚫 | 32-char hex string. Deterministic but value is not used. |
| `Digest::SHA1.hexdigest(str)` | 🚫 | 40-char hex string. Same. |
| `Digest::SHA256.hexdigest(str)` | 🚫 | 64-char hex string. Same. |
| `Digest::SHA512.hexdigest(str)` | 🚫 | 128-char hex string. Same. |
| `Digest::*#digest(str)` (binary) | 🚫 | Binary string. |
| `Digest::*#update` / `<<` | 🚫 | Destructive state accumulation. |

---

## Summary: precision uplift scenarios for excluded groups

All currently 🚫, but some could be promoted under these scenarios:

| Scenario | Targets | Prerequisites |
|----------|---------|---------------|
| `non-empty-string` refinement expansion | `SecureRandom.uuid`, `SecureRandom.hex(n > 0)`, `Base64.encode64`, `Digest::*.hexdigest` | `non-empty-string` is established as a refinement type with auto-attachment rules for return values |
| Dedicated `hex-string` refinement | `SecureRandom.hex`, `Digest::*.hexdigest` | New refinement added to `imported-built-in-types.md` + length information |
| UUID string type | `SecureRandom.uuid` / `uuid_v4` / `uuid_v7` | `uuid-string` refinement (36 chars, specific format) |
