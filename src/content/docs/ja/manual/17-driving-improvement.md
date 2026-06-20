---
title: "`rigor-next-steps`でプロジェクト改善を進める"
description: "rigortype/rigor docs/manual/17-driving-improvement.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/17-driving-improvement.md"
sourcePath: "docs/manual/17-driving-improvement.md"
sourceSha: "e2db47f6c44c4a964a3eec89e51cd53639a9d04a342378b1f846cd4232e2d51f"
sourceCommit: "51a679f3ccd12f5bee48c24150401d10e978efce"
translationStatus: "translated"
sidebar:
  order: 9017
---

`rigor-next-steps`は、「このプロジェクトでRigorを次にどうすべきか？」
に対する**唯一のエントリーポイント**です。一度AIコーディングエージェントに
渡せば、あとはプロジェクトがRigorの導入曲線のどこにいるかを判断し、前へ
進めてくれます。Rigorが無ければインストールし、設定が無ければプロジェクトを
オンボーディングし、その後はプロジェクトのセットアップ・ガード・型保護が
あなたの望むレベルに達するまで、次に正しいスキルへとルーティングしていきます。

この章は、その道のりをオペレーターの視点から見たものです。各ステップは手で
実行することもできるコマンドに対応しており、スキルはそのループ全体をあなたの
代わりに駆動するだけです。ルーティング先のバンドルされたスキルは[提供される
スキル](../08-skills/)にカタログ化されています。この章は、それらを結びつける
*ワークフロー*です。

## ループを一枚の絵で

```
rigor-next-steps
   ├─ resolve `rigor` (install via docs/install.md if missing)
   ├─ no config?  → rigor-project-init   (onboard)
   └─ otherwise   → rigor skill describe  → the recommended next skill
                                            ↺ re-run after each step
```

ループのエンジンは**`rigor skill describe`**です。これは軽量で副作用が無く、
*存在確認のみ*を行うプローブです（設定・ベースライン・`sig/`・ロックファイル・
CI・エディタ/MCP設定をstatするだけで、`rigor check`を実行することは決して
ありません）。そのため、エージェントはいつでも自由に実行できます。そのガイダンスは
インストール済みのRigorによってその場で生成されるので、古くなることがありません。

## `describe`が教えてくれること

```sh
rigor skill describe        # or the alias: rigor describe
```

```
# Rigor — このプロジェクトの次のステップ
#
# rigortype 0.2.x によってその場で生成されます。このガイダンスは常に
# インストール済みのバージョンとプロジェクトの現在の状態を反映します。

## プロジェクトの状態
- 設定ファイル:    .rigor.dist.yml
- ベースライン:    なし
- プロジェクト sig/:  あり
- コミュニティ RBS:  コレクションがインストール済み
- CI 連携:        CI あり、Rigor は未連携
- エディター LSP:   .vscode あり、Rigor LSP は未連携
- MCP サーバー:    未検出

## 推奨される次のステップ
→ rigor-ci-setup — Rigor は設定済みだが CI に連携されていない — リグレッションガードを固定する。
  読み込み: rigor skill print rigor-ci-setup

## 次に実行できる全スキル
  …各スキルの現在の1行説明付きの全カタログ…

## エージェント向け
  …推奨をどう実行するか、そして `rigor check` の検出結果からどう絞り込むか…
```

実行し、**推奨される次のステップ**に従い、そのスキルを完了したら、もう一度
実行します。推奨はプロジェクトの状態が変化するにつれて進んでいきます
（例: `project-init → rbs-setup → ci-setup → …`）。

## ステップごとの道のり

推奨は理にかなった導入順序をたどります。各段階について、同等の手動コマンドは
リンク先の章にあります。

| 段階 | 推奨スキル | 何をするか | 手動では |
| --- | --- | --- | --- |
| **オンボード** | `rigor-project-init` | スタックを検出し、プラグインを選び、`.rigor.dist.yml`を書き、任意でベースライン（baseline）をスナップショットする。 | [提供されるスキル](../08-skills/)、[設定](../03-configuration/) |
| **コミュニティRBS** | `rigor-rbs-setup` | `rbs collection install`を実行し、RBSを持たないgemが`Dynamic`として型付けされないようにする。 | [設定](../03-configuration/)（`rbs_collection`） |
| **Railsプラグイン** | `rigor-plugin-tune` | RailsがロックされているのにRailsプラグインが1つも有効でない場合、それらを連携してActiveRecord / routes / i18nの呼び出しが解決されるようにする。 | [プラグインを使う](../07-plugins/) |
| **検出結果を見る** | — | バグには`rigor check`、「ここに型を足そう」には`rigor coverage --protection`。 | [CLIリファレンス](../02-cli-reference/)、[型保護カバレッジ](../15-type-protection-coverage/) |
| **保護を高める** | `rigor-protection-uplift` | 型保護の穴を塞ぐ。まずsig-gen、最小限の手書きRBS、二重ゲートのもとで。 | [型保護カバレッジ](../15-type-protection-coverage/) |
| **負債を返済する** | `rigor-baseline-reduce` | 既存のベースラインをルールごとに削っていく。 | [ベースライン](../06-baseline/) |
| **ガードする** | `rigor-ci-setup` | CIでRigorを実行し、PR/MRにインラインで診断を出す。 | [CIでRigorを実行する](../11-ci/) |
| **エディタ / エージェント** | `rigor-editor-setup` / `rigor-mcp-setup` | `rigor lsp`をエディタに / `rigor mcp`をAIエージェントに連携する。 | [エディタ連携](../09-editor-integration/)、[MCPサーバー](../10-mcp-server/) |
| **DSLを教える** | `rigor-monkeypatch-resolve` / `rigor-plugin-author` | `pre_eval:`で自前のモンキーパッチを解決するか、プラグインを書く。 | [設定](../03-configuration/)、[提供されるスキル](../08-skills/) |
| **アップグレード / 検証** | `rigor-upgrade` / `rigor-doctor` | 新しいRigorバージョンをクリーンに採用する。セットアップが健全か検証する。 | [ベースライン](../06-baseline/)、[トラブルシューティング](../13-troubleshooting/) |

## 実例で見るウォークスルー

Rigorをインストールしたばかりで設定の無い、典型的なRailsアプリ:

1. **`describe`** → *「まだRigorの設定がありません — ここから始めましょう」* →
   `rigor-project-init`を実行する。これは`.rigor.dist.yml`（`target_ruby`、
   `paths:`、Railsプラグイン）を書き、最初の`rigor check`が多くの診断を報告した
   場合はベースラインをスナップショットします。
2. **`check`が本物のバグを見つける**。型を意識したRailsアプリでは、プラグインが
   数百ものフレームワーク呼び出しを解決すると*同時に*、RBSには見えない本物の
   バグを表面化させます。カラムではないstrong-paramsのキー（カラムが
   `start_date`なのに`permit :start_date_jst`）、欠落または重複したi18nキーなど
   です。これらがオンボーディングの見返りです。
3. **`coverage --protection`が型の効くところを示す**。ありふれたライブラリ
   スライス（slice）は、例えば`17.5%`が保護されていると報告し、「ここに型を
   足そう」リストで型の無いレシーバーをピンポイントで指し示すかもしれません。
4. **`rigor-protection-uplift`が安く塞げる穴を塞ぐ**。まずsig-gen、次に残った
   部分には*最小限で真な*手書きRBS。例えば、シグネチャの無い外部gemに対する
   7行のRBSは、スライスの保護を`13%`から`26%`へ、**新しい診断ゼロ**で引き上げ
   られます（このスキルは両方を検証します。保護が上がること*かつ*`rigor check`
   がクリーンなままであること）。
5. **acknowledgeモード＋ベースライン**は今日の診断をスナップショットし、*新しい*
   診断はどれも目に見えるリグレッションになるようにします。タイポしたi18nキーを
   注入すると、`rigor check`は即座にそれをフラグします。
6. **`describe`が前進し**、`rigor-ci-setup`へ、次にエディタ / MCPへと進みます。
   そしてこのループは、次の一手が欲しくなったときにいつでも続きます。

## `check`から推奨を絞り込む

`describe`の見出しは存在確認のみで、`rigor check`を実行することは決してなく、
それによって高速さが保たれます。しかし*最善*の次のステップは、`check`が何を
見つけるかに依存することが多いため、**「エージェント向け」**セクションは、
エージェントが（自分で実行する、またはすでに実行した）`rigor check`から選択を
絞り込むよう指示します。

- エラーがあり、まだベースラインが無い → `rigor-baseline-reduce`
- 自前のモンキーパッチに対する`call.unresolved-toplevel` /
  `call.undefined-method`のクラスタ → `rigor-monkeypatch-resolve`
- フレームワーク呼び出しが`Dynamic`として型付けされ、合致するプラグインが
  1つも有効でない → `rigor-plugin-tune`
- `RBS classes available: 0`、または`configuration-error` → `rigor-doctor`

ループを手でたどっている場合も、同じルールが適用されます。`rigor check`を
実行し、その出力に最も有用な次のスキルを選ばせましょう。

## 実用上のメモ

- **`target_ruby`の下限**。 Rigorにバンドルされたパーサ（Prism）は比較的新しい
  Rubyの下限をサポートします。それより下に`target_ruby`を設定すると、
  `rigor check`が最小値と、正しい値をどこで読めるか（`Gemfile.lock`の
  `RUBY VERSION`、または`.ruby-version`）を教えてくれます。
  `rigor-project-init`は互換性のある値をあなたの代わりに選びます。
- **個々のRailsプラグインを列挙し、アンブレラを使わない**。
  `rigor-activerecord`、`rigor-actionpack`、…を`plugins:`に入れてください。
  `rigor-rails`（便宜的なメタgemであり、単一のプラグインではありません）では
  ありません。アンブレラを試すと、ロードエラーが使うべき個々のプラグインを
  列挙します。
- **`RBS classes available: 0`はクリーンな実行ではなく、壊れたセットアップ**。
  `rigor check`がその警告を表示する場合、RBS環境のビルドに失敗しています
  （たいていは`signature_paths:`内の宣言の重複）。（ほぼ空の）結果を信用する
  前にそれを修正してください。`rigor-doctor`が位置の特定を助けます。
- **存在しないパスはスキップされ、致命的ではない**。 `lib/`の無いプロジェクトで
  `rigor check app lib`を実行すると、`app`を解析し、`lib`について警告します。
  中断はしません。

## 関連項目

- [提供されるスキル](../08-skills/) — このループがルーティングするすべての
  行き先について、スキルごとのリファレンス。
- [Rigorのインストール](../01-installation/) — `rigor-next-steps`が最初に実行する
  インストールステップ。
- [型保護カバレッジ](../15-type-protection-coverage/) —
  `rigor-protection-uplift`が作用する測定。
