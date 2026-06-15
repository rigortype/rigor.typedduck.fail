---
title: "Cache Layer — `Rigor::Cache`"
description: "Imported from rigortype/rigor docs/internal-spec/cache.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/cache.md"
sourcePath: "docs/internal-spec/cache.md"
sourceSha: "4df6232bfb62c391aaa4066a80f55276b0120f551f92a6f513de7d76b1515163"
sourceCommit: "18ef11c9f393b495cd9a6ed7277846069c08c516"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス: **安定（v0.0.8で導入;現行ディスクリプタスキーマv3）**。このドキュメントはキャッシュレイヤーの公開リード形を追跡します。以下のスライス（slice）はすべて着地し、v0.1.x全体で安定しています;ディスクリプタの`SCHEMA_VERSION`はADR-10のgemバージョンごとの`dependencies`スロットのために`2`へ、そして`RbsLoader.build_env_for`が欠落した`signature_paths:`名前空間を合成し始めたときに`3`へ引き上げられました（古いRigorによってmarshalされたRBS環境——それらのシグネチャを不活性なまま残してしまう——は再構築されます）。スライス1と2がすでに完成しています。`Rigor::Cache::Descriptor`（すべてのキャッシュ済み値が付随する基板）と`Rigor::Cache::Store`（ディスクリプタ・プロデューサー・パラメータを消費してキャッシュ済みまたは新規計算済みの値を返すファイルシステムバックのストレージ）です。後続のスライスでは最初のキャッシュ済みプロデューサー（RBS環境ローダー）とCLI可観測フラグ（`--cache-stats`・`--clear-cache`）を追加します。

このモジュールが実装するスキーマは以下によって固定されています。

- **[`docs/design/20260505-cache-slice-taxonomy.md`](../../design/20260505-cache-slice-taxonomy/)** — スロットごとのエントリーシェイプ（shape）・合成ルール・キャッシュキー導出・粒度ガイダンス。
- **[`docs/adr/6-cache-persistence-backend.md`](../../adr/6-cache-persistence-backend/)** — バックエンド選択（バイナリエントリーのシャードディレクトリ）・ファイルフォーマット・アトミック性・ロッキング・立ち退きポリシー。

## `Rigor::Cache::Descriptor`（v0.0.8スライス1）

キャッシュ無効化ディスクリプタ — 4つのスロットを持つ純粋な値オブジェクトで、各スロットは型付きエントリーの配列です。

### スロットエントリー

```
FileEntry       :: { path: String, comparator: :digest|:mtime|:exists, value: String }
GemEntry        :: { name: String, requirement: String, locked: String? }
PluginEntry     :: { id: String, version: String, config_hash: String? }
ConfigEntry     :: { key: String, value_hash: String }
DependencyEntry :: { gem_name: String, gem_version: String, mode: :disabled|:when_missing|:full }
```

各エントリーはキーワード引数で構築され、即座にフリーズされます。`FileEntry#new`はcomparatorのenumを検証し、`DependencyEntry#new`は`mode`のenumを検証し、それぞれ未知の値に対して`ArgumentError`を発生させます。他のエントリーは任意の文字列コンテンツを受け入れます（その値は慣例上すでに正規化されたハッシュです）。`DependencyEntry`はADR-10のgemバージョンごとのスロットです: その`(gem_name, gem_version, mode)`のトリプルがオプトインの依存関係ソース推論キャッシュスライス（slice）をキー付けるので、`Gemfile.lock`のバンプや`source_inference:`モード変更（[`dependency-source-inference.md`](dependency-source-inference.md)）がちょうど影響を受けるgemだけを無効化します。

### `Descriptor.new(files: [], gems: [], plugins: [], configs: [], dependencies: [])`

ディスクリプタを構築します。すべてのスロットはデフォルトで空配列になります。スロットはdupされてフリーズされるため、構築後に呼び出し元が変更することはできません。ディスクリプタ自体もフリーズされます。

### `Descriptor.compose(*descriptors) -> Descriptor`

任意の数のディスクリプタを1つのディスクリプタに合成します。スロットごとの合成ルールは**キーによるユニオン（union、合併型とも）**です。

- `files`は`path`でグループ化します。グループ内のエントリーはより**厳格な**comparatorを優先します（`:digest > :mtime > :exists`）。最も厳格なcomparatorの中で、すべてのエントリーが`value`について合意していなければ`Descriptor::Conflict`が発生します。
- `gems`は`name`でグループ化します。グループ内のすべてのエントリーは`(requirement, locked)`の下で構造的に等しくなければなりません。そうでなければ`Conflict`が発生します。
- `plugins`は`id`でグループ化します。`(version, config_hash)`で同じ等値ルールが適用されます。
- `configs`は`key`でグループ化します。`value_hash`で同じ等値ルールが適用されます。

自分自身のディスクリプタに重複した等しいエントリーを追加する単一の貢献者は無害です。`compose`はそれを折り畳みます。コンフリクトは例外的なケースです。呼び出し元（キャッシュレイヤー）は`Conflict`を「このキャッシュスライスは再利用できない、削除する」として扱い、いずれかのコントリビューションを黙って選択することはしません。

### `descriptor.cache_key_for(producer_id:, params: {}) -> String`

プロデューサー・入力・ディスクリプタの組み合わせに対して標準的なhex SHA-256キャッシュキーを返します。キーは以下を組み込みます。

1. `Descriptor::SCHEMA_VERSION`（現在は`3` — v2はADR-10のgemバージョンごとのキャッシュスライスのために`dependencies`スロットを追加した;v3は`build_env_for`が欠落した`signature_paths:`名前空間を合成し始める前にmarshalされたRBS環境を無効化する）。この定数をバンプするとすべてのキャッシュ済み値が無効化されます。
2. `producer_id`（キャッシュスライスの名前空間となる安定した文字列）。
3. `params`（プロデューサーの入力ハッシュ）。再帰的に正規化されます。ハッシュキーは文字列化してソートし、シンボルは文字列化し、配列は順序を保持します。
4. ディスクリプタの正規ハッシュ形式。

構造的に同等なディスクリプタを同じ`producer_id`と`params`で構築する2つの呼び出し元は、構築順に関係なく同一のキャッシュキーを生成します。

### `descriptor.to_canonical_bytes -> String`

ディスクリプタを正規JSONバイト文字列（UTF-8、転送のためにバイナリエンコード）として返します。スロットは辞書順で現れ（`configs`・`files`・`gems`・`plugins`）、各スロット内のエントリーはキーフィールドでソートされます（filesなら`path`など）。これにより2つの同等なディスクリプタは同一のバイト列を生成します。

### 等値性とハッシュ

`Descriptor#==`は正規バイト形式を比較するため、異なる順序で構築された2つのディスクリプタは等しく比較されます。`#hash`は`==`と整合しているため、ディスクリプタはHashのキーとして使用できます。

## 安定性

コンストラクタシグネチャと合成セマンティクスはv0.0.xの公開リード形として安定しています。新しいスロット種（例: `env_vars`）の追加はtaxonomyドキュメントとADR-6に従いスキーマバージョンバンプになります。`FileEntry::VALID_COMPARATORS`への新しいcomparatorの追加は加算的であり、バンプを必要としません。

永続化レイヤー（[`Rigor::Cache::Store`](#cache-store-v008-slice-2)、v0.0.8スライス2）とキャッシュプロデューサー統合は後続に続きます。このドキュメントは各スライスが着地するたびに更新されます。

## `Rigor::Cache::Store`（v0.0.8スライス2）

ファイルシステムバックのキャッシュストア。ADR-6 § "Decisions in detail"が契約（contract）を固定します。このセクションはプロデューサーとCLIが消費する公開リード形を文書化します。

### `Store.new(root:)`

`root`（ディレクトリパス、通常は`.rigor/cache`）をルートにするストアを構築します。ディレクトリは積極的に作成されません。最初の書き込みで`schema_version.txt`マーカーとともに実体化されます。

### `store.fetch_or_compute(producer_id:, params:, descriptor:, serialize: nil, deserialize: nil) { ... } -> Object`

プロデューサー向けの単一エントリーポイントです。

- `producer_id`（String） — キャッシュ名前空間。`[a-z][a-z0-9._-]*`のみ受け入れます。この制約により、大小文字を区別しないファイルシステム上でもファイルシステムに適したディレクトリ名が保証されます。
- `params`（Hash） — プロデューサーの入力引数。{Descriptor#cache_key_for}でキャッシュキーに組み込まれます。プロデューサーはキャッシュキー自体を導出しません。
- `descriptor`（[`Rigor::Cache::Descriptor`](#rigorcachedescriptor-v008-slice-1)） — キャッシュ済み値の無効化ディスクリプタ。
- `serialize`（callable、省略可能） — プロデューサーの戻り値をバイナリ`String`に変換します。デフォルトは`Marshal.dump(value).b`です。`Marshal`でクリーンでない戻り値（`RBS::Location`メンバーを持つRBSネイティブオブジェクト・生の`IO`など）を持つプロデューサーはシリアライザをMUST提供しなければなりません。
- `deserialize`（callable、省略可能） — バイトをプロデューサーの値に戻します。デフォルトは`Marshal.load`です。`(serialize, deserialize)`のペアはラウンドトリップをMUST保証しなければなりません。一方の戦略で読み込み他方で書き込むプロデューサーは自分のキャッシュスライスを破壊します。デシリアライザが発生させた例外（`StandardError`）はキャッシュミスとして扱われます。エントリーは破損とみなされ、プロデューサーブロックが再実行され、次の書き込みでそれが上書きされます。これは以下の読み込みフォールトトレランスルールと一致します。
- ブロック（`yield`）は**キャッシュミス時のみ**呼び出されます。

キャッシュ済み値を返します（ヒット時はディスクからロード、ミス時はブロックが生成）。

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

`<root>/schema_version.txt`には`Store.schema_marker_value` ── `"<Descriptor::SCHEMA_VERSION>.<Store::FORMAT_VERSION>"`（現在は`3.2`）が格納され、2つの無効化軸、すなわちディスクリプタスキーマとオンディスクのバイトレイアウトの両方をカバーします。`Store`インスタンスごとに1度（最初の`fetch_or_compute` / `fetch_or_validate`時に）チェックされます。

- マーカーがない → 現在の値を書き込み、続行する。
- マーカーが一致する → 続行する。
- マーカーが異なる → `<root>`以下のすべてのエントリーを削除し（`FileUtils.rm_rf`で各子を`unlink`）、マーカーを書き直し、キャッシュが空であるかのように続行する。

したがっていずれかのバージョンのバンプにより、明示的なマイグレーションステップなしに次回の書き込み可能な実行でキャッシュファイルがすべて削除されます。フォーマットバージョン側はディスク回収のために重要です。フォーマットのバンプ単独では古いエントリーが読めなくなる（ヘッダーの不一致 → ミス）だけで、それらを削除することは決してありません ── エビクション上限を下回ったまま無期限に居座りうるのです。それらのバイトを回収するのはマーカーの不一致です（ADR-54）。

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
6. 宛先ファイルディスクリプタをクローズしてロックを解放する。

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

## バンドルされたRBSプロデューサー契約

以下に記述されるバンドルされたRBS由来のプロデューサー（`RbsConstantTable`・`RbsKnownClassNames`・`RbsClassAncestorTable`・`RbsClassTypeParamNames`・`RbsEnvironment`）はいずれも一つのシェイプを満たします ── すなわち`fetch(loader:, store:)`に応答し、キャッシュ済みまたは新たに計算された値を返すクラスオブジェクトです。これは[`sig/rigor/cache.rbs`](../../sig/rigor/cache.rbs)において構造的インターフェース`_CacheProducer`として成文化されています。これは構造的インターフェース（RBS／Goの意味での）であり、ADR-28のプロトコル契約ではなく、また[`plugin-cache-producers.md`](plugin-cache-producers/)のプラグイン側プロデューサーサーフェスとも区別されます。

`fetch`本体はプロデューサー間で同一です。すなわちRBSディスクリプタ（`RbsDescriptor.build(loader)`）を構築し、それから`store.fetch_or_compute(producer_id:, params: {}, descriptor:)`を呼び出してプロデューサーの`compute(loader)`へyieldします。異なるのは`PRODUCER_ID`定数と`compute`本体だけです。その共有された配線は`Rigor::Cache::RbsCacheProducer`基底クラスに置かれます。プロデューサーはそれをサブクラス化し、自身の`PRODUCER_ID`と（privateな）`self.compute(loader)`をMUST宣言します。基底クラスは`self::PRODUCER_ID`を読むため、定数は具象サブクラス上で解決されます。以下のプロデューサーごとのセクションは、各プロデューサーの`PRODUCER_ID`、`compute`の出力型、およびそれを読む`cache_store`コンシューマーを規定します。

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

ディスパッチャーはレシーバーの`type_args`からメソッドの戻り型への代入マップを構築するたびに型パラメータ名を読み取ります。各エントリーは{RbsClassAncestorTable}と基になる`RBS::DefinitionBuilder#build_instance`コストを共有します。両プロデューサーをウォームにすることで同じ定義セットが熱くなります。

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
  schema_version: 1
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
