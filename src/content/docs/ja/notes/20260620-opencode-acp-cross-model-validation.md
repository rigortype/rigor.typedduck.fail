---
title: "OpenCode（ACP）によるクロスモデル検証 — 13モデルで `rigor-next-steps` を駆動する"
description: "rigortype/rigor docs/notes/20260620-opencode-acp-cross-model-validation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260620-opencode-acp-cross-model-validation.md"
sourcePath: "docs/notes/20260620-opencode-acp-cross-model-validation.md"
sourceSha: "0fcf34363f524e09af1b180c5e60c4b333ebdbba343fbb7dbf86b30461a21d73"
sourceCommit: "51a679f3ccd12f5bee48c24150401d10e978efce"
translationStatus: "translated"
sidebar:
  order: 20266620
---

日付: 2026-06-20。ステータス: **ツール／方法論の検証**。
[`20260620-skill-driven-onboarding-dogfood.md`](../20260620-skill-driven-onboarding-dogfood/)の姉妹編である。
あちらのノートは[ADR-73](../../adr/73-skill-driven-user-experience/)のオンボーディングフローをClaude
（Sonnet）のサブエージェントで実行した。本稿は同じフローを**Claude以外の13モデル**（OpenCode Go）で再実行する。
駆動はAgent Client Protocol経由で`acp-agent-runner` skillを使う。問いは限定的だ──
**他ベンダーのモデルはRigorのSKILL駆動UXを的確に駆動できるか？** 答え: **イエス── 13/13**。

## 方法

- **モデル:** OpenCode Goのサブスクリプションが公開している全モデル（13）── `glm-5.2`、`glm-5.1`、
  `kimi-k2.7-code`、`kimi-k2.6`、`mimo-v2.5-pro`、`mimo-v2.5`、`qwen3.7-max`、`qwen3.7-plus`、
  `qwen3.6-plus`、`minimax-m3`、`minimax-m2.7`、`deepseek-v4-pro`、`deepseek-v4-flash`。
- **割り当て:**各モデルを別々の`~/repo/ruby/rigor-survey`プロジェクトへランダムに割り当てた
  （完全な行列ではない── 1モデルにつき1プロジェクト）。
- **隔離:**各実行はプロジェクトの使い捨て`cp -Rc`クローン内で行う（ACPクライアントは外部
  エージェントの編集／シェルを自動承認するので、cwdはサンドボックスでなければならない）。
- **環境の抽象化:**各サンドボックスに配置した`run-rigor.sh`ラッパーが
  `nix develop <rigor> --command env BUNDLE_GEMFILE=… BUNDLE_PATH=… bundle exec exe/rigor …`
  の呼び出しをカプセル化する。これにより外部モデルは1本のクリーンなコマンドでRigorを駆動でき、
  テストは環境のやりくりではなく*ツール駆動能力*を測る。
- **タスク:**オンボーディングフロー── `version` → `skill describe` → `.rigor.dist.yml`の作成
  （存在しない場合のみ）→ `check` → `coverage --protection` → 短い構造化レポート。
- **検証:** `acp_run.py`が各実行の`model_verified`をOpenCode自身のセッション記録から読み戻す
  （地の文の自己申告は当てにならない）。

## 結果── 13/13が成功、すべてmodel-verifiedで本物

| モデル | プロジェクト | 保護率 | エラー | レポート |
| --- | --- | --- | --- | --- |
| glm-5.2 | erubi | 27.0 %（38/141） | 3 | 充実、洞察に富む |
| glm-5.1 | faraday | **24.0 %**（256/1066） | 6 | 充実 |
| qwen3.7-max | haml | **38.4 %**（617/1606） | 55 | 完全 |
| qwen3.7-plus | parser | 22.0 %（483/2193） | 27 | 完全 |
| qwen3.6-plus | jbuilder | 26.4 %（61/231） | 0 | 完全 |
| deepseek-v4-pro | rubocop-ast | 23.9 %（341/1425） | 6 | 完全 |
| deepseek-v4-flash | numo-narray | 37.1 %（197/531） | — | 完全 |
| minimax-m2.7 | pycall | 44.3 %（228/515） | 0 | 完全 |
| kimi-k2.6 | oj | 57.8 %（178/308） | 2 | 簡潔 |
| kimi-k2.7-code | kramdown | 35.5 %（1414/3985） | 55 | 簡潔 |
| mimo-v2.5-pro | ox | 30.6 %（119/389） | — | 簡潔 |
| mimo-v2.5 | slim | 31.5 %（263/835） | 2 | 簡潔 |
| minimax-m3 | mangrove | 13.8 %（147/1068） | — | 完全、既存の設定を尊重 |

実時間はモデルあたり34〜68秒。

### うまくいったこと

- **どのモデルもフローを正しく駆動した**── 必要な箇所で`.rigor.dist.yml`を作成し、5つのステップ
  すべてをラッパー経由で実行し、正確なファイル数／保護率／上位の穴を報告した。
- **レポートは忠実で、ハルシネーションではない**。 `glm-5.1`／faraday（**24.0 %**）と`qwen3.7-max`／haml
  （**38.4 %**）は、同じプロジェクトに対するSonnetのフィールドトライアルの数値と**完全に**一致する──
  モデルは数字をでっち上げるのではなく、実際にRigorを実行してその本物の出力を書き写したのだ。
- **条件分岐ロジックを尊重した**。 `minimax-m3`のプロジェクト（mangrove）にはすでに`.rigor.yml`が
  あった。モデルはそれを検出し（「`.rigor.yml`が存在するので`.rigor.dist.yml`を作成すべきではない」）、
  その`rigor-sorbet`プラグインにも言及した上で、作成ステップを正しくスキップした。
- **品質のばらつき（すべて正確）:** glm／qwen／deepseekはより充実したレポートを書いた（500〜627語、
  一部は`check`のエラーが`coverage`の上位の穴を裏付けると指摘）。kimi／mimoはより簡潔だった
  （300〜426語）が正確だった。

### 唯一の運用上の失敗── モデルの問題ではない

最初の試みは**6セッションを並列**で実行し、**5つ**を
`Error: Unexpected error / database is locked`で失った。これは`timeout waiting for initialize`
（`"ok": false`、`"model_verified": null`、約0秒）として表面化した。原因: **OpenCodeは全セッションを
単一のSQLiteデータベース経由で直列化する**（`~/.local/share/opencode/opencode.db`）。並行する
`opencode acp`プロセスがその書き込みロックを奪い合うのだ。同じ5つを**直列で再実行したところ毎回成功した**──
純粋な並行性のアーティファクトであって、能力の差ではない。

**教訓（skillに記録済み）:** OpenCodeのACPセッションは**直列で実行しなければならず、並列`&`／
バックグラウンドのバッチでは決して実行しない**── マルチモデル比較は`acp_run.py`を1つずつ
モデルにわたってループする。この教訓は`~/.claude/skills/acp-agent-runner/references/opencode.md`の
§ Gotchasと`SKILL.md`の「Model comparison」の例に書き込んだ。

## まとめ

1. **SKILL駆動UXはベンダー横断で可搬である**。 Claude以外の13モデルすべてが`rigor skill
   describe` → オンボード → `check`／`coverage --protection`を的確に駆動し、忠実に報告した──
   ADR-73の設計は特定のエージェントに依存しない。
2. **ラッパースクリプトのパターンが再利用可能なてこ**となる、公正なクロスモデルのツールテストにおいて。
   外部モデルには環境配線を隠す1本のコマンドを手渡し、シェル／nix／bundlerの習熟ではなくツール駆動能力を測る。
3. **OpenCodeは直列のみ**（SQLiteロックの教訓）であり、いまやskillに焼き込まれている。
