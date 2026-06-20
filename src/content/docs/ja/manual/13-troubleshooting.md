---
title: "トラブルシューティング"
description: "rigortype/rigor docs/manual/13-troubleshooting.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/13-troubleshooting.md"
sourcePath: "docs/manual/13-troubleshooting.md"
sourceSha: "13be6916044ca321abf68fa5da7066d2fa20b1e807afac8e094f28e9c59f0f53"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 9013
---

よくある問題とその解決策。エディタ固有の問題については[エディタ統合](../09-editor-integration/)を、「なぜこの診断が（発火しな）かったのか」については[ハンドブック第8章](../../handbook/08-understanding-errors/)を参照してください。

## `rigor: command not found`

Rigorはインストールされているが`PATH`上にありません。バージョンマネージャーを使用している場合、通常はシェルが有効化されていないことを意味します。[Rigorのインストール](../01-installation/)を参照してください。応急処置として`mise exec gem:rigortype -- rigor …`で明示的に実行できます。

## `rigor check`が何も解析しない

コマンドラインでパスが指定されない場合、Rigorは設定ファイルの`paths:`を解析します。`paths:`が間違っているか、設定ファイルが見つからない場合、実行は空になります。プロジェクトルートに`.rigor.yml`または`.rigor.dist.yml`があることを確認するか、明示的にパスを指定してください: `rigor check lib app`。

## すべてが`untyped` / `Dynamic[Top]`になる

Rigorは問題のコードに対する型情報を持っていません。よくある原因:

- **gemがRBSを同梱していない**。`rbs collection install`でシグネチャをインストールするか、`dependencies.source_inference`を有効にします（[設定](../03-configuration/)を参照）。
- **フレームワークにプラグインが必要**。Rails、RSpec、dry-rbなどは[プラグイン](../07-plugins/)を通じてのみRigorに認識されます。
- **プロジェクトのモンキーパッチが見えない**。パッチを当てるファイルを`pre_eval:`の下に列挙して、Rigorが先に走査できるようにします。

`rigor type-of FILE:LINE:COL`はある時点での正確な型を報告するため、情報が失われている場所を絞り込めます。

## 対処できないほど多くの診断が出る

大規模な型なしプロジェクトへの最初の実行では、数百の診断が報告されることがあります。一つずつ抑制することから始めないでください:

1. `rigor triage`: どのルールとファイルが支配的か、考えられる原因のヒントとともに確認する。
2. triageが指摘する体系的な原因を修正する（欠けているプラグイン、欠けているRBSバンドル）。
3. `rigor baseline generate`: 残りをスナップショットしてCIが新しい診断のみを追跡するようにする。[ベースライン](../06-baseline/)（baseline）を参照。

[`rigor-project-init`スキル](../08-skills/)がこの手順を自動化します。

## 診断が誤っている（偽陽性）

Rigorは動作するコードにフラグを立てないことを目指しているため、真の偽陽性は報告する価値のあるバグです。それまでの間、`# rigor:disable <rule>`コメントで単一のサイトを抑制してください（[診断](../04-diagnostics/)を参照）。実際のインスタンスも隠してしまうプロジェクト全体の`disable:`より優先します。

報告する前に、RBSソースの欠落を除外してください。存在するとわかっている呼び出しに`call.undefined-method`が大量発生する場合、たいていRigorがそのシグネチャを読み込んでいません。`rigor check`のSTDERRに`rigor: …`の設定検証警告が出ていないか確認してください。タイポした、または移動した`signature_paths:` / `libraries:`エントリー（あるいはもはや存在しない明示的な`bundler` / `rbs_collection`パス）は、シグネチャを黙って1つも読み込まず、それがカバーするはずだった型へのすべての呼び出しが`evidence_tier: high`で発火します。設定された値を修正すれば偽陽性は消えます。（同じ警告は無効な`disable:` / `severity_overrides:`のルールIDもカバーします。そこにタイポがあると、抑制したつもりでもルールは発火し続けます。）[設定 § 設定検証の警告](../03-configuration/#設定検証の警告)を参照してください。

診断が*正しい*が修正する準備ができていない場合、[ベースライン](../06-baseline/)が適切なツールです。

## 結果が古く見える

そうなるべきではありません。キャッシュエントリーはコンテンツをキーとして自己無効化します（[キャッシュ](../12-caching/)を参照）。それでもキャッシュを疑う場合は、`rigor check --clear-cache`で除外できます。クリアされたキャッシュでも残る結果は、キャッシュのアーティファクトではなくアナライザーの本来の動作です。

## 実行が遅い

- キャッシュをウォームアップしてください。最初の実行が最も遅いものです。
- `paths:`を狭め、`exclude:`を広げて、Rigorが生成されたまたはベンダーされたコードを走査しないようにします。
- 大きなプロジェクトでは、`rigor check --workers=N`でファイルごとの解析を並列ワーカープロセスに分散します（または`RIGOR_RACTOR_WORKERS=N`を設定）。

## 高度な診断

クラスが期待より悪く推論されるとき、あるいは実行が期待より多くのメモリを使うとき、3つの環境変数がRigorに*自身*について報告させます。これらは`rigor check`の終了後にstderrへ出力され、未設定のときはノーオペです。プロセスグローバルなカウンタなので、意味のある数値を得るには単一プロセス（`--workers 0`）で実行してください。

| 変数 | 報告内容 |
| --- | --- |
| `RIGOR_BUDGET_TRACE=1` | 推論が組み込みのカットオフ（再帰ガード、祖先ウォークの上限、HKT燃料など）に何回当たって黙って`Dynamic[top]`へ縮退したか、およびユニオンサイズの分布。推論が*どこで*諦めたかを見る最速の方法。 |
| `RIGOR_HEAP_PROFILE=1` | 強制GC後のクラス別ライブヒープの内訳。メモリ順にランク付けされ、常駐ヒープが実際に何でできているか（型キャリア、RBSオブジェクト、Prismノードなど）を示す。ヒープ全体の走査は遅いので、毎回の実行ではなくプローブとして使う。 |
| `RIGOR_HEAP_TRACE=1` | `file:line`別のStringアロケーションサイトの上位。非常に高いオーバーヘッド。小さなファイル部分集合でのみ実行する。 |

これらはRigor自体の診断や詳細なバグ報告のためのものであり、日常的な使用のためのものではありません。

## バグの報告

Rigorバージョン（`rigor version`）、実行したコマンド、最小限の再現手順、および偽陽性が疑われる場合はRigorに推論してほしかったものを添えてGitHub issueを開いてください。
