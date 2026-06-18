---
title: "ユーザー向けドキュメント レビュー・バッテリー設計 — chibirigor-review の移植検討"
description: "Imported from rigortype/rigor docs/notes/20260610-user-docs-review-battery-design.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260610-user-docs-review-battery-design.md"
sourcePath: "docs/notes/20260610-user-docs-review-battery-design.md"
sourceSha: "744c691ced890934fb03537176c16bbf78620b8e81724b8d534c576b538ce85f"
sourceCommit: "71d3e4faf08888a6bf8be57b39c767616c3c9bf5"
sourceDate: "2026-06-10T23:05:34+09:00"
sourceLanguage: "ja"
sidebar:
  order: 20266610
---

**Status:** design note — 後続作業は`docs/ROADMAP.md` § "Documentation — user-facing
docs review battery" にキュー済み。観測はRigor v0.1.17後のworking tree
（v0.1.18サイクル、2026-06-10）に対して。

## 背景と依頼

chibirigor（別リポジトリの二巻本）には多観点レビュー・バッテリーのスキル
`/Users/megurine/repo/ruby/chibirigor/.claude/skills/chibirigor-review/SKILL.md`
がある — 10レンズ（再現性・型理論・編集者・ドメイン著者・日本語校正・Rigor
フィデリティ・Java読者・Ruby読者・書評家・辛口書評家）を4レイヤー
（真→伝→読→整）に束ね、レイヤー内並列・レイヤー間順次で回し、各所見をノートに
記録して軸を保った修正だけを選択適用する方法論の凍結。

これと同等の品質保証をRigorの**ユーザー向けドキュメント**
（[`docs/manual/`](../../manual/)と[`docs/handbook/`](../../handbook/)）
に適用できないか、という検討。ただし制約が一つ明示された:
**書籍ではなくソフトウェアのドキュメントなので、散文を必要以上に充実させる必要は
ない** — chibirigorの「読み物としての厚み」を称揚するレンズはそのままでは持ち込めない。

## 対象の実測（2026-06-10）

| 対象 | 規模 | 性格 |
| --- | --- | --- |
| `docs/manual/` | 14章 + `plugins/` + `ci-templates/`、約2,800行 | **操作リファレンス**。コードブロックの主役はCLIコマンド・`.rigor.yml`・CIテンプレート（`14-rails-quickstart.md`だけで58ブロック、`02-cli-reference.md` 36、`10-mcp-server.md` 30）。 |
| `docs/handbook/` | 12章 + 付録12本、約10,400行 | **型モデル解説**。20ファイルが`assert_type` / `dump_type`入りRubyスニペットを持ち、「この式の推論結果はこれ」という**機械検証可能な主張**を大量に含む。 |

機械検証の現状: **ゼロ**。`spec/`にドキュメント・スニペットを実行するテストは
なく、`Makefile`にもdocs対象ターゲットはない。v0.1.16のdocs overhaul
（ROADMAP § "Documentation — user-facing docs overhaul"）はコールドリード検証
込みの一回性の手作業パスで、恒常的なゲートは残していない。

設計上の追い風: 両READMEが**軸を既に明文宣言している** —

- 読者宣言（handbook: 静的型素養を仮定しないRubyプログラマ。付録は
  「Coming from X」が一本ずつ読者を宣言）。
- 分担境界（型モデル=handbook / 操作=manual、両READMEが相互に明記）。
- 非目標（handbook: 「数時間で通読できる」「エッジケースはspec corpusへ」
  「Ruby入門はしない」「プラグインauthoringはexamples/ へ」）。
- 用語規約（bare "interface" 禁止 — 初出は必ず*structural interface* /
  *RBS interface*）。
- spec binds（handbookがspec corpusと矛盾したらhandbookが直る）。

chibirigorの「共通の約束（軸）」に相当するものを新規に発明する必要がなく、
レビューの判定基準として既存宣言をそのまま渡せる。

## 移植判定 — 何が移り、何が落ち、何が反転するか

**そのまま移る（方法論）:**レイヤー駆動（レイヤー内並列・レイヤー間順次）、
独立コンテキストのサブエージェント、「直ったテキストを次層が読む」ゲート、
所見ノートへの永続記録、軸最優先の選択適用、「一文の手直しには回さない」運用。

**落ちる:**ドメイン著者レンズ（mametter — 自著引用の公正さという問題が無い）、
日本語校正（ドキュメントは英語 → 英語テクニカルライティング校正に置換。AI調
検出はそのまま有効）、散文の厚み・背景の織り込みを*称揚する*書評家レンズ
（ご指示の制約と正面衝突。リファレンスでは表とコードが主役で、背景の薄さは欠陥
ではない）。

**反転する:** L3読み味レイヤー。辛口書評家の粗探し属性だけを残して向きを変え、
**痩せ方向ではなく太り方向の検出専任**にする — 水増し・manual/handbook間の重複
（分担境界宣言が判定基準）・散文で書かれているが表1枚で済む箇所・非目標違反
（通読時間の膨張）。説明不足側はL2の読者レンズが既に担うので二重にしない。

**新設（最大の差分）:** L0機械層。書籍と違いこのドキュメントの主張の多くは
決定的に検証できる — handbookのスニペットは`rigor check`に通して`assert_type`
主張を実採点でき、manualのフラグ・設定キー・ルールIDはCLI実体・config
schema・ルールレジストリと突合できる。chibirigorの「採点ハーネス」（読者の再現
実装を採点する）に対応するが、対象がドキュメント自身になる。LLMレンズに行かせる
前に機械で落とすべき故障モード（実装と乖離した旗・出力例）はここで恒久的に塞ぐ。
一度書けば毎リリース無料で回る資産であり、レビュー・バッテリーは「L0が緑」を
前提に走る。

## 提案構成 — 5レイヤー

実行順は**機械 → 真 → 伝 → 簡 → 整**。chibirigor同様、フルサイクルは節目だけ、
日常は困っている層だけを回す。

| レイヤー | 問い | 中身 | 形態 |
| --- | --- | --- | --- |
| **L0機械** | 検証可能な主張は実挙動と一致するか | (1) handbookスニペット抽出 → `rigor check`実行 → `assert_type`採点、（2）manualのCLIフラグ / `.rigor.yml`キー / ルールIDを実装と突合、（3）相対リンク・ADR参照の実在性 | **LLMレンズではなく`spec/docs/`（または`make docs-check`）として常設** |
| **L1真** | 意味的な主張は実装・specと一致するか | 機械で取れない意味の主張（「キャッシュはXで無効化」「この診断はYで発火」「balancedでは`:info`」）。handbookはspec corpusと（spec bindsで判定基準明確）、manualは実装・実挙動と突合。レビュアーは`lib/rigor/`読み放題 + CLI実行可。型理論レンズはappendix-type-theoryほか付録群に限定 | LLMレンズ（chibirigorレンズ6の主役昇格） |
| **L2伝** | 宣言された読者に通じるか | (a) **Ruby-only読者**（chibirigorレンズ8ほぼverbatim — 「過剰な平易化はしない」but節込み）、（b）**手順再現**（manual 01/14を本文だけで完走できるか、実行型）、（c）**付録読者**（「Coming from X」をX経験者として読む — 全9本は重いので改稿分のみサンプリング） | LLMレンズ |
| **L3簡** | 太っていないか（痩せ検出はしない） | 水増し・重複・表で済む散文・非目標違反。辛口書評家の反転版 | LLMレンズ |
| **L4整** | 英語・用語・体裁 | 英文テクニカルライティング校正（AI調検出込み）、用語規約準拠（"structural interface" 規約は半機械化可）、manual↔handbook境界規律、リンク文言 | LLMレンズ（必ず最後） |

## 運用上の決定事項

- 所見ノートの出力先はchibirigorの`_<lens>-review.md`方式（対象ディレクトリ
  直下）を採らない — `docs/manual/` / `docs/handbook/`は出荷ドキュメントなので
  汚さず、`docs/notes/`配下に逃がす。
- スキルとして`.claude/skills/rigor-docs-review/SKILL.md`に凍結し、authoring後
  `waza check`を一度（CLAUDE.mdの規約どおり）。
- 初回フルサイクルではL1で実装乖離が一定数出る見込み — handbook / manualは
  v0.1.16のoverhaul時点が最終検証で、その後ADR-51（CI出力6形式 + CI
  自動検出）等が`11-ci.md`ほかに入っており、追従の検証はされていない。

## 後続作業（ROADMAPにキュー済み）

効果順: **(1)** L0機械ハーネス（恒久資産で最優先）→ **(2)** `rigor-docs-review`
SKILL.mdの凍結（L1–L4レンズ文面化）→ **(3)**初回フルサイクル実走。
詳細は`docs/ROADMAP.md` § "Documentation — user-facing docs review battery"。
