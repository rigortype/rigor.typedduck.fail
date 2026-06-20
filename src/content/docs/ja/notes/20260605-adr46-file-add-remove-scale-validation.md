---
title: "ADR-46ファイル追加／削除 — スケール検証（実OSSライブラリ）"
description: "rigortype/rigor docs/notes/20260605-adr46-file-add-remove-scale-validation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260605-adr46-file-add-remove-scale-validation.md"
sourcePath: "docs/notes/20260605-adr46-file-add-remove-scale-validation.md"
sourceSha: "08d392a5f5d830834ba0b624922caec9c0841b4f5c99c8b794667c3a9cd18ecc"
sourceCommit: "73d7a0a2d4628b0614948fe2fa043945b45d5de4"
translationStatus: "translated"
sidebar:
  order: 20266605
---

2026-06-05. ADR-46スライス3の**ファイル追加／削除**インクリメンタル（incremental）層を、合成的なedit駆動specの範囲を超えて実OSSコードでスケール検証した結果。フルランとのバイト単位の一致、および期待どおりのリーフ対ハブの精度を確認した。

## 手法

各プロジェクトについて、`liquid/lib`と`mail/lib`をtmpdirにコピーし、その上で`IncrementalSession`のベースラインを取得。代表的なファイルごとに、そのファイルを**削除**して`#recheck`を実行し、マージ済みのDiagnosticsを（ソート済み・構造的な`Diagnostic#to_h`として）フルの`--no-cache`再解析と比較した。次にそのファイルを**復元**して同じ比較を行った。各ステップで`recheck == full`が成り立つことが健全性（soundness）の条件であり、キャッシュから陳腐化した診断が返されないことを意味する。

これは`--verify-incremental`（変更を行わず、変更のないツリーを分割するだけ）のedit駆動版に相当する。コーパス依存のスケール確認はCIのコミットテストではない（CIにはsurveyコーパスがない）。コミット済みの健全性カバレッジは`spec/rigor/analysis/incremental_session_spec.rb`内の合成的なadd/remove specである。

## 結果

`--verify-incremental`（変更なしツリーのサブセット／キャッシュ／マージオラクル）は、ルーツをキーとしたフィンガープリント（fingerprint）と周辺機構が実コードでも正しく機能することを確認した:

| プロジェクト | ファイル数 | 再解析数 | 結果 |
|---|---:|---:|---|
| liquid/lib | 64 | 32 | OK — フルと一致（13診断） |
| kramdown/lib | 55 | 28 | OK — フルと一致（14診断） |

edit駆動の削除＋再追加（各ステップで`recheck == full`のバイト一致）:

| プロジェクト | ファイル数 | 削除ファイル | 削除時の再解析数 | 再追加時の再解析数 | バイト一致 |
|---|---:|---|---:|---:|:---:|
| liquid/lib | 64 | `standardfilters.rb`（リーフ） | 0 | 1 | ✓ |
| liquid/lib | 64 | `condition.rb` | 1 | 1 | ✓ |
| liquid/lib | 64 | `block.rb`（基底クラス） | **9** | 10 | ✓ |
| liquid/lib | 64 | `tags/for.rb`（リーフ） | 0 | 1 | ✓ |
| mail/lib | 111 | `message.rb` | 1 | 2 | ✓ |
| mail/lib | 111 | `body.rb` | 0 | 1 | ✓ |
| mail/lib | 111 | `header.rb` | 0 | 1 | ✓ |
| mail/lib | 111 | `field.rb` | 0 | 1 | ✓ |
| mail/lib | 111 | `configuration.rb` | 0 | 1 | ✓ |

## 読み方

- **すべてのケースでバイト一致**。削除・再追加のいずれも、編集後のツリーをフル再解析した場合とバイト単位で一致するDiagnosticsを生成した。合成フィクスチャだけでなく、多様な実コードでも健全性が成り立つことが確認できた。
- **リーフ対ハブの直観は正しい**。`Liquid::Block`基底クラスを削除すると**9つのdependents**（そのサブクラスと使用箇所）が再確認され、一方リーフのフィルタ／タグを削除すると**0件**になった。これはまさに設計が目指す依存グラフの精度である。再追加時は、追加されたファイル自体とその名前を再び参照するコンシューマー（1〜2ファイル）が再確認される。
- liquid／kramdownでの`--verify-incremental`パスにより、ルーツをキーとしたスナップショットフィンガープリント（ファイル追加／削除の基盤）が、変更なしツリーのサブセット／キャッシュ／マージパスを壊していないことが確認された。

## 再現手順

Flakeシェル内で`~/repo/ruby/rigor-survey/<proj>/lib`をtmpdirにコピーし、`File.delete`／`File.write`前後で`Analysis::IncrementalSession#{baseline,recheck}`を呼び出し、`sorted(recheck.diagnostics)`と`sorted(full)`を比較する（本ノートのコミットメッセージ内の使い捨てspecの形状、または合成specを参照）。`--verify-incremental`はワンショットのCLI形式:
`cd <proj> && BUNDLE_GEMFILE=<rigor>/Gemfile bundle exec <rigor>/exe/rigor
check --verify-incremental --no-stats lib`。
