---
title: "TAKTトライアルセットアップ（2026-09-21）"
description: "rigortype/rigor docs/notes/20260921-takt-trial-setup.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260921-takt-trial-setup.md"
sourcePath: "docs/notes/20260921-takt-trial-setup.md"
sourceSha: "3c15cc1c15d35f4e07faaf0706358efe3105b95b6eccfa352a4c72353a3ef3a3"
sourceCommit: "b5af5cf72f6b666f74479df959b1ee467feda5c6"
translationStatus: "translated"
sidebar:
  order: 20266921
---

長時間実行される品質安定したエージェントループ対ロール拘束されたpiパッケージに関する[ADR-115](../../adr/115-pi-multi-model-harness/)の評価のコンパニオンドキュメント。

## インストール済み

- `mise use -g npm:takt@0.66.0`（mise shim経由でPATH上のCLI）
- グローバル設定: `~/.takt/config.yaml` ── `language: ja`、デフォルト`provider: mock`（`--provider`で実行ごとにオーバーライド）

## スモークテスト

- `takt workflow doctor pure simple review` ── OK（jaビルトイン）
- `takt --provider mock --pipeline --skip-git -w pure -t "…"` ── エンジンが起動; mockは最初のステップで`rule_no_match`により失敗（期待どおり;実際のエージェントではないため）

## このマシン上で利用可能なプロバイダ

- `claude`（Claude Code 2.1.278）
- `pi`（mise経由で0.86.0）
- `opencode`

## 次の実際のトライアル（手動／アテンド付き）

master上での完全な`default`ループではなく、ごく小さなドキュメントのみ、または使い捨てのタスクを推奨:

```bash
cd ~/repo/ruby/rigor
takt --provider claude -w pure   # インタラクティブ: タスクを記述、/go、Queue as task
takt run                         # worktree隔離された実行
```

評価軸（変更なし）:

1. レーン契約（push-and-end）対TAKTの長時間生存ステップ
2. 長時間の品質安定ループ（`review-fix` / `default`）
3. マルチプロバイダの混在（claude / pi / opencode）

`.takt/runs/`、`.takt/tasks/`、クレデンシャルをコミットしてはならない。

## トライアル結果

**人間によるpush＋外部CIポーリング＋再開**を経て、ドラフトPR #1144経由で#1090上で`rigor-ready-for-agent`が完了した（エンドツーエンドの無人実行ではない）。

Claude／エージェントセッション内部で観察されたボトルネック:

1. 非インタラクティブな`git push` / `gh pr create`にはしばしば人間の承認が必要となる。
2. セッション内でのCI待機は、sleep/monitorが拒否されるとストールする ── オーケストレーターがポーリングごとのツール承認なしに待機できるようになるまでは、外部ポーリング＋再開が機能する。

これらの知見は[ADR-115](../../adr/115-pi-multi-model-harness/)（pi対taktの相補性、WD4/WD6、帰結）に反映される。
