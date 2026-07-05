---
title: "ADR-81 — スキルセット最適化: スキルごとの鮮度 + `waza`評価スタンス"
description: "rigortype/rigor docs/adr/81-skill-set-optimization.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/81-skill-set-optimization.md"
sourcePath: "docs/adr/81-skill-set-optimization.md"
sourceSha: "2221abba11e1dbff9545044eae5492559e56eb15c2dea0a40c362f650ab15a64"
sourceCommit: "47c1c7d35efbce222a6a888268b263808b49796c"
translationStatus: "translated"
sidebar:
  order: 4081
---

ステータス: **Accepted — 2026-07-05実装**。ユーザー向けの`skills/`セットをどう最適化・維持するかについての2つの恒久的な決定: (1) ADR-73 WD1の鮮度基準を、エントリポイントから*すべての*スキル本体へ一般化する。これは「まず: バージョン最新のコピーを読み込む」ディレクティブ + 新設の`rigor skill --full <name>`で実現される;(2) `waza`（バンドルされたスキル評価器）のどの助言に基づいて行動するかについてのポリシー。（1）のメカニズムの詳細は同日付の[ADR-73](../73-skill-driven-user-experience/)の改訂にある;本ADRは再利用可能な*基準*と評価スタンスを記録する。

根拠: [ADR-73](../73-skill-driven-user-experience/)の2026-07-05改訂;`CLAUDE.md` § "Evaluating skills with `waza`";[ADR-74](../74-offline-doc-access-and-llms-txt/)（`rigor docs`）;[ADR-50](../50-release-engineering-and-stability-strategy/) WD1（v1.0の語彙フリーズ）。

## コンテキスト

`skills/`配下のユーザー向けスキルは、それぞれ単一のソースファイルを読む2つの配布経路を通じて出荷される: gem（`rigor skill`が新鮮に提供）とvercel-labs/skills（`npx skills add`、**インストール時点で凍結**）だ。ADR-73はエントリポイント`rigor-next-steps`だけをバージョンに結び付いたロジックから解放した;他の14個のスキルは完全な手順を本体に凍結していたため、ベンダリングされたコピー——エージェントによって自身の`description:`で自動トリガーされる——はインストール済みバイナリからドリフト（陳腐化）する。これが、本セッションが塞ぐことに乗り出した問題だ。

これとは別に、`waza`（バンドルされたエージェントスキル評価器）はレディネス助言を報告するが、そのデフォルトは**agentskills.ioの公開**向けに較正されている——500トークンのバジェット、`**WORKFLOW SKILL**` / `USE FOR:` / `INVOKES:`のラベル付きdescription形式——これらはRigorの意図的に包括的な単一ファイルのスキルには合わない。本セッションで実行した`waza check`のスイープがこのミスマッチを具体化した（すべてのスキルが816〜4267トークンで500トークン制限に「失敗」する）ので、`waza`のどのシグナルを信頼するかについての恒久的な決定が必要だった。

## 決定

**基準1 —— 鮮度**。配布されるスキルはバージョン安定な骨組みだけを凍結する;バージョンに結び付いた手順の詳細はインストール済みgemからライブで取得する。これは、エントリポイントだけでなく*すべての*スキル本体へ適用されたADR-73 WD1の「インストール前に必要なものだけ凍結する」ルールだ。要となる観察: 両方の配布経路が単一の`skills/<name>/SKILL.md`を読むため、鮮度はファイルを薄くすることからは得られない——それは、gemから現行の本体を**再取得するディレクティブ**から得られる（凍結されたコピーはインストール時点で止まる;`rigor skill`は常にgemを読むので、両者はアップグレードをまたいで乖離し、ディレクティブはインストール済みバージョンの側へ解決する）。

**基準2 —— 評価**。`waza`の助言は、**公開プロファイルから独立した**欠陥を指摘する場合にのみ採用する。これはツールをフィルタリングする: 本物の問題を捉えるシグナルは残し、agentskills.io以外の形を単に減点するだけのものは捨てる。

## ワーキングデシジョン

- **WD1 —— ディレクティブ + `rigor skill --full`**。エントリ以外のすべてのスキルは、`rigor skill --full <name>`を指す「まず: バージョン最新のコピーを読み込む」セクションを備える——SKILL.md本体に続けてすべての`references/*.md`をインライン展開し、完全で現行の手順を1回の呼び出しで返す新設モードだ（`SkillCommand#run_full`、[`lib/rigor/cli/skill_command.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/cli/skill_command.rb)）。1回の呼び出し、パス計算不要、ファイル読み取りツール不要、そして凍結された同居の`references/`を読むリスクもない。
- **WD2 —— ハイブリッドな調整**。**本体がドリフトする正確なコマンド / フラグ / 設定キー / ルールIDを抱える箇所でだけ**、揮発性の詳細を`references/`へ切り出す;それ以外はディレクティブだけで十分だ（ほとんどのスキルはすでに詳細を`references/`へ外部化しているか、`rigor docs`へ委譲している）。`rigor-doctor`は実演的でアグレッシブな分割だ;`rigor-next-steps`は純粋なインストール前ブートストラップのままとする。
- **WD3 —— `waza`の使い方**。採用: **リンクの健全性**（`waza check`が`rigor-ci-setup`内で、デフォルトブランチが`master`なのに`blob/main`のHTTP-404ドキュメントリンクを4件検出した）と**ハードコードされたドキュメントURLの過剰な具体性**（オフラインの`rigor docs <chapter>`を優先、基準1と収束する）。却下: **500トークンのバジェット** / 「complexity: comprehensive」（我々のスキルは意図的に包括的だ）と**ラベル付きdescription形式**（我々の散文の`Triggers: "…"` + `NOT for … (use X)`が同じことを伝えつつ読みやすい——その欠如を`waza`が減点するのは公開バイアスであって、本物のギャップではない）。`waza dev --auto`は`CLAUDE.md`に従い禁止のまま（頻繁に偽である`USE FOR:` / `INVOKES:`のボイラープレートを注入するため）。
- **WD4 —— description長はスキルごとの判断だ**。`waza`のクロスモデル密度助言（60語以下のdescription、アクション動詞で始める）は、過度に広いカタログエントリにのみ適用し、トリガー再現率を犠牲にする一律ルールにはしない——skill-creatorの「押しの強いdescription」ガイダンスが引き続き統制する。切り詰めの候補は`rigor-ask`（169語）だけだ。
- **WD5 —— 凍結された語彙**。`rigor skill --full`とディレクティブの存在は、既存の`rigor skill`文法と並んで、ADR-50 WD1のもとv1.0で凍結される公開サーフェスになる。

## 却下 / 見送りされた選択肢

| 候補 | ステータス | 理由 |
| --- | --- | --- |
| 再取得ディレクティブなしで凍結された本体を薄くする | 却下 | 両方の配布経路が単一のファイルを読む——薄くすれば両方が薄くなる;鮮度はファイルが短いことからではなくディレクティブから得られる。 |
| `waza`のラベル付き`USE FOR:` / `INVOKES:`形式 + 500トークンターゲットを採用する | 却下 | 公開向けに較正されている;読み手ではなくリンター向けに最適化する。我々の散文はすでにトリガー + アンチトリガーとルーティングを備えている。 |
| エントリ以外のスキルのvercel-labs配布を取りやめる（gemのみで提供） | 見送り | ADR-73 WD5のセット全体インストールを覆す;ディレクティブは配布経路を取り除かずに凍結コピーのケースを緩和する。 |
| 一律に60語以下のdescription | 却下 | クロスモデルの明快さのためにトリガー再現率を犠牲にする;切り詰めるのは過度に広い受け皿だけだ。 |
| `rigor-ci-setup`のインラインCIテンプレートを`rigor docs ci`へ委譲する | 見送り | テンプレートはマニュアルの章と重複する;完全な委譲はより大きくパリティ検証を要するリファクタリングだ——キュー待ちのフォローアップ。 |

## 帰結

- **ポジティブ**。オンボーディングの慣行は、単一のスキルを再公開することなくインストール済みバージョンに追随する;`rigor skill --full`はエージェントに完全で新鮮な手順を1回の呼び出しで与える;安価な`waza check`のリンクリントは、人間のdiffが見落とす壊れたドキュメントURLを捉える。
- **持ち越し**。`rigor skill --full`はv1.0で凍結される（ADR-50 WD1）。`rigor-ci-setup`は依然としてマニュアルを重複させる（上記で見送り）。スコープ外だが指摘済み: gemspecの`documentation_uri`は`…/tree/main/docs`を使っており、おそらく404だ（デフォルトブランチは`master`）。

## 他のADRとの関係

- **[ADR-73](../73-skill-driven-user-experience/)** —— SKILL駆動のUXと鮮度の*メカニズム*;ここでの基準1はそのWD1を一般化し、2026-07-05の改訂がスキルごとの実装詳細を保持する。
- **[ADR-74](../74-offline-doc-access-and-llms-txt/)** —— `rigor docs`は、過剰な具体性の修正（WD3）がハードコードされたURLを誘導する先である、オフラインでバージョン整合したターゲットだ。
- **[ADR-50](../50-release-engineering-and-stability-strategy/)** —— `rigor skill --full`をv1.0で公開語彙として凍結する（WD5）。
- **[ADR-49](../49-adr-authoring-guidelines/)** —— 本ADR自身の品質基準（メカニカルポリシーのアーキタイプ、低〜中ステークス → 経済性重み付け）。
