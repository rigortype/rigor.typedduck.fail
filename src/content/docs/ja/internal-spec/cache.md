---
title: "キャッシュレイヤー — `Rigor::Cache`"
description: "rigortype/rigor docs/internal-spec/cache.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/cache.md"
sourcePath: "docs/internal-spec/cache.md"
sourceSha: "acff734a6dd59dd8733e6e4d563c3cc84b01d5d8cda0366d2fd2956c8f1bb919"
sourceCommit: "42402864a316beb0d5ba4357ec29454ab55f6657"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス: **安定（v0.0.8で導入;現行ディスクリプタスキーマv5）**。このドキュメントはキャッシュレイヤーの公開リード形を追跡します。以下のスライス（slice）はすべて着地し、v0.1.x全体で安定しています;ディスクリプタの`SCHEMA_VERSION`はADR-10のgemバージョンごとの`dependencies`スロットのために`2`へ、`RbsLoader.build_env_for`が欠落した`signature_paths:`名前空間を合成し始めたときに`3`へ（古いRigorによってmarshalされたRBS環境——それらのシグネチャを不活性なまま残してしまう——は再構築されます）、[ADR-60](../adr/60-pre-freeze-plugin-contract-consolidation.md) WD3がレコードアンドバリデートのプラグインプロデューサーキャッシュ向けに`globs`スロット（`GlobEntry`）を追加したときに`4`へ、そして[ADR-87](../adr/87-null-build-floor.md) WD1が`:stat` `FileEntry` comparator（statしてからダイジェストの検証）を追加したときに`5`へ引き上げられました。v0.0.8の5つのスライスがすべて着地しました。`Rigor::Cache::Descriptor`（スライス1 —— すべてのキャッシュ済み値が付随する基板）、`Rigor::Cache::Store`（スライス2 —— ディスクリプタ・プロデューサー・パラメータを消費してキャッシュ済みまたは新規計算済みの値を返すファイルシステムバックのストレージ）、最初のキャッシュ済みプロデューサー —— RBS定数テーブル（スライス3）——、CLI可観測フラグ`--cache-stats` / `--clear-cache`（スライス4）、そして診断の来歴（スライス5）です。さらに4つのRBS由来のプロデューサーがv0.0.9で着地しました。

このモジュールが実装するスキーマは以下によって固定されています。

- **[`docs/design/20260505-cache-slice-taxonomy.md`](../../design/20260505-cache-slice-taxonomy/)** — スロットごとのエントリーシェイプ（shape）・合成ルール・キャッシュキー導出・粒度ガイダンス。
- **[`docs/adr/6-cache-persistence-backend.md`](../../adr/6-cache-persistence-backend/)** — バックエンド選択（バイナリエントリーのシャードディレクトリ）・ファイルフォーマット・アトミック性・ロッキング・立ち退きポリシー。

## `Rigor::Cache::Descriptor`（v0.0.8スライス1）

キャッシュ無効化ディスクリプタ — 6つのスロットを持つ純粋な値オブジェクトで、各スロットは型付きエントリーの配列です。

### スロットエントリー

```
FileEntry       :: { path: String, comparator: :digest|:stat|:mtime|:exists, value: String }
GemEntry        :: { name: String, requirement: String, locked: String? }
PluginEntry     :: { id: String, version: String, config_hash: String? }
ConfigEntry     :: { key: String, value_hash: String }
DependencyEntry :: { gem_name: String, gem_version: String, mode: :disabled|:when_missing|:full }
GlobEntry       :: { root: String, pattern: String, value: String }
```

各エントリーはキーワード引数で構築され、即座にフリーズされます。`FileEntry#new`はcomparatorのenumを検証し、`DependencyEntry#new`は`mode`のenumを検証し、それぞれ未知の値に対して`ArgumentError`を発生させます。他のエントリーは任意の文字列コンテンツを受け入れます（その値は慣例上すでに正規化されたハッシュです）。`DependencyEntry`はADR-10のgemバージョンごとのスロットです: その`(gem_name, gem_version, mode)`のトリプルがオプトインの依存関係ソース推論キャッシュスライス（slice）をキー付けるので、`Gemfile.lock`のバンプや`source_inference:`モード変更（[`dependency-source-inference.md`](dependency-source-inference.md)）がちょうど影響を受けるgemだけを無効化します。`GlobEntry`はADR-60 WD3のレコードアンドバリデートスロットです: その`value`は`root`/`pattern`に一致するすべてのファイルのダイジェスト（`GlobEntry.compute`で構築される）であり、再globによって再検証されるため、プラグインプロデューサーの`watch:` globのカバレッジが編集をまたいで鮮度を保ちます。[ADR-87](../adr/87-null-build-floor.md) WD2以降、このglobごとのダイジェストはファイルの内容ではなく、ソートされた**statタプル**（`"<path>\0<size>\0<mtime_ns>\0<ctime_ns>\0<inode>\n"`の各行）に対するSHA-256です —— 再検証は再globして再statし、変更のないツリーでは内容を1バイトも読まない一方、任意の編集（mtime + ctimeを動かす）は依然としてシグネチャを動かします。

`:stat` comparatorは、個々の`FileEntry`スロット向けのADR-87 WD1のstatしてからダイジェストの階層です。その`value`は`"<digest> <size> <mtime_ns> <ctime_ns> <inode> <recording_instant_ns>"`をパックします: 検証（`FileDigest.stat_fresh?`）はまずファイルをstatし、タプルが動いたとき、またはレーシーウィンドウガードが発火したとき（ファイルのmtimeがエントリーの記録時刻より厳密に古くない）にのみ、完全な内容ハッシュ（`FileDigest.hexdigest`）へフォールバックします。valueにパックされたSHA-256ダイジェストは依然として唯一の変更**authority（権威）**のままです —— 動かなかったstatは検証がその再計算をスキップできるようにするだけです;statは動いたが内容は同一（素の`touch`）である`:stat`エントリーは再ハッシュされ、正しく鮮度ありと判定されます。`:stat`階層は検証専用ディスクリプタ（ADR-45の依存関係ディスクリプタ、プラグインの`watch:` glob）に乗ります;キャッシュ*キー*ディスクリプタは決定的な`:digest` comparatorを保ちます。`cache.validation: digest`（または、それが優先される`RIGOR_STRICT_VALIDATION=1` env）は、statを信頼できないファイルシステムのために、すべてのエントリーを`:digest`へ強制的に戻します。このキーのデフォルトは`auto`（#190）です: `CiDetector`がCIプロバイダを認識したときは`digest`へ解決され——新鮮なチェックアウトはすべてのstatタプルを再生成するため、stat階層は決してショートサーキットできず、statシグネチャのglobスロットは毎回のランで陳腐と読まれてしまう——、それ以外のあらゆる場所では`stat`へ解決されます。解決はランごとに行われ（`Configuration#cache_validation_strict?`）、`RIGOR_CI_DETECT=0`のキルスイッチを尊重し、明示的な`stat` / `digest`は常に優先されます（永続ワークスペースのCIランナーは`stat`でstatフロアへオプトインし直します）。

### `Descriptor.new(files: [], gems: [], plugins: [], configs: [], dependencies: [], globs: [])`

ディスクリプタを構築します。すべてのスロットはデフォルトで空配列になります。スロットはdupされてフリーズされるため、構築後に呼び出し元が変更することはできません。ディスクリプタ自体もフリーズされます。

### `Descriptor.compose(*descriptors) -> Descriptor`

任意の数のディスクリプタを1つのディスクリプタに合成します。スロットごとの合成ルールは**キーによるユニオン（union、合併型とも）**です。

- `files`は`path`でグループ化します。グループ内のエントリーはより**厳格な**comparatorを優先します（`:stat > :digest > :mtime > :exists`;`:stat`と`:digest`を別々にランク付けすることが、両方の下で貢献したパスが値の`Conflict`を決して発生させないことを保証します。両者の`value`文字列は構築上異なるからです）。最も厳格なcomparatorの中で、すべてのエントリーが`value`について合意していなければ`Descriptor::Conflict`が発生します。
- `gems`は`name`でグループ化します。グループ内のすべてのエントリーは`(requirement, locked)`の下で構造的に等しくなければなりません。そうでなければ`Conflict`が発生します。
- `plugins`は`id`でグループ化します。`(version, config_hash)`で同じ等値ルールが適用されます。
- `configs`は`key`でグループ化します。`value_hash`で同じ等値ルールが適用されます。
- `dependencies`は`gem_name`でグループ化します。`(gem_version, mode)`で同じ等値ルールが適用されます。
- `globs`は`slot_key`（`root` + `pattern`）でグループ化します。`value`で同じ等値ルールが適用されます。

自分自身のディスクリプタに重複した等しいエントリーを追加する単一の貢献者は無害です。`compose`はそれを折り畳みます。コンフリクトは例外的なケースです。呼び出し元（キャッシュレイヤー）は`Conflict`を「このキャッシュスライスは再利用できない、削除する」として扱い、いずれかのコントリビューションを黙って選択することはしません。

### `descriptor.cache_key_for(producer_id:, params: {}) -> String`

プロデューサー・入力・ディスクリプタの組み合わせに対して標準的なhex SHA-256キャッシュキーを返します。キーは以下を組み込みます。

1. `Descriptor::SCHEMA_VERSION`（現在は`5` — v2はADR-10のgemバージョンごとのキャッシュスライスのために`dependencies`スロットを追加した;v3は`build_env_for`が欠落した`signature_paths:`名前空間を合成し始める前にmarshalされたRBS環境を無効化する;v4はADR-60 WD3のレコードアンドバリデートのプラグインプロデューサーキャッシュのために`globs`スロットを追加した;v5はADR-87 WD1のstatしてからダイジェストの検証のために`:stat` `FileEntry` comparatorを追加した）。この定数をバンプするとすべてのキャッシュ済み値が無効化されます。
2. `producer_id`（キャッシュスライスの名前空間となる安定した文字列）。
3. `params`（プロデューサーの入力ハッシュ）。再帰的に正規化されます。ハッシュキーは文字列化してソートし、シンボルは文字列化し、配列は順序を保持します。
4. ディスクリプタの正規ハッシュ形式。

構造的に同等なディスクリプタを同じ`producer_id`と`params`で構築する2つの呼び出し元は、構築順に関係なく同一のキャッシュキーを生成します。

### `descriptor.to_canonical_bytes -> String`

ディスクリプタを正規JSONバイト文字列（UTF-8、転送のためにバイナリエンコード）として返します。スロットは辞書順で現れ（`configs`・`dependencies`・`files`・`gems`・`globs`・`plugins`）、各スロット内のエントリーはキーフィールドでソートされます（filesなら`path`、globsなら`(root, pattern)`など）。これにより2つの同等なディスクリプタは同一のバイト列を生成します。

### 等値性とハッシュ

`Descriptor#==`は正規バイト形式を比較するため、異なる順序で構築された2つのディスクリプタは等しく比較されます。`#hash`は`==`と整合しているため、ディスクリプタはHashのキーとして使用できます。

## 安定性

コンストラクタシグネチャと合成セマンティクスはv0.0.xの公開リード形として安定しています。新しいスロット種（例: `env_vars`）の追加はtaxonomyドキュメントとADR-6に従いスキーマバージョンバンプになります。`FileEntry::VALID_COMPARATORS`（現在は`%i[digest stat mtime exists]`）へのcomparatorの追加は挙動としては加算的ですが、comparatorは`cache_key_for`を通じてキャッシュキーに畳み込まれるため、ADR-87の`:stat`追加は`SCHEMA_VERSION`のバンプ（4 → 5）を要しました —— `:stat`以前のエントリーが、古いライターが決して使わなかったcomparatorの下で信頼されるのではなく、クリーンなミスとして読まれるようにするためです。

## `Rigor::Cache::Store`（v0.0.8スライス2）

ファイルシステムバックのキャッシュストア。ADR-6 § "Decisions in detail"が契約（contract）を固定します。このセクションはプロデューサーとCLIが消費する公開リード形を文書化します。

### `Store.new(root:, read_only: false, max_bytes: nil)`

`root`（ディレクトリパス、通常は`.rigor/cache`）をルートにするストアを構築します。ディレクトリは積極的に作成されません。最初の書き込みで`schema_version.txt`マーカーとともに実体化されます。`read_only:`はすべての書き込みを抑制します（ワーカーが親のキャッシュと競合せずに共有できるようにする）。`max_bytes:`はディスク上のサイズに上限を設け、LRUの`#evict!`パスを起動します（本番デフォルトは256 MBで、[ADR-54](../adr/54-cache-slimming.md) WD3に従いCLIが設定します。ここで`nil`にするとキャッシュは無制限になります）。

すべての`fetch_or_compute` / `fetch_or_validate`呼び出しは、まずStoreの生存期間についてディスク層の可用性を解決します（最初のチェック後にメモ化される —— 下記の「スキーマバージョンマーカー」を参照）: 利用不可なら、プロデューサーブロックは依然として走り——`fetch_or_compute`についてはその結果も依然としてインプロセスのメモに着地しますが——ディスクの読み書きは試みられません。`fetch_or_validate` / `peek_validated`は意図的にインプロセスでは**メモ化されません**: 検証は常にファイルシステムを再チェックします。これは2つの状況をカバーします —— 信頼してはならないマーカーに直面した読み取り専用ストアと、キャッシュルートを読めない/修復できない書き込み可能なストア（パーミッションエラー、ディスクフル、ルート削除、読み取り専用マウント）—— どちらも解析実行を決して壊してはなりません。

### `store.fetch_or_compute(producer_id:, params:, descriptor:, generation_cap:, serialize: nil, deserialize: nil) { ... } -> Object`

計算キーのプロデューサーエントリーポイント。下記の`fetch_or_validate`はレコードアンドバリデートのバリアントで、`peek_validated`はその読み取り専用のプローブ半分です。

- `producer_id`（String） — キャッシュ名前空間。`[a-z][a-z0-9._-]*`のみ受け入れます。この制約により、大小文字を区別しないファイルシステム上でもファイルシステムに適したディレクトリ名が保証されます。
- `params`（Hash） — プロデューサーの入力引数。{Descriptor#cache_key_for}でキャッシュキーに組み込まれます。プロデューサーはキャッシュキー自体を導出しません。
- `descriptor`（[`Rigor::Cache::Descriptor`](#rigorcachedescriptor-v008-slice-1)） — キャッシュ済み値の無効化ディスクリプタ。
- `generation_cap`（Integerまたは`:unbounded`、**必須**） — プロデューサー自身のコンパクション予算。下記 § 「コンパクション（`#evict!`）」に従います。省略可能ではありません: ディスクに到達するプロデューサーは、自身の何世代が蓄積されうるかを表明済みです。
- `serialize`（callable、省略可能） — プロデューサーの戻り値をバイナリ`String`に変換します。デフォルトは`Marshal.dump(value).b`です。`Marshal`でクリーンでない戻り値（`RBS::Location`メンバーを持つRBSネイティブオブジェクト・生の`IO`など）を持つプロデューサーはシリアライザをMUST提供しなければなりません。
- `deserialize`（callable、省略可能） — バイトをプロデューサーの値に戻します。デフォルトは`Marshal.load`です。`(serialize, deserialize)`のペアはラウンドトリップをMUST保証しなければなりません。一方の戦略で読み込み他方で書き込むプロデューサーは自分のキャッシュスライスを破壊します。デシリアライザが発生させた例外（`StandardError`）はキャッシュミスとして扱われます。エントリーは破損とみなされ、プロデューサーブロックが再実行され、次の書き込みでそれが上書きされます。これは以下の読み込みフォールトトレランスルールと一致します。
- ブロック（`yield`）は**キャッシュミス時のみ**呼び出されます。

キャッシュ済み値を返します（ヒット時はディスクからロード、ミス時はブロックが生成）。

### `store.fetch_or_validate(producer_id:, key_descriptor:, generation_cap:, params: {}, serialize: nil, deserialize: nil) { ... } -> Object`

レコードアンドバリデートのバリアント（[ADR-45](../adr/45-unchanged-project-fast-path.md)）。`fetch_or_compute`——エントリーを入力のディスクリプタでキー付けるため、プロデューサー実行前にすべての入力が既知でなければMUSTならない——とは異なり、これは`key_descriptor`（前もって既知の安定した入力のみ）でキー付け、値とともに、その値が実際に読み込んだファイルの`dependency_descriptor`を、**計算中に発見された入力も含めて**（例: 解析の途中でプロジェクトファイルを読むプラグイン）格納します。ブロックは`[value, dependency_descriptor]`をMUST返さなければなりません。次回のランでは、格納された依存関係ディスクリプタが`Descriptor#fresh?`を通じてファイルシステムに対して再検証され——記録された各`FileEntry` / `GlobEntry`がまだ一致していなければならず——古い依存関係は再計算を強制します。**ディスク側**の書き込み失敗（パーミッション、ディスクフル、ルート削除、読み取り専用マウント）は飲み込まれます。新たに計算された値が返され、次回のランで再計算されます。**プロデューサーの契約違反はそうではありません** —— `Marshal.dump`がシリアライズできない値、または非`String`を返すカスタムの`serialize:`は、`fetch_or_validate`から送出され**ランを中断します**。コールドランへ劣化はしません: 書き込みパスは意図的に`SystemCallError` / `IOError`のみをrescueするので、バグは、毎回のランに黙って再計算のコストを課すのではなく、可視になります。値が`Marshal`でクリーンでないプロデューサーは`serialize:` / `deserialize:`のペアをMUST提供しなければなりません。これは、Rigorが前もって見えないファイルをプラグインが読むと古くなってしまう解析前フィンガープリントの、健全な後継です。

`Descriptor#fresh?`は、ディスクリプタの`gems` / `plugins` / `configs` / `dependencies`スロットがすべて空であるときにのみそのディスクリプタを鮮度ありとみなします（これらの非ファイル入力は検証対象セットではなくキャッシュの*キー*に属します）。いずれかを持つディスクリプタは決して鮮度ありになりません。

### `store.peek_validated(producer_id:, key_descriptor:, params: {}, deserialize: nil) -> Object?`

`fetch_or_validate`の読み取り半分（[ADR-87](../adr/87-null-build-floor.md) WD4）で、計算も書き込みもありません: 鮮度のあるヒットではキャッシュ済み値を返し、ミス・古い依存関係ディスクリプタ・利用不可のディスク層では`nil`を返します。ブロックを取らずプロデューサーを決して走らせないため、永続化するものは何もありません。ブートスリミングのプローブがこれを呼び出し、推論エンジンをまったくロードせずにランの診断を提供します。ヒットは記録しますが（`--cache-stats`が依然として釣り合うように）、ミスは決して記録しません —— プローブのミスはフルパスへ引き継がれ、そちらが自身のミスを記録します。

### 読み込みフォールトトレランス

以下のいずれかに遭遇した読み込みは黙ってキャッシュミスを返します。プロデューサーブロックが再実行され、次の書き込みで破損エントリーが上書きされます。

- エントリーファイルが存在しない。
- エントリーが最小エンベロープ（ヘッダー＋トレーラー）より短い。
- マジック+フォーマットバージョンヘッダーが一致しない。
- 末尾のSHA-256が一致しない。
- varint長さプレフィックスが不正。
- `Marshal.load`が発生させる（例: 受信側に未知のクラス、ペイロードが切れている、ABIスキュー）。

末尾のSHA-256は偶発的な破損（プロセスkillによる部分書き込み、FSエラー）を検出します。ADR-2の信頼済みgemの信頼モデルに従い、セキュリティ境界では**ありません**。

### スキーマバージョンマーカー

`<root>/schema_version.txt`には`Store.schema_marker_value` ── `"<PAYLOAD_ABI_VERSION>.<Descriptor::SCHEMA_VERSION>.<Store::FORMAT_VERSION>"`（`PAYLOAD_ABI_VERSION`は`Rigor::VERSION`）が格納されます。3つの無効化軸が1つのマーカーに畳み込まれます: インストールされたRigorリリース（エントリーのMarshalペイロードはRigor/RBSオブジェクトのブロブなので、他の2つのバージョンがどちらも変わらなくてもリリースアップグレードはABI境界だ —— これは`IncrementalSnapshot`のフィンガープリントが既にカバーするのと同じ軸だ）、ディスクリプタスキーマ、そしてオンディスクのバイトレイアウト。

`Store`インスタンスごとに高々1度チェックされ（結果はブール値「ディスク層が利用可能か」としてメモ化される —— 上記の`Store.new`を参照）、書き込み可能ストアと読み取り専用ストアで異なるセマンティクスを持ちます:

**書き込み可能ストア:**

- マーカーがない → 現在の値を書き込み、続行する。ディスク利用可能。
- マーカーが一致する → 続行する。ディスク利用可能。
- マーカーが異なる → `<root>`以下のすべてのエントリーを削除し（`FileUtils.rm_rf`で各子を`unlink`）、マーカーを書き直し、キャッシュが空であるかのように続行する。ディスク利用可能。
- マーカーのチェックまたは修復中のファイルシステム失敗（パーミッションエラー、ディスクフル、ルート削除）→ このStoreの生存期間中ディスク利用不可;失敗した呼び出し自体が行ったこと以上の部分的修復は残されない。

**読み取り専用ストア**（LSP / エディタモード、`docs/design/20260516-editor-mode.md`を参照）: ルートに決して触れません —— `mkdir`なし、マーカー書き込みなし、不一致時の破壊的クリアなし。ディスクが利用可能なのは、オンディスクのマーカーが存在し現在と正確に一致するときだけです;マーカーがないか陳腐化している場合（例: 書き込み可能な実行がまだないRigorアップグレード）は、異なるABIのペイロードをアンマーシャルするリスクを冒すのではなく利用不可を報告します。次回の書き込み可能な実行が上記のようにキャッシュを修復します。

したがってバージョンのバンプにより、明示的なマイグレーションステップなしに次回の書き込み可能な実行でキャッシュファイルがすべて削除されます —— Rigorバージョン軸により、これは今やすべてのリリースアップグレードで起こり、アップグレード後の最初の書き込み可能な実行でのコールドリビルドがそのコストです。フォーマットバージョン軸はそれとは独立にディスク回収のために重要です: フォーマットのバンプ単独では古いエントリーが読めなくなる（ヘッダーの不一致 → ミス）だけで、それらを削除することは決してありません ── エビクション上限を下回ったまま無期限に居座りうるのです。それらのバイトを回収するのはマーカーの不一致です（ADR-54）。

### ディスク上のレイアウト

```
<root>/
  schema_version.txt
  <producer-id>/
    <ab>/
      <ab1234567890…>.entry
```

キャッシュキー（`descriptor.cache_key_for(...)`による64文字のhex SHA-256）は2文字のプレフィックスと62文字のサフィックスに分割され、ビジーなプロデューサーでもディレクトリごとのファンアウトが管理可能に保たれます。

### アトミック性とロッキング

書き込みは標準的なrename-into-placeの手順に従います。

1. 宛先ディレクトリを`mkdir -p`で作成する。
2. 宛先ファイルに`flock(LOCK_EX)`を取得する（必要なら`O_CREAT|O_RDWR`で作成する）。
3. 隣接するtempファイル（`<entry>.tmp.<pid>.<rand-hex>`）にボディを書き込む。
4. tempファイルを`fsync`する。
5. tempファイルを宛先に`rename`する。
6. 宛先ディレクトリをベストエフォートで`fsync`する（一部のプラットフォームはディレクトリを`fsync`できない;失敗は無視される）。
7. 宛先ファイルディスクリプタをクローズしてロックを解放する。

書き込みまたはrenameが途中で失敗した場合、この試行のtempファイルは後で下記のスイープに見つけられるのではなく、抜ける途中で削除されます（`ensure`）。

読み取り側はロックしません。古いバージョン（常に完全にコミットされたエントリーであり、壊れた書き込みではない — POSIXが同一ファイルシステム上の`rename`アトミック性を保証する）を参照することを許容します。宛先ファイルが存在するが空（`O_CREAT`と最初の成功した`rename`の間の短いウィンドウ）という状況に遭遇した読み取り側は、上記の読み込みフォールトトレランスルールに従いキャッシュミスとして扱います。

### ファイルフォーマット

単一のエントリーファイルは以下のレイアウトです。

```
"RIGOR\x00\x02"      7 bytes — 5バイトマジック、1バイト区切り、1バイトフォーマットバージョン
varint               ディスクリプターペイロードのバイト長
descriptor payload   正規JSON Descriptor（UTF-8、転送のためにバイナリエンコード）
varint               値ペイロードのバイト長
value payload        zlibでdeflateされたシリアライズ済みバイト（デフォルトでMarshal.dump）
sha256               32バイト — 直前のすべてのバイトの整合性ハッシュ
```

ディスクリプタと値は別々に格納されるため、将来のキャッシュ検査ツールがinflate + `Marshal.load`のコストを払わずにディスクリプタだけを読み取れます。フォーマットバージョン（現在は`2`）は`Descriptor::SCHEMA_VERSION`とは異なります。前者はバイトレイアウトを対象とし、後者はディスクリプタスキーマを対象とします。フォーマットバージョンのバンプは読み込みパスでエントリーを無効化します（ヘッダーの不一致 → キャッシュミス）。

フォーマットv2（[ADR-54](../adr/54-cache-slimming.md) WD2）は書き込み時に値ペイロードをdeflateし、読み込み時にinflateします。ディスクリプタペイロードとSHA-256トレーラー（格納された圧縮後バイトに対して計算される）は変わりません。圧縮はプロデューサーには不可視です。カスタムの`serialize:` / `deserialize:`ペアは依然として厳密にそのバイトをラウンドトリップします。v1エントリーはヘッダーチェックに失敗し静かなミスとして読まれます ── マイグレーションはありません。

### コンパクション（`#evict!`）

`evict!`は読み取り専用ストアではno-opです。そうでなければ、順に3つのパスを走らせます:

1. **陳腐化した一時ファイルのクリーンアップ**。1時間より古い`*.tmp.*`の隣接ファイルはすべて`unlink`されます。通常動作では`atomically_replace`が決してそれを残しません（上記の「アトミック性とロック」を参照）;これは、tempファイル書き込みとrenameの間で死んだプロセスに対するバックストップです。
2. **プロデューサー宣言の世代上限**。一部のプロデューサーは内容キーで管理されます（キャッシュキーが安定したプロジェクトごとのキーではなく、値の依存関係の関数だ）ので、異なる入力で再実行すると新しいエントリーが書かれ、古いものは到達不能になります —— しかし依然ディスク上にあります。すべてのフェッチ呼び出し（`#fetch_or_compute`・`#fetch_or_validate`）は`generation_cap:`をMUST携えなければなりません。これは正の`Integer`（そのプロデューサーの何世代がコンパクションパスを生き延びるか）か、`Cache::Store::UNBOUNDED_GENERATIONS`（`:unbounded` —— プロデューサーは多くのエントリーを同時にライブに保つので、世代数は陳腐化の代理指標にならず、パス3だけがそれを制限する）のいずれかです。上限を超えると、mtimeが最も古い世代から先に`unlink`されます。このキーワードはREQUIREDです: 省略すると`ArgumentError`になるので、後から追加されたプロジェクト全体プロデューサーが黙って上限なしになることはありえません —— #151以前のプロデューサーIDのハードコードされた許可リストが招いていた失敗です。

   値は呼び出し側の判断ではなく、プロデューサー自身の宣言です: `RbsCacheProducer.generation_cap`（2、すべての`rbs.*`サブクラスが継承する）、`Analysis::RunCacheKey::GENERATION_CAP`（`analysis.run-diagnostics`向けに16、解析対象パスのSETごとに1つのライブ世代）、そしてプラグイン側プロデューサー向けの`Plugin::Base.producer generation_cap:`（デフォルトは`:unbounded`）です。ファイルごとの`plugin.source_rbs_synthesizer`プロデューサーは`:unbounded`を宣言します。

   Storeはフェッチ呼び出しが到着するたびにプロデューサーIDに対して各宣言を記録し、コンパクションパスはその記録を読みます。このStoreインスタンスが宣言されたのを一度も見ていないプロデューサーIDは、したがって推測でコンパクトされるのではなく放置されます。それが安全な方向です: ランの間に参照されなかったプロデューサーは新しい世代も書いていないので、パスはすでにそこにあったエントリーをスキップできるだけで、ライブなエントリーを立ち退かせることは決してありません。
3. **サイズベースのLRUパス**。以前のリリースから変わりません: 残るすべての`.entry`ファイルを走査し、mtimeの昇順でソートし、合計が`max_bytes:`以下になるまで最も古いものから`unlink`します。

パス1と2は、**`max_bytes:`が設定されているかどうかに関係なく**走ります —— サイズ予算を強制するのではなく、証明可能なほど死んだバイト（漏れたtempファイル、到達不能な内容キー世代）を回収するので、明示的に無制限のストア（`max_bytes: nil`）も依然としてそれらの恩恵を受けます。パス3だけが`max_bytes:`が設定されていることにゲートされます。いずれのパス中のファイルシステムエラーも飲み込まれます —— `evict!`は決して実行を壊してはなりません。

3つのパスすべてにおける各`unlink`のあとには、そのファイルを保持していたシャードディレクトリ（`entry_path`の`key[0, 2]`成分）に対するベストエフォートの`Dir.rmdir`が続き、`unlink`がちょうどそれを空にしたときにそのディレクトリを削除します。シャードは書き込み時（`FileUtils.mkdir_p`）に作成され、それ以外に削除するものは何もないので、これがなければ、エビクトされた世代や一掃されたtempファイルが空のシャードディレクトリを永久に残していました。これは見た目を整えるためだけのものです —— inodeの回収であって、エビクションポリシーの一部ではありません —— そして競合（並行するライターの`mkdir_p`がシャードを再作成する、あるいは別のパスがすでにそれを削除済みである）は、これらのパスにおける他のファイルシステムエラーと同じように飲み込まれます。

## `Rigor::Cache::IncrementalSnapshot`（ADR-46）

`rigor check --incremental`の背後にある永続的な成果物。上記のエントリーストアとは別物です: 前回のランの情報を、次回のランで影響を受けたファイルの診断だけを再導出できるだけ記録する、プロジェクトごとに1つのblob（zlibでdeflateされた`Marshal`、キャッシュルート以下）です。すべての操作はフォールトトレラントです —— 存在しない、読めない、スキーマ不一致、フィンガープリント不一致、または破損したスナップショットは`nil`としてロードされフルランを強制するので、スナップショットが解析をwedgeしたり陳腐化させたりすることは決してありません。

### 2レベルのゲーティング

1. **グローバルフィンガープリント（ロードをゲートする）**。`IncrementalSnapshot.fingerprint(configuration:, roots:)`は、エンジンバージョン + `SCHEMA`、設定ハッシュ、解析**ルート**（展開されたファイルリストではない —— なのでルート以下のファイルの追加/削除ではスナップショットは破棄されない）、`Gemfile.lock`、`rbs_collection.lock.yaml`、およびプロジェクトの`signature_paths` RBSに対するSHA-256です —— ただし解析対象ソースの内容は**含みません**。不一致はスナップショットを破棄します。
2. **ファイルごとのダイジェスト（判断を駆動する）**。フィンガープリントが一致すると、`Payload`が無条件にロードされ、そのファイルごとの内容ダイジェストが変更セット`ΔF`を決定します;影響を受ける閉包`ΔF ∪ dependents[ΔF]`が再解析され、残りは`Payload#cache`から提供されます。

### `Payload`（現在の`SCHEMA = 10`）

```
Payload :: Data[
  cache, sources, digests, analyzed,          # per-file diagnostics, read-sets, content digests, analyzed set
  symbol_sources, ancestry_sources,           # the ADR-46 dependency edges (method-symbol and class-ancestry)
  symbol_fingerprints,                        # path -> { "Class#method" => sha256 } — per-method source fingerprints
  missing, class_decls,                       # negative (unresolved) edges + per-file declared-class sets
  seed_bundles,                               # ADR-85 per-file pre-pass contribution (plain data + def-node handles)
  plugin_fact_digest,                         # ADR-88 plugin-fact surface fingerprint (see below)
  return_summaries                            # ADR-89 observed-key return summaries (see below)
]
```

留め置く価値のあるスキーマの履歴: `6`はシードバンドルを`(node_id, name, fingerprint)`のdefノードハンドルとして格納した（ADR-85）;`8`はB1のコメントのみゲートのために各バンドルのコメントを剥いだ`code_fingerprint`を追加した;`9`は`plugin_fact_digest`を追加した（ADR-88）;`10`は`return_summaries`を追加した（ADR-89）。古いスキーマのblobは`SCHEMA`ゲートに不一致となり`nil`としてロードされます —— マイグレーションではなく、クリーンなコールドリビルドです。

### `plugin_fact_digest` — プラグインファクトの健全性（[ADR-88](../adr/88-incremental-plugin-fact-soundness.md)）

プラグインが貢献する型（Sorbetカタログのシグネチャ、dry-typesのエイリアス、ActiveRecordのカラム型）は、ADR-52のコンパイル済みディスパッチパスを通じて消費されます。このパスは`symbol_sources` / `ancestry_sources`エッジを構築する`DependencyRecorder`のチョークポイントを決してまたがないため、プラグインファクトはクロスファイルエッジを記録せず、そのうちの1つを変える編集がコンシューマーを陳腐化させたまま放置しかねません。`plugin_fact_digest`はこれを塞ぎます: グローバルフィンガープリントには見えないプラグインファクトの**サーフェス**をフィンガープリントします —— （a）すべてのADR-9ファクトストア公開、（b）すべてのADR-60プロデューサーの計算済み**値**（意図的に、監視入力ではなく値そのもの —— ツリー全体の`watch:` globなら、さもなくばあらゆる編集で無効化してしまう）、そして（c）各プラグインのオプションの`Plugin::Base#incremental_state_fingerprint`フック（[`plugin-cache-producers.md`](plugin-cache-producers/)を参照）。ダイジェストの変更はスナップショットを破棄します（保守的なフル再解析）。型を貢献するが（a）/(b)/（c）のいずれも露出しないプラグインはスナップショットを再利用不能にし、名指しされます —— 黙って陳腐化した再利用をするのではなく、自身のサーフェスを宣言させる強制関数です。

### `return_summaries` — 意味的伝播ゲート（[ADR-89](../adr/89-semantic-propagation-gates.md)）

B1のコメントのみゲートを本体の編集へ一般化します: 変更されたファイルの依存側は、それが消費しうる何かが実際に変わったときにのみ再解析されます。「何も変わっていない」ことを証明する2つの永続化済みサマリー:

- **宣言の形状**（祖先／ファイルレベルの依存側が消費する） —— ADR-85のシードバンドルが、defごとのシグネチャ形状（名前、種別、パラメータ構造、可視性）に加えてスーパークラス／include／レイアウトを保持します。本体の編集はそれを等しく保ちます;アリティ、可視性、またはメソッド追加/削除の編集はそうしません。宣言が安定している変更済みファイルは、その祖先／ファイルレベルの依存側を閉包から外します。
- **観測キーの戻り値サマリー** —— ADR-84のメモから収穫したdefごとの`(receiver, args) → return`ディスクリプタに、ADR-56の内容変異エフェクトセット（戻り値を超えて呼び出し先から見えるサーフェス）を加えたもの。再チェック時、宣言が安定している変更済みdefは、格納された各キーでメモを通じて再評価されます;すべての戻り値が等しく**かつ**エフェクトが等しければ、そのdefのシンボル依存側が外されます。いずれかの不一致、シグネチャの変更、defの欠落、不適格なdef（ivar/cvar書き込みや`yield`値も露出するもの）、または上限オーバーフローは、依存側を保ちます —— 保守的な方向です。

両ゲートは、そのランについて`plugin_fact_digest`が一致していることを前提とします（仮定ではなくコード内でアサートされます）;`--verify-incremental`は機構全体に対する常設のバイト同一性のバックストップです。

## バンドルされたRBSプロデューサー契約

以下に記述されるバンドルされたRBS由来のプロデューサー（`RbsConstantTable`・`RbsKnownClassNames`・`RbsClassAncestorTable`・`RbsClassTypeParamNames`・`RbsEnvironment`）はいずれも一つのシェイプを満たします ── すなわち`fetch(loader:, store:)`に応答し、キャッシュ済みまたは新たに計算された値を返すクラスオブジェクトです。これは[`sig/rigor/cache.rbs`](https://github.com/rigortype/rigor/blob/master/sig/rigor/cache.rbs)において構造的インターフェース`_CacheProducer`として成文化されています。これは構造的インターフェース（RBS／Goの意味での）であり、ADR-28のプロトコル契約ではなく、また[`plugin-cache-producers.md`](plugin-cache-producers/)のプラグイン側プロデューサーサーフェスとも区別されます。

`fetch`本体はプロデューサー間で同一です。すなわち共有RBSディスクリプタ（`loader.rbs_cache_descriptor`、`RbsDescriptor.build`まわりのローダーごとのメモ）を読み、それから`store.fetch_or_compute(producer_id:, params: {}, descriptor:, generation_cap:)`を呼び出してプロデューサーの`compute(loader)`へyieldします。異なるのは`PRODUCER_ID`定数と`compute`本体だけです。その共有された配線は`Rigor::Cache::RbsCacheProducer`基底クラスに置かれます。プロデューサーはそれをサブクラス化し、自身の`PRODUCER_ID`と（privateな）`self.compute(loader)`をMUST宣言します。基底クラスは`self.generation_cap`（2 —— § 「コンパクション」を参照）も宣言し、サブクラスはそれを継承しオーバーライドできます;したがってコンパクション予算なしに`rbs.*`プロデューサーを追加することはできません。基底クラスは`self::PRODUCER_ID`を読むため、定数は具象サブクラス上で解決されます。以下のプロデューサーごとのセクションは、各プロデューサーの`PRODUCER_ID`、`compute`の出力型、およびそれを読む`cache_store`コンシューマーを規定します。

## `Rigor::Cache::RbsConstantTable`（v0.0.8スライス3）

{`Rigor::Cache::Store#fetch_or_compute`}を通じて配線される最初のキャッシュ済みプロデューサー。プロデューサーID: `"rbs.constant_type_table"`。

### 定数テーブルを`RbsLoader#build_env`ではなく選んだ理由

`RBS::Environment`とそのトランジティブなASTノードは`RBS::Location`インスタンスを保持します。`RBS::Location`は`_dump_data`を持たないC拡張クラスであるため、素直な`Marshal.dump(env)`は`TypeError`を発生させます。`RBS::Environment`そのものをキャッシュするには、`Store`上にカスタムシリアライザサーフェス（surface）を設けるか、すべての関連ノードをMarshal安全な形状に変換するスキーマ安定な中間形式を作るかが必要です。いずれもv0.0.8スライスの予算を超えます。[ADR-6 § 8 "RBS::Environment serialisation"](../../adr/6-cache-persistence-backend/)を参照してください。

v0.0.8スライスでは代わりに**翻訳後**の成果物をキャッシュします。すべてのRBS宣言済み定数を`Rigor::Type`形式に翻訳した結果です。`Rigor::Type`の値はMarshalのラウンドトリップが明確に定義された単純なフリーズ済み値オブジェクトであるため、キャッシュ機構はシリアライザの問題をブロックせずに実データで完全な読み書きサイクルを実行できます。

### `RbsConstantTable.fetch(loader:, store:) -> Hash{String => Rigor::Type}`

すべての正規定数名（トップレベルプレフィックス付き、例: `"::Math::PI"`）を対応する翻訳済み`Rigor::Type`にマッピングするハッシュを返します。プロデューサーブロックは`loader.each_constant_decl`を反復します（`env.constant_decls`から`(name, entry)`ペアをyieldします）。翻訳が`Rigor::Type::Bot`を返すか例外を発生させたエントリーはテーブルから除外されます。

`loader.constant_type`の代わりに`each_constant_decl`を経由することで、プロデューサーが再帰リスクから解放されます。`RbsLoader#constant_type`は`cache_store`が設定されているときにキャッシュを参照するためです。

## `Rigor::Cache::RbsKnownClassNames`（v0.0.9グループC）

2番目のキャッシュ済みプロデューサー。環境に現在ロードされているすべてのRBS宣言済みクラス/モジュール/エイリアス名（トップレベルプレフィックス付き）の集合を、Marshal安全な`Set<String>`として実体化します。プロデューサーID: `"rbs.known_class_names"`。

### `RbsKnownClassNames.fetch(loader:, store:) -> Set<String>`

集合を返します。プロデューサーブロックは`loader.each_known_class_name`を反復します（`env.class_decls`と`env.class_alias_decls`の両方を走査します）。イテレータ内のフェイルソフトな`rescue StandardError`により、破損した環境はランを中断させるのではなく名前を返さないようになります。

### `cache_store`下でのクラス既知パス

`RbsLoader#class_known?(name)`は、ローダーが`cache_store:`付きで構築されている場合にキャッシュ済み集合を参照します。コールドランは集合を一度だけ構築して永続化します。ウォームラン（および同じStoreを共有する別のローダー）は環境走査を完全にスキップします。インプロセスの名前ごとキャッシュ（`@class_known_cache`）は単一のローダーインスタンス内での呼び出し間でポジティブとネガティブの両方の回答をメモ化します。ディスクキャッシュはコールドスタートの動作のみを変更し、ウォームなホットパスは変更しません。

## `Rigor::Cache::RbsClassAncestorTable`（v0.0.9 B）

3番目のキャッシュ済みプロデューサー。ロードされたすべてのクラス/モジュールのRBS宣言済み祖先チェーンを、トップレベルなしのクラス名でキー付けされたMarshal安全な`Hash<String, Array<String>>`（例: `"Integer"` → `["Integer", "Numeric", "Comparable", "Object", "BasicObject"]`）として実体化します。プロデューサーID: `"rbs.class_ancestor_table"`。

1つの祖先チェーンを構築するには、そのクラスに対して完全な`RBS::DefinitionBuilder#build_instance`が必要です。これはクラスごとで最もコストの高いRBS操作です。テーブルをキャッシュすることで、ウォームプロセスは結果ハッシュの`Marshal.load`のみを支払えます。後続の`class_ordering`クエリはO（テーブルルックアップ＋祖先リストメンバーシップチェック）になり、環境走査は発生しません。

`RbsHierarchy#ancestor_names`は`loader.cache_store`が設定されている場合にキャッシュ済みテーブルを参照します。インプロセスの名前ごとキャッシュ（`@ancestor_names_cache`）は単一の階層インスタンス内での呼び出し間で結果をメモ化します。ディスクキャッシュはコールドスタートの動作のみを変更します。

## `Rigor::Cache::RbsClassTypeParamNames`（v0.0.9 A）

4番目のキャッシュ済みプロデューサー。ロードされたすべてのクラスのRBS宣言済み型パラメータ名を、トップレベルなしのクラス名でキー付けされたMarshal安全な`Hash<String, Array<Symbol>>`（例: `"Array"` → `[:Elem]`、`"Hash"` → `[:K, :V]`、`"Integer"` → `[]`）として実体化します。プロデューサーID: `"rbs.class_type_param_names"`。

ディスパッチャーはレシーバーの`type_args`からメソッドの戻り値型への代入マップを構築するたびに型パラメータ名を読み取ります。各エントリーは{RbsClassAncestorTable}と基になる`RBS::DefinitionBuilder#build_instance`コストを共有します。両プロデューサーをウォームにすることで同じ定義セットが熱くなります。

`RbsLoader#class_type_param_names(class_name)`は`cache_store`が設定されている場合にキャッシュ済みテーブルを参照します。アクセサは呼び出し元がキャッシュ済みペイロードを変更できないように、フレッシュな`Array.dup`を返します。

## `Rigor::Cache::RbsEnvironment`（v0.0.9 C2）

5番目のキャッシュ済みプロデューサー — そして{`Store#fetch_or_compute`}のデフォルト`Marshal`パスを非Marshal安全なRBSネイティブ値に対して使う最初のもの。このプロデューサーはローダーの完全な`build_env`結果（`from_loader` + `resolve_type_names`後の`RBS::Environment`）をキャッシュします。コールドランはパース+解決コストを一度払って結果を永続化し、ウォームラン（および同じStoreを共有する別のローダー）はマーシャル済みblobをロードし、パース/解決段階を完全にスキップします。

プロデューサーID: `"rbs.environment"`。キャッシュディスクリプタは{`RbsDescriptor.build`}を再利用するため、シグネチャの変更やrbs gemのバンプにより、このプロデューサーと4つの翻訳後キャッシュが同時に無効化されます。

### `RbsEnvironment.fetch(loader:, store:) -> ::RBS::Environment`

環境を返します。プロデューサーブロックは`Rigor::Environment::RbsLoader.build_env_for(libraries:, signature_paths:)`を呼び出します。これは`RbsLoader#build_env`のステートレスなクラスメソッドの対応物であり、プロデューサーはローダーインスタンスを保持する必要がありません。

### `RBS::Location` Marshalパッチ

`RBS::Environment`とそのトランジティブなASTノードは`RBS::Location`インスタンスを保持します。rbs gemのC拡張`RBS::Location`は`_dump` / `_load`を提供しないため、素直な`Marshal.dump(env)`は`TypeError`を発生させます。v0.0.9はキャッシュ機構が必要とする最小限のMarshalフックで`RBS::Location`にパッチを当てます。

```ruby
class RBS::Location
  def _dump(_) = ""
  def self._load(_) = new(buffer: ..., start_pos: 0, end_pos: 0)
end
```

このパッチは純粋に加算的（以前に`TypeError`を発生させていたディスパッチのためのメソッドを追加するだけ）で冪等です（`method_defined?(:_dump)`でゲートされます）。キャッシュされた`RBS::Location`インスタンスはノードごとのソース位置情報を失いますが、Rigorのどの解析コードパスも`RBS::Location`を参照しないため（すべての診断はPrism自身のロケーションを通じてフローします）、この損失は実用上無害です。キャッシュヒット後にLocationを読み込むコードパス（例: サードパーティツール）はクラッシュするのではなく、無害なゼロ範囲のセンチネルを参照します。

このパッチは`lib/rigor/cache/rbs_environment_marshal_patch.rb`にあり、プロデューサーによってrequireされます。プロデューサーが最初に参照されたときに1プロセスにつき一度だけロードされます。

### 翻訳後キャッシュとの合成

`RbsEnvironment`は`RbsConstantTable`・`RbsKnownClassNames`・`RbsClassAncestorTable`・`RbsClassTypeParamNames`と並存します。翻訳後キャッシュはカバーするルックアップをディスクから返答し、環境を実体化することはありません。`RbsEnvironment`はそれ以外のすべて（例: `RbsLoader#instance_method`と`singleton_method`）を、キャッシュ済み環境をRBSの`DefinitionBuilder`に渡すことで返答します。2つのレイヤーは合成されます。ウォームプロセスは既にキャッシュされたルックアップに対してenv構築・定数変換・祖先走査・型パラメータ走査のコストを払わず、まだキャッシュされていない少数のものに対してのみenvロード＋クラスごとのDefinitionBuilderコストを払います。

## `Rigor::Cache::RbsDescriptor`（共有）

`RbsConstantTable`と`RbsKnownClassNames`はどちらも同じRBS環境状態に依存するため、ディスクリプタビルダーを共有します。

```ruby
Rigor::Cache::RbsDescriptor.build(loader)
# => Descriptor with:
#    gems    = [{ name: "rbs", requirement: ">= 0", locked: ::RBS::VERSION }]
#    files   = [...]   # :digest entries for every .rbs under signature_paths
#    configs = [{ key: "rbs.libraries", value_hash: SHA256(sorted-libraries) }]
```

ビルダーを共有することにより、シグネチャの変更またはrbs gemのバンプで、すべてのRBS由来のキャッシュ済みプロデューサーが同時に無効化されます。

## `cache_store`下での定数ルックアップパス

`Environment.for_project(..., cache_store:)`で`Environment`が構築されると、すべての定数ルックアップパスがキャッシュを経由します。

- `Rigor::Reflection.constant_type_for(name, scope:)` — 公開読み取りAPI。ソース内の定数が衝突時に優先されます。それ以外は以下にフォールスルーします。
- `Environment#constant_for_name(name)` →
- `Environment::RbsLoader#constant_type(name)` — `constant_type_table[rbs_name.to_s]`をチェックします（ローダーごとにメモ化され、`RbsConstantTable.fetch`を通じて生成されます）。

コールドキャッシュでの最初のルックアップはテーブル構築コストを一度払って結果を永続化します。ウォームラン（および同じStoreを共有する別のローダー）は環境走査を完全にスキップし、格納されたハッシュの`Marshal.load`のみを払います。`Store#fetch_or_compute`への`params`引数は空です。プロデューサーが消費するすべての入力はすでにディスクリプタにエンコードされているためです（{Cache::RbsDescriptor.build}を参照）。

## CLI可観測性（v0.0.8スライス4）

キャッシュレイヤーは`rigor check`に2つのCLIフラグを提供します。

### `--clear-cache`

解析ランの前に（カレントワーキングディレクトリ基準で）`.rigor/cache`ディレクトリを削除します。ディレクトリが存在して削除された場合は`Cleared cache: .rigor/cache`を、何もなかった場合は`Cache already empty: .rigor/cache`を出力します。チェック自体は完了まで実行されます。

### `--cache-stats`

ランナーの`Cache::Store`のディスクインベントリとランタイムのヒット/ミス/書き込みカウンタの両方を出力します。出力サンプル:

```
Cache (root: .rigor/cache)
  schema_version: 0.2.8.4.2
  3 entries, 12.4 KiB
    rbs.constant_type_table: 1 entries, 11.0 KiB
    reflection.instance_method_definition: 2 entries, 1.4 KiB
  this run: 5 hits, 1 miss, 1 write
    rbs.constant_type_table: 5 hits, 1 miss, 1 write
```

キャッシュディレクトリが存在しない場合、`schema_version`は`absent`と表示され、本文は`(empty)`を示します。ランナーにStoreがない場合（例: `--no-cache`下）、`this run:`セクションは省略されます。報告するインメモリ状態がないためです。

### `Store#stats`

Storeのランごとカウンタのフリーズ済みスナップショットを返します。

```ruby
{
  hits: Integer,
  misses: Integer,
  writes: Integer,
  by_producer: { producer_id => { hits:, misses:, writes: } }
}
```

カウンタはインメモリのみです。新しい`Store.new`ごとにゼロからスタートします。`#fetch_or_compute`内でバンプされます。成功した読み取りは`:hits`をインクリメントし、ミスは直ちに`:misses`をインクリメントし、プロデューサーブロックが返却してエントリーが永続化された後に`:writes`をインクリメントします。プロデューサーごとのカウントは合計を反映するため、呼び出し元は上記の内訳を報告できます。

### `Store.disk_inventory(root:)`

`--cache-stats`を支えるクラスメソッド。以下を返します。

```ruby
{
  root: String,                  # キャッシュルートパス
  schema_version: String | nil,  # マーカーが存在しない場合はnil
  total_entries: Integer,
  total_bytes: Integer,
  producers: [
    { id: String, entries: Integer, bytes: Integer },
    ...
  ]
}
```

プロデューサーはIDでソートされます。空のプロデューサーサブディレクトリはリストから除外されます。

## 診断の来歴（v0.0.8スライス5）

`Rigor::Analysis::Diagnostic`上のコンパニオンスライス。このクラスは`source_family:`キーワード（デフォルトは`Diagnostic::DEFAULT_SOURCE_FAMILY`、つまり`:builtin`）と`qualified_rule`アクセサを追加します。

```ruby
diagnostic = Rigor::Analysis::Diagnostic.new(
  path: "lib/foo.rb", line: 12, column: 3,
  message: "...", rule: "no-mutation",
  source_family: "plugin.rigor-immutable"
)

diagnostic.source_family   # => "plugin.rigor-immutable"
diagnostic.rule            # => "no-mutation"  (ベアのケバブケース識別子)
diagnostic.qualified_rule  # => "plugin.rigor-immutable.no-mutation"
diagnostic.to_h            # "source_family"と"rule"の両方を含む
```

ベアの`rule`アクセサはケバブケース識別子のままです。既存の設定や`# rigor:disable`の仕組みが引き続き動作します。`qualified_rule`は、コンシューマーが明確な帰属を表示したい場合に使うべき名前空間付き識別子です。JSON出力（`to_h`）は両フィールドを並べて持つため、ダウンストリームのコンシューマーはどちらを使うか選択できます。

これはADR-2のプラグイン可観測性ストーリー（`plugin.<id>`・`rbs_extended`・`generated.<provider>`）を、プラグインAPI自体をコミットせずに準備するものです。v0.0.8ではデフォルト以外の`source_family`を設定する本番の呼び出し元は存在しません。このサーフェスはプラグイン作者および将来のRBS拡張/生成ルール向けに予約されています。
