---
title: "ADR-38 — プラグインが宣言する追加イニシャライザー"
description: "rigortype/rigor docs/adr/38-additional-initializers.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/38-additional-initializers.md"
sourcePath: "docs/adr/38-additional-initializers.md"
sourceSha: "6180dcd54d1b393d3db4ff65664b553f39d96266bd3f773d3300f7cec08b6104"
sourceCommit: "d5d6614800bfc53f00e23b51f4c914d0e42f237f"
translationStatus: "translated"
sidebar:
  order: 4038
---

ステータス: **Accepted, 2026-06-02.** def形式の`additional_initializers:`フィールドと`ScopeIndexer`のnil健全性ゲートの配線が実装され、`rigor-minitest`が最初の宣言（`Minitest::Test`／`ActiveSupport::TestCase`／`Test::Unit::TestCase` → `setup`）を出荷しました。ブロック形式の変種（RSpecの`before { }`／`let { }`。そのivar書き込みは`DefNode`ではなく呼び出しブロック内に存在します）は後続スライスへ延期されます——ivar書き込み収集器が宣言された呼び出しブロックへ降りていく必要があるためです。

プラグインの`Manifest`フィールド`additional_initializers:`を追加する決定を記録します。これは、制約付きクラス上の`initialize`以外のどのメソッドもインスタンス変数の状態を確立する、とプラグインが宣言できるようにするものです — PHPStanの[`AdditionalConstructorsExtension`](https://github.com/rigortype/rigor/blob/master/references/phpstan/website/src/developing-extensions/additional-constructors-extensions.md)のRubyにおける対応物です。このフィールドは既存のエンジンゲート1つ（`ScopeIndexer`の書き込み前読み込みnil健全性ゲート）に供給されるので、フレームワークのライフサイクルメソッド（`setup`、`after_initialize`、依存性注入のセッター）で設定されるivarが、兄弟メソッドの本体で`nil`に拡幅されなくなります。

根拠となるレビュー: [`docs/design/20260601-plugin-mechanism-pre-1.0-review.md`](../../design/20260601-plugin-mechanism-pre-1.0-review/) §7.2（PHPStanから採用すべき、最高ROIで最小の拡張型として選定）。

## コンテキスト

`ScopeIndexer#build_class_ivar_index`はクラスごとのivar型を植え付け、`contribute_read_before_write_nil!`では、あるメソッド本体がivarを書き込む前に読み込むとき、そのivarを`Constant[nil]`で拡幅します。これが通常のコードで発火するのを防ぐ健全性ゲートは`collect_read_before_write_evidence`（`lib/rigor/inference/scope_indexer.rb`）にあります。

```ruby
if def_node.name == :initialize
  init_set = (init_writes[class_name] ||= Set.new)
  seen_writes.each { |name| init_set << name }
  return
end
```

`initialize`で書き込まれたivarは、他のどのメソッドが走るよりも前に設定されたものとして扱われます（Rubyは`Class.new`を介して`initialize`が最初に走ることを保証します）。そのため、兄弟メソッドでの書き込み前読み込みはランタイムnilのケース**ではなく**、nil貢献は抑制されます。

このゲートは`:initialize`というリテラルなメソッド名にハードコードされています。しかしRubyフレームワークは、「本体」メソッドより前に走る*他の*ライフサイクルメソッドでivarを初期化するのが常です。

- **Minitest／ActiveSupport::TestCase** — `def setup; @conn = …; end`を、すべての`def test_*`で読み込む。
- **Railsモデル** — 通常の`def`として定義された`after_initialize`／`before_validation`コールバックメソッド。
- **依存性注入のセッター** — コンテナが使用前に呼ぶ`def inject(x); @x = x; end`。

これらすべてにおいてivarは読み込みメソッドが走る前に確実に設定されていますが、書き込みメソッドがリテラルに`initialize`と名付けられていないため、エンジンはその読み込みを書き込み前読み込みとして扱い`nil`で拡幅します。下流ではそれが`@conn.query`を`Conn | nil`に対する呼び出しに変え、nilレシーバー診断を表面化させます — これは**動作しているコードに対する偽陽性**であり、プロジェクトの偽陽性の規律が最悪の失敗モードと位置づけるものです。

PHPStanは対称的な問題（`checkUninitializedProperties`が`setUp()`で初期化されたプロパティを報告すること）を2層で解決しました。`Class::method`の宣言的な`additionalConstructors:`設定リストと、動的なケース（「Xのすべてのサブクラス」）のための`AdditionalConstructorsExtension`インターフェースです。宣言的な層が一般的なケースをカバーし、拡張が残りをカバーします。Rigorにはすでに宣言的マニフェスト機構（ADR-2／ADR-37のエンジンゲート型の10フィールド）があります。このADRは同じ形状のフィールドをもう1つ追加します。

### なぜこれが偽陽性安全なのか

このフィールドはnil貢献を*抑制する*ことしかしません — アナライザーを厳密により寛容にするだけで、決して厳しくしません。マッチを取り損ねても単に助けにならないだけ（既存のnil拡幅がそのまま残る）であり、誤ったマッチは、正当だったかもしれないしそうでなかったかもしれないnil拡幅を取り除くだけです。したがって過剰マッチの欠点は、既存の`initialize`ゲートがすでに受け入れているのと同じトレードオフであり、しかもプラグイン／設定ごとのオプトインです。構成上、新しい偽陽性を導入することはありえません。これこそが、1.0より前に採用すべき最も低リスクな拡張型である理由です。

## 作業上の決定

`Rigor::Plugin::AdditionalInitializer`値オブジェクトを運ぶ`Manifest`フィールド`additional_initializers:`を追加します。

```ruby
manifest(
  id: "minitest",
  version: "0.1.0",
  additional_initializers: [
    Rigor::Plugin::AdditionalInitializer.new(
      receiver_constraint: "Minitest::Test",
      methods: [:setup]
    )
  ]
)
```

- `receiver_constraint` — 完全修飾クラス名（String）。このエントリーはそのクラスとそのサブクラスに適用されます。
- `methods` — マッチするクラス上で、書き込み前読み込み健全性ゲートにおいて初期化子として扱われるメソッド名のSymbol配列。

`Plugin::Registry#additional_initializers`は、ロード済みプラグインにまたがってエントリーを集約します（他のマニフェストフィールドが使うのと同じ平坦な`plugins.flat_map { … }`集約）。

`ScopeIndexer`は既存の単一ゲートでそれらを消費します。クラスマッチは`Environment#class_ordering`を再利用します — これは`Inference::MacroBlockSelfType`（ADR-16ティアA）がSinatraアプリのクラスを`Sinatra::Base`に対してマッチさせるのに使うまさにその機構です — ので、推移的なサブクラス関係は同じクラスグラフを通じて解決され、解決の失敗はいずれも「マッチなし」に退化します（偽陽性安全）。環境はプリパスの`default_scope.environment`を通じて、レジストリは`environment.plugin_registry`を通じて到達されます。

ゲートは次のようになります。

```ruby
if def_node.name == :initialize ||
   additional_initializer?(class_name, def_node.name, default_scope)
  # … fold writes into init_writes, suppress nil contribution …
end
```

### v1のスコープと先送り

v1は**`def`形式**のライフサイクルメソッド（`def setup`、`def after_initialize`、DIセッター）を扱います — `collect_read_before_write_evidence`がすでに走査するメソッド（`Prism::DefNode`本体を下降します）です。

**先送り:** **ブロック形式**の確立イディオム — RSpecの`before { @x = … }`／`let(:x) { … }`です。それらのivar書き込みは、`DefNode`ではなくメソッド呼び出しに渡されるブロックの内側に存在するので、ivar書き込みコレクター（`ivar_write_collector`／`collect_def_ivar_writes`）は現状それらをまったく見ていません。これらをサポートするには、コレクターがまず`block_as_initializer`宣言された呼び出しブロックを下降する必要があります。それは書き込み収集パスへのより大きな変更であり、切り出します。（後続スライスとして追跡。マニフェストフィールドの形状はすでにそれを見越しています — 将来の`block_methods:`スロットや`kind:`判別子が同じ値オブジェクトを拡張できます。）

## 実装スライス

1. **このADR（`def`形式の最低ライン）**。値オブジェクト＋マニフェストフィールド＋検証＋レジストリ集約器＋`ScopeIndexer`ゲート拡張＋テスト。最初の消費側として`rigor-minitest`（`Minitest::Test`／`ActiveSupport::TestCase` → `setup`）を接続する。
2. **ブロック形式（`before`／`let`）**の確立を`rigor-rspec`向けに — 先送り、デマンド駆動。書き込みコレクターが宣言された呼び出しブロックを下降する必要がある。
3. **動的ロジックフック**（完全な`AdditionalConstructorsExtension`の対応物、「クラスごとに初期化子集合を計算する」） — 先送り。宣言的フィールドが既知のフレームワークのケースをカバーし、動的なケースはまだ実証されていない。

## 他のADRとの関係

- **ADR-2／ADR-37** — これはADR-37が良いモデルとして掲げる種類の、宣言的でエンジンゲート型のマニフェストフィールドをもう1つ追加するものです。命令型フックは不要です。
- **ADR-16** — `MacroBlockSelfType`が確立した`Environment#class_ordering`レシーバー制約マッチを再利用します。
- **ADR-5（ロバストネス）／偽陽性の規律** — 動機となる価値: このフィールドは、動作しているフレームワークコードを脅かすのを止めるために存在します。

## 却下／先送りした代替案

| 候補 | ステータス | 理由 |
| --- | --- | --- |
| プラグインフィールドの代わりに平坦なグローバル設定リスト（`.rigor.yml`内の`additional_initializers: ["Minitest::Test#setup"]`） | 先送り | プラグイン以外のケース向けにプロジェクトレベルの設定つまみを後で追加できる。プラグインフィールドはフレームワーク知識の正しい置き場（`rigor-minitest`に同梱され、フレームワークサポートとバージョン管理される）。 |
| 任意の読み込みより前にivarを書き込む*すべての*メソッドを初期化子として扱う | 却下 | 不健全な一般化。ライフサイクルメソッドをはるかに超えて、真の書き込み前読み込みnilケースを抑制してしまう。宣言された（クラス,メソッド）対への制約が安全境界。 |
| 直接の親クラスのみでマッチ（`class_ordering`を飛ばす） | 却下 | 一般的な推移ケース（`FooTest < ApplicationTestCase < ActiveSupport::TestCase`）を取り逃がす。`class_ordering`はすでにそれを解決し、安全に退化する。 |
| v1でブロック形式（`before`／`let`） | 先送り | ivar書き込み収集パスへの別個の変更が必要（ブロック本体は今日走査されない）。このスライスを小さく検証可能に保つために切り出す。 |

## 帰結

肯定的:

- テストコードとRailsコードにおける一群の偽陽性（`setup`／コールバックで設定された`@x`が`T | nil`として読まれる）を除去します — プロジェクトの最上位の価値に直接寄与します。
- 小さく加算的なサーフェス: 値オブジェクト1つ、マニフェストフィールド1つ、ゲート拡張1つ。新しい命令型フックも、エンジン走査の変更もありません。
- ADR-37の「宣言的でエンジンゲート型のフィールド」モデルを新しいケイパビリティ上で実証し、`rigor-minitest`に即座の精度向上をもたらします。

否定的:

- 誤ったあるいは広すぎる宣言は、正当だったかもしれないnil拡幅を黙って抑制します（オプトインで偽陽性安全な方向に限定されます）。
- ブロック形式のギャップ（`before`／`let`）は、RSpecユーザーがスライス2まで恩恵を受けないことを意味します。フィールドのドキュメントは`def`形式の制限を明記しなければなりません。
