---
title: "キャッシュのハードニング / コンパクション —— アクション可能な計画"
description: "rigortype/rigor docs/notes/20260707-cache-hardening-plan.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260707-cache-hardening-plan.md"
sourcePath: "docs/notes/20260707-cache-hardening-plan.md"
sourceSha: "07601fc28f8c67a92787e9c2604e4351d274d45acdc0b8c328779e1e2585f2f1"
sourceCommit: "a8b1d0b5be985ab476a08e5c8a48400f61e476cc"
translationStatus: "translated"
sidebar:
  order: 20266707
---

**ステータス（2026-07-08）: [PR #57](https://github.com/rigortype/rigor/pull/57)で実装・ランディング済み**
（3コミット）—— 以下のフェーズ1〜6はすべて完了（実装、スペック、ドキュメント、
CHANGELOG、検証グリーン）。残っているのは「Deferred」セクションのみで、現在は
`docs/ROADMAP.md`で追跡している。

引き継ぎノート[`20260707-cache-mechanism-audit-sakana.md`](../20260707-cache-mechanism-audit-sakana/)から
再計画したもので、そのノートを`lib/rigor/cache/store.rb`の実際のワーキングツリー差分に照らして
監査した後のもの（変更されたのはこのファイルのみ、約+107/−17、構文はクリーン、スペック/ドキュメント/CHANGELOGはまだなし、Flake検証もまだなし）。

## 引き継ぎノートの監査判定

ノートは正確である。「すでにランディング済み」として列挙されているものはすべて差分に存在する。

- `PAYLOAD_ABI_VERSION = Rigor::VERSION`が`schema_marker_value`に畳み込まれた（現在は
  `<Rigor::VERSION>.<Descriptor::SCHEMA_VERSION>.<FORMAT_VERSION>`）。
- `write_entry_for_compute` —— `fetch_or_compute`はファイルシステム書き込み失敗
  （`SystemCallError` / `IOError`）でもう死ななくなり、シリアライザ契約違反は依然として送出される。
- `atomically_replace`内でrenameの後に`fsync_directory`を実行（ベストエフォート）。
- `cleanup_stale_temp_files`（1時間のカットオフ）と`evict_excess_generations`
  （`GENERATION_CAP_BY_PRODUCER`、RBSの全プロジェクトプロデューサーは2に、
  `analysis.run-diagnostics`は16にキャップ）の両方を`evict!`から呼び出す。
- `producer_id_for_entry`の先頭パスセグメントの前提は妥当: `entry_path`は
  `root/<producer_id>/<key[0,2]>/<key[2..]>.entry`である。

その最優先のオープン項目は実在し、2つの呼び出し箇所で確認された。読み取り専用ストアは
`lib/rigor/language_server/project_context.rb:82`（LSP）と`lib/rigor/analysis/runner.rb:505`
（エディタ/バッファモード）で作成され、`ensure_schema_version!`はそれらに対してマーカーを
チェックせずに早期リターンする —— そのためRigorのアップグレード後、書き込み可能な実行が
ルートを修復するまで、LSPパスは旧ABIのblobを平然とアンマーシャルしてしまう。これはABIマーカーを
半ば無効化する。

この監査から得られた追加の発見（ノートには含まれない）:

- **（A）書き込み失敗ポリシーが2つのfetchパス間で不整合になった**。
  `fetch_or_compute` → `write_entry_for_compute`は意図的にシリアライザ契約エラー
  （`TypeError`等）を伝播させるが、`fetch_or_validate`は`write_entry`まわりに既存の包括的な
  `rescue StandardError`を維持しており、同じ種類のプロデューサーのバグを飲み込んでしまう。
  片方の契約（推奨: `write_entry_for_compute`のほう —— 狭いrescue、契約エラーが可視）を選び、
  両方に適用すること。
- **(B) `max_bytes: nil`は新しいコンパクションを完全に無効化する**。 `evict!`は
  `@max_bytes.nil?`で早期リターンするため、明示的に上限なしとしたストア（`cache.max_bytes: null`）は
  古いテンポラリのクリーンアップも世代キャップも受け取れない。どちらもバイト上限とは直交する:
  `null`は*サイズベースのLRU退避*をオプトアウトするのであって、証明可能に死んだ世代や
  リークしたテンポラリファイルの回収をオプトアウトするのではない。
  推奨: `@max_bytes.nil?`チェックの前に`cleanup_stale_temp_files` + `evict_excess_generations`を
  実行する（依然として`read_only`でゲートする）。キャップでゲートされるのはLRUバイトパスのみとする。
- **（C）マーカー書き込みは非アトミックである**（`File.write`）。書き込み途中のクラッシュは
  破損したマーカーを残し、次の書き込み可能な実行はそれを不一致として読み取ってルートをクリアする ——
  安全（過剰無効化であって、決して古いデータの再利用ではない）。変更は不要。理由をスペックドキュメントに記録すること。

ノートがすでに下した決定のうち、この計画が維持するもの:

- ABIマーカーは`Rigor::VERSION`のまま（`IncrementalSnapshot`とのパリティ）。リリースごとの
  コールドリビルドはADR-54後は許容範囲（プロジェクトあたり約2 MBのエンベロープ）。
- zlibレベルのチューニングもzstdもなし —— 計測された利得は全体で約8 % / envのblobで約3 %であり、
  真の問題はオーファン世代だった。これは世代キャップで対処する。
- `GENERATION_CAP_BY_PRODUCER`は当面ハードコードされた許可リストのまま。プロデューサーが宣言する
  `generation_cap:`メタデータフィールドのほうが長期的には良い形 → 先送りのフォローアップとして記録する。
  `analysis.run-diagnostics`のキャップ16は判断による選択（マルチパスセットの呼び出しはライブ世代を
  churnさせうる）。維持するが、スペックドキュメントおよびCHANGELOG近傍のノートで言及すること。

## 計画

### フェーズ1 —— ABIマーカーを完成させる: ブール値の`ensure_schema_version!` + ディスクゲート（最高価値）

`ensure_schema_version!`がディスク層が使用可能かどうかを返すようにし、Storeごとにメモ化する
（`@disk_available`のトライステートが`@schema_version_ensured`を置き換える）:

| 状況 | 結果 |
| --- | --- |
| 書き込み可能、マーカーが最新または修復済み（mkdir + クリア + 再書き込みが成功） | `true` |
| 読み取り専用、マーカーが存在し最新 | `true` |
| 読み取り専用、マーカーが欠落 / 古い / 読み取り不能 | `false`（クリアなし、書き込みなし —— 次の書き込み可能な実行が修復する） |
| チェック/修復中のあらゆるファイルシステム失敗（mkdir、read、write、clear） | `false` —— このStoreインスタンスではディスクを無効化 |

そして両方のfetchパスをゲートする:

- `fetch_or_compute`: `disk = ensure_schema_version!`。`disk`がfalseのとき`read_entry`と
  `write_entry_for_compute`をスキップする。プロデューサーブロックは依然として実行され、結果は依然として
  `@memo`にランディングする。統計はミスを記録する（そして書き込みなし）。
- `fetch_or_validate`: 同じゲート —— 利用不能のときはディスク読み取りなし、ディスク書き込みなし。

これにより、ノートに残っていた2つの正しさに関する項目が一度に閉じる: 読み取り専用の古いマーカーの穴
（LSP / エディタモード）と、「壊れたキャッシュルートが解析を壊してはならない」というデグレードである。

### フェーズ2 —— `atomically_replace`の失敗クリーンアップ

テンポラリファイルのライフサイクルを`ensure`でラップする:

```ruby
tmp = "#{path}.tmp.#{Process.pid}.#{SecureRandom.hex(4)}"
begin
  ... write, fsync, rename, fsync_directory ...
ensure
  unlink_entry(tmp) if File.exist?(tmp)
end
```

こうすることで、書き込み失敗が1時間の`cleanup_stale_temp_files`スイープに依存しなくなる。

### フェーズ3 —— この監査からの一貫性修正

1. **(A)** `fetch_or_validate`の包括的な`rescue StandardError`書き込みガードを
   `write_entry_for_compute`に置き換える（両方の呼び出し元に供するようになったならリネームする、例:
   `try_write_entry`）。注意: `fetch_or_validate`の値は既定のMarshalシリアライズに正当に失敗しうる ——
   そのdocstringは、Marshalクリーンでない値のプロデューサーはシリアライザをMUST passと述べているので、
   `TypeError`を顕在化させるのがそこでも正しい契約である。もし現在バンドルされているプロデューサーが
   飲み込みに依存しているなら、それはプロデューサー側で修正すべきバグであって、包括的なrescueを維持する理由にはならない。
2. **(B)** `evict!`内で`cleanup_stale_temp_files` + `evict_excess_generations`を
   `@max_bytes.nil?`のリターンより上に移動する（`read_only`ガードを最初に維持する）。

### フェーズ4 —— 焦点を絞ったスペック（`spec/rigor/cache/store_spec.rb`）

- `schema_marker_value`が`Rigor::VERSION`を含む。
- 書き込み可能なストアは古いマーカーでルートをクリアし、再書き込みする。
- 読み取り専用ストア: ディスクヒットは最新のマーカーがある場合のみ許可される。古い/欠落したマーカー ⇒ ミス、ルートは
  そのまま、マーカー書き込みなし。
- ファイルシステム書き込み失敗（例: 構築後に注入された書き込み不能なルート）⇒ `fetch_or_compute`と
  `fetch_or_validate`は計算した値を返し、ミスを記録し、送出しない。
- シリアライザ契約違反は両方のfetchパスで送出される（フェーズ3.1をロックイン）。
- ディスク無効化デグレード: ルートチェックに失敗したストアは二度とディスクに触れないが、メモ化する。
- `atomically_replace`の失敗は`*.tmp.*`を残さない。
- `cleanup_stale_temp_files`はカットオフより古いファイルのみを削除する。
- 世代キャップはキャップされたプロデューサーに対して最も古いものから退避する。リストにないプロデューサーには手を付けない。
- 世代キャップ + テンポラリクリーンアップは`max_bytes: nil`の下で実行される。LRUバイトパスは実行されない
  （フェーズ3.2をロックイン）。

### フェーズ5 —— ドキュメント + CHANGELOG

- `docs/internal-spec/cache.md`: マーカーの例を更新（`"4.2"` → 新しい
  `<Rigor::VERSION>.<schema>.<format>`のトリプル）。読み取り専用マーカーのセマンティクス（ブール値ゲート、
  決して修復しない）、ディスク無効化デグレード、世代キャップ（`run-diagnostics`の
  キャップ16の注意点とハードコード許可リストの制限を含む）、古いテンポラリのクリーンアップ、および
  フェーズ3.2で決定した`max_bytes: nil`のセマンティクスをドキュメント化する。
- `docs/adr/54-cache-slimming.md`: WD3の補遺 —— バイト上限だけでは小さなリポジトリでオーファン世代が残る
  （観測: 16 MBのキャッシュ下で`rbs.environment`世代が約7 × 1.77 MB）。
  全プロジェクトプロデューサーは現在世代キャップを持つ。
- `CHANGELOG.md`の`[Unreleased]`: ノートのドラフトエントリは良い。アップグレードがコールドランを
  トリガーする帰結と、読み取り専用（LSP）の古いペイロード修正で拡張すること。

### フェーズ6 —— 検証とランディング

Flake内（`nix … develop --command …`）:

1. `bundle exec rspec spec/rigor/cache/store_spec.rb`
2. `make verify`（test / lint / self-check / check-plugins）
3. `git diff --check`

ブランチ + PRとしてランディングする（グループ化された、非自明な変更 —— 現行のランディングポリシーに従い）、
1つの論理的なコミットシーケンス: フェーズ1+3（振る舞い）、フェーズ2（衛生）、フェーズ4（スペック）、フェーズ5（ドキュメント）。

## Deferred（記録のみ、今は作らない）

- ハードコード許可リストを置き換える、プロデューサーが宣言する`generation_cap:`メタデータ。
- zstd / 圧縮レベルのチューニング（計測上の非利得）。
- クロスプロジェクトの共有キャッシュルートに関するあらゆる作業（ADR-54の先送りは有効なまま）。
