---
title: "Plugin doc migration playbook (the \"(ii)\" split)"
description: "Imported from rigortype/rigor docs/notes/20260603-plugin-doc-migration-playbook.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260603-plugin-doc-migration-playbook.md"
sourcePath: "docs/notes/20260603-plugin-doc-migration-playbook.md"
sourceSha: "0a5ef516c683a52363e1e144b3a7af07f3259c15a5de28ff1e12225879cb2150"
sourceCommit: "6e5bd55274e20dfb59183559c4971d34f878c907"
translationStatus: "translated"
sidebar:
  order: 20266603
---

プラグインごとのドキュメント移行を引き継ぐ、新規／巻き戻しされたセッション
向けの自己完結型ハンドオフです。これに**加えて** [`docs/CURRENT_WORK.md`](../../current-work/)
§「Documentation overhaul」のチェックリストも読んでください。この両方が
あれば、元のセッションが蓄積したコンテキストなしに同じ品質で作業を続け
られます。

これは**ドキュメントのみ**のトラックです（エンジン／仕様のコードは触りま
せん）。コミットは`master`に積みますが、プッシュはしません。

## 決定事項

ユーザー向けのプラグインごとのドキュメントは公開マニュアルに置き、ツリー内
のREADMEには開発者向け／契約（contract）の資料を残します。**シングルソース
化し、重複させません。**

- **ユーザーページ** → `docs/manual/plugins/<id>.md`（何を検査／推論する
  か、設定、制限事項）。
- **README**（`plugins/<id>/README.md`） → 内部実装（レイアウト、アーキテ
  クチャ、デモ、行使するプラグイン契約のサーフェス（surface））をスリム化し、
  先頭にユーザーページへのポインタを置く。
- **インデックス** → `docs/manual/plugins/README.md`（プラグインごとに1行）。
  すでに`docs/manual/README.md`の項目7に組み込み済み。

**完了——31個中31個**（すべてのチェッカープラグインがページを持つ;
`rigor-playground`は意図的にページなしのインフラ）。このプレイブックは、
将来のプラグイン追加のための手法リファレンスとして保持されています——
プラグインごとのコミットはCURRENT_WORKチェックリストを参照してください。

## 重要: コピーするのではなく、突き合わせる

最も重要なルールです。多くのプラグインのREADMEは**v0.1.0着地時点で凍結**
されており、出荷済みの挙動に対して実質的に陳腐化しています。READMEをマニュ
アルにコピーすると陳腐化した記述を再公開することになります（実際に一度発生
し、修正が必要になりました）。各プラグインについて、**書く前に現在の挙動を
検証**してください:

1. `grep -niE "rigor-<id>" CHANGELOG.md` ── プラグイン着地以降のすべての
   挙動エントリーを読む（横断的な定型エントリーはスキップ:
   `config_schema` / `Source::Literals` / `node_rule`移行 / メタgemの
   scaffold）。
2. プラグインのソースを読む: マニフェスト（`config_schema`、
   `consumes:` / `produces:`、`signature_paths:`）とアナライザー／パーサ
   （実際に扱うルールIDとシェイプ（shape））。
3. **現在の**ケイパビリティ（capability）／制限事項のセットを書く。
   **READMEの凍結された`(v0.1.0)`スコープリストは破棄する**（「Recognised
   DSL surface（v0.1.0）」「Out of scope（v0.1.0）」）。

### 繰り返し現れる陳腐化パターンのカタログ（各プラグインで確認すること）

これらはとくにRailsファミリー全体で繰り返し現れます。それぞれ、このパスの
最中に行われた実際の修正です:

1. **タイトルの不要物**。`# rigor-<id> — example Rigor plugin`（「example」
   というサフィックス。`85e27336`で10個のプラグインを修正済み）。また、すべて
   のフェーズが着地済みなのに部分的であるかのように示唆する`(Phase N — …)`の
   パーレン（actionpack）。目標: 素の`# rigor-<id>`、または正確な記述子。
2. **Layoutツリー内の`.gemspec`**。プラグインごとのgemspecは**削除**され
   ました（`rigor-playground`だけがまだ持っています）。READMEのレイアウト内
   の`├── rigor-<id>.gemspec`という行はすべて陳腐化なので削除する。
3. **オーサリングサーフェステーブル内の`diagnostics_for_file`**。
   ADR-37は、diagnosticを発行するすべてのプラグインを`node_rule`（ルールが
   字句的コンテキスト ── 囲んでいるクラス／アクション ── を必要とする場合は
   `NodeContext`も）に移行しました。その行を`node_rule`（＋`NodeContext`）に
   置き換える。
4. **手書きの活用変化（inflection）**。ADR-39はrails-routes /
   activerecord / actionpack / actionmailer / factorybotを
   `Plugin::Inflector`（**本物の`ActiveSupport::Inflector`**）に移行しました。
   したがって「regular plurals only; `Person→people` needs `table_name`」の
   ような制限事項は陳腐化しています（本物のinflectorは不規則変化を扱います）。
   本当に残っているギャップ: プロジェクト独自の
   `config/initializers/inflections.rb`のルールが取り込まれない
   （ADR-39スライス（slice）3）。
5. **廃止された配布モデル**。subtree-splitは廃止されました（2026-06-02）。
   プラグインは**`rigortype`にバンドルされて**出荷されます。プラグインごとの
   gemはありません。陳腐化: `gem "rigor-<id>"`のインストール行、
   「Publication status」、「extract via `git subtree split`」、
   「publish to RubyGems」、「`path:` overrides」、「meta-gem」。
6. **すでに着地した「Future direction」項目**。とくにプラグイン横断の消費に
   関する記述 ── rails-routesの「actionpack Phase 4 will consume
   `:helper_table`」（完了）、rails-i18nの「lazy lookup when actionpack
   lands」（NodeContext経由で完了）、factorybotの「no AR column cross-check
   yet」（Phase 1cが着地）。それぞれをCHANGELOGと突き合わせて、「future」と
   して残すか確認する。
7. **1つのREADME内の内部矛盾**。後から追加されたセクションが、より古い
   「does NOT do」リストと矛盾するケース ── dry-struct（ADR-18の精度向上
   セクションvs「reader is Dynamic[T]」＋「rigor-dry-types not yet
   authored」）、dry-types（スライス3で追加されたにもかかわらず「does NOT
   do: user-authored compositions」）。より新しい／真であるセクションを採用
   して解決する。
8. **RBSオーバーレイの結線**。`signature_paths: vendor/bundle/…/rigor-<id>-0.1.0/sig`
   はバンドリング下では陳腐化しています。クリーンな形はマニフェストの
   `signature_paths: ["sig"]`（ADR-25）です ── activerecordはこうしています。
   **dry-validationはまだそうなっていません**（オープン項目としてフラグ済み
   ── 1行のプラグインコード修正で、レビューのために残してあります）。

プラグインごとの陳腐化マーカーの手早いgrep:
`grep -nE "gemspec|diagnostics_for_file|Out of scope \(v0.1.0\)|Publication status|subtree|example Rigor plugin" plugins/rigor-<id>/README.md`

## ユーザーページのハウススタイル

短く、分量に見合ったものにします。ほとんどのTier-3プラグインはRailsコアより
単純で ── diagnosticも設定も持たない**ファクト（fact）プロバイダ、または
マクロ基盤の消費者** ── なので、そのページは短く、ミニTOCを省略します
（ミニTOCは長い複数セクションのページ専用です）。

構成:

1. **イントロ**（1段落） ── 何を検査／推論するか。最後を「It ships bundled
   in `rigortype`.」で締める。
2. **Activate** ── `plugins:`のYAMLブロック（必要とするプロデューサー、
   たとえばdry-typesと、その依存が`optional`かどうかを記す）。
3. **What it checks / What it infers** ── diagnosticプラグインには短い例と
   diagnosticsテーブル（rule id / severity / fires-when）。推論プラグインに
   は寄与する型の説明。
4. **Configuration** ── 設定キー（ADR-40のデフォルト付き）。なければ、他の
   プラグインに型情報を供給する／合成したメソッドを寄与する旨を述べた
   「**No diagnostics, no config**」セクション。
5. **Limitations** ── *現在の*、突き合わせ済みのものだけ。
6. **Plugin internals** ── ポインタ: 「…are in the
   [plugin's README](https://github.com/rigortype/rigor/blob/master/../plugins/rigor-<id>/README.md). To
   write a plugin, see [`examples/`](https://github.com/rigortype/rigor/blob/master/../examples/README.md)
   and the [`rigor-plugin-author`](../../08-skills/) skill.」

**ハンドブックポインタのケース:**ハンドブックの章がすでにプラグインを深く
扱っている場合（Sorbet＝ハンドブック第10章）、マニュアルページは薄く保ち、
重複させずにその章を指す。

## READMEのスリム化

開発者向けセクションは残します: Layout（`.gemspec`の行を除く）、Architecture、
Running the demo、「Plugin authoring surface this exercises」（`node_rule` /
`Plugin::Inflector` / `Base.suggest`の行を修正したもの）、Future direction
（陳腐化を解消したもの）、License。先頭にポインタブロックを追加します:

```
> **Using this plugin?** The user guide — <what> — lives in the
> manual at
> [docs/manual/plugins/rigor-<id>.md](https://github.com/rigortype/rigor/blob/master/docs/manual/plugins/rigor-<id>.md).
> This README covers the plugin's internals.
```

ユーザー向けセクションは削除します（ページに移動済み）。

## リンクパスの規約（検証済み）

`docs/manual/plugins/<id>.md`から:
- プラグインREADME → `../../../plugins/rigor-<id>/README.md`
- examples → `../../../examples/README.md`
- スキルページ → `../08-skills.md`
- ハンドブックの章 → `../../handbook/NN-*.md`
- ADR → `../../adr/NN-*.md`
- 兄弟プラグインページ → `rigor-<other>.md`

`plugins/<id>/README.md`から:
- ユーザーページ → `../../docs/manual/plugins/rigor-<id>.md`

## インデックスエントリー

`docs/manual/plugins/README.md`の「Available pages」に追加:
`- [rigor-<id>](../rigor-id/) — <one-line scope>.`

## 検証（各コミットの前に）

1. リンクの存在 ── 相対パスが解決することをbashで確認する（ページ→README、
   README→ページ、およびハンドブック／adrのターゲット）。
2. 触れたREADMEに対する陳腐化マーカーのgrep（上記のgrep）が何も返さない。
3. **もし**ページがミニTOCを持つなら（これらの短いページではまれ）:
   読み取り専用のコールドリードsubagentを起動して、github-sluggerのアンカー
   を計算し、それらが解決することを確認する（先頭／末尾のハイフンなし、衝突
   なし）。TOCのない短いページはこれをスキップする。
4. `git diff --check`（空白）。

## 推奨される実行の形（継続セッション向け）

ハイブリッドにすると、遅い部分を並列化しつつ品質を保てます:

- **読み取り専用の突き合わせスカウト**（プラグインごとに1つ、`Explore`
  エージェント型）をファンアウトし、構造化レポートを生成させる: 現在の
  ケイパビリティ／設定／diagnostics／**検出された陳腐化記述**／推奨される
  ユーザーページのアウトライン＋READMEの陳腐化解消リスト。これらは書き込ま
  ないので、インデックス／ファイルの競合がなく、リポジトリへのリスクもない。
- 駆動セッションは、精査済みの各レポートからページを書き、READMEをスリム
  化し、それから**インデックス編集＋リンク検証＋コミット**を直列化する
  （インデックスは共有された可変ファイルなので、並列の書き手に触れさせては
  ならない）。

または単純に、駆動セッション内で4個ずつ続ける ── 末尾は短いので、コスト差は
小さく、品質も実証済みです。並列の*書き手*は**使わない**こと（インデックスの
競合＋スタイルのドリフト＋陳腐化検出の弱体化）。

## 残りの末尾における特殊ケース

- **`rigor-playground`** ── ブラウザプレイグラウンドのバックエンドであり、
  チェッカープラグインではない（唯一のプラグインごとのgemspecをまだ持って
  いる）。おそらく、フルのユーザーページではなく1行のREADMEポインタだけが
  妥当。
- **`rigor-activesupport-core-ext`** ── walkerではなくRBSのみのバンドル。
  ページでは、これがオプトインのRBSバンドル（`3.days` / `"x".squish`の
  ようなActiveSupportのcore_extメソッド）であり、省略するとRailsアプリ
  で最大の偽陽性（false positive）の発生源になることを説明すべき。
- **`rigor-rbs-inline`** ── ハンドブックに住処がある（第7章
  §「Inline RBS in Ruby source」）。sorbetと同様に、薄いページ＋ポインタ。
- **`rigor-typescript-utility-types`** ── ハンドブック第4章（シェイプ
  投影）＋TypeScript付録でカバー済み。薄いページ＋ポインタ。
- **`rigor-rspec-rails` / `rigor-shoulda-matchers`** ── rspecのREADMEが
  すでにこれらとの境界を記述している。それと突き合わせる。
