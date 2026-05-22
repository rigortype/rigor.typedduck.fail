---
title: "Hash method coverage — ShapeDispatch & block-fold audit"
description: "English translation of the JA-native upstream audit for Hash method coverage."
sourceSha: "e9eafee6dbec672f69184e83528f8068343ecff13d2d573b281b57013aa915e7"
sourceCommit: "1d0381f3ade3f4b208d95b9d649f1e80c381b775"
translationStatus: "translated"
---

Generated from `({}.methods - Object.new.methods).sort` on Ruby 4.0 (2026-05-22).
Tracks which methods produce precise `HashShape` results and what is still open.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented in ShapeDispatch (`shape_dispatch.rb`) or ExpressionTyper block-fold |
| 🔷 | Handled by another tier (BlockFolding / ConstantFolding / RBS provides sufficient precision) |
| 🔲 | Not yet implemented but valuable for HashShape precision uplift |
| 🚫 | Out of scope (destructive mutation / Enumerator generation / negligible precision gain) |

---

## Method list

| Method | Status | Implementation / Notes |
|--------|--------|------------------------|
| `<` | ✅ | HashShape subset comparison → foldable to `Constant[bool]`. Low priority. |
| `<=` | ✅ | Same. |
| `>` | ✅ | Same. |
| `>=` | ✅ | Same. |
| `[]` | ✅ | `hash_lookup` — returns value type for static keys. |
| `[]=` | 🚫 | Destructive mutation. Shape becomes indeterminate. |
| `all?` | 🔷 | No-arg / no-block → RBS `bool`. With block → BlockFolding. |
| `any?` | ✅ | `hash_any?` — ShapeDispatch for no-arg / no-block only. With block → BlockFolding. |
| `assoc` | ✅ | Static key → foldable to `Tuple[Constant[k], V]` or `Constant[nil]`. |
| `chain` | 🚫 | Returns `Enumerator`. No HashShape precision needed. |
| `chunk` | 🚫 | Enumerable. |
| `chunk_while` | 🚫 | Enumerable. |
| `clear` | 🚫 | Destructive mutation. |
| `collect` | 🚫 | Synonym for `Hash#map`. The `[k,v]` pair two-arg-block form is not supported by the current BlockParameterBinder. |
| `collect_concat` | 🚫 | Synonym for `flat_map`. Same issue. |
| `compact` | ✅ | `hash_compact` — removes nil entries when all values are Constant. |
| `compact!` | 🚫 | Destructive mutation. `!` blocked. |
| `compare_by_identity` | 🚫 | Destructive mutation (changes comparison policy). |
| `compare_by_identity?` | 🔷 | Always `false` for literal HashShape. But RBS `bool` is sufficient. |
| `count` | ✅ | `hash_size` — no-arg / no-block. With block → BlockFolding `COUNT_METHOD`. |
| `cycle` | 🚫 | Enumerable. |
| `deconstruct_keys` | ✅ | Pattern-match sub-shape. Same structure as `slice`. Medium priority. |
| `default` | ✅ | `Constant[nil]` for literal HashShape. Low priority. |
| `default=` | 🚫 | Destructive mutation. |
| `default_proc` | ✅ | `Constant[nil]` for literal HashShape. Low priority. |
| `default_proc=` | 🚫 | Destructive mutation. |
| `delete` | 🚫 | Destructive mutation (shape change). |
| `delete_if` | 🚫 | Destructive mutation. |
| `detect` | 🔷 | BlockFolding `FALSEY_BLOCK_NIL_METHODS` → `Constant[nil]` on falsey block. |
| `dig` | ✅ | `hash_dig` — extracts nested values via static key chain. |
| `drop` | 🚫 | Enumerable. Returns Array of `[k,v]`. |
| `drop_while` | 🔷 | BlockFolding `FILTER_KEEP_ON_FALSEY` — returns receiver on falsey block. |
| `each` | 🚫 | Iterator. Returns self / Enumerator. |
| `each_cons` | 🚫 | Enumerable. |
| `each_entry` | 🚫 | Enumerable. |
| `each_key` | 🚫 | Iterator. |
| `each_pair` | 🚫 | Alias of `each`. |
| `each_slice` | 🚫 | Enumerable. |
| `each_value` | 🚫 | Iterator. |
| `each_with_index` | 🚫 | Enumerable. |
| `each_with_object` | 🚫 | Enumerable. |
| `empty?` | ✅ | `hash_empty?` — `Constant[bool]` on closed shape. |
| `entries` | ✅ | Alias of `to_a`. Registered `entries: :hash_to_a` in HASH_SHAPE_HANDLERS. |
| `except` | ✅ | **High priority.** Complement of `slice`. Generates child HashShape from static key list. `ShapeDispatch#hash_except`. |
| `fetch` | ✅ | `hash_lookup` — static key. RBS fallback on missing key. |
| `fetch_values` | ✅ | Similar to `values_at`. Static key list → `Tuple[V_1…]`. Missing key declines (RBS shows raise) so can sit beside `values_at` implementation. Medium priority. |
| `filter` | 🔷 | Alias of `select`. Via BlockFolding. |
| `filter!` | 🚫 | Destructive mutation. |
| `filter_map` | 🚫 | Enumerable. Two-arg-block issue. |
| `find` | 🔷 | BlockFolding `FALSEY_BLOCK_NIL_METHODS`. |
| `find_all` | 🔷 | Alias of `select`. Via BlockFolding. |
| `find_index` | 🔷 | BlockFolding `FALSEY_BLOCK_NIL_METHODS`. |
| `first` | ✅ | `hash_first` — returns first entry as `Tuple[K, V]`. |
| `flat_map` | 🚫 | Enumerable. Two-arg-block issue. |
| `flatten` | ✅ | `hash_flatten` — returns Tuple of `[k1,v1,k2,v2,…]`. |
| `grep` | 🚫 | Enumerable. |
| `grep_v` | 🚫 | Enumerable. |
| `group_by` | 🚫 | Enumerable. Returns `Hash[K, Array[V]]` — complex. |
| `has_key?` | ✅ | **High priority.** Synonym for `key?`/`member?`/`include?`. `Constant[true/false]` on static keys. `ShapeDispatch#hash_has_key?`. |
| `has_value?` | ✅ | `Constant[true/false]` when all values are Constant. Low priority. |
| `include?` | ✅ | Alias of `has_key?`. Same handler registered in `ShapeDispatch#hash_has_key?`. |
| `inject` | 🚫 | Enumerable accumulator. |
| `invert` | ✅ | `hash_invert` — returns inverted HashShape when all values are Constant[Symbol/String]. |
| `keep_if` | 🚫 | Destructive mutation (equivalent to `select!`). |
| `key` | ✅ | Value → key reverse lookup. `Constant[k]` when all values are Constant and unique. Low priority. |
| `key?` | ✅ | Synonym of `has_key?`. High priority. Same handler in `ShapeDispatch#hash_has_key?`. |
| `keys` | ✅ | `hash_keys` — returns `Tuple[Constant[k]…]`. |
| `lazy` | 🚫 | Enumerator::Lazy. |
| `length` | ✅ | Delegates to `hash_size`. |
| `map` | 🚫 | Synonym of `collect`. Two-arg-block issue. |
| `max` | 🚫 | Enumerable. Pair ordering comparison is complex. |
| `max_by` | 🚫 | Enumerable. |
| `member?` | ✅ | Synonym of `has_key?`. High priority. Same handler in `ShapeDispatch#hash_has_key?`. |
| `merge` | ✅ | `hash_merge` — right-biased merge on both-side-closed HashShape. |
| `merge!` | 🚫 | Destructive mutation. `!` blocked. |
| `min` | 🚫 | Enumerable. |
| `min_by` | 🚫 | Enumerable. |
| `minmax` | 🚫 | Enumerable. |
| `minmax_by` | 🚫 | Enumerable. |
| `none?` | ✅ | **High priority.** No-arg / no-block → `Constant[shape.pairs.empty?]`. Mirror of `hash_any?`. `ShapeDispatch#hash_none?`. |
| `one?` | ✅ | No-arg / no-block → `Constant[shape.pairs.size == 1]`. Medium priority. |
| `partition` | 🚫 | Enumerable. Returns `[[k,v],…] × 2`. |
| `rassoc` | 🔲 | Value → `[k, v]` reverse lookup. Tuple when all values are Constant and unique. Low priority. |
| `reduce` | 🚫 | Enumerable accumulator. |
| `rehash` | 🚫 | Destructive mutation (recomputes key hashes). |
| `reject` | 🔷 | BlockFolding `FILTER_KEEP_ON_FALSEY` — returns receiver on falsey block. |
| `reject!` | 🚫 | Destructive mutation. |
| `replace` | 🚫 | Destructive mutation. |
| `reverse_each` | 🚫 | Enumerator. |
| `select` | 🔷 | BlockFolding `FILTER_KEEP_ON_TRUTHY` — returns receiver on truthy block. |
| `select!` | 🚫 | Destructive mutation. |
| `shift` | 🚫 | Destructive mutation (removes first pair). |
| `size` | ✅ | `hash_size` — `Constant[pairs.size]`. |
| `slice` | ✅ | **High priority.** `slice(:k1, :k2)` → returns corresponding child HashShape. `ShapeDispatch#hash_slice`. |
| `slice_after` | 🚫 | Enumerable. |
| `slice_before` | 🚫 | Enumerable. |
| `slice_when` | 🚫 | Enumerable. |
| `sort` | 🚫 | Returns `Array[[K,V]]`. Complex. |
| `sort_by` | 🚫 | Enumerable. |
| `store` | 🚫 | Alias of `[]=`. Destructive mutation. |
| `sum` | 🚫 | Enumerable. |
| `take` | 🚫 | Enumerable. Array of pairs. |
| `take_while` | 🔷 | BlockFolding `FILTER_KEEP_ON_TRUTHY`. |
| `tally` | 🚫 | Enumerable. |
| `to_a` | ✅ | `hash_to_a` — returns `Tuple[Tuple[K,V],…]`. |
| `to_h` | ✅ | `hash_to_h` — returns self. |
| `to_hash` | ✅ | Alias of `to_h`. Just add same entry to HASH_SHAPE_HANDLERS. Low priority. |
| `to_proc` | 🚫 | Returns `Proc`. Not needed for static typing. |
| `to_set` | 🚫 | Returns `Set`. |
| `transform_keys` | ✅ | ExpressionTyper `try_hash_shape_block_fold` — new HashShape with transformed keys. |
| `transform_keys!` | ✅ | Same (bang form). |
| `transform_values` | ✅ | ExpressionTyper `try_hash_shape_block_fold` — new HashShape with transformed values. |
| `transform_values!` | ✅ | Same (bang form). |
| `uniq` | 🚫 | Enumerable. |
| `update` | 🚫 | Alias of `merge!`. Destructive mutation. |
| `value?` | ✅ | Alias of `has_value?`. Low priority. |
| `values` | ✅ | `hash_values` — `Tuple[V_1,…]`. |
| `values_at` | ✅ | `hash_values_at` — `Tuple[V…]` from static key list. |
| `zip` | 🚫 | Enumerable. |

---

## Action checklist

Sorted by priority. Mark ✅ when implemented.

### High priority

- [x] `slice(*keys)` — `slice(:name, :age)` → returns corresponding child `HashShape`. Inverse of `except`. Implemented in `ShapeDispatch#hash_slice`. All args must be `Constant[Symbol|String]` and target keys must exist in shape. Missing keys are omitted (unlike `values_at`, does not fill nil).
- [x] `except(*keys)` — `except(:debug)` → `HashShape` excluding target keys. `ShapeDispatch#hash_except`. All args must be `Constant[Symbol|String]`. Keys not in shape are ignored.
- [x] `has_key?` / `key?` / `member?` / `include?` — fold to `Constant[true/false]` when arg is `Constant[Symbol|String]`. Implemented in `ShapeDispatch#hash_has_key?`, all 4 aliases registered to same handler.
- [x] `none?` (no-arg / no-block) — `Constant[shape.pairs.empty?]`. Following `hash_any?`, added `ShapeDispatch#hash_none?`.

### Medium priority

- [x] `fetch_values(*keys)` — `Tuple[V…]` when all args are `Constant[Symbol|String]` and exist in shape. Declines on missing keys (RBS shows KeyError). `ShapeDispatch#hash_fetch_values`.
- [x] `assoc(key)` — `Tuple[Constant[k], V]` when arg is `Constant[Symbol|String]` and is a known key, `Constant[nil]` for unknown keys. `ShapeDispatch#hash_assoc`.
- [x] `one?` (no-arg / no-block) — `Constant[shape.pairs.size == 1]`. `ShapeDispatch#hash_one?`.
- [x] `deconstruct_keys(keys)` — Ruby's `Hash#deconstruct_keys` returns the receiver itself regardless of the `keys` arg, so the precise answer is the shape itself. `ShapeDispatch#hash_deconstruct_keys`.
- [x] `entries` — Synonym of `to_a`. Registered `entries: :hash_to_a` in HASH_SHAPE_HANDLERS.

### Low priority

- [x] `to_hash` — Registered `to_hash: :hash_to_h` in HASH_SHAPE_HANDLERS.
- [x] `default` (no-arg / key arg) — Literal HashShape has no default value → `Constant[nil]`. `ShapeDispatch#hash_default`.
- [x] `default_proc` — Same → `Constant[nil]`. Shares `hash_default`.
- [x] `has_value?` / `value?` — `Constant[true/false]` when all values are `Constant`. `ShapeDispatch#hash_has_value?`.
- [x] `key(value)` — `Constant[k]` of first match when all values are Constant, `Constant[nil]` when not found. `ShapeDispatch#hash_key`.
- [x] `<`, `<=`, `>`, `>=` — fold subset comparison of both-side-closed HashShape (all values Constant) to `Constant[bool]`. `ShapeDispatch#hash_compare`.

---

## Implementation notes

### Where to place `slice` / `except` / `has_key?`

Add to `ShapeDispatch::HASH_SHAPE_HANDLERS`, called via `dispatch_hash_shape`. Args come as an `args` array, so check that all elements are `Type::Constant` with values of `Symbol | String` before processing.

### `none?` / `one?`

Same pattern as `hash_any?`/`hash_empty?`. Just add entries to HASH_SHAPE_HANDLERS and implement the methods.

### `fetch_values` and `assoc`

Very close implementation to `values_at` (hash_values_at). `values_at` fills missing keys with `Constant[nil]`, but `fetch_values` declines on missing keys (respects RBS raise semantics).

### `entries` / `to_hash`

Just one-line HANDLERS entry additions. Minimal regression risk.

### Subset comparison `<` / `<=` / `>` / `>=`

Fold only when both args are `Type::HashShape` (like `hash_merge`). Can statically determine whether all pairs on the left are contained in the right. Small implementation cost but also low usage frequency, hence low priority.
