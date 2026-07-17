---
title: "インストールチャネルの評価 —— mise、Bundler、Homebrew、そしてコーパスが一度も確認していなかったもの"
description: "rigortype/rigor docs/notes/20260717-install-channel-evaluation.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260717-install-channel-evaluation.md"
sourcePath: "docs/notes/20260717-install-channel-evaluation.md"
sourceSha: "96fcb2a2c4378687bcdca989f04249873e94c44b237337515073464014a6fe85"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
translationStatus: "translated"
sidebar:
  order: 20266717
---

日付: 2026-07-17。

ステータス: **リサーチノート**。 これが生んだ設計上のコミットメントは
[ADR-95](../../adr/95-homebrew-tap-deferral/)（Homebrewの見送り）と3つの出荷済み
変更 —— パッケージングのガードレール（#114）、インストールドキュメントの訂正（#115）、
そして`rigor doctor`のGemfileインストールチェック（#116）だ。それ以外のここのすべてはエビデンスである。

素朴な問いに促された: `mise`は本当に正しい推奨なのか、Rigorを`Gemfile`に入れることは
私たちが言うほど本当に悪いのか、`brew tap`を提供すべきか、そして
`mise use -g ruby@4.0 gem:rigortype`はRubyのバージョンをまたげるのか？

[ADR-27](../../adr/27-tool-distribution-model/)はすでに配布モデルを所有しているので、
この大半は2026-05にそれが下した決定の再検討だ —— ただし、miseに関する主張がここでは
推論ではなく**計測された**という違いがある。

---

## 1. 混在の問題 —— 推論ではなく計測

**評決: `mise use -g ruby@4.0 gem:rigortype`はRubyのバージョンを混在させられない**。3つの層、
すべてメンテナーのマシン上の実際のインストールを解剖して確認した:

| 層 | エビデンス |
| --- | --- |
| ツールごとに隔離されたGEM_HOME | `~/.local/share/mise/installs/gem-rigortype/0.2.5/libexec/`がRigor自身の`rbs 4.0.3` / `prism 1.9.0`を保持する —— プロジェクトからもグローバルRubyからも不可視 |
| ラッパーがそれをハードコードする | `bin/rigor`は`GEM_HOME=".../libexec" exec .../libexec/bin/rigor`だ |
| binstubがインタプリタを固定する | 内側のbinstubはバンドルされた`ruby`シンボリックリンク → `installs/ruby/4.0/bin/ruby`を優先する —— **マイナーバージョン**のシンボリックリンクなので、4.0.xのパッチバンプは自動的に追従される |

直接のテスト: `mise.toml`が`ruby = "3.2"`を固定するディレクトリで、`ruby -v`は
3.2.9を報告する一方、`rigor --version`は0.2.5を報告し、動作する。

**記録に値する逆転: 混在するチャネルは素の`gem install`のほうだ**。 そのbinstubは
`#!/usr/bin/env ruby`で、呼び出し時に`PATH`上で最初に来るRubyへ浮動する —— だから
Ruby 3.xのプロジェクト内では`required_ruby_version`のアクティベーションに失敗する
（CocoaPodsの[#10512](https://github.com/CocoaPods/CocoaPods/issues/10512)の失敗
クラス）。ADR-27はエルゴノミクスでmiseを`gem install`より上位にランクした;その
ランク付けは、述べられなかった理由で正しい。今は[`01-installation.md`](../../manual/01-installation/)にある。

*（#116の開発中に偶然また確認された: `bundle exec`の外で`ruby -Ilib`を呼ぶと、
ネイティブ拡張が別のRubyに対してビルドされたグローバルな`rbs 4.0.2`を拾った ——
`linked to incompatible libruby`。この危険は理論上のものではない）*

## 2. 私たち自身のmiseドキュメントにある2つの現存する欠陥

どちらも、私たちが想定したものではなく、miseが実際に書くものを読んで見つけた。

**（a）共有バージョンの主張は誤りだった**。`mise use`は*要求した*精度を保存する。
`mise use ruby@4.0`は`ruby = "4.0"`を記録する;`mise use gem:rigortype`は保存すべき
要求バージョンを持たず、`"gem:rigortype" = "latest"`を記録する —— これは各マシンが、
*そのマシンが*最初にインストールするときに最も新しいものへ再解決する。にもかかわらず、
その章は`mise.toml`をコミットすれば「あらゆる貢献者が——そしてあらゆるCI実行が
——…同じRigorバージョンを解決する」と述べていた。使い捨てプロジェクトで検証:

```console
$ mise use gem:colorize        # → "gem:colorize" = "latest"
$ mise use --pin gem:colorize  # → "gem:colorize" = "1.1.0"
```

**（b）固定されたツールは決して遅れていると報告されない**。`mise upgrade`と
`mise outdated`はどちらも、インストール済みバージョンを*設定が要求する範囲*と比較し、
正確な固定（pin）はそれ自身だけを含む範囲だ:

```console
$ cat ~/.config/mise/config.toml   # "gem:rigortype" = "0.2.5", while 0.2.9 is current
$ mise up gem:rigortype            # → "All tools are up to date"
$ mise outdated                    # → "All tools are up to date"
$ mise up --bump --dry-run gem:rigortype
Would install gem:rigortype@0.2.9
```

それは固定が機能しているのであってバグではない —— しかしそれは、固定されたセットアップには
**新しいRigorが存在するという受動的なシグナルがない**ことを意味する。これが見つかった
メンテナーのマシンは、4つのリリースにわたって0.2.5に留まっていた。両方の欠陥は#115で修正された。

## 3. Gemfileインストールは本当に悪いのか？

答えは3つの異なる答えであり、ADR-27は最初のものしか述べていなかった。

1. **Ruby ≠ 4.0（解析対象のほぼすべてのプロジェクト）—— 「悪い」のではなく、不可能だ**。 公開済みの
   39個の`rigortype`バージョンはすべて`>= 4.0.0, < 4.1`を要求する（RubyGems API）ので、`bundle add`は
   解決できず、古い寛容なバージョンにこっそり着地することもできない。フェイルファストは健全だ。欠けているのは、
   Bundlerのエラーが衝突を名指しするだけで修正を決して名指ししないことで、そのため自然な次の一手が
   破壊的な回避策（`.ruby-version`を書き換える、`--ignore-dependencies`に手を伸ばす）になることだ。
2. **Ruby = 4.0 —— 成功するがゆえに、より悪い**。`bundle add`は動作し、次の起動まで何も問題ない。その
   起動で`Bundler.require`（gemをその*gem*名でrequireするが、私たちのライブラリのエントリーは`rigor.rb`だ）が
   素の`LoadError`で死ぬ。遅延した罠だ。
3. **隔離された`Gemfile` —— すでに私たち自身の推奨だ**。
   [`11-ci.md`](../../manual/11-ci/)は固定のために`.github/rigor/Gemfile` + `BUNDLE_GEMFILE`を
   推奨しており、Dependabotも含む。

つまり**敵はルートGemfileの汚染であって、Bundlerではない** —— コーパスが暗黙に抱えつつどこにも
記録しなかった区別であり、Bundlerを使いたい読者に禁止だけを残しサポートされる代替を残さなかった。
ルートGemfileのエントリーが正しい答えであるようなユーザーは存在しない: それが買う固定は、そのコストなしに手に入る。

正直な釣り合いとして記す価値がある: ADR-27の*依存関係の衝突*という論拠はSteep / ruby-lspへの類推であり、
Rigor自身の3つの依存については一度も計測されていない。計測する必要はない —— 論拠（1）が機械的で十分だからだ。
そしてコーパスで唯一フィールド計測されたインストール欠陥は、Gemfile側ではなく**スタンドアロン**側にある
（[ADR-90](../../adr/90-target-library-resolution-from-project-bundle/)のactivesupportのインフレクター、
メンテナーの開発バンドルによってマスクされていた）。

## 4. エコシステムの規範

| ツール | 公式の推奨 | 注記 |
| --- | --- | --- |
| RuboCop | `gem install`;Gemfileは**`require: false`付き**で許可 | 決してアプリにロードされてはならない |
| Steep / TypeProf | `gem install`（README） | どちらもGemfile優先を推していない |
| Sorbet | Gemfile、明示的に | **ランタイム**コンポーネント（`sorbet-runtime`）を持つ —— 最も強いバンドル必須のケース |
| PHPStan | `composer require --dev` | pharの依存がPHP-Scoperでプレフィックスされている*から*動作する;Rubyに同等の隔離はない |
| Psalm | `composer require --dev`、依存が衝突するときはphar | 衝突がドキュメント化された脱出口だ |
| foreman | **「プロジェクトの`Gemfile`にforemanをインストール*しない*よう注意すること」** | 「ライブラリではない」の前例 |
| fastlane | Gemfile + `bundle exec`、明示的に | 反対の前例 |

Rigorは**ランタイムコンポーネントがゼロ**なので、Sorbetがバンドルされねばならない構造的理由は
当てはまらず、PHPStanが安全にバンドルされることを可能にするメカニズムはRubyには存在しない。
`foreman`が最も近い前例だ。

## 5. Homebrew —— このノート以前に一度も評価されていない

発見（決定については[ADR-95](../../adr/95-homebrew-tap-deferral/)を参照）:

- **Rubyの静的解析ツールはhomebrew-coreにそもそも1つもない** —— `rubocop`、`steep`、
  `typeprof`、`sorbet`、`brakeman`はない。（coreの`standard`は*JavaScript*のstandardjsだ。）
  あるのは`fastlane`、`cocoapods`、`ruby-lsp`だ —— すべてはるかに大きい。
- **coreの注目度（notability）**は30以上のフォーク / 30以上のウォッチャー / 75以上のスターを要し、
  **自己申請では3倍**（90以上/90以上/225以上）になる。rigortypeは今日それをクリアしていない。
- **formulaのパターンは踏み固められている**（`ruby-lsp`: `depends_on "ruby"`、
  `GEM_HOME=libexec`、`bin.env_script_all_files`）し、リリースごとのバンプは
  `brew bump-formula-pr`で自動化される。著作はコストではない。
- **コストは、私たちの`< 4.1`の上限に対するbrewの`ruby`のチャーンだ**。Homebrewの`ruby`は
  最新を追う;それに依存するformulaは両者が食い違うたびに壊れ、Homebrew自身のCookbookは、
  依存関係が非互換に動いたとき依存側に`revision`バンプを要求する。これはCocoaPodsの
  「呼び出すRubyとは別のRubyでインストールされた」という失敗クラスであり、意図的に取り込まれたものだ。
- 脱出口は**[ADR-27](../../adr/27-tool-distribution-model/)のWD5の単一バイナリ**だ
  （[tebako](https://github.com/tamatebako/tebako)が2026年で唯一メンテされている選択肢 ——
  ruby-packerは放棄、traveling-rubyは休眠）。これは`depends_on "ruby"`を、そしてそれと共にチャーンを取り除く。

## 6. 未解決の断片

- **`gem exec rigortype check`**（RubyGems ≥ 3.4.8、2023）はインストールなしで走る。
  導入時に実験的とラベルされて以来、安定と宣言されたことはない;チャネルとしてではなく、
  READMEの「試してみる」の一行としてなら妥当だ。
- Rubyの解析CLIに**公式Dockerイメージの前例はない**（Docker Hub上のrubocop/steepイメージは
  コミュニティ運営だ）。私たちのものはすでにドキュメント化された最終手段だ。
- **Windowsネイティブ（非WSL、非コンテナ）**には依然としてファーストクラスの経路がない。
- **ありうる内部的な不整合、未着手:**
  `plugins/rigor-rails/lib/rigor-rails.rb:15`は、プラグインのメタgemのGemfileエントリーは
  「無害だ」と言う（[ADR-12](../../adr/12-dry-rb-packaging/)のGemfile利便性パターン）が、
  一方で今日のプラグインは`rigortype`の*内部*で出荷される（`spec.require_paths`は
  `plugins/*/lib`を含む）。「rigortypeはGemfileにあってはならないが、プラグインgemはあってよい」が
  依然として成り立つかは、一見の価値がある。
