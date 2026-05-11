---
title: "ADR-8: Steep-inspired Improvements"
description: "Imported from rigortype/rigor docs/adr/8-steep-inspired-improvements.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/adr/8-steep-inspired-improvements.md"
sourcePath: "docs/adr/8-steep-inspired-improvements.md"
sourceSha: "c1c787c1909363d82352b01fc6cddfd097c4bd58355d77893900f309479b5679"
sourceCommit: "74ac0f8722e98525410373ffc22f93595bc15e65"
translationStatus: "translated"
sidebar:
  order: 4008
---

## ステータス

承認（作業上の決定）。Rigor自己解析レポート（非公式）と[`docs/notes/20260503-steep-cross-check-triage.md`](../../notes/20260503-steep-cross-check-triage/)にあるv0.0.5 Steepクロスチェックトリアージの付属物。診断IDファミリー階層、重大度プロファイル、`return-type-mismatch`ルールファミリーという3つのSteepに触発された改善の実装選択を記録する。

## コンテキスト

`lib/`に対してSteep 2.0を実行する（`make steep-check`に従って）と、RigorがSteepと比較して持つ3つの構造的なギャップが表面化した。

1. SteepのレントIDは2セグメント（`Ruby::MethodParameterMismatch`、`RBS::DuplicatedMethodDefinition`）。Rigorはシングルセグメント（`undefined-method`、`wrong-arity`）。フラットな名前空間では、`# rigor:disable`や設定で関連する診断のファミリー（例：「すべての呼び出しサイトルール」）をターゲットにしにくい。
2. Steepには組み込みの重大度プロファイル（`Steep::Diagnostic::Ruby.lenient`、`.strict`）が付属する。Rigorは`.rigor.yml`の`disable:`リストによるルールごとのオン/オフのみをサポートする。その結果、CIと開発での重大度チューニングが扱いにくい。
3. Steepはメソッドボディの推論された返り値型が宣言された返り値型を満たせない場合に`Ruby::MethodBodyTypeMismatch`を出力する。Rigorには基盤（スライス4の`FlowContribution::Merger`、B1のメソッドごとのReflectionキャッシュ）はあるがルールはまだない——返り値側における既存の`argument-type-mismatch`の対称的な存在。

このADRは実装がサーフェス設計を再検討せずにランドできるよう、各改善の選択された方向を記録する。

## 決定

### 1. 診断IDファミリー階層

**決定: ルール識別子を`family.rule-name`形式に正規化する**。 `family`は`[a-z][a-z0-9_]*`セグメントの小さな固定セットの1つだ。

ファミリープレフィックス:

| family | ルール |
| --- | --- |
| `call`   | `call.undefined-method`、`call.wrong-arity`、`call.argument-type-mismatch`、`call.possible-nil-receiver` |
| `assert` | `assert.type-mismatch`（テストハーネスアサーション）、`dump.type`（デバッグ） |
| `flow`   | `flow.always-raises`（フローパスがraiseで終わることを証明）、`flow.unreachable-branch`（リテラル述語による到達不能ブランチ）、`flow.dead-assignment`（書き込み後に読み込まれないローカル変数）、`flow.always-truthy-condition`（推論された定数述語、ループ / ブロック / 防衛的な形式の外部） |
| `def`    | `def.return-type-mismatch`（以下のスライス#1）、`def.method-visibility-mismatch`（privateメソッドレシーバーチェック）、`def.ivar-write-mismatch`（クラスごとのivar具体クラスドリフト） |

`dump.type`は`assert.dump-type`ではなく独自の`dump`ファミリーに置かれる。ランタイムセマンティクスが異なるからだ（アサーションは実行を失敗させ、ダンプは診断副作用で常に成功する）。

**後方互換性**。既存の`# rigor:disable undefined-method`と`disable: ["undefined-method"]`はv0.1.xで動作し続ける。設定/抑制レイヤーは両方を受け入れる。

- `<rule>`（プレフィックスなし、レガシー形式）。
- `<family>.<rule>`（新しい正規形式）。
- `<family>`（ワイルドカード——`<family>.`で始まる識別子を持つすべてのルールを無効化）。

プレフィックスなし形式は`Analysis::CheckRules`の固定エイリアステーブルを通じて解決される。ユーザーコードが移行した後でエイリアステーブルを削除することは将来のADRだ。

**診断サーフェス**。 `Diagnostic#rule`は正規（`family.rule-name`）形式を公開する。`Diagnostic#qualified_rule`はデフォルト以外のsource_familyの場合にすでに`source_family`プレフィックスを付ける。組み合わせた形式は`source_family ∉ {:builtin}`の場合に`<source_family>.<family>.<rule>`だ。`Diagnostic#to_s`は既存の`[<qualified-rule>]`レンダリングを保つ。

### 2. 重大度プロファイル

**決定: 3つの名前付きプロファイルを導入する** — `lenient`、`balanced`（デフォルト）、`strict`。各プロファイルは`family.rule-name`を`:error`/`:warning`/`:info`/`:off`にマッピングする固定テーブルだ。

| プロファイル | 挙動 |
| --- | --- |
| `lenient` | `:no`クラスの診断のみがエラー。`:maybe`クラスの診断は`:warning`。レガシーコードでの段階的な採用に有用。 |
| `balanced`（**デフォルト**） | 現在のRigorのスタンス: ほとんどのルールは`:error`。`dump.type`は`:info`。不確かなルールは`:warning`。 |
| `strict` | すべてのルール（`flow.*`の証明失敗を含む）が`:error`。CI向け。 |

プロファイルは**最終フィルター**だ。ルールは作成された重大度で`Diagnostic`行を出力する。`Analysis::Runner`は結果に追加する前に各診断の重大度をプロファイルから再スタンプする。ルールはプロファイルを直接参照しない。

`.rigor.yml`に2つのキーが追加される。

```yaml
severity_profile: balanced     # one of lenient | balanced | strict
severity_overrides:
  call.argument-type-mismatch: warning
```

`severity_overrides`はルールごとのエスケープハッチ——テーブルは正規ルールid（またはファミリーワイルドカード）でマッチする。`severity_overrides`の未知のルールidはサイレントにスキップされる。実行ごとのドリフトはパブリックAPIドリフトspecが代わりに検出する。

### 3. `def.return-type-mismatch`ルール

**決定: メソッドボディの推論された返り値型が宣言されたRBSの返り値型を満たせない場合に診断を出力する**。

スコープ（v0.1.x最初のカット）:

- メソッドに`Rigor::Reflection`を通じて到達可能な明示的なRBSシグ（インスタンスまたはシングルトン）がある。
- メソッドボディの最後に評価された式の型が`Inference::ExpressionTyper`から計算可能（`Dynamic[top]`フォールバックなし）。
- 比較は`declared.accepts(inferred)`:
  - `:yes` — サイレント。
  - `:no` — `:error`とルール`def.return-type-mismatch`で診断を出力する。
  - `:maybe` — v0.1.x最初のカットではサイレント。実装上の規律: ドッグフーディングでRigor自身の`lib/`に16の警告が見つかり、すべてが同じ解析器精度ギャップのセット（`{}`が宣言された要素型を回復しない、`Set.new`が`Set[Symbol]`ではなく裸の`Set`を返す、…）から来ており、ボディの推論型がまだ十分に正確にピン留めできていない。`:maybe`を`:warning`（と`severity_profile: strict`下での`:error`）に引き上げることは、それらのケースが必要とするナローイング精度改善と一緒にランドするフォローアップにキューイングされている。

最初のカットのスコープ外:

- RBSシグのないメソッド（比較する宣言された契約がない）。
- 複数返り値パス解析。最初のカットはボディの最後の式を推論された返り値のプロキシとして取る。ボディ途中の明示的な`return`、分岐する返り値、`raise`終了、`next`/`break`パスは今は素通りする。
- ブロック返り値型。`IteratorDispatch`/`BlockFolding`の上の将来の作業。
- メソッドオーバーロード——ルールはメソッドの`method_types`配列を参照し、宣言されたすべての返り値型のユニオンを比較ターゲットとして考慮する。

根拠: これはSteepの`Ruby::MethodBodyTypeMismatch`スコープと一致する。ADR-5（堅牢性原則）は「返り値では厳格に」を要求する。このルールはそのポリシーの最初の具体的なコンシューマーだ。

### 4. スコープ外の項目（記録のために）

Steepに触発されたリストはまた次のものもフラグ立てした。

- **LSP/langserverモード**。 v0.1.x以降に延期。キャッシュレイヤーは準備できている（B1のメソッドごとのキャッシュ+Steepが誘発したrescueの厳格化）が、モード自体には別の設計パスが必要だ。
- **詳細テキストフォーマッター**。ソーススニペットレンダリングを持つオプションの`--format=detailed`。延期。デフォルトのテキストフォーマットはgrep/カウント互換性のためにシングルラインレイアウトを保つ。
- **`Data.define`オーバーライド対応イニシャライザーディスパッチ**。このADRのスコープ外。CURRENT_WORKはすでにそれを並行安全なエントリーポイントとして追跡している。

## 結果

### ポジティブ

- 診断ファミリーワイルドカードは`# rigor:disable call`とファミリーごとのCIゲートを明確に表現可能にする。
- 重大度プロファイルはSteepユーザーが日常的に採用するstrict-CI/lenient-developmentパターンのブロックを解除する。
- `def.return-type-mismatch`は既存の`argument-type-mismatch`（パラメータ）と返り値側の間の対称的なギャップを閉じ、ADR-5の「返り値では厳格に」の約束を果たす。

### ネガティブ

- ユーザーコードの既存の`# rigor:disable undefined-method`コメントと`disable:`設定エントリはプレフィックスなし形式を使用する。エイリアステーブルが移行を吸収するが、2つの綴りの共存はプラグイン作成者とフォーマッターが理解しなければならないサーフェスを増加させる。計画は正規形式が広く採用された後、将来のADRでエイリアステーブルを削除することだ。
- 重大度プロファイルの再スタンプは下流のコンシューマー（フォーマッター、JSON出力）が観察する`Diagnostic#severity`を変更する。特定の重大度に依存するCIパーサーはプロファイルをピン留めすべきだ。
- `def.return-type-mismatch`の最初のカットは保守的だ。`Dynamic[top]`ボディをスキップすることで偽陽性は最小化されるが、分岐する返り値を持つ実世界のコードはv0.1.xカットが処理しないケースを表面化させる可能性がある。計画: それらをフォローアップチケットとして収集する。

## 参照

- [Steepクロスチェックトリアージ2026-05-03](../../notes/20260503-steep-cross-check-triage/)
- [ADR-5: 堅牢性原則](../5-robustness-principle/)
- [ADR-7: v0.1.0スライス4〜6の作業上の決定](../7-v0.1.0-slice-decisions/)
- [`docs/internal-spec/inference-engine.md`](../../internal-spec/inference-engine/)
- [`docs/internal-spec/flow-contribution-merger.md`](../../internal-spec/flow-contribution-merger/)
