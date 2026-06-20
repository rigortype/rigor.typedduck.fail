---
title: "エラーの読み方"
description: "rigortype/rigor docs/handbook/08-understanding-errors.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/08-understanding-errors.md"
sourcePath: "docs/handbook/08-understanding-errors.md"
sourceSha: "71298d8003e3c812663034c10be6d71579901bfe90a3007978e76af606ce5b4b"
sourceCommit: "212f2c491920cc5c39a12d75aee385cb6c51fa0c"
translationStatus: "translated"
sidebar:
  order: 1008
---

この章はRigorが出荷する診断のカタログ、それらが属するファミリー、そして診断が間違っているとき（または深刻度を変えたいとき）に抑制する方法です。診断に、どちらの方向であれ、驚かされたときに最初に開くページです。

## 診断の構造

```text
lib/user.rb:42:7: error: undefined method `upcas' for "alice" [call.undefined-method]
                  ↑      ↑                                   ↑
                  │      │                                   └─ 修飾ルール
                  │      └─ メッセージ
                  └─ 深刻度 (error / warning / info)
```

修飾ルール（`call.undefined-method`、`flow.always-raises`、`def.return-type-mismatch`など）はルールの安定した識別子です。以下で使います:

- ソース内の`# rigor:disable <rule>`行末抑制
- ソース内の`# rigor:disable-file <rule>`ファイルスコープ抑制
- `.rigor.yml`の`severity_overrides:`
- `.rigor.yml`の`disable:`

ワイルドカードも使えます。`# rigor:disable call`はその行のすべての`call.*`ルールを抑制します。

シェルを離れずにルールの内容を調べたい場合は、`rigor explain <rule>`でルールのサマリー、発火条件、非発火条件、抑制トークン、作成重大度、プロファイルごとの重大度を確認できます。引数なしの`rigor explain`は出荷済みすべてのルールのインデックスを表示します。

### 信頼度と参照フィールド

`rigor check --format json`を消費するエージェントやダッシュボードのために（そして`rigor explain --format json`の各ルールにも）、すべての組み込み診断には2つの追加フィールドが付随します:

- **`evidence_tier`**: `high` / `medium` / `low`: その発火が真陽性であるというRigor自身の信頼度で、ルールの深刻度ではなくゲートから導かれます。`high`は、メタプログラミングの逃げ道がない、具体的で静的に既知の型を意味します（例: `call.undefined-method`）;`medium`は、文書化された偽陽性の許容範囲を持つフロー／推論の証明に依拠します（例: `flow.always-truthy-condition`）;`low`は解決またはカバレッジのギャップシグナルで、しばしばバグではなくコンテキスト不足を意味します（例: `call.unresolved-toplevel`）。ティアは深刻度には決して反映されません。それは`severity_profile:`の判断のままです。情報提供のヘルパー（`dump.type`）はティアを持ちません。
- **`documentation_url`**: 公開された診断カタログ内のルールのエントリーへの安定したリンク。

どちらも表示用のメタデータです。診断が発火するかどうかを決して変えません。

## ルールカタログ

5つのファミリー、それぞれに1つ以上のルール:

### `call.*`: 呼び出し元ルール

メソッド呼び出しの形状が間違っているときに発火します。

| ルール | 発火するとき | デフォルト深刻度 |
| --- | --- | --- |
| `call.undefined-method` | レシーバークラスが静的に既知で、メソッドがそれに定義されていない（RBSまたはインソース）。 | error |
| `call.wrong-arity` | 位置引数の数がどのオーバーロードのアリティも満たさない。 | error |
| `call.argument-type-mismatch` | 引数の型がパラメータ契約（contract）（RBSまたは`RBS::Extended` `param:`）を証明可能に満たさない。 | error |
| `call.possible-nil-receiver` | レシーバー型が`T \| nil`で、メソッドが`NilClass`で定義されていない。 | error（`lenient`でwarning） |
| `call.unresolved-toplevel` | トップレベル（どの`def` / `class` / `module`の外側でもない）の暗黙的self呼び出しが、同一ファイルの`def`、`pre_eval:`モンキーパッチ、`Kernel` / `Object`のメソッドのいずれにも解決しない。スタンドアロンスクリプトのタイポを顕在化させる。 | `balanced`でwarning、`strict`でerror、`lenient`で抑制 |

`call.*`ルールは実際のコードで最も量の多い診断です。また最も洗練されています。それぞれがRigorが根底にある事実を証明できる場合にのみ発火します。

### `flow.*`: フロー解析ルール

制御フロー自体が健全（soundness）でないときに発火します。

| ルール | 発火するとき | デフォルト深刻度 |
| --- | --- | --- |
| `flow.always-raises` | 式のすべての到達可能な評価が例外を投げる（例: `n: Integer`のとき`n / 0`）。 | error |
| `flow.unreachable-branch` | `if` / `unless` / 三項演算子の述語が構文的リテラルで、対応する到達不能ブランチが空でない。 | warning |
| `flow.always-truthy-condition` | `if` / `unless` / 三項演算子の述語が推論型により証明可能に真値（または偽値）で、ループボディ内と防衛的述語コールに外科的スキップあり。 | warning |
| `flow.unreachable-clause` | `case <local>; when <Class>`（または素のクラスの`case`/`in`）節で、対象のナローイングによりそれが決してマッチしないことが証明される。対象の型と素であるか、または先行する節ですでに尽くされている。 | `balanced`でinfo、`strict`でwarning、`lenient`でinfo |
| `flow.dead-assignment` | 同じ`def`ボディ内で一度も読まれないローカル変数への単純な書き込み。 | warning |

`flow.unreachable-branch`、`flow.always-truthy-condition`、`flow.unreachable-clause`は**到達可能性ファミリー**です。それぞれがブランチまたは`case`節が死んでいることを証明します。`unreachable-clause`は最新のメンバーです: `case <local>; when <Class>`（および素のクラスの`case`/`in`）を監視し、先行する節がすでにメンバーの型をカバーしているか、または節が対象と素であるときに発火します。コーパスの偽陽性ゲートが完成するまでは`balanced`では`:info`で出荷されます（兄弟より1段下）;もっと目立たせたいなら`severity_overrides:`で引き上げてください。

### `def.*`: メソッド定義ルール

メソッドの本体が宣言された契約に違反するときに発火します。

| ルール | 発火するとき | デフォルト深刻度 |
| --- | --- | --- |
| `def.return-type-mismatch` | 本体の最後の式の推論された型がRBS宣言の戻り値型を満たせない。`%a{rigor:v1:return: <refinement>}`オーバーライドを尊重。 | `balanced`プロファイルでwarning、`strict`でerror |
| `def.ivar-write-mismatch` | 同じクラスボディ内で後の`@var = ...`書き込みの具体クラスが最初の書き込みのクラスと異なる（NilClass-to-clearはアローリスト）。 | `balanced`プロファイルでwarning、`strict`でerror |
| `def.method-visibility-mismatch` | 明示的レシーバーのコールが、周囲のクラスボディで`：private`として発見されたメソッドを持つ`Nominal[X]`をターゲットにする。 | error |
| `def.override-visibility-reduced` | オーバーライドが、プロジェクト定義の祖先から継承した可視性を縮小する（public → protected/private、protected → private）。上位型を保持する呼び出し元を壊す。 | `balanced`でwarning、`strict`でerror、`lenient`で抑制 |
| `def.override-return-widened` | オーバーライドの宣言された戻り値が、継承した戻り値を広げる（共変性）。両側が著作されたRBSシグネチャを持つ場合の、証明可能な違反でのみ発火する。 | `balanced`でwarning、`strict`でerror、`lenient`で抑制 |
| `def.override-param-narrowed` | オーバーライドが、継承したパラメータ型を狭める（反変性）。一致する位置パラメータどうしを比較する。両側に著作された単一オーバーロードのRBSシグネチャが必要。 | `balanced`でwarning、`strict`でerror、`lenient`で抑制 |

3つの`def.override-*`ルールは、プロジェクト定義のクラス/モジュール階層（上位クラスチェーン + include/prependされたモジュール、クロスファイルで解決）をまたいで適用されたリスコフの置換原則のシグネチャ規則です。これらは[付録: リスコフの置換](appendix-liskov/)の概念的な主題です。

### `assert.*`: ランタイムアサーションルール

| ルール | 発火するとき | デフォルト深刻度 |
| --- | --- | --- |
| `assert.type-mismatch` | `assert_type("expected", value)`呼び出しの実際の推論された型が期待文字列と一致しない。 | error |

### `dump.*`: デバッグヘルパー

| ルール | 発火するとき | デフォルト深刻度 |
| --- | --- | --- |
| `dump.type` | `dump_type(value)`が呼ばれた。推論された型を名前付きのinfo診断として出力する。 | info |

`dump_type`はデバッグ時のイントロスペクションプローブです: 疑わしいコードに散りばめて、`rigor check`を実行し、診断ストリームから推論された型を読みます。

## 深刻度プロファイル

Rigorは出荷された深刻度を再スタンプする3つの名前付き深刻度プロファイルを提供します:

| プロファイル | 動作 |
| --- | --- |
| `lenient` | ほとんどのルール → `warning`;不確かなルールは`info`に下がる。レガシーコードのCI向け。 |
| `balanced`（デフォルト） | ほとんどのルール → `error`; `dump.type` → `info`。出荷された動作。 |
| `strict` | `balanced`での`:warning`ルールも含め、すべて → `error`。レガシーノイズのない新しいプロジェクトに適しています。 |

`.rigor.yml`で設定:

```yaml
severity_profile: strict
```

## ルールごとのオーバーライド

単一ルールの深刻度をオーバーライド:

```yaml
severity_overrides:
  call.argument-type-mismatch: warning
  def.return-type-mismatch: off
```

`off`は診断を結果から完全に除去します。プロファイル全体の設定をほとんどのルールに使いつつ、1つだけ沈黙させたいときに有用です。

ファミリーワイルドカードもオーバーライドで使えます:

```yaml
severity_overrides:
  call: warning   # すべてのcall.*ルールを降格
  dump: off       # すべてのdump.*ルールを除去
```

ルールごとのエントリーはファミリーワイルドカードエントリーより優先されます:

```yaml
severity_overrides:
  call: warning                    # すべてのcall.* → warning
  call.undefined-method: error     # ただしundefined-methodは依然としてerror
```

YAMLは裸の`off`を予約済みにしています。削除された深刻度が適用されないように見える場合は、クォートしてください: `"off"`。`on`も同様です。

## インソース抑制

```ruby
"hello".no_such_method  # rigor:disable call.undefined-method
```

コメントは診断と同じ行になければなりません。修飾ルール、ファミリーワイルドカード、または`all`を使います:

```ruby
"hello".no_such_method   # rigor:disable call
"hello".no_such_method   # rigor:disable all
```

複数行のブロックの場合は、各行で抑制します。Rigorはまだ`disable-block`構文を出荷していません。

### ファイルスコープの抑制

ファイル内のルールをすべての箇所でサイレンスする必要がある場合（典型的には生成されたファイル、フィクスチャ、既知の偽陽性を引き起こすベンダーのスニペット）、ファイルのどこかに1つの`# rigor:disable-file`コメントを置きます:

```ruby
# rigor:disable-file call.undefined-method

# このファイル全体は生成済みです; 解析器のコールサーフェスは
# これらのスタブのランタイムレイヤーと不一致です。
```

慣習的にコメントは先頭近くに置きますが、Rigorはファイル内のすべてのコメントをスキャンするため、どこに置いても機能します。同じトークン形式が適用されます: 修飾ルール、ファミリーワイルドカード、または`all`。行スコープの`# rigor:disable`形式は引き続き機能します。両者は組み合わせて使え、`.rigor.yml`のプロジェクト全体の`disable: [...]`も引き続き適用されます。

## プロジェクト全体の抑制

```yaml
# .rigor.yml
disable:
  - call.possible-nil-receiver
```

プロジェクト全体でルールを除去します。`severity_overrides: { call.possible-nil-receiver: off }`よりも強力なハンマーです。どちらも機能します;選択はスタイルの問題です。

## CIのためのベースライン差分

既存のコードベースにRigorを採用する場合、今日すぐには修正しない正当だが既存の診断の長いテールを引き継ぐことがよくあります。実用的な方法は**現在の状態をベースライン（baseline）としてスナップショットし**、CIがPRによって*新たに*導入された診断のみで失敗するようにすることです:

```sh
# 一度: 現在の診断サーフェスをキャプチャ。
rigor check --format=json > rigor.baseline.json
git add rigor.baseline.json
git commit

# PRごと: コミットされたベースラインと比較。
rigor diff rigor.baseline.json
```

`rigor diff`はベースラインになかった各診断の`+ NEW`行と、解消された各診断の`- FIXED`行を出力します。新しい診断が現れた場合の終了コードは`1`、そうでない場合は`0`です。したがって新しい違反を追加するとCIは失敗しますが、ベースラインに記録されたレガシー診断は問題ありません。

ベースラインの行を修正した場合は、同じ`rigor check --format=json > rigor.baseline.json`で再生成して、プロジェクトが単調に厳しくなるようにします。`rigor diff`自身の`--format=json`形式もエディタ / ダッシュボード統合のために利用可能です。

`rigor diff`は軽量でアドホックな形式です。CIスクリプトの中で手作業でdiffするJSONファイルです。ほとんどのプロジェクトは代わりに**管理されたベースライン**を採用します: `rigor baseline generate`が`.rigor-baseline.yml`を書き出し、`baseline:`設定キーでそれを指定すれば、以降は`rigor check`自身が記録済みの診断ではクリーンに終了し、新しいものだけを表面化します。別途のdiffステップは不要です。これは[`rigor-project-init`スキル](../../manual/14-rails-quickstart/)がセットアップしてくれる道筋です;完全なワークフローは[ベースライン](../../manual/06-baseline/)を（設計は[ADR-22](../../adr/22-baseline-and-project-onboarding/)を）参照してください。

## 期待していたのに診断が発火しない理由

最もよくある理由:

1. **レシーバーが`Dynamic[top]`です**。Rigorは漸進的（gradual）レシーバーに対して沈黙します。`rigor type-of <file>:<line>:<col>`を実行してエンジンが何を見ているか確認します。
2. **メソッドが階層のどこかに存在します**。 祖先クラス/モジュールの一致するdefが1つでもあれば`call.undefined-method`は沈黙します。
3. **呼び出しがメソッド本体内の暗黙的selfです**。Rigorは暗黙的selfの呼び出しをフラグしません。メタプログラミングの多いコードではノイズが多すぎます。
4. **リテラルは解析器が証明できない方法でランタイムに空/nilの可能性があります**。`s = ARGV.first; s.upcase`は黙って通ります。なぜなら`s`はランタイムで正当に非空文字列である可能性があり、Rigorは証明できないことをフラグしないからです。明示的なガードまたは`param:`の締め付けを追加します。
5. **対象のルールが設定で無効にされています**。`.rigor.yml`と問題のファイルの`# rigor:disable`コメントを確認します。
6. **深刻度プロファイルがそれを降格しました**。`lenient`では、`:warning`として発火するルールがさらに`:info`に降格されてCIスクリプトでフィルタアウトされた可能性があります。

疑わしいときは`--explain`で実行します:

```sh
rigor check --explain lib
```

これにより、エンジンが取ったすべてのfail-softフォールバックごとに`:info`診断が追加されます（それ以上見えなかったため`Dynamic[top]`に拡幅した各箇所）。現実的なコードでは出力がノイズになりますが、「ここで診断が来ると思っていた」デバッグには非常に価値があります。

## 来るべきでないと思う診断が発火している理由

ほぼ常に以下のいずれかです:

1. **Rigorが正しいです**。 典型的なケース: メソッドのRBSシグが`String?`と言っているが、プロジェクトのランタイム不変条件が非nilを保証している。シグを修正するか（推奨）、`RBS::Extended`の`return:`ディレクティブを追加するか、その行に`# rigor:disable`を追加します。
2. **RBSシグが欠落または間違っています**。 クラスが`.rbs`のないgemに存在するか、プロジェクト自身の`sig/`がソースと同期していません。シグを更新または追加します。
3. **定数が間違って参照されています**。 定数解決はRBSコアまたはインソースクラス探索にフォールバックする可能性があります;両方が見逃す場合、呼び出しは`Dynamic[top]`を通り診断は出ませんが、間違ったクラスに対する兄弟呼び出しが発火するかもしれません。
4. **診断が正真正銘の偽陽性です**。 まれです（Rigorの設計優先事項は偽陽性なし）。しかし可能性はあります。抽出できる最小の再現コードで問題を報告してください。

## 役立つワークフロー

Rigorを採用したばかりのプロジェクトでの実用的なループ:

1. `rigor check lib`を一度実行してベースラインを確認します。
2. すべての診断をざっと確認します。以下のいずれかとして分類します:
   a. **実際のバグ**。 コードを修正します。
   b. **欠落/間違ったRBS**。 シグを更新するか新しいものを追加します。
   c. **正当なノイズ**。 その行に`# rigor:disable <rule>`を追加するか、`.rigor.yml`に`disable:`を追加します。
3. 再実行します。診断ストリームがきれいになるまで繰り返します。
4. `rigor check lib`を`balanced`プロファイル（またはより厳密）の下でCIに追加します。
5. プロジェクトの不変条件がより証明されるにつれて、`# rigor:disable`行を`RBS::Extended`ディレクティブに格上げして、解析器に実際の契約を教えます。

クリーンな`rigor check`の実行が目標です;グリーンのCIバッジは「発火するすべての診断は受け入れるものだ」を意味します。

## 次に読むもの

[第9章: プラグイン](09-plugins/)は`examples/`ディレクトリへの1ページのポインタです。プラグインはプロジェクト固有のDSL（単位、ルートヘルパー、非推奨など）のためにRigorを拡張します。ほとんどのプロジェクトはプラグインを書くことはないでしょう;この章はそのオプションがあることを知っていただくために存在します。[第10章: Sorbetとの共存](10-sorbet/)はSorbetコードベースから来たプロジェクト向けです: [`rigor-sorbet`](../../manual/plugins/rigor-sorbet/)アダプタが`sig { ... }`ブロック、RBIファイル、`T.let` / `T.cast` / `T.must` / `T.unsafe`アサーションを型ソースとして読み取ります。
