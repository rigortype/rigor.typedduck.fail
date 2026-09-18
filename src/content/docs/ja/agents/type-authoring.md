---
title: "型作成の契約"
description: "rigortype/rigor docs/agents/type-authoring.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/agents/type-authoring.md"
sourcePath: "docs/agents/type-authoring.md"
sourceSha: "71465d0f00f855e4ec6ac2fe7154899960b7739b926ab6c1a68124250fea8f5b"
sourceCommit: "5fab9b52937efba652b9f6ecde1bb0a9954a9f77"
sourceDate: "2026-09-18T14:23:03Z"
translationStatus: "translated"
sidebar:
  order: 9050
---

タスクが型を記述またはアサートするとき、`.rbs`を編集するとき、インラインRBSアノテーションを追加するとき、あるいはコメント、ドキュメント、レビューで型を説明するときにこれを読んでください。これは`AGENTS.md`の恒常的なポインタに対する条件付きの詳細情報です。

## 出自（Provenance）

Rigorが生成または検査していない型を書き留めてはなりません。周囲のコードや既存のコメントからではなく、Rigorから学んでください ── `rigor type-of`、`rigor annotate`、または`rigor sig-gen --print`を使用します。

型は`sig/`、検査済みのインライン`#:` / `# @rbs`アノテーション、または推論として存在します。同じメンバーを宣言している場合は`sig/`が優先されます。インラインアノテーションを追加するのは、名前やコードが語っていない事柄（`void` / `bot`の意図、`:asc | :desc`のような非ノミナルのリファインメント、パラメータ契約など）を述べるときだけにしてください。Rigorがすでにメソッド上で示しているノミナル型を繰り返すことはノイズです。

## コメント

`.rb`ファイルにおいて、コメントに型を含めてはなりません。YARDタグには型を付けず、名前の後にダッシュ（—）を使用します：`@param name — description`、`@raise ExceptionClass — description`、および`@return description`。

コメントは、コードやシグネチャが語っていないこと（根拠、型システムで表現できない制約、`nil`の意味、ADRやissue、偽陽性の境界、却下された代替案など）を説明します。名前、型、またはシグネチャを言い直してはいけません。ゲートとなるのは`spec/docs/type_shaped_comments_spec.rb`です。

## RBS

手書きやAIが作成したRBSよりも、`rigor sig-gen --print` / `--diff`を優先してください。推論のギャップはエンジンに関するシグナルであるため、まずは生成された出力を提案し、ユーザーがその代替案をレビューした後にのみ手動で編集してください。タスクがそれを許可している場合は、既存の`.rbs`を修正して構いません。

このリポジトリの外部では、導入先プロジェクトがそれをインストールしている場合、同梱されている`rigor-type-oracle`スキルが同じ出自ルールを担います。そうでない場合は、そのプロジェクトの契約に従ってAI作成のRBSを扱ってください。

規範的な理由は、[ADR-107](../../adr/107-checked-types-and-typeless-comments/)、[ADR-108](../../adr/108-type-provenance-for-agents/)、および[ADR-14](../../adr/14-rbs-sig-generation/)を参照してください。
