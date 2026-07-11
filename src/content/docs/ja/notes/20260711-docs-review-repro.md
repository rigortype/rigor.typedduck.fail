---
title: "L2の手順再現レビュー —— 01-installation.md + 14-rails-quickstart.md"
description: "rigortype/rigor docs/notes/20260711-docs-review-repro.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260711-docs-review-repro.md"
sourcePath: "docs/notes/20260711-docs-review-repro.md"
sourceSha: "ef6ae3e8995ffa8772f91aa11a44bcb8421fa2e5c49077689352607263cf8758"
sourceCommit: "4c03f62d04f594030bd79aa00f3a5978e0457d4c"
translationStatus: "translated"
sidebar:
  order: 20266711
---

日付: 2026-07-11。レンズ: 各手順を文章だけから再現し、外部知識なしには
完了できないステップを洗い出す。動作確認したRigorのバージョン:
`rigor 0.2.8`（リポジトリ`master`、dirtyツリー）。

実行メモ（ドキュメントの欠陥ではない）: 公開されている`rigor …`の呼び出しは、
インストール済みgemに対しては正しい。本リポジトリではスクラッチディレクトリから
`BUNDLE_GEMFILE=<rigor>/Gemfile nix develop <rigor> -c bundle exec <rigor>/exe/rigor …`
を実行して代替した——Flakeシェル環境固有の事情にすぎない。

## 実際に実行して検証したこと

- `rigor --version` → `rigor 0.2.8`。✓（ch14 Step 1）
- `rigor baseline generate` → `wrote baseline to .rigor-baseline.yml`と、
  有効化には`baseline:`を追加せよという注記。✓（ch14 Step 6）
- `rigor skill --list` / `--path rigor-project-init` / `skill rigor-project-init`
  （本文の表示）—— ヘッダーはドキュメントの記述と完全に一致（絶対的な
  SKILLパス＋`references/`ディレクトリ＋本文）。✓（ch14 Path A）
- `rigor sig-gen --write`フラグは存在する。`rigor triage --format json`は存在する。✓
- ch14 Step 3の`.rigor.dist.yml`を記載どおりの形（target_ruby、
  paths、exclude、plugins、`severity_profile: lenient`）で作成し、小さな`app/foo.rb`も用意。
  パス引数なしで`rigor check`を実行 → 設定は読み込まれ、`paths:`は尊重され、
  `severity_profile: lenient`は受理され、プラグインは読み込まれた。✓（ch14 Steps 3–4）
- マニュアルの相互参照ファイルはすべて存在する（06/07/09/11/14、plugins/README.md、
  skills/rigor-project-init/SKILL.md、adr/72）。アンカー`#set-up-in-your-language`、
  `#path-a-…`、`#path-b-…`は解決する。✓

## 所見

| ステップ（章:行＋引用）| 再現を妨げるもの | 深刻度 | 提案する修正 |
| --- | --- | --- | --- |
| 14:291 `rigor baseline generate` | コマンドは動作するが、**`rigor --help`のコマンド一覧に載っていない**（ヘルプはベースライン用に`baseline`ではなく`diff`を表示する）。動詞を確認しようと`rigor help`を実行した読者はこれを見つけられず、ドキュメントを疑うかもしれない。正確なコマンドが示されているので再現可能。| nitpick | `rigor --help`に`baseline`を載せるか、（ドキュメント側では）変更不要—— 正確なコマンドが読者を導く。CLI側の修正が望ましい。|
| 01:289–297 asdfブロック: 「[`asdf-ruby`]プラグインでRuby 4.0.xをインストール … `asdf install ruby latest:4.0`」| asdfに不慣れな読者にとって、`asdf plugin add ruby`を実行するまで`asdf install ruby`は失敗する。ドキュメントはプラグインのリポジトリをリンクしているものの、`asdf plugin add ruby`のステップには一切触れていないので、asdf初心者はページを離れざるを得ない。| FRICTION | `asdf install`の前に1行追加する: `asdf plugin add ruby`（または「先にasdf-rubyプラグインを追加する」と注記する）。|
| 14:150–166 Step 2のモード「Acknowledge」「Strict」対 14:199 `severity_profile: lenient   # "strict" … omit for "balanced"` | 2つの語彙が衝突する: 採用*モード*はacknowledge/strict、`severity_profile`の値はlenient/strict/balanced。acknowledge→`lenient`の対応づけは例の設定に暗黙的に示されるだけなので、acknowledgeモードの読者はどのプロファイル文字列を使うか推測しなければならない。| nitpick | Step 3に1文: 「acknowledgeモード → `severity_profile: lenient`、strictモード → `strict`」。|
| 14:30–31 「[Installing Rigor § Putting rigor on your PATH](../01-installation/)を参照」| リンクテキストはセクション（`§ Putting rigor on your PATH`）を指しているが、リンク先には`#putting-rigor-on-your-path`アンカーがなく、ファイルの先頭に着地する。そのセクションは存在する（01:258）ので、読者はスクロールする必要がある。壊れてはいないが不正確。| nitpick | アンカーを付ける: `(01-installation.md#putting-rigor-on-your-path)`。（ch14:54は01へのリンクに正しくアンカーを付けているので、このパターンはすでに使われている。）|

BLOCK深刻度のギャップは見つからなかった。前提条件（Ruby 4.0、mise導入＋
シェル連携済み、既知のパスにある既存のRailsプロジェクト）はすべてch14の
「Before you start」で明示されている。順序は健全だ: `mise.toml`はStep 7でコミットされる前の
Step 1で作成され、設定はStep 4の最初の`rigor check`より前に存在し（Step 3）、
ベースラインは`baseline:`のコメントを外してコミットする（Steps 6–7）より前に生成される（Step 6）。
Path Aは「スキルを呼び出す」と正しく枠付けされているので、その内部フェーズ（sig-gen/triage/baseline）は
スキルの仕事であり、読者のステップではない。

## 評価

有能なRubyの開発者なら、どちらの手順も文章だけから完了できる。
文書化されたコマンドはすべて記述どおりに動作し、相互参照はすべて解決する。
クイックスタートが作成するよう指示する設定は、記載されたとおり正確に`rigor check`に
読み込まれる。唯一の実質的な引っかかりはasdfのパスで、`asdf plugin add ruby`の
前提を省いているためasdf初心者をページの外へ追いやってしまう（FRICTION）。
残りは些末な問題だ: 動作するがヘルプに現れない`baseline`動詞、暗黙的な
モード→`severity_profile`の対応づけ、そしてアンカーの欠けたセクションリンク1つ——
どれも読者がセットアップを完了するのを妨げるものではない。
