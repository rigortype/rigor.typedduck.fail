---
title: "Cache Mechanism Audit Sakana"
description: "Imported from rigortype/rigor docs/notes/20260707-cache-mechanism-audit-sakana.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260707-cache-mechanism-audit-sakana.md"
sourcePath: "docs/notes/20260707-cache-mechanism-audit-sakana.md"
sourceSha: "d7da418acd55932c3ec3bc96fb1acba46022b55c46070590d62a17eaaaea6365"
sourceCommit: "c6b91b9ed767a5fb70204890947e31fa87e53e68"
sourceDate: "2026-07-07T13:56:03+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266707
---

## 次セッション向け引き継ぎメモ: キャッシュ堅牢化・コンパクト化

### 現在の状態

- 変更されているファイルは**`lib/rigor/cache/store.rb`のみ**。
- 変更量はおおよそ**+107 / -17**。
- `ruby -c lib/rigor/cache/store.rb`は**Syntax OK**。
- **spec / docs / CHANGELOGは未変更**。
- **Nix Flake経由の検証は未実施**。
- 途中のTODOと実コードが一部乖離していたため、次セッションでは**`git diff`を真実として再確認すること**。

---

## ここまでで分かったこと

### 1. ディスク使用量削減の主因は「圧縮率」ではなく「孤児世代」

実リポジトリの`.rigor/cache`では、`rbs.environment`が複数世代残っていた。

- `rbs.environment`: 約**1.77MB × 7 entry**
- 実際にliveなのは概ね1世代で、残りはorphanと見られる。
- ただしcache全体は約**16MB**程度なので、既定の**256MB byte cap**ではevictionが発火しない。

結論:

> zlibの圧縮レベルを上げるより、content-keyed producerの古い世代を回収する方が本筋。

zlib level 9の再圧縮効果は小さい。

- 全体で約8% 程度。
- env blobでは約3% 程度。

そのため、圧縮レベル変更やzstd導入は現時点では採用しない方針でよい。

---

## 既に`store.rb`に入っている変更

### 1. Payload ABI markerの追加

追加済み:

```ruby
require_relative "../version"

PAYLOAD_ABI_VERSION = Rigor::VERSION
```

`schema_marker_value`は以下の形に変更済み。

```ruby
"#{PAYLOAD_ABI_VERSION}.#{Descriptor::SCHEMA_VERSION}.#{FORMAT_VERSION}"
```

意図:

- StoreのMarshal payloadをRigor version境界でinvalidationする。
- byte layoutやdescriptor schemaが変わっていなくても、Rigor側のclass layout / semanticsが変わる可能性があるため。
- `IncrementalSnapshot`は既にfingerprintに`Rigor::VERSION`を含めているので、それとのparityでもある。

注意:

- Rigorをアップグレードするたびにcache rootが全消去される。
- 初回runはcoldになる。
- これは意図したrebuildだが、ユーザー体感コストはある。

---

### 2. `fetch_or_compute`のwrite failureを握り潰す変更

追加済みhelper:

```ruby
def write_entry_for_compute(path, descriptor, value, serialize: nil)
  return false if @read_only

  write_entry(path, descriptor, value, serialize: serialize)
  true
rescue SystemCallError, IOError
  false
end
```

効果:

- cache rootの権限問題
- disk full
- rootが途中で削除された
- read-only mount

などfilesystem側の問題で解析runが落ちず、単に「cache writeに失敗したmiss」として進む。

意図的に残している挙動:

- serializerが`String`を返さない等のproducer contract違反は`TypeError`として見える。
- これは開発者に知らせるべきエラーなので握り潰さない。

---

### 3. rename後のdirectory fsync

`atomically_replace`のrename後に以下が呼ばれるようになっている。

```ruby
fsync_directory(File.dirname(path))
```

`fsync_directory`はbest-effortで、失敗は握り潰す。

意図:

- temp file自体のfsyncに加えて、renameのdirectory entry側の耐久性を少し上げる。
- platform差があるため、失敗してもrunは壊さない。

---

### 4. stale temp file cleanup

追加済み:

```ruby
STALE_TEMP_FILE_AGE_SECONDS = 60 * 60
```

`cleanup_stale_temp_files`が`*.tmp.*`のうち1時間以上古いものを削除する。

注意:

- 現ディスク上ではtemp leakは観測されていない。
- 防御的改善。

---

### 5. whole-project producerのgeneration cap

追加済み:

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

`evict_excess_generations`がproducerごとに古い世代を削除する。

意図:

- byte capに届かないorphan世代を回収する。
- 特にRBS系producerはlive世代が少ないため効果がある。

不確実性:

- `analysis.run-diagnostics`のcap `16`は要注意。
- 多数の異なるinvocation path-setを使う運用では、まだ使える世代を消す可能性がある。
- hardcoded allow-listなので、新規whole-project producerは自動ではcapされない。

---

## まだ未完了の重要項目

### 1. read-only storeのstale marker guard

現状、`ensure_schema_version!`は未変更。

現在のコードはread-onlyで即returnする。

```ruby
return if @read_only
```

問題:

- Rigor upgrade後、writable runがまだ走っていない。
- `schema_version.txt`は古いmarkerのまま。
- LSP / editor modeはread-only store。
- read-only storeはmarkerを確認せず、古いMarshal blobを読んでしまう。

これはpayload ABI markerの価値を半分未完成にしている。

次に必要な修正:

- read-only modeでも**markerがcurrentの場合だけdisk readを許可**する。
- marker missing / stale / unreadableならdiskはmiss扱い。
- read-onlyなのでroot clearやmarker writeはしない。

設計案:

```ruby
disk_available = ensure_schema_version!
path = disk_available ? entry_path(...) : nil
```

`ensure_schema_version!`はbooleanを返す形にする。

- writable + marker OK / repaired: `true`
- read-only + marker current: `true`
- read-only + marker missing/stale/unreadable: `false`
- filesystem failure: `false`

---

### 2. marker / disk failureのin-memory-only degrade

現状、`ensure_schema_version!`は`mkdir_p`, `File.read`, `File.write`, `Dir.children`などでraiseしうる。

改善したい挙動:

- cache rootが壊れている
- 権限がない
- rootが消えた
- markerが読めない / 書けない

こうした場合でも解析runを壊さない。

候補:

```ruby
@disk_disabled = true
```

を導入し、marker確認・修復に失敗したら、そのStore instanceではdiskを諦めてin-memory memoのみ使う。

期待挙動:

- producer blockは通常通り実行。
- disk read / writeはしない。
- statsはmissとして記録。

---

### 3. `atomically_replace`失敗時のtemp cleanup

現状、`atomically_replace`には失敗時のensure cleanupがない。

現在は1時間後の`cleanup_stale_temp_files`に頼る形。

次に入れるとよい形:

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

### 4. specs未追加

最低限ほしいfocused specs:

- `schema_marker_value`が`Rigor::VERSION`を含む。
- stale marker時にwritable storeはrootをclearする。
- read-only storeはcurrent markerのときだけdisk hitを許す。
- read-only storeはstale / missing markerのentryを読まない。
- `fetch_or_compute`はfilesystem write failureで落ちない。
- serializer contract errorは握り潰さない。
- failed temp file cleanup。
- stale `*.tmp.*` cleanup。
- generation capがold entriesを消す。
- generation capがallow-list以外のproducerを消さない。
- `max_bytes: nil`のときtemp cleanup / generation capを動かすかどうかの仕様確認。

---

### 5. docs / CHANGELOG未更新

更新対象:

#### `docs/internal-spec/cache.md`

現在`"4.2"`と書かれている箇所を更新する。

新形式:

```text
<Rigor::VERSION>.<Descriptor::SCHEMA_VERSION>.<Store::FORMAT_VERSION>
```

read-only marker semantics / generation cap / stale temp cleanupも記載する。

#### `docs/adr/54-cache-slimming.md`

WD3のeviction説明に補足する。

要旨:

- byte capだけでは小規模repoのorphan世代が残る。
- whole-project producerにはgeneration capを追加した。

#### `CHANGELOG.md` `[Unreleased]`

候補:

```markdown
- **[cache]** Persistent cache entries are now rebuilt after a Rigor upgrade and old cache generations are reclaimed more aggressively.
  - The cache root marker now includes the Rigor version, so Marshal payloads written by an older release are not reused after an upgrade.
  - Whole-project cache producers now keep only a small number of recent generations, which prevents stale RBS and run-result cache entries from accumulating below the global byte cap.
```

---

## 次セッションの推奨順序

1. **`ensure_schema_version!`をboolean化**
   - read-only stale guard
   - disk failure degrade
   - この2つを同時に閉じる。
   - ABI markerの価値を完成させる最重要部分。

2. **`fetch_or_compute` / `fetch_or_validate`に`disk_available` gateを入れる**
   - disk unavailable時はreadもwriteもしない。
   - producer blockは実行する。
   - memoには載せる。

3. **`atomically_replace`にensure cleanupを入れる**

4. **focused specsを追加**

5. **docs / CHANGELOG更新**

6. **検証**

最低限:

```sh
nix --extra-experimental-features 'nix-command flakes' develop --command bundle exec rspec spec/rigor/cache/store_spec.rb
nix --extra-experimental-features 'nix-command flakes' develop --command ruby -c lib/rigor/cache/store.rb
nix --extra-experimental-features 'nix-command flakes' develop --command git diff --check
```

可能なら:

```sh
nix --extra-experimental-features 'nix-command flakes' develop --command make verify
```

---

## 設計判断とトレードオフ

### 採用: payload ABI marker

理由:

- Marshal payloadはbyte formatが同じでも、Rigor側のclass layout / semantics変更でstaleになりうる。
- `IncrementalSnapshot`とのparityがある。

トレードオフ:

- Rigor upgradeごとにcache root全消去。
- 初回cold runが発生。

---

### 採用: generation cap

理由:

- content-keyed producerは新keyを書く一方で旧keyを消さない。
- byte capだけでは小さいorphanが残る。
- 実リポジトリで`rbs.environment`のorphan世代を確認済み。

トレードオフ:

- hardcoded allow-list。
- `analysis.run-diagnostics` cap=16の妥当性は要確認。
- 将来的にはproducer metadataで`generation_cap:`を宣言する設計の方がよい可能性がある。

---

### 採用: filesystem failureのdegrade

理由:

- cacheはbest-effort。
- 解析runを壊してはいけない。

注意:

- producer contract errorまで握り潰すとバグを隠すため、serializerの型違反は見えるままでよい。

---

### 非採用: zlib level tuning / zstd

理由:

- 実測で効果が小さい。
- zstdは新規依存にもなる。
- 現在の主要問題は圧縮率ではなくorphan accumulation。

---

## 最後に

次セッションでは、まず**read-only marker guard**と**disk failure degrade**を閉じるのが最優先。

現在入っているABI markerは方向性として正しいが、read-only storeが古いmarkerを確認せずに読むため、LSP / editor pathではまだstale payload reuseの穴が残っている。そこを閉じてからspecs / docs / verificationに進むのが安全。