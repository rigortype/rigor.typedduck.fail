---
title: "ADR-34 — トップレベルのunresolved implicit-self呼び出しはデフォルトで警告する"
description: "rigortype/rigor docs/adr/34-toplevel-unresolved-self-call-default.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/34-toplevel-unresolved-self-call-default.md"
sourcePath: "docs/adr/34-toplevel-unresolved-self-call-default.md"
sourceSha: "c2903adc9e9f8425a9b9795fb1c3f82d1e40e3bfed82d78fe0c93ad7d1eaeae2"
sourceCommit: "a3ab53dd2b8aa0a84fd7ddbd64339f316d8d12ec"
sourceDate: "2026-05-29T00:21:31+09:00"
translationStatus: "translated"
sidebar:
  order: 4034
---

ステータス: **Accepted, 2026-05-29; v0.1.13で実装**。

可視のメソッド貢献者に対して解決に失敗するトップレベルのimplicit-self呼び出しサイトで、現在の無音な`Dynamic[top]`の挙動を反転させ、代わりに専用の`call.unresolved-toplevel`診断をemitするという決定を記録する。エスケープハッチ——monkey-patchingやメタプログラミングを通じてトップレベルメソッドを導入するプロジェクト向け——は[ADR-17](../17-monkey-patch-pre-evaluation/)の`pre_eval:`設定軸であり、同じリリースでランディングした。`call.unresolved-toplevel`ルールと`Scope#toplevel?`述語が出荷され、重大度は`severity_profile:`を通じてマップされ、クロスファイルのトップレベル`def`インデックスも整っている;ADR-29のPlaygroundデフォルト重大度の配線も出荷された——そのサンドボックス設定（`plugins/rigor-playground/.rigor.yml`）が`severity_profile: strict`を設定するので、貼り付けスニペットでルールが発火する。

このADRは意図的に狭い範囲に限定している: **トップレベル**スライス（slice）のみデフォルトを反転する。`class` / `module`ボディ内のimplicit-self呼び出しは[ADR-24 WD3](../24-self-method-call-resolution/)の下で寛容なままとなる;それらを診断に格上げすることは[ADR-24 WD4](../24-self-method-call-resolution/)の別途ゲートされた決定であり、**このADRによって開かれるものではない**。

## コンテキスト

`.rb`ファイルの先頭に書かれた`foo 1`（存在しないメソッドを参照）は、今日のRigorで診断を生成しない。実証的に確認済み:

```
$ echo 'foo 1' > main.rb
$ rigor check main.rb
No diagnostics

$ rigor type-of main.rb:1:1
type:    Dynamic[top]
```

この挙動はADR-24 WD3——「unresolvedなself呼び出しは`Dynamic[top]`のまま」——をすべてのコンテキストに均一に適用した直接の結果である。WD3がその判断を下した理由は、Railsモデルのクラスボディに対する偽陽性の規律だった: すべての`attr_accessor` / `has_many` / `scope` / `validates`は、静的ウォーカーが解決できない`self`コンテキスト呼び出しであり、unresolvedなケースをエラーにすると、そのドメインがノイズで溢れる。

しかし同じデフォルトは他の2つのコンテキストで積極的に誤っている:

1. **スタンドアロンスクリプト**。ユーザーが`bin/process`、`lib/scripts/import.rb`、または一時的な分析を駆動する一回限りの`.rb`ファイルを書く。メソッド名のタイポ（`process`の代わりに`procss`）は型チェッカーが検出すべきバグそのものだ——DSLも、メタプログラミングも、クラスボディコンテキストもない。タイポを無音にすることは、スクリプトの単純さに比例したUX上の失敗だ。

2. **[ADR-29](../29-browser-playground/)プレイグラウンド**。貼り付けたスニペットにはプロジェクト設定もGemfileも`pre_eval:`もない。プレイグラウンドの存在意義はまさに「Rigorが何を見ているかを表面化する」ことだ。ユーザーが*どの診断が発火するかを学ぼうとしているまさにその瞬間に*、`foo 1`を`Dynamic[top]`と静かに型付けすることは、プレイグラウンドの価値提案と正反対だ。

非対称性が問題だ: クラスボディコンテキストにはメタプログラミングが多いRailsパターンから高いFPリスクがある;トップレベルコンテキストにはない。両者を一つのデフォルトにまとめると情報を失う。

## 決定

**トップレベルスコープ**（囲む`def`なし、囲む`class` / `module`ボディなし）でのimplicit-self呼び出しにおいて、呼び出し名が以下のいずれにも解決しない場合:

1. 同じファイルまたは解析された`paths:`のいずれかのファイル内のトップレベル`def`、
2. `(Object, name, instance)`の下の[ADR-17](../17-monkey-patch-pre-evaluation/)の`Inference::ProjectPatchedMethods`レジストリ内のエントリー、
3. ロードされたRBS環境から引いた標準的な`Kernel` / `Object`プライベートメソッド表面（`puts`、`p`、`require`、`loop`、`raise`、…）、

エンジンは新しい`call.unresolved-toplevel`診断をemitする。ヒットした場合、解決されたメソッドの戻り値型とパラメータ契約（contract）はADR-24スライス1〜3と同様に伝播する。

新しいルールのデフォルト重大度は`severity_profile:`に連動する:

| プロファイル | `call.unresolved-toplevel`デフォルト |
| --- | --- |
| `strict` | `:error` |
| `balanced` | `:warning` |
| `lenient` | 抑制 |

プロジェクトは既存の`severity_overrides:`設定キーを通じてルールごとのマッピングをオーバーライドでき、個別の呼び出しサイトを`# rigor:disable call.unresolved-toplevel`で無音にできる。

クラスボディ / `def`ボディのケース（ADR-24 WD4）は閉じたままとする。このADRは`def`内部やクラスボディには一般化しない——それらはWD4がすでに検討して先送りにしたRails-DSLのFPコストを抱えている。

## 作業上の決定

### WD1 — トップレベルのデフォルト: 無音ではなく警告

無音な`Dynamic[top]`デフォルトはクラスボディコンテキストには正しい（ADR-24 WD3によるRails-DSL寛容性）が、トップレベルコンテキストには誤っている（スクリプト / プレイグラウンドUX）。

**Why:** FPプロファイルが異なる。クラスボディのunresolved-self呼び出しは静的ウォーカーが追えないメタプログラミングが支配的;トップレベルのunresolved-self呼び出しはタイポ / 忘れた`require`が支配的——まさに型チェッカーが目的とするもの。

**How to apply:**診断のemitポイントはADR-24スライス1〜2がすでに使っている同じimplicit-selfディスパッチャーパスと同じ;変わるのは、囲むコンテキストがトップレベルのときにミスで何が起きるかだ。WD4がその境界を正確に記録している。

### WD2 — エスケープハッチはADR-17の`pre_eval:`

monkey-patchingを通じてトップレベルメソッドを正当に導入するプロジェクト（ブート時にロードされる`String`-on-`Object`シェイプ（shape）のパッチ、`lib/core_ext/*.rb`ヘルパー、フレームワークトップレベルヘルパー）は、`.rigor.yml`の`pre_eval:`配列（ADR-17に従う）にそれらのファイルを宣言する。事前評価パスが`ProjectPatchedMethods`を投入し、WD1ディスパッチャーがレジストリを参照し、解決されたエントリーに対して診断が発火しない。

**Why:**ユーザーはまさにこの形を提案した——「基本的には警告するようにして、monkeypatchやメタプログラミングの供給源は設定で明示的に先行評価させる」——そしてそれは変更なしにADR-17の既存の契約に一致する。メカニズムはすでに存在する;このADRはそれを「機会的な精度向上」から「WD1デフォルトフリップの正規オプトアウト」へと格上げするだけだ。

**How to apply:**このADRによって新しい設定キーは導入しない。`pre_eval:`が唯一のノブ。ADR-17のフェイルソフト契約（WD3）は、不正形式の`pre_eval:`ファイルが解析の継続を妨げないことを意味する——WD1診断はそのファイルが登録したはずのメソッドに対して発火するだけ。

### WD3 — `call.undefined-method`に折り込まず、新ルール`call.unresolved-toplevel`

別途保持する3つの理由:

1. **外科的な無効化**。`# rigor:disable call.unresolved-toplevel`はこの診断だけを無音にし、明示的レシーバー呼び出しに対してはるかに重要な`call.undefined-method`には影響しない。
2. **独立した重大度プロファイルマッピング**。「決定」の表は`call.unresolved-toplevel`をプロファイル変調ルールとして扱っている;`call.undefined-method`に折り込むと、両方の呼び出し形状で一つの重大度を強制することになる。
3. **診断メッセージの特異性**。`call.unresolved-toplevel`はADR-17を指すヒントを運べる（「このメソッドを定義するファイルを`pre_eval:`に追加することを検討してください」）;汎用の`call.undefined-method`メッセージは汎用のまま。

**Why:**プロジェクトの既存ルールファミリー分類法（[`docs/type-specification/diagnostic-policy.md`](../../type-specification/diagnostic-policy/)）に一致し、ルールのアイデンティティは呼び出しサイト形状を追跡し、重大度を追跡しない。

**How to apply:**診断ポリシーカタログにルールを追加する;囲むスコープテストがトップレベルと報告するときのみ発火する`Rigor::Analysis::CheckRules`側チェックを登録する。

### WD4 — 境界: トップレベルのimplicit-self、それだけ

3つの正確な境界条件、すべて連言:

- 呼び出しに明示的なレシーバーがない（`foo 1`、`obj.foo 1`ではない）。
- 呼び出しが`def`の中にない（トップレベルスクリプトコンテキスト）。
- 呼び出しが`class` / `module`ボディの中にない（つまり、囲む静的スコープがObjectのシングルトン——Rubyが「main」と呼ぶもの）。

いずれかの条件を失敗する呼び出しは既存のディスパッチャーパスにフォールバックする:

- 明示的レシーバー呼び出し → 標準の`call.undefined-method`パイプライン（既存、挙動変更なし）。
- `def`内のimplicit-self → ADR-24スライス1〜3の解決;ミスでADR-24 WD3に従い`Dynamic[top]`のまま（挙動変更なし）。
- `class` / `module`ボディ内のimplicit-self → ADR-24 WD4の領域;閉じたまま（挙動変更なし）。

**Why:**このADRの要点はトップレベルとクラスボディのFPプロファイルの非対称性だ。さらに一般化するとADR-24 WD4を再開してRailsモデルボディでのFPリスクを継承することになる。スライスを狭く保つ。

**How to apply:**囲むスコープテストは`Inference::Scope`に属する;implicit-selfディスパッチャーブランチは、emitとフォールバックのどちらにするかを決定する前に`scope.toplevel?`（新しいプレディケート）を確認する。

### WD5 — ADR-17の実装は硬い前提条件

WD1デフォルトフリップは、ADR-17のスライス1〜2がランドする前にリリースしてはならない。レジストリなしでは、トップレベルmonkey-patchを持つプロジェクトにはオプトアウトがなく、新しいデフォルトは好ましくないリグレッションになる。

**Why:**偽陽性の規律はプロジェクトの最優先価値（`feedback_false_positive_discipline`の下でメモリに記録済み）。エスケープハッチなしに診断を出荷すると、動作するコードが怯えてしまい、診断が価値を加えるより速く信頼を損なう。

**How to apply:**実装順序は固定——

1. ADR-17スライス1（設定の配管）。
2. ADR-17スライス2（事前評価ウォーカー + レジストリ + ディスパッチャーティア）。
3. ADR-34スライス1（このADRの診断emit、今存在するレジストリを参照）。

ADR-17スライス3（キャッシュディスクリプタ）は独立しており、ADR-34スライス1の前後どちらでもランドできる。

### WD6 — ハードコードされた重大度ではなく、重大度プロファイルマッピング

「決定」の表はルールの重大度を`severity_profile:`を通じてマッピングし、単一の重大度をハードコードしない。

**Why:**このADRを動機づける3つのコンテキストはリスク許容度が異なる。プレイグラウンドのデモは`:error`（大声）が欲しい;`lenient`で新規オンボードされたRailsアプリはチームが移行する間はルールを邪魔にならないようにしたい;`balanced`の成熟したスクリプト多用`lib/`は`:warning`でノイズが監査可能な状態に保ちたい。

**How to apply:**ルールを[`docs/adr/8-steep-inspired-improvements.md`](../08-steep-inspired-improvements/)の重大度プロファイル表に接続する;新しいメカニズムは不要。

### WD7 — プレイグラウンド（ADR-29）はこのルールでstrictをデフォルトにする

ADR-29ブラウザプレイグラウンドのリクエストごとのサンドボックスは`severity_profile: strict`（またはルールごとのオーバーライドで新しいルールを`:error`に）を設定し、貼り付けられた`foo 1`スニペットが期待される診断を生成するようにすべきだ。

**Why:**プレイグラウンドの価値提案は「Rigorが何を見ているかを見せる」こと。`balanced`デフォルトを継承してこのルールを`:warning`にマッピングすると、ツールとのユーザーの最初のインタラクションになる可能性が最も高い例をまさに隠すことになる。

**How to apply:** ADR-29スライス1はすでに同様の理由でADR-32 WD10に従い`require_magic_comment: false`で`rigor-rbs-inline`をロードするよう修正されていた。このADRが並行の修正を加える: リクエストごとのサンドボックス設定で重大度プロファイル（またはルールオーバーライド）を設定し、新しいルールが発火するようにする。

### WD8 — `paths:`内のファイルが解決スコープ、ファイルシステム全体ではない

WD1のステップ1ルックアップ（「同じファイルまたは解析された`paths:`のいずれかのファイル内のトップレベル`def`」）は明示的に設定済みの`paths:`セットに基づき、任意の`require`されたファイルに基づかない。

**Why:**ユーザーは`paths:`にリストすることでファイルをオプトインできる（通常のインターフェース）。`paths:`の外のファイルは定義上解析の対象外であり、それらに対して解決すると非決定性が導入される（結果は宣言された設定ではなくランタイムのロード順序に依存する）。

**How to apply:**クロスファイルのトップレベル`def`インデックスは既存のプロジェクトクラス発見事前パスと並んで存在し;アナライザー起動時に一度投入されてディスパッチャーに参照される。

## 実装スライス

推奨順序;各スライスは独立してリリース可能。スライス1〜2はWD5前提条件の背後にあるMVP機能を提供;スライス3はプレイグラウンド統合。

1. **ルール + emit**。診断ポリシーカタログに`call.unresolved-toplevel`を登録する。`Inference::Scope#toplevel?`（新しいプレディケート）を追加する。implicit-selfディスパッチャーのミスパスを、`scope.toplevel?`が成立するときのミス時に`ProjectPatchedMethods`を参照してemitするよう接続する。`severity_profile:`を通じて重大度をマッピングする。
2. **クロスファイルのトップレベル`def`インデックス**。既存のクラス発見事前パスを、すべての`paths:`ファイル全体にわたるトップレベル`def`宣言のインデックスも作成するよう拡張する;`ProjectPatchedMethods`の前の最初のプローブとして参照する。
3. **プレイグラウンドのデフォルト**。WD7に従い、プレイグラウンドサンドボックスの重大度プロファイル（またはルールごとのオーバーライド）を設定して、貼り付けたスニペットで新しいルールが発火するようにする。ADR-29自体の実装にゲートされている。

## 検討された代替案

- **すべてに対してADR-24スライス4を有効にするだけ**。WD4に従い却下: スライス4のRailsモデルクラスボディでのFPリスクはまさにWD4が検討して先送りにしたもの。トップレベルは先にリリースできる;クラスボディのケースはゲートされたままとなる。
- **`call.undefined-method`に折り込む**。WD3に従い却下: 外科的にすべきものを統合する。
- **無音をデフォルトにしてオプトインを要求する**。却下: ユーザーのフレーミング（「基本的には警告するように」）は明確であり、プレイグラウンドのユースケース（WD7）は逆のデフォルトを要求する。
- **新しいルールなし;ただしトップレベルのミスに対して`call.undefined-method`として`:warning`をemitする**。WD3のポイント2に従い却下——重大度プロファイルマッピングには重大度を独立して変化させるためにルールのアイデンティティが必要。
- **`pre_eval:`より発見しやすいメカニズムを使う（例: 専用の`toplevel_methods:`配列）**。却下: ADR-17はすでに存在し、より広いmonkey-patchケースをカバーする。専用配列は機能を追加せずに発見パイプラインを複製する。

## 未解決の問題

- **Rakeタスクファイル（`Rakefile`、`lib/tasks/*.rake`）**。これらはトップレベルだがDSLだ: `task :foo => :bar do ... end`はunresolved-toplevel呼び出し（`task`、`desc`、`namespace`、…）として読まれる（プロジェクトがRakeスタブを事前評価しない限り）。2つのパス: (a) `paths:`にRakeタスクを持つプロジェクトに推奨の`pre_eval:`スニペットをドキュメント化する、（b）`ProjectPatchedMethods`にADR-9の`flow_contribution_for`を通じてトップレベルRake DSLを登録する`rigor-rake`プラグインを提供する。スライス1のドッグフードに先送り。
- **`bin/*`のシバンスクリプト**。通常は短く、`require_relative`が多く、`paths:`にリストされるより実行可能ファイルであることが多い。このルールでそれらをトップレベルとして扱うかどうかは、`bin/`ヒューリスティックまたはファイルごとのスコーピングが必要かもしれない。スライス1のドッグフードに先送り。
- **診断メッセージは`pre_eval:`をヒントとして示すべきか？** おそらく`balanced` / `strict`ではyes;議論の余地はあるが`:info`ではno。ヒントを書くのに費用はかからないが、ADR-17のインターフェースが進化すれば腐る可能性がある。スライス1の実装に先送り。
- **ブロックボディと`class << self`のインタラクション**。トップレベルの`class << self; foo; end`はWD4の意味ではトップレベルスコープではない（シングルトンクラスボディはクラスボディ）が、トップレベルに現れる`class << self`はユーザーには「まだトップレベル」と直感的に読めるかもしれない。v1はWD4の厳密な読みに従う;報告が出てきたら再検討する。

## 背景研究メモ

今日の挙動がトップレベルのunresolved呼び出しで無音であること——`rigor type-of main.rb:1:1`が`Dynamic[top]`を返し、`rigor check`が「No diagnostics」を返す——が、このADRを促した2026-05-29の会話中に実証的に確認された。ADR-24のクラスボディ寛容デフォルトはそのターゲットドメインには正しい判断だ;このADRは元のWD3のフレーミングが暗黙のままにしていたコンテキストごとの分割を記録する。

## 改訂履歴

- 2026-05-29 — 初回提案。トップレベルの無音な挙動に関するユーザーの問いと、プレイグラウンド / スタンドアロンスクリプトのユースケースが逆のデフォルトを望むという認識によって引き起こされた。ADR-17の事前評価メカニズムが自然なエスケープハッチだ——このADR自体によって新しい設定インターフェースは導入されない。
