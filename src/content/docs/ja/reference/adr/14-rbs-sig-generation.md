---
title: "ADR-14 — 推論からのRBSシグネチャ生成と拡張"
description: "rigortype/rigor docs/adr/14-rbs-sig-generation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/14-rbs-sig-generation.md"
sourcePath: "docs/adr/14-rbs-sig-generation.md"
sourceSha: "03a4b8ca2e8390beee8ca23abdb433d2caff4cc63c5a24d77c0b685b8081736f"
sourceCommit: "5b252bbd814960f6b442a4df7dd41a0d0a79c995"
translationStatus: "translated"
sidebar:
  order: 4014
---

Status: **accepted, 2026-05-12; MVPであるスライス（slice）1はv0.1.4で実装済み**。`rigor sig-gen --print` / `--diff`（戻り型のみ、`def`メソッド）は`lib/rigor/sig_gen/`に置かれる。スライス2〜5は需要駆動。

## コンテキスト

Rigorは今日、一方向のパイプです: ソースコード（`.rb`）と型ソース（`sig/*.rbs`、gemのRBS、`RBS::Extended`アノテーション、プラグイン貢献）が入り;診断が出ます。CLIは`Scope#type_of`を介した検査プローブとして`rigor type-of FILE:LINE:COL`と`rigor type-scan PATH`を表面化しますが、いずれもリポジトリに書き戻しません。

実際には、推論エンジンはユーザーが著作した以上のことを実質的に知っています:

- 単純な必須位置パラメータを持つユーザー定義の`def`メソッドに対して、`Inference::ExpressionTyper#infer_user_method_return`は呼び出しサイトでメソッド本体を再型付けし、本体が証明する最も精密なキャリア（carrier）を生成します（[`lib/rigor/inference/expression_typer.rb:1068`](../../lib/rigor/inference/expression_typer.rb#L1068)）。この作業は現在、即時の診断サーフェス（surface）以外には見えません。
- `lib/`下のすべての呼び出しサイトと`spec/`（または`test/`）下のすべてのspecブロックは、事実上、メソッドが実際に受け取るパラメータ型の*観察*です。これらの観察の和集合は、パラメータ契約（contract）の正しさを保つ上限です。
- 多くのRubyプロジェクトは`sig/`をまったく出荷していない、あるいは公開APIをカバーするが内部ヘルパーをカバーしない部分的な`sig/`しか出荷していません。著作の摩擦が主要な採用障壁です。

[ADR-5](../5-robustness-principle/)未解決の問題#3はすでに、提案サーフェスを先送りされた設計ポイントとしてフラグを立てています:

> ユーザー提供のパラメータが名前的に型付けされているが、すべての呼び出しサイトが構造インターフェース互換の値を渡す場合、診断サーフェスは*提案*を報告すべきか？ これはエラーではなく、節2のアドバイザリーになるだろう。

ADR-14はその質問に答え、戻り型の絞り込みAND欠落メソッドの発行をカバーするように広げ、配信チャネルを診断ストリームから目的別に作られたCLIサブコマンドに引き上げます。ユーザーは何がディスクにランディングするかについて完全な制御を保ちます。

## ゴール

- アナライザーがすでに証明したものを再著作することなくユーザーがRBSカバレッジを採用できるよう、Rigorに推論から派生したRBSシグネチャを発行させる。
- 1つのコマンドで3つのシナリオをカバー:
  1. 対応するRBSファイルが**ない**`.rb`ファイル。
  2. RBSファイルは存在するが、ソースに存在する**メソッドが欠落**している。
  3. RBSファイルが存在し、メソッドが宣言されているが、推論が**厳密により精密な**戻り型を証明する。
- ユーザーのリクエストに従い、**定義ファイル**（本体推論）と**呼び出し元のヒント**（`lib/`と`spec/`下の呼び出しサイト）の両方を型ソースとして使用。
- 観察可能な形でADR-5に準拠したまま: デフォルトで戻り値は厳格、デフォルトでパラメータは寛容、ユーザーがパラメータの絞り込みにオプトイン。
- すでにメソッドを定義しているユーザー著作のRBSをサイレントにミューテートしない。上書きは明示的なフラグで、デフォルトモードではない。

## 非ゴール

- **`rbs prototype`の代替ではない**。`rbs prototype rb`は`def`の形から純粋に構文的なスケルトンを発行;`rigor sig-gen`は推論されたキャリアからセマンティックなスケルトンを発行。構文的なスケルトンが欲しいユーザーは`rbs prototype`にとどまります;`rigor sig-gen`は推論駆動の補完であり、競合相手ではありません。
- **`rigor check`のステップではない**。生成は暗黙に実行されません。明示的に呼び出され、ユーザーが採用前にレビューする出力を生成します。
- **stdlib / gemのRBSのためではない**。プロジェクト自身の`sig/`ツリー（およびユーザーが許可したディレクトリ下のファイルだけ）のみ書き込み可能。
- **ランタイム型チェック生成器ではない**。出力はRBS — 静的。ランタイムの話は変わりません。
- **キャッシュ契約に結合されていない**（最初のスライスでは）。コアパスが安定した後、生成は速度のためにキャッシュにオプトインしてもよい（MAY）;MVPは新しい推論パスで実行。

## 決定

新しいトップレベルCLIサブコマンド`rigor sig-gen`と、`lib/rigor/sig_gen/`下の小さな生成コアをランディング:

1.  与えられた`PATH...`引数（設定からのデフォルト`lib/`）下のソースを、エンジンが`Inference::ScopeIndexer`を介してすでに発見する`def` / `define_method` / `attr_*`メソッド形状のために**検査する**。
2.  パラメータ型*提案*が実際の呼び出しサイトから派生できるよう、2番目のパスセット（存在する場合のデフォルト`spec/`、それ以外は空）から**呼び出し元の観察をオプションで収集する**。
3.  プロジェクト環境（`Rigor::Environment.for_project`）を介してロードされた**既存のRBSと比較する**。各候補メソッドを4つの状態のいずれかに分類:
    - **`new-file`** — レシーバークラスを宣言するRBSファイルが一切ない。
    - **`new-method`** — RBSファイルがクラスを宣言しているが、このメソッドは宣言していない。
    - **`tighter-return`** — RBSファイルがメソッドを宣言しているが、推論された戻り値がRBS宣言された戻り値の真の部分型（subtype）（あるいは他の意味でより精密）。
    - **`equivalent`** — 何もすることがない;サイレントにスキップ。
4.  デフォルトでRBSテキストをstdoutに**発行する**、または1ソースファイルにつき1ファイルの規則（`sig/<.rbなしの相対ソースパス>.rbs`）に従いプロジェクト`sig/`ツリーに`--write`する。
5.  すべての発行サイトで**ADR-5に非対称に従う**（下記§「堅牢性原則準拠」を参照）。

コマンドは`.rb`ソースファイルを変更しません。プロジェクト自身の`sig/`ツリー（または`configuration.signature_paths`が解決するディレクトリ）内の`*.rbs`ファイルを作成または更新するだけです。

### サーフェス

```
Usage: rigor sig-gen [options] [paths]

Modes:
  --print           Write RBS to stdout (default).
  --write           Write RBS to sig/<path>.rbs files.
  --diff            Show a unified diff against existing RBS
                    instead of writing.

Selection:
  --new-files       Emit RBS only for source files with no
                    existing RBS coverage at all.
  --new-methods     Emit RBS only for methods missing from
                    an existing RBS file.
  --tighter-returns Emit RBS only for methods whose inferred
                    return is strictly more precise than the
                    RBS-declared return.
                    (All three flags can be combined; absent
                    means "all three modes".)

Robustness controls:
  --params=POLICY   untyped | observed | observed-strict
                    Default: untyped. See § "Robustness
                    principle compliance".
  --observe=PATH... Directories to scan for call-site
                    observations. Defaults to spec/ when
                    present. Multiple paths allowed.
  --overwrite       Allow tighter-return updates to replace
                    user-authored RBS declarations. Off by
                    default; tighter-return mode emits to
                    stdout / diff only without --overwrite
                    + --write together.

Output:
  --format=FORMAT   text (default) | json (machine-readable
                    classification table).
  --config=PATH     Path to the Rigor configuration file.
```

### 出力レイアウト

`--write`は確立されたRubyコミュニティの慣例（`sig/<path>.rbs`が`lib/<path>.rb`をミラー）に従います。最初のスライスは1ソースファイル → 1 RBSファイルをサポート;マルチクラスファイルは両方のクラスを含む1つのRBSファイルを発行。

`--write`は`configuration.signature_paths`（デフォルト`sig/`）の外側のファイルに触れてはなりません（MUST NOT）。Rigorがgem提供またはstdlibのRBSとして識別するファイルが`sig/`下にあったとしても、触れてはなりません（MUST NOT）。

### 予約された診断識別子

新しい`sig.*`ファミリーが、`--explain`スタイルの冗長性で実行するときに生成器のメソッドごとの決定を報告します（将来のスライス）。MVPではこれらは診断ではなくJSON出力フィールドです。予約された識別子は:

- `sig.generated.new-file`
- `sig.generated.new-method`
- `sig.generated.tighter-return`
- `sig.skipped.complex-shape` — 本体推論がメソッドを失格にした（任意/rest/キーワード/ブロックパラメータ;`user_method_param_shape_simple?`を参照）。
- `sig.skipped.user-authored` — `--overwrite`が設定されておらず、既存のRBS宣言がユーザー著作である。
- `sig.skipped.untyped-return` — 推論された戻り値が`Dynamic[top]`;有用な絞り込みは存在しない。

`sig.*`はスライス1がランディングするときに[診断ファミリー階層](../../type-specification/diagnostic-policy/)に追加され、プラグインがそれと衝突できないようにします。

## 堅牢性原則準拠

ADR-5が制御する原則です。ADR-14は各ADR-5節を具体的な生成器の動作に翻訳します。

### 戻り値 — 節1（精密）

生成器は`infer_user_method_return`が証明する最も厳密なキャリアを発行します。これは*まさに*節1のケース: 推論が精密なキャリアを選び;RBSへの消去はADR-1の損失のあるエクスポートルールに従い、既存の`erase_to_rbs`チェイン（`Type::Constant`、`Type::IntegerRange`、`Type::Union`、`Type::HashShape`など）を歩きます。

例外:

- `Dynamic[T]`の戻り値は`Type::Dynamic#erase_to_rbs`に従い`untyped`に消去されます。生成器はこれを`sig.skipped.untyped-return`として記録し、そのメソッドには何も発行しません（`def foo: () -> untyped`と書くことは助けではなく不明瞭にする）。
- 既存のRBS宣言された戻り値と同じRBSスペルに消去される戻り値は`equivalent`として分類されスキップされます。

### パラメータ — 節2（寛容）

生成器はユーザーが明示的に許可した以上にパラメータ型を自動的に絞り込んではなりません（MUST NOT）。`--params`ポリシーがこれを制御します:

- **`untyped`（デフォルト）** — 発行されるすべてのパラメータは`untyped`として綴られる。これは節2の最も厳格な解釈: 推論由来のパラメータ契約は将来の呼び出し元に課されない。ユーザーは完全な著作権を保持。
- **`observed`** — 生成器は`--observe=PATH...`（デフォルト`spec/`）下のすべての呼び出しサイトから引数型を収集し、パラメータ位置ごとにユニオン（union、合併型とも）し、RBSに消去し、ユニオンを発行する。これはまだADR-5節2準拠: 観察された和集合は、既存の呼び出し元が十分性を証明する寛容な契約に*正確に*等しい。
- **`observed-strict`** — `observed`と同じだが、その上に生成器は既知のケイパビリティ（capability）ロール（例えば、観察された`String`パラメータで、すべての呼び出し元が`.to_s`しか消費しない場合は`_ToStr`に広がる）にもさらに広げる。これは節2の最大限の設定;ケイパビリティロールカタログ（v0.1.xはまだ出荷していない — §「未解決の問題」を参照）を必要とする。フラグは予約されているがそのカタログが存在するまで不活性。

3つのモードすべてで、*既存の*RBSがパラメータ契約を宣言するメソッドは拘束力があるものとして扱われます: 生成器はそれを広げてはならず（MUST NOT）、`--overwrite`なしに狭めてはなりません（MUST NOT）。これはADR-5の「すでに存在するRBSの著作権は尊重される」境界を保ちます。

### tighter-returnモードで「より精密」が意味するもの

新しい戻り型は次の場合に既存のRBS宣言された戻り値より「厳密により精密」です:

1. 新しい型の`erase_to_rbs`が既存の宣言のRBSスペルと*異なる文字列*であり、AND
2. 新しい型が`Inference::Acceptance.accepts(existing, new, mode: :strict)`の下で既存の宣言の部分型である。

strictモードの受理チェックは、アナライザーが戻り値型不一致（[`def.return-type-mismatch`](../8-steep-inspired-improvements/)）に使うのと同じ述語であり、生成器がアナライザー自身が既存の宣言に対する健全性（soundness）違反としてフラグするであろう絞り込みを決して発行しないことを保証します。

## 呼び出し元側の観察がどう収集されるか

`--params=observed`のために、生成器は`--observe`パスに対して2番目の推論パスを実行し、メソッド名がターゲットにマッチするすべての`Prism::CallNode`について`arg_types`（`Type::*`キャリアのタプル）を記録します。解決は`rigor check`を駆動するのと同じ`Inference::ExpressionTyper`パイプラインを使うため、観察ティアはRigorの残りと一貫しています。

レシーバーマッチングは保守的です:

- インスタンスメソッドの場合: レシーバー型はターゲットクラスに正確にマッチする`class_name`を持つ`Type::Nominal`でなければならない。サブクラスのディスパッチは親にクレジットされない（ADR-9のクラス順序対応の逆ルックアップは後のスライスに先送り）。
- トップレベル / DSLブロック内のdefの場合: レシーバーは暗黙的な`self`;`node.receiver.nil?`の呼び出しサイトだけが貢献。
- `define_method`にバインドされた名前は呼び出し可能な本体を持たない`def`のように扱われる（生成器はMVPでそれらをスキップ;スライス分けを参照）。

RSpecスタイルのspecファイルからの観察も同じメカニズムを使います。MVPにはRSpec固有の認識器はありません — 生成器は通常の呼び出しサイトとしてのみそれらを見ます。将来のスライスでRSpec対応の認識器（例えば、`subject(:foo) { … }`を定義として、`let(:bar) { … }`をバインディングとして認識）を追加してもよい（MAY）が、MVPはそのサーフェスを`rigor-rspec`内部に保ち、コア生成器の外に保ちます。

## ADR-1との境界（RBSラウンドトリップ）

生成器は最も積極的なRigor → RBSエクスポートパスです。ADR-1はエクスポートが保守的に消去することを保証します;生成器はその保証を遵守しなければなりません（MUST）:

- 発行されるすべての型は`Type#erase_to_rbs`を通過する。
- 忠実なRBSスペルを持たないキャリア（例えば、エクスポートターゲットがRBSクラシックの場合の精密な`HashShape`リテラル）は名目的エンベロープに消去される。
- プラグインが貢献する型は、`%a{rigor:v1:return: …}`アノテーションが最も精密なスペルである場合、プラグインの`TypeNodeResolver`チェイン（ADR-13）を経由する。生成器は、リゾルバチェインがラウンドトリップを証明するときにそのようなアノテーションを発行してもよい（MAY）;MVPはこれを先送りし、通常のRBSのみを発行する。

## ADR-0との境界（Rigor固有のインラインDSLなし）

生成器は`*.rb`ファイルではなく`*.rbs`ファイルに発行し、発行するRBSは通常のRBS（プラスオプションで将来のスライスでは`RBS::Extended`アノテーション）です。アプリケーションコードはRigorアノテーションフリーのままです。

## ADR-2 / ADR-9との境界（プラグイン契約）

生成器はMVPでは完全にコア内部で実行されます。プラグインが入力として使うのと同じ`Environment`を消費しますが、プラグイン貢献パスを呼び出しません。すでにメソッドシグネチャを貢献するプラグイン（例えば`rigor-sorbet`、`rigor-activerecord`）は*上流*の真実のソースです: 生成器は既存RBS比較の一部として彼らの貢献を読み、決して上書きせず、tighter-returnモードに対しては彼らのメソッドを`sig.skipped.user-authored`として分類します。

将来のスライスでプラグインフック（`Plugin::SignatureSuggester`または類似）を公開してもよい（MAY）ため、プラグインが生成器の出力をフィルタ / 注釈できる。ADR-14は今日そのサーフェスにコミットしません。

## 実装のスライス分け

MVPプラス4つのフォローアップスライスで、ADR-13が使ったスライスパターンをミラーします。各スライスは独自のCHANGELOG `[Unreleased]`エントリーを持つ別個のコミットとしてランディングします。

1.  **スライス1 — MVP（`def`メソッド、戻り値のみ、`--print`）**。`--print` / `--diff`モードを持つ新しいコマンド`rigor sig-gen`。戻り型ティアのみ、`user_method_param_shape_simple?`が受け付ける`def`メソッドのみをサポート。パラメータポリシーはハードコードされた`untyped`（`--params`フラグはパースされるが`untyped`だけが接続されている）。出力フォーマット`text`と`json`。入力パスに対する新しい推論パスを使い、3つの分類（`new-file` / `new-method` / `tighter-return`）をカバー。呼び出し元のヒント収集はまだなし;フラグを予約。`spec/rigor/cli/sig_gen_command_spec.rb`下の統合spec。

2.  **スライス2 — マージ付き`--write`モード**。`--write`モードを追加。`RBS::Parser`を介して既存のRBSファイルをパースし、マッチするクラス宣言に新しいメソッド宣言を挿入し、他のすべての宣言にはタッチしない。必要なときに新しい`sig/<path>.rbs`ファイルが作成される。`--overwrite`はユーザー著作宣言のtighter-return書き換えをゲートする。ホワイトスペース / コメントの保持は上流の`RBS::Writer`を使う（コメントには損失がある — 文書化されている;ユーザーがコメントの保持を望む場合は`--diff`モードで拒否基準）。

3.  **スライス3 — `--params=observed`**。2番目のパスの呼び出し元観察コレクターを追加。新しい機構: `Rigor::SigGen::ObservationCollector`が`--observe`パスを歩き、ターゲットメソッドごとに`Array[Tuple[Type, ...]]`を蓄積する。パラメータ位置ごとに、アグリゲーターが束結合を構築する。ADR-5節2準拠: 観察は常に*提案*;`--params=untyped`がデフォルトのまま;発行されるパラメータ型は決して結合を超えて広がらない。

4.  **スライス4 — 追加のメソッド形状**。本体推論と発行を次に拡張:
    - `attr_reader` / `attr_writer` / `attr_accessor`（ivarの累積型から戻り値 / パラメータ）。
    - リテラルシンボル名と単純なブロック本体を持つ`define_method`。
    - シングルトン側の`def self.foo`と`class << self`メソッド。
    - `Data.define`派生のリーダー（すでにコア推論でカバーされている;生成器は事実を消費するだけ）。

5.  **スライス5 — RSpec対応の観察 + ハンドブック**。`rigor-rspec`へのオプションの依存。存在する場合、RSpecブロック提供のバインディング（`subject`、`let`、`described_class.new(...)`）が、生の呼び出しサイトウォーカーが見るものよりクリーンな観察を貢献する。生成器のUX + `--params`ポリシーが表面化するADR-5トレードオフをカバーするハンドブック章。

MVPは意図的に小さいです。後続の各スライスは前のものからクリーンなカットを持ちます;ユーザーはそれらを独立して許可できます。

## 作業上の決定

### WD1 — なぜ`rigor check --fix`スタイルのフラグではなく新しいトップレベルコマンドを？

`rigor check`は診断サーフェスです。RBS発行をそれにボルト止めすると、1つのコマンドに2つの責務（読み + 書き）を混ぜ、単一の呼び出し内に権限境界を作成する（読みティアは常に実行される;書きティアはユーザーの許可を必要とする）。別個のコマンドは`rigor check`を純粋に診断的に保ち、書きティアをCLIシェルで明示的にします。

### WD2 — なぜデフォルトが`observed`ではなく`--params=untyped`なのか？

ADR-5節2 + ユーザーの指示: パラメータの絞り込みはアナライザーではなくユーザーの選択です。`observed`をデフォルトにすると、最初の使用で発行されるすべてのシグネチャでパラメータをサイレントに絞り込みます。`untyped`をデフォルトにすると、採用が痛みなく（ユーザーはすぐに有用な戻り値の絞り込みを得る）、パラメータの絞り込みを意図的なオプトインに変えます。将来の`observed-strict`ポリシーが最も精密な設定;それはまだ存在しないケイパビリティロールインフラを必要とします。

### WD3 — なぜ新しい`sig.*`診断ファミリーを？

生成器のメソッドごとの分類は*メタ推論*です: 解析中のコードが正しいかどうかではなく、推論が既存の著作とどう比較されたかについての情報。`dynamic.*`または`def.*`を再利用すると、2つの異なるテレメトリチャネルを混ぜます。`sig.*`ファミリーはここで予約され、スライス1がランディングするときに診断ファミリー階層に追加されます。

### WD4 — なぜ`rigor check`で自動的に書かないのか？

ユーザー所有ファイル（`sig/`内であっても）への書き込みアクションは、プロジェクトの「アクションを慎重に実行する」ルールに従い明示的な許可を必要とします。別個のコマンドは、書き込み（`--write`）を許可する前にユーザーにレビュー（`--print`、`--diff`）するシームを与えます。

### WD5 — なぜ`rbs prototype`を拡張しないのか？

`rbs prototype rb`は上流に存在し、`Prism::DefNode`を構文的に歩きます;推論エンジン、ナローイング（narrowing）へのアクセス、観察コレクターを持ちません。それをフォークすると、上流コードの巨大な部分を重複するか、ドリフトするフォークを生成することになります。Rigorの生成器は`rbs prototype`と*並行して*実行されます: 構文的なスケルトンが欲しいユーザーは上流を使う;推論されたスケルトンが欲しいユーザーはRigorを使います。

### WD6 — なぜADR-12ではなくADR-14？

ADR-12は既存のロードマップに従いdry-rbパッケージングのために予約されています。ADR-14は次の空きスロットを取り、パッケージング議論から独立したままです。

## 検討した代替案

- **`rigor-sig-gen`プラグインとしての生成器**。拒否: 生成器は、プラグイン契約が今日公開しているよりも直接的にコア推論パイプライン（`Inference::ExpressionTyper`、`Scope#evaluate`）に依存しています。プラグインとして追加すると、実証された需要に先立って契約の拡幅を強制することになります。
- **`rigor check --emit-rbs`**。WD1 + WD4により拒否: 読みと書きのサーフェスを混ぜます。
- **既存の`dynamic.*`診断サーフェスへのフック**（診断を介して型を提案し、ユーザーにコピーさせる）。拒否: 診断はスケールするとノイズが多く、提案は1行のメッセージではなく`RBS::Writer`形の出力をラウンドトリップする必要があります。
- **`Steep`のスキャフォールドツールの上に構築**。拒否: 既存の`tool/steep/Gemfile`クロスチェッカー境界の外でSteepへのランタイム依存を導入します。AGENTS.mdはSteepを腕の長さに保ちます;生成器はインツリーにとどまります。

## 未解決の問題

- **ケイパビリティロールカタログ**。`--params=observed-strict`は著作されたキャリアとして`_ToStr` / `_ToS` / `_ReadableStream` / …を必要とします。構造シェイプ（shape）仕様（[`docs/type-specification/structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/)）はサーフェスを予約していますが、カタログはまだ満たされていません。それがあるまで、`observed-strict`は不活性です。
- **ジェネリックメソッド**。生成器は、本体が戻り値がパラメータ型に関係なく`Integer`であることを証明するメソッドに対して`def foo: (untyped) -> Integer`を発行します。本体の戻り値がパラメータ型に代数的に依存する場合、生成器は型パラメータ導入ステップを必要とします。軽量HKT探索（プロジェクトメモリ）が具体的なサーフェスをランディングするまで先送り。
- **ブロックパラメータシグネチャ**。今日生成器は、ブロックパラメータを持つメソッド（`user_method_param_shape_simple?`の`params.block.nil?`）を拒否します。将来のスライスは、推論エンジンが端から端までブロックyield形状を追跡したら`() { (E) -> R } -> …`を発行できる。
- **マージモードでのコメントの保持**。`RBS::Writer`は上流の設計でコメントに損失があります。スライス2は可能な限りバイト範囲で操作することで、触れない宣言を逐語的に保ちますが、同じクラス宣言内の手書き + 生成器出力の混在は、触れた宣言内のコメントを失います。`--diff`レビューサーフェスがこれをフラグします。
- **`sorbet/rbi/`下のTapioca生成RBI**。スコープ外 — 生成器はRBIではなく`sig/`下のRBSをターゲットにします。`rigor-sorbet`プラグイン（ADR-11）はRBIを読みます;生成器はRBSレーンにとどまります。

## 関連ADR

- [ADR-0: コンセプト](../0-concept/) — 「アプリケーションのRubyコードはRigor専用のアノテーション構文がないままにとどまる。」ADR-14は`*.rb`ではなく`*.rbs`に発行する;境界は保たれる。
- [ADR-1: 型モデルとRBSスーパーセット戦略](../1-types/) — RBSラウンドトリップは保守的に消去。ADR-14は最も積極的なRigor → RBSエクスポートサイト;すべての発行を`Type#erase_to_rbs`経由でルーティングすることでルールを遵守する。
- [ADR-4: 型推論エンジン](../4-type-inference-engine/) — ADR-14が発行する型を生成するエンジン。
- [ADR-5: 堅牢性原則](../5-robustness-principle/) — ADR-14がCLIで表面化する非対称な戻り値対パラメータポリシーを制御する。
- [ADR-8: Steepにインスパイアされた改善](../8-steep-inspired-improvements/) — `def.return-type-mismatch`は、ADR-14が絞り込みが安全かどうかを決定するために再利用する健全性述語。
- [ADR-13: TypeNodeリゾルバプラグイン](../13-typenode-resolver-plugin/) — リゾルバチェインがラウンドトリップを証明するときに将来のスライスが発行してもよいプラグイン提供型語彙。

## 背景となる研究ノート

- [`docs/notes/20260518-matsumoto-2008-poly-records-rigor-review.md`](../../notes/20260518-matsumoto-2008-poly-records-rigor-review/)
  — 松本＆南出2008は、ML推論が多相再帰を扱えないため、`map`呼び出しチェーンに対する多クラス再帰（`Array#0` / `Array#1`）を型推論エンジンの中で手動展開せざるをえなかった。ADR-14は逆のスタンスを取る——ジェネリクスは人間がRBSで事前に宣言し、ジェネレータはその宣言を信頼する。`--params`ポリシー（`untyped` / `observed` / `observed-strict`）の議論のための有用な背景——この論文は、Rigorが採用しなかった*自動展開*の代替案である。

## リビジョン履歴

- 2026-05-12 — 初期ドラフト。
