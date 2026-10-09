---
title: "チェンジログ — 0.3.xアーカイブ"
description: "rigortype/rigor docs/CHANGELOG-0.3.x.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CHANGELOG-0.3.x.md"
sourcePath: "docs/CHANGELOG-0.3.x.md"
sourceSha: "90498778bd0df7de29c71a558ed9a2b83a21953d623063b94f9a524789cefd0f"
sourceCommit: "8a5d6e2c6001d80084cf95132e306eb6a6d71b9a"
sourceDate: "2026-10-08T18:50:00+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

`0.3.x`開発サイクルのアーカイブリリースノートです——`0.3.0`から`0.3.9`まで。

フォーマットは[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)に従い、プロジェクトは[Semantic Versioning](https://semver.org/spec/v2.0.0.html)に準拠しています。

このファイルは`0.3.0`から`0.3.9`までの静的アーカイブであり、プロジェクトのアーカイブルールに従ってメインの[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)から移動されました: **マイナーバンプ後の最初のリリース（ここでは`0.3.x` → `0.4.x`バンプ後の最初のリリースである`0.4.1`）の時点で、以前のマイナーの範囲全体が`docs/CHANGELOG-<old-prefix>.md`アーカイブファイルに移動されます**。

現在のサイクルのリリースノートは[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)に存在します。次のマイナーバンプの最初のパッチ（`0.5.1`）がリリースされたとき、同じルールに従って`0.4.x`ブロックが`docs/CHANGELOG-0.4.x.md`に移動されます。

## [0.3.9] - 2026-09-12

v0.3.9は0.3系の最後のリリースであり、最大の修正バッチです: 100件以上のプルリクエストが推論全体（ブロックの戻り値、インプレースミューテーション、定数およびヘッダー解決、暗黙のself呼び出し）の偽陽性を解消し、さらにウォーム実行がツリーにもはや存在しない答えを提供し続けていたキャッシュとインクリメンタルモードの陳腐化バグを解消しました。範囲（Range）はRubyの表記どおりに解釈されるようになり（`Integer[1..10]`、`Float[0.0..1.0]`、[ADR-109](../adr/109-ruby-native-range-notation/)）、v0.4.0に先立って`int<min, max>`形式は非推奨になりました。また、仕様が約束していた機能ロール（capability-role）カタログ、CIゲート向けの`--fail-on`、マニフェスト駆動のプラグインギャップアドバイザリ、そして`rigor check`における40%の割り当て削減も同梱されています; `SystemStackError`は成功ステータスの背後に空のレポートを残す代わりに、終了コード70で終了するようになりました。

### 追加

- **[types]** Floatの範囲: `%a{rigor:v1:…}`ペイロードは、それをカバーするRubyの範囲リテラルでFloatを境界付けできるようになり（`Float[0.0..1.0]`、`Float[0.0...1.0]`、`Float[0.0..]`）、`non-nan-float` / `finite-float`が最も意図されることの多い2つの範囲を命名します（[ADR-109](../adr/109-ruby-native-range-notation/)、[#844](https://github.com/rigortype/rigor/pull/844)）。
- **[inference]** Floatと数値リテラルの比較が、それが成り立つ分岐をナローイングするようになったため、`if`の内側で`x > 0.0`は`x`を`Float[0.0..]`として型付けし、`x.between?(0.0, 1.0)`は`Float[0.0..1.0]`として型付けします（[#846](https://github.com/rigortype/rigor/pull/846)）。
  - `x.finite?`は`finite-float`へナローイングし、`x.nan?`の`else`は`non-nan-float`へナローイングします;失敗した比較はNaNについて何も証明しないため、もう一方の分岐は`Float`を維持します。
- **[inference]**有界なFloatの畳み込み: `rand(1..6)`と`Random.rand(1.0..2.0)`はそれらが指定する範囲として型付けされ、単調な`Math`関数は有界な引数をその境界の像の間の範囲へとマッピングし、有界なFloatは`abs`、`nan?`、`finite?`、`floor`、`round`、`between?`、`clamp`を畳み込みます（[#857](https://github.com/rigortype/rigor/pull/857)）。
  - 範囲内の値に対して例外を発生させうる呼び出しは、そのRBS型を維持します。
- **[rigor check]** `--fail-on=SEVERITY`（`error`、`warning`、または`info`）は、その重大度以上の診断がベースラインフィルタリングを通過して残った場合に非ゼロで終了するようになり、デフォルトのエラーのみの終了コードよりも厳格な判定を求めるCIゲートに対応しました（[#827](https://github.com/rigortype/rigor/pull/827)）。
- **[rbs]** Rigorは仕様で定められた機能ロール（capability-role）インターフェース（`_Closable`、`_RewindableStream`、`_ClosableStream`、`_FileDescriptorBacked`、`_Callable`）をバンドルされたRBSとして出荷するようになり、設定なしで`%a{rigor:v1:conforms-to _ClosableStream}`ディレクティブが解決されチェックされるようになりました（[#976](https://github.com/rigortype/rigor/pull/976)）。
  - 同名のインターフェースを宣言しているプロジェクトは自身のものを維持し、存在しないインターフェースを指定する`conforms-to`はinfoではなくwarningになりました。
- **[config]** `.rigor.yml`に`plugins_isolation:`（`none`または`process`）が追加され、プラグインからターゲットライブラリへの呼び出しをどのように分離するかを選択できるようになりました（[#971](https://github.com/rigortype/rigor/pull/971)）。
  - `RIGOR_PLUGIN_ISOLATION`は単一の実行でこれをオーバーライドでき、`Ruby::Box`はRubyの起動前にアクティブでなければならないため、`ruby_box`は環境変数のみのまま維持されます。
- **[plugins]**プラグインマニフェストが`target_gems:`を宣言するようになり、`rigor doctor` / `rigor skill describe`はこれを使用して、プロジェクトが直接依存しているにもかかわらず有効化されていないgemをモデル化しているバンドルプラグインをプラグインごとに指摘します（[#949](https://github.com/rigortype/rigor/pull/949)）。
  - このアドバイザリは、いずれか1つのRailsプラグインが設定されるとすぐに通知しなくなっていたRails専用のチェックを置き換え、解決済みグラフではなくロックファイルの直接の依存関係と照合し、`rails`依存関係をRailsプラグインがモデル化しているgem群へと展開します。
- **[plugins]** Railsプラグインが独自のフレームワーク定数を宣言するようになったため、`rescue ActiveRecord::RecordNotFound => e`は`e`を不透明（opaque）なままにする代わりに型付けするようになりました（[#974](https://github.com/rigortype/rigor/pull/974)）。
  - Active RecordとAction Controllerの例外階層、`ActiveModel`および`Arel`名前空間、そして`ActiveSupport::Concern`はそれぞれ寛容に宣言されているため、それらが省略しているメンバーが偽陽性になることはありません。
- **[plugins]**信頼ポリシーによって拒否されたプラグインの読み取りが、サイレントに失敗する代わりに、プラグイン、拒否されたパス、および最も近い読み取りルートを示す`plugin_trust.read-refused`診断として表面化するようになりました（[#977](https://github.com/rigortype/rigor/pull/977)）。
- **[rigor check]** `plugins:`でそのプラグインが指定されていないにもかかわらず、バンドルプラグイン自身の`sig/`を読み込む`signature_paths:`エントリに対して、有効化すべきプラグインを名指しする警告が出るようになりました（[#902](https://github.com/rigortype/rigor/pull/902)）。
  - RBSはマニフェストなしで届くため、プラグインが意図的に部分的にのみ宣言しているクラスが完全なものとして解釈されてしまいます; [#660](https://github.com/rigortype/rigor/issues/660)でオープンレシーバーメンバーシップがどこに属するかが確定するまで、診断自体は維持されます。
- **[cli]** `rigor explain`が`rigor sig-gen`の出力する`sig.skipped.*`識別子に回答するようになり、gemが出荷する`sig/`を検出できないレイアウトである、アクティブなRubyのデフォルトのgemホームにgemがインストールされている場合に`rigor doctor`が警告するようになりました（[#962](https://github.com/rigortype/rigor/pull/962)）。
- **[cache]** `rigor type-of`、`type-scan`、`trace`、`annotate`は環境を新規に構築することが文書化されました: これらは永続キャッシュの読み書きを一切行わないため、いずれも`--no-cache`を受け付けません（[#864](https://github.com/rigortype/rigor/pull/864)）。
- **[sig-gen]** `rigor sig-gen`が生成できない宣言に対する`# sig-gen gap: #NNN — reason`というRBSコメントの規約がハンドブックに文書化され、`sig/`内の手書きの型が、それを置き換えるエンジン側の作業へのポインタを保持できるようになりました（[#835](https://github.com/rigortype/rigor/pull/835)）。
- **[skills]**新しい`rigor-type-oracle`スキル: AIエージェントが型を書き込む前に、ソースから推測する代わりに`rigor type-of` / `annotate` / `sig-gen`から型を取得し、ギャップを埋めるのではなくギャップを報告します（[#826](https://github.com/rigortype/rigor/pull/826)）。

### 変更

- **[types]** Integerの範囲は、診断および`%a{rigor:v1:…}`アノテーションの両方において、それをカバーするRubyの範囲リテラル（`Integer[1..10]` / `Integer[0..]` / `Integer[..-1]`）で表記されるようになりました（[ADR-109](../adr/109-ruby-native-range-notation/)、[#830](https://github.com/rigortype/rigor/pull/830)）。
  - `Integer[1...10]`、`Integer[1..]`、`Integer[..10]`、`Integer[nil..nil]`が受け入れられ、空の範囲は拒否され、普遍範囲（universal range）は`int`ではなく`Integer`として表示されます。
- **[engine]** `rigor check`が同じ解析に対して割り当てるオブジェクト数が約40%削減され（Rigor自身の`lib`で36.5Mから21.9Mへ、診断は同一）、v0.3.7のコストの大部分を回復しました（[#819](https://github.com/rigortype/rigor/pull/819)）。
- **[engine]**戻り値メモ（return-memo）の保存ゲートが2つの基準の代わりに1つを保持するようになり、`RIGOR_BUDGET_TRACE`戻り値メモプロファイルの`consult-tainted`列が削除されました;診断出力に変更はありません（[#881](https://github.com/rigortype/rigor/pull/881)）。
- **[plugin API]** `dynamic_return receivers:`エントリがレシーバーの種別を指定するようになりました: `"Widget"`はインスタンスレシーバーに一致し、`"singleton(Widget)"`はクラスオブジェクトに一致し、両方を対象としたいルールは両方をリストします（[#701](https://github.com/rigortype/rigor/issues/701)、[#901](https://github.com/rigortype/rigor/pull/901)）。
  - インスタンスルールは、自身がモデル化していないクラスレベルの呼び出しに対して応答しなくなり、したがってそれに対する`call.undefined-method`を抑制しなくなりました。
- **[skills]** `rigor-type-oracle`は、人間がドキュメントとして書いたインラインアノテーション（`#: void`、リテラルユニオン、パラメータコントラクト）を、書き換えるべき推測としてではなく、チェックが検証する意図として扱うようになりました（[#843](https://github.com/rigortype/rigor/pull/843)）。
  - 型仕様のスタイルガイダンスには、書く価値のあるインラインアノテーションが示されています: 名前から示唆されない戻り値、公称クラス以上のことを表す型、パラメータのコントラクト。
- **[skills]** `rigor skill describe`は、CIが未接続の設定済みプロジェクトにおいて`rigor-rbs-setup`より前に`rigor-ci-setup`を推奨するようになり、gemのオフライン`docs/llms.txt`インデックスがパッケージ化されたすべてのマニュアルの章をリストし、再びドリフトしないようゲートされました（[#956](https://github.com/rigortype/rigor/pull/956)）。
- **[docs]**各ADR自身の`Status:`ヘッダーがADRインデックス内のその行に対してゲートされ、2つの記録が気づかれないまま乖離することがなくなりました（[#948](https://github.com/rigortype/rigor/pull/948)）。

### 非推奨

- **[rbs-extended]** `%a{rigor:v1:…}`ペイロード内のPHPStan形式の整数範囲`int<min, max>`は、Rubyの範囲表記`Integer[min..max]`を優先して非推奨になりました（[ADR-109](../adr/109-ruby-native-range-notation/)、[#854](https://github.com/rigortype/rigor/pull/854)）。
  - 現在も解決は可能であり、それを使用するすべてのアノテーションは記述すべき表記を示す`dynamic.rbs-extended.deprecated-form`（info）を報告し、このエイリアスは次の互換性ブレークで削除されます。

### 修正

- **[rigor check]** `SystemStackError`や`NoMemoryError`で停止した解析は、成功の終了ステータスの背後に空のレポートを残す代わりに、わかりやすいメッセージとともに終了コード70で終了するようになりました。@n-rodriguezに感謝します！（[#957](https://github.com/rigortype/rigor/pull/957)）
- **[sig-gen]** `sig-gen --write`が生成されたスーパークラスの参照を絶対位置でアンカーするようになり（`< ::Help::Show`）、スーパークラスが囲む名前空間と名前を共有するネストした宣言が、次回の実行で自分自身へと再解決されてスタックを使い果たすことがなくなりました。@n-rodriguezに感謝します！（[#957](https://github.com/rigortype/rigor/pull/957)）
- **[sig-gen]**ルート化されたヘッダーで開かれたクラス（`module MyApp`内の`class ::Foo`）が、囲むモジュール下ではなくRubyが与える名前の下で生成されるようになり、`rigor sig-gen`がどこからも呼び出されない`MyApp::Foo`宣言を書き込むことがなくなり、`rigor effects check`がそのようなクラスに対してファイルだけでなく`def`の行を報告するようになりました（[#893](https://github.com/rigortype/rigor/pull/893)）。
- **[sig-gen]** `rigor sig-gen`が`rigor check`と同じソース（`rbs collection`、バンドルのgemごとの`sig/`、およびプラグインシグネチャ）から型ユニバースを構築するようになったため、それらが宣言するスーパークラスを持つクラスがスキップされずに出力されるようになりました。@n-rodriguezに感謝します！（[#869](https://github.com/rigortype/rigor/pull/869)）
- **[plugins]** `rigor-activerecord`の`ActiveRecord::Relation[Elem]`が、キャッシュされた実行においても`rbs collection install`の非ジェネリックな`Relation`に対して譲歩（stand down）するようになり、デフォルトの実行でリレーションへのすべての呼び出しが`Dynamic[top]`として解釈されることがなくなりました。@n-rodriguezに感謝します！（[#610](https://github.com/rigortype/rigor/issues/610)、[#848](https://github.com/rigortype/rigor/pull/848)）
  - 譲歩したファイルは、両方のファイルを名指しする`rbs.coverage.plugin-signature-stood-down`（info）として1回報告されます。
- **[engine]** `rigor check`が相互再帰メソッドの強連結成分（strongly connected component）を呼び出しエッジごとに再探索しなくなったため、以前は終了しなかったrufoの`formatter.rb`のようなファイルが数秒で完了するようになりました（[#874](https://github.com/rigortype/rigor/pull/874)）。
- **[inference]** 4つのブロック戻り値の判定が、ブロックが生成した値の代わりに開始時の値を報告することがなくなりました（[#965](https://github.com/rigortype/rigor/pull/965)）。
  - ブロックの末尾にある変更されたカウンター（`[1, 2].map { total += 1 }`）および変更された文字列バッファ（`s = +"ab"; s << "c"`）が偽のalways-truthy警告を出さなくなり、カウント述語上の`find` / `index`がRubyで一致が見つかる箇所で`nil`を返すことがなくなり、パラメータを変更するブロックが9要素を超えても変更前の値を報告することがなくなりました。
- **[rigor check]** `next value`または`break value`で抜けるブロックが、その値とフォールスルーする末尾とを結合（join）した値として型付けされるようになり、`ops.all? { |o| next false unless o; true }`のような形式の述語が無条件にtrueとして解釈されることがなくなりました（[#852](https://github.com/rigortype/rigor/pull/852)、[#865](https://github.com/rigortype/rigor/pull/865)）。
- **[inference]**複数回変更されたコレクションがすべての格納操作の値の型を記録するようになり、`String`を欠落させる代わりに`a = []; a.push(1); a.push("s")`が`Array[Integer | String | untyped]`と解釈されるようになりました。なお、シグネチャによって要素型が宣言されているコレクションは、宣言されたとおりに維持されます（[#975](https://github.com/rigortype/rigor/pull/975)）。
- **[engine]**型がユニオンである変数に対するインプレースミューテーション（`out = flag ? 5 : [2]; out << 2`）が、そのユニオンのすべてのコレクションメンバーを拡大（widen）するようになり、変更された配列またはハッシュが、ミューテーションによって無効化されたリテラルサイズを保持し続けることがなくなりました（[#951](https://github.com/rigortype/rigor/pull/951)）。
- **[inference]**インデックス読み取りを通じて到達したコンテンツのミューテーション（`c[0] << 5`、`b[0][0] << 1`、`xs.first << 3`）がコンテナ内のその要素を拡大するようになり、それに続く`c[0].last == 5`が偽のalways-falseyへと畳み込まれることがなくなりました（[#964](https://github.com/rigortype/rigor/pull/964)）。
- **[inference]**非空へとナローイングされたコレクションに対するインプレースミューテーション（`if xs.any?; xs << value`）が、両方を破棄する代わりに、追加された要素を記録し非空のリファインメント（絞り込み）を維持するようになりました（[#968](https://github.com/rigortype/rigor/pull/968)）。
- **[inference]**暗黙のself呼び出しが、同名のトップレベル`def`にバインドしてnilに対する偽の`undefined method`を報告する代わりに、継承された`attr_*` / `define_method`、`::Object`より前の祖先で宣言されたメソッド（`Exception#message`、`Array#first`、`Comparable#clamp`）、およびスーパークラスから継承されたクラスメソッドへと解決されるようになりました（[#955](https://github.com/rigortype/rigor/pull/955)）。
- **[inference]**クラスが自身のソース内で定義しているメソッドが、祖先のみが宣言しているシグネチャから型付けされることがなくなり、基底クラスを忠実に記述した`sig/`（`def target_class: () -> nil`）によって、オーバーライドするすべてのサブクラスが`undefined method … for nil`を報告することがなくなりました（[#860](https://github.com/rigortype/rigor/pull/860)）。
- **[inference]**ファクトリメソッド経由で読み取られる`Struct`メンバー（`def build = Pair.new(...)`の後の`build.items`）が再び畳み込まれるようになり、自身を返す形状（self-returning shape）はすべて引き続き拒絶されます（[#972](https://github.com/rigortype/rigor/pull/972)）。
- **[inference]**定数パスを通じて代入された`Struct.new` / `Data.define` / `Class.new` / `Module.new`ファクトリ（`Holder::Thing = Struct.new(:a) do … end`）が自身が名指すクラスとして認識されるようになり、そのメンバーやブロック定義されたメソッドが`undefined method … for Struct`を報告する代わりに解決されるようになりました（[#903](https://github.com/rigortype/rigor/pull/903)）。
- **[inference]** `yield`するヘルパーから値が取得されるメソッドがブロックの型を取るようになり、`during_internal_demand { … }`ラッパーイディオムが`untyped`ではなくなり、`rigor sig-gen`がそのシグネチャを出力するようになりました（[#897](https://github.com/rigortype/rigor/pull/897)）。
- **[engine]** `->() { }`本体内のローカル変数への代入がバインドされるようになり、ラムダのアロー記法が`lambda { }`記法とまったく同様に型付けされるようになりました（[#879](https://github.com/rigortype/rigor/issues/879)、[#885](https://github.com/rigortype/rigor/pull/885)）。
- **[engine]**定数パスがRubyの解決方法と同じく1セグメントずつ解決されるようになり、`A`がスーパークラスやインクルードされたモジュールから`B`を継承している箇所で書かれた`A::B`が、無関係なトップレベルの`B`ではなくそのクラスを名指すようになりました（[#905](https://github.com/rigortype/rigor/pull/905)）。
- **[engine]** `case`/`when`が、対象をナローイングする側だけでなく式を型付けする側でもレキシカルな探索を通じてパターン名を解決するようになり、RBSが認識しているトップレベルの名前をシャドウイングするプロジェクトクラスによって、Rubyが実行するアームが脱落することがなくなりました（[#905](https://github.com/rigortype/rigor/pull/905)）。
- **[engine]** `module Wrap`内に書かれたコンパクトな`class Outer::Leaf`ヘッダーが、囲む名前空間に`Wrap::Outer`が定義されていない場合にRubyが行うのと同様に、トップレベルの`Outer::Leaf`を再オープンするようになり、そのクラスに対する呼び出しが`untyped`と型付けされる代わりに解決されるようになりました（[#961](https://github.com/rigortype/rigor/pull/961)、[#985](https://github.com/rigortype/rigor/pull/985)）。
- **[engine]**モジュールをインクルードするルート化されたヘッダーの下で再オープンされたクラスが、再オープン側の名前空間を通じてスーパークラスを解決することがなくなりました: 各祖先名はそれを記述した宣言箇所のネストの中で解決されます（[#896](https://github.com/rigortype/rigor/pull/896)）。
- **[engine]**ルート化された表記で書かれたバージョンガード（`::RUBY_VERSION`、`Gem::Version.new(::RUBY_VERSION)`）が、素の表記とまったく同様に畳み込まれるようになり、チェックを実行しているRuby上では実行できないアームが報告されなくなりました（[#883](https://github.com/rigortype/rigor/pull/883)）。
- **[engine]**ターゲットが実行時式である定数への書き込み（`k::LIMIT = 7`）によって、名前空間付きの`Foo::LIMIT`が置き換えられた可能性のある値を読み続けることがなくなり、`pre_eval:`ファイルから公開された定数は、`pre_eval:`外のファイルが異なる値を代入した際に漸進的（gradual）として解釈されるようになりました（[#912](https://github.com/rigortype/rigor/pull/912)）。
- **[constants]** `Klass = Class.new { self::X = 7 }`によって別ファイル内のプレーンな`X = 5`がその値を公開するのを妨げることがなくなり、動的なベースを介した定数書き込みによって、そのファイルが宣言したことのない定数に対して`flow.always-truthy-condition`が発火することがなくなりました（[#895](https://github.com/rigortype/rigor/pull/895)）。
- **[diagnostics]**ファイルをまたぐ設定定数からコピーされた値から条件が畳み込まれる場合に`flow.always-truthy-condition`が発火しなくなりました（読み取り側ファイル自身が代入した値に対しては引き続き発火します）（[#904](https://github.com/rigortype/rigor/pull/904)）。
- **[engine]**クラスオブジェクトが`extend`、`class << self; include M; end`、プロジェクト独自の`sig/`でのみ宣言された`extend`、またはプロジェクトがコアクラスに追加したMixinを通じてモジュールに到達する場合に、`flow.unreachable-clause`が`when` / `is_a?`アームを到達不能として報告しなくなりました（[#899](https://github.com/rigortype/rigor/pull/899)、[#910](https://github.com/rigortype/rigor/pull/910)、[#973](https://github.com/rigortype/rigor/pull/973)）。
- **[rules]**これらは異なる変数であるため、`class << self`のdef、または`Class.new do … end`ブロック内のdefが、囲むクラスも書き込むインスタンス変数に書き込んだ場合に、`def.ivar-write-mismatch`が発火しなくなりました（[#945](https://github.com/rigortype/rigor/pull/945)）。
- **[rigor check]** `Gem::Specification.new("mygem", "1.0.0")`のように、読み込まれたRBSがコンストラクタを宣言していないクラスに対する`.new`への引数を、`call.wrong-arity`が報告しなくなりました（[#946](https://github.com/rigortype/rigor/pull/946)）。
- **[rigor check]** `call.wrong-arity`が、メソッドサーフェスを列挙できないレシーバー（Mixinモジュール、または`Class` / `Module`として型付けされた値）に対する引数の数を判定しなくなり、`call.undefined-method`が既に判定を拒否しているレシーバーと一致するようになりました（[#884](https://github.com/rigortype/rigor/pull/884)）。
- **[rigor check]**シグネチャがキーワード引数も取るメソッドの位置引数を`call.argument-type-mismatch`がチェックするようになりました（以前は完全にスキップされていました）（[#916](https://github.com/rigortype/rigor/pull/916)）。
- **[rigor check]** ActiveSupportのRBSを一切読み込まないプロジェクトで`ActiveSupport::TimeWithZone`を指定する`sig/`のように、宣言されたクラスがどこにもシグネチャを持たないパラメータに対して、`call.argument-type-mismatch`が発火しなくなりました（[#914](https://github.com/rigortype/rigor/pull/914)）。
- **[inference]** `Object#<=>`を継承するレシーバー上の`a <=> b`が、同一性比較のリテラルではなく`Integer?`として解釈されるようになり、`Comparable`な値の結果に対する`n.negative?`がデッドブランチへと畳み込まれることがなくなりました（[#914](https://github.com/rigortype/rigor/pull/914)）。
- **[inference]** `Range`リテラルの引数がその端点を通じて解釈されるようになり、`Random.new.rand(1.0..2.0)`が`Float`と型付けされ、プレーンな`Integer`上の`n.clamp(1..9)`がその`Integer`型を維持するようになりました（[#859](https://github.com/rigortype/rigor/pull/859)）。
  - 計算された端点から構築された`Range`もその要素を型付けし、`clamp`は収まる区間（bracket）を維持し（`n.clamp(1, 9)`は`Integer[1..9]`）、有界なIntegerレシーバーは`digits`、`fdiv`、`to_f`、および畳み込み階層が所有しないその他のメソッドを解決します（[#858](https://github.com/rigortype/rigor/pull/858)、[#866](https://github.com/rigortype/rigor/pull/866)、[#868](https://github.com/rigortype/rigor/pull/868)）。
- **[rbs-extended]** `int<10, 1>`のように整数範囲の境界が逆転している`rigor:v1`ペイロードが、内部アナライザーエラーでファイル全体の解析を中断する代わりに、そのアノテーション箇所で`dynamic.rbs-extended.unresolved`として報告されるようになりました（[#828](https://github.com/rigortype/rigor/pull/828)）。
- **[activesupport]** `ActiveSupport::TimeWithZone`が`Time`のサブクラスとしてモデル化され、ゾーン対応の時刻のみが持つリーダー（`time_zone`、`period`、`comparable_time`）が`Time.current`や`1.hour.ago`系で解決されるようになり、`to_param`、`to_query`、`duplicable?`、`instance_values`、`instance_variable_names`がActiveSupportが定義している`Object`上で宣言されるようになりました（[#916](https://github.com/rigortype/rigor/pull/916)）。
- **[rigor-sorbet]** `sig`の位置にあるシェイプ型（`sig { returns({name: String, age: Integer}) }`）が破棄されずに本物の`HashShape`へと変換されるようになり、戻り値に対する呼び出しが宣言されたキーに対して型チェックされるようになりました（[#916](https://github.com/rigortype/rigor/pull/916)）。
- **[rigor-rbs-inline]** `sig/`とインラインアノテーションの両方で宣言されたメソッドが衝突しなくなりました: そのメンバーについては`.rbs`の宣言が優先され、ファイルの残りのアノテーションは引き続きバインドされ、クラスはそのメソッドサーフェスを維持します（[#832](https://github.com/rigortype/rigor/pull/832)）。
  - ドロップされた各メンバーは、両方のファイルを名指しする`plugin.rbs-inline.source-rbs-annotation-not-honoured`（info）として報告されます。
- **[rigor-rbs-inline]** rbs-inlineアノテーションを含むファイル内のアノテーションのないメソッドまたは`attr_reader`が、リーダーが生成する`untyped`シグネチャによって推論された型を失う代わりに、その本体から型付けされるようになりました（[#840](https://github.com/rigortype/rigor/pull/840)）。
- **[rigor-factorybot / rigor-rspec]** specの`let`内の`create(:factory)`が再びファクトリのモデルクラスとして型付けされるようになりました; rigor-rspecが読み取る`:factory_index`ファクトが公開されていませんでしたが、調査コマンド（`type-of`、`annotate`、`trace`）が各プラグインの`prepare`を実行するようになり、それらのファクトを参照できるようになりました（[#950](https://github.com/rigortype/rigor/pull/950)）。
- **[rigor-ffi]** `rigor-ffi`プラグインに対する`.rigor.yml`の`exceptions:`および`target:`キーが、未知の設定としてサイレントに拒絶される代わりに、検証されて有効に機能するようになりました（[#944](https://github.com/rigortype/rigor/pull/944)）。
- **[plugins]** `rigor-rbnacl`が自身を登録し、バンドルされたRBSを提供するようになったため、`RbNaCl::SecretBox#encrypt` / `#decrypt`が`String`として型付けされるようになりました;プラグインはこれまで不活性な状態で出荷されていました（[#908](https://github.com/rigortype/rigor/pull/908)）。
- **[plugins]**別のプラグインを引き込むプラグインgem（FFIファミリーのすべてのプラグインは`rigor-ffi`を要求します）がメタgemと誤認されなくなり、誤ったプラグインを有効化するようなアドバイスとともに失敗する代わりに、`plugins: [rigor-sassc]`が単独で読み込まれるようになりました（[#908](https://github.com/rigortype/rigor/pull/908)）。
- **[plugins]**マニフェストを読み取れないプラグインが環境構築中に実行を中断することがなくなりました: そのプラグインを名指しする単一のプラグイン読み込みエラーとして報告され、読み込まれたプラグインに対して解析が継続されます（[#890](https://github.com/rigortype/rigor/pull/890)）。
- **[plugins]**テンプレートが作成された後に、`rigor check`が実行キャッシュから`plugin.actionpack.missing-template`を報告し続けることがなくなり、dry-types、dry-schema、dry-validation、graphqlプラグインがスキャンしたプロジェクトファイルをキャッシュの依存関係として記録するようになったため、ウォーム実行で型やスキーマの定義への編集が反映されるようになりました（[#954](https://github.com/rigortype/rigor/pull/954)）。
- **[cache]**新しい`sig/*.rbs`ファイルが実行結果キャッシュを無効化するようになり、ウォーム実行の`rigor check`が以前の回答を再生する代わりに、前回の実行以降に追加されたシグネチャを反映するようになりました（[#981](https://github.com/rigortype/rigor/pull/981)）。
  - キャッシュスキーマが更新されたため、アップグレード後の初回の実行では1回だけ再解析が行われます。
- **[cache]** 1つの`.rigor/cache`を共有する2つの`rigor check`プロセスが互いのスキーマバージョンマーカーで競合しなくなり、一方が他方の下からキャッシュルートを勝手にクリアすることがなくなりました（[#891](https://github.com/rigortype/rigor/pull/891)）。
- **[incremental]**クラスを宣言しているファイルが削除された場合、ウォーム実行の`--incremental`は、そのクラスがまだ存在しているかのように報告し続ける代わりに、そのクラスを単に参照しているファイルを再チェックするようになりました（[#958](https://github.com/rigortype/rigor/pull/958)）。
- **[incremental]**エディタモード（`--tmp-file` / `--instead-of`）での`rigor check --incremental`が、ディスク上のファイルに対する回答をサイレントに提供する代わりに、バッファのバイト列とその依存関係を解析するようになりました（[#966](https://github.com/rigortype/rigor/pull/966)）。
- **[incremental]**何も変更されていないウォーム実行の`--incremental`再チェックが、コールド実行と同じ`rbs.coverage.definition-build-failed`および`rbs.coverage.hkt-scan-failed`の行を報告するようになり、HKTスキャンを繰り返すためだけにRBS環境を解決することがなくなりました（[#978](https://github.com/rigortype/rigor/pull/978)）。
- **[rigor check]**オプトインのRactorバックエンドでのプール実行が、逐次実行やforkプール実行と同様に、rbs-inlineコメント内にのみ存在するアノテーションに対する`effect.annotations-unchecked`行を報告するようになりました（[#813](https://github.com/rigortype/rigor/pull/813)）。
- **[check]**リスコフ（Liskov）のオーバーライド規則が、プロジェクト側の内容がクラスメソッドのみである親クラスを認識するようになり、そのような親から継承された`sig/`宣言のメソッドがスキップされずにオーバーライドと比較されるようになりました（[#892](https://github.com/rigortype/rigor/pull/892)）。
- **[rigor coverage]** `--protection --mutation`が、Rigor自身の共有型ユニバースのビルドを破壊した変異体（mutant）を通常の測定としてスコアリングしなくなり、劣化した環境は次の変異体が測定される前に置き換えられるようになりました（[#790](https://github.com/rigortype/rigor/issues/790)、[#894](https://github.com/rigortype/rigor/pull/894)）。
- **[rigor coverage]** `Gemfile.lock`のないプロジェクトが、未解決の定数をそれを宣言しているインストール済みgemに帰属させるようになり、`--protection`は全体をエンジンギャップとして報告する代わりに、そのgem境界を`add_rbs`へとルーティングするようになりました（[#952](https://github.com/rigortype/rigor/pull/952)）。
- **[rigor unused]**プロジェクトが再オープンしたgemのクラスが未使用（unused）の候補としてリストされなくなりました: 所有権テストは`rigor check`と同じ依存関係ソースを読み取ります（[#882](https://github.com/rigortype/rigor/issues/882)、[#888](https://github.com/rigortype/rigor/pull/888)）。
- **[sig-gen]** `sig/`の宣言が`void`を返すメソッドが`tighter-return`として報告されなくなり、`sig-gen --diff`はそれに対して何も提案せず、`--write`も`--overwrite`もそれを置き換えることができなくなりました（[#845](https://github.com/rigortype/rigor/pull/845)）。
- **[sig-gen]** `rigor sig-gen`がリテラルであると証明した戻り値が、より広い既存の宣言に対して`tighter-return`として提案されなくなりました; `.rbs`が宣言していないメソッドは引き続きそのリテラルを取得します（[#850](https://github.com/rigortype/rigor/pull/850)）。
- **[rigor doctor]** `rigor doctor`および`rigor skill describe`の背後にあるプラグインギャップアドバイザリが、プロセスがたまたま読み込んだり登録したりしたプラグインクラスに依存しなくなり、有効化されたプラグインがギャップとして報告されることがなくなりました（[#967](https://github.com/rigortype/rigor/pull/967)、[#982](https://github.com/rigortype/rigor/pull/982)）。
- **[cli]** `rigor init`が生成する`.rigor.yml`が、古い31件中7件のサブセットの代わりに、出荷されたすべてのルールIDを`disable:`コメントにリストし、詳細については`rigor explain <rule>`を案内するようになりました（[#947](https://github.com/rigortype/rigor/pull/947)）。
- **[cli]** `rigor help`が`baseline`と`unused`をリストするようになり、`rigor playground`が最初の引数を落とさなくなったため、`--port=`が尊重され、引数なしの素の`rigor playground`が起動するようになりました（[#906](https://github.com/rigortype/rigor/pull/906)）。
- **[engine]** Rigor自身のセルフチェック（`rigor check lib`）が再び警告ゼロになりました（[#810](https://github.com/rigortype/rigor/pull/810)）。

## [0.3.8] - 2026-09-08

v0.3.8はv0.3.7を採用したプロジェクト向けの安定化リリースです。`rbs collection`がインストールされたプロジェクトのすべてのファイルで発生していた`internal analyzer error: unknown keyword: :name_scope`エラーを解消し、残っていた共有ビルドのクラッシュの種類を、ファイルごとの同一のエラーの代わりに単一の実行レベルの行へと集約しました。絞り込み実行やプール実行（`--incremental`、`--verify-incremental`、`--workers`）がフル実行と同じ実行レベルの行を報告するようになり、バンドルされたRBSと衝突するプロジェクトの`.rbs`は型ユニバース全体を破棄する代わりに隔離され、不正な形式のHKTディレクティブはサイレントに破棄される代わりに報告され、`rigor sig-gen`があらゆるパラメータ形状に対してシグネチャを出力するようになりました。

### 修正

- **[engine]** `rbs collection`がインストールされているプロジェクトにおいて、`rigor check`がすべてのファイルで`internal analyzer error: ArgumentError: unknown keyword: :name_scope`（または`args must be non-empty`）で失敗することがなくなりました（[#776](https://github.com/rigortype/rigor/issues/776)、[#786](https://github.com/rigortype/rigor/issues/786)、[#783](https://github.com/rigortype/rigor/pull/783)、@n-rodriguezに感謝します！）。
  - 本体にタプル、レコード、インターフェース、または束縛されていない変数を含む再帰的な`type`エイリアスがHKTとして登録されるようになり、不正な形式の自己参照エイリアスは共有レジストリのビルドを中断する代わりに拒絶されるようになりました。
- **[engine]** RBSの`type`エイリアスに対する暗黙のHKTスキャンで例外が発生した際、すべてのファイルが同一の`internal analyzer error`で失敗する代わりに、`rigor check`は実行ごとに1回`rbs.coverage.hkt-scan-failed`として報告し、バンドルおよびプラグインのHKT登録に基づいて解析を継続するようになりました（[#784](https://github.com/rigortype/rigor/issues/784)、[#788](https://github.com/rigortype/rigor/pull/788)）。
- **[rigor check]** HKT登録を提供中にマニフェストが例外を発生させたプラグインが、キャッチされない例外で中断する代わりに、そのプラグインを名指しする同じ`rbs.coverage.hkt-scan-failed`エラーとして実行ごとに1回表面化し、バンドルされた登録とプロジェクト自身の`.rbs`オーバーレイに基づいて実行が継続されるようになりました（[#791](https://github.com/rigortype/rigor/issues/791)、[#802](https://github.com/rigortype/rigor/pull/802)）。
- **[engine]**絞り込み実行（`--verify-incremental`のパーティションまたは`--incremental`の再チェック）がプロジェクト全体に対してRBS環境を構築するようになり、フル実行と同じプラグイン合成シグネチャを保持するようになりました（[#793](https://github.com/rigortype/rigor/issues/793)、[#788](https://github.com/rigortype/rigor/pull/788)）。
  - 再チェックが実行レベルの行を2回報告したり（`effect.annotations-unchecked`、`source-rbs-annotation-not-honoured`）、何も変更されていないウォーム実行でrbs-inlineの`effect.annotations-unchecked`を脱落させたりすることがなくなりました。
- **[engine]**何も変更されていないウォーム実行の`rigor check --incremental`が、以前は2回目の実行で消失していたコールド実行と同じプロジェクトシグネチャの行（`rbs.coverage.quarantined-signature`、`rbs.coverage.synthesized-namespace`、および`rigor:v1:conforms-to`クラスに対する`rbs.coverage.definition-build-failed`）を報告するようになりました（[#788](https://github.com/rigortype/rigor/pull/788)）。
  - `reject-unparseable-signatures`機能の下では、その消失によって失敗していたプロジェクトがパスするように見えてしまっていました。
- **[rigor check]**プールされた`--workers N`実行が、サイレントにより少ない行しか報告しない代わりに、同じプロジェクトに対する逐次実行と同じquarantined-signature、synthesized-namespace、およびdefinition-build-failedの行を（`--no-stats`下も含めて）報告するようになりました（[#798](https://github.com/rigortype/rigor/issues/798)、[#803](https://github.com/rigortype/rigor/pull/803)）。
- **[rigor check]**プロジェクトのRBSが解決不能な`rigor:v1:*`ディレクティブペイロードまたは非可逆なシェイプ射影（lossy shape projection）を含む場合に、`--workers N`実行が`pool-degraded`警告とともに逐次再解析へと縮退することがなくなりました（[#805](https://github.com/rigortype/rigor/issues/805)、[#808](https://github.com/rigortype/rigor/pull/808)）。
- **[effects]** `--verify-incremental`のパーティション、`--incremental`の再チェック、またはエディタバッファの実行が、プロジェクト全体のエフェクトエンベロープ（effect envelopes）を走査するようになり、解析対象サブセットの外側のファイルで宣言されたエンベロープが見落とされることがなくなり、`effect.unknown-label`がフル実行と一致するようになりました（[#795](https://github.com/rigortype/rigor/issues/795)、[#800](https://github.com/rigortype/rigor/pull/800)）。
- **[rigor check]**充足されていない`%a{rigor:v1:conforms-to}`ディレクティブが、RBS環境がキャッシュから取得されたかどうかにかかわらず記述された行で報告されるようになり、`--verify-incremental`が失敗しなくなり、変更のないツリーでのウォーム`--incremental`実行が行を移動させることがなくなりました（[#799](https://github.com/rigortype/rigor/issues/799)、[#804](https://github.com/rigortype/rigor/pull/804)）。
- **[engine]**バンドルされたRBSと種別（カインド）衝突する`signature_paths:`の`.rbs`（バンドルされた`module Base64`に対するプロジェクトの`class Base64`）が、RBS環境全体を崩壊させる代わりに隔離されるようになり、型ユニバースの残りとその診断が機能し続けるようになりました（[#777](https://github.com/rigortype/rigor/issues/777)、[#780](https://github.com/rigortype/rigor/pull/780)、@bash0C7に感謝します！）。
- **[rbs]**多くのクラスに影響を与える重複したRBSメソッド宣言が、クラスごとの長大な警告（banner）の代わりに1つの有界な警告を生成するようになり、カバレッジ診断は失敗したクラスとメンバーを保持するようになりました（[#718](https://github.com/rigortype/rigor/issues/718)、[#768](https://github.com/rigortype/rigor/pull/768)）。
- **[rbs]** RBS内の不正な形式の`rigor:v1:hkt_register` / `rigor:v1:hkt_define`ディレクティブが、型コンストラクタが暗黙に欠落するようにサイレントに破棄される代わりに、アノテーション箇所で`dynamic.rbs-extended.hkt-directive-invalid` info診断として報告されるようになりました（[#785](https://github.com/rigortype/rigor/issues/785)、[#801](https://github.com/rigortype/rigor/pull/801)）。
- **[sig-gen]** `rigor sig-gen`が、必須位置引数以外のすべてのメソッドをサイレントにドロップする代わりに、パラメータ形状（optional、rest、keyword、keyword-rest、`...`フォワーディング、`&block`）に関わらず、戻り値を推論できるあらゆるメソッドに対してシグネチャを出力するようになりました（[#778](https://github.com/rigortype/rigor/issues/778)、[#797](https://github.com/rigortype/rigor/pull/797)、@bash0C7に感謝します！）。
  - `--format=json`は拒否された各メソッドをその`skip_reason`とともにリストし、テキストモードは理由ごとの件数を標準エラー出力に1行で出力します。
## [0.3.7] - 2026-09-05

v0.3.7は、すでに書かれているRubyやRailsを型付けすることに焦点を当てています。コンパクト名前空間やルート化された名前空間がRubyと同じ挙動で解決されるようになったため、`class Admin::UsersController`や`::Rails`が偽の`undefined method`を引き起こすことがなくなり、日常的なRailsのサーフェス（`params`、Duration、`Time`/`Date`、ActiveRecordのテーブル名）が不透明（opaque）になる代わりに型を持つようになりました。新しいプラグインがFFIバインディングやdry-monadsの`Result` / `Maybe`をカバーします（[ADR-20](../adr/20-lightweight-hkt/)、[ADR-30](../adr/30-rigor-ffi-plugin-shape/)）。`rigor type-of`は1つのプロセスで複数の位置に回答できるようになり、カバレッジは`check`が実行するのと同じエンジンを計測するようになり、残りの修正によりStructファクトリの本体、gitソースのgem、そしてサーフェスを列挙できないレシーバー上での偽の`undefined-method`のクラスが解消されました。

### 追加

- **[plugins]** `rigor-ffi`プラグインファミリーが、FFIバインディングをuntypedのままにするのではなく型付けするようになりました（[ADR-30](../adr/30-rigor-ffi-plugin-shape/)、[#141](https://github.com/rigortype/rigor/issues/141)、[#719](https://github.com/rigortype/rigor/pull/719)）。
  - コアの`rigor-ffi`は`attach_function`、構造体レイアウト、コールバック、薄いラッパーをカバーし、sassc、ethon、rbnacl、ffi-rzmq向けのアダプターが同梱されます。

- **[types]**ファーストクラスの`Result`および`Maybe`キャリアが着地し、それらを登録する`rigor-dry-monads`プラグインが追加されました（[ADR-20](../adr/20-lightweight-hkt/)、[#128](https://github.com/rigortype/rigor/issues/128)、[#712](https://github.com/rigortype/rigor/pull/712)）。
  - 再帰的な`type`エイリアスが暗黙的にHKTを登録するようになり、`rigor-lisp-eval`はletパターンをそれらのキャリアに束縛します。

- **[rigor check]**同じメソッドを2回宣言している`.rbs`が、stderrへの1行のみではなく`rbs.coverage.definition-build-failed`として報告されるようになりました（[#696](https://github.com/rigortype/rigor/issues/696)、[#725](https://github.com/rigortype/rigor/pull/725)）。
  - この警告は`--format json`、SARIF、CIアノテーション、およびLSPに表示されるため、メソッドサーフェス全体をサイレントに失ったクラスが可視化されます。
  - `reject-unparseable-signatures` bleeding-edge機能により、これがエラーに昇格します。

- **[engine]** `JSON.generate`および`JSON.pretty_generate`が、untypedではなく`String`として型付けされるようになりました（[#571](https://github.com/rigortype/rigor/pull/571)）。
  - アップストリームのRBSは`pretty_generate`を名前付きレシーバーの不透明（opaque）なギャップとして残していました。

- **[inference]**あるファイルで定数に代入されたSymbol、Integer、Float、またはbooleanのリテラルが、他のすべてのファイルの読み取り側で型付けされるようになりました（[#644](https://github.com/rigortype/rigor/issues/644)、[#669](https://github.com/rigortype/rigor/pull/669)）。
  - 設定ファイル内の`DEFAULT_LIMIT = 50`は、untypedになる代わりに、それが使用されるすべての場所で`50`になります。
  - 2つのファイルが代入する定数、1つのファイルが2回代入する定数、または値がString、Array、Hash、`nil`、任意の計算式である定数は、漸進的（gradual）なままとなります。

- **[plugins]**以前はuntypedとして読み取られていた3つのRailsサーフェスが型を持つようになりました（[#534](https://github.com/rigortype/rigor/issues/534)、[#585](https://github.com/rigortype/rigor/pull/585)）。
  - `Rails.logger` / `.cache` / `.configuration` / `.application`（rigor-railties）。
  - `1.day`およびその他のすべてのActiveSupport継続時間乗数、ならびにそれらの前後の`+` / `-` / `*`算術演算（rigor-activesupport-core-ext）。
  - `perform_async` / `perform_in` / `perform_at`が返すジョブID（rigor-sidekiq）。

- **[plugins]** `ActiveSupport::Duration`のリーダーおよび`ago`ファミリーが、不透明（opaque）になる代わりに型付けされるようになりました（[#632](https://github.com/rigortype/rigor/issues/632)、[#666](https://github.com/rigortype/rigor/pull/666)、[#659](https://github.com/rigortype/rigor/issues/659)、[#765](https://github.com/rigortype/rigor/pull/765)）。
  - `to_i` / `in_seconds`、`to_f`、`in_minutes`ファミリー、`iso8601`、`parts`が解決されるため、`1.day.to_i * 2`は型付けされたままになります。
  - `ago` / `until` / `before` / `since` / `from_now` / `after`が`Time`として型付けされるため、`30.minutes.ago.iso8601`が解決されます。
  - 同じ宣言が自動適用されるオーバーレイにも同梱されます。オーバーレイのみのプロジェクトは、独自の`ActiveSupport::Duration`型付けされたシグネチャを通じてのみリーダーに到達します。

- **[plugins]** `params[:key]`が`Dynamic`ではなく`ActionController::Parameters?`として型付けされるようになりました（[#574](https://github.com/rigortype/rigor/issues/574)、[#534](https://github.com/rigortype/rigor/issues/534)、[#771](https://github.com/rigortype/rigor/pull/771)）。
  - `params[:user][:name]`のような連鎖した読み取りが型を持つようになります。
  - `call.possible-nil-receiver`は、サーフェスが未知であるクラスをnilチェックが欠落していることの証明として扱わなくなったため、`q = params[:q]; q.strip`は沈黙したままになります。

- **[plugins]** rigor-actionpackはビルダーファミリーを通じて`ActionController::Parameters`チェーンを型付けされたままに保ちます（[#534](https://github.com/rigortype/rigor/issues/534)、[#578](https://github.com/rigortype/rigor/pull/578)）。
  - カバー対象: `except`、`without`、`extract!`、`slice!`、`merge`、`merge!`、`reverse_merge`、`reverse_merge!`、`with_defaults`、`with_defaults!`、`compact`、`compact_blank`、`deep_dup`。

- **[plugins]** rigor-actionpackが`request`の述語を`bool`として型付けし、`flash`チェーンをそのAction Packキャリアとして型付けするようになりました（[#534](https://github.com/rigortype/rigor/issues/534)、[#592](https://github.com/rigortype/rigor/pull/592)）。
  - 15個の述語には`post?`、`xhr?`、`ssl?`が含まれます。`flash.now` / `flash.keep` / `flash.discard`は具体的なレシーバーを維持します。

### 変更

- **[engine]**クラスが`extend`、`extend self`、または`module_function`を通じて獲得したメソッドが、クラス自身の上で解決されるようになりました（[#554](https://github.com/rigortype/rigor/pull/554)、[#526](https://github.com/rigortype/rigor/issues/526)）。
  - 存在チェックと推論された戻り値型の双方が機能します（調査対象コーパスから39件のundefined-method偽陽性が除外されました）。

- **[engine]**ソースコードに`module Api`が一切現れない場合でも、Railsスタイルの暗黙の名前空間が解決されるようになりました（[#551](https://github.com/rigortype/rigor/pull/551)、[#528](https://github.com/rigortype/rigor/issues/528)）。
  - `class Api::V1::AccountsController`内の`Api`が名前空間モジュールとして型付けされます（Mastodonで型精度+1.16ポイント）。

- **[plugins]** rigor-actionpackが`params.expect(...)`および`params.slice(...)`をストロングパラメータチェーンとして型付けするようになりました（[#548](https://github.com/rigortype/rigor/pull/548)、[#534](https://github.com/rigortype/rigor/issues/534)）。
  - Rails 8の`expect`イディオムは、`require`/`permit`チェーンが持つものと同じ型付けされた保護されたレシーバーを維持します。

- **[cli]** `rigor type-of`が1回の呼び出しで複数の位置を受け入れ、列番号を省略可能にしました（[#515](https://github.com/rigortype/rigor/pull/515)）。
  - `rigor type-of file.rb:42`は42行目の最大40個の式をリストするため、チェーンをたどるコストがそれぞれ1プロセスではなく1プロセスで済みます（Railsアプリケーションでの5つの位置: 10.3秒 → 2.1秒）。

- **[cli]** `rigor type-scan`が`rigor check`と同じクロスファイルディスカバリーを使用するようになりました（[#511](https://github.com/rigortype/rigor/pull/511)）。
  - 兄弟ファイルで定義されたクラスが、未認識ノードとしてカウントされることはなくなりました。

- **[engine]**標準ライブラリの`Singleton`ミックスインをインクルードするクラス上の`Foo.instance`が、untypedではなく`Foo`として型付けされるようになりました（[#514](https://github.com/rigortype/rigor/pull/514)）。
  - そのインスタンス上で呼び出すメソッドも型付けされます。

- **[engine]**レシーバーに依存しない`Object`メソッドは、Rigorが`x`を型付けできない場合でも独自の型を持つようになりました（[#508](https://github.com/rigortype/rigor/pull/508)、[#503](https://github.com/rigortype/rigor/issues/503)）。
  - カバー対象: `nil?`、`is_a?`、`respond_to?`、`!`、`frozen?`、`equal?`、`inspect`、`hash`、`object_id`（Rigor自身の`lib`で型精度2.3ポイント向上、新規診断なし）。

- **[cli]** `rigor coverage`および`rigor check --coverage`が、`rigor check`が実行するのと同じエンジンを計測するようになりました（[#535](https://github.com/rigortype/rigor/pull/535)、[#505](https://github.com/rigortype/rigor/pull/505)、[#513](https://github.com/rigortype/rigor/issues/513)、[#523](https://github.com/rigortype/rigor/issues/523)、[#502](https://github.com/rigortype/rigor/issues/502)）。
  - 精度比率は、プロジェクトのクロスファイルメソッド、祖先関係、プラグインによって提供された型をuntypedとして過少報告する代わりに認識するようになります。
  - 精密に畳み込まれた`Data` / `Struct`値は型付け済みとしてカウントされます。兄弟ファイルで定義されたクラスはRigor自身の`lib`で1.4ポイントに相当し、`parameter_inference:`はさらに3.4ポイントに相当します。

### 修正

- **[engine]**セーフナビゲーションが通常の呼び出しとして型付けされることはなくなりました（[#543](https://github.com/rigortype/rigor/pull/543)、[#518](https://github.com/rigortype/rigor/issues/518)、[#519](https://github.com/rigortype/rigor/issues/519)、[#540](https://github.com/rigortype/rigor/issues/540)）。
  - `x&.m`はスキップされた呼び出しが生成するnilを保持し、untypedに縮退する代わりに非nilアームの型を返します。
  - `T | nil`レシーバーに対する通常の呼び出しは、メソッドがnilに対して例外を発生させる場合に`T`の型を返し、同一ファイル内で変更されるミュータブルなリテラル定数（`CACHE = {}`）は、古い空のシェイプを通じて読み取りを畳み込むのをやめます。
  - `call.possible-nil-receiver`は、セーフナビゲーションチェーン、またはnilを保持できないコレクションに対する`include?`テストによって保護された値に対して発火しなくなりました（[#606](https://github.com/rigortype/rigor/issues/606)、[#607](https://github.com/rigortype/rigor/pull/607)）。

- **[engine]**属性代入またはインデックス代入が、ライターメソッドの宣言された戻り値型ではなく、Rubyの定義どおりに代入された値の型を持つようになりました（[#538](https://github.com/rigortype/rigor/pull/538)、[#520](https://github.com/rigortype/rigor/issues/520)）。
  - untypedなハッシュ上の`h[k] = true`がuntypedとして読み取られることはなくなりました。

- **[engine]** `x.attr ||= v`、`x.attr &&= v`、`x.attr += v`が、untypedに陥る代わりに実際の値セマンティクスを持つようになりました（[#552](https://github.com/rigortype/rigor/pull/552)、[#532](https://github.com/rigortype/rigor/issues/532)）。
  - `user.name ||= "anon"`は未サポート構文としてではなく、代入された値として型付けされます。

- **[engine]** `Struct.new(...) do ... end`ブロック内で定義されたメソッドが、構造体の値の上で解決されるようになりました（[#555](https://github.com/rigortype/rigor/pull/555)、[#525](https://github.com/rigortype/rigor/issues/525)、[#591](https://github.com/rigortype/rigor/pull/591)）。
  - `Line.new(text).describe`はuntypedとして読み取られる代わりにブロック内のdefの戻り値を推論し、レシーバーのないメンバー読み取りはメンバーが既知である場合に呼び出し元の値へと畳み込まれます。
  - `Class.new(Struct.new(...))`および`Class.new(Data.define(...))`が引数型の不一致を報告しなくなり、結果のクラスは宣言されたメンバーを保持します（[#634](https://github.com/rigortype/rigor/issues/634)、[#687](https://github.com/rigortype/rigor/pull/687)）。
  - `Line.new("a").with_text("z").text`のようなフルーエントチェーンは、セッターが変更した後に構築時の値を報告しなくなりました（[#595](https://github.com/rigortype/rigor/issues/595)、[#598](https://github.com/rigortype/rigor/pull/598)）。
  - `Struct`のメンバー読み取りは、メソッド内の先行する`if`または`while`の後でも既知の値へと引き続き畳み込まれます（[#589](https://github.com/rigortype/rigor/issues/589)、[#596](https://github.com/rigortype/rigor/pull/596)）。
  - `Const = Struct.new(…) do … end`本体内部で`call.unresolved-toplevel`が発火しなくなり、`Kernel`メソッドをシャドウするメンバーがメンバーとして読み取られるようになりました（[#590](https://github.com/rigortype/rigor/issues/590)、[#619](https://github.com/rigortype/rigor/pull/619)）。
  - クラス自身が定義したメソッドが、同名の無関係なトップレベル`def`によってシャドウされることはなくなりました（[#618](https://github.com/rigortype/rigor/issues/618)、[#636](https://github.com/rigortype/rigor/pull/636)）。

- **[engine]**オプショナル引数、キーワード引数、レスト引数、またはブロックパラメータを持つ自身のメソッドを呼び出した際に、推論された戻り値型が失われなくなりました（[#547](https://github.com/rigortype/rigor/pull/547)、[#524](https://github.com/rigortype/rigor/issues/524)）。
  - 呼び出しサイトのバインダーは、シグネチャ全体を諦める代わりに、デフォルト値や`options = {}`を含め、特定できる各パラメータをバインドします。

- **[engine]**長さ引数なしの`File.read(path)`および`IO.read(path)`が、`String?`ではなく`String`として型付けされるようになりました（[#547](https://github.com/rigortype/rigor/pull/547)）。
  - ファイル全体の読み取りに対するガードが、あり得ないnilにフラグを立てるのをやめます。

- **[engine]** `alias_method :new_name, :old_name`が`alias`キーワードと同様に解決されるようになりました（[#549](https://github.com/rigortype/rigor/pull/549)、[#533](https://github.com/rigortype/rigor/issues/533)）。
  - リテラルシンボルを伴う`x.send(:selector)`は、プライベートメソッドを含め、直接呼び出しと同様に解決されます。

- **[engine]** Rigorが引数を型付けできない呼び出しにおいて、宣言順序によってRBSオーバーロードが1つ選択されることはなくなりました（[#537](https://github.com/rigortype/rigor/pull/537)、[#521](https://github.com/rigortype/rigor/issues/521)）。
  - untypedな`n`を伴う`[true] * n`が`String`として読み取られることはなくなりました（調査対象コーパス全体で18件の偽陽性を除去、新規追加はゼロ）。

- **[engine]**オーバーロードの選択において、エイリアス宣言されたパラメータが見通されるようになりました（[#558](https://github.com/rigortype/rigor/pull/558)、[#529](https://github.com/rigortype/rigor/issues/529)）。
  - 具体的なクラスへと展開されるエイリアスは、すべてを漸進的に受け入れてリスト順で勝つ代わりに、一致しない引数を拒絶します。

- **[engine]** RBSの型エイリアスおよびインターセクション（交差型）が、untypedに縮退する代わりに変換されるようになりました（[#556](https://github.com/rigortype/rigor/pull/556)、[#529](https://github.com/rigortype/rigor/issues/529)）。
  - Prismの`type node = Node & _Node`は`Prism::Node`として読み取られ、エイリアス化された戻り値、パラメータ、ブロックパラメータはエイリアステーブルを通じて解決されます。

- **[check]** `def.return-type-mismatch`の宣言側およびADR-35オーバーライド規則が、RBSの型エイリアスを見通すようになりました（[#557](https://github.com/rigortype/rigor/pull/557)、[#529](https://github.com/rigortype/rigor/issues/529)）。
  - エイリアス宣言されたシグネチャと矛盾する再定義は、サイレントに受け入れられるのではなく報告されます。

- **[engine]**スロット書き換えミューテーターが、リテラルコレクションのシェイプとともに値のピン留めを拡大するようになりました（[#561](https://github.com/rigortype/rigor/pull/561)、[#560](https://github.com/rigortype/rigor/issues/560)、[#581](https://github.com/rigortype/rigor/pull/581)、[#593](https://github.com/rigortype/rigor/pull/593)）。
  - カバー対象: `t[0] += 5`、`opts[:k] = v`、`fill`、`map!`、`push`、`concat`。
  - アナライザーが読み取れない引数で変更されたコレクション（`m.concat(xs)`）は、元の要素値を保持しなくなりました（[#580](https://github.com/rigortype/rigor/issues/580)、[#593](https://github.com/rigortype/rigor/pull/593)）。

- **[engine]**エンジンがシェイプを特定できないレシーバーに対するインデックス書き込みが、Hash型を合成することはなくなりました（[#559](https://github.com/rigortype/rigor/pull/559)、[#553](https://github.com/rigortype/rigor/issues/553)）。
  - mailの`compose_codepoints`は、呼び出し元の`.pack`で発火していた幻の`Hash[Integer | Range, ...]`ではなく、untypedを返します。

- **[engine]**非リテラルのサイズを持つ`Array.new(n)`、`Array.new(n, value)`、`Array.new(n) { … }`が要素型を持つようになりました（[#615](https://github.com/rigortype/rigor/issues/615)、[#650](https://github.com/rigortype/rigor/pull/650)）。
  - 後のブロック内で追加された値がそれを置き換えることはなくなったため、`acc = Array.new(n, "x"); acc.push(1); acc.first.upcase`は`undefined method 'upcase' for 1`を報告しなくなりました。

- **[engine]**ブロックやループ本体で追加が行われる、`Array[untyped]`または`Hash[untyped, untyped]`と宣言されたパラメータが、宣言された漸進的アームを保持するようになりました（[#586](https://github.com/rigortype/rigor/issues/586)、[#616](https://github.com/rigortype/rigor/pull/616)）。
  - 正しいコードにおける後続の`a.first.upcase`が`call.undefined-method`を引き起こすことはなくなりました。

- **[engine]** untypedな値または配列のいずれかを保持しうる変数は、ブロックまたは`while`本体内で追加が行われた際にuntyped側の半分を失わなくなりました（[#631](https://github.com/rigortype/rigor/issues/631)、[#649](https://github.com/rigortype/rigor/pull/649)）。
  - `out = flag ? u : [2]`は両方のアームを保持するため、正しいコードにおける`out.first.upcase`が`call.undefined-method`を引き起こすのをやめます。

- **[engine]**キャプチャされたコレクションをその場で変更した後にそれを返すブロックは、呼び出しを拡大されたコレクションとして型付けするようになりました（[#587](https://github.com/rigortype/rigor/issues/587)、[#620](https://github.com/rigortype/rigor/pull/620)）。
  - 外部のローカル変数を再代入する配列リテラルに対する`map` / `select`ブロックは、すべての要素を最初のイテレーションの値にピン留めする代わりに、いずれかのイテレーションでそのローカル変数が取りうる値として各要素を型付けします。

- **[engine]**最後の式がブロック自身で代入した変数を読み取るブロックは、その値として型付けされるようになりました（[#533](https://github.com/rigortype/rigor/issues/533)、[#584](https://github.com/rigortype/rigor/pull/584)）。
  - `m.synchronize do v = compute; v end`は、`m.synchronize { compute }`と同等に精密に型付けされます。

- **[engine]**リファインされた文字列（refined strings）上のメソッドが、呼び出し全体をuntypedに失う代わりに、基盤となる`String`を通じて解決されるようになりました（[#550](https://github.com/rigortype/rigor/pull/550)、[#533](https://github.com/rigortype/rigor/issues/533)）。
  - `RUBY_VERSION != "1.0"`および`RUBY_VERSION.split(".")`が型付けされます。Rigorから見えないクラスに対する`is_a?`ガードは、保護された分岐で古い型を保持しなくなりました。

- **[engine]**静的に畳み込まれた`Set`定数上のブロックを取る呼び出しが、ブロックなしメソッドの定数を返すことはなくなりました（[#546](https://github.com/rigortype/rigor/pull/546)、[#539](https://github.com/rigortype/rigor/issues/539)）。
  - `NAMES.any? { … }`はブロックによって決定されるため、誤った畳み込みによって到達可能な条件が常に真（always-truthy）としてフラグを立てられることはなくなりました。

- **[engine]** Rigorがハッシュを完全に見通せない場合に、`h[k] ||= default`が後続の`h[k]`読み取りをデフォルト値にピン留めすることはなくなりました（[#545](https://github.com/rigortype/rigor/pull/545)、[#544](https://github.com/rigortype/rigor/issues/544)）。
  - `||=`によって保持された呼び出し元提供の値が、畳み込みによって消え去ることはなくなりました。

- **[engine]**あるメソッドによって渡され、その参照を通じて値が格納されたコレクションが、依然として空であると読み取られることはなくなりました（[#507](https://github.com/rigortype/rigor/pull/507)、[#506](https://github.com/rigortype/rigor/issues/506)）。
  - `(bucket_for(entry)[key] ||= {})[name] = row`によって、クラスの他のすべてのメソッドにおいて`empty?`および`size`が定数へと畳み込まれることはなくなりました。

- **[engine]** `h[k] ||= v`、`h[k] &&= v`、または`h[k] += v`を通じて値が格納されたコレクションが、初期化時のシェイプを依然として保持していると読み取られることはなくなりました（[#504](https://github.com/rigortype/rigor/pull/504)、[#501](https://github.com/rigortype/rigor/issues/501)）。
  - それらに対する`empty?`および`size`が定数へと畳み込まれるのをやめます。

- **[engine]**コンパクトな名前空間宣言の内部で参照された定数が、Rubyと同じ挙動で解決されるようになりました（[#652](https://github.com/rigortype/rigor/issues/652)、[#685](https://github.com/rigortype/rigor/pull/685)）。
  - `module MyApp::Inner`内に書かれた`Rails`は、`MyApp::Rails`ではなくトップレベルの`Rails`に到達します。
  - そのような名前に対する`is_a?` / `case` / `when` / `Class === x`ガードが、ネストしたパスを含め、読み取りとともに修正されました（[#635](https://github.com/rigortype/rigor/issues/635)、[#664](https://github.com/rigortype/rigor/pull/664)）。
  - その形式の内部で代入されたivar、cvar、または定数は、Rubyが解決するクラスとして記録されます（[#681](https://github.com/rigortype/rigor/issues/681)、[#692](https://github.com/rigortype/rigor/pull/692)）。
  - メソッドの推論された戻り値型は、`--incremental`の再チェック時を含め、宣言クラスの名前空間で定数を解決します（[#707](https://github.com/rigortype/rigor/issues/707)、[#709](https://github.com/rigortype/rigor/pull/709)、[#715](https://github.com/rigortype/rigor/pull/715)）。

- **[engine]**先頭に`::`を付けて書かれた定数が、周囲の名前空間内の同名の定数ではなく、トップレベルの定数へと解決されるようになりました（[#614](https://github.com/rigortype/rigor/issues/614)、[#642](https://github.com/rigortype/rigor/pull/642)）。
  - `MyApp::Rails`も定義している`module MyApp`内の`::Rails.logger`は、フレームワークの`Rails`として型付けされます。
  - 先頭に`::`を付けて開かれたクラスまたはモジュールは、Rubyが与える名前によって認識されます:`module Outer`内の`class ::Admin::Widget`は`Admin::Widget`です（[#708](https://github.com/rigortype/rigor/issues/708)、[#638](https://github.com/rigortype/rigor/issues/638)、[#721](https://github.com/rigortype/rigor/pull/721)）。
  - `class Sub < ::Base`は、独自に`Base`を定義している名前空間の内部であっても、トップレベルの`Base`を継承するようになりました（[#722](https://github.com/rigortype/rigor/issues/722)、[#637](https://github.com/rigortype/rigor/issues/637)、[#754](https://github.com/rigortype/rigor/pull/754)）。
  - `rigor unused`は、`::Foo`の参照を同名のシャドウではなくトップレベルの宣言に帰属させます（[#625](https://github.com/rigortype/rigor/issues/625)、[#755](https://github.com/rigortype/rigor/pull/755)）。

- **[engine]**名前空間の内部でパスを通じて代入された定数が、その綴りが解決される名前空間の下に登録されるようになりました（[#690](https://github.com/rigortype/rigor/issues/690)、[#706](https://github.com/rigortype/rigor/pull/706)）。
  - `module Admin`内に書かれた`Holder::DEFAULT = Post`は、その囲む名前空間をスコープに入れて型付けされます。
  - `class_eval`ブロックの定数書き込みはブロックが実行されるクラスに帰属し、実行時レシーバー（`[Foo].each { |k| k::X = 1 }`）が素の`X`の下で公開されることはなくなりました（[#705](https://github.com/rigortype/rigor/issues/705)、[#711](https://github.com/rigortype/rigor/pull/711)）。

- **[engine]**トップレベルで定義されたメソッドが、その本体内の定数をRubyと同じ挙動でトップレベルで解決するようになりました（[#716](https://github.com/rigortype/rigor/issues/716)、[#764](https://github.com/rigortype/rigor/pull/764)）。
  - 任意の`class`や`module`の外側に書かれた`def helper = Post.new`は、独自の`Post`を宣言している`module Admin`の内部から呼び出された場合でも`::Post`を指名します。

- **[engine]**定数名やクラス名の解析が、Rigor自体の内部でライブラリをロードして実行することはなくなりました（[#680](https://github.com/rigortype/rigor/issues/680)、[#691](https://github.com/rigortype/rigor/pull/691)、[#689](https://github.com/rigortype/rigor/issues/689)、[#753](https://github.com/rigortype/rigor/pull/753)）。
  - オプショナルなgemが欠落しているときに`exit`を呼び出すautoloadによって、診断なしに`rigor check`が終了させられることはなくなりました。

- **[engine]** RSpecスタイルのブロック内の呼び出しは、ブロックに`if`が含まれている場合でも、無関係なファイルの同名のトップレベル`def`にバインドされなくなりました（[#600](https://github.com/rigortype/rigor/issues/600)、[#603](https://github.com/rigortype/rigor/pull/603)）。
  - `expect { … }.to output(/x/)`が自身の`def output`によってキャプチャされることはなくなりました。

- **[engine]** Rubyバージョンガードによって除外されたアーム内のコードが報告されることはなくなりました（[#627](https://github.com/rigortype/rigor/issues/627)、[#647](https://github.com/rigortype/rigor/pull/647)）。
  - `rigor`がリテラルから`RUBY_VERSION >= "3.1"`または`RUBY_ENGINE == "jruby"`を判定できる場合、チェック対象のRuby上で実行できない分岐は到達不能として扱われます。

- **[engine]**プラグインに由来する型を持つ呼び出しにおいて、プロジェクト独自の`sig/`がそのレシーバーの一部を宣言しているもののプラグインがカバーするメソッドを宣言していない場合に、`undefined method`を報告しなくなりました（[#653](https://github.com/rigortype/rigor/issues/653)、[#702](https://github.com/rigortype/rigor/pull/702)）。
  - `rigor-railties`下の`Rails.logger`が該当します。

- **[engine]** `git:`ソースのgemが自身の`sig/`を提供し、欠落RBSインデックス内で自身の定数を所有するようになりました（[#611](https://github.com/rigortype/rigor/issues/611)、[#761](https://github.com/rigortype/rigor/pull/761)、[#763](https://github.com/rigortype/rigor/issues/763)、[#772](https://github.com/rigortype/rigor/pull/772)）。
  - フォークのシグネチャが、公開されたgemと同様に取得されます。
  - それへの参照は、汎用的なエンジンギャップとしてではなく「このgemはRBSを出荷していません」として報告されます。

- **[engine]** `rigor check --incremental`が、プロジェクト内の何者もまだ宣言していない定数を読み取るファイルを再解析するようになりました（[#622](https://github.com/rigortype/rigor/issues/622)、[#648](https://github.com/rigortype/rigor/pull/648)）。
  - それを定義するクラスやモジュールを後から追加した場合でも、フル実行と同じ診断が報告されます。

- **[types]**プロジェクトの基底クラスで定義されたクラスメソッドが、`Dynamic[top]`と型付けされる代わりにサブクラス上で解決されるようになりました（[#731](https://github.com/rigortype/rigor/issues/731)、[#748](https://github.com/rigortype/rigor/pull/748)）。
  - 継承されたファクトリ、レジストリ、および`class << self`ヘルパーが戻り値型を獲得します。

- **[types]** `self`を再束縛するブロック内のミックスイン呼び出しが、レキシカルに囲むクラスに帰属することはなくなりました（[#728](https://github.com/rigortype/rigor/issues/728)、[#749](https://github.com/rigortype/rigor/pull/749)）。
  - `Thing = Class.new { include M }`はそのクラスに`M`のメソッドを配置しなくなり、`Recv.class_eval { include M }`は`Recv`に記録され、`class << self`のincludeはインスタンスサーフェスに到達するのをやめます。

- **[check]**レシーバーのメソッドサーフェスを列挙できない場合に、`call.undefined-method`が発火しなくなりました（[#723](https://github.com/rigortype/rigor/issues/723)、[#733](https://github.com/rigortype/rigor/pull/733)、[#739](https://github.com/rigortype/rigor/issues/739)、[#741](https://github.com/rigortype/rigor/pull/741)、[#742](https://github.com/rigortype/rigor/issues/742)、[#743](https://github.com/rigortype/rigor/pull/743)、[#746](https://github.com/rigortype/rigor/issues/746)、[#747](https://github.com/rigortype/rigor/pull/747)）。
  - これには、ミックスインモジュール型、`Class` / `Module`値、ロードされたRBSでインクルードが宣言されていないクラス、およびプロジェクトのスーパークラスがソースコードでメソッドを定義している`sig/`クラスが含まれます。

- **[check]** `mattr_accessor`、`cattr_accessor`、それらのリーダー/ライター表記、および`class_attribute`がメソッドを導入するものとして記録されるようになりました（[#736](https://github.com/rigortype/rigor/issues/736)、[#740](https://github.com/rigortype/rigor/pull/740)）。
  - `sig/`でそれらを宣言していないクラスが、それらが定義するアクセサに対して偽の`call.undefined-method`を引き起こすのをやめます。

- **[check]** `rigor check path/to/one_file.rb`が、そのファイルについてプロジェクト全体の実行が報告するのと同じ内容を報告するようになりました（[#684](https://github.com/rigortype/rigor/issues/684)、[#734](https://github.com/rigortype/rigor/pull/734)）。
  - 解析が明示的なファイルリストを対象としている場合でも、クロスファイルディスカバリーパスは設定されたプロジェクト全体に及びます。

- **[check]** Rigorがクラス関係を判定できない`case` / `is_a?`アームが、到達不能（unreachable）として報告されることはなくなりました（[#657](https://github.com/rigortype/rigor/issues/657)、[#751](https://github.com/rigortype/rigor/pull/751)）。
  - コアクラスを再オープンしてプロジェクトモジュールをインクルードした際に、そのモジュールに対するすべてのマッチがデッドコードとして読み取られることはなくなりました。

- **[sig-gen]** `rigor sig-gen --write`が、次の実行を悪化させるような`sig/`を出力することはなくなりました（[#735](https://github.com/rigortype/rigor/issues/735)、[#737](https://github.com/rigortype/rigor/pull/737)）。
  - ロードされたRBSがスーパークラスを宣言していない宣言はスキップされ、未解決のスーパークラスがstderrで名指しされます。
  - ジェネリックスーパークラスはその型引数を伴って書き出され、生成されるスーパークラスはRubyが解決するものになります（[#722](https://github.com/rigortype/rigor/issues/722)、[#738](https://github.com/rigortype/rigor/pull/738)）。
  - 署名されていないサブクラスがそれをオーバーライドする場合、基底メソッドのシグネチャは差し控えられます（[#744](https://github.com/rigortype/rigor/issues/744)、[#745](https://github.com/rigortype/rigor/pull/745)）。

- **[cli]** `rigor coverage --protection`が、穴を実際に役立つ原因へと帰属させるようになりました（[#536](https://github.com/rigortype/rigor/pull/536)、[#522](https://github.com/rigortype/rigor/issues/522)、[#530](https://github.com/rigortype/rigor/issues/530)、[#773](https://github.com/rigortype/rigor/pull/773)）。
  - Rigorが戻り値型を推論できなかった自身のメソッドへの呼び出しは、「未サポート構文」ではなく推論ギャップになります。
  - RBSを出荷していないgemに存在するクラスから継承されたメソッドは、エンジンギャップではなくそのgemに帰属させられます。

- **[rigor coverage]** `--protection --mutation`は、ミュータントの計測中にRigor自身の解析がクラッシュした場合に、ミュータントを生存（survivor）として報告しなくなりました（[#686](https://github.com/rigortype/rigor/issues/686)、[#725](https://github.com/rigortype/rigor/pull/725)）。
  - それらのミュータントは`harness_errors`バケットに入り、有効性数値は差し控えられ、コマンドは未計測のファイルを名指しして非ゼロで終了します。

- **[plugins]**コミットされた`db/schema.rb`がなく生のマイグレーションを出荷しているプロジェクト上で、`rigor-activerecord`が自身を無効化することはなくなりました（[#569](https://github.com/rigortype/rigor/issues/569)、[#576](https://github.com/rigortype/rigor/pull/576)）。
  - モデルのソースのみからテーブル名、ファインダー、スコープ、アソシエーションを型付けし、カラムに依存するチェックのみを取り下げます（stands down）。
  - `Model.table_name`は`String`として型付けされ、ソースコードが`self.table_name = "…"`で宣言している場合は正確なテーブル名として型付けされます。
  - 「オープン」なレシーバーが継承しただけのメソッド名（`open`、`select`、`format`）が、呼び出しが実行することのない`Kernel`シグネチャに対してアリティまたは引数エラーを報告することはなくなりました。

- **[plugins]** `rigor-activerecord`が、名前空間付きモデルの定数パスをテーブル名へと平坦化することはなくなりました（[#623](https://github.com/rigortype/rigor/issues/623)、[#677](https://github.com/rigortype/rigor/pull/677)、[#750](https://github.com/rigortype/rigor/pull/750)）。
  - `Blog::Post`は、`blog_posts`ではなくRailsと同様に`posts`へとdemodulizeされます。
  - 囲むモジュール、モデル、基底クラス、またはエンジン上でリテラルとして宣言された`table_name_prefix` / `table_name_suffix`が適用されます（[#671](https://github.com/rigortype/rigor/issues/671)、[#678](https://github.com/rigortype/rigor/issues/678)、[#679](https://github.com/rigortype/rigor/issues/679)）。

- **[plugins]** `class ::Foo`として宣言された、または2つ目のファイルで再オープンされたモデル、メイラー、ジョブ、ワーカー、チャンネル、アタッチメント所有者、またはコントローラーが、サーフェス全体を保持するようになりました（[#583](https://github.com/rigortype/rigor/issues/583)、[#624](https://github.com/rigortype/rigor/pull/624)、[#621](https://github.com/rigortype/rigor/issues/621)、[#646](https://github.com/rigortype/rigor/pull/646)）。
  - プラグインはすべての宣言をプレーンな名前の下でインデックス化し、再オープンを1つのエントリーにマージします。

- **[plugins]** `rigor-shoulda-matchers`が、`:model_index`ファクトを実際のフラットなHashとして読み取るようになりました（[#573](https://github.com/rigortype/rigor/issues/573)、[#582](https://github.com/rigortype/rigor/pull/582)）。
  - `have_db_column` / `validate_presence_of` / `belong_to` / `have_many`および残りのマッチャーチェックが、実際のプロジェクトで再び発火するようになります。

- **[plugins]** `Time`値上の通常のRailsコードが、偽の`undefined method`を引き起こすことはなくなりました（[#658](https://github.com/rigortype/rigor/issues/658)、[#675](https://github.com/rigortype/rigor/pull/675)）。
  - `Time.current.to_fs(:db)`、`.in_time_zone`、`.past?`、`.future?`、`.today?`およびActiveSupportの残りの`Time`インスタンスサーフェスが型付けされるようになりました。本物のタイポは引き続き報告されます。

- **[plugins]** `Date`または`DateTime`レシーバー上の通常のRailsコードが、`undefined method`を引き起こすことはなくなりました（[#670](https://github.com/rigortype/rigor/issues/670)、[#760](https://github.com/rigortype/rigor/pull/760)、[#762](https://github.com/rigortype/rigor/issues/762)、[#765](https://github.com/rigortype/rigor/pull/765)）。
  - `Date.current.past?`、`DateTime.now.past?`、`Date#in_time_zone`、および残りのActiveSupport計算、変換、タイムゾーンのサーフェスが宣言されるようになりました。
  - `Date`と`DateTime`で結果が異なる行は別個に宣言されているため、`DateTime.now.beginning_of_month`は`DateTime`として読み取られます。
  - ActiveSupportがインスタンス上でのみ定義しているクラス側の名前（`Date.end_of_week`、`Date.beginning_of_month`など）は受け入れられなくなり、`Date.beginning_of_week`は週の始まりの`Symbol`を返します。

- **[plugins]** rigor-activesupport-core-extは、実行時に例外を発生させるTime/Dateの左辺にDurationがある式を、`ActiveSupport::Duration`として型付けしなくなりました（[#588](https://github.com/rigortype/rigor/issues/588)、[#628](https://github.com/rigortype/rigor/pull/628)）。
  - `30.minutes + Time.now`が該当します。またrigor-railtiesは、プロジェクトが独自の`Rails`上でそのリーダーを定義している箇所において、`Rails.logger` / `.cache` / `.configuration` / `.application`を変更せずそのままにします。

- **[plugins]**同梱プラグインのRBSが、異なるジェネリックアリティでユーザー自身が提供したシグネチャと衝突することはなくなりました（[#610](https://github.com/rigortype/rigor/issues/610)、[#770](https://github.com/rigortype/rigor/pull/770)）。
  - プラグイン側の宣言が退くため、`rigor-activerecord`と`rbs collection install`が`ActiveRecord::Relation`上でお互いを打ち消し合うことはなくなりました。

- **[rbs]** `signature_paths:`を通じて`rigor-activesupport-core-ext`を配線した際に、それらのシグネチャの上にRigorの同梱ActiveSupportオーバーレイが重ねてロードされることはなくなりました（[#672](https://github.com/rigortype/rigor/issues/672)、[#699](https://github.com/rigortype/rigor/pull/699)）。
  - 重複した宣言によって`Time`、`Integer`、`String`、およびシグネチャがそれらを指名している任意のプロジェクトクラスが崩壊することはなくなりました。

- **[cache]**ウォーム状態の`rigor check`が、ロックファイルの変更後、およびプラグインが探して見つからなかったファイルが後から現れた際に再解析を行うようになりました（[#565](https://github.com/rigortype/rigor/pull/565)、[#577](https://github.com/rigortype/rigor/issues/577)、[#612](https://github.com/rigortype/rigor/pull/612)、[#613](https://github.com/rigortype/rigor/issues/613)、[#641](https://github.com/rigortype/rigor/pull/641)）。
  - `bundle add` / `bundle remove`、新しくコミットされた`db/schema.rb`、`config/sidekiq.yml`、または`app/models`ディスカバリーツリーの追加時に、それらの欠落を発見した実行の診断を再生することはなくなりました。

- **[engine]** Cメソッドが例外を決して発生させないと主張していた36個の組み込みカタログ行が、例外を発生させるものとして記録するようになりました（[#757](https://github.com/rigortype/rigor/pull/757)）。
  - `rigor effects`はそれらの`File` / `IO` / `Hash` / `Struct`呼び出しを純粋（pure）として扱わなくなりました。

## [0.3.6] - 2026-08-30

v0.3.6は、繰り返し実行するコマンドのためのパフォーマンスリリースです: ウォームな`rigor unused`が数倍高速になり、ウォームな`rigor effects`または`rigor effects check`は解析エンジンを一切ロードすることなく応答するようになりました（[ADR-104](../adr/104-effects-boot-slim-probe/)）。エフェクトスナップショットはフィクスチャではなくアプリケーション向けのサイズ感に調整され、コミットされるファイルサイズは3分の1縮小し、無関係な呼び出しが移動した際の不要な変動が止まり、ドリフトレポートはその背後にあるすべてを列挙する代わりに各メソッドがどこで定義されているかを名指しするようになりました。マシン可読な出力は`--cache-stats`下でも再び有効なドキュメントとなり、すべての診断のテキスト出力は設定に必要なルール識別子を運ぶようになりました。また、gemが出荷するドキュメントには、Rigorをクローンするのではなくインストールした読者向けにも解決可能なリンクが追加されました。

### 変更

- **[cli]**ウォームな`rigor unused`がバイト単位で同一のレポートを保ちながら数倍高速になり、Mastodonでの実行が8.3秒から1.1秒に短縮されました。
  - RBS環境およびプラグインのprepare作業向けに解析キャッシュを再利用し、テンプレート内のクラス名スキャンを各ファイルの識別子を含む部分に対してのみ行うようにしました（[#473](https://github.com/rigortype/rigor/pull/473)）。
  - ファイル単位の作業——すべてのRubyファイルの到達可能性スキャンとテンプレート抽出——がキャッシュディレクトリ下の1つの自己検証バンドルにキャッシュされるため、繰り返しの実行では変更されたファイルのみを再読み込みします（Mastodon 2.7秒 → 1.1秒、Redmine 1.5秒 → 0.8秒）（[#481](https://github.com/rigortype/rigor/pull/481)）。

- **[effects]**ウォームな`rigor effects`および`rigor effects check`が解析エンジンを一切ロードすることなく応答するようになり、計測対象コーパスで26〜38%高速化され、`--full --why`、`--format json`、`explain`を含めてバイト単位で同一の出力が得られます（[ADR-104](../adr/104-effects-boot-slim-probe/)、[#483](https://github.com/rigortype/rigor/pull/483)、[#482](https://github.com/rigortype/rigor/issues/482)）。
  - 解析実行が残したキャッシュから伝播済みエフェクトテーブルを直接読み取り、実行全体のエフェクトキャッシュはウォーム実行が読み取ることのないファイル単位のコレクションをロードしなくなりました。
  - そのテーブルは、ファイル単位のコレクションと同じ識別子のもとで実行全体のキャッシュエントリーに並んで保持されるようになり、キャッシュヒット時はエフェクトの不動点を再実行する代わりに全体を採用します——これはエンジン不要パスが導入される前に、Redmineのウォームな`rigor effects`を0.75秒から0.61秒に短縮したステップです（[#475](https://github.com/rigortype/rigor/pull/475)）。

- **[effects]** `rigor effects update`は、メソッドを非網羅的にした呼び出しを列挙する代わりにその*件数*を記録するようになり、中規模Railsアプリケーションでコミットされるスナップショットが326,964バイトから197,968バイトに縮小し、無関係な呼び出しが移動した際の不要な変動が止まりました（[#484](https://github.com/rigortype/rigor/pull/484)、[#434](https://github.com/rigortype/rigor/issues/434)）。
  - `rigor effects explain`はオンデマンドでそれらの呼び出しを名指しし、以前は展開できなかった`exhaustive → not`のドリフト行も展開できるようになりました（[#435](https://github.com/rigortype/rigor/issues/435)）。
  - コミット済みスナップショットは、次回の`rigor effects check`で1行の`regeneration: schema: 1 → 2`を報告します;新しい形式を採用するには`rigor effects update`を一度実行してください。

- **[effects]** `rigor effects check`の失敗出力は読まれることを想定して記述されるようになりました: ドリフトした各メソッドの背後にあるすべてのメソッドを出力する代わりに、そのメソッドがどこで定義されているかとルールの変更規模を名指しします（[#497](https://github.com/rigortype/rigor/pull/497)、[#484](https://github.com/rigortype/rigor/pull/484)、[#435](https://github.com/rigortype/rigor/issues/435)）。
  - すべてのドリフト行は定義位置（レポートでは`(app/models/change.rb:41)`、`--format json`では`sources`エントリー）を運ぶため、レビュアーはメソッドを検索することなく失敗内容を読めます（[#497](https://github.com/rigortype/rigor/pull/497)）。
  - 異なるルール下で計算された2つのレコードのチェックでは、再生成行と差分のサイズを出力します;以前は1つの移動した`config_digest:`が読めない482行の`-symbol`行を生成していました（[#484](https://github.com/rigortype/rigor/pull/484)）。

- **[cli]** `check`と`coverage`だけでなく、ディスパッチされるすべてのコマンドが遅延YJITデッドラインを設定するようになり、Mastodonでのコールドな`rigor effects`が、21秒間すべてインタープリタ実行される代わりに、`check`下の同一解析と並んで完了するようになりました（[#480](https://github.com/rigortype/rigor/pull/480)）。
  - デッドライン内に完了するコマンドは、依然としてJITコンパイルコストを支払いません。

- **[effects]**何も見つからなかったエンベロープ判定がプロジェクト全体のディスカバリーパースを支払わなくなり、`effects.envelopes:`下のクリーンな`rigor check`はそれを完全にスキップするようになりました（mailのウォーム時1.03秒 → 0.46秒）（[#479](https://github.com/rigortype/rigor/pull/479)）。

- **[engine]**合成メソッドの唯一の貢献者がトレイトレジストリを登録している実行において、証明可能な空のインデックスを構築するためにプロジェクト全体をパースすることがなくなりました（[#477](https://github.com/rigortype/rigor/pull/477)、[#476](https://github.com/rigortype/rigor/issues/476)）。
  - Railsアプリケーション上の`rigor-devise`がそのケースです;トレイト階層の環境スレッド処理が修正されるまで、いかなるI/Oの前にもスキャンをショートサーキットします（Mastodonのウォームな`rigor effects` 1.12秒 → 0.90秒）。

- **[cache]**ウォーム実行のキャッシュ検証が、キャッシュスロットごとではなく実行ごとに依存ファイルを1回statするようになりました（[#478](https://github.com/rigortype/rigor/pull/478)）。
  - 収集実行では、同じ数千ファイル記述子に対してエフェクトエントリーと診断エントリーを2回検証していました。

### 修正

- **[cli]** `rigor check --cache-stats`がマシン可読な出力を壊さなくなりました（[#494](https://github.com/rigortype/rigor/pull/494)、[#493](https://github.com/rigortype/rigor/issues/493)）。
  - キャッシュブロックがドキュメントの後にstdoutに追加されていたため、`--format json`、`sarif`、`gitlab`のパースに失敗し、XML形式では閉じタグの後に散文が追加されていました——コードスキャンへのSARIFアップロードは、実行自体は正常に見えても成果物を拒絶していました。
  - このブロックは、`text`以外のすべての形式でstderrに出力されるようになり、`--clear-cache`および`--verify-incremental`の注記も同様になりました。

- **[cli]**すべての診断のテキスト出力の末尾に角括弧付きのルール識別子（`[call.undefined-method]`）が付くようになり、`# rigor:disable`、`disable:`、`severity_profile:`に必要なIDが、既に見ているものと同じになりました（[#487](https://github.com/rigortype/rigor/pull/487)、[#431](https://github.com/rigortype/rigor/issues/431)）。
  - 以前はプラグインおよびRBS由来の診断のみがこれを運んでいましたが、これは完全に逆でした: 組み込みルールこそがマニュアルでIDによる設定を案内しているものであり、実行結果をルールでgrepできるようになりました。

- **[cli]** `rigor unused`は、データファイルもクラスを名指ししている場合に、そのクラスに本番の呼び出し元がないと報告しなくなりました（[#489](https://github.com/rigortype/rigor/pull/489)、[#370](https://github.com/rigortype/rigor/issues/370)）。
  - `config/recurring.yml`に記載されspecから参照されているジョブが、3分ごとに実行されているにもかかわらず「生きたテスト、死んだ本番パス」に分類されていました;データファイルでの言及も*判定不能*（cannot decide）へと降格されるようになりました。
  - この降格は、その下のすべてではなく一致した名前にのみ適用されます: ロケールファイル内の「Administrasie」という単語が無関係な18行の`Admin::*`行を降格させていました。

- **[rbs]** `date.to_time(:utc)`およびその他の11個の通常のActiveSupport呼び出しが、`rigor-activesupport-core-ext`プラグインを選択せずに`activesupport`をロックしているプロジェクトにおいて偽の診断を引き起こさなくなりました（[#485](https://github.com/rigortype/rigor/pull/485)、[#449](https://github.com/rigortype/rigor/issues/449)）。
  - `String#dasherize`、`Object#in?`、`Time#all_day`、`ERB::Util.html_escape_once`がその12個に含まれます。

- **[effects]** RBSの他の括弧表記（`%a(pure)`、`%a[rigor:v1:effect …]`、`%a|…|`、`%a<…>`）で記述されたエフェクトアノテーションが、波括弧形式とまったく同様に読み取られるようになりました（[#474](https://github.com/rigortype/rigor/pull/474)）。
  - 4つすべてがウォーム実行キャッシュプローブおよびアノテーション未チェック通知から見えなくなっていたため、そのように記述されたエンベロープはコールド実行で判定され、キャッシュヒットごとに黙ってスキップされていました。
  - エフェクトアノテーションを一切持たないシグネチャファイルは、エンベロープリーダーによってパースされなくなりました。

- **[docs]** `rigor docs`がドキュメント自身のリンクを実行可能なキーとしてレンダリングするようになりました（[#496](https://github.com/rigortype/rigor/pull/496)、[#430](https://github.com/rigortype/rigor/issues/430)）。
  - `[Caching](../12-caching/)`とあるページは`[Caching][manual/12-caching]`と出力され、`rigor docs manual/12-caching`で開くことができます。
  - 設計記録へのリンク——ADR、型仕様、内部仕様、`examples/`、プラグインのREADMEなど、gemがパッケージ化していないもの——は、失敗する代わりにリポジトリ内のそのドキュメントのパスを名指しするメッセージへと解決されます。それらの284個のリンクは、Rigorをクローンするのではなくインストールしたすべての人にとって切れていました。

- **[docs]**プラグインのマニュアルページが、プラグインが実際に出力する内容を表示するようになりました（[#490](https://github.com/rigortype/rigor/pull/490)、[#495](https://github.com/rigortype/rigor/pull/495)、[#488](https://github.com/rigortype/rigor/issues/488)）。
  - すべてのサンプルブロックがドリフトしていました: `[plugin.<id>.<rule>]`識別子がすべて欠落し、行番号はデモコードが以前あった場所を指しており、あるページでは完全に間違ったファイルを参照していました（[#490](https://github.com/rigortype/rigor/pull/490)）。
  - `rigor-actionmailer`および`rigor-activejob`ページにあるさらに4行は、ブロックを桁揃えしている箇所で単一スペースを要求していたドリフトガードから見えなくなっており、捕まえるために存在するまさにそのドリフトに対してグリーンを報告していました（[#495](https://github.com/rigortype/rigor/pull/495)）。

- **[docs]**実装からドリフトしていたマニュアルの記述が修正されました（[#495](https://github.com/rigortype/rigor/pull/495)）。
  - CLIリファレンスおよびエフェクトラベルの章にあるコミット済みスナップショットのサンプルは、スキーマ1のファイルを示していました（`unresolved:`がカウントになった際に`rigor effects update`が書き込みを停止したもの）。また、エフェクトラベルのサンプルはその下の段落と矛盾していました。
  - `RIGOR_DISABLE_YJIT`のエントリーは、遅延YJITを`check`または`coverage`実行中にのみ発生するものとして説明しなくなり、`rigor check --cache-stats`は書き込み先のストリームをドキュメント化し、`RIGOR_LSP_POOL_MIN_BATCH`は他の運用環境変数と並んでドキュメント化されました。

## [0.3.5] - 2026-08-25

v0.3.5は、エフェクトシステムを単に存在するだけでなく、利用可能なものにすることを目的としています。`rigor effects`レポートは中規模Railsアプリケーションで31,191行から失われるものなく2,733行になり、問いを投げられるように`--label`、`--pure`、`--limit`が追加され、ラベル語彙自体を出力できるようになりました。より大規模な修正群はレポートが何を*見る*かに関するものです: オプショナルなレシーバー、ワーカーがincludeするモジュール、gemからの基底クラス、`super`、クラスレベルのアノテーションはそれぞれ何も寄与しておらず、そのうちいくつかはメソッドが依然として網羅的と読まれている間に発生していました。マニュアルには[エフェクトラベルに関する章](../manual/19-effect-labels/)が追加され、[ADR-103](../adr/103-effect-labels/) § WD17には宣言された境界が実際にどのラベルで失敗しうるか、残りをどこで強制するかが記録されました。

### 追加

- **[cli]** `rigor effects --list-labels`は、プロジェクトが名指しできるエフェクト語彙と各ルートの意味を出力します（[#471](https://github.com/rigortype/rigor/pull/471)、[#429](https://github.com/rigortype/rigor/issues/429)）。
  - 4つの設定キーと2つのアノテーション形式でエフェクトラベルの入力が必要ですが、インストールされたRigorではラベルが何であるかを告げるものがありませんでした。リストにはプラグインや独自の`effects.labels:`が開いたものが含まれ、何も解析しないため即座に応答します。

- **[cli]** `rigor effects`レポートに問いを投げられるようになりました: `--label=LABEL`はそのラベルまたはその配下を運ぶメソッドを選択し、`--pure`は何も行わないことが証明されたメソッドを選択し、`--limit=N`は出力を制限します（[#470](https://github.com/rigortype/rigor/pull/470)、[#457](https://github.com/rigortype/rigor/issues/457)）。
  - Redmineでは、`rigor effects --label io.net`は5行、`rigor effects --pure`は436行です。以前は両方の問いに`--full`、`grep`、そして行文法に関する推測が必要でした。

- **[effects]** Steinsの`failure.*`ラベルを名指しするエフェクトポリシーまたはエンベロープが、`effect.unknown-label`になる代わりにパースされるようになり、兄弟のPHPアナライザー向けに書かれたポリシーがここでも変更なしで読めるようになりました（[#426](https://github.com/rigortype/rigor/pull/426)、[#378](https://github.com/rigortype/rigor/issues/378)）。
  - Rigorは独自の`failure.*`ラベルを一切生成しないため、それを名指しする境界は空虚に満たされます。これは`io.output.buffer`が既に持っているのと同じ扱いです。

- **[docs]**マニュアルにエフェクトラベルに関する章（[エフェクトラベル](../manual/19-effect-labels/)）が追加され、初めてこの機能が最初から最後まで解説されました。
  - 1つの表での語彙、中規模Railsアプリケーションでレポートが実際にどう見えるか、レポートとスナップショットの間の直接対推移的な分割、`update` / `check` / `explain`レビューサイクル、CIステップとその終了コード、観測を境界に変えるエンベロープとアノテーションを網羅しています。

- **[docs]** [エフェクトラベル](../manual/19-effect-labels/)で、宣言された境界が実際にどのラベルで失敗しうるか、失敗できないものをどこで強制するかが記載されました（[ADR-103](../adr/103-effect-labels/) § WD17）。
  - 境界はメソッドの*証明済み*ラベル（Rigorがコードを読んで確立したもの）に対してチェックされます。Railsアプリケーションでは、`io.db.*`、`cache.*`、`telemetry`、`email.send`、`job.enqueue`およびすべての`rails.*`はRigorが読まなかったフレームワークについてのプラグインの主張であるため、それらを名指しするエンベロープは空虚に満たされ、コミットされたスナップショットがそれらを強制します。

- **[docs]** CIテンプレートにコメントアウトされた`rigor effects check`ステップが含まれるようになり、エフェクトゲートの導入はワークフローを構成するのではなく1行コメント解除するだけになりました（[#443](https://github.com/rigortype/rigor/pull/443)）。

### 修正

- **[cli]** `rigor effects`レポートがフィクスチャではなくアプリケーション向けのサイズになりました: Redmineで31,191行出力されていたものが、何も失われることなく2,733行になりました（[#470](https://github.com/rigortype/rigor/pull/470)、[#434](https://github.com/rigortype/rigor/issues/434)）。
  - どちらのレーンにもラベルがない行は何も語らないため省略されるようになり、これはRedmineの4,683ユニットのうち1,953ユニットに相当します。未解決の理由ブロックは`--why`で展開されるカウントへと折りたたまれ、レポートは証明済みレーンと宣言済みレーンを分けて数えるフッターで締めくくられます（ビルドを失敗させうるのは前者のみであるため）。
  - `--why`は各宣言ラベルの背後にあるプラグインの行も名指しするようになりました（以前は何もしませんでした）: バンドルされたプラグインの行は信頼されているため、読み取るための汚染行を残しません。`--full`は依然として以前のデフォルトとまったく同じ内容を出力し、`--format json`はフッターと同じ合計を運びます。

- **[cli]** `rigor effects`へのパス引数が解析を狭めるのではなく**出力される**メソッドを選択するようになり、それらのメソッドに対してプロジェクト全体の実行が報告する内容とまったく同じ内容を報告するようになりました（[#468](https://github.com/rigortype/rigor/pull/468)、[#439](https://github.com/rigortype/rigor/issues/439)）。
  - `rigor effects app/controllers/issues_controller.rb`は以前、プロジェクト全体の実行がいくつかのラベルを答えていた箇所で`IssuesController#create: [] …?`と応答しており、本当に何もしないメソッドとそれを区別するものがありませんでした。stderrの注記で何ユニット中何ユニットを見ているかが示されるようになり、メソッドを名指ししないパスは空のレポートを出力する代わりにその旨を表示します。

- **[effects]**オプショナルなレシーバーに対する呼び出しがその背後にあるクラスに対する呼び出しとして読まれるようになり、`@record`を代入したメソッド以外のメソッドでの`@record.save`や、`find_by`後の`thing&.destroy!`が、共に行う内容を報告するようになりました（[#459](https://github.com/rigortype/rigor/pull/459)、[#455](https://github.com/rigortype/rigor/issues/455)）。
  - どちらも通常のイディオムであり、行が網羅的であると主張し続けながら、以前は両方とも何も寄与していませんでした。Redmineではデータベースに書き込むと記録されたエントリーポイントが27から35に、Mastodonでは114から169に増加しました; Redmineの27個の`#update`アクションのうち3個が、以前は皆無だった実行する書き込みを記録するようになりました。

- **[plugins]** `rigor effects`がRailsアプリケーションが実行するジョブのエンキューとメール送信を報告するようになりました（[#464](https://github.com/rigortype/rigor/pull/464)、[#456](https://github.com/rigortype/rigor/issues/456)）。
  - `job.enqueue`と`email.send`は語彙として出荷されていたものの、それを生成できるものがありませんでした: 2つの実アプリケーションにわたって両方のカウントはゼロでした。Sidekiqワーカーには基底クラスがないためプラグイン行は到達できませんでした;祖先走査がRuby自身のメソッドルックアップと同様にインクルードされたモジュールをたどるようになり、`rigor-sidekiq`にエンキュー行が追加され、メール配信はレシーバーチェーン全体を通じて帰属されるようになりました。
  - Redmineでは以前はゼロだったのに対し、175メソッドが`email.send`を、173メソッドが`job.enqueue`を宣言するようになりました; Mastodonでは737メソッドが`job.enqueue`を、39メソッドが`email.send`を宣言しています。両者とも`rigor check`の診断は変更ありません。

- **[plugins]** gemからサブクラス化したクラスが、Rigorが把握しているそのエフェクトを遮断しなくなりました。これにより、`class UserMailer < Devise::Mailer`および`class Auth::SessionsController < Devise::SessionsController`がActionMailerおよびActionPackのエフェクトを取得するようになりました（[#467](https://github.com/rigortype/rigor/pull/467)、[#465](https://github.com/rigortype/rigor/issues/465)）。
  - Rigorは独自の`class … <`行および`include`行をたどってフレームワークのエフェクトに到達するため、ソースを離れたチェーンは二度と戻りませんでした。バンドルされたプラグインが自身のgemが導入する祖先を宣言できるようになり、`rigor-devise`は6つを宣言します; Mastodonでは39メソッドだった`email.send`の宣言が68メソッドになりました。

- **[effects]**ソースが定数で名指しするクラスに対する呼び出しは、そのシグネチャがインストールされていない場合でもそのクラスのエフェクトを取得するようになり、`Net::IMAP.new(…)`、`Net::POP3.APOP(…)`、`Net::FTP.open(…)`が何もない代わりに`io.net`を報告するようになりました（[#466](https://github.com/rigortype/rigor/pull/466)、[#463](https://github.com/rigortype/rigor/issues/463)）。
  - Rigorはレシーバーを型付けできないときは常にカタログ化されたクラスのデフォルトエフェクトを差し控えていましたが、これはクラスを推測しなければならなかった場合には正しく、クラス名を記述した場合には誤りでした。したがって呼び出しが報告されるかどうかは`rbs`がたまたまライブラリのシグネチャを出荷しているかどうかに依存しており、RedmineのIMAPおよびPOP3メールポーラーはネットワークアクセスをまったく報告していませんでした。

- **[effects]** `Socket.gethostname`およびこのマシン自身のアイデンティティを読み取る他の呼び出しが、`io.net`ではなく`io`を報告するようになり、配下の何かがホスト名を検索したためにメソッドがネットワークトラフィックとして読まれることがなくなりました（[#462](https://github.com/rigortype/rigor/pull/462)、[#458](https://github.com/rigortype/rigor/issues/458)）。
  - Redmineでは、`Mailer`がホスト名から各Message-IDを構築するため、ラベルがソースから遠くまで伝播していました: 4,234行中219行が`io.net`を主張し、すべてのモデルの`save`も含まれていました。現在それを運ぶのは3行であり、すべて真正なDNS解決です。`Socket.gethostbyname`および他のすべてのソケット呼び出しは変更ありません。

- **[effects]**クラスまたはモジュール上にrbs-inlineコメントとして記述されたエフェクトエンベロープがチェックされるようになり、`.rbs`ファイル内の同一境界が機能する一方で黙って無視されることがなくなりました（[#461](https://github.com/rigortype/rigor/pull/461)、[#452](https://github.com/rigortype/rigor/issues/452)）。
  - これは本機能の中で最も低コストな境界です: `class Memo`の上の1行で、メソッドごとのアノテーションはなく、クラスのすべてのメソッドに分散されます。これまでは、これを書いてクリーンな実行結果を得ても何もチェックされていなかったことを意味していました;メソッド自身のアノテーションは依然としてクラス境界に優先します。

- **[effects]** `super`呼び出しが親の実装のエフェクトをメソッドのサマリーに寄与するようになり、Rigorが解決できない親への`super`はメソッドをエフェクトなしと報告する代わりにサマリーを非網羅的とマークするようになりました（[#453](https://github.com/rigortype/rigor/pull/453)、[#446](https://github.com/rigortype/rigor/issues/446)）。
  - 上方へ委譲するオーバーライドは他のメソッドと同様に宣言されたエンベロープに対して判定され、以前は親が正しくフラグ付けされている間に`def emit = super`が`%a{pure}`をパスしていました。

- **[effects]** `effect.envelope-exceeded`が、`.rigor/cache`をクリアした後の初回実行時だけでなく、すべての実行で報告されるようになりました（[#442](https://github.com/rigortype/rigor/pull/442)、[#428](https://github.com/rigortype/rigor/issues/428)）。
  - ウォーム実行は以前、エンベロープを再チェックすることなくキャッシュから診断を提供していたため、CIがビルド間で`.rigor/cache`をキャッシュしているプロジェクトではチェックが一度発火した後に沈黙し、その沈黙がクリーンな結果として読まれていました。エンベロープ、`tolerated:`リスト、またはアノテーションを編集すると、Rubyファイルが変更されていなくてもコードが再判定されるようになり、中規模Railsアプリケーションでのウォーム実行で約0.75秒のコストがかかります。

- **[effects]** `effect.annotations-unchecked`が、結果キャッシュを書き込む実行だけでなく、何かを解析するすべての実行で、Rubyソース内のrbs-inlineコメントとして記述された`%a{pure}`を報告するようになりました（[#447](https://github.com/rigortype/rigor/pull/447)、[#441](https://github.com/rigortype/rigor/issues/441)）。
  - `rigor check --no-cache`、`--workers N`、`--incremental`は以前、`sig/*.rbs`ファイル内のアノテーションに対して通知を報告し、インラインで記述された同一のアノテーションについては沈黙していたため、どの実行レーンを選択したかによってアノテーションが無効であると知らされるかどうかが決まっていました。

- **[effects]** rbs-inlineコメントとして記述されたエフェクトエンベロープが、ファイルのライセンスヘッダー内に着地しうる合成シグネチャからの行番号ではなく、コメント自体の行を報告するようになりました（[#450](https://github.com/rigortype/rigor/pull/450)、[#432](https://github.com/rigortype/rigor/issues/432)）。

- **[plugins]** `rigor effects`がActiveRecordモデル自身の`save`行でデータベース書き込みを報告するようになり、コールバックや一意性バリデーターを持つモデルが以前は`AuthSource#save: ≤ io.db.read`と読まれていた箇所が修正されました（[#445](https://github.com/rigortype/rigor/pull/445)、[#440](https://github.com/rigortype/rigor/issues/440)）。
  - 書き込みは常に呼び出しサイトで報告されていました;欠落していたのはメソッドを名指しする行であり、これはRailsレビュアーが最初に確認する行です。`save!`、`update`、`touch`、`increment!`、`destroy`、および`create`のペアもすべて同様に影響を受けており、現在はすべて書き込みを報告します。

- **[cli]**スペルミスのあるキーを指定した`rigor effects explain --symbol`が、`Nothing to explain.`を出力して0で終了する代わりに、最も近いキーを名指しするエラーになりました（[#471](https://github.com/rigortype/rigor/pull/471)、[#435](https://github.com/rigortype/rigor/issues/435)）。
  - 0で終了することはエフェクトのないメソッドが行うこととまったく同じであるため、タイポと真の回答が区別できず、スクリプトはそれらをまったく区別できませんでした。

- **[cli]** `rigor effects check`の失敗フッターで、`rigor effects update`と並んで`rigor effects explain`を提案するようになりました（[#471](https://github.com/rigortype/rigor/pull/471)、[#435](https://github.com/rigortype/rigor/issues/435)）。
  - この2つはドリフトレポートが提起する問いに答えるものであり、以前はフッターはレポートを消去するものだけを名指ししていました。

- **[cli]**初回の`rigor effects update`において、実行の出力だけでなく書き込まれたファイル自体の中でも空の`reach:`について何をすべきかを説明するようになりました（[#471](https://github.com/rigortype/rigor/pull/471)、[#436](https://github.com/rigortype/rigor/issues/436)）。
  - `reach:`はエントリーポイントが引き起こす内容を記録するもので、スナップショットの中で最もレビューする価値のある半分ですが、一度も設定しなかったプロジェクトは知る由もなくもう半分をコミットしていました。デフォルトは意図的に空のままであるため、実行時にプラグインが実際に登録したプリセットを名指しし、ファイルにも同じヒントが記載されます。

- **[cli]** `.rigor.yml`内の誤りに対して、Rubyのバックトレースではなく、キーを名指しする単一の`rigor:`行を出力するようになりました（[#451](https://github.com/rigortype/rigor/pull/451)、[#433](https://github.com/rigortype/rigor/issues/433)）。
  - どのプラグインも登録していない`effects.snapshot.reach:`プリセット、不正な形式の`effects.attribution:`キー、パースできないファイルがすべてカバーされ、未登録プリセットエラーはプロジェクトのプラグインが実際に登録したプリセットをリストします。

- **[cli]** `rigor check --format json`のすべての診断が運び、`rigor explain`が出力する`documentation_url`が、404に着地する代わりに解決されるようになりました（[#444](https://github.com/rigortype/rigor/pull/444)、[#438](https://github.com/rigortype/rigor/issues/438)）。
  - このプロジェクトが一度も持ったことのないGitHubブランチを指していました。同じ誤ったブランチと共に出荷されていたさらに3つのリンクも修正されました: `rigor init`が書き込む`.rigor.yml`内のプラグインリンク、VS Code拡張機能のホームページおよびインストールリンクです。

- **[plugins]** `rigor-activesupport-core-ext`が`Date#to_time`でrbs同梱の`stdlib/date`と衝突しなくなり、プラグインをアクティベートするすべてのプロジェクトで`Date`と`DateTime`がuntypedな値に縮退する代わりにそれら自身として型付けされるようになりました（[#448](https://github.com/rigortype/rigor/pull/448)、[#437](https://github.com/rigortype/rigor/issues/437)）。
  - `date.to_time(:utc)`はActiveSupportの拡張されたアリティを通じて引き続き解決されます。

- **[plugins]**実験的な`ruby_box`プラグイン分離戦略がgemインストールされたターゲットライブラリに到達するようになり、ライブラリが真に存在しない場合には`LoadError`で実行全体を中断する代わりにクリーンに辞退するようになりました（[#469](https://github.com/rigortype/rigor/pull/469)、[ADR-39](../adr/39-plugin-target-library-invocation/)）。
  - `Ruby::Box#require`は素のロードパスファイルのみを解決するため、この戦略はボックス内部のrequireへとフォールバックし、gemをアクティベートします。存在しないライブラリは、他の戦略が既に行っていたように、影響を受けるチェックを沈黙させるようになりました。

## [0.3.4] - 2026-08-21

v0.3.4は、コードが何を返すかだけでなく、コードが何を*するか*に関するリリースです。ヘッドラインはエフェクトシステムです（[ADR-103](../adr/103-effect-labels/)）: `rigor effects`はすべてのメソッドのエフェクトを報告し、`rigor effects update`は`db/schema.rb`がスキーマを記録するようにそのレポートをレビュー可能な記録としてコミットし、`%a{pure}`または`%a{rigor:v1:effect io.db}`アノテーションはRigorがチェックする契約になります。このファミリー全体は`effects:`ブロックの背後にあるオプトインであり、それを持たないプロジェクトは変更のないコストでバイト単位で同一の`rigor check`を得られます。これと並行して、`rigor unused`（[ADR-102](../adr/102-unused-code-reachability-report/)）は到達可能なものが何も参照していないクラスやモジュールを報告し、フレームワークが名前で到達するルートはプラグインが供給します。その他の修正は祖先チェーンを通じた定数解決といくつかの`rigor unused`のエッジケースをカバーしています。

### 追加

- **[effects]** `rigor effects`は、各メソッドが何を返すかの横に、何をするか——`io.output.stdout`、`nondet.time`、`mutate.self`——を報告します。これは`.rigor.yml`の`effects:`ブロックを通じたオプトインであり、診断として報告されることは決してありません（[#396](https://github.com/rigortype/rigor/pull/396)、[#379](https://github.com/rigortype/rigor/issues/379)、[ADR-103](../adr/103-effect-labels/)）。
  - ラベルは呼び出されたメソッドのすべてのオーバーライドを含め、プロジェクト自身の呼び出しグラフ全体にわたって推移的であり、呼び出しをすべて解決できなかったメソッドは推測されるのではなく理由と共に「おそらくそれ以上」とマークされます——未解決の呼び出しが発見に変わることは決してありません。自身が確保したオブジェクトのみを変更するメソッドは純粋として扱われ省略されます; `--full`はそれらを列挙し、`--format=json`は発生元ごとに細分化された各メソッド自身の寄与を運びます。
  - `effects:`ブロックがない場合、何も変更されません: `rigor check`は変更のないコストでバイト単位で同一の出力を生成します。[`rigor effects`](../manual/02-cli-reference/#rigor-effects)および[エフェクトラベル仕様](../type-specification/effect-labels/)を参照してください。
- **[effects]** `rigor effects`がRubyのコアおよび標準ライブラリの手動監査済みカタログを読み取るようになり、`open(path)`がファイルの読み取りを報告する箇所で`open("|cmd")`がサブプロセスの実行を報告し、`Time.new`が時計を読み取る箇所で`Time.new(2020, 1, 1)`がエフェクトフリーとなり、モードなしの同じ呼び出しが読み取りである箇所で`File.open(path, "w")`が書き込みとなるようになりました（[#399](https://github.com/rigortype/rigor/pull/399)、[#380](https://github.com/rigortype/rigor/issues/380)、[ADR-103](../adr/103-effect-labels/)）。
  - 約80個のコアおよび標準ライブラリクラスがカバーされています——`Kernel`、`IO` / `File` / `Dir` / `FileUtils` / `Pathname`、`Process`、ソケットおよび`Net::HTTP`ファミリー、`ENV`、`Time` / `Date`、`Random` / `SecureRandom`、`GC` / `ObjectSpace`、`Logger`、オブジェクトモデルのライター——そしてリストされたクラスが名指ししないメソッドはそのクラスの姿勢へとフォールバックするため、未知の`IO`メソッドでも何もないのではなく依然として`io`を報告します。カタログがリストしていないクラスは変更ありません: それらは何も寄与せず、推測されることも決してありません。報告されるすべてのラベルは上限境界であり、引数によって判断がつかない場合は都合の良いラベルではなく、より広いラベルが報告されます。
- **[effects]** `rigor effects update`はコードが行うことのコミット済み記録——`db/schema.rb`のエフェクト版である`.rigor-effects.yml`——を書き込み、プルリクエストがそれを変更した際に`rigor effects check`がCIを失敗させるため、意図しないエフェクトは最初に書かなければならなかったアノテーションではなくレビューによって捕捉されます（[#398](https://github.com/rigortype/rigor/pull/398)、[#415](https://github.com/rigortype/rigor/pull/415)、[#381](https://github.com/rigortype/rigor/issues/381)、[#411](https://github.com/rigortype/rigor/issues/411)、[ADR-103](../adr/103-effect-labels/)）。
  - ファイルには帰属可能なものがリストされます: アナライザーがエフェクトを網羅的に読み取れず、何も証明できなかったメソッドは、それだけを述べる行として記録されるのではなく除外されます——`--full`はテーブル全体を記録します。リストされた各メソッド自身のエフェクトに加え、`effects.snapshot.reach:`が名指しするエントリーポイントにおける完全な到達範囲を保持し、そのdiffこそがレビューのシグナルとなります: それを引き起こしたコードの隣に`PaymentGateway#charge + io.net.http`が表示されます。意図はファイルを再生成してコミットすることで表現されます。`rigor effects explain`は変更の背後にあるルート——`OrdersController#create → OrderService#place → PaymentGateway#charge → Net::HTTP.get`——を出力し、`rigor effects diff`はゲートすることなく同じ比較を出力します。
  - ジョブがエンキューを停止したことも同様にニュースであるため、削除も追加と同様にゲートを失敗させます; `effects.snapshot.gate: additions`は代わりに増加のみのラチェットを選択し、`effects.tolerated:`は出入りをレビューしたくないラベルをリストします。記録自体は決して何も隠しません——ポリシーは差分が判定される際に適用されるため、ポリシーの編集は記録ではなく設定をdiffします。1つのツリーに対する2回の実行はバイト単位で同一のファイルを書き込みます。[エフェクトスナップショット](../manual/02-cli-reference/#the-effect-snapshot)を参照してください。
- **[effects]**エフェクトサマリーがキャッシュされるようになり、同じジョブ内で`rigor check`の後に実行される`rigor effects`は伝播のみのコストとなり、インクリメンタル実行は編集したファイルのみを再読み込みするようになりました（[#401](https://github.com/rigortype/rigor/pull/401)、[#382](https://github.com/rigortype/rigor/issues/382)、[ADR-103](../adr/103-effect-labels/)）。
  - サマリーは、チェックが既にキャッシュしている診断とは別に、独自のアイデンティティ——Rigorのエフェクト語彙、組み込みカタログ、`effects:`ブロック——のもとでキャッシュされます。カタログが変更されたバージョンにRigorをアップグレードすると、チェックを再実行することなくエフェクトを再読み込みし、`effects:`のオン／オフの切り替えはいずれも無効化しません。
  - `effects:`ブロックを持たないプロジェクトは変更ありません: 余分なものは何も書き込まれず、キャッシュキーは変更されず、`rigor check`は以前とまったく同様にウォームキャッシュから応答します。
- **[cli]** `rigor unused`は、到達可能なものが何も参照していないプロジェクトのクラスとモジュールを報告します——デッドコード削除の出発点となります（[#357](https://github.com/rigortype/rigor/pull/357)、[#347](https://github.com/rigortype/rigor/issues/347)、[ADR-102](../adr/102-unused-code-reachability-report/)）。
  - 実行時に何かが名指しできる定数は、未使用と主張されるのではなく、理由と共に`cannot decide`（判定不能）セクションへと降格されます: `"Foo".constantize`は`Foo`を正確に名指しし通常の参照としてカウントされますが、`"Foo::#{key}".constantize`は`Foo`配下のすべてを判定不能とマークし、`.yml`やテンプレートファイル内で文字列として現れるクラス名も同様に降格されます。
  - 不具合リストではなくレビューキューとして読んでください: 手動で裁定されたコーパス対象において真に未使用だったのは行の7%に過ぎず、これが独立したコマンドであり決して`rigor check`の診断ではない理由です。到達可能性はルート——`--entry-point=GLOB`に加え、ファイルレベルで参照されているすべてのもの——から計算されるため、相互にのみ参照し合うクラスのクラスタも依然として報告されます。テストコードからのみ到達可能なクラスには独自のセクションが用意されています（自身のspecからのみ使用されるクラスは生きたテストを持つ死んだ本番コードであるため）。参照は解析対象パスだけでなく、`.rake`タスク、`config/`、spec、`sig/`からも収穫されます。
- **[effects]**メソッドが何をすることを*許可*されているかを宣言し、Rigorにチェックさせることができるようになりました: RBS内の`%a{rigor:v1:effect io.db}`はメソッドをデータベースに境界づけ、`%a{pure}`は何もしないことに境界づけ、境界を超えたメソッドは`effect.envelope-exceeded`として報告されます（[#402](https://github.com/rigortype/rigor/pull/402)、[#383](https://github.com/rigortype/rigor/issues/383)、[ADR-103](../adr/103-effect-labels/)）。
  - 境界はメソッドのコードが到達するすべてのものをカバーするため、`io.db`と宣言されたリポジトリが`Net::HTTP`を呼び出すヘルパーを呼び出すと発見事項となります——そしてメッセージには辿ったルート、証明されたラベル、独自の境界の記述、記述したシグネチャ行が名指しされます。診断は修正が行われ`# rigor:disable`が機能するRubyの`def`上に位置します。
  - `%a{pure}`はRigor独自の同義語ではなく、Steepが既に読み取っているrbs自身の純粋性アノテーションです;メソッド自身が確保し決して外に出さなかったオブジェクトを変更することはすべてのエンベロープで許容されるため、ローカル配列へのメモ化は依然として純粋です。どちらのアノテーションも`class`または`module`上に記述でき、そのクラスのすべてのメソッド（再オープンや`attr_writer`で生成されたメソッドを含み、サブクラスには及ばない）に適用され、メソッドごとのアノテーションが優先されます。同じアノテーションはrbs-inlineの`# @rbs %a{…}`コメントを通じて`.rb`ファイル内でも機能します。
  - Rigorが証明しなかったものは何も発火しません: 解決できなかった呼び出しはサマリーを「おそらくそれ以上」と読ませ、*おそらく*が発見事項になることは決してありません。`effects:`ブロックがなければ何も発火しないため、Steep向けに書いた`%a{pure}`はオプトインするまで不活性のままです; `effects.check: false`は診断を沈黙させながらレポートとスナップショットを維持します。語彙が認識しないラベルは、パースされた部分ではなくアノテーション全体を境界なしと読ませるため、タイポが正しいコード上の発見事項に変わることはありません。[エフェクトエンベロープ](../type-specification/effect-labels/#effect-envelopes)を参照してください。
- **[effects]**スペルミスのエフェクトラベルが沈黙のうちに失敗しなくなりました: `%a{rigor:v1:effect io.bd}`は依然として何も境界づけませんが（タイポが正しいコード上の発見事項に変わることは決してない）、Rigorは最も近い実際のラベルを名指しし、記述した行で`effect.unknown-label`としてその旨を通知するようになりました（[#403](https://github.com/rigortype/rigor/pull/403)、[#384](https://github.com/rigortype/rigor/issues/384)、[ADR-103](../adr/103-effect-labels/)）。
  - 表記が明らかにラベルを意図している箇所でのみ発火します: 既知のラベルに近い、同じリスト内の既知のラベルの隣にある、ドットを含む、または語彙のバンプによって廃止された（その場合は代替を名指しする）。語彙が何ら似ていない単語は、独自のルートを開いている可能性があるため沈黙を保ちます。同じチェックは`effects.tolerated:`内のラベルも読み取り、`.rigor.yml`で報告されます。作成時は`:info`、`strict`下では`:warning`であり、`effect.envelope-exceeded`と同様に`effects.check`によってゲートされます——エンベロープ強制のオプトインこそが、それを正直に保つ診断をオンにするものです。
- **[effects]** `effects:`ブロックを持たないプロジェクト内のエフェクトアノテーションが、黙って不活性になる代わりに、実行ごとに1回の`effect.annotations-unchecked` `:info`を獲得するようになりました（[#403](https://github.com/rigortype/rigor/pull/403)、[#384](https://github.com/rigortype/rigor/issues/384)、[ADR-103](../adr/103-effect-labels/)）。
  - アノテーション単独でエフェクト収集をオンにしてはなりません（1つのシグネチャファイル内の1行によってプロジェクトのすべての実行が高コストになってしまうため）;これは誰もチェックしていない`%a{pure}`が何もしないことを伝える方法です。`effects: {}`と`effects: {check: false}`は共に回答でありこれを沈黙させ、エフェクトアノテーションを一切持たないプロジェクトは変更ありません。
- **[docs]** `%a{rigor:v1:…}`アノテーションは、rbs-inlineの`# @rbs %a{…}`コメントを通じて`.rb`ファイル内に記述可能としてドキュメント化されました——これは[ADR-93](../adr/93-default-rbs-inline-ingestion/)以来機能しており、以前は不可能とドキュメント化されていました（[#403](https://github.com/rigortype/rigor/pull/403)、[#384](https://github.com/rigortype/rigor/issues/384)）。
  - `%a{}`はRigorの方言ではなくrbs-inline独自の上流文法であり、どのバッファに着信したかにかかわらず、すべてのディレクティブは同じアノテーションオブジェクトから読み取られます。Rigor専用のコメントディレクティブは依然として存在しません: `# rigor:`コメントは抑制専用のままです。[RBS::Extendedアノテーション](../manual/16-rbs-extended-annotations/)を参照してください。
- **[effects]**エフェクトエンベロープをメソッドごとではなく、`.rigor.yml`内の**規約**によって記述できるようになりました: 1つの`effects.envelopes:`スタンザが、パスglobまたは定数名前空間によってアーキテクチャ層全体を境界づけるため、RBSを一切持たないプロジェクトでも初日からチェックされた契約を得られます（[#404](https://github.com/rigortype/rigor/pull/404)、[#385](https://github.com/rigortype/rigor/issues/385)、[ADR-103](../adr/103-effect-labels/)）。
  - `match: "app/presenters/**/*.rb"`と`effect: []`はプレゼンターがクエリを発行しないことを示します; `namespace: "Policies::*"`は`Policies`の1セグメント下のクラスのみを境界づけ、`Policies::**`は任意の深さに到達します。スタンザはクラスレベルのアノテーションとまったく同様に、選択したすべてのクラスのすべてのメソッドに分散され、`effect.envelope-exceeded`はRubyの`def`上に位置したまま、違反したスタンザ——`.rigor.yml effects.envelopes[0]`——を名指しします。最も近いものが優先されます: メソッドごとのアノテーションはクラスレベルのものに勝ち、クラスレベルのものはスタンザに勝ちます;スタンザ間では最初に一致したものが優先されるため、リストは上から下へと読まれます。
- **[effects]** `effects.attribution:`は、Rigorが読み取れないコードについてgemメソッドが行うこと——`{"Net::HTTP.get": [io.net.http]}`——を伝えます（[#404](https://github.com/rigortype/rigor/pull/404)、[#385](https://github.com/rigortype/rigor/issues/385)、[ADR-103](../adr/103-effect-labels/)）。
  - ラベルは宣言された上限境界（レポートでは`≤ io.net.http`、スナップショットでは`declared:`）として報告され、証明されたものとしては決して報告されないため、帰属によって診断が発火することは決してありません;コードが行うことをRigorに伝えただけでありRigorが読んだわけではないため、呼び出しは依然として未解決としてカウントされます。主張は証明済みラベルとまったく同様に呼び出しエッジをたどるため、呼び出しの2ホップ上のコントローラーも`≤ io.net.http`と読まれます——そして証明済みラベルが既にカバーしている主張は二重に出力されません。`effects.labels:`は独自の語彙を登録します——プロジェクトは任意のルートを開くことができるため、`acme.cache`は帰属、境界づけ、許容ができるラベルになります。
- **[effects]** `effects.tolerated:`がエンベロープチェックが報告する内容をディスチャージするようになり、**発生元ごと**にディスチャージします: `tolerated: [telemetry]`は`Logger#info`呼び出しに伴う`io`を解放し、同じメソッド内の`File.read`からの`io.fs.read`はそのまま残します（[#404](https://github.com/rigortype/rigor/pull/404)、[#385](https://github.com/rigortype/rigor/issues/385)、[ADR-103](../adr/103-effect-labels/)）。
  - 呼び出しが何のためのものだったかを許容することは、それに伴うトランスポートを解放し、それ以外は何も解放しません——許容されていない呼び出しを通じても到達したラベルは存続します。`rigor check --no-tolerated-effects`および`rigor effects check`の同じフラグはリストが空であるかのように判定を再実行するため、ポリシーが隠しているものは常にフラグ1つで確認できます;ディスク上の記録とキャッシュ内のサマリーはどちらの場合でも未ディスチャージのままであり、フラグによって再解析のコストがかかることはありません。
- **[effects]**基底クラスに書かれたエフェクトエンベロープがそのサブクラスを束縛するようになりました: 継承された境界が認めない何かを実行する——またはそれ自身が宣言する——オーバーライドは、オーバーライド自身の`def`上で`effect.liskov-widened`として報告されます（[#405](https://github.com/rigortype/rigor/pull/405)、[#386](https://github.com/rigortype/rigor/issues/386)、[ADR-103](../adr/103-effect-labels/)）。
  - `Repo`が使える場所ならどこでも`PgRepo`が使えるため、`Repo#find`上の`%a{rigor:v1:effect io.db}`は`PgRepo#find`が守らなければならない約束です: 実装は継承した境界よりも純粋であってもよいですが、決して不純であってはなりません。HTTPに到達するオーバーライドは証明する内容に対して報告されます;自身により広いエンベロープを宣言するオーバーライドは、その本体が参照される前に宣言する内容に対して報告されます。両側が記述されている必要があります——オーバーライドされているメソッド上にエンベロープを書いていない限り何も発火せず、`include`ではなくサブクラス化のみがカウントされます。作成時は`:warning`、`strict`下では`:error`であり、`effects:`ブロックがない場合および`effects.check: false`下では沈黙します。
- **[effects]**基底型付きのレシーバーを通じた呼び出しが、その基底が宣言した境界を読み取るようになりました: `Repo`型付きのレシーバー上の`repo.find`はレポートおよびスナップショットで`≤ io.db`を報告し、Rigorが解決できなかった呼び出しとしてカウントされなくなりました（[#405](https://github.com/rigortype/rigor/pull/405)、[#386](https://github.com/rigortype/rigor/issues/386)、[ADR-103](../adr/103-effect-labels/)）。
  - 境界は宣言されたラベルと同様に呼び出しエッジを伝播するため、2ホップ上の呼び出し元もそれを読み取ります——そしてそれは依然として主張に過ぎないため、エンベロープを発火させることは決してありません。新しい点は、それが*ディスチャージ*も行うことです: レシーバーの型単独では判断できなかった呼び出しサイトは、名指しされたクラスがそのメソッドの行うことを宣言している場合、もはや「おそらくそれ以上」ではなくなります。プロジェクトのエンベロープがチェックされ（`effect.envelope-exceeded`および今回追加された`effect.liskov-widened`によって）、gemシグネチャのアノテーションはその型が既にそうであるのとまったく同様に信頼されるためです。`effects.attribution:`は意図的にその対象外であり、呼び出しを依然として未解決のまま残します。
  - この目的で読み取られるエンベロープは、独自のRBS、`effects.envelopes:`名前空間スタンザ、そして（新規）gemが出荷するシグネチャまたはRigorにバンドルされたオーバーレイ（チェックされることはなくインポートのみを行う）からです。認識されないラベルを名指しする境界は何もインポートせず、何もディスチャージしません。
- **[plugins]** `rigor-activesupport-core-ext`は、RBSの真に副作用のない半分を`%a{pure}`とマークするようになりました——`blank?` / `present?` / `presence`、語形変化、`squish` / `truncate` / `remove`、`deep_dup` / `deep_merge` / `with_indifferent_access`、DurationおよびBytesの乗数など——これにより、これらのみを呼び出すメソッドはエフェクトなしの網羅的として読まれる一方、`try`、すべての破壊的メソッド（bang mutator）、`constantize`、および時計はアノテーションが付かないままになります（[#407](https://github.com/rigortype/rigor/pull/407)、[#388](https://github.com/rigortype/rigor/issues/388)、[ADR-103](../adr/103-effect-labels/)）。
- **[effects]** Railsアプリは1つのアノテーションも書くことなく読む価値のあるエフェクトレポートを得られるようになりました: `User.find`は`io.db.read`を示し、`WelcomeJob.perform_later`はキューアダプタが実際に行うことを示し、`render`はレスポンス書き込みを示し、`user.save`は実行されるコールバックやバリデーターのエフェクトを示します（[#406](https://github.com/rigortype/rigor/pull/406)、[#387](https://github.com/rigortype/rigor/issues/387)、[ADR-103](../adr/103-effect-labels/)）。
  - 既に利用しているRailsプラグインに加え、新登場の`rigor-railties`（`Rails.cache`（`cache.read` / `cache.write`）、`Rails.logger`および`Rails.error`（`telemetry`）、`Rails.env`および設定（`rails.config.read`）、認証情報（`rails.credentials.read`）を運ぶ）をリストすることで有効化します。ActiveRecord、ActiveJob、ActionMailer、ActionPack、ActionCable、ActiveStorage、I18n、ActiveSupportの時計がそれぞれ自身のgemを特徴づけます。Mastodonではこれが皆無から2,969メソッドにわたる7,647個の報告エフェクトになり、Redmineでは1,575メソッドにわたる3,967個になりました。
  - **リレーションビルダーは純粋であり、マテリアライザーは読み取る**。`where`、`joins`、`order`はクエリを構成するだけで何も発行しません; `first`、`each`、`count`、`pluck`が実行される場所です。そのためスコープを構築して返すプレゼンターは純粋なコードを持ち、それを実体化する呼び出し元が読み取りを取得します——これは通常どう説明されるかではなく、コードが実際に行うことです。
  - **キューアダプタがエンキューのコストを決定する**。Rigorは`config.active_job.queue_adapter`を読み取ります: Solid Queue下では`perform_later`は`io.db.write`（`INSERT`であるため）となり、Sidekiq下では`io.net`となり、`:async`下では何もなくなり、環境ごとに設定した場合は正直な`io`のままになります。`perform_later`はジョブの実行としては決してカウントされず（別のプロセスで発生するため）、`perform_now`はカウントされます; `:inline`はその回答を変更する唯一の設定であり、宣言したために変更されます。
  - **生のSQLはその動詞によって読み取られる**。動詞自体が書き出されている限り、補間を経由しても`connection.execute("UPDATE …")`は書き込みであり、`execute("SELECT …")`は読み取りです。
  - `render`は*コントローラー*が行うことを報告し、テンプレートを読んでいないことを公然と示します; `session[:user_id] = …`は`rails.session.write`を報告します; `Rails.env`は`global.read`を報告します（`Rails.env = "test"`は人々が実際に行うことであるため）——`effects:`ブロックに`tolerated: [telemetry, rails.config.read]`を置けば、判定を静かにさせながら記録を正確に保てます。
  - `effects.snapshot.reach: [rails]`は、すべてのコントローラーアクション、ジョブ、メーラー、チャネルのフットプリントを1語で記録します。行、プリセット、およびRigorが自動適用しない例示的なレイヤー規約スタンザについては[`rigor-railties`](https://github.com/rigortype/rigor/tree/master/plugins/rigor-railties)を参照してください。
  - `effects:`ブロックがない場合、これらは一切実行されず、ディスクから余分なものは何も読み取られず、`rigor check`は変更ありません。オンの場合、RedmineおよびMastodonでの計測コストは経過時間で+3.4%、ピークメモリで≤3.3%です。
- **[plugins]**プラグインがモデル化するフレームワークが何を*行う*かを、5つのマニフェストフィールド——`effect_root:`、`effect_labels:`、`effect_attributions:`、`effect_edges:`、`effect_entry_points:`——を通じて記述できるようになりました（[#406](https://github.com/rigortype/rigor/pull/406)、[#387](https://github.com/rigortype/rigor/issues/387)、[ADR-103](../adr/103-effect-labels/)）。
  - 帰属はクラス名（プロジェクト自身の`class … <`行を通じてサブクラスに到達するため、1つの`ActiveRecord::Base`行がすべてのモデルをカバーする）、レシーバー式（クラスを名指しできない`Rails.cache`）、基底クラスにスコープされたself起点の式（コントローラー内の`session[…] = …`）、またはクラスへの呼び出しの結果（`UserMailer.welcome(u).deliver_now`）によってマッチします。エッジはエンジンが実装する固定の戦略セット——モデルコールバック、`perform_now`、メーラー本体——であり、エンキューからジョブ本体へのエッジを記述する方法は意図的に存在しません。
  - Rigor自身が出荷するプラグインはモデル化するフレームワークのエフェクトラベルルートを開くことができ、その行を信頼済みとしてマークできます。これにより`Rails.env`が永遠に未解決の呼び出しとして報告されるのを止められます;他のプラグインは自身にちなんで命名されたルートを取得し、その行は主張として報告されます。両方の降格は黙って適用されるのではなく、明確に示されます。プラグインのエフェクトテーブルはエフェクトキャッシュのアイデンティティに加わるため、行が変更されたプラグインをアップグレードするとエフェクトが再読み込みされます。[`docs/internal-spec/plugin.md`](../internal-spec/plugin/)を参照してください。
- **[effects]**新しい`effects-on-by-default` bleeding-edge機能により、v0.4.0でデフォルトになる動作がプレビューできるようになりました（[#408](https://github.com/rigortype/rigor/pull/408)、[ADR-103](../adr/103-effect-labels/) § WD15）。
  - `bleeding_edge: [effects-on-by-default]`により、`effects:`キーを一切持たない`.rigor.yml`が`effects: {}`として動作するようになり、収集、`rigor effects`動詞のキャッシュ共有、`effects.check`がそれぞれのデフォルトで有効になります。`effects: false`と書くことで依然としてオプトアウトでき、既に書かれている`effects:`ブロックはそのまま残ります。[`rigor show-bleedingedge`](../manual/02-cli-reference/#rigor-show-bleedingedge)を参照してください。
- **[plugins]** `Rigor::FlowContribution`に呼び出しエッジのエフェクトラベル上限境界を運ぶ`effects`スロットが追加され、貢献者間で和集合によってマージされるようになりました（[#402](https://github.com/rigortype/rigor/pull/402)、[#383](https://github.com/rigortype/rigor/issues/383)、[ADR-2](../adr/2-extension-api/)）。
  - このスロットは、gemごとおよびプラグインのエフェクト帰属が届くキャリアとなります;まだそれを満たすプロデューサーはありません。[`docs/internal-spec/flow-contribution.md`](../internal-spec/flow-contribution/)にドキュメント化されています。
- **[cli]** `rigor unused`がプラグインからもルートを取得するようになり、フレームワークが名前で到達するクラスが未使用として報告されなくなりました（[#359](https://github.com/rigortype/rigor/pull/359)、[#349](https://github.com/rigortype/rigor/issues/349)、[ADR-102](../adr/102-unused-code-reachability-report/)）。
  - `rigor-rails-routes`は`config/routes.rb`がディスパッチするコントローラーを供給します。Railsアプリ内では`Admin::UsersController`を参照するものは何もなく（Railsはリクエスト時に名前で到達する）、ルートの知識がなければすべてのコントローラーがデッドコードとして読まれていました。2つのRailsプロジェクトで、これにより候補リストが56%および84%削減され、「テストコードからのみ到達可能」リストが半減しました。
  - ルートファイルは静的に読み取られ、決して起動されないため、実行中のアプリでは表示されないルートを見つけます: `get "/beta", to: "beta#index" if ENV["ENABLE_BETA"]`は条件がどちらであってもルートとなります。Devise、Doorkeeper、またはマウントされたGrape APIによって再マッピングされたコントローラーはまだカバーされておらず、依然として候補として現れる可能性があります。
  - レポートはプラグインからいくつのルートが提供され、そのうちいくつがプロジェクトが宣言していないクラスを名指ししたかを出力するため、過剰に主張するルートソース（実際のデッドコードを黙って隠してしまう）が見えない状態ではなく可視化されます。
- **[plugins]**プラグインは`prepare`フックから`:reachability_roots`ファクトとして定数名の配列を公開することで、`rigor unused`にエントリーポイントを寄与できるようになりました（[#359](https://github.com/rigortype/rigor/pull/359)、[#349](https://github.com/rigortype/rigor/issues/349)）。
  - フレームワークの知識はプラグインに残り、コアはそのファクトを読み取るだけです。[`docs/internal-spec/plugin.md`](../internal-spec/plugin/)にドキュメント化されています。
- **[plugins]** `rigor-pundit`がPunditポリシーを`rigor unused`に供給するようになり、`authorize @post`から`PostPolicy`としてのみ到達されるポリシー（コードのどこにも書かれていない名前）が死んでいると報告されなくなりました（[#361](https://github.com/rigortype/rigor/pull/361)、[#350](https://github.com/rigortype/rigor/issues/350)）。
  - `app/policies`下のすべてのクラスではなく、認可呼び出しが実際に名指しするポリシーを公開します: ファイルの場所は何かがそれに対して認可している証拠ではなく、示せる以上のものを主張するルートソースは知らせることなく実際のデッドコードを隠してしまいます。したがって誰も認可していないポリシーはレポートに残ります。`authorization_call_paths`（デフォルトは`app/controllers`）は呼び出しを検索する場所を設定します。
- **[plugins]** `rigor-factorybot`がファクトリーがビルドするクラスを`rigor unused`に供給するようになり、`factory :user, class: "Admin::User"`（定数スキャンが見えない文字列）によってのみ名指しされるモデルが死んでいると報告されなくなりました（[#361](https://github.com/rigortype/rigor/pull/361)、[#350](https://github.com/rigortype/rigor/issues/350)）。
  - これらはルートではなくテストロールの*参照*として届くため、そのようなクラスは本番到達可能に昇格するのではなく、レポートの「テストコードからのみ到達可能」セクションに移動します。ファクトリーとspecによってのみ存続し他には何もないモデルは、生きたテストを持つ死んだ本番コードであり、それこそがファクトリーをルート化することで消去されてしまうはずだった発見事項です。
- **[plugins]** `rigor-activejob`がSolid Queueの定期スケジュールが実行するジョブを`rigor unused`に供給するようになり、`config/recurring.yml`内で`class: "SendReminderJob"`（どの`perform_later`も書き留めない文字列）としてのみ名指しされるジョブが死んでいると報告されなくなりました（[#422](https://github.com/rigortype/rigor/pull/422)、[#369](https://github.com/rigortype/rigor/issues/369)）。
  - Solid QueueはRailsが8.0からデフォルトで出荷するActive Jobバックエンドであり、定期タスクはジョブに対する唯一の言及がその文字列である唯一の形態です。`production:`だけでなくすべての環境ブロックが読み取られます（`staging:`でスケジュールされたジョブも依然として生きたコードであるため）;環境のないフラットなドキュメントも機能します。`class:`キーのみを読み取り、それ以外は読み取りません: `command:`エントリーはインラインRubyであり、任意のコード片から定数をパースすることは推測に基づいてクラスをルート化することになります。プラグインが発見しなかったジョブを名指しする`class:`は公開されずにドロップされるため、タイポによって死んだジョブが黙って隠される代わりにルートが失われ、スケジュールを持たないプロジェクトは以前得ていたものとまったく同じものを得ます——`MyJob.perform_later`はレポートが既に追跡している通常の定数参照であるため、`app/jobs`下のものが存在するという理由だけでルート化されることはありません。`recurring_paths`（デフォルトは`config/recurring.yml`）は検索場所を設定します;スケジュールは`YAML.safe_load`で読み取られ、何も起動しません。
- **[plugins]** `rigor-sidekiq`がスケジュールが名前でエンキューするワーカーを`rigor unused`に供給するようになり、`config/schedule.yml`（sidekiq-cron）または`config/sidekiq.yml`の`:scheduler: :schedule:`ブロック（sidekiq-scheduler）内で`class: "NightlyReportWorker"`としてのみ名指しされるジョブが死んでいると報告されなくなりました（[#368](https://github.com/rigortype/rigor/pull/368)、[#367](https://github.com/rigortype/rigor/issues/367)）。
  - `class:`キーのみを読み取り、それ以外は読み取りません。キュー名はクラス名ではないため`:queues:`リストは何も供給しません——`report_worker`を`ReportWorker`に語形変化させることは名前の一致に基づいてクラスをルート化することになります——そしてプラグインが発見しなかったワーカーを名指しする`class:`は公開されずにドロップされるため、タイポによって死んだワーカーが黙って隠される代わりにルートが失われます。`schedule_paths`（デフォルトはその2つのファイル）は検索場所を設定します;スケジュールは`YAML.safe_load`で読み取られ、何も起動しません。Mastodonでは、これにより17個のスケジューラとそれらが到達する13個のクラスが*テストコードからのみ到達可能*（5分ごとに実行されるジョブに対するレポートの以前の回答）から除外され、候補は1つも追加されませんでした。`Sidekiq::Job`を直接ではなくプロジェクトのconcernをincludeするワーカーは、そのconcernを`worker_marker_modules`に設定する必要があり、そうでなければ何も発見されずスケジュールは何も供給しません。
- **[plugins]** `rigor-rspec`、`rigor-rspec-rails`、`rigor-activejob`、`rigor-actionmailer`は意図的に`rigor unused`のルートを供給せず、各プラグインのページでその理由が説明されるようになりました（[#361](https://github.com/rigortype/rigor/pull/361)、[#350](https://github.com/rigortype/rigor/issues/350)）。
  - `MyJob.perform_later`、`MyMailer.welcome`、`RSpec.describe User`はすべて通常の定数としてクラス名を書き込んでおり、レポートは既にそれを記録しています——そしてspecについては、「テストコードからのみ到達可能」セクションを可能にするテストロールと共に記録します。代わりに発見されたジョブ／メーラーのセットをルート化すると、ディレクトリ以外の証拠がないまま孤立したものが永遠に到達可能とマークされてしまいます。同じ推論が`MyWorker.perform_async`にも当てはまり、これが`rigor-sidekiq`がスケジュールされたワーカーのみをルート化し他には何もしない理由です。
- **[plugins]**プラグインは、フレームワークが定数以外のもので名指しするクラスについて、`:reachability_references`ファクトとして`{name:, role:}`エントリーを公開することにより、`rigor unused`に*参照*を寄与することもできるようになりました（[#361](https://github.com/rigortype/rigor/pull/361)、[#350](https://github.com/rigortype/rigor/issues/350)）。
  - ロール（`production` / `test` / `task` / `config`）は名指しを行うもののロールであり、これによってテストツリーからの寄与がレポートのテスト専用の区別を消去することなく維持できます。[`docs/internal-spec/plugin.md`](../internal-spec/plugin/)にドキュメント化されています。
- **[engine]** `pre_eval:`に記載されたファイルがそのトップレベル定数をプロジェクトの残りに公開するようになり、共有された`TIMEOUT = 30`が書かれた場所だけでなく使用される場所でも型付けされるようになりました（[#360](https://github.com/rigortype/rigor/pull/360)、[#352](https://github.com/rigortype/rigor/issues/352)）。
  - 公開される型は拡張されたクラス（`30`は`Integer`、`"x"`は`String`、リテラルハッシュは`Hash`）であり、正確な値ではありません。ファイル間でリテラルの形状を運ぶ定数は、定義を開いたことのない作者のファイルにおいて`CONFIG.fetch(:missing)`のような呼び出しをエラーにしてしまい、精度の価値以上の悪いトレードオフになります。リストされていないファイル内の定数は変更されず、複数のリストされたファイルに書かれた名前は共用体になるのではなく拡張されます。
- **[effects]** Rigorはエフェクトラベルの語彙——`io.db.read`、`nondet.time`、`job.enqueue`のようなメソッドが何を*するか*を表すドットパス名——を拡張可能なデータファイルとその規範的仕様と共に出荷するようになり、兄弟のPHPアナライザーSteinsと同一に表記されるため、1つのポリシーが両者に対して同じように読めるようになりました（[#395](https://github.com/rigortype/rigor/pull/395)、[#377](https://github.com/rigortype/rigor/issues/377)、[ADR-103](../adr/103-effect-labels/)）。
  - 語彙はまだ凍結されていません。Steinsとの整合性は現在も進行中であるため、v0.4.0でリーフ名が変更される可能性があります（議論中なのは`mutate.arg`）;次のマイナーリリースでそのようなリネームが適用されます。意味を失ったラベルは代替を名指しする`effect.unknown-label`として報告されるため、今日書いたアノテーションは黙って失敗するのではなく何に変更すべきかを教えてくれます。
  - エフェクトの推論、記録、チェックはまだ何も行われません: これはラベル言語単独のものであり、解析は変更されず、診断は発火せず、設定キーも存在しません。これが固定するのは語彙です——境界はセグメント全体でマッチされるため、`io`は`io.net.http`をカバーしますが`iota`をカバーすることは決してなく、リーフを追加しても既存の境界が認めるものが変わることはありません。仕様が常に約束してきた純粋性アノテーションも同時に確定しました: RBSエコシステムが既に利用している表記である`%a{pure}`であり、実装されることのなかった`rigor:v1:pure`は削除されました。

### 修正

- **[cli]**ワーカーが全員死亡した並列実行が、永遠に待機する代わりに縮退してその旨を表示するようになりました（[#416](https://github.com/rigortype/rigor/pull/416)、[#414](https://github.com/rigortype/rigor/issues/414)）。
  - 実験的な`RIGOR_POOL_BACKEND=ractor`オーバーライドを通じてのみ到達可能です。デフォルトの`fork`バックエンドは自前で既に回復しており、影響を受けません。
  - そのバックエンドは、Rigor外部の理由により、rbs 4.x下では何も解析できないままです: rbsはRactorが読み取ってはならないプロセス全体の可変キャッシュを通じて名前空間をインターンします。ハングする代わりにファイルごとにそれを報告するようになりました。
- **[engine]** `rigor unused`がクラス自身のRBSシグネチャを通じて自身をルート化することを許可しなくなりました（[#374](https://github.com/rigortype/rigor/pull/374)、[#373](https://github.com/rigortype/rigor/issues/373)）。
  - シグネチャ内のmixin引数は囲むクラス名で事前に修飾されて記録されており、レポートはメンバーへの参照をその所有者への参照として解決します——そのため`SignageResource::Alba::Resource`は`SignageResource`へと剥がされ、それをルート化していました。あるアプリケーションでは、これによりデフォルトの実行で真に死んでいる3つのクラスが隠されており、それらは`signature_paths:`を空にした場合にのみ可視化されていました。
- **[cli]** `rigor unused --entry-point`がマニュアルのドキュメント通りに`**`にマッチするようになりました（[#372](https://github.com/rigortype/rigor/pull/372)、[#371](https://github.com/rigortype/rigor/issues/371)）。
  - `--entry-point='lib/workers/**/*.rb'`は`lib/workers/`の1階層下にネストされたファイルにのみマッチし、その直下のファイルには決してマッチしなかったため、globがルート化するために書かれた宣言がレポートに残りデッドコードとして読まれていました。マニュアル自身の例も影響を受けていました。
- **[cli]** `rigor unused`がマジックエンコーディングコメントを持つソースファイルでクラッシュしなくなり、gitサブモジュールを読み込まなくなりました（[#366](https://github.com/rigortype/rigor/pull/366)、[#365](https://github.com/rigortype/rigor/issues/365)）。
  - `# encoding: big5`ファイル内の文字列リテラルは有効なUTF-8ではないバイトへとパースされます;レポートはそれを定数名として取得し実行全体で異常終了していました。有効なUTF-8ではない名前は定数になり得ないため、ドロップされます。サブモジュールは、そのファイルが自身の宣言でもそれらへの参照でもない独立したプロジェクトです——上流のソースをベンダーしているチェックアウトでは、読み取られたファイルの77%を占めていました。
- **[engine]** `rigor unused`がクラス自身のRBSシグネチャをそのクラスへの参照として扱わなくなり、生成されたシグネチャを出荷するプロジェクトが自身のデッドコードを隠すのをやめました（[#364](https://github.com/rigortype/rigor/pull/364)、[#363](https://github.com/rigortype/rigor/issues/363)）。
  - シグネチャファイルは宣言と参照の両方を行い、参照のみがカウントされます: `sig/`内の`class Talk < ApplicationRecord`は`ApplicationRecord`を参照しますが、それが宣言する`Talk`は何かが`Talk`を使用している証拠ではありません。あるアプリケーションでは、101個のルートのうち48個が`sig/`から来ており、11行がレポートに一度も現れませんでした。
- **[engine]**スーパークラスまたはインクルードされたモジュールから継承された定数がサブクラスの本体から解決されるようになり、トップレベルの同名定数に負けることがなくなりました（[#356](https://github.com/rigortype/rigor/pull/356)、[#354](https://github.com/rigortype/rigor/issues/354)）。
  - Rubyは囲むレキシカルスコープ、次に最も内側のものの祖先、そしてその後に初めてトップレベルを通じて定数を検索します。Rigorは祖先のステップをスキップしていたため、`class Sub < Base`内に書かれた`KEY`は`Base::KEY`ではなくトップレベルの`KEY`として型付けされていました——その読み取りの下流にあるすべてのものが間違った型について推論していました。gemのスーパークラスなど、プロジェクト外部のクラスが所有する定数は依然として完全修飾名でのみ見つかります。

## [0.3.3] - 2026-08-09

v0.3.3は偽陽性解消リリースです: 正常に動作するRubyコードに対してRigorがエラーを報告していた6つのパターンが解消され、その大部分は特殊なエッジケースではなく一般的なイディオムです。`Class.new do … end`の本体、`Array.new(n) { … }`、`defined?`の被演算子、定数に対して開かれたシングルトン本体、DSLマッチャーと衝突するプロジェクトヘルパー、リテラルハッシュ検索に対するnilガードがすべて警告を停止しました。推論も単に曖昧だった箇所でより正確になりました: 引数をそのまま渡すジェネリックメソッドはその引数自身の型を返すようになり、`inspect` / `to_s` / `Array#*`は正確な値へと畳み込まれます。残りは自らのドキュメントを認識していた抑制マーカーを含む正確性の整備です。

### 追加

- **[engine]** `[T] (T) -> T`と型付けされた`Ractor.make_shareable(obj)`のように、シグネチャが引数をそのまま通過させるジェネリックメソッドが、untypedではなく引数自身の型を返すようになりました（[#304](https://github.com/rigortype/rigor/pull/304)、[#303](https://github.com/rigortype/rigor/issues/303)）。
  - バインドされた型は`Array[T]`のようなジェネリックな戻り値にも引き継がれます。自身で定義したメソッドが解決されたシグネチャをシャドウする箇所ではバインディングが意図的に辞退されるため、不正確な答えが確信に満ちた誤った答えになることは決してありません。
- **[engine]**すべての要素、または完全に判明しているハッシュシェイプのすべての値が定数である場合に、`Array#inspect` / `#to_s`および`Hash#inspect` / `#to_s`が正確な文字列へと畳み込まれるようになりました（[#305](https://github.com/rigortype/rigor/pull/305)、[#121](https://github.com/rigortype/rigor/issues/121)）。
  - `Array#*`はその両方の形式を畳み込みます: String引数は結合（join）し、Integer引数は繰り返しとなります。

### 修正

- **[engine]** `Class.new do … end`内のコードが、トップレベルコードとしてではなく新しいクラス自身の本体として解析されるようになりました（[#338](https://github.com/rigortype/rigor/pull/338)、[#319](https://github.com/rigortype/rigor/issues/319)）。
  - `attr_reader`などが未解決のトップレベル呼び出しとして報告されなくなり、呼び出しが返すクラスは`Object`のものではなくその本体が宣言するメソッドと`initialize`のアリティを保持するようになります。`Module.new`、`Struct.new`、`Data.define`のブロック形式も同じ変更でカバーされます。
- **[engine]** `Array.new(n) { … }`が、ブロックなしオーバーロードの`nil`埋めではなく、ブロックから要素型を取得するようになりました（[#336](https://github.com/rigortype/rigor/pull/336)、[#317](https://github.com/rigortype/rigor/issues/317)）。
  - `Array.new(2) { "s" }[0].upcase`はnilに対するメソッド呼び出しを警告しなくなり、`Array.new(2)[0].upcase`は要素が実際にnilであるため依然として警告します。
- **[engine]** `defined?(…)`内に書かれたコードが、実行されたかのように解析されなくなりました（[#337](https://github.com/rigortype/rigor/pull/337)、[#318](https://github.com/rigortype/rigor/issues/318)）。
  - 括弧なしの`defined? x && y`という記述はその被演算子として`&&`チェーン全体を飲み込むため、`defined? @subject && !@subject.options.empty?`のようなガードがランタイムが決して行わない呼び出しにフラグを立てるのをやめます。括弧付きの`defined?(x) && y`形式は実際に右辺を評価する異なる式であり、依然として報告されます。
- **[engine]**独自のシングルトン本体を持つ素のオブジェクトを保持する定数が、その本体内のすべてのメソッドを未定義として報告しなくなりました（[#339](https://github.com/rigortype/rigor/pull/339)、[#320](https://github.com/rigortype/rigor/issues/320)）。
  - hamlの属性マージャーに見られるような`class << Merger = Object.new`イディオムと、既に代入された定数上の個別の`class << Merger`の両方が、記述したメソッドへと解決され、その推論された戻り値型を取得するようになりました。本体が定義していない名前は依然として報告されます。
- **[engine]**あるファイルのトップレベルでプロジェクトが定義したヘルパーが、別の場所でDSLブロックがmixinから取得する同名メソッドをキャプチャしなくなりました（[#340](https://github.com/rigortype/rigor/pull/340)、[#316](https://github.com/rigortype/rigor/issues/316)）。
  - specファイル内でRSpecの`output`、`include`、`match`マッチャーを呼び出す際に、ヘルパーの戻り値に対してチェックされなくなります。真正なトップレベルコードから呼び出されたヘルパー、またはそれを呼び出すブロックと同じファイルで定義されたヘルパーは、以前とまったく同様に解決されます。
- **[engine]**リテラルハッシュの検索に対するnilガードが、条件が常に真または常に偽であると警告しなくなりました（[#327](https://github.com/rigortype/rigor/pull/327)、[#313](https://github.com/rigortype/rigor/issues/313)）。
  - `rank = RANKS[name]`に続く`return if rank.nil?`、および2つの検索を一度にガードする`||` / `&&`の記述は生きたコードです: テーブルにないキーは実行時に実際にnilとして読み取られます。そのようなガードが保護する分岐も、推論された型からドロップされなくなりました。
- **[engine]**渡す前にnilableな属性をローカル変数にコピーしても、引数の型の不一致を警告しなくなりました（[#328](https://github.com/rigortype/rigor/pull/328)、[#324](https://github.com/rigortype/rigor/issues/324)）。
  - `r = @right`に続く`insert(r)`は、そのメソッド呼び出しを報告するチェックからだけでなく、`@right`を直接渡すのと同じ回答を得るようになりました。
- **[rigor check]** `# rigor:disable` / `# rigor:disable-file`マーカーが、コメントの先頭にある場合にのみ認識されるようになりました（[#314](https://github.com/rigortype/rigor/pull/314)、[#306](https://github.com/rigortype/rigor/issues/306)）。
  - ドキュメント散文、ドキュメントツールの`##`行、`=begin`ブロックなど、単に構文を引用しているコメントは診断を沈黙させなくなり、自身の引用例について警告しなくなりました。行全体または末尾のディレクティブは、`#`の後にスペースがない場合を含め、以前とまったく同様に機能します。
- **[rigor check]**設定されたプロファイルが重大度を再設定した診断が、構造化フィールドを失わなくなりました（[#312](https://github.com/rigortype/rigor/pull/312)）。
  - デフォルトの`balanced`プロファイル下の`def.return-type-mismatch`などで、`method_name`、`receiver_type`、`project_definition_site`がJSON出力および`rigor triage`に存続するようになりました。
- **[rigor coverage]**フォークされた`--protection --mutation`ワーカーが、システムのtempディレクトリにスクラッチファイルを放置しなくなりました（[#334](https://github.com/rigortype/rigor/pull/334)、[#330](https://github.com/rigortype/rigor/issues/330)）。
  - プロジェクト全体の繰り返し実行で、実行ごとにワーカーあたり1つの浮遊ファイルが蓄積されるのを停止しました。
## [0.3.2] - 2026-08-08

v0.3.2は、`rigor coverage`のミューテーション階層をプロジェクト全体で実用的なものにします: 各ファイルの計測結果がキャッシュされ、実行がワーカー間でフォークされ、2つのオプトインなbleeding-edge機能により、`rigor check`が既に持っているのと同じクロスファイルの知識でサイトを選択し、キルを判定できるようになります。エディタサーフェスも同じ方向に拡張され、保存、編集中（in-flight）のバッファ、そして開いているバッファの一括処理のすべてが、1ファイルずつではなくプロジェクト全体に対して応答するようになりました。`dry-schema`および`dry-validation`プラグインがContract自身の結果の形状を型付けし、一連のエンジン修正によって正しいコードに対する偽陽性が解消されました。正しさに関する最大の修正は最も目に見えにくいものです: Rigor自身のバンドルされたシグネチャが`rbs` gemが出荷するものと衝突し、`Gem::Specification`、`Time`、`Bundler`および他の6つのクラスの型チェックがサイレントに無効化されていました。

### 追加

- **[rigor coverage]** `--protection --mutation`（Tier 2）が各ファイルの計測結果をキャッシュし、変更がない限り再実行時に再利用するようになったため、プロジェクト全体の詳細調査で誰も触っていないファイルを再計測することがなくなりました（[#134](https://github.com/rigortype/rigor/issues/134)、[#270](https://github.com/rigortype/rigor/pull/270)）。
  - キャッシュされた結果は、ファイル自体、読み込み元として記録されたすべてのファイル、解決された設定、`sig/`、gemセット、エンジンバージョン、`--limit` / `--seed`、および採用されたbleeding-edge機能のすべてが変更されていない場合にのみ提供されます。1つのファイルを編集すると、そのファイルに加えてそこから読み込んでいると記録されたファイルが再計測され、残りはキャッシュから提供されます。
  - これは`rigor check --incremental`の実行が記録するクロスファイルの依存関係エッジを読み込むため、プロジェクトごとに一度ウォームアップしてください。使用可能なスナップショットがない場合、`--no-cache`下、または`dependent-closure-kill-oracle`が採用されている場合は、すべてのファイルが新たに計測され、サイレントに提供されることは決してありません。
  - stderrの1行でどちらが発生したかが常に報告され、計測ハーネス自体が例外を発生させた（raised）実行は決してキャッシュされません。
- **[rigor coverage]** `--protection --mutation`（Tier 2）が、Tier 1が既に使用しているのと同じクロスファイルのプロジェクトディスカバリーに対して計測対象サイトを選択できるようになりました。新しい`discovery-seeded-mutation-sites` bleeding-edge機能の背後で利用可能です（[#253](https://github.com/rigortype/rigor/issues/253)、[#259](https://github.com/rigortype/rigor/pull/259)）。
  - Tier 2は各候補サイトを空のスコープに対して判定していたため、`Post.where`や`Account.find`のように、レシーバーが*兄弟*ファイルで宣言されたプロジェクトクラスである呼び出しは、型なし（untyped）として読まれ、Tier 1がカウントしていたにもかかわらず、そのサイトは計測から完全に除外されていました。シードされると、両方の階層が単一の基準でサイトを判定します。定数レシーバーはRailsツリーで支配的な呼び出し形状であるため、レポートが最も使用されるまさにその場所でギャップが最大となっていました。
  - 同じクロスファイルの知識がキルオラクルにも届くため、シードが受け入れたサイトは、そこでのミューテーションが実際に破壊しうるサイトとなります: レシーバーの型がファイルをまたいでしか知ることができない`Account.label.upcase`のような呼び出しは、生存が保証された生存体（survivor）としてカウントされるのではなく、捕捉されるようになりました（[#260](https://github.com/rigortype/rigor/issues/260)、[#262](https://github.com/rigortype/rigor/pull/262)）。
  - `.rigor.yml`で`bleeding_edge: [discovery-seeded-mutation-sites]`（または`bleeding_edge: true`）を指定してオプトインでき、`rigor show-bleedingedge`でプロジェクトが採用している機能が出力されます。分母にサイトを**追加**し、追加されたサイトは型ネットがまだ捕捉していないものが多いため、変更されていないコードでも報告される有効性比率が*低下*し、CIで固定された数値を下回ると`--threshold=RATIO`が終了コード1で終了するため、デフォルトではオフになっています。デフォルトでオンにするとユーザー側で変更がないのにグリーンなビルドがレッドになってしまうため、メジャーバージョンまで待機し、移行ノートで期待される変化が記載されます。
- **[rigor coverage]** `--protection --mutation`（Tier 2）で、ミューテーションされたファイル内ではなく*呼び出し側*でエラーが発生した場合にも破壊が捕捉されたとカウントできるようになりました。新しい`dependent-closure-kill-oracle` bleeding-edge機能の背後で利用可能です（[#254](https://github.com/rigortype/rigor/issues/254)、[#266](https://github.com/rigortype/rigor/pull/266)）。
  - メソッドの戻り値を変更することはファイルをまたいで捕捉されますが、これこそがアナライザーの目的であり、以前はRigorが見逃した破壊としてスコアリングされていました。`.rigor.yml`で`bleeding_edge: [dependent-closure-kill-oracle]`を指定してオプトインできます。
  - これはキルを追加することしかできないため、報告される比率は上昇するか変わらないかのどちらかですが、この機能を有効にして記録された数値は、無効で記録された数値と比較できなくなります。また、ミュータントあたりの壁時計時間が約3分の1増加します。
- **[rigor coverage]** `--protection`（Tier 1）が、`protected`なディスパッチサイトのうち下限型付け（lower-bound-typed）のみであるサイト数を、既存の`protected`の合計や比率を変更しない`lower_bound_typed`カウントとして内訳表示するようになりました（[#263](https://github.com/rigortype/rigor/issues/263)、[#265](https://github.com/rigortype/rigor/pull/265)）。
  - 下限型付けされたサイトとは、宣言からではなく呼び出し側から型が与えられた未宣言のパラメータであり、否定的なルール（negative rule）はまだそれに対して発火できません。この内訳は、保護された合計のうちどれだけが推論のみに依存しているかを示します。
- **[rigor coverage]** `--protection --mutation`（Tier 2）が、ハーネス内で計測時に例外が発生したミュータントを別の`harness_errors`バケットにカウントするようになり、レスキューされた失敗が、それ以外は同一の実行間で`--threshold`ゲートが読み取るサイトの合計をサイレントに変更することがなくなりました（[#264](https://github.com/rigortype/rigor/issues/264)、[#267](https://github.com/rigortype/rigor/pull/267)）。
  - このバケットはパース無効なミュータントとは区別され、比率からは同様に除外され、`--format json`では常に存在し、テキストレポートでは0でない場合にのみ表示されます。`--with-tests`の有無にかかわらず適用されます。
  - カウントが一定の閾値に達すると、静かに多くのミュータントをレスキューした実行は1つもレスキューしなかった実行と比較できないため、stderrで大きな警告を出力します。
- **[rigor show-bleedingedge]**キューに入っているすべてのbleeding-edge機能について、その種類（namedルールを昇格させるものは`severity`、計測、アルゴリズム、またはデフォルトに対するキューに入った変更は`behaviour`）が出力されるようになりました（[#252](https://github.com/rigortype/rigor/issues/252)、[#255](https://github.com/rigortype/rigor/pull/255)）。
  - `severity`機能はルールから重大度への差分を表示します。`behaviour`機能はどのルールの重大度も変更しないため、そのサマリーがそれを採用することで何が行われるかの完全な説明となり、これがコマンドが*計測する*内容への変更のステージング手段となります。
  - 機能の選択方法は変更されておらず、両方の種類で同一です: `bleeding_edge:`は依然として`true`、機能IDリスト、または`{ all: true, except: [ids] }`を受け入れ、`--bleeding-edge[=ids]` / `--no-bleeding-edge`は依然として1回の実行に対してそれをオーバーライドします。
  - 出力に`Graduated`セクション（`--format json`では`graduated`配列）が追加され、メジャーバージョンでデフォルトになり、もはや`bleeding_edge:`にリストする必要がなくなった機能の名前が挙げられます。まだ卒業した機能はないため、このセクションは非表示で、JSON配列は空です。
- **[lsp]**ファイルを保存したときに、保存したファイルだけでなく、開いている他のファイルの診断も更新されるようになりました（[#246](https://github.com/rigortype/rigor/issues/246)、[#247](https://github.com/rigortype/rigor/pull/247)）。
  - `textDocument/didSave`時にサーバーはプロジェクト全体を解析し、内容がディスク上のファイルと一致する開いているすべてのバッファを再パブリッシュします。メソッドの戻り値型を変更して保存すると、その呼び出し側のタブに触れることなく、そのタブにエラーが表示されます。
  - 未保存の変更があるバッファは、自身のテキストから計算された診断を保持するため、保存ラウンドがそのバッファの代弁をすることはありません。タイピングへの影響はなく、`didChange`は依然として単一ファイル単位でパブリッシュするため、キーストロークのレイテンシは変わりません。
- **[lsp]**開いている複数のバッファが一度に変更されたとき、その診断が1バッファずつではなく、フォークベースのワーカープール全体でまとめてパブリッシュされるようになり、報告内容に変更はありません（[#142](https://github.com/rigortype/rigor/issues/142)、[#280](https://github.com/rigortype/rigor/pull/280)）。
  - ワークスペース全体のリネームや、開いている多数のファイルに影響するGitブランチの切り替えが、これの対象となるケースです。小さなバッチサイズ未満ではプールのコストが節約分を上回るため、その閾値を超えた場合にのみ有効になります（[#281](https://github.com/rigortype/rigor/pull/281)）。
- **[rigor check]**エディタモードがプロジェクト全体のスコープを獲得しました: `--tmp-file` / `--instead-of`と`--incremental`を組み合わせることで、未保存のバッファを置換してプロジェクト全体を解析し、編集中（in-flight）の変更が編集中のファイルだけでなく、それに依存するファイルにも表示されるようになりました（[#146](https://github.com/rigortype/rigor/issues/146)、[#244](https://github.com/rigortype/rigor/pull/244)）。
  - 編集されたファイルとその依存先が再解析され、他のすべてのファイルはインクリメンタルスナップショットから提供されます。再利用するスナップショットが必要なため、一度`rigor check --incremental`を実行してください;スナップショットがない場合はstderrでその旨を伝え、以前と同様にバッファ単体で解析します。
  - エディタモードの実行がスナップショットを書き込むことは決してないため、エディタ内のバイト列がディスク上のファイルの状態と誤認されることはありません。
- **[rigor check]** `parameter_inference:`が、終了コード64で拒否される代わりに、`--incremental`と合成できるようになりました（[#204](https://github.com/rigortype/rigor/issues/204)、[#235](https://github.com/rigortype/rigor/pull/235)）。
  - インクリメンタル実行は呼び出しサイトのパラメータテーブルを再計算し、推論されたパラメータ型が移動したメソッドを再チェックするため、*呼び出し側*のみを編集した場合でも*呼び出し先*の診断が正しく更新されます。これこそが、古い排他制御が存在した理由である陳腐化を防ぐものです。`--verify-incremental`もこのゲートの下で実行されます。
- **[rigor-dry-schema]** `SomeSchema.call(input).to_h`が、型なし（untyped）ハッシュの代わりにスキーマ自身のハッシュ形状を返すようになり、キーを読み取ることでスキーマがそれに対して宣言した型が得られるようになりました（[#137](https://github.com/rigortype/rigor/issues/137)、[#248](https://github.com/rigortype/rigor/pull/248)）。
  - 結果は`{ email: String, age: Integer, ?nickname: String, ... }`として読み取られます: `to_h`の最悪のケースではなく宣言自身の語彙に従い、`required`行は必須キー、`optional`行はオプショナルキーになります。バリデーションが失敗すると必須キーもドロップされる可能性がありますが、すべてのキーを存在しない可能性があるとして型付けすると、正しいコードであるにもかかわらず`if result.success?`分岐内でnilエラーが発生してしまいます。
  - 標準語彙外の述語、ネストされた`schema do ... end`行、または`rigor-dry-types`テーブルが解決しないエイリアスなど、プラグインが型付けできないキーは、省略されるのではなくuntypedとして表示されるため、形状によってスキーマがそれを宣言していることが分かります。
  - スキーマは呼び出しサイトで記述されたとおりに定数で指定される必要があります;ローカル変数を経由して到達された場合、チェーンは以前と同様に型付けされます。
- **[rigor-dry-schema]** `required(:key).each do ... end`ブロックがネストされたハッシュ形状へと再帰するようになり、ネストされたスキーマの配列がスカラーの配列ではなくスキーマの配列として型付けされるようになりました（[#137](https://github.com/rigortype/rigor/issues/137)、[#276](https://github.com/rigortype/rigor/pull/276)）。
- **[rigor-dry-schema]** Symbol引数が認識されたdry-schema型ではない`filled` / `value` / `maybe` / `each`述語が、キーをサイレントに型なしのままにする代わりに、`dry-schema.unknown-type`（info）として報告されるようになりました（[#137](https://github.com/rigortype/rigor/issues/137)、[#276](https://github.com/rigortype/rigor/pull/276)）。
- **[rigor-dry-validation]** Contract自身の`params` / `json`スキーマに存在しないキーを参照する`rule(:key)`呼び出しが、スキーマと`rule()`呼び出しの両方が静的に完全に解決可能である場合に厳格にゲートされ、`dry-validation.rule-key-mismatch`（error）として報告されるようになりました（[#137](https://github.com/rigortype/rigor/issues/137)、[#276](https://github.com/rigortype/rigor/pull/276)）。
- **[rigor-dry-validation]** `Contract.new.call(input).to_h`が、`params { ... }`または`json { ... }`ブロックがプレーンなdry-schema宣言であり、かつ`rigor-dry-schema`もロードされているContractについて、汎用的な`Hash[Symbol, untyped]` RBSオーバーレイからContract自身のスキーマ形状へと精緻化されるようになりました（[#137](https://github.com/rigortype/rigor/issues/137)、[#276](https://github.com/rigortype/rigor/pull/276)）。
- **[rigor-rbs-inline]** Rigorがパースするものの適用（honour）しないインラインRBSアノテーションが、静かにドロップされる代わりに`plugin.rbs-inline.source-rbs-annotation-not-honoured`（info）として報告されるようになりました（[#229](https://github.com/rigortype/rigor/issues/229)、[#234](https://github.com/rigortype/rigor/pull/234)）。
  - インラインRBSの実装は2つあり、`module-self`の表記が異なります: Rigorは`# @rbs module-self Foo`と読み、`rbs`自身のインラインドキュメントでは`# @rbs module-self: Foo`と表記されています。後者の形式は以前、アノテーションコメントが生成されたRBSにエコーバックされながらも何の効果も持たなかったため、省略が見えなくなっていました。
  - ファイルの他のアノテーションは影響を受けず、診断でもその旨が明記されます。マニュアルの章で、Rigorがどちらの方言を読み、何が異なるのかが記載されるようになりました。
- **[inference]** `"widget".freeze`が`String`へ拡大される代わりにその値を保持するようになり、フリーズされた定数が記述元のリテラルと同じ精度を維持するようになりました（[#121](https://github.com/rigortype/rigor/issues/121)、[#250](https://github.com/rigortype/rigor/pull/250)）。
  - その定数の下流にあるすべてのものも精度を維持し、`itself`、`dup`、`clone`もこれに加わります。`%w[a b].freeze`や`"widget".-@`はすでにこのように動作していました;プレーンなスカラーだけが例外だったのは、フリーズがレシーバーのミューテーションとして分類されていたためです（これはオブジェクトのフラグについては真ですが、値には無関係です）。
  - GitLabやMastodonを含む20のプロジェクトで計測: 9,548件の診断で、追加も削除もありませんでした。
- **[inference]**既知の値の配列に対する集合演算が精度を維持するようになりました: `%w[a b] & allowed`、`|`、`-`、`intersection`、`union`、`difference`、`intersect?`、さらに`at(i)`、`one?`、`deconstruct`（[#121](https://github.com/rigortype/rigor/issues/121)、[#245](https://github.com/rigortype/rigor/pull/245)）。
  - それぞれがRuby自身の演算子で評価されるため、`eql?`メンバーシップは実行時とまったく同じように判定され、`[1] & [1.0]`は`[1]`ではなく空配列へと畳み込まれます。
- **[engine]**リテラル配列に対する`Array#first(n)`および`Array#last(n)`が、拡大された`Array[Elem]`ではなく精密なサブ配列の要素型へと畳み込まれるようになり、`take` / `drop` / `first` / `last`ファミリーの最後のギャップが解消されました（[#121](https://github.com/rigortype/rigor/issues/121)、[#261](https://github.com/rigortype/rigor/pull/261)）。
- **[engine]**完全に定数なペアの配列またはHashリテラルに対する`URI.encode_www_form`がエンコードされた`Constant[String]`へと畳み込まれるようになり、定数文字列に対する`URI.decode_www_form` / `URI.extract`が拡大された`Array[[String, String]]` / `Array[String]`ではなく精密なタプルへと持ち上げられるようになりました（[#121](https://github.com/rigortype/rigor/issues/121)、[#283](https://github.com/rigortype/rigor/pull/283)、[#284](https://github.com/rigortype/rigor/pull/284)）。
- **[engine]**すべてのパターン要素が定数の`String`または`Regexp`である場合、`Regexp.union`（splatされたパターン、単一の配列引数、または0引数）および`Regexp.linear_time?`が精密な`Constant[Regexp]` / `Constant[bool]`へと畳み込まれるようになりました（[#121](https://github.com/rigortype/rigor/issues/121)、[#279](https://github.com/rigortype/rigor/pull/279)）。
- **[engine]** `Regexp.compile`、`Integer#rationalize`（引数なし形式）、および`Integer#abs2` / `Float#abs2`が、クラスへと拡大される代わりに定数レシーバー上で正確な結果へと畳み込まれるようになりました（[#121](https://github.com/rigortype/rigor/issues/121)、[#268](https://github.com/rigortype/rigor/pull/268)）。

### 変更

- **[rigor coverage]** `--workers=N`がミューテーション階層（`--protection --mutation`）に適用されるようになり、ファイルごとの計測がワーカープロセス間でフォークされ、バイト単位で同一の出力が得られるようになりました（[#134](https://github.com/rigortype/rigor/issues/134)、[#257](https://github.com/rigortype/rigor/pull/257)）。
  - Rigor自身の`lib/rigor/analysis`では、12コアマシン上で8ワーカー時に35秒から23秒に短縮されました。このフラグはそのパスですでに受け入れられ文書化されていましたがサイレントに無視されていました;現在では`rigor check`と同様に解決され（`--workers` › `RIGOR_RACTOR_WORKERS` › `parallel.workers:` › `0`）、プロジェクト全体の事前パスは親プロセスで1度だけ支払われます。
  - 融合された`--with-tests`階層は意図的に逐次実行のままになっています。これはテストフックがテストランナーを呼び出し、並行実行すると1つのワーキングツリー上で競合するためです。そこでの明示的な`--workers`は、無視されるのではなく、stderrで無視されたことが報告されるようになりました。
- **[perf]**フォーク並列実行のワーカーが、遅延YJITウォームアップウィンドウの残りを再開するのではなく継承するようになり、実行全体がJITコンパイルを行うのとまさに同じタイミングでワーカーもJITコンパイルを行うようになりました（[#134](https://github.com/rigortype/rigor/issues/134)、[#258](https://github.com/rigortype/rigor/pull/258)）。
  - これは`rigor coverage`のスキャンと`rigor check`のプールの両方において、ワーカーごとではなく実行ごとに1回のウォームアップとなります。これがないと、`fork`は遅延YJITを子プロセスに引き継がないため、長時間の並列カバレッジ実行が置き換え対象の逐次実行よりも*遅く*なっていました。
- **[rigor check]** RBSを出荷するプロジェクトでのコールド実行において、アロケーションが約3分の1削減されました。未宣言型への参照を探すシグネチャスキャンが、それらを見つけるためにプロジェクト内のすべてのクラスを構築しなくなったためです（[#207](https://github.com/rigortype/rigor/issues/207)、[#240](https://github.com/rigortype/rigor/pull/240)）。
  - 代わりに宣言を読み込み、RBS自身が適用するのと同じメンバーシップテストを適用するため、同じ名前が見つかります。Rigor自身の`lib`では、そのスキャンは784万アロケーションから2万5千アロケーション（実行の33%から0.15%）に減少し、Rails形状のプロジェクトでは実行全体で84%削減されました。この変更が計測された8つのRBS出荷プロジェクト全体で、診断に変更はありませんでした。
- **[rigor check]** `--verify-incremental`が、ディスク上のファイルの完全な解析とサイレントに比較する代わりに、エディタバッファ（`--tmp-file` / `--instead-of`）を拒否するようになりました（[#244](https://github.com/rigortype/rigor/pull/244)）。

### 修正

- **[engine]** `Gem::Specification`、`Time`、`DateTime`、`Bundler`を含む9つのクラスが型なし（untyped）レシーバーへ縮退しなくなり、`spec.version`が実際の型で返され、これらのいずれかでのタイポが再び報告されるようになりました（[#299](https://github.com/rigortype/rigor/issues/299)、[#300](https://github.com/rigortype/rigor/pull/300)）。
  - Rigor自身のバンドルされたシグネチャが、`rbs` gemがすでに出荷しているメソッドを再宣言しており、衝突ごとにクラス全体の型チェックがサイレントに無効化されていました。影響を受けたクラスは`Gem::Specification`、`Gem::Dependency`、`Gem::Requirement`、`Bundler`、`Bundler::LockfileParser`、`Time`、`DateTime`、`BigMath`、および`Nokogiri::CSS::Parser`でした。
  - 標準ライブラリのクラスを拡張するバンドルシグネチャ（具体的には`CGI`、`Prism::ParseResult`、`StringScanner`、`Resolv`）は、拡張対象のライブラリが環境に存在する場合にのみロードされるようになり、そのライブラリなしで構築された環境で同じ縮退が発生しなくなりました（[#301](https://github.com/rigortype/rigor/pull/301)）。
- **[engine]** RBSインスタンスまたはシングルトンの定義の構築に失敗したクラスについて、どこにも兆候なくそのクラス上のすべての呼び出しを`Dynamic`にサイレントに縮退させる代わりに、クラス名を明記した1行のstderr警告を出力するようになりました（[#295](https://github.com/rigortype/rigor/issues/295)、[#296](https://github.com/rigortype/rigor/pull/296)）。
  - 通常の原因はメソッド宣言の重複または解決できないスーパークラスであり、エラーが衝突元の宣言ファイルを特定できる場合はそれらのファイル名も警告に記載されます。以前は実際のメソッドもタイポも同様にuntypedとして解決されていたため、下流のどこにもそのクラスがチェックされていないことを知らせるものがありませんでした。
- **[engine]**非リテラルキーでコレクションから読み出された値を条件とする`if` / `unless`が、ルックアップがミスしたときに実行される分岐を破棄しなくなり、その分岐に依存する正しいコードが報告されなくなりました（[#286](https://github.com/rigortype/rigor/issues/286)、[#292](https://github.com/rigortype/rigor/pull/292)）。
  - `v = MAP[key]; if v`、`list.first`、および`handler = TABLE[name]; return unless handler`ガードが、これの対象となる形状です。例えば`n = if MAP[key] then 1 else "none" end; n.upcase`は`n`を`1`と型付けし、`undefined method 'upcase'`とフラグ付けされていました。
  - 値が真に`nil`または`false`になり得ない条件は、以前とまったく同様に畳み込まれます;省略（elision）は、nil非存在性が無視された楽観的アノテーションに依拠している場合にのみ辞退されます（[ADR-101](../adr/101-optimistic-carrier-branch-elision/)）。
- **[engine]**空の`[]`または`{}`リテラルから構築された`Struct` / `Data`メンバーがその空の状態を保持しなくなり、後からメンバーを満たす正しいコードが報告されなくなりました（[#293](https://github.com/rigortype/rigor/issues/293)、[#298](https://github.com/rigortype/rigor/pull/298)）。
  - 次の行で`<<`を使って満たすファクトリー内の`Result.new([], [])`は、メンバーの`first`を`nil`へと畳み込んでしまい、その後の呼び出しで`undefined method 'local' for nil`を引き起こしていました。空でないリテラルから構築されたメンバーは、引き続きその正確な要素型へと畳み込まれます。
- **[engine]** `nil`以外の可能性がuntypedのみであるレシーバーに対して、そのレシーバー上で呼び出されるすべてのメソッドで`possible nil receiver`が発生しなくなりました（[#294](https://github.com/rigortype/rigor/issues/294)、[#297](https://github.com/rigortype/rigor/pull/297)）。
  - この形状は、一方の分岐がuntypedな呼び出しから代入され、もう一方の分岐が残した`nil`とマージされた値であり、プログラムのどこにも定義されていないメソッド名に対しても診断が発火していました。`String | nil`のような既知のクラスを持つレシーバーは、以前とまったく同様に報告されます。
- **[engine]**変数間を*選択*するレシーバーを通じてコレクションを満たした場合に、レシーバーになり得るすべての変数が拡大されるようになり、後でそれらのいずれかに対して`.empty?`を呼び出しても誤った`flow.always-truthy-condition`が発生しなくなりました（[#277](https://github.com/rigortype/rigor/issues/277)、[#278](https://github.com/rigortype/rigor/pull/278)）。
  - 選択する形式とは、`(kind == :required ? required : optional)[key] = value`のような三項演算子、`if` / `else`、および`||`です。
- **[engine]**ネストした`Result = Data.define(...)`（または`Struct.new(...)`）定数がファイルをまたいで可視になり、ファクトリーの戻り値に対する呼び出しで、親名前空間にある同名のクラスに起因する誤った`call.undefined-method`が発生しなくなりました（[#271](https://github.com/rigortype/rigor/issues/271)、[#275](https://github.com/rigortype/rigor/pull/275)）。
- **[engine]**インスタンス側とクラス側の両方で同じメソッド名を定義しているクラスにおいて、クラス側の呼び出しで誤った`call.undefined-method`が発生しなくなりました（[#239](https://github.com/rigortype/rigor/issues/239)、[#243](https://github.com/rigortype/rigor/pull/243)）。
  - この形状は、`def helper`と`class << self`（または`def self.helper`）のペアです。ソース内のメソッドテーブルは名前ごとに1つの種類しか記録していなかったため、2番目の定義が最初の定義を消去し、Rigorがソース内で確認できるメソッドが見つからないと判定されていました;現在では、2つの定義が異なるファイルにある場合を含め、両方を記録します。実例: `haml` gemの`Haml::Compiler::ScriptCompiler.find_and_preserve`。
- **[engine]** RBSが未宣言の**インターフェイス**（`_Writable`）または**型エイリアス**（`serialized_node`）を参照しているプロジェクトにおいて、実行が合成したはずのすべてのスタブを失う代わりに、他の欠落している型と同様にそれらの参照がスタブ化されるようになりました（[#237](https://github.com/rigortype/rigor/issues/237)、[#238](https://github.com/rigortype/rigor/pull/238)）。
  - Rigorは参照されているが未宣言の型をスタブ化することで、RBSの全か無かのクラス単位の構築が成功し、クラスの他のメソッドが宣言された型を維持できるようにします。インターフェイス名やエイリアス名は`class`として宣言できないため、それらのいずれかがあるとバッチ全体がパース不能になりサイレントに破棄されていました;欠落している名前がすべてエイリアスであるプロジェクトでは、プロジェクト自身の`sig/`がまったく寄与していませんでした。各スタブは名前に必要な種類で宣言され、個別に検証されるようになりました。
  - また、シグネチャスキャンはパスが何も追加しなくなると、最大5回繰り返す代わりに即座に停止するため、上記の状態にあるプロジェクトが環境構築に費やす時間が大幅に短縮されます。
- **[engine]**プロジェクトの`.rbs`ファイル、またはプラグインが合成したインラインRBSの寄与が有効なUTF-8でない場合、RBSパーサに到達する代わりに、ファイル名を明記した警告とともに隔離されるようになりました（[#230](https://github.com/rigortype/rigor/pull/230)）。
  - パーサに達すると、rbs 4.1では素の`ArgumentError`で`rigor check`がクラッシュし、古いrbsリリースではプロセスが完全にハングする可能性がありました。
- **[inference]**オプトインの`parameter_inference:`下で、*レシーバー*の型が呼び出しサイトのパラメータ推論から得られた場合に、`call.argument-type-mismatch`が発火しなくなりました（[#205](https://github.com/rigortype/rigor/issues/205)、[#236](https://github.com/rigortype/rigor/pull/236)）。
  - 推論されたパラメータ型は下限であるため、それを通じて解決されたメソッド契約は投機的です;ガードは推論された引数に対してはすでに適用を控えていましたが、レシーバー側を見落としていました。これはRigor自身のセルフチェックで表面化し、シードされたレシーバーが、実装よりも厳格な上流のRBSシグネチャに対する正しい呼び出しをフラグ付けしていました。
- **[inference]** **オープン**なハッシュ形状が宣言していないキーを読み取ると、`nil`ではなく`untyped`が推論されるようになり、正しいコードの次の行（`payload[:undeclared].upcase`）で誤った`call.undefined-method`が発生しなくなりました（[#249](https://github.com/rigortype/rigor/pull/249)）。
  - オープンな形状とは、余分なキーのポリシーにより宣言されたキー以外のキーが許可されている形状であり、宣言されていないキーは存在しないのではなく*未知*（unknown）となるため、`[]`、`fetch`、`dig`、`values_at`はすべてそこで`untyped`を返します。クローズドな形状は、宣言されていないキーを以前とまったく同様に`nil`として解決し続け、網羅的なキーセットを必要とするすべてのキーセット操作（`slice`、`except`、`merge`、`size`など）はオープンな形状に対して依然として辞退します。
  - 現在Rigorがソースから推論する形状にオープンなものは存在しないため、10のプロジェクトにおける139,035件の診断全体でバイト単位で同一であることが検証され、`rigor check`の実行には影響しません。この修正は、`rigor-dry-schema`における型付けされた`Schema.call(input).to_h`の戻り値のように、部分的に既知の形状を合成するプラグインのブロックを解除します（[#137](https://github.com/rigortype/rigor/issues/137)）。
- **[inference]**インストールされている`rbs`が4.1より前の場合でも、[ruby/rbs#2960](https://github.com/ruby/rbs/pull/2960)で上流に追加されたリゾルバ配列のオーバーロードをコアオーバーレイがバックポートするため、`Resolv.new([Resolv::Hosts.new, ...])`が誤って`call.argument-type-mismatch`を発火させることがなくなりました（[#230](https://github.com/rigortype/rigor/pull/230)）。
- **[cache]** GitチェックアウトからRigorを実行する場合に、解析結果を保持するすべてのキャッシュのキーにRigor自身のソースの内容が含まれるようになり、アナライザーを編集して再実行したときに以前の回答を再利用するのではなく再計算されるようになりました（[#285](https://github.com/rigortype/rigor/issues/285)、[#289](https://github.com/rigortype/rigor/issues/289)、[#288](https://github.com/rigortype/rigor/pull/288)、[#291](https://github.com/rigortype/rigor/pull/291)）。
  - これは`rigor check`の実行キャッシュ、`rigor check --incremental`のスナップショット、および`rigor coverage --protection --mutation`のファイル単位のキャッシュをカバーします。パッチ適用中の作業コピーや、ブランチを追跡する`gem "rigor", github:`が対象です;リリースされたgemはバージョンによってコードが一意に特定されるため影響を受けません。
- **[sig-gen]** `rigor sig-gen`が、`Point = Data.define(:x, :y)`および`class Point < Data.define(:x, :y)`の両方の形式で、`Data.define(...)` / `Struct.new(...)`によって構築されたクラスを読み取るようになりました（[#227](https://github.com/rigortype/rigor/issues/227)、[#232](https://github.com/rigortype/rigor/pull/232)）。
  - 以前はメンバー、コンストラクタ、および`::Data` / `::Struct`の祖先関係がすべて欠落しており、`do ... end`ブロックのメソッドが囲んでいる名前空間に対して報告され、それが`module`であっても`class`として出力されていました。
  - 生成された宣言には、メンバーリーダー（ミュータブルなStructの場合はライターも）、クラスが実際に受け入れるコンストラクタ形式に一致する`.new` / `.[]`シグネチャ、および正しいスーパークラスが含まれます。`--params=observed`下では、メンバー型は観測スキャンが確認した`.new`呼び出しサイトから取得されます。
- **[sig-gen]** `rigor sig-gen --write`が、スタックトレースでクラッシュする代わりに、有効なUTF-8ではないシグネチャファイルの更新を名前を明記して非ゼロの終了コードで拒否するようになりました（[#231](https://github.com/rigortype/rigor/pull/231)）。
- **[docs]**ドキュメントサイトへの`README.md`の9つのリンクに古い`/reference/`パスセグメントが含まれており404になっていましたが、正常に解決されるようになりました（[#223](https://github.com/rigortype/rigor/pull/223)、@f440さん、ありがとうございます！）。

## [0.3.1] - 2026-07-29

v0.3.1は`rbs` 4.1.0に追従します。このアップグレードは通常の使用では目に見えませんが、4.1のコアシグネチャの書き換えによって2つの引数チェックが無効化される恐れがあり、また新しいオブジェクト内ハッシュキャッシュによってウォームキャッシュ上で全コアクラスが未定義として読み取られる恐れがありました——そのため本リリースの大部分は、これらに対して解析の誠実さを維持することに費やされています。言語サーバーもインクリメンタルなドキュメント同期へと移行し、プラグインは自身のキャッシュスライスを制限するための`generation_cap:`を獲得し、ブラウザプレイグラウンドは初回ロード時に推論された型を表示するようになりました。

### 追加

- **[lsp]**言語サーバーが、キーストロークごとにファイル全体を受信して再構築する代わりに、すでに保持しているバッファにエディタの各編集を適用するようになりました（[#221](https://github.com/rigortype/rigor/pull/221)、[#144](https://github.com/rigortype/rigor/issues/144)）。
  - UTF-16オフセットが正しく処理されるため、絵文字やその他の非BMP文字を含むファイルも同期が維持されます。
- **[rigor skill describe]** `rigor skill describe --deep`（および`rigor describe --deep`）が最初に`rigor check`を実行するようになり、推奨される次のステップが解析が実際に見つけた内容に基づいてルーティングされるようになりました（[#218](https://github.com/rigortype/rigor/pull/218)、[#148](https://github.com/rigortype/rigor/issues/148)）。
  - 壊れたセットアップは`rigor-doctor`へ、プロジェクトのモンキーパッチは`rigor-monkeypatch-resolve`へ、残りのエラーは`rigor-baseline-reduce`へとルーティングされます。フラグなしのコマンドは、解析を実行しない高速な存在確認のみのプローブのままです。
- **[rigor-actioncable]**チャンネルの`#receive(data)`が`data`を`Dynamic[Top]`ではなく`Hash`として型付けするようになり、メソッド本体内での誤用が捕捉されるようになりました（[#220](https://github.com/rigortype/rigor/pull/220)、[#139](https://github.com/rigortype/rigor/issues/139)）。
  - 契約は`app/channels`を仮定するのではなく、プラグインの`channel_search_paths`設定に従います。

### 変更

- **[dependencies]** Rigorは`rbs` 4.1.0に対して開発およびテストを行うようになり、サポート範囲は`>= 3.0, < 5.0`のまま変更ありません（[#225](https://github.com/rigortype/rigor/pull/225)）。
  - 4.1ではいくつかのコアジェネリクスの型パラメータ名が変更されました: `Array[Elem]`は`Array[E]`になり、`Enumerator[Elem, Return]`は`Enumerator[E, R]`になりました。バインディングは位置ベースであるため、古い名前でそれらのいずれかを再オープンするプロジェクトの`.rbs`は引き続き動作します——リネームへの追従は外観上のものです。
- **[playground]**ホスト版およびWASM版の両方で、ブラウザプレイグラウンドが初回ロード時に推論された型を表示するようになりました（[#222](https://github.com/rigortype/rigor/pull/222)）。
  - ツールバーボタンは「Hide types」の状態で開始するため、トグルでオーバーレイをオフに切り替えることも可能です。
- **[plugin API]** `Plugin::Base.producer`が、コンパクションパスを生き残るプロデューサーのキャッシュエントリーの世代数を宣言する`generation_cap:`を受け付けるようになりました（[#215](https://github.com/rigortype/rigor/pull/215)、[#151](https://github.com/rigortype/rigor/issues/151)）。
  - デフォルトは以前の動作（無制限、`cache.max_bytes` LRUパスによってのみ回収）であるため、毎回の実行で以前のエントリーを孤立させるプロジェクト全体のプロデューサーが、自身のキャッシュスライスを制限できるようになりました。
- **[plugin API]** *（破壊的変更、未固定サーフェス）* `Cache::Store#fetch_or_compute`および`#fetch_or_validate`で、`generation_cap:`引数が必須になりました（[#215](https://github.com/rigortype/rigor/pull/215)、[#151](https://github.com/rigortype/rigor/issues/151)）。
  - `Plugin::Base.producer`経由ではなくストアに直接アクセスするプラグインは、これを渡す必要があります; `:unbounded`を渡すと以前の動作を正確に再現します。
  - 意図的にデフォルト値はありません。制限なくサイレントに増大するキャッシュスライスは、この引数によって表現不可能にすることを目的とした障害であり、単一のデフォルト値がプロジェクト全体およびファイル単位のプロデューサーの双方に適することはありません。
- **[rigor check]** `static.value-use.void`ルールが、有効かどうかにかかわらず、ファイルごとに個別のAST走査を要しなくなりました（[#210](https://github.com/rigortype/rigor/pull/210)、[#207](https://github.com/rigortype/rigor/issues/207)）。
  - その値位置スキャンは、他の組み込みルールと共有されるノードごとの走査に乗るようになりました。診断に変更はありません。

### 修正

- **[cache]** `rbs` 4.1がインストールされている場合に、ウォームキャッシュによってすべてのコアクラスが未定義として読み取られることがなくなりました（[#225](https://github.com/rigortype/rigor/pull/225)）。
  - 4.1は各型名のハッシュをオブジェクト内にキャッシュしますが、その値はそれを計算したプロセス内でのみ意味を持つため、後の実行でリロードされたキャッシュ済み環境では`String`、`Array`、その他すべてでミスが発生していました。何かがおかしいという兆候もないまま実際の診断が失われていました;キャッシュされた型名はロード時に再構築されるようになりました。
- **[inference]** `rbs` 4.1下で`[1, 2, 3].fetch("x")`が再び報告されるようになりました。4.1では`Array#fetch`のブロックオーバーロードが境界付きメソッド型パラメータを使用するように書き換えられていました（[#225](https://github.com/rigortype/rigor/pull/225)）。
  - 引数型チェックは`[I < _ToInt, T] (I index) { … }`内の境界を読み取るようになりました。読み取られない型変数はすべての引数を受け入れてしまうため、メソッド全体で`call.argument-type-mismatch`の両方のチャネルが無効化されていました。
- **[inference]** `rbs` 4.1下で`a[1..2]`が依然として`Array[E]?`として型付けされるようになりました。4.1では`Array#[]`のスライシングオーバーロードが`Range`ではなく`range[T]`エイリアスを取るように書き換えられていました（[#225](https://github.com/rigortype/rigor/pull/225)）。
  - オーバーロードの選択でそのエイリアスが解決されるようになり、呼び出しが要素型へと縮退しなくなりました。
- **[cache]** `rigor check`が、最後のフラグメントが退去されたキャッシュシャードディレクトリを恒久的に空ディレクトリとして残す代わりに削除するようになりました（[#219](https://github.com/rigortype/rigor/pull/219)、[#216](https://github.com/rigortype/rigor/issues/216)）。
- **[sig-gen]**既存のシグネチャファイルを更新した際に、新規生成時と同じネストレイアウトに揃うようになりました（[#214](https://github.com/rigortype/rigor/pull/214)、[#153](https://github.com/rigortype/rigor/issues/153)）。
  - クラスはその親のブロック内に配置され、ファイルがすでに持っていたフラットな`class Foo` / `class Foo::Bar`のペアは1つのネストされたツリーに折りたたまれるため、正規の形状を得るために対象の`.rbs`を削除して再生成する必要がなくなりました。

## [0.3.0] - 2026-07-19

本リリースは、大規模なRailsアプリの繰り返し解析およびインクリメンタル解析を数倍高速化する一連のパフォーマンス改善が中心です: エンジン不要のウォームヒット「nullビルド」フロア、`--incremental`向けのセマンティック伝播ゲートとファイルごとのシードバンドル、制限時間付きYJIT、そして広範なアロケーション削減（[ADR-87](../adr/87-null-build-floor/)、[ADR-85](../adr/85-seed-bundles-and-lazy-def-node-handles/)、[ADR-89](../adr/89-semantic-propagation-gates/)）。インラインrbs-inlineアノテーションが`plugins:`エントリーやマジックコメントなしでそのまま（out of the box）動作するようになりました（[ADR-93](../adr/93-default-rbs-inline-ingestion/)）。よりシャープなHash / Struct / `Data` / Kernelの値型付けやオプトインの呼び出しサイトパラメータ推論とともに、5つのPHPStan由来のチェック、`void`の使用、重複ハッシュキーなど、いくつかの新しい診断が導入されました。また、非推奨だった`type_specifier`プラグインフックと動詞形式の`docs` / `skill`サブコマンドが削除されました（いずれも破壊的変更）。

### 追加

- **[rigor check]**新しいオプトインの`parameter_inference: true`設定により、未宣言の`def` / `initialize` / セッターパラメータが解決された呼び出しサイトの引数型のUnionから型付けされ、それが流れ込む値（インスタンス変数、レシーバー、畳み込み）が、`coverage --protection`だけでなく`check`の走査時にも型付けおよび保護されるようになりました（[ADR-67](../adr/67-parameter-type-inference/) WD6、[#202](https://github.com/rigortype/rigor/pull/202)）。
  - これは精度加算のみです: 推論されたパラメータの呼び出しサイトUnionは下限であり、本体内のルールはそれから派生した任意の値に対して辞退するため、推論されたパラメータが新しい診断をトリガーすることはありません。デフォルトはオフであり、`--incremental`と組み合わせることはできません。
- **[rigor check]** RBSが`-> void`と宣言しているメソッドの戻り値を値として使用すること（代入、メソッド呼び出し、引数としての受け渡し）が、新しい`use-of-void-value` bleeding-edge機能の背後で`static.value-use.void`として報告されるようになりました（[#187](https://github.com/rigortype/rigor/pull/187)）。
  - 明示的な`-> void`は、作者が「この戻り値に依存してはならない」と言っていることであり、それが復元される`top`に依存することは表面化させる価値のある誤りです。これはレシーバー自身のクラスで直接解決されたメソッド（継承されたフォールバック経由ではない）でのみ発火し、単独文としての`void`呼び出しや本物の`top`値に対してはサイレントのままです。新しい必須の診断は互換性変更であるため、オプトインになっています。
- **[rigor check]** `static.value-use.void`が推移的なケース——`-> void`の結果を単にそのまま返す未宣言メソッドの値を使用すること（`foo`が`-> void`と宣言されている場合の`def bar; foo; end`、その後の`b = bar`）——も任意のホップ数をまたいで捕捉し、元の`-> void`メソッドを名指しするようになりました（[ADR-100](../adr/100-static-diagnostic-family-and-void-origins/) WD4、[#195](https://github.com/rigortype/rigor/pull/195)）。
  - 明示的な`return`、`rescue`節、自身の宣言された戻り値型など、何か他のものを返すことができるメソッドは、呼び出し側をサイレントに保ちます。
- **[rigor check]**新しい`flow.duplicate-hash-key`ルールにより、リテラルキーを繰り返すHashリテラル（`{ a: 1, b: 2, a: 3 }`）がフラグ付けされるようになりました。Rubyは実行時に最後のエントリーをサイレントに保持し、`-w`下でのみ警告します（[#101](https://github.com/rigortype/rigor/pull/101)）。
  - このチェックは動作するコードに対して発火しないよう意図的にリテラル限定となっています: シンボル、プレーンな非展開文字列、整数、浮動小数点数、および`true` / `false` / `nil`が対象となります;展開文字列、定数、計算されたキー、および`**splat`キーは決して比較されません。シンボルと文字列（`:a`と`"a"`）や整数と浮動小数点数（`1`と`1.0`）は別個のキーであり衝突しません。重大度は`balanced`下で`warning`です（`lenient`では`info`、`strict`では`error`）; `# rigor:disable duplicate-hash-key`で抑制できます。
- **[rigor check]**新しい`flow.return-in-ensure`診断により、`ensure`節の内側に字句的に存在する明示的な`return`がフラグ付けされるようになりました。これはメソッドの実行中の戻り値を上書きし、発生した例外をサイレントに握り潰します（[#101](https://github.com/rigortype/rigor/pull/101)）。
  - このチェックは純粋に構文的でありフレームを意識します: `ensure`本体内のネストされた`def`、ラムダ、または`define_method`ブロック内の`return`は発火せず、プレーンなブロック内の`return`は発火します。重大度は`balanced`下で`warning`です（`lenient`では`info`、`strict`では`error`）。意図的な使用は`# rigor:disable flow.return-in-ensure`で抑制してください。
- **[rigor check]**新しい`flow.shadowed-rescue-clause`診断により、同一チェーン内の前の節がすでに名指しされたすべての例外クラスのスーパークラスを捕捉しているため、決して実行されない`rescue`節（`rescue StandardError => e`に続く`rescue ArgumentError`）がフラグ付けされるようになりました（[#101](https://github.com/rigortype/rigor/pull/101)）。
  - このルールは既知の祖先を持つ具体的なクラスに解決される例外参照のみを比較します;動的式、splat、未解決の定数、およびモジュールタグはサイレントに保ち、狭いものから広いものへのrescueは決して発火しません。重大度: `balanced`で`warning`、`lenient`で`info`、`strict`で`error`; `# rigor:disable shadowed-rescue-clause`で抑制できます。
- **[rigor check]**新しい`call.raise-non-exception`ルールにより、最初の引数が明らかに発生させられない（Exceptionクラスやインスタンスではなく、Stringでもなく、そのクラスが`#exception`を定義していない）`raise x` / `fail x`がフラグ付けされるようになり、`raise 42`、`raise :symbol`、または`raise nil`が実行時の`TypeError`ではなくチェック時に表面化するようになりました（[#101](https://github.com/rigortype/rigor/pull/101)）。
  - 対象範囲は意図的に保守的です: `Dynamic` / 未解決の型に対しては決して発火せず、Unionはすべての分岐が個別に不正である場合にのみ発火し、`#exception`ダックプロトコルは尊重され、明示的レシーバーの`obj.raise(...)`は無視され、`raise` / `fail`を再定義しているプロジェクトではルールが無効化されます。重大度: `balanced` / `strict`で`:error`、`lenient`で`:warning`。
- **[rigor check]**壊れた抑制コメントがサイレントに無視される代わりにフラグ付けされるようになりました: 実在しないルールを名指す`# rigor:disable`には`suppression.unknown-rule`、マーカーがルールをリストしていない場合には`suppression.empty`、そしてマーカーの単語自体がRigorの文法外である場合（RuboCopの反射である`# rigor:disable-next-line`や`# rigor:enable`）には`suppression.unknown-marker`が発火します（[#101](https://github.com/rigortype/rigor/pull/101)）。
  - 何も行われないタイポのある抑制は最悪のベースライン障害モードです。作者が診断は処理されたと思い込んでしまうためです。3つともすべてのプロファイルで`:warning`であり、問題のあるトークンをそのまま表示し、それ自体も抑制可能です。`plugin.`プレフィックスのトークンや既知の非カタログエンジンID（`rbs_extended.*`、`dynamic.*`など）は決してフラグ付けされません。
- **[rigor check]** `.rigor.yml`内のRigorが認識しないトップレベルキーが、サイレントに無視される代わりに報告されるようになり、最も近い実際のキーが提案されるようになりました（[#171](https://github.com/rigortype/rigor/pull/171)、[#166](https://github.com/rigortype/rigor/issues/166)に感謝します！）。
  - 以前はタイポした`exclude:`が静かに読み込まれ、スキップするつもりだったまさにそのファイルからエラーが報告されていました。これは警告でありエラーではなく、`--format=json`では`config_warnings`下の`"kind": "unknown_key"`として現れます。トップレベルキーのみが対象です——グループ内のタイポ（`cache: { pth: … }`）は入力時に[JSONスキーマ](https://github.com/rigortype/rigor/blob/master/schemas/rigor-config.schema.json)によって捕捉されます。
- **[type inference]**完全にアンカーされた数字/16進数/8進数/文字パターンに対する成功した`String#match?`または`=~`が文字列自体をリファインするようになり、後続の`Integer(s)`または`s.to_i(16)`が安全であると認識されるようになりました（[#185](https://github.com/rigortype/rigor/pull/185)）。
  - `if s.match?(/\A\d+\z/)`は分岐内で`s`を10進整数文字列として型付けします（`\h`/`[0-9a-fA-F]`、`[0-7]`、`[a-z]`、`[A-Z]`、`[[:digit:]]`も一致するリファインメントにマップされます）。パターンは`\A…\z`でアンカーされている必要があります: アンカーされていない`/\d+/`、改行を許容する`\Z`、行アンカー`^`/`$`、または片側のみのアンカーは文字列全体を制約しないため、何もナローイングしません。
- **[type inference]**オーバーライドシグネチャチェック（`def.override-return-widened`、`def.override-param-narrowed`）が、ジェネリックな親の契約をサブクラスがインスタンス化する型で比較するようになりました: `class Sub < Parent[Integer]`の場合、継承された`-> T`はそのままパスされるのではなく`-> Integer`としてチェックされます（[#184](https://github.com/rigortype/rigor/pull/184)）。
  - 型パラメータをオープンなままにするサブクラスは依然として何も報告しないため、正しいオーバーライドが新たにフラグ付けされることはありません。
- **[type inference]** `Struct`および`Data.define`値オブジェクトが、セッター経由およびブロック定義クラス経由で、さらに2つのケースで精密なメンバー型を推論するようになりました（[#182](https://github.com/rigortype/rigor/pull/182)）。
  - 一直線（straight-line）の`s.x = 5`の後で`s.x`を読み取ると、代入された値が推論されるようになりました（兄弟の`s.y`は自身の値を保持します）——以前はいずれかのメンバーに書き込んだ瞬間に構造体全体が型なしになっていました。構造体がエイリアスされたり、別のメソッドに渡されたり、ループやブロック内でミューテートされたりした場合、読み取りは以前とまったく同様に型なしのままにされるため、見えない後からの書き込みによって以前の読み取りが誤りになることはありません。
  - プレーンなローカル変数に代入された`Data.define(:x) do … end`もメンバーの読み取りを畳み込むようになり、定数形式と一致するようになりました——ただし、ブロックがメンバーのリーダーを再定義している場合（`def x`）は、メンバーを返すのではなく独自のメソッドを実行するため、読み取りは型なしのままになります。
- **[type inference]**文字列リテラルの配列に対する`Array#join`が結果の正確な文字列を推論するようになりました: `["a", "b"].join("-")`は一般的な`String`ではなく`"a-b"`として型付けされ、`[1, 2, 3].join`にすでに与えられていた精度と一致します（[#180](https://github.com/rigortype/rigor/pull/180)）。
- **[engine]** Integer、Float、`true` / `false` / `nil`キーを持つHashリテラルが、`Hash[K, V]`のUnionへと縮退する代わりに値にピン留めされた`HashShape`として型付けされるようになり、重複するリテラルキーがランタイムとまったく同様に「最後勝ち（last-wins）」で解決されるようになりました（[#102](https://github.com/rigortype/rigor/pull/102)）。
  - `{ 1 => 1, 1 => 2, 1.0 => 3, 1.00 => 4 }`は`{ 1 => 2, 1.0 => 4 }`として型付けされ（以前は`Hash[1 | 1.0, 1 | 2 | 3 | 4]`であり上書きされた値がUnionを汚染していました）、`{ a: 1, a: 2 }`は`{ a: 2 }`になります。キーの同一性はRubyの`Hash#eql?`セマンティクスに従います: `1`と`1.0`は別個のキーですが、`1.0`と`1.00`は衝突します。既存のすべての`HashShape`射影（`[]`、`fetch`、`dig`、`key?`、`keys`、`values`、`slice`など）は新しいキーの種類に対しても畳み込まれます; RBS消去は保守的なままです（非Symbolキーを持つ形状は`Hash[K, V]`へと縮退します）。計算されたキー、展開されたキー、`**splat`キーは現在の汎用Hashの挙動を維持します。精度加算のみであり、新しい診断はありません。
- **[engine]** `Kernel#p` / `Kernel#pp`が実際のランタイム契約によって型付けされるようになり（引数を返す）、デバッグ出力をラップしても推論された型が破壊されなくなりました（[#102](https://github.com/rigortype/rigor/pull/102)）。
  - 1つの引数は精度を保持する恒等（identity）として通過し（`p(h)`は`h`の正確な型を保持し、`Dynamic`引数は`Dynamic`のまま）、複数の引数はその型のタプルとして返され（`p 1, 2` → `[1, 2]`）、0引数形式は正確な`nil`を保持します。Kernel自体に帰属できない箇所では畳み込みは辞退されます: 明示的な非Kernelレシーバー、検出されたユーザーによる`p` / `pp`の再定義、またはsplat/転送された引数リストなど。
- **[engine]**入力が値にピン留めされている場合に、より多くのKernel変換関数が定数畳み込みを行うようになりました: 定数テンプレートと定数引数を伴う`format` / `sprintf`は正確な文字列へ畳み込まれ、`String()`はスカラーリテラルを畳み込み（`String(42)` → `"42"`）、`Hash()`は自明に健全な形状をカバーします（`Hash(nil)` / `Hash([])` → `{}`）（[#102](https://github.com/rigortype/rigor/pull/102)）。
- **[sig-gen]** `rigor sig-gen`が出力前にレンダリングするすべてのシグネチャをパースするようになり、`rbs`自身が拒否するRBSを書き出すことがなくなりました（[#97](https://github.com/rigortype/rigor/pull/97)）。
  - レンダリングされた行がパースできないメソッドはスキップされ（`sig.skipped.unrenderable-rbs`）、stderrで報告され、残りのシグネチャは有効なまま残ります; `--write`下では、組み立てられた内容がパースできないファイルは拒否され（既存のファイルはそのまま残されます）、コマンドは終了コード`1`で終了します。このようなスキップはRigorのレンダリングの不具合であり、コードの性質ではないことがレポートで示されます。
- **[engine]** `signature_paths:`下にあるパースできない`.rbs`が`rbs.coverage.quarantined-signature`警告として報告されるようになり、壊れたシグネチャファイルがstderrの1行だけでなく、診断が表示されるすべての場所（`--format json`、SARIF、GitHub / GitLabアノテーション、LSP）で可視化されるようになりました（[#96](https://github.com/rigortype/rigor/pull/96)）。
  - このようなファイルは隔離（スキップ）されるためRBS環境の残りは依然としてロードされますが、宣言されていた型は存在しないため、実行はよりクリーンではなくより静かになり、CIではクリーンとして読み取られてしまいます。診断にはスキップされたファイルと修正方法（`rbs validate`）が記載され、`rigor doctor`はこの状態を劣化したRBS環境として報告するようになりました。
- **[cli]** bleeding-edgeオーバーレイが最初の機能である`reject-unparseable-signatures`を出荷しました。これは`rbs.coverage.quarantined-signature`を`:error`へと昇格させ、壊れたソースファイルが失敗するのと同様に壊れたシグネチャファイルでも実行が失敗するようにします（[ADR-50](../adr/50-release-engineering-and-stability-strategy/) WD2/WD3、[#96](https://github.com/rigortype/rigor/pull/96)）。
  - `.rigor.yml`で`bleeding_edge: true`（または`bleeding_edge: [reject-unparseable-signatures]`）を指定するか、1回の実行で`rigor check --bleeding-edge`を指定してオプトインします; `rigor show-bleedingedge`でプロジェクトが採用しているものが出力されます。以前はRigorが受け入れていた入力を拒否することは新しい規律であり、`rbs` gemのアップグレード単体でもトリガーされる可能性があるため、デフォルトではオフになっています。これは将来のメジャーバージョンでのデフォルトとなる予定です。
- **[rigor check]** `signature_paths:`のRBSがRigorのバンドルされたRBSと競合してRBS環境全体が崩壊した場合に、競合しているファイル名を明記した診断として報告されるようになり、不審なほど空で返ってきた実行がクリーンなものと誤認されることがなくなりました（[#183](https://github.com/rigortype/rigor/pull/183)）。
  - これは`--format=json`、SARIF、およびCIに届きます。デフォルトでは警告です（競合は通常Rigor自身のシグネチャに対するものであるため、Rigorのアップグレードによってグリーンなビルドがレッドになってはなりません）; `reject-unparseable-signatures`にオプトインするとエラーに昇格します。
- **[rigor check]** `rbs-inline`ライブラリのないスタンドアロンの`gem install rigortype`で、プロジェクトに読み取ることができないrbs-inlineアノテーションコメントが含まれている場合に、`rbs.coverage.inline-annotations-unsynthesized`（`:info`）が報告されるようになり、アノテーション付きのプロジェクトがサイレントに型なしのままクリーンな実行と誤認されることがなくなりました（[ADR-93](../adr/93-default-rbs-inline-ingestion/) WD3、[#192](https://github.com/rigortype/rigor/pull/192)）。
  - 修正方法（`rbs-inline` gemをインストールする; Rigorはコアをゼロ依存に保ちそれを同梱しません）が示され、実際のアノテーションがないプロジェクト（`#:nodoc:`のようなRDocディレクティブは決してトリガーしません）やライブラリが存在する場合にはサイレントのままです。
- **[plugins]** `rigor plugins`が、ロードされた各プラグインがロード元の解決されたファイルを出力するようになり（テキストレポートでは`path:`行、`--format=json`では`"path"`キー）、プラグインがロードされたものの設定に失敗した場合に`plugin_loader.load-error`診断がそれを明記するようになりました（[#197](https://github.com/rigortype/rigor/pull/197)）。
  - インストール済みの古い`rigortype` gemが、新しいチェックアウトのバンドルされたプラグインのコピーをサイレントにシャドウイングしている状態が、二分探索で突き止める必要なく一目でわかるようになりました。
- **[cli]**ロードされたプラグインが共有の`Plugin::Inflector`に依存している場合に、`rigor plugins`がインフレクション（活用形変換）の利用可能性を調べるようになりました: `ActiveSupport::Inflector`がRigorの環境からもプロジェクトのバンドルからもロードできない場合、レポートはどのプラグインが無条件の`[OK]`ではなくインフレクション依存の診断をサイレントに生成しなくなるかを警告し、修正方法を提示します（[ADR-90](../adr/90-target-library-resolution-from-project-bundle/)、[#109](https://github.com/rigortype/rigor/pull/109)）。
  - `--format json`は構造化された`inflection: {required_by:, available:}`フィールドを持ちます。インフレクションを利用するプラグインを持たないプロジェクトではこのプローブは実行されません。
- **[cli]** `rigor doctor`が、エンジンとは異なる`rigortype`インストールからロードされたバンドルプラグインをフラグ付けするようになり、ロード元のファイルとエンジン自身の場所の両方を名指しすることで、[#194](https://github.com/rigortype/rigor/issues/194)の原因となったエンジン↔プラグインのバージョン不一致のままサイレントに実行されるのを捕捉するようになりました（[#200](https://github.com/rigortype/rigor/pull/200)）。
  - Rigor自身がバンドルしているプラグインのみがチェックされ（自身のバンドルからのサードパーティプラグインがフラグ付けされることはありません）、これは警告であるため終了コードは変更されません。バンドルプラグインはエンジン自身のコピーからロードされるようになったため、これはトリミングされたインストールのフォールバックパスや真に混在したインストールを通じてのみ発火します。
- **[cli]** `rigor doctor`が、Rigor自体がプロジェクトの依存関係の1つとして解決されている状態を報告するようになり、その状態を修正方法およびピン留めの代替案とともに明記するようになりました（[ADR-27](../adr/27-tool-distribution-model/)、[ADR-77](../adr/77-doctor-and-upgrade-commands/) WD1、[#116](https://github.com/rigortype/rigor/pull/116)）。
  - `GEM`リモートから解決された`rigortype`のみが対象となります——`PATH`または`GIT`ソースは、Rigorが意図的に開発またはベンダー化されていることを意味します（Rigor自身のリポジトリは`PATH`下で`rigortype`を解決します）。このチェックはRailsプラグインチェックがすでにそうしているように`Gemfile.lock`を読みます: 新しい解析も新しいルールもありません。
- **[config]**新しい`cache.validation`設定（`stat`（デフォルト）または`digest`）により、`rigor check`がキャッシュされたファイル依存関係を再検証する方法を選択できるようになりました（[ADR-87](../adr/87-null-build-floor/)、[#85](https://github.com/rigortype/rigor/pull/85)）。
  - `stat`はstatの後にダイジェストを行う階層（まずstatし、ファイルの`(size, mtime, ctime, inode)`が移動した場合にのみ再ハッシュする）を使用します; `digest`は毎回の実行ですべての記録されたファイルをSHA-256ハッシュする動作を復元します。`RIGOR_STRICT_VALIDATION=1`は単一の実行で`digest`を強制します。
- **[packaging]** gemが独自の「Gemfileに入れないこと」ガードレールを搭載するようになり、`https://rubygems.org/gems/rigortype`を渡されたコーディングエージェントが、破壊的な回避策ではなく`bundle add rigortype`から適切に誘導されるようになりました（[ADR-27](../adr/27-tool-distribution-model/)、[#114](https://github.com/rigortype/rigor/pull/114)）。
  - 読者に届くタイミングに応じて、3つのサーフェスがルーティングを担います: `description`（rubygems.orgページ）、`post_install_message`（`bundle add`成功後; ADR-27 WD6に従い`gem install`はサポートされたチャネルであるため条件付きで表現）、および起動時の`LoadError`を原因、インストール手順、`require: false`を明記した警告に変える`lib/rigortype.rb` shim。shimは何も定義しません——Gemfileへのインストールに対して自己説明させることが目的であり、動作させることが目的ではありません。
- **[docs]**インストール章に**Rigorを最新に保つ**セクションが追加され、バージョンの共有についての記述が修正されました（[#115](https://github.com/rigortype/rigor/pull/115)）。
  - `mise use gem:rigortype`は`"latest"`を記録し、各マシンが個別に再解決するため、コミットしてもバージョンは共有されません;ピン留めするためのコマンドは`mise use --pin gem:rigortype`です。ピン留めされたツールには受動的な「遅れています」というシグナルがないため、`mise upgrade --bump`が確認と更新の両方の手段となります。また、Ruby変更後の再インストール（`mise install -f "gem:*"`）も文書化されました。
- **[docs]**インストール章で、バージョンマネージャーがプレーンな`gem install`より優先される理由が説明されるようになり、新しい**Bundlerにバージョンを管理させたい場合**セクションで、アプリケーションの`Gemfile`（禁止）と分離された`BUNDLE_GEMFILE`パターン（サポート）の境界線が示されるようになりました（[#115](https://github.com/rigortype/rigor/pull/115)）。

### 変更

- **[rigor check]**インラインrbs-inlineアノテーション（`#: (Integer) -> void`、`# @rbs return: T`、属性`#:`など）がそのまま（out of the box）動作するようになりました: `rbs-inline`ライブラリがインストールされている場合、Rigorは`plugins:`エントリーや`# rbs_inline: enabled`マジックコメントなしで、バンドルされた`rigor-rbs-inline`プラグインを自動的にロードします（[ADR-93](../adr/93-default-rbs-inline-ingestion/)、[#192](https://github.com/rigortype/rigor/pull/192)）。
  - ファイルごとの`# rbs_inline: disabled`ディレクティブのみがファイルをオプトアウトさせます。アノテーションのないプロジェクトは影響を受けません（mail / kramdown / haml / liquidでバイト単位で同一であることが検証済み）。自動連携をオフにするには、プラグインを`plugins:`に`enabled: false`（新しいエントリーごとのキー）で追加します;古いマジックコメントゲートを復元するには`config: { require_magic_comment: true }`を指定します。
- **[engine]** RBSの`void`が`untyped`ではなく`top`に変換されるようになり、Rigorが読み取るツールチェーンよりも緩くなることがなくなりました（[ADR-92](../adr/92-normative-status-fidelity/) WD2、[#112](https://github.com/rigortype/rigor/pull/112)）。
  - RBSは両者を同じtop型として定義し、`void`は値を使用すべきではないというヒントのみを持ちます;これを`untyped`にマップすると、呼び出し側がアノテーションが禁止する依存関係をサイレントに構築できてしまいますが、`top`は証明を要求します。実際のコードに対する診断は変更ありません（mail / kramdown / haml / liquid / mastodon `app/models`でバイト単位で同一）——`top`を機能させる`static.*`ファミリーはまだ実装されていないため、今正しい表現を獲得し、そのファミリーが導入されたときに診断が得られるようになります。
- **[engine]**すべてのKernelモジュール関数畳み込みがディスパッチャーが保持する単一の所有権ゲートの背後で実行されるようになり、ユーザー定義の変換名メソッドのハイジャックが排除されました（[ADR-91](../adr/91-kernel-intrinsic-fold-ownership-gate/)、[#111](https://github.com/rigortype/rigor/pull/111)）。
  - 「この呼び出しは本当にKernelのものか？」というチェックは畳み込みごと・オプトインであったため、`Array()` / `Integer()` / `Float()`変換畳み込みにはまったくガードがありませんでした——独自の`Integer`メソッドを定義しているユーザークラスで、`conv.Integer("42")`がサイレントに`42`に畳み込まれていました。ゲートはディスパッチャー内に一度だけ存在するようになりました（コンパイルされた組み込みテーブル内の名前、暗黙のレシーバーまたは`Kernel`自身、スコープ内にユーザーによる再定義がないこと）。実際のコードに対する診断は変更ありません（4コーパスゲートでバイト単位で同一）。
- **[inference]**コンストラクタ内で多重代入によってのみ代入されたインスタンス変数（`def initialize; @m, @n = [], []; end`）が、別のメソッドから読み取られた際に、実際の`call.undefined-method`をマスクしていた不要な`nil`で拡大されることなく、推論された型を保持するようになりました（[ADR-58](../adr/58-ivar-field-typing/)、[#201](https://github.com/rigortype/rigor/pull/201)）。
- **[cache]** `cache.validation`に新しいデフォルトである`auto`モードが追加されました。これはCI環境が検出された場合にファイル内容をハッシュし（新しいチェックアウトでは、より高速なstatチェックが依存するタイムスタンプとinodeが再生成されるため）、それ以外のすべての場所でstatチェックを維持します（[#191](https://github.com/rigortype/rigor/pull/191)）。
  - ワークスペースを再利用するCIランナーでは、明示的に`cache.validation: stat`を設定してください。
- **[cli]** `rigor doctor`が、警告のみが見つかった実行において「0 issue(s) found」を見出しにしなくなりました;サマリーは警告もカウントします。
- **[skills]**バンドルされたオンボーディングスキル（`rigor-project-init`、`rigor-next-steps`、`rigor-editor-setup`）が、実際のRailsアプリに対する自律的な実行から、非対話型 / エージェント駆動の実行向けのガイダンスといくつかの正確性の修正を獲得しました（[#108](https://github.com/rigortype/rigor/pull/108)）。
- **[perf]** `rigor check`および`rigor coverage`が、実行が短い償却期限を超えた場合にYJITを有効化するようになり、迅速な実行にペナルティを与えることなく大規模プロジェクトでの壁時計時間を短縮しました（[#75](https://github.com/rigortype/rigor/pull/75)）。
  - 事前にYJITを有効化することは短い実行では正味の損失となるため（約4秒の実行で約20%低下）、Rigorは5秒後にのみ有効化するバックグラウンドスレッドをセットアップします。Mastodonの`app`+`lib`でのコールド計測: 25.4秒 → 15.1秒（1.7倍）となり、常時オンのYJITと同等になりました;短時間の実行ケースは同等を維持します。`rigor lsp` / `rigor mcp`サーバーは起動時にYJITを有効化します。オプトアウトするには`RIGOR_DISABLE_YJIT=1`を設定し、調整するには`RIGOR_YJIT_DEADLINE=<seconds>`を設定します。
- **[perf]**並列の`rigor check` / `coverage`実行（`--workers=N`）が、コーディネーターだけでなくフォークワーカー内でもYJITを有効化するようになり、期限前にフォークされたワーカーが解析スライス全体をJITなしで実行することがなくなりました（[#99](https://github.com/rigortype/rigor/pull/99)）。
  - `fork`は呼び出し元のスレッドのみをコピーするため、親プロセスの期限スレッドはワーカーに届きませんでした。各ワーカーは同じ償却契約の下で独自の遅延YJITを再セットアップするようになりました。診断はバイト単位で同一を保ちます（プール対逐次実行で検証済み）; `RIGOR_DISABLE_YJIT=1`は引き続きすべての場所で無効化します。
- **[perf]**ウォームな`rigor check`のHIT——一般的な「何も変わっていない、クリーンなままであることを教えてくれ」という実行——が劇的に高速化されました: 推論エンジン、そのプラグインgem、またはRBS環境をロードすることなくキャッシュされた診断を提供し、キャッシュされたファイル依存関係を再読み込みおよび再ハッシュする代わりにstatによって検証します（[ADR-87](../adr/87-null-build-floor/)、[#85](https://github.com/rigortype/rigor/pull/85)）。
  - 2つのフロアが排除されました: ウォームヒットはキャッシュされたすべての依存関係を再SHA-256ハッシュしなくなり（GitLabの`app/models`で約5.2万ファイルにわたる約115 MB）、アナライザーをまったく起動しなくなりました。アウトオブプロセスでの計測: GitLabの`app/models`のウォームヒットで**1.41秒 → 0.34秒**、mail / rigorの`lib`で**約0.36秒 → 約0.22秒**、ウォームな`--incremental`の変更なしで**1.85秒 → 1.44秒**。診断はバイト単位で同一です; `cache.validation: digest`は全ファイルをダイジェストする挙動を復元します。
- **[perf]** `rigor check --incremental`下でのコメントのみの編集が、祖先全体 / ファイルレベルの依存セット全体ではなく、編集されたファイルのみを再チェックするようになりました（[#88](https://github.com/rigortype/rigor/pull/88)）。
  - 変更されたファイルのコード（コメント除去後）がスナップショットとバイト単位で同一である場合、その依存先が消費するすべてのクロスファイルの事実は変更されないため、キャッシュから提供されます。GitLab（1,774ファイル）での計測: 以前は19 / 66 / **341**ファイルを再解析していたその場でのコメント編集が**1**ファイルの再解析になり、基底クラスのコメント再チェックが約12.3秒から約7.9秒に短縮されました。コメントを取り込むプラグイン（`rigor-rbs-inline`）が設定されている場合、ゲートは自動的に無効化され、偽装編集健全性テストスイートによって安全性が担保されます。
- **[perf]** `rigor check --incremental`の再チェックが、編集によって依存先が消費できるものが実際に変更された場合にのみ依存先を再解析するようになり、コメントのみのゲートが本体の編集へと拡張されました（[ADR-89](../adr/89-semantic-propagation-gates/)、[#90](https://github.com/rigortype/rigor/pull/90)）。
  - シグネチャを保持する本体の編集（ローカルのリネーム、内部リテラル）は、編集されたクラスの依存先を再チェックしなくなり、対象となるリーフメソッドの戻り値を保持するリファクタリングは呼び出し側を再チェックしなくなりました。GitLabでの計測: 以前は**341**ファイルを再解析していた`ApplicationRecord.safe_find_or_create_by`への戻り値を保持する編集が、現在では**1**ファイルを再解析するだけになりました。シグネチャ / 引数の数（arity） / 可視性 / 祖先関係 / ミューテーション効果の変更、または行の移動は引き続き伝播します。診断はバイト単位で同一です（コールド実行および`--verify-incremental`経由）。
- **[perf]**ウォームな`rigor check --incremental`再チェックが、永続キャッシュからプラグインの`#prepare`プロデューサーを提供するようになり、再計算しなくなったため、プラグインの多い（Rails）プロジェクトでのウォームインクリメンタルのコストが数倍削減されました（[ADR-85](../adr/85-seed-bundles-and-lazy-def-node-handles/) WD1、[#81](https://github.com/rigortype/rigor/pull/81)）。
  - プロセス間のインクリメンタルセッションは各アナライザーをキャッシュストアなしで構築していたため、すべてのプラグインのキャッシュされたプロデューサーが呼び出しごとに再計算されていました。GitLabの`app/models`（10個の自動ロードされたRailsプラグイン）での計測: ウォーム再チェックのアロケーションが16.7Mから2.8M（約6倍減）、プラグインの`#prepare`単体では14.3Mから0.34Mに減少し、バイト単位で同一です。
- **[perf]**ウォームな`rigor check --incremental`再チェックが、クロスファイルディスカバリーインデックスを再構築するためにプロジェクト全体を再パースしなくなりました: スナップショットから各ファイルのキャッシュされたファイルごとのシードバンドルを畳み込み、内容が変更されたファイルのみを再走査します（[ADR-85](../adr/85-seed-bundles-and-lazy-def-node-handles/) WD2/WD3、[#82](https://github.com/rigortype/rigor/pull/82)）。
  - プロジェクト全体のインデックス再構築は、プラグインの少ないプロジェクトにおいてウォームインクリメンタルの80〜92%を占めていました。defノードは`(path, node_id, name, fingerprint)`ハンドルとして保存され、本体は要求された場合にのみ実体化されます（再チェックあたり0〜6ファイル）。ウォームな変更なしでの計測: rigorの`lib`で540k → 149kアロケーション、mailの`lib`で529k → 54k; GitLabの`app/models`ではプロデューサーキャッシュとの組み合わせ効果で16.7M → 2.06M（約8倍減）。診断はバイト単位で同一です;スナップショットスキーマが引き上げられました（1回限りのクリーンなコールド再構築）。
- **[perf]** `rigor check --incremental`の変更検出が、変更されていないファイルをSHA-256ハッシュする代わりにstatするようになり、`(size, mtime, ctime, inode)`のタプルが移動したファイルのみを再ハッシュするようになりました（[ADR-87](../adr/87-null-build-floor/)、[#85](https://github.com/rigortype/rigor/pull/85)）。
  - SHA-256ダイジェストが変更の唯一の権威であり続けます（`touch`は一度再ハッシュして最新のままになります）; `cache.validation: digest` / `RIGOR_STRICT_VALIDATION=1`ですべてのファイルをダイジェストする動作が復元されます。`--verify-incremental`はバイト単位で同一のままです。
- **[perf]** `--incremental`下での`def self.method` / シングルトンメソッドの本体編集が、インスタンスメソッドの編集がすでに持っていたシンボル粒度のスコープを獲得し、再チェッククロージャをそのメソッドの呼び出しサイトに制限するようになりました（[ADR-46](../adr/46-incremental-dependency-graph/)、[#87](https://github.com/rigortype/rigor/pull/87)）。
  - 変更検出フィンガープリントと記録された呼び出しサイトエッジが、クラス / シングルトン / `module_function`メソッド（インスタンスの`Class#method`とは異なる`Class.method`をキーとする）をカバーするようになりました。診断はバイト単位で同一です;スナップショットスキーマが引き上げられました。
- **[perf]** `rigor check --incremental`が、標準の`check`パスがすでに尊重しているワーカー数の設定つまみ（`--workers=N`、`RIGOR_RACTOR_WORKERS`、`.rigor.yml`の`parallel.workers:`）を尊重するようになり、編集後のクロージャ再解析がフォークワーカープール全体で実行されるようになりました（[ADR-46](../adr/46-incremental-dependency-graph/)、[#87](https://github.com/rigortype/rigor/pull/87)）。
  - 各ワーカーはそのスライスのクロスファイルエッジを記録してマーシャリングして戻すため、プールされた再チェックが再構築する依存関係グラフは逐次実行のものと同一です。大規模なクロージャ（数百のファイルに触れる基底クラスの編集）で効果を発揮します;デフォルトは逐次実行（`workers: 0`）のままです。
- **[perf]**変更なしの`rigor check --incremental`再チェックが、ロードされたばかりの内容とバイト等価である場合にディスク上のスナップショットを再書き込みしなくなり、編集ごとの冗長な作業がわずかに削減されました（変更されたセットのパースが2回ではなく1回になりました）（[ADR-87](../adr/87-null-build-floor/) WD3、[#77](https://github.com/rigortype/rigor/pull/77)）。
- **[engine]** [ADR-57](../adr/57-self-call-return-adoption/)のユーザーメソッド戻り値メモが真に実行スコープ（run-scoped）となり、呼び出し先の推論された戻り値が消費者ファイルごとではなく実行ごとに1度計算されるようになりました（[ADR-84](../adr/84-cross-file-return-memo-scoping/)、[#80](https://github.com/rigortype/rigor/pull/80)）。
  - このメモは以前はファイルごとのテーブルIDをキーとしていたため、ヒットがファイルの境界を越えることはありませんでした（mailの`Mail::Part#has_content_type?`は564回再評価されていました）。実行ごとの世代トークンをキーにすることで、mailの`lib`でのコールドな呼び出し先本体の評価が3,355回 → 557回に、Rigor自身の`lib`では9,977回 → 7,339回に削減されました。クロスファイルヒットは呼び出し先の本体走査をスキップするため、依存関係の記録はすべてのヒットとキャッシュおよびリプレイをペアにし、`--incremental`のエッジがメモなしの実行と同一になります（プロパティスペックで固定）。
- **[perf]**バンドルされたプラグインの手作りのAST走査が、ノードごとに使い捨ての子ノード配列をアロケートしなくなりました: 21のプラグイン / サンプルファイルにわたる37箇所の`.each`サイトが`#rigor_each_child`を呼び出すようになりました（[#98](https://github.com/rigortype/rigor/pull/98)）。
  - 単純な反復サイトのみが移行しました;実際の配列を必要とする少数のサイトは`compact_child_nodes`を維持します。診断はバイト単位で同一です（Redmineコーパスおよびすべてのプラグイン統合スペックで検証済み）。
- **[engine]** ASTツリー走査が、訪問したノードごとに使い捨ての配列をアロケートしなくなり、すべての`rigor check`実行で総アロケーションが削減されました——リーフの多いソースで最も顕著です（[#76](https://github.com/rigortype/rigor/pull/76)）。
  - `Prism::Node#compact_child_nodes`は呼び出しごとに新しい`Array`を構築します; Ragelで生成されたパーサ（mailの`lib`）では、それらの配列が全アロケーションの半分以上を占めていました。`Rigor::Source::NodeChildren`をロードすると、各Prismノードクラスに配列なしで同じ子ノードをyieldする`#rigor_each_child`メソッドがコンパイルされ、エンジンの走査処理は`compact_child_nodes.each`の代わりにこれを呼び出します。診断はバイト単位で同一です。
- **[engine]**ウォームキャッシュ実行がプロジェクト全体を再パースしなくなり、コールド実行では各プロジェクトファイルを2回ではなく1回パースするようになりました: クロスファイルディスカバリーの事前パスが先行（eager）パスから遅延され（解析パスでのみ実行）、そのクラスディスカバリーおよびdefノードパスが単一の走査を共有するようになりました（[#77](https://github.com/rigortype/rigor/pull/77)）。
  - 診断はバイト単位で同一です;依存関係記録およびサブセット（`--incremental`）モードは引き続き事前構築を先行して強制します。
- **[engine]**ウォームキャッシュ実行がRBSシグネチャツリー全体をSHA-256ハッシュしなくなりました: 実行診断キャッシュキーは`rbs` gemのバージョンとライブラリリストのみを読み取り、ベンダー化されたシグネチャツリーのダイジェストはキャッシュミス時にのみ計算されます（[#77](https://github.com/rigortype/rigor/pull/77)）。
  - 実行ごとのダイジェストメモ（各絶対パスは実行あたり最大1回ハッシュされる）と組み合わせることで、ウォーム実行におけるファイルシステムのダイジェスト処理が大幅に減少します。メモはプロセスローカルであり実行ごとにリセットされるため、実行が観測する内容には何の変化もありません。
- **[rigor-dry-types]** dry-typesエイリアススキャンが実行をまたいでキャッシュされるようになり、ウォームな`rigor check`がプロジェクト全体を再パースする代わりにファイルのダイジェストを再検証するようになりました（[ADR-60](../adr/60-pre-freeze-plugin-contract-consolidation/) WD3、[#74](https://github.com/rigortype/rigor/pull/74)）。
  - プラグインの`#prepare`は、呼び出しごとに`paths:`下のすべての`.rb`ファイルをPrismでパースしていました（GitLabの`app/models`のウォーム時間の約3分の1）。スキャンは`watch:`グロブを持つキャッシュされたプロデューサーに乗るようになり、それらのパス下のソースファイルが変更された場合にのみ再計算します。`--no-cache`は新規に再計算します。
- **[perf]**オプトインの`parameter_inference:`事前パスがより低コストになりました: ユーザー定義メソッドが宣言していない名前を持つ呼び出しのレシーバーの型付けをスキップするようになり（Railsアプリの呼び出しサイトの約73%）、コールドな`rigor check`における事前パスのコストを削減しつつ、推論されたパラメータテーブルはバイト単位で同一です（[#203](https://github.com/rigortype/rigor/pull/203)）。

### 削除

- **[cli]** **破壊的変更** — 非推奨だった動詞サブコマンド`rigor docs list` / `rigor docs path <name>`および`rigor skill list` / `print <name>` / `path <name>`が削除されました（[#94](https://github.com/rigortype/rigor/pull/94)）。
  - **移行手順:** `rigor docs list` → `rigor docs --list`、`rigor docs path <name>` → `rigor docs --path <name>`、`rigor skill list` → `rigor skill --list`、`rigor skill print <name>` → `rigor skill <name>`、`rigor skill path <name>` → `rigor skill --path <name>`。両コマンドの位置スロットはドキュメント / スキル名であるため、削除された動詞は同名のページをシャドウイングするのではなく、未知の名前として解決されるようになりました（終了コード1）。`rigor skill describe` / `--describe`（および`rigor describe`）は変更ありません。
- **[plugin]** **破壊的変更** — 非推奨だった`type_specifier`プラグインフックが、その名前を持つ内部リーダーおよび機能キーとともに削除されました（[ADR-80](../adr/80-narrowing-facts-rename/)、[#94](https://github.com/rigortype/rigor/pull/94)）。
  - **移行手順:**プラグインクラス本体において、`type_specifier methods: […] do … end` → `narrowing_facts methods: […] do … end`（このエイリアスは`0.2.x`全体で警告されていました;現在ではクラス定義時に`NoMethodError`を発生させます）。クラスレベルのリーダー`type_specifiers`は`narrowing_facts_rules`に、インスタンスメソッド`#type_specifier_facts`は`#narrowing_facts_for`に、`rigor plugins --capabilities`のJSONキー`type_specifier_methods`は`narrowing_facts_methods`になりました。
- **[dev]**開発依存関係の`parallel_tests`が、`make test-parallel`ターゲットおよびそれが駆動していた`rake spec_parallel`タスクとともに削除されました（[#94](https://github.com/rigortype/rigor/pull/94)）。
  - [#27](https://github.com/rigortype/rigor/pull/27)以降、プロジェクトの並列スペックランナーは`binpacker`（`make test-binpacker`、`make verify`およびCIが実行するもの）となっており、2番目のランナーは不要な負荷でした。gemの実行時依存関係に変更はありません。

### 修正

- **[plugins]**バンドルされたプラグインが常にエンジン自身のコピーからロードされるようになり、Gitチェックアウトと並んでインストールされた古い`rigortype` gemが、バージョンの異なるプラグインコピーでエンジンのプラグインコピーをサイレントにシャドウイングして誤った診断を生成することがなくなりました（[ADR-93](../adr/93-default-rbs-inline-ingestion/) WD5、[#198](https://github.com/rigortype/rigor/pull/198)）。
  - Rigorが出荷するプラグイン（自動連携される`rigor-rbs-inline`を含む）を名指す`plugins:`エントリーは、gem名でrequireされていました。Rigorは各バンドルプラグインを、エンジンと共にバージョン管理されるエンジン内のパスによってrequireするようになりました;バンドルされたコピーを出荷しないトリミングされたインストールや単一バイナリのインストールは、以前とまったく同様にgem名解決にフォールバックします。
- **[cli]**型プローブ——`rigor type-of`、`type-scan`、`trace`、`annotate`——が、`rigor check`が解析に使用するのと同じプラグイン認識環境を構築するようになり、インラインrbs-inlineアノテーションから合成された型がプラグインなしの`Dynamic[top]`ではなく報告され、プローブが説明対象のチェックと不一致を起こすことがなくなりました（[#196](https://github.com/rigortype/rigor/pull/196)）。
  - プラグインのないプロジェクトやプラグインのセットアップが壊れているプロジェクトでは、失敗するのではなく以前の動作に縮退します。
- **[cli]** `baseline:`が設定されている場合に実行キャッシュヒットが返されても、`rigor check`が`uninitialized constant Rigor::Analysis::Baseline`でクラッシュしなくなり、ベースラインを連携した後の2回目の通常の`check`——acknowledgeモードのオンボーディングのまさに次のステップ——が完全に失敗することがなくなりました（回避策は`--no-cache`でした）（[#107](https://github.com/rigortype/rigor/pull/107)）。
  - 起動をスリム化したキャッシュヒットの高速パスが、ベースラインフィルタの依存関係を持つ遅延エンジンのrequireバンドルをスキップしていました。ベースラインフィルタはcheckコマンドのロード時依存関係となり（YAMLのみをロードし、エンジンはロードしません）、ヒットパスはエンジン不要のまま維持されます。
- **[cli]** `baseline:`のない設定に対する`rigor baseline generate`のヒントが、常に`.rigor.yml`と表示する代わりに、プロジェクトを実際に制御している設定ファイル（例: `.rigor.dist.yml`）を名指すようになりました（[#107](https://github.com/rigortype/rigor/pull/107)）。
- **[type inference]**パターンが定数（`RE = /.../`または`Regexp.new(...)`）である`str =~ RE`マッチが、リテラルの`str =~ /.../`と同様にマッチ特殊変数をナローイングするようになり、マッチ成功後に`$1`や`$~`などがマッチした型として読み取られるようになりました——「正規表現を定数として一度コンパイルする」イディオムにおける不要なpossible-nil警告が排除されました（[#181](https://github.com/rigortype/rigor/pull/181)）。
- **[type inference]**すべてのグループがオプショナルまたは存在しないマッチ成功時（`"b" =~ /(a)?b/`）に、`$+`（最後にマッチしたグループ）が非nilであると仮定されなくなりました;少なくとも1つのキャプチャグループの参加が保証されている場合にのみ`String`へとナローイングされます（[#181](https://github.com/rigortype/rigor/pull/181)）。
- **[type inference]** RBSが型なしのパラメータリストを宣言しているメソッド——`def call: (?) -> String`——が、サイレントに型なしとして読み取られる代わりに、その戻り値型を提供するようになりました（[#175](https://github.com/rigortype/rigor/pull/175)）。
  - Rigorはこれらのメソッドに対してシグネチャ全体を破棄していましたが、これは独自の`sig/`を持たない標準的なプロジェクトに影響を与えていました: コアRBSは`Proc#call`、`Method#call`、`Ractor.select`、`IO.for_fd`でこの形式を出荷しています。`(?)`は引数の数や引数の型について何も制約しないため、新しい引数の診断が表示されることはありません;そのようなメソッドがオーバーロードセットの1つの分岐である場合、純粋に型付けされた分岐が依然として優先されます。
- **[engine]**配列を空にしても、Rigorが依然として非空であると認識し続けることがなくなりました。これによって正しい空チェックに対して誤った「条件は常に偽（condition is always falsey）」が発生していました（[#179](https://github.com/rigortype/rigor/pull/179)）。
  - `return if arr.empty?`ガードの後、Rigorは`arr`が非空であることを把握しますが、`arr.clear` / `pop` / `shift` / `delete_if`を経てもそれを保持していたため、後続の`arr.size == 0`が不可能であると報告されていました。配列をミューテートすると非空性が取り消されるようになりました。同じ修正がインスタンス変数（`@items.clear`）やブロック内で空にされた配列もカバーします。
- **[engine]**ファイルまたはIOを行ごとに読み取る処理（`each_line`、`File.foreach`など）において、行反復ブロックが非エスケープとして分類されるようになったため、後のチェックで誤った`flow.always-falsey-condition`が発生しなくなりました（[#193](https://github.com/rigortype/rigor/pull/193)）。
- **[rigor annotate]** `rigor annotate`が、複数行リテラルの内側の行に不要なインラインアノテーションを出力しなくなりました（[#103](https://github.com/rigortype/rigor/pull/103)）。
- **[engine]**プロジェクト自身の`sig/`も宣言している定数を宣言するインラインRBSの寄与が、RBS環境全体を崩壊させなくなりました（[ADR-93](../adr/93-default-rbs-inline-ingestion/)、[#113](https://github.com/rigortype/rigor/pull/113)）。
  - `RBS::Environment#add_source`は宣言を挿入する前にソースを追加するため、挿入途中の`DuplicatedDeclarationError`によって汚染されたソースが残されていました——herb（`sig/`とrbs-inlineコメントの両方を出荷）での計測: 1,490クラス → 0、`require`の解決停止、74件の誤った`call.unresolved-toplevel`。スキップはトランザクション化され、明示的な`.rbs`宣言が優先され、ドロップされたファイルは目立つように報告されます。
- **[rigor init]**生成される設定ファイルのエディタスキーマリンクが実在しないURLを指していたため、`rigor init`で開始されたすべてのプロジェクトでスキーマ検証（自動補完、ホバードキュメント、構造チェック）がまったく行われていなかった問題を修正しました（[#170](https://github.com/rigortype/rigor/pull/170)）。
  - 到達できないスキーマはエラーのないスキーマとまったく同じように見えるため、気づかれませんでした。本リリースより前に`rigor init`を実行した場合は、再実行するか`# yaml-language-server: $schema=…`行を[スキーマ](https://github.com/rigortype/rigor/blob/master/schemas/rigor-config.schema.json)に向け直してください。生成されたファイルは、内部の貢献者向けドキュメントではなく[設定マニュアル](../manual/03-configuration/)にリンクするようになりました。
- **[config]** `cache.max_bytes`および`cache.validation`が[JSONスキーマ](https://github.com/rigortype/rigor/blob/master/schemas/rigor-config.schema.json)によって拒否されなくなりました。これにより、エディタにおいてこれらの文書化された有効なキーが無効であると表示されていました（[ADR-99](../adr/99-config-schema-authority/)、[#170](https://github.com/rigortype/rigor/pull/170)）。
  - スキーマはローダーと並んで`.rigor.yml`の公式な信頼できる情報源（source of truth）となり、1つの設定ファイルで両方に対応できるよう、兄弟関係にあるRust実装用に`rigor_rs:`名前空間が予約されました。Rigorはその名前空間を読み取ることはなく、その内容でエラーになることもありません。
- **[plugins]** `rigor-rbs-inline`のマジックコメント不要モードが、すべてのdefに対して`untyped`スケルトンを合成することで、アノテーションのないプロジェクトを劣化させることがなくなりました（[ADR-93](../adr/93-default-rbs-inline-ingestion/) WD1、[#113](https://github.com/rigortype/rigor/pull/113)）。
  - このモードは上流のrbs-inlineのオプトアウトモードに直接マップされていました; Rigorは本体推論よりも受け入れられたシグネチャを信頼するため、それらのスケルトンが実際の推論された型を置き換えていました（mail: 26 → 42診断）。現在では実際にアノテーションを持つファイルに対してのみ寄与し、上流自身の`AnnotationParser`で検出され、RDocディレクティブがフィルタされます。アノテーションのないコーパス（mail / kramdown / haml / liquid）は、このモード下でバイト単位で同一です。
- **[plugins]** `rigor-rbs-inline`が、兄弟の`#:nodoc:`によってクラスのインラインアノテーションを失うことがなくなりました。上流はこれを`-> nodoc`戻り値型として読み取り、`RBS::DefinitionBuilder`がクラス全体に対して`NoTypeFoundError`を発生させていました（[#113](https://github.com/rigortype/rigor/pull/113)）。
  - プラグインは合成前に各RDocディレクティブをスペース付きの表記（上流が無視する`# :nodoc:`）に書き換え、Rubyドキュメントに記載されている17個のディレクティブすべてをカバーします。上流には[soutaro/rbs-inline#248](https://github.com/soutaro/rbs-inline/issues/248)として報告されました。
- **[docs]**プラグインのドキュメントで、出荷されている[プラグインの章](../manual/07-plugins/)を含む5箇所で、不可能な操作である`Gemfile`への`gem "rigor-rails"`の追加を指示しなくなりました（[ADR-96](../adr/96-plugin-target-gems/) WD5、[#118](https://github.com/rigortype/rigor/pull/118)）。
  - `rigor-rails` gemは存在せず、`plugins: [rigor-rails]`はローダーによって拒否されます;メタgemはあるがまま（未接続、サポートされた用途なし）として説明され、削除されるのではなく意図的に保持されています。また、`Plugin::Loader`の実例で使用されていた存在しない`{gem: "rigor-rails", id: "rails"}`も修正されました。
- **[plugin]**スタンドアロンインストール（`gem install rigortype`、アプリとgem環境を共有しない）で、インフレクション（活用形変換）に依存するすべてのRailsチェックがサイレントに失われることがなくなりました（[ADR-90](../adr/90-target-library-resolution-from-project-bundle/)、[#109](https://github.com/rigortype/rigor/pull/109)）。
  - バンドルされたRailsプラグインは実際の`ActiveSupport::Inflector`を通じて活用形変換を行いますが、rigortypeはactivesupportの実行時依存関係を持たないため、`rigor-activerecord` / `rigor-rails-routes` / `rigor-actionpack` / `rigor-actionmailer` / `rigor-factorybot`が診断を生成しない状態に劣化していました。requireに失敗した対象ライブラリは、解析対象プロジェクト自身のbundlerインストールツリーに対して再試行されるようになりました（ロックされたactivesupportの方が忠実度の高い情報源でもあります）;バンドルがインストールされていないプロジェクトは依然としてクリーンに劣化します。
- **[plugin]**対象ライブラリがロードできない場合に、プラグイン分離ワーカーが不透明な`Inflector::Unavailable: process isolation worker failed (EOFError)`で終了しなくなりました（[#109](https://github.com/rigortype/rigor/pull/109)）。
  - `Rigor::Plugin::LoadError`がグローバルの`LoadError`を字句的にシャドウイングしていたため、ワーカーのループの裸の`rescue`が誤ったクラスに一致し、実際の`::LoadError`がフォークされたワーカーを強制終了していました; rescueは`::`修飾されるようになりました。同じシャドウイングのバグが`rigor-rspec-rails`のRackステータステーブルローダーでも修正されました。

[0.3.9]: https://github.com/rigortype/rigor/compare/v0.3.8...v0.3.9
[0.3.8]: https://github.com/rigortype/rigor/compare/v0.3.7...v0.3.8
[0.3.7]: https://github.com/rigortype/rigor/compare/v0.3.6...v0.3.7
[0.3.6]: https://github.com/rigortype/rigor/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/rigortype/rigor/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/rigortype/rigor/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/rigortype/rigor/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/rigortype/rigor/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/rigortype/rigor/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/rigortype/rigor/compare/v0.2.9...v0.3.0
