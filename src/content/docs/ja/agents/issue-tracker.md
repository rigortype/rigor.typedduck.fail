---
title: "イシュートラッカー: GitHub"
description: "rigortype/rigor docs/agents/issue-tracker.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/agents/issue-tracker.md"
sourcePath: "docs/agents/issue-tracker.md"
sourceSha: "86e023bdb67eb9314d8d05477284a11b9f2e142923a82cabf1d55af047454705"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
translationStatus: "translated"
sidebar:
  order: 9050
---

このリポジトリのissueとPRDは、`rigortype/rigor`上のGitHub issueとして存在する。すべての操作には`gh` CLIを使うこと;cloneからリポジトリを推測してくれる。

**GitHub Issuesがバックログだ**（[ADR-98](../../adr/98-development-flow-document-roles/)）: 中期・長期のあらゆる作業項目はここに存在し、追跡されるMarkdownファイルにはない。リリース計画は**Milestones**というサーフェス（`v0.3.0`、`v1.0.0`）だ ——「次のカットが何を運ぶか」はissueをマイルストーンに割り当てることで表現される。

## 慣習

- **issueを作成する**: `gh issue create --title "..." --body "..."`。複数行の本文にはヒアドキュメントを使う。1つの`area:*`ラベルと1つのトリアージラベルを付ける（`triage-labels.md`を参照）。
- **issueを読む**: `gh issue view <number> --comments`。
- **issueを一覧する**: `gh issue list --state open --json number,title,labels`（`--label` / `--milestone`フィルタ付き）。
- **コメントする**: `gh issue comment <number> --body "..."`。
- **ラベル**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`。
- **クローズする**: `gh issue close <number> --comment "..."` —— 作業が着地したら、PRから（`Closes #N`）クローズし、痕跡が残るようにすること。
- issueの本文は**自己完結的**にすること: バッククォートで囲んだリポジトリパス（`docs/adr/50-...md`）、`#N`参照、そして存在するなら受け入れゲート。将来の読者はそのissueしか持たない。

## トリアージのサーフェスとしてのプルリクエスト

**リクエストのサーフェスとしてのPR: あり**。このリポジトリは公開の場で開発され、外部PRはコード付きの機能リクエストだ;`/triage`は外部PRをissueと同じラベルとステートで処理する。

- **PRを読む**: `gh pr view <number> --comments`、差分には`gh pr diff <number>`。
- **トリアージ対象の外部PRを一覧する**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`とし、`authorAssociation`が`CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR`、`NONE`のものだけを残す（`OWNER` / `MEMBER` / `COLLABORATOR`は除外する —— コラボレーターの進行中のPRはそのままにしておく）。
- **コメント / ラベル / クローズ**: `gh pr comment`、`gh pr edit --add-label` / `--remove-label`、`gh pr close`。

GitHubはissueとPRで1つの番号空間を共有する —— 素の`#42`は`gh pr view 42`で解決し、だめなら`gh issue view 42`にフォールバックすること。

## スキルが「イシュートラッカーに公開せよ」と言うとき

GitHub issueを作成する。

## スキルが「関連するチケットを取得せよ」と言うとき

`gh issue view <number> --comments`を実行する。
