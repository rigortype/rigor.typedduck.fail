---
title: "`rigor lens`出力: `lens/v0`、リビジョン1"
description: "rigortype/rigor docs/internal-spec/lens.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/lens.md"
sourcePath: "docs/internal-spec/lens.md"
sourceSha: "446586ed602305131183445b9ad1deff60c6ec363ff3bf3c1326eeb53ca6d93d"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-05T09:18:01+09:00"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス: **ドラフト、実験的**。これは`rigor lens`が計算および出力する内容を規定する拘束力のある記述です。理由は[ADR-113](../../adr/113-rigor-lens/)に記録されており、その形状は最初のコンシューマーであるZARDと[#1907](https://github.com/rigortype/rigor/issues/1907)で合意されました。`lens/v0`は凍結されていません: 破壊的変更は`revision`をバンプし、このコマンドとそのフラグは`lens/v1`がRigorリリースで出荷されるまで互換性契約の対象外です（[`docs/compatibility.md`](../../compatibility/)）。型文字列およびどの診断が発火するかは、契約の一部ではありません（ADR-50 § Decision 3）。

キーワードMUST、MUST NOT、SHOULD、およびMAYは[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)と同様に解釈されます。

## 計算

lensは対象に対する`rigor check`をマップとして表現したものです。

- セッションは`--incremental`セッションであり、`check`とまったく同じように設定の`paths:`をルートとします。そのためlensと`rigor check --incremental`は同じスナップショットを読み書きします。
- 対象は実行の解析対象セットに強制的に組み込まれ、lensプロセス内で解析されます。その行は`check`ルールが読み取るのと同じシード済みスコープインデックスから、実行内部で計算されます。
- lensは各対象について、`rigor check --no-cache`がそのファイルに対して報告する診断（ベースラインフィルタ前）を報告しなければなりません（MUST）。宣言ファクト（サイト、メンバー、契約）は`check`が使用する内容と一致しなければなりません（MUST）。推論された型は`check`のものより狭くなります: § Sitesがそれを定義します。
- lensは実行結果スロットからは回答できません。コールドなlensはフル`check`のコストがかかり、ウォームなlensは対象の数に関わらず呼び出しごとに1回、エンジンのウォーム再チェック下限のコストがかかります。

## 呼び出し

```text
rigor lens [--format text|json] [--config FILE] [--workers N] FILE...
```

- 各`FILE`は作業ディレクトリに対して解決されます。1回の呼び出しにおける複数の対象は1回の実行を共有します。どの綴りであっても2回以上リクエストされたファイルは、引数ごとに1つの`files`エントリーを持ちます;最初のエントリーが答えを保持し、後続のものは`duplicate`となるため、ドキュメント内で各サイトキーは一意になります。
- `--format json`はすべての計算の完了後に、ちょうど1つのJSONドキュメントをstdoutに書き出します。人間が読める進捗とエラーはstderrに出力されます。textフォーマットはエージェントと人間向けです;そのレイアウトは契約ではありませんが、内部のアンカートークン構文は契約です（§ Anchors）。
- 終了ステータス:

  | ステータス | 意味 |
  | --- | --- |
  | 0 | 少なくとも1つの対象が`status: "ok"`です。コードの診断が終了ステータスを変えることはありません。 |
  | 1 | `status: "ok"`の対象が1つもありません。JSONドキュメントは引き続き書き出されます。 |
  | 64 | 使用法エラー（対象なし、未知のフラグ、読み取れない設定）。ドキュメントは書き出されません。 |
  | 70 | 実行自体がクラッシュしました（`CLI::FATAL_ERRORS`）。ドキュメントは書き出されません。1つの対象に限られた失敗は終了コード70ではなく、その対象の`failed`ステータスになります。 |

  終了コード2は曖昧なシンボルクエリ用に予約されていますが、リビジョン1には存在しません。

## シリアライズ規約

- **ルート**。プロジェクトルートは作業ディレクトリです。Rigorはそこで`sig/`、`Gemfile.lock`、`rbs_collection.lock.yaml`を自動検出し、設定されたパスはまず絶対パスに解決されるため、すべての入力はルートからの相対的な1つの綴りを持ちます。
- **パス**はルートからの相対パスで、セパレータは`/`です。したがってパス、サイトキー、`context.digest`は作業ディレクトリに依存します: コンシューマーは別の作業ディレクトリから生成されたドキュメントを再利用してはなりません（MUST NOT）。ルート外のパスは`..`セグメントを用いてルートからの相対パスで書かれます。Rigorが計算した絶対パスがドキュメントに現れることはありません;対象の`argument`は呼び出し元が渡したものをそのまま返します。
- **スパン**は`{start_line, start_column, end_line, end_column, start_offset, end_offset}`というオブジェクトです。行は1始まりです。列とオフセットは改行正規化なしで読み取ったファイルの**バイト数**を数え（CRLFは2バイト）、0始まり・終端排他的です。これらはPrismのロケーションです。
- **ダイジェスト**は`xxh3-64:<16 lowercase hex>`と表記され、正確なバイト列に対して計算されます。`context.digest`は不透明です: 等価性の比較にのみ使用してください。
- **フィールドの存在**。セクションが列挙するすべてのフィールドはその種類のすべてのオブジェクトに存在し、値を持たないときは`null`または`[]`になります;セクションは一部の種類またはステータスにのみ適用されるフィールドを明記しており、それ以外の場所では`null`になります。後のリビジョンで追加されるフィールドはここには存在せず、存在しないフィールドは空の答えではなくその機能が利用不可であることを意味します。

## ドキュメント

```json
{
  "schema": "lens/v0",
  "revision": 1,
  "producer": { "name": "rigor", "version": "0.4.3", "engine_source": null },
  "context": { "...": "§ Context" },
  "capabilities": ["class", "module", "method", "attribute", "constant", "module_function", "builder", "alias", "body_return", "diagnostics", "inputs", "claims"],
  "files": [ { "...": "§ Files" } ],
  "members": [ { "...": "§ Members" } ],
  "claims": null
}
```

- `producer.engine_source`は、Rigorがインストール済みgemではなくチェックアウトから実行されている場合のエンジンのソース識別子です（`EngineSource.process_identity`）。インストール済みgemの場合は`null`、識別子を計算できない場合は`"unknown"`になります。`version`が一致しても`engine_source`が異なる、または`"unknown"`である2つの実行は、異なるエンジンを使用した可能性があります。
- `capabilities`はこのリビジョンが出力する行の種類とオプションフィールドを列挙します。コンシューマーは欠落しているケイパビリティを空の答えとして読み取ってはなりません（MUST NOT）。
- `claims`は`--claims`が渡されない限り`null`です;そのリクエストとレスポンスは[`lens-claims.md`](../lens-claims/)で定義されています。

## Context

`context`はすべての対象に適用される解析入力を記録します。

| フィールド | 内容 |
| --- | --- |
| `config` | ルートからの相対的な設定ファイルパス、または`null`。 |
| `target_ruby` | 実行がパース基準としたRubyバージョン: 設定された`target_ruby`、または設定が解決したデフォルト値。 |
| `rbs_version` | ロードされた`rbs` gemのバージョン。コアおよびstdlibのシグネチャはこれに由来します。 |
| `signature_roots` | 有効なプロジェクトのシグネチャルート（ルートからの相対パス）。 |
| `signature_digest` | それらのルート配下のすべての`.rbs`に対するダイジェスト: パス順にソートされた各相対パスとそのファイルダイジェスト。 |
| `plugins` | 実行がロードしたすべてのプラグインの`[{id, version}]`で、マニフェストID（`plugin:<id>`プロバナンスが使用するID）により`id`順でソートされます。RigorにバンドルされたプラグインはRigorのバージョンを報告します;それ以外はそれを定義するファイルを含むgemのバージョン、または`null`を報告します。プラグインIDはgem名ではありません。対象が読み込まれなかった場合は`[]`です。 |
| `lockfiles` | 実行が解決したBundlerロックファイルおよび`rbs collection`ロックファイルの`[{path, digest}]`で、存在する場合に設定済みまたは自動検出されたパスで記録されます。GemのRBSはこれらを通じて識別されます。 |
| `digest` | 他の`context`フィールド全体に対するダイジェスト。 |

## Files

リクエストされた対象ごとにリクエスト順で1エントリー。

| フィールド | 内容 |
| --- | --- |
| `argument` | 呼び出し元が渡したそのままの対象。 |
| `path` | ルートからの相対的な対象パス、またはファイルに解決されない場合は`null`。 |
| `status` | `ok`、`not_found`（該当ファイルがない、または通常ファイルではない）、`not_ruby`（`.rb`ファイルではない;ビューテンプレートを含む）、`outside_project`（実行の解析対象セット外: `paths:`の外、または`exclude:`に一致）、`duplicate`（先の引数と同じファイル、`reason`がその旨を名指し）、`parse_error`、または`failed`。 |
| `reason` | 人間が読めるメッセージ、または`ok`の場合は`null`。`failed`の場合はRigorによるファイル読み取りを停止させたエラー名を指します;そのエラーが`check`の答えやスナップショットを変えることはありません。 |
| `digest` | 解析が読み取ったすべてのバイト（散文を含む）に対するファイルダイジェスト。`ok`または`parse_error`でない限り`null`。 |
| `complete` | ファイル内のすべての宣言がサイトである場合は`true`; `omissions`が空でない場合は`false`。`ok`でない限り`null`。 |
| `omissions` | § Omissions。`ok`でない限り`null`。 |
| `sites` | ファイル順の§ Sites。`ok`でない限り`null`。 |
| `diagnostics` | このファイルに対して`rigor check --format json`が報告する`[{rule, severity, message, line, column}]`（`line`は1始まり、`column`は1始まり、`check`の順序）。`ok`および`parse_error`では存在し、それ以外は`null`。 |
| `inputs` | `[{path, digest}]`、この対象の解析がファクトを読み取った他のプロジェクトRubyファイルで、インクリメンタルセッションの依存関係レコードから取得しパス順にソートされます。`ok`でない限り`null`。これは完全な入力リストではありません: シグネチャ、gem、およびプラグインは`context`でのみカバーされます。コンシューマーは`inputs`リストが変化していないことを対象のファクトが変化していない証明として扱ってはなりません（MUST NOT）。 |

### リビジョン1の種類

- サイト: `class`および`module`本体; `def name`、`def self.name`、`class << self`内の`def`、およびトップレベル`def`（オーナー`Object`、スコープ`instance`、可視性`private`）に対する`method`;そしてクラスまたはモジュール本体に直接書かれた`attr_reader`、`attr_writer`、または`attr_accessor`呼び出しの各名前に対する`attribute`。
  - 「直接」には、可視性呼び出しでラップされたもの（`private def x`、`private attr_reader :x`）、およびスーパークラス式が`Struct.new(…)`または`Data.define(…)`であるクラスの本体が含まれます。
  - ブロック内の`def`や`attr_*`、または`self`以外の任意のものに対する`class << obj`内のものは省略（omission）となります。
  - 定数（ケイパビリティ`constant`）: `X = value`、名前空間本体またはトップレベルに直接書かれた（ブロック、メソッド、ビルダーのブロック、または`class << self`内ではない）素の定数名への通常の代入（`Foo::X = value`や`::X = value`のようなパスではない）。代入をスパンとする`constant`サイトであり、`owner`は囲む名前空間（トップレベルでは`Object`）、`value`はスロット（§ Sites）です。
  - ビルダーが定義するクラス（ケイパビリティ`builder`）: `Foo = Data.define(:a, …)`および`Foo = Struct.new(:a, …)`（オプションで末尾に`keyword_init:`を持ち、他のキーワードは持たない）、名前空間本体に直接（ブロック、メソッド、別のビルダーのブロック、または`class << self`内ではなく）通常の定数代入として書かれ、Rubyが受け付ける一意のシンボルフィールド名（`=`で終わらない）を持つもの。これは`builder`が`data`または`struct`に設定された`class`サイトで、代入をスパンとします;各フィールドはその名前をスパンとする`attribute`サイトです（`Data`なら`reader`、`Struct`なら`accessor`、`public`; `initialize_copy`などRubyが強制的にprivateにする名前の`Data`フィールドは`private`、ライターがpublicのままになるそのような`Struct`フィールドは`null`）。その唯一の契約コメントは複数行呼び出しの独立した行でそれに続く末尾の`#:`（rbs-inlineのフィールドごとの形式、§ Anchors）です;そして呼び出しのブロックは、Rubyが新しいクラス上で`class_eval`するメソッドのためのクラス本体として読み取られます。`check`の発見はこれらのフィールドとメソッドを同じ定数名の下にキー付けします。ブロック内に書かれたクラス、モジュール、または定数はRubyではレキシカルスコープにとどまり、`class << self`内のものは特異クラスに着地するため、それらは省略となります。他のビルダー形式は省略（`data_class`、`struct_class`）のままです: `||=`などの複合代入、非シンボルまたは非リテラルのフィールドリスト（`Struct.new("Name", …)`を含む）、その他のキーワード引数、重複または拒否されたフィールド名、`&block`引数、およびブロック・メソッド・ビルダーのブロック・`class << self`内のビルダーです。
  - エイリアス（ケイパビリティ`alias`）: 2つのリテラル名を持つ`alias new old`または`alias_method :new, :old`で、クラス、モジュール、またはビルダー本体の文として書かれたもの（可視性呼び出しでラップされておらず、`if`などの制御フロー配下になく、ブロック、メソッド、`class << self`、トップレベルになく、かつ裸の`module_function`が有効でない間）。これは`new`という名前でスコープが`instance`、文をスパンとし、`alias_of`が`old`に設定された`method`サイトです（§ Sites）。
  - モジュール関数は`module_function: true`を持つ`method`サイト（ケイパビリティ`module_function`）です: モジュール本体内で裸の`module_function`の後に直接書かれた`def`。これはRubyと`check`のシングルトンテーブルが同じように読み取る形式です。
- 省略（Omissions）: § Kindsがモデル化しない定数書き込み（`constant`）: `||=`、`&&=`、演算子代入、多重代入および`for` / `rescue =>`ターゲット、パス書き込み（`Foo::X = 1`、`::X = 1`、`self::X = 1`）、およびブロック・メソッド・ビルダーのブロック・`class << self`内の書き込み; § Kindsがモデル化しない`Data.define` / `Struct.new`形式（`data_class`、`struct_class`）とそのブロック内で宣言されたあらゆるメンバー; § Kindsがモデル化しない`alias`および`alias_method`形式（`alias`）: 計算または式展開された名前、ブロック付きの`alias_method`、可視性呼び出しでラップされたものや制御フロー配下にネストされたもの、およびブロック・メソッド・`class << self`・トップレベル・`module_function`有効中のエイリアス; `define_method`; `self`以外の任意のレシーバーを持つ`def`;ブロック内のあらゆる宣言; `class << obj`; Rubyと`check`の両方が同じように読み取れない`module_function`のケース（`module_function`）: 裸の`private` / `public` / `protected`が後に続いた後の裸の`module_function`以降の`def`（Rubyはそこでモードを終了するが`check`のテーブルはしない）、モードが有効な間に本体内にネストされた（例えば`if`配下の）`def`、裸の`module_function`が制御フロー内に置かれた本体のそれ以降のすべての`def`、モード有効中に可視性呼び出しでラップされた`def`、そのような切り替えに続く2つ目の裸の`module_function`以降のすべての`def`、クラス内のあらゆる`module_function`、およびすべての名前付き形式（`module_function :x`、`module_function %i[x]`、`module_function def x`、非リテラル引数）であり、その読み取りがRubyと`check`で異なるもの（本体内にネストされた`def`、再オープンされたモジュール、呼び出し後の再定義）。名前付き形式が名指すメンバーは両側（そのコピーが既存の`def self.x`を置き換える）で`visibility: null`となり、この省略はプロジェクト定義として数えられるため、そのような各メンバーは`contested`になります; `refine`ブロックとその内部のすべて;そしてプラグインが合成するメンバー（リビジョン1ではまったく列挙されず、`capabilities`に`plugin`はありません）。

宣言がフォールバックとして隣接するサイトに紐付けられることはありません。

### Omissions

`[{kind, owner, scope, name, span, reason}]`。`owner`と`scope`が設定され`name`がnullである省略は、そのオーナーとスコープの任意のメンバーを定義する可能性があります（`module_function(*NAMES)`）;それはそれら各メンバーのプロジェクト定義として数えられます。`kind`は`class`、`module`、`method`、`attribute`（それぞれブロック内に書かれた場合、`method`は`self`以外のレシーバーの場合も含む）、`singleton_class`（`class << obj`）、`constant`、`data_class`、`struct_class`、`alias`、`define_method`、`module_function`、`refine`のいずれかです。`owner`と`scope`はRigorが判別できる場合はその宣言が定義するメンバー（`class Foo`内の`alias_method :b, :a`は`Foo` / `instance` / `b`を定義）、そうでなければ`null`です。`reason`は`unsupported_kind`です。

## Sites

サイトはリクエストされたファイル内の1つのソース宣言です。

| フィールド | 内容 |
| --- | --- |
| `key` | `<path>:<start_offset>-<end_offset>:<ordinal>`。ドキュメント内で一意。編集をまたいで安定ではなく、パブリックな識別子ではありません。 |
| `kind` | `class`、`module`、`method`、`attribute`、または`constant`。 |
| `name` | `class` / `module` / `constant`では修飾名。`method`ではメソッド名。`attribute`では記述された属性名（`name=`ではなく`name`）。 |
| `owner` | `method` / `attribute` / `constant`が定義されるクラスまたはモジュールの修飾名。`class` / `module`では`null`。 |
| `scope` | `method` / `attribute`では`instance`または`singleton`;それ以外は`null`。 |
| `attribute` | `attribute`では`reader`、`writer`、または`accessor`;それ以外は`null`。 |
| `members` | `method` / `attribute`ではこのサイトが定義するメンバーの名前: メソッドなら1つ、属性なら`name`および/または`name=`。それ以外は`[]`。 |
| `builder` | `Data.define` / `Struct.new`代入が定義する`class`サイトでは`data`または`struct`;それ以外は`null`。 |
| `alias_of` | エイリアス`method`サイトでは記述された元の名前（`old`）。他のすべてのサイトでは`null`。 |
| `value` | `constant`ではスロット: 別ファイルからその定数に対して`check`が読み取る型であり、代入ごとではなく定数ごとに決まります: 1つのファイル内のその名前のすべてのサイトは同じものを読み、別ファイルのサイトは`unavailable`（後述）を読むことがあります。定義ファイル内のリーダーは別の型を見ることがあります: より狭いリテラル（どのソースも公開しない文字列定数）、または定数がミューテートされる場合のuntyped。プロジェクトのソースが定数の値を公開している場合、`check`はあらゆる宣言より優先してそれを読み取ります: その名前へのすべての書き込みをjoinし、定数がミューテートされる箇所では広げられます（`inferred`; `10`、`["a", "b"]`、または`dynamic`）。そうでなくRBS宣言がそれを名指す場合、そのプロバナンスを持つ宣言された型（`sig`、ライブラリ、またはサイトの唯一の契約コメントが代入末尾に続く`#:`、つまりrbs-inlineが定数に対して読み取る形式である場合は`inline`）。インライン宣言はサイト自身のファイルに由来する場合のみカウントされます: 2つのファイルに書かれた名前は1つの宣言を保持し、もう一方のファイルのサイトについては何も述べないため、そのサイトは`unavailable`を読みます。rbs-inlineプラグインがデフォルト化したインライン宣言（プラグインが読み取るファイル、つまりシグネチャがロードされたアノテーションを持つファイル内では、すべての定数を宣言し、未アノテーションのものは上のコメントに関わらずリテラルから型付けします）は、`check`がいずれにせよ読み取るものです: 推論された型として綴られ、プロバナンスは`inferred`です（`[]`は`Array[untyped]`、非リテラル値は`dynamic`）。それ以外は`not_computed`を伴う`unavailable`: どのソースも値を公開せずどのシグネチャも宣言していない、Rigorが`check`の与える型を計算しない（`Class.new(…)`や`Module.new`を呼び出す値であり、`check`は独自の書き込み読み取りを通じて型付けする）、または宣言を読み取れない場合。他のすべての種類では`null`。 |
| `module_function` | モジュール関数の場合は`true`: `def`はprivateインスタンスメソッドとシングルトンコピーを定義するため、その名前は両方のスコープ配下のメンバーとなり、両方がこのサイトをリストします。このとき`scope`は`instance`、`visibility`は`private`になります。それ以外は`false`。 |
| `ordinal` | 1つの宣言スパンを共有するサイト間での0始まりのインデックス（`attr_reader :a, :b`は0と1を与える）;それ以外は0。 |
| `span` | 宣言のスパン（`class` / `module` / `def` / `attr_*` / `alias`ノード）。 |
| `contract_span` | サイトの最初から最後までの契約コメントのスパン（§ Anchors、ステップ1と2）、または`null`。 |
| `anchor` | § Anchors。 |
| `visibility` | `method` / `attribute`では、このファイル自身の可視性呼び出しからRubyが与える`public`、`protected`、または`private`。エイリアスは本体の現在のデフォルトではなく、エイリアス時点での元の可視性を引き継ぎます: 同じオーナーでその上にあり`old`（インスタンスメソッドまたは属性メンバー）を定義する最後のサイトの可視性、それがない場合や省略がそのオーナーで`old`を名指す場合は`null`;後の`private :new`は他のメンバーと同様にそれを改訂し、後の`private :old`はそれをそのまま残します。`initialize`、`initialize_copy`、`initialize_clone`、`initialize_dup`、または`respond_to_missing?`という名前のインスタンス`def`またはエイリアスは、Rubyがそうするように現在のデフォルトに関わらず`private`です（ラップする、または後の`public`は依然としてそれを改訂します）;そのようなメンバーを持つインスタンス属性サイトは`null`です。それ以外の場合: ラップする`private def x` / `private attr_reader :x`、なければ本体に直接書かれた裸の`private` / `protected` / `public`によって設定される本体の現在のデフォルトであり、本体に直接書かれた後の`private :x` / `private %i[x y]` / `private_class_method :x`で改訂されます。クラス本体のデフォルトは`def self.x`には届かず、トップレベル`def`は`private`です。Rigorが判別できない場合は`null`: `if`、`begin`、またはブロック配下の裸の切り替えはデフォルトを不明のままにします;本体内に直接書かれた以外の場所（`if`、ブロック、メソッド本体）に書かれた名前付き呼び出しは、名指すメンバーを不明のままにします;非リテラル引数（`private *NAMES`）は本体のメンバーを不明のままにします; Rubyが拒否する`private def self.x`は不明です;名前付き呼び出しがメンバーの一部しかカバーしない属性サイトも同様です。`constant`では、このファイル自身の呼び出しから`public`、またはその名前空間本体に直接書かれた`private_constant :X`の後は`private`（他の場所に書かれたか非リテラル引数を持つ場合は`null`）。再代入はRubyと同様に定数が持っていた可視性を維持します。`class << self`やビルダーのブロック内の`private_constant`はそのクラスを対象とし、これらの定数は変更しません。別ファイル内の呼び出しは読み取られません。`class` / `module`では`null`。 |
| `contract` | サイトが`@extrbs`以外の契約コメントを持ち、かつそれが定義するメンバーがこのサイトのファイル由来のデフォルト化されていないインライン宣言（`inferred-signature`、§ Members）を持つ場合は`inline`;それ以外は`null`。1つのファイルが1つのメンバーに対してそのようなサイトを複数保持する場合、それぞれが`inline`になります: キャッシュされた環境は位置ではなくファイルを保持するためです。`sig/`またはライブラリの契約はサイトではなくメンバーに属します。他の部分がデフォルト化された宣言の注釈付きブロックは、サイトを`inline`にはしません（§ Members）。 |
| `params`, `block` | `method`では、記述されたそのままのこの定義自身のパラメータリストで、オーバーロードの`params`および`block`（§ Members）の形状を持ちますが、すべての`type`は`null`です: 形状のみを表します。型はメンバーのオーバーロード上にあります;キャッシュされた環境はどの定義からではなくどのファイルからインライン契約が来たかを保持します。エイリアスサイトは、ファイル内でその上にあるちょうど1つのサイトがそのオーナーに対して`old`を定義し、そのサイトが`def`（またはそれをコピーしたエイリアス）であり、かつ`old`を名指す省略がない場合にのみ元のものをコピーします;それ以外は`null`。他のすべての種類では`null`。 |
| `body_return` | `method`ではスロット（§ Slots）: パラメータを宣言された型（宣言されていない場合は未知）としたときにこの本体が返す型。その呼び出しは`check`が使うのと同じシード済みインデックスに対して解決されるため、別メンバーへの呼び出しは`check`が読むようにそのメンバーを読み取ります。本体のない`def`は`nil`を返し、`initialize`は`void`を読みます。エイリアスサイトは、どちらかの名前が`initialize`でない限り（`void`は本体ではなく名前に紐づくため、`initialize`という名前のエイリアスも`unavailable`になる）`params`のルールのもとで元のものをコピーし、それ以外は`not_computed`を伴う`unavailable`になります: Rubyはエイリアス時点でその場の`def`をコピーしますが、`check`は最後のものを読み取るためです。他のすべての種類では`null`。 |

## Members

メンバーは、リクエストされたファイル内のサイトが定義する1つの`(owner, scope, name)`です。`attr_accessor :a`サイトはメンバー`a`と`a=`を定義し、両方がそのサイトをリストします。モジュール関数サイトは`(owner, instance, name)`と`(owner, singleton, name)`を定義します。シングルトンメンバーの`visibility`は`public`であり、本体に直接書かれた後の`private_class_method :name`または`class << self`内の`private :name`によって改訂され、それ以外の場所に書かれた名前付き呼び出しについては§ Sitesが与えるルールのもとで`null`になります。その推論戻り値はサイトの`body_return`ですが、シングルトンコピーがモジュールとしての`self`で実行されるため戻り値が`self`に依存しうる場合を除きます: 本体で`self`、`super`、インスタンス変数、またはクラス変数を読み取る場合、あるいは戻り値の型がオーナーを名指す場合（`itself`、`tap`、または別のモジュール関数を通って流れた`self`）は、シングルトンの戻り値は`not_computed`を伴う`unavailable`になります。メンバーは`owner`、`scope`、`name`の順にソートされます。

| フィールド | 内容 |
| --- | --- |
| `owner`, `scope`, `name` | `name`はRubyのメソッド名です（ライターでは`a=`）。 |
| `kind` | `method`または`attribute`。 |
| `visibility` | そのサイトに共通の`visibility`、またはサイト間で異なるかどれかが`null`の場合は`null`。 |
| `sites` | リクエストされたファイル内でそれを定義するサイトのキー。 |
| `also_defined_at` | `[{path, line}]`: リクエストされたセット外のプロジェクトファイルにおいて、エンジンのファイル横断発見がそのメンバーについて記録する他のすべての定義（`def`、`attr_*`、`alias`、`define_method`、…のあらゆる種類）で、パス順にソートされます。`line`は発見が記録した行、記録しなかった場合は`null`（`attr_*`、`define_method`）。エイリアスの場合、発見はエイリアス先の`def`を記録するため、行は`alias`ではなくそちらを指します。 |
| `basis` | メンバーのシグネチャ全体がどこに由来するか。下記参照。 |
| `overloads` | `[{rbs, params, block, return}]`。下記参照。 |

メンバーの**プロジェクト定義**とは、そのサイト、リクエストされたファイル内で同じ`(owner, scope, name)`を名指す省略、およびその`also_defined_at`エントリーです。オーナー`Object`・スコープ`instance`では、発見が`class Object`とは別に記録するトップレベル`def`も含まれます。`basis`は次のいずれかです:

- `contract`: メンバー自身のクラスのために書かれた宣言（`sig/`、インライン、プラグインのシグネチャ、またはライブラリ）がそれを宣言しており、デフォルト化されたインライン宣言（後述）ではないもの。契約が宣言するスロットはそのプロバナンスを保持します。
- `single_site`: 契約がなく、プロジェクト定義がちょうど1つ（それが1つのサイト）であるもの。推論されたスロットはそのサイトに由来します。
- `contested`: 契約がなく、プロジェクト定義が複数あるもの。RigorはRubyがどの定義を実行するか分からないため、推論されたすべてのスロットは理由`contested`を伴う`unavailable`となり、各サイトは自身の`body_return`を保持します。

**デフォルト化されたインライン宣言**。 rbs-inlineプラグインがファイルを読み取る場所（`rbs_inline: enabled`、またはアノテーションゲートモード）では、すべての`def`を宣言し、何をデフォルト化したかをマークします。ルールはマジックコメントではなくそのマークをキーとします:

- `rigor:v1:inferred-signature`とマークされたメンバーは、最大でブロック（§ Overloads、`block`）を除きまったくアノテーションされていません。これは契約ではなく、その`basis`はプロジェクト定義に従います。
- `rigor:v1:inferred-return`とマークされたメンバーは、著者記述のパラメータとデフォルト化された戻り値を持ちますが、エンジンは著者記述の`untyped`パラメータとデフォルト化されたものとを区別できません。その`basis`は`contract`です; `untyped`と読まれるパラメータは`not_computed`を伴う`unavailable`です;戻り値は`single_site`と同様に推論されるか、プロジェクト定義が複数ある場合は`contested`を伴う`unavailable`になります。

**Overloads**。

- `contract`メンバーは宣言されたメソッド型ごとに1つのオーバーロードを持ちます。`single_site`メンバーはそのサイトのパラメータリストから構築された1つのオーバーロードを持ちます。`contested`メンバーはいずれの種類でもオーバーロードを持ちません（`[]`）: その定義間でアリティが異なる可能性があり、各メソッドサイトが独自の`params`と`block`を保持します。
- サイトがエイリアスである`single_site`メンバーは、元のメンバーに契約がなくかつプロジェクト定義がちょうど1つ（それ自体がエイリアスならエイリアスチェーンを通じたその1つのサイト）である場合にのみ、コピーした`def`のオーバーロードをその本体の戻り値とともに持ちます。それ以外の場合は`params`が`null`、`return`が`not_computed`を伴う`unavailable`の1つのオーバーロードを持ちます: 元の契約はエイリアスを宣言せず（RBSの`alias`は引き継ぎますが、rbs-inline配下の`alias_method`は引き継ぎません）、定義が複数ある場合はコピーされる`def`がロード順に依存するためです。エイリアス自身の契約は他のメンバーと同様に読み取られます: rbs-inlineプラグインがデフォルト化した宣言に対するRBS `alias`は元のマークを一切引き継がず、`check`は宣言されたものとして読み取るため、`contract`になります。
- `single_site`の`attribute`メンバーは、スロットが`not_computed`を伴う`unavailable`である1つのオーバーロードを持ちます（リーダーはパラメータを取らず、ライターは無名の`required`パラメータを1つ取ります）;リビジョン1はインスタンス変数の型を報告しません。
- `params`は宣言順の`[{name, kind, type}]`です。`kind`は`required`、`optional`、`rest`、`post`（restの後の位置引数）、`keyreq`、`key`、または`keyrest`です;宣言が名前を付けない場合`name`は`null`です; `type`はスロットです。契約のないパラメータはプロバナンス`inferred`および原因`inferred_return_untyped`（未宣言パラメータに対するADR-75の原因）を持つ`dynamic`スロットです。引数転送リスト（`...`、またはRBSの`(?)`）、およびRigorが読み取れない契約では`params`は`null`です（その`return`は`not_computed`または`definition_build_failed`を伴う`unavailable`になります）。
- メンバーがブロックを取る場合、`block`は`{required, type}`になります: `required`はブール値、`type`はオーバーロードの`rbs`が波括弧の内側で綴るブロックのRBS関数型（`(::Integer) -> void`、`() [self: ::Foo] -> void`、`(?) -> untyped`）を型とするスロットです。契約がない場合、定義が`&blk`を宣言しているか、その本体（ネストした`def`・ラムダ・`define_method`ブロックの外）に`yield`を含むときにブロックを取ります;そのとき`{required: false, type: <dynamic slot>}`となります。アノテーションされたブロック（`# @rbs &block: …`）を除きrbs-inlineプラグインがインライン宣言をデフォルト化した（`inferred-signature`）メンバーは、そのブロックをプロバナンス`inline`で宣言されたものとして受け取ります（`check`がそこからブロックのパラメータをバインドするため）;パラメータと戻り値は推論されたまま、サイトの`contract`も`null`のままです。`required`は宣言に従います; `check`はブロックを渡さない呼び出しを報告しません。プラグインのデフォルトブロック（`?{ (?) -> untyped }`）が宣言されたものとして読み取られることはありません: プラグインが一部をデフォルト化した宣言では、未宣言ブロックと同様に読み取られます。`null`はブロックが宣言も検出もされなかったことを意味します。
- `return`はスロットです。
- `rbs`は`sig-gen`の綴りによるRBSとしてのオーバーロードであり、宣言元メンバーに書かれた`%a{rigor:v1:…}`アノテーションを先頭に置きます。オーバーロードのいずれかのスロットが`unavailable`である場合は`null`になります: そこでの`untyped`はアサーションとして読まれてしまうためです。

## Slots

すべての型位置はタグ付きスロットです:

| `state` | フィールド | 意味 |
| --- | --- | --- |
| `typed` | `type`, `provenance`, `path`, `from_site` | Rigorが解決した型。 |
| `dynamic` | `type: "untyped"`, `provenance`, `path`, `from_site`, `cause` | 実効的な型は`untyped`。`cause`はADR-75のdynamic由来原因（`explicit_untyped`、`inferred_return_untyped`、`external_gem_without_rbs`、`framework_dsl_boundary`、`analyzer_budget_cutoff`、`unsupported_syntax`）、または記録されなかった場合は`null`。 |
| `unavailable` | `reason` | Rigorに報告すべき型がない: `contested`、`not_computed`、または`definition_build_failed`。決して`untyped`とは綴られません。 |

- 推論された`type`は`sig-gen`がRBSを書くのと同じように綴られます: エイリアス展開および精緻化された消去型（erasure）。契約`type`は環境内でその宣言が読まれる通りに、絶対名（`::Integer`）で綴られます。リファインされた型はその消去型として読まれます;推論されたリファインメントはリビジョン1では出力されません。
- `provenance`は`sig`、`inline`、`inferred`、`plugin:<id>`、`library`のいずれかです。契約スロットはそれを宣言するRBSメンバーのバッファ名から読み取ります:
  - `virtual:rbs-inline:…`は`inline`;他のすべての`virtual:<id>:…`は`plugin:<id>`;
  - ロードされたプラグインの`signature_paths:`配下のファイルは`plugin:<id>`;
  - プロジェクトのシグネチャルート配下のファイルは`sig`となり、`path`が設定されます;
  - その他のファイルは`library`です（gem、`rbs collection`、stdlib、およびコアシグネチャ）;
  - 環境キャッシュに名前が残らなかったバッファ（`<cached>`、または空）は分類できないため、メンバーのスロットは`not_computed`を伴う`unavailable`になります。

  `extrbs`は`@extrbs`が読み取られるようになるまで予約されています（[#1073](https://github.com/rigortype/rigor/issues/1073)）。
- `path`は`sig`プロバナンスのときに設定され、それ以外は`null`です。`from_site`はメンバーの`inferred`スロットに設定され、それを生成したサイトを名指します;サイト自身の`body_return`では`null`です。

各状態の例:

```json
{ "state": "typed", "type": "String", "provenance": "sig", "path": "sig/shop.rbs", "from_site": null }
{ "state": "typed", "type": "Integer", "provenance": "inferred", "path": null, "from_site": "lib/shop.rb:99-126:0" }
{ "state": "dynamic", "type": "untyped", "provenance": "inline", "path": null, "from_site": null, "cause": "explicit_untyped" }
{ "state": "dynamic", "type": "untyped", "provenance": "inferred", "path": null, "from_site": "lib/shop.rb:99-126:0", "cause": null }
{ "state": "unavailable", "reason": "contested" }
```

著者記述のパラメータ、デフォルト化された戻り値、および別の場所に2つ目の定義を持つメンバー:

```json
{
  "owner": "Shop", "scope": "instance", "name": "label", "kind": "method", "visibility": "public",
  "sites": ["lib/shop.rb:70-97:0"],
  "also_defined_at": [{ "path": "lib/legacy/shop.rb", "line": 12 }],
  "basis": "contract",
  "overloads": [
    {
      "rbs": null,
      "params": [{ "name": "n", "kind": "required", "type": { "state": "typed", "type": "Integer", "provenance": "inline", "path": null, "from_site": null } }],
      "block": null,
      "return": { "state": "unavailable", "reason": "contested" }
    }
  ]
}
```

共有フィクスチャはプロジェクト`spec/integration/fixtures/lens/project/`とその期待ドキュメント`spec/integration/fixtures/lens/expected.json`であり、プロデューサーのspecがこれを再生成して比較します。ZARDのアダプタはそのファイルを特定のRigorコミットでリビジョン1のフィクスチャとしてピン留めします。

## Anchors

サイトの`anchor`は`<line>:<hash>`です。ここで`line`はハッシュ対象マテリアルの最初の行、`hash`はそのマテリアルのxxh3-64を下位16ビットに切り詰めて4桁の小文字16進数で書いたものです（`Hashing::XXH3.anchor_hash`）。スパンを共有するサイトはアンカーも共有し、`ordinal`によって区別されます。トークン構文`<decimal line>:<4 hex>`は両方のレンダリングで安定しています。

**契約コメント**とは、`#`からのテキストがrbs-inlineのアノテーション文法に一致するか`@extrbs`を名指すインラインコメントです: `#:`、`#[`、`#`の後に任意の空白を挟んで単語としての`@rbs`、または`#`の後に任意の空白を挟んで単語としての`@extrbs`で始まります。`#:word:`のRDocディレクティブ（`#:nodoc:`）は、rbs-inlineプラグインがそれを無力化するため該当しません。`=begin`ブロックが契約コメントを含むことはありません。

ハッシュ対象マテリアルはファイルのバイト列から構築されます:

1. **先行する契約コメント**。宣言の1つ上の行からコメントのみの行が連続する範囲を遡ります;空行またはコードを含む行で連続は終了します。各契約コメントを保持します。また、保持された`@rbs`または`@extrbs`コメントの直下にあるコメントのみの行、あるいはこの方法で保持された行の直下にある行で、`#`と最初の非空白バイトの間の空白数が`@rbs` / `@extrbs`行のその数より多いもの（rbs-inlineの継続行）も保持します。連続範囲内のその他の行（ドキュメント散文およびマジックコメントを含む）はマテリアルの一部ではありません。
2. **末尾の契約コメント**。宣言が終了した後の宣言の最終行でコメントが始まり、かつそれが`#:`で始まる契約コメントである場合、それを保持します。これは`contract_span`に含まれます。
3. **マテリアル**は、ステップ1で保持された各行（`#`から改行文字（`\n`、またはCRLF行の`\r\n`）を除いた行末まで）に`\n`を続けたもの、次に宣言のバイト列`[start_offset, end_offset)`、そしてステップ2でコメントを保持した場合は`\n`と改行文字を除いた行末までのそのコメントのバイト列です。

ルールはすべての種類で同じですが、ビルダーのフィールド（§ Kinds）を除きます: ビルダーのフィールドは定数に属する先行契約コメントを持たず、その末尾の契約コメントはフィールドが代入の最初の行にない場合にのみカウントされます。最後のフィールドの行で呼び出しの閉じ括弧の後ろに続く`#:`もそのフィールドのスパンとアンカーに含まれますが、Rubyと`check`はそこから型を読み取りません;その場合、フィールドのスロットは他の宣言のみから来ます。`class`、`module`、または`def`では宣言のバイト列がその本体全体となるため、散文を含む内部のどこを編集してもアンカーが移動します;先行コメント連続範囲内の散文では移動しません。ファイルの`digest`はすべての編集で変化します。アンカーが変化していないからといって古いオフセット、行番号、またはドキュメントの再利用が許可されることはありません: コンシューマーはファイルのダイジェストが変化するたびに現在のファイル上で再紐付けを行います。

## リビジョン1に含まれないもの

名前付き型参照、継承されたメンバー、シンボルクエリ、プラグインが合成したメンバー、`@extrbs`、推論されたリファインメント、エフェクトラベル、ソース本体、および呼び出し元。それぞれが後のケイパビリティであり、出荷時に`capabilities`に現れます。ドキュメントの主張チェック（documentation claim checking）は[`lens-claims.md`](../lens-claims/)で仕様化されていますが、まだ出荷されていません。
