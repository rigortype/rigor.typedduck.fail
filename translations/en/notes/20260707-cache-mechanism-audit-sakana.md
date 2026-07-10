---
title: "Cache mechanism audit (sakana) — hardening and compaction of the cache store"
description: "Handoff note recording the in-progress cache hardening and compaction work in lib/rigor/cache/store.rb, what has landed, what remains, and the design trade-offs."
sourceSha: "d7da418acd55932c3ec3bc96fb1acba46022b55c46070590d62a17eaaaea6365"
sourceCommit: "a8b1d0b5be985ab476a08e5c8a48400f61e476cc"
translationStatus: "translated"
---

## Handoff note for the next session: cache hardening and compaction

### Current state

- The only file changed is **`lib/rigor/cache/store.rb`**.
- The change is roughly **+107 / -17**.
- `ruby -c lib/rigor/cache/store.rb` reports **Syntax OK**.
- **spec / docs / CHANGELOG are unchanged.**
- **Verification via the Nix Flake has not been run.**
- Some of the in-progress TODOs had drifted from the actual code, so the next session **MUST re-verify against `git diff` as the source of truth**.

---

## What we've learned so far

### 1. The main driver of disk-usage reduction is "orphan generations", not "compression ratio"

In the real repository's `.rigor/cache`, several generations of `rbs.environment` were left behind.

- `rbs.environment`: about **1.77MB × 7 entries**
- Only about one generation is actually live; the rest appear to be orphans.
- However, the whole cache is only about **16MB**, so the default **256MB byte cap** never triggers eviction.

Conclusion:

> Reclaiming old generations of a content-keyed producer is more to the point than raising the zlib compression level.

Recompressing at zlib level 9 has little effect.

- About 8% overall.
- About 3% for the env blob.

So changing the compression level or introducing zstd is not worth adopting at this point.

---

## Changes already in `store.rb`

### 1. Adding a payload ABI marker

Already added:

```ruby
require_relative "../version"

PAYLOAD_ABI_VERSION = Rigor::VERSION
```

`schema_marker_value` has been changed to the following form.

```ruby
"#{PAYLOAD_ABI_VERSION}.#{Descriptor::SCHEMA_VERSION}.#{FORMAT_VERSION}"
```

Intent:

- Invalidate the Store's Marshal payload at a Rigor version boundary.
- Even when the byte layout and descriptor schema haven't changed, Rigor's own class layout / semantics may have.
- `IncrementalSnapshot` already includes `Rigor::VERSION` in its fingerprint, so this is parity with that.

Caveats:

- The cache root is wiped every time Rigor is upgraded.
- The first run after that is cold.
- This is an intended rebuild, but there is a user-perceived cost.

---

### 2. Change that swallows write failures in `fetch_or_compute`

Helper added:

```ruby
def write_entry_for_compute(path, descriptor, value, serialize: nil)
  return false if @read_only

  write_entry(path, descriptor, value, serialize: serialize)
  true
rescue SystemCallError, IOError
  false
end
```

Effect:

- Permission problems on the cache root
- Disk full
- The root being deleted mid-run
- Read-only mount

For these and other filesystem-side problems, the analysis run does not fall over; it simply proceeds as a "miss where the cache write failed".

Behavior intentionally kept:

- A producer-contract violation such as a serializer that doesn't return a `String` surfaces as a `TypeError`.
- This is an error the developer should be told about, so it is not swallowed.

---

### 3. Directory fsync after rename

After the rename in `atomically_replace`, the following is now called.

```ruby
fsync_directory(File.dirname(path))
```

`fsync_directory` is best-effort and swallows failures.

Intent:

- On top of the fsync of the temp file itself, slightly raise the durability of the rename's directory entry.
- Because of platform differences, a failure does not break the run.

---

### 4. Stale temp file cleanup

Already added:

```ruby
STALE_TEMP_FILE_AGE_SECONDS = 60 * 60
```

`cleanup_stale_temp_files` deletes any `*.tmp.*` older than one hour.

Caveats:

- No temp leak has been observed on the current disk.
- This is a defensive improvement.

---

### 5. Generation cap for whole-project producers

Already added:

```ruby
GENERATION_CAP_BY_PRODUCER = {
  "analysis.run-diagnostics" => 16,
  "rbs.class_ancestor_table" => 2,
  "rbs.class_type_param_names" => 2,
  "rbs.constant_type_table" => 2,
  "rbs.environment" => 2,
  "rbs.known_class_names" => 2
}.freeze
```

`evict_excess_generations` deletes old generations per producer.

Intent:

- Reclaim orphan generations that never reach the byte cap.
- Especially effective for the RBS-family producers, which have few live generations.

Uncertainty:

- The cap of `16` for `analysis.run-diagnostics` needs care.
- In workflows that use many different invocation path-sets, it could delete generations that are still usable.
- Because it is a hardcoded allow-list, new whole-project producers are not capped automatically.

---

## Important items still not done

### 1. Stale marker guard for the read-only store

Currently `ensure_schema_version!` is unchanged.

The current code returns immediately when read-only.

```ruby
return if @read_only
```

Problem:

- After a Rigor upgrade, no writable run has happened yet.
- `schema_version.txt` still holds the old marker.
- LSP / editor mode uses a read-only store.
- The read-only store reads an old Marshal blob without checking the marker.

This leaves the value of the payload ABI marker only half realized.

The fix needed next:

- Even in read-only mode, **allow a disk read only when the marker is current**.
- If the marker is missing / stale / unreadable, treat the disk as a miss.
- Because it is read-only, do not clear the root or write the marker.

Design sketch:

```ruby
disk_available = ensure_schema_version!
path = disk_available ? entry_path(...) : nil
```

Make `ensure_schema_version!` return a boolean.

- writable + marker OK / repaired: `true`
- read-only + marker current: `true`
- read-only + marker missing/stale/unreadable: `false`
- filesystem failure: `false`

---

### 2. In-memory-only degrade on marker / disk failure

Currently `ensure_schema_version!` can raise from `mkdir_p`, `File.read`, `File.write`, `Dir.children`, and so on.

Desired behavior:

- The cache root is corrupt
- No permission
- The root is gone
- The marker cannot be read / written

Even in these cases, don't break the analysis run.

Candidate:

```ruby
@disk_disabled = true
```

Introduce this, and if marker checking / repair fails, that Store instance gives up on disk and uses only the in-memory memo.

Expected behavior:

- Producer blocks run as usual.
- No disk read / write.
- Stats record a miss.

---

### 3. Temp cleanup when `atomically_replace` fails

Currently `atomically_replace` has no ensure cleanup on failure.

For now it relies on `cleanup_stale_temp_files` an hour later.

Good form to add next:

```ruby
tmp = nil
begin
  tmp = "#{path}.tmp.#{Process.pid}.#{SecureRandom.hex(4)}"
  ...
ensure
  unlink_entry(tmp) if tmp && File.exist?(tmp)
end
```

---

### 4. Specs not yet added

The minimum focused specs wanted:

- `schema_marker_value` includes `Rigor::VERSION`.
- On a stale marker, a writable store clears the root.
- A read-only store allows a disk hit only when the marker is current.
- A read-only store does not read entries for a stale / missing marker.
- `fetch_or_compute` does not fall over on a filesystem write failure.
- A serializer contract error is not swallowed.
- Failed temp file cleanup.
- Stale `*.tmp.*` cleanup.
- The generation cap deletes old entries.
- The generation cap does not delete producers outside the allow-list.
- Spec confirmation of whether temp cleanup / generation cap run when `max_bytes: nil`.

---

### 5. Docs / CHANGELOG not updated

Targets to update:

#### `docs/internal-spec/cache.md`

Update the place that currently reads `"4.2"`.

New format:

```text
<Rigor::VERSION>.<Descriptor::SCHEMA_VERSION>.<Store::FORMAT_VERSION>
```

Also document the read-only marker semantics / generation cap / stale temp cleanup.

#### `docs/adr/54-cache-slimming.md`

Add to the WD3 eviction explanation.

Gist:

- The byte cap alone leaves orphan generations in small repos.
- A generation cap was added for whole-project producers.

#### `CHANGELOG.md` `[Unreleased]`

Candidate:

```markdown
- **[cache]** Persistent cache entries are now rebuilt after a Rigor upgrade and old cache generations are reclaimed more aggressively.
  - The cache root marker now includes the Rigor version, so Marshal payloads written by an older release are not reused after an upgrade.
  - Whole-project cache producers now keep only a small number of recent generations, which prevents stale RBS and run-result cache entries from accumulating below the global byte cap.
```

---

## Recommended order for the next session

1. **Make `ensure_schema_version!` boolean**
   - Read-only stale guard
   - Disk failure degrade
   - Close these two at once.
   - The most important part for realizing the full value of the ABI marker.

2. **Add a `disk_available` gate to `fetch_or_compute` / `fetch_or_validate`**
   - When disk is unavailable, neither read nor write.
   - Still run the producer block.
   - Still populate the memo.

3. **Add ensure cleanup to `atomically_replace`**

4. **Add focused specs**

5. **Update docs / CHANGELOG**

6. **Verification**

At minimum:

```sh
nix --extra-experimental-features 'nix-command flakes' develop --command bundle exec rspec spec/rigor/cache/store_spec.rb
nix --extra-experimental-features 'nix-command flakes' develop --command ruby -c lib/rigor/cache/store.rb
nix --extra-experimental-features 'nix-command flakes' develop --command git diff --check
```

If possible:

```sh
nix --extra-experimental-features 'nix-command flakes' develop --command make verify
```

---

## Design decisions and trade-offs

### Adopted: payload ABI marker

Reasons:

- A Marshal payload can go stale from a change in Rigor's class layout / semantics even when the byte format is the same.
- There is parity with `IncrementalSnapshot`.

Trade-offs:

- The whole cache root is wiped on every Rigor upgrade.
- A first cold run occurs.

---

### Adopted: generation cap

Reasons:

- A content-keyed producer writes new keys but does not delete old keys.
- The byte cap alone leaves small orphans behind.
- Orphan generations of `rbs.environment` were confirmed in the real repository.

Trade-offs:

- A hardcoded allow-list.
- The validity of `analysis.run-diagnostics` cap=16 needs confirmation.
- In the future, a design that declares `generation_cap:` in producer metadata may be better.

---

### Adopted: degrade on filesystem failure

Reasons:

- The cache is best-effort.
- The analysis run must not be broken.

Caveat:

- Swallowing even a producer contract error would hide bugs, so a serializer type violation may stay visible.

---

### Not adopted: zlib level tuning / zstd

Reasons:

- Measurements show little effect.
- zstd would also be a new dependency.
- The main problem right now is orphan accumulation, not compression ratio.

---

## Finally

For the next session, closing the **read-only marker guard** and the **disk failure degrade** first is the top priority.

The ABI marker as it currently stands is right in direction, but because the read-only store reads without checking an old marker, a stale-payload-reuse hole still remains on the LSP / editor path. It is safe to close that first, then move on to specs / docs / verification.
