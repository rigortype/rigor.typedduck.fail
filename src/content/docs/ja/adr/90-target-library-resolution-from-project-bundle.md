---
title: "ADR-90 — 解析対象プロジェクトのバンドルからのターゲットライブラリ解決"
description: "rigortype/rigor docs/adr/90-target-library-resolution-from-project-bundle.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/90-target-library-resolution-from-project-bundle.md"
sourcePath: "docs/adr/90-target-library-resolution-from-project-bundle.md"
sourceSha: "6fb4499c51cfbe61edf7f35117cfef1ec239c6f53157b28147cf769ac1896014"
sourceCommit: "162fd2becdab2973101b49683ec89d14ba2d532b"
translationStatus: "translated"
sidebar:
  order: 4090
---

Status: <strong>Accepted, 2026-07-16.</strong>実装済み: ADR-39の分離レイヤー
（`lib/rigor/plugin/isolation.rb`）は、Rigor自身のgem環境がターゲットライブラリを
持たない場合に、解析対象プロジェクトのbundlerインストールツリーからそれをrequire
する形でフォールバックする（WD1）。分離ワーカーのrescue節は`::`修飾されており、
require失敗はワーカーを殺すのではなくクリーンに辞退する（WD2、EOFErrorリグレッション）。
そして`rigor plugins`は、活用（inflection）を消費するプラグインがロードされたときに
`Plugin::Inflector.available?`をプローブし、サイレントな機能低下を警告する（WD3）。
スタンドアロンの`gem install rigortype`をRailsアプリに対して実行し、プロジェクトバンドル
がインストール済みの場合と未インストールの場合の両方でエンドツーエンドに検証した。

根拠: 2026-07-16のスタンドアロンインストールシナリオ実行（まっさらな`GEM_HOME`、
Bundlerコンテキストなし、Railsアプリに対する`rigor check`）。このとき
`rigor-activerecord`と`rigor-rails-routes`はいずれも毎回
`Inflector::Unavailable: process isolation worker failed (EOFError)`で機能低下した
一方、`rigor plugins`は全プラグインを`[OK]`と報告していた。

## Context

ADR-39は、プラグインが信頼済みのターゲットライブラリの純粋メソッドを呼び出すことを
許可する── `Plugin::Inflector`は本物の`ActiveSupport::Inflector`を呼び、**一切の
近似を持たない**（不在は沈黙であり、決して推測しない）。gemspecのコメントは、
本番のactivesupport依存を「各プラグイン自身のgemspecに」置いていたが、ADR-27に従い、
バンドルされたプラグインは**rigortype gemの内部に**同梱され、自前のgemspecを持たない。
rigortypeはactivesupportを*開発*依存としてのみ持つ。したがって**あらゆるスタンドアロン
インストール**（`gem install rigortype`を独立した環境に── ADR-27の主要な配布形態）に
おいてActiveSupportは不在であり、活用に依存するすべてのRailsチェックがサイレントに
機能低下する。メンテナー環境ではリポジトリの開発バンドルがactivesupportを含むため
これがマスクされていた── このシナリオ実行は、実際のユーザーがインストールするのと
同じ形でツールが動かされた初めての機会だった。

これに伴い、2つの状況を悪化させる欠陥が浮上した:

- **機能低下がクリーンですらなかった**。 `Rigor::Plugin::LoadError`
  （`lib/rigor/plugin/load_error.rb`で定義されたStandardErrorであるプラグイン
  ロードエラー）は`Rigor::Plugin::Isolation`内でグローバルな`LoadError`を
  レキシカルにシャドウイングするため、ワーカーループの素の
  `rescue StandardError, LoadError`が誤ったクラスにマッチした。本物の`::LoadError`
  （ScriptError）は逃れ、フォークされたワーカーを殺し、親からは
  `worker failed (EOFError)`しか見えなかった。`rigor check`の外での最小限の
  `Isolation.call`再現ではクリーンな`[:error, …]`パスが返った── それは
  `rigor/plugin/load_error`を一切ロードしなかった、つまりシャドウを仕掛けなかった
  からである。
- **機能低下が不可視だった**。 `rigor plugins`は、活用に依存するチェックが何の
  diagnosticも生まないプラグインについて`[OK]`と報告していた。

## Decision

**基準: ターゲットライブラリは実際にディスク上にあるものへの忠実さをもって解決され、
その不在はクリーンで可視な辞退となる── 決して推測せず、決してクラッシュしない。**
具体的には:

1. 解決順序はまずRigor自身のgem環境、次に**解析対象プロジェクトのbundler
   インストールツリー**である。Railsプロジェクトは常にロックされたactivesupportを
   ディスク上に持ち、プロジェクト自身のコピーは活用ルールの*より高忠実な*ソースである
   （ADR-79の原則をターゲットライブラリに適用── プロジェクトが実際に実行するもので
   チェックする）。ActiveSupportはrigortypeのランタイム依存に**ならない**。それは
   すべての非RailsユーザーにRailsの機構を押し付けることになり（ADR-0のランタイム依存
   ゼロの理念に反する）、Railsアプリを、それが実行するのとは*異なる*ActiveSupport
   バージョンでチェックしかねない。
2. どちらのソースも解決されない場合、すべてのレイヤーがクリーンに辞退する──
   分離ワーカーは`[:error, …]`を返し、`Inflector`は`Unavailable`を送出し、
   プラグインのrescue境界はdiagnosticなしに機能低下する── そしてその機能低下は、
   ユーザーがプラグインを設定する場所で*報告される*。

## Working decisions

- **WD1 — gemspec宣言のrequireパスを`$LOAD_PATH`へappendすることによるバンドル
  フォールバック。** `Isolation.require_with_target_bundle`は、すべてのバンドルgemの
  `full_require_paths`（バンドルのRubyGems生成の`specifications/*.gemspec`から
  読み込み、名前ごとに最新バージョン）を`$LOAD_PATH`へappendした後、失敗した
  requireをリトライする。非標準のrequireパス（concurrent-rubyの
  `lib/concurrent-ruby`）を解決させるのはgem自身のメタデータである。（prependでは
  なく）appendすることでRigorがアクティベート済みのgemが権威を保つ。失敗時リトライ
  という仕組みにより、そのgemを持つホスト環境はバンドルを決して参照しない。バンドル
  ルートは各ワーカーリクエストに乗るため、既定の`process`ストラテジーの下では
  そのミューテーションはフォークされたワーカーに限定される── Rigorのメイン空間は
  手つかずである。`none`/Directの下ではメイン空間に着地するが、それはそのストラテジー
  のドキュメント化された意味（信頼済み＋純粋ライブラリ）どおりである。
- **WD2 — 分離レイヤーでの`::`修飾されたrescue**。ワーカーループは
  `::StandardError, ::ScriptError`をrescueし、Directは`::LoadError, ::NameError`を
  rescueするので、require失敗はクリーンな辞退となる。同じシャドウイングバグは
  `rigor-rspec-rails`のRackステータステーブルローダーでも修正された。
  `Plugin::Loader`の素の`rescue LoadError`節はシャドウされた
  `Rigor::Plugin::LoadError`を*意図しており*、そのままで正しい（本物の`::LoadError`
  はそのrequire地点で変換される）。
- **WD3 — アクティベーション時の可視性**。 `Plugin::Inflector`は
  `CONSUMER_PLUGIN_IDS`（バンドルされた5つの消費者）を得る。`rigor plugins`が
  そのいずれかをロードすると、バンドルルートを解決し（env構築が使うのと同じ
  `BundleSigDiscovery.resolve_bundle_path`）、`Inflector.available?`をプローブする。
  テキスト出力は具体的な修正法（プロジェクトを`bundle install`する、または
  Rigorの環境にactivesupportをインストールする）とともに警告する。`--format json`は
  構造化された`inflection: {required_by:, available:}`フィールドを持つ（ADR-61:
  エージェントはメッセージ文言ではなくフィールドで分岐する）。
- **WD4 — バンドルルートはいかなるプラグインコードが走る前にも設定される**。
  プラグインの`#prepare`フック（rails-routesのパース、activerecordのモデル
  インデックス）はすでにinflectorを呼び出しており、ランナーのプリパスは
  `Environment.for_project`の*前に*走る── そこで`ProjectPrePasses#run`が最初に
  `Isolation.target_bundle_root`を解決・設定し、`Environment.for_project`の代入
  （これはプールワーカーもカバーする。プールワーカーのenv構築はワーカーごとの
  prepareに先行する）がそれを新鮮に保つ。

## Rejected alternatives

- **activesupportをランタイム依存に昇格させる** — 非Railsユーザーにそれを押し付け、
  チェック対象の活用ルールをプロジェクトのではなくRigorのコピーに固定する
  （忠実さの喪失。Decision 1を参照）。
- **inflectorをvendorする／近似する** — 再度却下。ADR-39の設立理由（近似は誤った
  ファクトを出す → 偽陽性）による。
- **`Gem.paths`の拡張** — 最初の実装。Bundlerでロックされたプロセスがそれを
  サイレントに無視するため却下した（フォールバックが`bundle exec`の下では死んで
  しまう）。`$LOAD_PATH`のappendは両方の世界で機能する。
- **解析対象プロジェクトに対する`Bundler.setup`** — プロジェクトの`Gemfile`
  （任意のRuby）を評価するが、それはアプリケーションコードの実行である（ADR-2の
  禁止事項）。
- **フォールバックなしのdoctor専用レポートへの格下げ** — 主要な欠陥（あらゆる
  スタンドアロンユーザーにとってサイレントに死んでいるRailsチェック）をそのまま
  残す。可視性は修正を補完するのであって、置き換えるものではない。

## Consequences

- スタンドアロンインストールは、解析対象プロジェクトのバンドルがインストール済み
  （`vendor/bundle`、`.bundle/config`、またはユーザーグローバルのbundlerパス──
  `BundleSigDiscovery`の自動検出セット）でありさえすれば、活用に依存する動作する
  Railsチェックを得る。バンドルが未インストールのプロジェクトはクリーンかつ可視に
  機能低下する。
- バンドルはロックされたものと並んで古いgemバージョンを含んでいることがある。
  フォールバックはlockfile固定ではなく名前ごとの最新を選ぶ。活用ルールは
  ActiveSupportのバージョン間で安定しており、正確なバージョンのプロビジョニングは
  ADR-39に従い（「バージョン間の振る舞いの差異が観測された場合のみ」）先送りのままと
  する。
- フィクスチャに裏打ちされた分離specは、クリーンな辞退の契約（シャドウイング
  リグレッション）と、子に限定されたフォールバック（非標準の`require_paths`を持つ
  フィクスチャgem）の両方を固定する。

## Relationship to other ADRs

ADR-27のスタンドアロン配布に対するADR-39の可用性のストーリーを完成させる。ADR-79の
固定より忠実さの原則をターゲットライブラリに適用する。ロック/バンドルによる
ゲーティングはADR-72のプレゼンスゲート付きオーバーレイの推論を鏡写しにする。ADR-2
（アプリケーションコードの実行なし── インストール済みgemのメタデータとgemコードのみ）
を保つ。JSONプローブフィールドはADR-61の文字列ではなく構造化の規則に従う。
