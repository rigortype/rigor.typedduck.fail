---
title: "ADR-23 — 診断トリアージコマンド（`rigor triage`）"
description: "rigortype/rigor docs/adr/23-diagnostic-triage-command.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/23-diagnostic-triage-command.md"
sourcePath: "docs/adr/23-diagnostic-triage-command.md"
sourceSha: "750a83dd3be2da516686ae429f6ee9a34f88944755c39d0f60b8784b34794bd3"
sourceCommit: "a5d648b126d5ed7b1e04a16a87927bca7883e069"
sourceDate: "2026-05-21T05:31:38+09:00"
sourceLanguage: "en"
translationStatus: "translated"
sidebar:
  order: 4023
---

ステータス: **Accepted、2026-05-20;スライス（slice）1+2+3+4はv0.1.9で実装済み**。

`lib/rigor/triage/`がカタログを担い、`rigor triage`は本番サブコマンド。プラグイン提供認識器（WD2拡張ポイント）は見送り。`check`派生のサブコマンド設計を記録する。プロジェクトの診断ストリームを要約し — ルールIDの分布、ファイルごとのホットスポット、ヒューリスティックな「なぜ」ヒントを提示する。[ADR-22](../22-baseline-and-project-onboarding/)の仲間:ADR-22は*今日あるもの*（ベースライン（baseline））を記録し;ADR-23はそれが*何を意味するか*と*次に何をすべきか*を説明する。

## コンテキスト

5プロジェクトサーベイ（[`docs/notes/20260519-oss-library-survey.md`](../../notes/20260519-oss-library-survey/)）および後続のMastodon測定（1303ファイル）により、成熟したコードベースへの最初の`rigor check`は、少数の大きな診断クラスタに支配されることが判明した — その*原因*は構造的であり、無関係なバグが散らばっているのではない:

- Mastodon、デフォルト設定:**488件の診断**。≈73%はActiveSupportの`core_ext`セレクタ（`3.days`、`5.minutes`、`"x".squish`、`Time.current`など）の`call.undefined-method` — 純粋な設定ギャップであり、`rigor-activesupport-core-ext` RBSバンドルを配線することで修正される。そのバンドルを適用すると:**488 → 88（−82%）**。
- 残り88件自体もクラスタ化されていた:≈55件のActiveRecordアソシエーションに対するnil-receiver診断、≈13件の`Array[String]`と誤推論されたARクエリメソッド、RBSカバレッジギャップの末尾部分。

実際的な教訓:**生の診断リストは新規参入者にとって間違った最初のアーティファクト**。488行のダンプは488の問題として読める;*有用な*読み方は「≈360件がひとつのことを言っている — ひとつのRBSバンドルを有効化せよ」。[ADR-22](../22-baseline-and-project-onboarding/)はアドプション側（残余をベースラインとしてスナップショットし、リグレッションのみを表面化）に対処する。診断側 — どのクラスタが設定ギャップで、どれがプロジェクトのmonkey-patchの可能性が高く、どれがRBSカバレッジのホールで、どれが最初に修正すべき本物の局所化されたバグかをユーザーに伝えること — には対処していない。

ADR-22の`rigor-project-init` SKILLフェーズ7（「ルールごとの診断数をカウントし、インタラクティブに修正可能なほど小さいルールを提案する」）と`rigor-baseline-reduce`フェーズ1（「ルールごとにグループ化、カウントでソート」）は、今日この種のトリアージを — しかしアドホックに、生のストリームに対するLLM側のカウントとして — 行っている。それは非決定論的であり、テスト不可能であり、SKILL呼び出しのたびに再導出される。データレイヤーはSKILLが*呼び出す*決定論的でspec対応のコマンドであるべき。

## 決定

**`rigor triage`**を追加する — `check`派生のサブコマンド。`rigor check`と同じ解析を実行し、生のファイルごとの診断ストリームの代わりに3セクションレポートを出力する:

1. **ルールID分布** — 深刻度別に分割した、ルールごとの診断数のプロジェクト全体ヒストグラム。
2. **ホットスポットファイル** — 診断が最も多く（および最も集中して）あるファイル、そのルールごとの内訳付き。
3. **ヒューリスティックヒント** — 診断ストリームに対してパターン認識を行い、大きなクラスタそれぞれに対して*考えられる原因*と*推奨アクション*を名指しするパターン認識器（§「ヒューリスティックカタログ」参照）。

`--format json`は同じコンテンツをADR-22 SKILLと他のツール向けに機械可読形式でemitする。このコマンドは**読み取り専用かつ助言的** — `.rigor.yml`を編集せず、ベースラインも書かない;その出力に対してアクションを取るのはユーザー（またはSKILL）の判断。

## 作業上の決定

### WD1 — フラグではなくサブコマンド

`rigor triage`は`check` / `baseline` / `lsp` / `sig-gen`と並列であり、`rigor check --triage`ではない。

- トリアージレポートと生の診断ストリームは*代替的な*ビューであり、加法的ではない。`check`に`--triage`フラグを追加しても488行ダンプが出力され、レポートはそれを置き換えるために存在する。
- `rigor check`はすでに`--explain`（フォールバック診断）と`--stats`（`RunStats`:ファイル / RBSクラス数）に費やされている。3つ目のオーバーロードされたフラグは混雑したサーフェス（surface）をさらに曇らせる。
- 発見可能性:`rigor --help`に`triage`が`check`と並んで表示されることでオンボーディングパスが広告される。埋もれたフラグではそうならない。
- ADR-22 SKILLは安定した`--format json`契約（contract）を持つ名前付きサブコマンドを呼び出す;それは`check`のサブセクションをパースするよりもクリーン。

`rigor triage`は`rigor check`と同じ位置引数`paths`および同じ`.rigor.yml` / `--config`解決を受け入れる。

### WD2 — v1向けの固定組み込みヒューリスティックカタログ

認識器（§「ヒューリスティックカタログ」）はRigorが管理する固定セットとして同梱される。プラグイン提供の認識器はv1では見送り。

v1カタログは小さく（6つの認識器）、具体的なサーベイデータに基づいている;プラグイン拡張ポイントは組み込みセットがその形を実際のプロジェクトに対して実証する前では投機的。カタログはひとつのモジュールにあるため、認識器の追加はシングルファイルの変更。

### WD3 — 認識器はまず`rule`をキーに、次にメッセージテキストをキーに

認識器の主キーは構造化された`rule`識別子（`call.undefined-method`、`nullable-receiver`など） — リリース間で安定。認識器がさらに*レシーバー型*や*メソッド名*（下記H1/H2/H3/H4）を必要とする場合、v1は診断**メッセージ**（`undefined method 'X' for TYPE`）をパースして抽出する。

このメッセージパースは認識器をメッセージの文言に結合するため**脆弱**であると認識されており、まさに[ADR-22 WD1](../22-baseline-and-project-onboarding/)がベースラインで回避した結合と同じ。緩和策:

- パースは少数のルール（`undefined method 'M' for T`）の*プレフィックス形状*のみをターゲットにしており、v0.1.x系統にわたって安定している — 任意のメッセージボディではない。
- メッセージのパースに失敗した認識器は「この診断をスキップ」に縮退し、クラッシュや誤ったヒントには縮退しない。

堅牢な修正 — `Analysis::Diagnostic`にルールが持つオプショナルな構造化フィールド（`receiver_type`、`method_name`）を追加し、それを持つルールが埋める — は**スライス4**として記録されており、現在**実装済み**:単一の`call.undefined-method` emitサイト（`CheckRules#build_undefined_method_diagnostic`）がそのペアを埋め、カタログがフィールドを読み取り、不在の場合のみメッセージパースにフォールバックする。メッセージ文言の結合はエンジンemitパスから解消された。

### WD4 — トリアージは助言的;アクションしない

`rigor triage`はヒントを出力する;設定を編集せず、ベースラインも書かない。根拠:

- 関心の分離:トリアージは*診断*。`.rigor.yml`の編集（プラグイン有効化、`signature_paths:`配線）と`.rigor-baseline.yml`の書き込みは*治療* — `rigor-project-init` SKILL（選択肢をユーザーにエスカレート）と`rigor baseline generate`が担う。
- 読み取りに見える動詞でサイレントに設定を書き換えるコマンドは[ADR-22 WD2](../22-baseline-and-project-onboarding/)と同じ「マジックなし」スタンスに違反する。

ヒントは人間 / エージェントが実行するためにアクションを命令形で表現する（「`signature_paths:`に追加せよ」）。自動適用される編集ではない。

### WD5 — `triage`はADR-22 SKILLの下にあるデータレイヤー

`rigor triage`とADR-22はパイプラインとして構成される:

| ステージ | ツール | 答える問い |
| --- | --- | --- |
| 診断 | `rigor triage` | N件の診断が*なぜ*ある？ どのクラスタ？ |
| 決定 | `rigor-project-init` / `rigor-baseline-reduce` SKILL | どのプラグインを有効化するか？ どのルールを修正 / サプレス / ベースライン化するか？ |
| 記録 | `rigor baseline generate` | 合意された残余をスナップショット。 |

SKILLは生のストリームを自分でカウントする代わりに`rigor triage --format json`を呼び出す。ADR-22の`rigor-project-init`フェーズ7（「集中したルールを可能性の高い実バグとして表面化」）と`rigor-baseline-reduce`フェーズ1（「ルールごとにグループ化、カウントでソート」）は、アドホックなLLM算術ではなく — 決定論的でspec対応の — トリアージJSONの薄いラッパーになる。

## ヒューリスティックカタログ（v1）

6つの認識器。それぞれが診断ストリームをスキャンし — そのパターンが閾値を超えるクラスタにマッチしたとき — エビデンスサマリーと推奨アクションを伴うひとつのヒントをemitする。すべてのヒントは`[おそらく…]`と枠組みされ、レポートヘッダーは「ヒューリスティック — アクションの前に確認」と述べる:認識器はシグナルであり、判定ではない。

| # | ヒント | 検出 | 推奨アクション |
| --- | --- | --- | --- |
| H1 | **おそらくActiveSupportの`core_ext`** | `call.undefined-method`、レシーバーがコアクラス（`Integer` / `Float` / `Numeric` / `String` / `Symbol` / `Hash` / `Array` / `Object` / `NilClass` / `Time` / `Date` / `DateTime` / `Range`）に属し、メソッド名がバンドルされたASセレクタセットに含まれる | `signature_paths:`で`rigor-activesupport-core-ext`を配線 |
| H2 | **おそらくプロジェクトのmonkey-patch / refinement** | ≥Kファイル（デフォルトK=3）にわたって同じメソッド名が未定義、レシーバーがコアクラスまたはプロジェクト定義クラス、メソッドがすべてのRBSソースに存在しない | `pre_eval:`で定義ファイルを登録（[ADR-17](../17-monkey-patch-pre-evaluation/)）、またはRBSオーバーレイを追加 |
| H3 | **gemがRBSを同梱していない** | `call.undefined-method`でレシーバークラスが（依存関係ソースインデックス経由で）RBSのない`Gemfile.lock` gemに帰属する | `rbs collection install`、またはgemを`dependencies.source_inference:`にオプトイン（[ADR-10](../10-dependency-source-inference/)） |
| H4 | **ActiveRecordリレーション誤推論の可能性** | ARクエリメソッド名（`where` / `joins` / `includes` / `order` / `distinct` / `group` / `pluck`など）が`Array[...]`と推論されたレシーバーで`call.undefined-method`とフラグされる | `rigor-activerecord`を有効化;それが持続するならエンジン推論ギャップとしてRigor側のissueが値する |
| H5 | **システミックなシングルファイルクラスタ** | 単一の`（ファイル、ルール）`バケットのカウントが閾値≥ | ひとつの修正が多くをクリアできる;または[ADR-22](../22-baseline-and-project-onboarding/)ベースラインの強力な候補 |
| H6 | **おそらく本物のバグ — 最初に確認を** | 低い総カウント、ファイルをまたいで散在するルール（集中していない） | これらのサイトを最初にレビュー — 低カウントの散在した診断はRigorが検出した局所化されたバグ |

H1のASセレクタセットは`rigor-activesupport-core-ext`バンドルがカバーする≈50のセレクタ。認識器はリストを複製するのではなく、そのバンドルの`sig/`を読んでそれを導出すべき（SHOULD）、二者が決してずれないように（スライス2の実装詳細）。

H2の「すべてのRBSソースに存在しない」とH3のgem帰属はどちらも、アナライザーがすでに保持しているデータ — RBSリフレクションサーフェスと`DependencySourceInference` gem-to-classマップ — を再利用するため、どちらの認識器も2回目の解析パスを必要としない。

## CLIサーフェス

```
$ rigor triage [paths...]
  → 解析を実行し、3セクションレポートを出力（分布、
    ホットスポット、ヒント）。`rigor check`と同様に
    .rigor.yml / --configを尊重する。

  --format text|json   text（デフォルト） | 機械可読
  --hints-only         ヒューリスティックヒントセクションのみ出力
  --top N              ホットスポットファイル数（デフォルト10）
  --no-hints           分布 + ホットスポットのみ
```

`rigor triage`は診断数によらず0で終了 — 検査コマンドであり、ゲートではない（`rigor check`がゲートのまま）。

### 出力スケッチ — text

```
Diagnostic distribution — 488 total (480 error / 8 warning)
  call.undefined-method     437  ████████████████
  nullable-receiver          31  ██
  always-truthy-condition     8  ▏

Hotspot files
  app/models/status.rb       42  call.undefined-method ×40  nullable-receiver ×2
  app/models/account.rb      27  ...

Hints — heuristics, verify before acting
  [likely ActiveSupport core_ext]  ~287 diagnostics
    undefined-method on Integer/Numeric: days ×34  minutes ×68  hours ×26 …
    → ActiveSupport monkey-patches Numeric. Add rigor-activesupport-core-ext
      to `signature_paths:` in .rigor.yml.
  [likely a project monkey-patch]  12 diagnostics
    `to_widget` undefined on String across 5 files …
    → Register the defining file via `pre_eval:` (ADR-17), or add an RBS overlay.
```

### 出力スケッチ — json

```json
{
  "summary":      { "total": 488, "error": 480, "warning": 8 },
  "distribution": [ { "rule": "call.undefined-method", "count": 437 } ],
  "hotspots":     [ { "file": "app/models/status.rb", "count": 42,
                      "by_rule": { "call.undefined-method": 40 } } ],
  "hints": [
    { "id": "activesupport-core-ext", "confidence": "likely",
      "diagnostics": 287, "evidence": { "...": "..." },
      "action": "Wire rigor-activesupport-core-ext via signature_paths:" }
  ]
}
```

## 結果

### ポジティブ

- **オンボーディングが正しく読める**。新規参入者は488の未分化な問題ではなく「488件のうち≈360件がひとつのことを言っている」と見る — サーベイが特定した最大の摩擦ポイント。
- **ADR-22 SKILLが決定論的なデータレイヤーを得る**。フェーズ7 / フェーズ1のカウントがアドホックなLLM算術でなくなり、安定したJSON契約を持つspec対応コマンドになる。
- **設定ギャップ診断が修正に結びつく**。H1/H3が「大量のundefined-methodノイズ」を「このバンドルを有効化 / このRBSをインストールせよ」に変換 — 記述的なだけでなくアクション可能。
- **`triage` + `baseline`がクリーンなペアになる**。トリアージは何を修正するかサプレスするかを言い;ベースラインがその決定を記録する。

### ネガティブ

- **メッセージパースの脆弱性**（WD3） — スライス4が構造化された`Diagnostic`フィールドを追加するまで、受信器 / メソッド抽出がメッセージ文言に結合される。有界:パース失敗はスキップに縮退する。
- **ヒューリスティックは誤解を招く可能性がある**。ヒントは推測;H2は特に繰り返された本物のタイポをmonkey-patchと誤認する可能性がある。`[おそらく…]`の枠組みと「アクションの前に確認」ヘッダーは荷重を担う — コマンドはヒントを判定として提示してはならない。
- **CLIサーフェスにサブコマンドがひとつ増える**。ADR-22が既に意味するオンボーディングの自然なエントリーポイントであることで軽減される。

### 持ち越し

- プラグイン提供の認識器拡張ポイント（WD2）と構造化された`Diagnostic`フィールドの堅牢性修正（WD3 / スライス4）は見送りであり、却下ではない。

## 実装のスライス分け

### スライス1 — `rigor triage`スケルトン + 分布 + ホットスポット — LANDED (v0.1.9)

- `Runner#run`を再利用する新しい`Rigor::CLI` `triage`サブコマンド。
- 新しい`Rigor::Triage`モジュール:分布集計 + ホットスポットランキング + text / jsonレンダラー。
- ヒントはまだなし（`--no-hints`動作がコマンド全体）。

### スライス2 — ヒューリスティックカタログ — LANDED (v0.1.9)

- `Rigor::Triage::Hint`認識器インターフェース + 6つのH1〜H6認識器。H1はセレクタセットを`rigor-activesupport-core-ext`バンドルの`sig/`から導出する。
- 両レンダラーにヒントを配線。

### スライス3 — ADR-22 SKILL統合 — LANDED (v0.1.9)

- `rigor-project-init`フェーズ7と`rigor-baseline-reduce`フェーズ1を`rigor triage --format json`呼び出しに書き換え。

### スライス4 — 構造化された`Diagnostic`フィールド（実装済み） + プラグイン認識器（見送り）

- **実装済み** — `Analysis::Diagnostic`のオプショナルな`receiver_type` / `method_name`が`call.undefined-method`ルールによって埋められる。カタログが構造化ペアを読み取り（不在の場合のみメッセージパースにフォールバック）、エンジンemitパスのWD3メッセージパース結合を解消。
- **見送り** — プラグインが認識器を提供できる`Plugin`フック。

## 再評価トリガー

1. **ヒューリスティックヒントが実際のプロジェクトで有用より誤解招くと判明** → カタログを分布 + ホットスポットのみに削減するか、すべての認識器の信頼度閾値を引き上げる。
2. **4つ目のADR-22ファミリーのコンシューマーがトリアージJSONを必要とする** → JSON形状を文書化された安定した契約に昇格させる。
3. **メッセージ文言の変更がWD3パースを繰り返し壊す** → スライス4（構造化フィールド）を前に引き出す。

## 参考文献

- [ADR-22](../22-baseline-and-project-onboarding/) — ベースラインメカニズム + `rigor triage`がフィードする2つのオンボーディングSKILL。
- [ADR-17](../17-monkey-patch-pre-evaluation/) — `pre_eval:`;H2が提案するアクション。
- [ADR-10](../10-dependency-source-inference/) — `dependencies.source_inference:`;H3が提案するアクション。
- [`docs/notes/20260519-oss-library-survey.md`](../../notes/20260519-oss-library-survey/) — クラスタ分類を生んだ5プロジェクトサーベイ。
