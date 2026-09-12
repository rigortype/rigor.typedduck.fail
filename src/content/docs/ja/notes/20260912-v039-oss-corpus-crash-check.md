---
title: "rigor-survey OSSコーパス —— v0.3.9カット前クラッシュチェック"
description: "rigortype/rigor docs/notes/20260912-v039-oss-corpus-crash-check.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260912-v039-oss-corpus-crash-check.md"
sourcePath: "docs/notes/20260912-v039-oss-corpus-crash-check.md"
sourceSha: "d7508a8c1cd610a5f6588373b29a1078d2d6a99c029f05c1b0624ad6f8ea18b1"
sourceCommit: "568138c239ec5b7b39833ed6a2a21fd027e3d319"
sourceDate: "2026-09-12T08:22:41+09:00"
translationStatus: "translated"
sidebar:
  order: 20266912
---

ステータス: リサーチノート、設計上のコミットメントなし。2026-09-12に**Rigor 0.3.9**（`release/0.3.9`チェックアウト、ツリーから`exe/rigor`を実行）に対して取得。コーパス: `/Users/megurine/repo/ruby/rigor-survey`下の34プロジェクト —— アナライザーがゲートされているOSSターゲット（Mastodon、Redmine、GitLab FOSS）に加えて、より広範なライブラリセット。

## 問い

`make verify`がgreenであることは、アナライザーが実際のコードベースに初めて出会ったときの挙動については何も語りません。これはサーベイコーパス全体に対するカット前のスモークパスです: 0.3.9はどこかで**クラッシュ**するか？ —— `internal analyzer error`、致命的なアボート、RBS環境ビルド失敗、プラグインの例外、または通常の実行が使用する2つ以外の終了ステータスなど。

## 方法

すべてのプロジェクトは、`release/0.3.9`ツリーの`exe/rigor`を用い、バンドルされたプラグインがチェックアウトからロードされるよう`BUNDLE_GEMFILE=<rigor>/Gemfile`を指定したNix Flake内で解析されました。

- **バッテリー1 —— `check`**: `check --no-baseline --no-ci-detect`、プロジェクトごとに2回 —— コールド（`--clear-cache`）とウォーム（キャッシュ読み取り）。`--no-baseline`は、陳腐化したベースラインバケットがクラッシュ行を黙らせないようにします。34プロジェクト × 2 = **68回実行**。
- **バッテリー2 —— その他の解析コマンド**: `triage --format json`、`coverage`、`unused`、`sig-gen --print`、`doctor`、`plugins`、および代表的なファイルに対する`annotate`。34 × 7 = **238回実行**。

両ストリームからスキャンされたクラッシュシグナル: `internal analyzer error`、`rigor: analysis aborted`、`SystemStackError` / `NoMemoryError`、`rbs.coverage.{environment,definition,hkt}-failed`、プラグインの`runtime-error`、`lib/rigor/*:in`バックトレースフレーム、および`{0, 1}`以外の終了ステータス（致命的な実行は70; killedは124/128+）。

## 結果: 306回の実行でクラッシュなし

上記のすべてのシグナルについて、両バッテリーとも皆無でした。`check`は全68パスで0/1で終了しました;バッテリー2の7つのコマンドは全238パスで期待されるセット内に留まりました;コールドとウォームは一致しています。

記録する価値のある予測数値（4大ターゲット）:

| ターゲット | ファイル数 | コールド | ウォーム | コールドpeak RSS |
| --- | --: | --: | --: | --: |
| GitLab（`app`+`lib`） | 11,344 | 487.9 s | 1 s（キャッシュヒット） | 6.9 GB |
| rails（コンポーネント`lib`群） | 1,445 | 17.7 s | <1 s | 910 MB |
| Mastodon（`app`+`lib`） | 1,325 | 15.5 s | 1 s | 802 MB |
| Redmine（`app`+`lib`） | 347 | 11.6 s | <1 s | 425 MB |

GitLabのコールドとウォームの`check`出力はバイト単位で同一であり、ウォームパスは1秒のADR-87 WD4実行キャッシュヒットでした —— キャッシュは、捏造されたものではなく、書き込んだものと同じ診断セットを提供しました。GitLabのコールド実行は2321 s（7月の測定、当時の`app`+`lib`）からここでは488 sへと減少しました;対象ファイル数は同じ11,344です。

## クラッシュ以外の非ゼロ終了

`rigor coverage`はパースエラー時に非ゼロとなることが文書化されているコマンドであり、5つのターゲットがこれを通じて1で終了します: `jbuilder`と`redmine`はRailsジェネレータのERBテンプレート（`templates/*.rb`、RubyとしてパースされたERB —— [OSSライブラリサーベイ](../20260519-oss-library-survey/)に記録されている既存のコーパス成果物）、および教材スニペットに真に不正なRubyが含まれている3つの演習リポジトリ一式（`Algorithms-and-Data-Structures-in-Ruby`、`Data-Structures-and-Algorithms-in-Ruby`、`Ruby`）。クラッシュではなく、ターゲット側のパースエラーです。

## 環境の落とし穴であり、Rigorの検知事項ではない

バッテリー2の最初の試みでは、単一の`nix develop`シェルの下ですべてのプロジェクトを実行しました。途中でNixストアのGCがdev-shellクロージャを削除しました;コマンドのルックアップはホストのHomebrew Ruby 4.0.6にフォールスルーし、ネイティブ拡張のABI不一致（`linked to incompatible ... libruby-4.0.5`）により`require`時に49回の実行が死亡しました。`/nix/store`外の`ruby`を拒絶する事前チェック（preflight）の背後で、各プロジェクトをそれぞれ新しい`nix develop`で再実行したところ、すべて解消しました。バッテリー1はGCの前にすでに終了しており影響を受けませんでした —— その出力はいずれもバックトレースフレームを保持していません。ホストRubyのABI不一致はRigorの結果ではありません;それゆえにハーネスは現在インタプリタをピン留めしています。

## カバレッジ境界

スイープ対象: `check`（コールド + ウォーム）および7つのバッテリー2コマンド。スイープ対象外: `--incremental` / `--verify-incremental`およびエディタモード、`effects`、`type-of` / `type-scan` / `trace`、`sig-gen --write`、`diff` / `baseline`、`init`、ならびに`lsp` / `mcp` stdioサーバー。「クラッシュなし」とは、これら34ターゲットにおけるスイープ対象サーフェスに関する言明であり、アナライザーに関する証明ではありません。

## 再現手順

ドライバと生出力はツリー外の`/Users/megurine/repo/ruby/rigor-survey/_reports/crashcheck-0.3.9/`にあります: `driver.sh` + `extract.rb`（バッテリー1）、および`driver2.sh` / `driver2b.sh` / `one_project.sh` / `extract2.rb`（バッテリー2）。`run/`および`run2/`の下に実行ごとのstdout / stderr / 終了ステータスがあります。
