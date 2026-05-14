---
title: "診断ポリシー"
description: "rigortype/rigor docs/type-specification/diagnostic-policy.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/type-specification/diagnostic-policy.md"
sourcePath: "docs/type-specification/diagnostic-policy.md"
sourceSha: "c6b21573826d8bd60b553ee06afe4552a4b4c426871d2c47d454f3fa2e421d9c"
sourceCommit: "a7f0405346ea5833580c50f3610ccb0b97fea2d8"
translationStatus: "translated"
sidebar:
  order: 2050
---

Rigorは静かな拡幅よりも精密な診断を優先すべきです（SHOULD）。この文書は診断識別子の分類体系、表示規則、抑制マーカー文法を定義します。

推論バジェットが使うカットオフ識別子は`static.*`ファミリーにあります（[inference-budgets.md](../inference-budgets/)参照）。否定的事実と差分型の表示規則は[type-operators.md](../type-operators/)にあります。`Dynamic[T]`の表示規則はここにあります。

## 診断ガイドライン

- 値として`void`を使うことは一次診断です;下流のリカバリーは`top`を使い、同じ式に対して重複するカスケードレポートを避けるべきです（SHOULD）。
- 証明なしに`top`のメソッドを呼ぶことは診断です。
- 生の`untyped`のメソッドを呼ぶことは許されますが、チェックされていない境界に追跡可能であるべきです（SHOULD）。
- `Dynamic[T]`のメソッドを呼ぶことは静的ファセット`T`を使う場合があります（MAY）が、診断は証明が動的由来の値に依存していることを説明できるべきです（SHOULD）。
- ストリクト動的モードは、動的から精密な代入、引数、戻り値、`Array[Dynamic[top]]`のようなジェネリックスロットのリークを報告できます（MAY）。
- ストリクト静的モードはさらに、チェックされた静的事実ではなく動的由来の事実に安全性が依存するメソッド呼び出しやブランチ証明を報告できます（MAY）。
- 否定的事実によってナローイングされたブランチは、それが有用な場合にその事実を表示すべきです（SHOULD）。例: `String - ""`または`~"foo"`。
- 診断は裸の`~"foo"`が曖昧になる場合、`String - "foo"`のような明示的なドメインを持つ表示を優先すべきです（SHOULD）。
- 読み取り専用シェイプエントリを通じた書き込みは、Rigorがその事実を持つとき診断です。
- クローズドキーワードまたはオプションハッシュシェイプへの予期しないキーの渡しは診断です。
- 無効または矛盾する`RBS::Extended`アノテーションは診断です。
- メソッド実装はソースに関係なく受け付けられたシグネチャコントラクトに対してチェックされます: インライン`#:`、`# @rbs`、rbs-inlineパラメーターアノテーション、生成されたスタブ、および外部`.rbs`宣言はすべて同じ実装側の力を持ちます。
- 再帰、演算子の曖昧さ、動的ディスパッチ、またはバジェット枯渇のために推論が停止するとき、Rigorはカットオフを報告しなければならず（MUST）、推論された型が精密であるふりをするのではなく、境界コントラクトを提案すべきです（SHOULD）。
- 明示的な公称パラメーター型が呼び出しを拒否するがメソッド本体がより小さな推論されたケイパビリティロールのみを必要とする場合、Rigorはアドホックなユニオンを追加するよりもインターフェースに公開シグネチャを汎化することを提案できます（MAY）。
- プラグイン、生成済み、または`RBS::Extended`の事実を含む診断は安定した識別子を持つべきです（SHOULD）。公開識別子はソースファミリーを明確にするプレフィックスを使うべきです（SHOULD）（`plugin.<plugin-id>.<name>`、`rbs_extended.<name>`、`generated.<provider>.<name>`など）。一方、内部診断メタデータはより豊富なprovenanceを保持できます（MAY）。
- RBSエクスポート中の精度損失は、ユーザーが説明またはストリクトエクスポートモードを要求したとき報告可能であるべきです（SHOULD）。

## 識別子分類体系

診断識別子はプラグイン著者、RBSメタデータ、ユーザーの抑制マーカーが内部の番号付けと衝突せずにアドレス指定できるように階層的です。識別子はメジャーバージョン内で安定しています。新しい診断はどのプレフィックスの下にも追加できます（MAY）;名前変更または削除には非推奨ウィンドウが必要です。

| プレフィックス | 使用 |
|---|---|
| `dynamic.*` | `untyped`と`Dynamic[T]`の境界越境、チェックされていないジェネリックリーク、動的由来に証明が依存するメソッド呼び出し。[ADR-10](../adr/10-dependency-source-inference/)（解析器コントラクト: [`docs/internal-spec/dependency-source-inference.md`](../internal-spec/dependency-source-inference/)）に従ったオプトインGemソース推論パス向けの`dynamic.dependency-source.*`（例: `gem-not-found`）を含む。 |
| `static.*` | 不完全推論カットオフを含む、証明に至らない静的チェック |
| `flow.*` | 制御フローのナローイング失敗、等価性と述語のリファインメント問題、事実安定性の違反 |
| `compat.*` | RBS、rbs-inline、Steep互換シグネチャの互換性 |
| `rbs_extended.*` | `RBS::Extended`ペイロードの有効性、バージョン互換性、競合レポート |
| `plugin.<plugin-id>.*` | プラグインが貢献した診断 |
| `generated.<provider>.*` | 生成シグネチャプロバイダーの診断 |
| `hint.*` | スタイルとリファクタリングの提案、設定でゲート（例: `hint.role-generalization.*`） |
| `sig.*` | [ADR-14](../../adr/14-rbs-sig-generation/)に基づくRBSシグネチャ生成器のテレメトリ。`sig.generated.new-file` / `sig.generated.new-method` / `sig.generated.tighter-return`（`rigor sig-gen`コマンドがRBSを生成する際に発行するメソッドごとの分類）と、`sig.skipped.complex-shape` / `sig.skipped.user-authored` / `sig.skipped.untyped-return`（生成器が発行を控えたメソッドごとの理由）を予約する。スライス1のMVPはこれらの識別子を診断ストリームではなくコマンドのJSON出力で公開する。後続のスライスで`--write`パスがランディングした際に`:info`診断として接続する。 |

## `Dynamic[T]`の表示規則

`Dynamic[T]`のprovenanceは診断プレフィックスファミリーによってレンダリングされます:

- `dynamic.*`ファミリー外の診断はナローイングされた静的ファセット`T`を小さな`from untyped`のprovenanceノートと共にレンダリングします。ナローイングされたファセットはユーザーが推論できるものです;ラップされた形式は動的境界自体についてではないメッセージにはノイズを追加するだけです。
- `dynamic.*`の診断、および`rigor explain`または`--explain`で要求された説明は完全な`Dynamic[T]`形式を表示します。なぜなら、まさにそれが浮上させるために存在する情報だからです。
- 内部トレース、キャッシュキー、プラグインの`Scope`クエリはメッセージのレンダリング方法に関係なく常に完全な`Dynamic[T]`形式を保持します。より高い層の診断を構成するために動的ファセットが必要なプラグインはそれを再構築する必要はありません。

## 抑制マーカー

Rigorは既存のエコシステムと相互運用しながらクリーンなRigorネイティブ形式を維持できるように、3つのファミリーの抑制マーカーを認識しなければなりません（MUST）。

### Steepスタイルのマーカー

`# steep:ignore`のようなSteepスタイルのマーカーはデフォルトで認識されます。行スコープのSteepマーカーのみが受け付けられ、RigorはそれらをRigor自身の診断抑制にマッピングします。Steepのマーカー文法のいずれもRigor設定として再解釈されません。

### SorbetおよびRuboCopスタイルのマーカー（オプトイン）

Sorbetスタイルのファイルレベルマーカー（`# typed:`）とRuboCopスタイルの抑制コメント（`# rubocop:disable`、`# rubocop:enable`）はオプトインです。プロジェクトは`.rigor.yml`の`compat.sorbet_ignore`と`compat.rubocop_disable`スイッチで有効にします。Sorbetの型付きモードポリシーとRuboCopのリント対象はRigorの診断抑制と同じではないため、デフォルトでオンにすると懸念事項が混在します。

### Rigorネイティブのマーカー

Rigorネイティブのマーカーは、PHPStanのアノテーションの感覚を踏まえながらアプリケーション側の型DSLを発明しないRubyコメント文法を使います。

- **行形式**: `# rigor:ignore[<diagnostic.id>]`
- **ブロック形式**: `# rigor:ignore-start[<diagnostic.id>]`と`# rigor:ignore-end`のペア

診断識別子リストは上記のプレフィックスを使います。

### 有効性規則

- 未知の診断識別子を名前に挙げるマーカーはリファクタリング中に死んだ抑制が浮上するように警告を生成しなければなりません（MUST）。
- 識別子リストなしのマーカーはデフォルトで診断でなければなりません（MUST）;ストリクトモードは完全に拒否しなければなりません（MUST）。
