---
title: "エラーの読み方"
description: "rigortype/rigor docs/handbook/08-understanding-errors.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/handbook/08-understanding-errors.md"
sourcePath: "docs/handbook/08-understanding-errors.md"
sourceSha: "7923db510fed4b2ad526c32c5b8a08fb25f023f0ccc1ac3e1bbf463de0d22727"
sourceCommit: "b523ab36f62d89a1c16964a66864c27e3ebb0fe4"
translationStatus: "translated"
sidebar:
  order: 1008
---

この章はRigorが出荷する診断のカタログ、それらが属するファミリー、そして診断が間違っているとき（または深刻度を変えたいとき）に抑制する方法です。

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
- `.rigor.yml`の`severity_overrides:`
- `.rigor.yml`の`disabled_rules:`

ワイルドカードも使えます — `# rigor:disable call`はその行のすべての`call.*`ルールを抑制します。

## ルールカタログ

5つのファミリー、それぞれに1つ以上のルール:

### `call.*` — 呼び出し元ルール

メソッド呼び出しの形状が間違っているときに発火します。

| ルール | 発火するとき | デフォルト深刻度 |
| --- | --- | --- |
| `call.undefined-method` | レシーバークラスが静的に既知で、メソッドがそれに定義されていない（RBSまたはインソース）。 | error |
| `call.wrong-arity` | 位置引数の数がどのオーバーロードのアリティも満たさない。 | error |
| `call.argument-type-mismatch` | 引数の型がパラメーターコントラクト（RBSまたは`RBS::Extended` `param:`）を証明可能に満たさない。 | error |
| `call.possible-nil-receiver` | レシーバー型が`T | nil`で、メソッドが`NilClass`で定義されていない。 | warning |

`call.*`ルールは実際のコードで最も量の多い診断です。また最も洗練されています — それぞれがRigorが根底にある事実を証明できる場合にのみ発火します。

### `flow.*` — フロー解析ルール

制御フロー自体が健全でないときに発火します。

| ルール | 発火するとき | デフォルト深刻度 |
| --- | --- | --- |
| `flow.always-raises` | 式のすべての到達可能な評価が例外を投げる（例: `n: Integer`のとき`n / 0`）。 | error |

さらなるフロールールがv0.1.xに予定されています — `flow.unreachable-branch`、`flow.dead-assignment`、`flow.always-truthy-condition` — しかしまだ出荷されていません。

### `def.*` — メソッド定義ルール

メソッドの本体が宣言されたコントラクトに違反するときに発火します。

| ルール | 発火するとき | デフォルト深刻度 |
| --- | --- | --- |
| `def.return-type-mismatch` | 本体の最後の式の推論された型がRBS宣言の戻り値型を満たせない。 | `balanced`プロファイルでwarning、`strict`でerror |

### `assert.*` — ランタイムアサーションルール

| ルール | 発火するとき | デフォルト深刻度 |
| --- | --- | --- |
| `assert.type-mismatch` | `assert_type(value, "expected")`呼び出しの実際の推論された型が期待文字列と一致しない。 | error |

### `dump.*` — デバッグヘルパー

| ルール | 発火するとき | デフォルト深刻度 |
| --- | --- | --- |
| `dump.type` | `dump_type(value)`が呼ばれた — 推論された型を名前付きのinfo診断として出力する。 | info |

`dump_type`はデバッグ時のイントロスペクションプローブです: 疑わしいコードに散りばめて、`rigor check`を実行し、診断ストリームから推論された型を読みます。

## 深刻度プロファイル

Rigorは出荷された深刻度を再スタンプする3つの名前付き深刻度プロファイルを提供します:

| プロファイル | 動作 |
| --- | --- |
| `lenient` | ほとんどのルール → `warning`; 不確かなルールは`info`に下がる。レガシーコードのCI向け。 |
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

`off`は診断を結果から完全に除去します — プロファイル全体の設定をほとんどのルールに使いつつ、1つだけ沈黙させたいときに有用です。

ファミリーワイルドカードもオーバーライドで使えます:

```yaml
severity_overrides:
  call: warning   # すべてのcall.*ルールを降格
  dump: off       # すべてのdump.*ルールを除去
```

ルールごとのエントリはファミリーワイルドカードエントリより優先されます:

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

複数行のブロックの場合は、各行で抑制します — Rigorはまだ`disable-block`構文を出荷していません。

## プロジェクト全体の抑制

```yaml
# .rigor.yml
disabled_rules:
  - call.possible-nil-receiver
```

プロジェクト全体でルールを除去します。`severity_overrides: { call.possible-nil-receiver: off }`よりも強力なハンマーです — どちらも機能します; 選択はスタイルの問題です。

## 期待していたのに診断が発火しない理由

最もよくある理由:

1. **レシーバーが`Dynamic[Top]`です**。 Rigorはグラデュアルレシーバーに対して沈黙します。`rigor type-of <file>:<line>:<col>`を実行してエンジンが何を見ているか確認します。
2. **メソッドが階層のどこかに存在します**。 祖先クラス/モジュールの一致するdefが1つでもあれば`call.undefined-method`は沈黙します。
3. **呼び出しがメソッド本体内の暗黙的selfです**。 Rigorは暗黙的selfの呼び出しをフラグしません — メタプログラミングの多いコードではノイズが多すぎます。
4. **リテラルは解析器が証明できない方法でランタイムに空/nilの可能性があります**。 `s = ARGV.first; s.upcase`は黙って通ります。なぜなら`s`はランタイムで正当に非空文字列である可能性があり、Rigorは証明できないことをフラグしないからです。明示的なガードまたは`param:`の締め付けを追加します。
5. **対象のルールが設定で無効にされています**。 `.rigor.yml`と問題のファイルの`# rigor:disable`コメントを確認します。
6. **深刻度プロファイルがそれを降格しました**。 `lenient`では、`:warning`として発火するルールがさらに`:info`に降格されてCIスクリプトでフィルタアウトされた可能性があります。

疑わしいときは`--explain`で実行します:

```sh
bundle exec rigor check --explain lib
```

これにより、エンジンが取ったすべてのfail-softフォールバックごとに`:info`診断が追加されます — それ以上見えなかったため`Dynamic[Top]`に拡幅した各箇所。現実的なコードでは出力がノイズになりますが、「ここで診断が来ると思っていた」デバッグには非常に価値があります。

## 来るべきでないと思う診断が発火している理由

ほぼ常に以下のいずれかです:

1. **Rigorが正しいです**。 典型的なケース: メソッドのRBSシグが`String?`と言っているが、プロジェクトのランタイム不変条件が非nilを保証している。シグを修正するか（推奨）、`RBS::Extended`の`return:`ディレクティブを追加するか、その行に`# rigor:disable`を追加します。
2. **RBSシグが欠落または間違っています**。 クラスが`.rbs`のないgemに存在するか、プロジェクト自身の`sig/`がソースと同期していません。シグを更新または追加します。
3. **定数が間違って参照されています**。 定数解決はRBSコアまたはインソースクラス探索にフォールバックする可能性があります; 両方が見逃す場合、呼び出しは`Dynamic[Top]`を通り診断は出ませんが、間違ったクラスに対する兄弟呼び出しが発火するかもしれません。
4. **診断が正真正銘の偽陽性です**。 まれです — Rigorの設計優先事項は偽陽性なし — しかし可能性はあります。抽出できる最小の再現コードで問題を報告してください。

## 役立つワークフロー

Rigorを採用したばかりのプロジェクトでの実用的なループ:

1. `rigor check lib`を一度実行してベースラインを確認します。
2. すべての診断をざっと確認します。以下のいずれかとして分類します:
   a. **実際のバグ**。 コードを修正します。
   b. **欠落/間違ったRBS**。 シグを更新するか新しいものを追加します。
   c. **正当なノイズ**。 その行に`# rigor:disable <rule>`を追加するか、`.rigor.yml`に`disabled_rules:`を追加します。
3. 再実行します。診断ストリームがきれいになるまで繰り返します。
4. `balanced`プロファイル（またはより厳密）の下で`bundle exec rigor check lib`をCIに追加します。
5. プロジェクトの不変条件がより証明されるにつれて、`# rigor:disable`行を`RBS::Extended`ディレクティブに格上げして、解析器に実際のコントラクトを教えます。

クリーンな`rigor check`の実行が目標です; グリーンのCIバッジは「発火するすべての診断は受け入れるものだ」を意味します。

## 次に読むもの

最終章 — プラグイン — は`examples/`ディレクトリへの1ページのポインタです。プラグインはプロジェクト固有のDSL（単位、ルートヘルパー、非推奨など）のためにRigorを拡張します。ほとんどのプロジェクトはプラグインを書くことはないでしょう; この章はそのオプションがあることを知っていただくために存在します。
