---
title: "Mangrove（Result / Option / Enum）— ライブラリ調査 + `rigor-mangrove`の形状"
description: "Imported from rigortype/rigor docs/notes/20260530-mangrove-library-survey.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260530-mangrove-library-survey.md"
sourcePath: "docs/notes/20260530-mangrove-library-survey.md"
sourceSha: "645a8cb371c6b9f11742b0c77704c418f2dc5686d08a6eba31116ad284a6fee9"
sourceCommit: "dd55ede4decf11e2a57ac53e62d5732ad629a229"
translationStatus: "translated"
sidebar:
  order: 20266530
---

日付: 2026-05-30。
ステータス: 調査ノート、設計上のコミットメントはなし。将来の
`plugins/rigor-mangrove`に資する内容であり、すでに出荷済みの
[`rigor-sorbet`](https://github.com/rigortype/rigor/blob/master/plugins/rigor-sorbet/README.md)（[ADR-11](../../adr/11-sorbet-input-adapter/)）との関係を明確にする。

対象: [kazzix14/mangrove](https://github.com/kazzix14/mangrove)（v0.40.0、MIT）。
ソースはGitHub API経由で読んだ。サブモジュールとしてベンダリングしたものは何もない。
目標は、**Mangroveを*使う*Rubyコードの型検査**——`result.and_then { … }`、
`opt.unwrap_or(x)`、`case variant; when MyEnum::IntVariant`、`unwrap_in(ctx)`の
早期リターンDSL——を、そのコードが`Dynamic[top]`に劣化することなく行うことである。

## Mangroveとは何か

Rust／HaskellのイディオムをRubyに移植したSorbet対応のツールキット:

| キャリア（carrier） | 形状 | ファイル |
| --- | --- | --- |
| `Result[Ok, Err]` | `sealed! interface!`、`Ok` / `Err`のバリアント、リッチなモナディックAPI（`map_ok`、`and_then`、`or_else`、`unwrap!`、`expect!`、`and_err_if`、…） | `lib/mangrove/result.rb` |
| `Option[Inner]` | `sealed! interface!`、`Some` / `None`、`from_nilable` | `lib/mangrove/option.rb` |
| `Enum` | ADT——`variants do variant X, Type end`、各バリアントが固有の内部型を持つ | `lib/mangrove/enum.rb` |
| 早期リターンDSL | `Collector#collecting` + `CollectingContext`。`result.unwrap_in(ctx)`は`Err`でショートサーキットする | `lib/mangrove/result/collector.rb` |
| `Ext` | `value.in_ok` / `value.in_err`のラッパー | `lib/mangrove/result/ext.rb` |
| `TryFromExt` | `try_convert_from(from:, to:, err:) { … }` → 動的な`try_into_<snake>` | `lib/mangrove/try_from_ext.rb` |
| Tapiocaコンパイラ | `lib/tapioca/dsl/compilers/mangrove_{enum,result_ext,try_from_ext}.rb`が動的なサーフェス（surface）向けのRBIを生成する | — |

マクロ展開調査からの5つの問いを、2つの自明でないサーフェスに適用する:

### Enum DSL

1. **DSL** — `class MyEnum; extend Mangrove::Enum; variants do variant IntVariant, Integer; variant ShapeVariant, { name: String, age: Integer }; end; end`
2. **メカニズム** — 純粋なランタイムメタプログラミング。`variants`は各
   バリアントの内部型を`variant.instance_variable_set(:@__mangrove__enum_inner_type, …)`
   経由で退避させ、続いて、定数が初めて参照されたときに各バリアントクラス
   （`initialize`、`inner`、`as_super`、`serialize`、`==`）を遅延定義するために、
   **文字列化されたRubyヒアドキュメント**を`class_eval`する`const_missing`を組み込む。
3. **生成されるサーフェス** — バリアントごとに1つのサブクラス。それぞれ
   `MyEnum::IntVariant < MyEnum`であり`#inner : <宣言された型>`を持つ。
4. **静的展開可能性** — ソースから復元可能。`variant X, Type`のペアはブロック内の
   リテラル引数であり、生成されるメソッド集合は固定である。これはまさに
   [ADR-16](../../adr/16-macro-expansion/)の展開対象であり、`rigor-dry-struct`
   （Tier C）と同じ形状である。
5. **最も近い類例** — リテラルな仕様リストに対するLispの`defmacro`。Sorbet
   自身はこれを静的に見ることができず、それこそがMangroveがTapioca DSL
   コンパイラを出荷している*理由*である。

### 早期リターンDSL（`unwrap_in` / `collecting`）

1. **DSL** — `Collector[Ok, Err].new.collecting { |ctx| step1.unwrap_in(ctx); step2.unwrap_in(ctx); … }`
2. **メカニズム** — `collecting`はブロックを
   `catch(:__mangrove_result_collecting_context_return)`でラップする。`Err#unwrap_in`は
   包んでいる`Err`を`throw`し、`Ok#unwrap_in`は内部の値を返す。
   Rustの`?`演算子を手で実装したものである。
3. **生成されるサーフェス** — なし。これは制御フロー構文である。
4. **静的展開可能性** — *型*（ハッピーパスでの`unwrap_in : Ok`）はsigにあるが、
   **`Err`での制御フローの分岐**はsigでは表現できない。フローを意識した
   アナライザーによってのみ復元可能である。
5. **最も近い類例** — `T.must` / `T.absurd`（`rigor-sorbet`がすでに
   `flow_contribution_for` + 例外的エッジとしてモデル化している）、またはRustの`?`。

## 主要な知見——型の*ソース*はすでにカバー済み

2つのファクト（fact）が「型ソースプラグイン」案を崩す:

1. **`sig/mangrove.rbs`は空である**（`VERSION: String`のみ）。したがって、
   [ADR-25](../../adr/25-plugin-contributed-rbs/)の`signature_paths:`ルート——
   ライブラリのRBSをプラグインと一緒に出荷する——は**利用できない**。出荷すべきRBSが
   存在しないのである。
2. **`rigor-sorbet`（スライス（slice）1〜8、機能完備）はすでにMangroveの
   本物の型ソースを取り込んでいる。** MangroveのResult/Option APIは完全に
   `sig {}`で注釈されており（スライス1〜3がこれらを、ジェネリックの適用も含めて
   カバーする）、Enumの動的なバリアントはMangroveの**Tapioca DSLコンパイラ**によって
   `sorbet/rbi/{gems,dsl}/`に実体化される——これを`rigor-sorbet`のスライス4
   （RBIツリーウォーク）とスライス8（`Generated*`の`include`/`extend`の引き上げ）が
   すでにカタログへ取り込んでいる。

したがって**Tapiocaを使う**Mangroveプロジェクトでは、`rigor-sorbet`を有効化すれば
すでにResult / Option / EnumのシグネチャがRigorに流れ込む。専用プラグインは新たな
*型ソース*を一切追加しない。これは`rigor-ffi-plugin-author`の「まずプラグインを
やめる方向に自分を説得せよ」という結末である。

## `rigor-mangrove`が*やはり*存在価値を持つ場面

`rigor-sorbet`（≈ Sorbetレベルの精度）が構造的にできず、Rigorのエンジンにとっては
ネイティブである3つのこと:

| # | ケイパビリティ（capability） | sig取り込みではなぜ不可能か | Rigorのサーフェス |
| --- | --- | --- | --- |
| ① | **フローとしての`unwrap_in(ctx)` / `collecting`** | ハッピーパスは`Ok`だが、`Err`の`throw`はsigにない制御フローの分岐である | 制御フロー解析 + `flow_contribution_for`（例外的エッジ）。`rigor-sorbet`が`T.absurd`（スライス6）/ `T.must`に対して行うのとまったく同じ |
| ② | **`is_a?(Result::Ok)` / `Some`/`None`の網羅的ナローイング（narrowing）** | READMEは`ok?`/`err?`を非推奨とし、「Sorbetが静的に型付けできるように」`is_a?`を推奨している。`sealed!`なADTは教科書的な網羅性の対象である | 制御フローのナローイング（sealedな階層に対する判別子） |
| ③ | **Tapioca抜きのEnum DSL** | プロジェクトがTapiocaを実行しない場合、`const_missing`/`class_eval`のバリアントはSorbetにも`rigor-sorbet`にも*見えない* | [ADR-16](../../adr/16-macro-expansion/)のマクロ展開で`variants do … end`をソースから直接展開する——`rigor-dry-struct`と同じパターン |

④（限界的）Result/Optionはファンクタ／モナドなので、[ADR-20](../../adr/20-lightweight-hkt/)の
`App[F, A]`が`map_ok` / `and_then`を精密に貫通させられる——だがSorbetのsigは
すでに`type_parameter(:NewOkType)`を通過させているので、ここでの向上は小さい。
ローンチの正当化理由にはならない。

正直なフレーミング: **`rigor-mangrove`は精度／制御フローのプラグインであり、
型ソースプラグインではない。** ③が単独で最も強い正当化理由である（Enumのための
Tapioca依存を取り除く）。①②はsig取り込みでは決して到達できないエンジン協調の勝ちである。

## 推奨

- **配置** — Mangroveは実在のgemなので、`examples/`ではなく`plugins/rigor-mangrove`
  （プロダクション）。
- **スコープ** — 並行する型ソースとしてではなく、`rigor-sorbet`の*上に*重ねた
  ①②③の精度プラグインとして定義する。
- **まずリスクを下げる** — プラグインコードにコミットする前に、小さな調査を実施する。
  Mangroveを使うフィクスチャを取り、**`rigor-sorbet`単体**で検査し、それが
  `Dynamic[top]`に落ちる箇所を正確に記録する。その計測が、①②③のどれが実際に発火するか、
  どの順で構築するかを決める。フィクスチャは
  [外部調査の慣例](../20260519-oss-library-survey/)に従い`~/repo/ruby/rigor-survey/`の
  配下に置く。
- **プロセス** — `rigor-plugin-author`スキルで作成する（Phase 0/0.5の
  メンテナールーティング → 要件 → テンプレート → スキャフォールド → ウォーカー → 統合
  仕様）。非メンテナーが主導する場合は[ADR-31](../../adr/31-contribution-and-supply-chain-policy/)の
  サードパーティパスが適用される。

推奨される順序: **調査（rigor-sorbet単体）→ プラグイン**。精度を上に構築する前に、
「型ソースはすでにカバー済み」という仮説を検証すること。

## 契約適合チェック（2026-05-30、プラグイン作成中）

実際のv0.1.xプラグイン契約（contract）（`Macro::HeredocTemplate`、
`rigor-dry-struct`、`rigor-sorbet`）を3つのスライスに照らして読むと、構築可能性の
見通しが大きく変わる:

| # | スライス | 契約適合 | 判定 |
| --- | --- | --- | --- |
| ① | `unwrap_in(ctx)` / `collecting`の早期リターン | **今すぐ構築可能**。手書きのウォーカー: `flow_contribution_for`が`:unwrap_in`呼び出しを認識し、ハッピーパスではレシーバーの`Ok`型を、`Err`では例外的エッジを返す——`rigor-sorbet`の`T.absurd`（スライス6）/ `T.must`の認識器と構造的に同一。 | **v0スライスとして出荷**。 |
| ② | `is_a?(Result::Ok)` / `Some`/`None`のナローイング | **エンジンの領分であり、プラグインのサーフェスではない**。 `sealed!`な階層に対するナローイングはコアの制御フロー解析である。さらに悪いことに、Mangroveのsealed性は*Sorbet*の注釈なので、エンジンはそれを`rigor-sorbet`経由でしか知れない。きれいなプラグインフックがない。 | 先送り。エンジン + `rigor-sorbet`のsealed階層伝達が必要。 |
| ③ | Enumの`variants do variant Const, Type end` | **ADR-16のTier Cには適合しない**。 Tier Cは`symbol_arg_position`でリテラルな**Symbol**を抽出し、**呼び出し元クラスにメソッド**を生成する。Mangroveの`variant`は**定数**を取り、`#inner : <Type>`を持つ**ネストしたサブクラス**（`MyEnum::IntVariant < MyEnum`）を生成しなければならない。`rigor-dry-struct`はまさにこれを明示的に先送りしている（「`Address::Details`を生成するネストブロック形式……はTier A + Tier Cの合成 + `const_set`生成が必要。先送り」）。 | ADR-16の契約改訂（ネストクラス／`const_set`生成のティア）が必要。v0.1.xのプラグインスコープ外。 |

正味: 現行契約の下で出荷可能な`rigor-mangrove`プラグイン = **スライス①のみ**。
②はエンジンの作業、③はADR-16の改訂が必要。`rigor-plugin-author`の
「回避策を発明するのではなく、立ち止まって尋ねる」ルールに従い、スコープの決定
（①単体で出荷するか、②/③のエンジン／ADR作業を始めるか）はメンテナーに差し戻す。

（注: 構築されたスライス①は、上の表でスケッチした`unwrap_in`の制御フローウォーカーでは
*ない*——作成中の計測がそれを、よりシンプルで契約内の**キャリアジェネリックの
インスタンス化**にunwrap呼び出し箇所でリダイレクトした。エンジンは
`Result::Ok.new("x")`からジェネリックを推論しない（生のNominalで`type_args`なし）が、
宣言された戻り値が適用済みジェネリックであるメソッド（`-> Result[String, E]`）は
`type_args`を*運ぶ*ので、プラグインは`type_args[0]`を読んでそれをunwrapの戻り値として
寄与させる。これはコミットf7b20275で`plugins/rigor-mangrove`として出荷された。）

## 調査フィクスチャの知見（2026-05-30、ランディング後）

スライス①を**本物のチェーン**——Sorbetのsig経由で型付けされたMangrove（その実際の
型ソース）であり、プラグイン自身のデモが使う手書きのRBSではない——に対して検証した。
フィクスチャ: `~/repo/ruby/rigor-survey/_mangrove-probe/`（+ アップストリームgemの
浅いクローン`~/repo/ruby/rigor-survey/mangrove/`。これは本物のインラインsigと
`sorbet/rbi/`ツリーを持つ）。

プローブ（現実的な形状——戻り値がユーザー定義のジェネリックであるプロデューサー）:

```ruby
# typed: true
class Factory
  extend T::Sig
  sig { returns(Mangrove::Result::Ok[String, StandardError]) }
  def self.make = Mangrove::Result::Ok.new("ok")
end
Factory.make.unwrap!.uppercaze   # typo on the unwrapped value
```

`rigor-sorbet` + `rigor-mangrove`の両方を有効化して実行（両方とも`rigor plugins`で
`[OK]`を報告）: **診断ゼロ**。 `Factory.make`は`Dynamic[top]`に解決されるので、
`unwrap!`のレシーバーはキャリアNominalを持たず、rigor-mangroveは何もせず、タイポは
黙って出荷されてしまう。

**根本原因（ソースで確認済み）**。 `rigor-sorbet`の
`TypeTranslator#translate_t_subscript`（`type_translator.rb:177-188`）は、ジェネリックの
適用を`Nominal[name, type_args]`へインスタンス化するのを、**`T::`名前空間の定数**
（`T::Array[E]`、`T::Hash[K,V]`、`T::Class[T]`）に対して**のみ**行う。
`Mangrove::Result::Ok[String, StandardError]`のようなユーザー定義のジェネリックは
`T::`名前空間ではないので、`translate_call`は`degraded` → `untyped`へ落ちる。レシーバーの型は
rigor-mangroveが見る前に失われている。

**帰結——動くチェーンと動かないチェーン:**

| キャリア + プロデューサー戻り値の型ソース | unwrap時のレシーバー | rigor-mangrove |
| --- | --- | --- |
| **RBS**（`-> Mangrove::Result::Ok[String, E]`） | `Nominal[…, [String, E]]`（エンジンがネイティブにインスタンス化） | **発火する** ✓（デモ + 6 specs） |
| **Sorbet sig**（`rigor-sorbet`経由） | `Dynamic[top]`（ユーザージェネリックが劣化） | 何もしない ✗ |

したがってプラグインは正しく有用だが、**RBSで型付けされたパスでのみ**そうである。
MangroveプロジェクトはSorbetファーストなので、現実的なパスは今日発火しない方である。
プラグインの価値は現在、それがめったに持たない型のソースの背後にゲートされている。

**最もレバレッジの高いフォローアップ（この調査で浮かび上がった）**。 `rigor-sorbet`の
`TypeTranslator`を拡張し、`T::`名前空間のものだけでなく、**ユーザー定義の**ジェネリックの
適用（`Const[A, B]` → `Nominal[Const, [A, B]]`）もインスタンス化させる。これは既存の
1つのプラグインに対する小さく、スコープの明確な変更（プラグイン作成者パイプラインではなく、
通常の編集）であり、現実のSorbet型付けチェーンでrigor-mangroveを解放する——加えて、sigで
表現された*あらゆる*ジェネリックなユーザー型（`MyBox[T]`、`Pagy::Result[T]`、…）に利益を
もたらす。より安価な応急処置——rigor-mangroveと一緒にキャリアRBSオーバーレイを
`signature_paths:`で出荷する——は、消費者のプロデューサーメソッドも*また*RBSで型付け
されている場合にのみ役立つが、Sorbetプロジェクトのそれはそうではないので、それ単独では
ギャップを埋めない。

推奨される順序: **rigor-sorbetのユーザージェネリック変換 → このプローブを再実行 →
（その後）rigor-mangroveの②/③**。最初のものなしでは、②/③は実際には依然`untyped`である
レシーバー型の上にさらに精度を重ねることになる。

### 更新——rigor-sorbetの修正がランディングした（2026-05-30）

`rigor-sorbet`の`TypeTranslator`はユーザー定義のジェネリックの適用を翻訳するようになった
（`translate_user_subscript`）: sig位置にある`T::`をルートに持たない任意の`Const[A, B]`が
`Nominal[name, type_args]`にマップされる（引数を再帰的に翻訳する）。上のプローブを修正版で
再実行すると:
`chain.rb:12:22: error: undefined method 'uppercaze' for String`——チェーンは端から端まで
解決するようになった（`Factory.make` → `Nominal["Mangrove::Result::Ok", [String,
StandardError]]` → rigor-mangroveが`type_args[0]`を読む → `String` → タイポが
捕捉される）。したがってSorbetで型付けされたMangroveプロジェクトでは、`rigor-sorbet` +
`rigor-mangrove`を一緒に有効化することで今や精度が得られる。RBS限定のゲートは解除された。

偽陽性チェック: 通常どおり定義された（Ruby/Sorbetの）キャリアに対する
`sig { returns(KnownClass[T]) }`は、誤った`undefined method []`診断を**生成しない**——
エンジンはそうしたクラスのsigブロック本体をコードとして解析しないからである。（`[]`診断が
表面化した唯一の設定は、キャリアが手書きのジェネリックRBSで*のみ*宣言された人工的なもので、
これは本物のMangroveの形状ではない。）

②/③は依然として未解決の項目であり、その順序であるが、今やレシーバーはunwrap箇所で
実際にその型を運ぶようになった。

### 実プロジェクトでの偽陽性検証（2026-05-30）

ユーザージェネリックの翻訳は、これまで`untyped`だったsigの戻り値を型付き`Nominal`に変え、
それはより多くのメソッド呼び出しが検査可能になることを意味する——これは精度の勝ちだが、
原理的には実コード上で偽陽性を*導入*しうる。入手可能な最もジェネリックを多用する実Sorbet
プロジェクト——アップストリームのMangrove gem自身（`~/repo/ruby/rigor-survey/mangrove/`、
`lib` + `spec`、`rigor-sorbet`下）——に対する**前後差分**で検証した: `translate_user_subscript`
ブランチを有効にして`rigor check --format json`を実行し、次にそれをコメントアウトして
実行し、診断集合を差分する。

結果: **前860診断、後860診断——導入0、除去0**。変更は確かに*発火*する（Mangroveのsigは
`Mangrove::Result[…]` / `Option[…]`を返し、specチェーンはそれらの戻り値からキャリアメソッドを
連鎖させる）が、新たな診断を一切表面化せず、何も黙らせなかった。したがって実Sorbetコード上で
この翻訳は**偽陽性中立**である——動いているコードを脅かすことなく型を鋭くする、プロジェクトの
最高水準のFP規律を尊重する。（ここでは*精度*診断も追加しなかった。Mangroveのspecは
`Result::Ok.new(...)`——生のnominalで、コンストラクタからのジェネリック推論はない——経由で
キャリアを構築しており、sigが返すジェネリックを消費しないからである。この変更が鋭くするパスは
実在するが、Mangroveのspecの支配的な使い方ではない。）

## 調査フィクスチャの知見——② is_a?のナローイング（2026-05-30）

`is_a?(Result::Ok)` / `Err`のナローイングをエンジンに対して直接プローブした
（`~/repo/ruby/rigor-survey/_mangrove-probe/narrow/`）。**契約適合表の②行
（「エンジンの領分。ナローイングなし」）は悲観的すぎた——クリーンなキャッシュに対して計測すると、
コアのナローイングはすでに動作する。**（そうでないと示唆した最初のプローブは、
古いキャッシュ／フォーマッタによる列ずれのアーティファクトだった。ナローイングのプローブの間は
常に`rm -rf tmp`せよ。）

**適用済みジェネリックのバリアントのユニオン（union）**として型付けされた値——
RBS/sigの戻り値が`Ok[String, Integer] | Err[String, Integer]`であるプロデューサーから得られる
形状——に対して、`is_a?`のナローイングは正しく、**かつ**両方のエッジで型引数を保存する:

| 位置 | 推論された型 |
| --- | --- |
| `if r.is_a?(Mangrove::Result::Ok)` → `r` | `Mangrove::Result::Ok[String, Integer]` ✓ |
| … `r.value`（Ok#value → OkType） | `String` ✓ |
| `else` → `r` | `Mangrove::Result::Err[String, Integer]` ✓ |
| … `r.error`（Err#error → ErrType） | `Integer` ✓ |

どちらの方向でも偽陽性はない（そしてユニオンのメソッドディスパッチは寛容なので、
ナローイング*なし*でも`Ok | Err`に対して`Ok`専用のメソッドを呼んでも誤発火しない）。
エンジンのパスは`Narrowing#narrow_union_class` → メンバーごとの
`narrow_nominal_to_class`であり、`Environment#class_ordering`が、ドロップする兄弟に対して
`:disjoint`を返す。コアクラスのユニオン（`Array[String] | Hash[…]`）も同一に振る舞う。既存の
カバレッジは`spec/rigor/inference/narrowing_spec.rb`（「ユニオンを要素ごとにナローイングし、
互いに素なメンバーをドロップする」）にある。

**唯一の実際の②ギャップ——ダウンキャストの型引数伝播**。値がバリアントのユニオンではなく
*親／インターフェイス*のジェネリック（`Mangrove::Result[String, E]`）として型付けされている
とき——これはSorbetのsigが生成する形状である——`is_a?(Result::Ok)`のナローイングは部分型を
解決するが**型引数を落とす**: `narrow_nominal_to_class`の`:superclass`分岐
（narrowing.rb:2033）が裸の`Type::Combinator.nominal_of(class_name)`を返すので、
`Res[String, Integer]`は裸の`ResOk`にナローイングされ、`ResOk#value`は`untyped`に劣化する
（計測済み）。引数を正しく運ぶには**継承エッジを通したジェネリック置換**が必要である
（RBSの`class Child[..] < Parent[..]`宣言に従い、親の型引数を子のパラメータにマップする）——
位置による単純コピーは一般には健全でない（`class Foo[T] < Bar[T, Integer]`）。これは本物の、
微妙なコアエンジンの作業であり、`docs/type-specification/control-flow-analysis.md`の下で
規範的であり、**偽陽性の圧力はない**（精度を失うだけで、動いているコードを決して脅かさない）。
需要駆動。先送り。これはまた、rigor-mangroveのunwrapを`is_a?`ダウンキャストの後に
（すでにユニオンで型付けされたレシーバーの上だけでなく）発火させられるものでもある——だが
それも、再び、精度の向上であって正しさの修正ではない。

正味: ②は一般的なケースに対してナローイングロジックの変更を**必要としない**（動作する）。
残る作業はダウンキャストの型引数伝播の精度向上であり、これはコアエンジンのジェネリック置換であって、
Mangrove作業に束ねるのではなく、それ自身でスコープを定めて設計レビューすべきである。
