---
title: "テンプレートエンジン／パーサコーパス調査（一般コードのDynamic落ち + FPハント）"
description: "8つの実在テンプレートエンジン・パーサgemに対する読み取り専用のエンジン挙動調査。新規メカニズム3件と既知バケットの集計。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260613-template-parsing-corpora-survey.md"
sourcePath: "docs/notes/20260613-template-parsing-corpora-survey.md"
sourceSha: "66732617c0eafabc80a13b64226512b271399765369bce59e124d36cdf7bbd7d"
sourceCommit: "636f8725dd79aab2f711249ace6357a98b7e73a4"
translationStatus: "translated"
sidebar:
  order: 20266613
---

2026-06-13。`/Users/megurine/repo/ruby/rigor-survey/`配下の、実在する8つのテンプレートエンジン／パーサgemに対する読み取り専用のエンジン挙動調査。**`lib/`（rigor）への変更はなし**。[CRuby標準ライブラリ](../20260612-cruby-stdlib-survey/)、[アルゴリズムコーパス](../20260612-algorithm-corpora-survey/)、[Railsモノレポ](../20260612-rails-monorepo-survey/)の各調査に続く、キャンペーン第4弾の姉妹編である。これらのライブラリはすべて本番で出荷され、レンダリングのたびに実行されるため、各`error`は本物のバグを捉えていない限り偽陽性（FP）候補となる。ミッションの枠組みに従い、メタプログラミングと重いジェネリクスは免責とする。価値があるのは素の一般コード上の**新規メカニズム**であり、先行3調査のバケットと、`docs/CURRENT_WORK.md`の2026-06-12アーク（ADR-57/58着地、モジュール特異クラス完了、case/else網羅性完了、正規表現グローバル変数＝FP約0の測定アーティファクト、メソッド戻り値の純粋に保守的なnil＝需要ゲート付きWD1b）に対して重複排除済みである。

手法は定番の**「規模を見積もる前に半径をサンプル裁定する」**という教訓に従う。下記の各バケットは、件数からの推測ではなく、発火箇所を読んで（新規メカニズムが疑われる場合は最小再現も作って）確認した。

各リポジトリの実行方法: cwd＝`<repo>`、`BUNDLE_GEMFILE=<rigor>/Gemfile`、フレーク対策ラッパー付きの`bundle exec exe/rigor {coverage|check --no-cache} lib`、デフォルト設定（`.rigor.yml`なし、プラグインなし）。**スケーリングの壁はここでは発生せず**——どのリポジトリも`lib`全体の`check`が2.2秒未満で完了した（これらのライブラリは小さい。Railsモノレポのパフォーマンス所見と対照的）。**除外ファイル: なし**。`parser` gemのraccで生成されるレキサー／文法ファイル（`lexer-*.rb`、`ruby*.rb`）は**このチェックアウトの`lib/`には同梱されていない**（gemビルド時に生成される）。存在する`lib/parser/lexer/*.rb`は手書きのヘルパーであり、通常どおり調査した。

## リポジトリ別テーブル

| repo | files | coverage (precise) | errors | warnings | 最多クラス | 判定 |
| --- | --- | --- | --- | --- | --- | --- |
| liquid | 64 | 0.480 | 10 | 3 | undefined-method（ファイル横断の`rescue Const`） | 新規メカニズム1件＋既知 |
| slim | 27 | 0.538 | 2 | 4 | possible-nil（正規表現ローカルへの`[]`）＋異種ivar | 既知＋本物の捕捉 |
| hamlit | 61 | 0.510 | 12 | 1 | possible-nil（`MatchData`/ivar）＋`html_safe`（ASプラグインなし） | 既知＋免責 |
| erubi | 3 | 0.471 | 3 | 0 | `scan`ブロック内の`last_match`＋実行時`extend` | 既知＋免責 |
| jbuilder | 12 | 0.414 | 1 | 2 | `deep_merge`（ASプラグインなし）＋本物の異種ivar | 免責＋本物の捕捉 |
| parser | 56 | 0.442 | 25 | 4 | possible-nil（`loc(token)`の末尾`if`戻り値1箇所、25サイト） | 既知（メソッド戻り値経由、WD1b） |
| rubocop-ast | 99 | 0.577 | 2 | 4 | possible-nil（`case`の`else`なしnilable）＋異種ivar | 既知＋本物の捕捉 |
| herb | 42 | 0.589 | 5 | 6 | undefined-method `singleton(Herb)`（ネイティブC拡張）＋`compact`戻り値 | 新規メカニズム1件＋RBS必要 |

precise比率の平均は**約0.50**——Railsサブgemと同じ帯域である。床を決めているのは同じM3の未注釈パラメータDynamic（免責）だ。テンプレートコンパイラ／パーサビルダーはどれも、注釈のないパラメータ上の`def compile(node)`／`def loc(token)`の木なので、最悪のファイルはいずれも大きなコンパイラ／ビルダー本体になる（`parser/builders/default.rb`は4641式で0.276、`herb/engine/compiler.rb`は0.399、`hamlit/haml_attribute_builder.rb`は0.344、`jbuilder_template.rb`は0.316）。jbuilderは**parse_errorsを2件**報告した（エンジンが解析できなかった`.rb`ファイル2つ——本当に壊れたスクリプトの捕捉であり、それ以上は調査していない）。

## 新規メカニズムのバケットテーブル

先行3調査のバケットで**まだ**カバーされていないメカニズムのみ。それぞれ最小再現に還元した。

| バケット | スニペット | 半径（サンプル裁定済み） | 判定 | 難易度 | 修正のFPリスク |
| --- | --- | --- | --- | --- | --- |
| **T1. ファイル横断の`rescue <Const>`が、囲んでいるモジュールの兄弟クラスではなくコアクラスに解決される** | ファイルAで`M::SyntaxError = Class.new(Error)`、ファイルBで`rescue SyntaxError => e; e.line_number = 1` → コアの`::SyntaxError`に解決 → `undefined method 'line_number=' for SyntaxError` | **liquid 4**（`parser_switching.rb`）。コアをシャドーするモジュール名前空間付きエラークラスをファイル横断の`rescue`で使う唯一のコーパス。最小再現で確認: 単一ファイルでは**クリーン**、2ファイルで発火——つまりrescueの例外クラス位置に限った、ファイル横断のconst発見の取りこぼしである | **ARTIFACT——エンジンバグ（動作中コードへのFP）** | 低〜中（`rescue`節の例外const解決を、他のすべてのconst参照が既に使っている発見インデックス経由にする。ローカルの`class`形式は既に解決しており、ファイル横断の`Const = Class.new(...)`形式が`rescue`頭部でのみコアクラスに落ちている） | **低**（constを発見済みの同一名前空間クラスへナローイングするのは厳密により正しい。リスクは、シャドーされた名前で本当にコアクラスをrescueしたいプロジェクトだけ——稀であり、それは`::SyntaxError`で明示的に書ける） |
| **T2. `Array#compact`が要素型から`nil`を剥がさない** | `#: () -> Array[Node]`／`def compact_child_nodes; child_nodes.compact; end`で`child_nodes : Array[Node?]` → 推論結果は`Array[Node?]` → `def.return-type-mismatch` | **herb 1**を確認（`ast/node.rb:114`）。レシーバーが`Array[T?]`であるすべての`arr.compact`に一般化する（エンジンは定数要素の`Tuple#compact`は`shape_dispatch.rb:894`で畳み込むが、汎用の`Array[T?]`パスはRBSに落ち、その`compact: () -> Array[T]`は`T = Node?`のまま保持する） | **ARTIFACT——カタログギャップ** | **低**（`T`から`nil`構成要素を剥がす`Array#compact`／`compact!`の要素型射影を追加する。既存の`Tuple#compact`畳み込みとADR-47期のempty除去射影を踏襲） | **低**（compactは証明可能にnilを除去する。ナローイングのみで加法的） |
| **T3. `respond_to?(sym)`のtruthyエッジがレシーバーを非nilにナローイングしない** | `variable = cond ? evaluate(...) : nil; if variable.respond_to?(:count); variable.count` → `variable.count`でpossible-nil | **liquid 1**（`tags/render.rb:78`）。小さい。`nil`は固定されたコアのメソッド集合にしか応答しないため実在する——truthyな`respond_to?(:count)`は`variable`が非nilであることを証明する | **ARTIFACT——ナローイングギャップ** | 低〜中（`recv.respond_to?(sym)`のtruthyエッジで、`sym`がNilClassのメソッド集合になければ`recv`の型から`nil`を除去する。保守的な床——`respond_to?`がtruthyなエッジでは常に`nil`を落とす——も健全。nilが持たないメソッドすべてについて`nil.respond_to?(x)`はfalseだから） | **低**（ナローイングのみ。非nil型を昇格させることはなく、`nil`構成要素を除去するだけ） |

## 既知バケットの集計（各1行——再報告であり、件数のみで再分析せず）

- **末尾`if`／`else`なし`case`の本体からのメソッド戻り値`T | nil`を、ローカル経由で素のまま消費**——コーパス全体で支配的なFP。`parser`のpossible-nil 25件はすべて**1つ**のメソッドに遡る: `def loc(token); token[1] if token && token[0]; end`。その`Source::Range | nil`戻り値が25サイトで`loc(t).with(...)`／`.join`／`.adjust`／`.end_pos`として消費される。純粋に保守的（`loc`はtNL/nilトークンに対して本当にnilを返しうる）＝需要ゲート付きの**WD1bメソッド戻り値経由**バケット。同型: rubocop-astの`parser_class(...)`（`else`なし`case`→nilに対する`new`、2件）、hamlitの`@next_line`/`shift`のループ運搬nilable（1件）。**約28サイト、すべてWD1b**。
- **`Regexp#match`／`Regexp.last_match`のnilableなMatchDataを素のまま消費**——hamlitの`gsub!`ブロック内`match = pattern.match(s); match[4]`（5件）、erubiの`scan`ブロック内`match = Regexp.last_match; match.begin(0)`（2件）。マッチは証明可能に成功する（ブロック反復／`gsub!`後）が、`.match`／ブロック内`last_match`にはマッチ証明済みエッジがない。＝標準ライブラリの**C1**／Railsの**G1**のフォローアップスライス5（ナローイング述語としての`.match`／ブロック内`last_match`）、需要ゲート付き。**約7サイト**。
- **`rigor-activesupport-core-ext`未ロードでのコア型へのAS core_ext**——hamlitの`"...".html_safe`（3件）、jbuilderの`Hash#deep_merge`（1件）。調査は設計上プラグインなしで実施。これらはプラグインで解決する。**免責／設定。約4サイト**。
- **Ruby本体のないネイティブ／C拡張のモジュール関数**——herbの`singleton(Herb)#diff`／`#leak_check`／`#arena_stats`（このgemはRust/Cのネイティブ拡張で、これらはFFI束縛）。＝標準ライブラリの**C8**で想定済みの境界、RBSで解決。**約5サイト**。（herbは`rbs.coverage.missing-gem`も出す。）
- **本当に異種なivar書き込み（正しい捕捉）**——jbuilderの`@attributes` Hash→Array→`Jbuilder::Blank`（2件）、slimの`@tab_re` Regexp→String（1件）＋`@translator` Static→Dynamicサブクラスのユニオン（1件）、rubocop-astの`@cur_index` Symbol→Integer（1件）。これらはエンジンが発火させ続けるべき実在の最悪ケースフロー——**純粋に保守的、発火のまま維持。約5サイト**。
- **定数畳み込みされたivar／ローカルのガードに由来する`flow.always-truthy/falsey`**——散在（parser 4、liquid 3、rubocop-ast 3、slim 2）。標準ライブラリの**C5**／アルゴリズムの**M5**と同じ族（メソッド本体内で畳み込まれた変更済みivar値）。「修正」はFPリスクが高く、まずMastodon/hamlに対してFP検証する。**約12サイト**。
- **トップレベル暗黙self／オーバーライド置換可能性**——herbの`unresolved-toplevel` `gemfile`/`source`（ADR-17の`pre_eval:`の領分、2件）、herbの`override-param-narrowed` `initialize`（2件）＋`bool`宣言の`load`に対する`def.return-type-mismatch`（1件）、hamlitの`override-visibility-reduced`（1件）。免責のスクリプトイディオム／本物の置換可能性所見。**約6サイト**。
- **実行時`extend`が特異メソッドを追加**——erubiの`CGI = Object.new; CGI.extend(...); CGI.escapeHTML(...)`（1件）。メタプログラミング免責。**1サイト**。

## 攻略順ランキング——新規の一般コードメカニズムのみ

1. **T2——`Array#compact`の要素型nil剥がし**。最小・最安で、完全に自己完結したカタログ修正。既存の`Tuple#compact`畳み込みとADR-47期のempty除去射影を踏襲する。ありふれた`xs.compact`イディオムで実際に出ている`def.return-type-mismatch`を正確な戻り値に変える。難易度低、FPリスク低、加法的。**良いウォームアップスライス。半径はherbの単発ヒットより広い——あらゆる`Array[T?]#compact`が恩恵を受ける**。
2. **T1——ファイル横断の`rescue <Const>`解決**。エンジンバグ: rescueの例外クラスconstは、コアの同名クラスに落ちるのではなく、他のすべてのconst参照が使うモジュール名前空間付き発見インデックス経由で解決すべきである。動作中コードへのFPであり、`XxxError = Class.new(Base)`の兄弟群を定義するgem（Liquidの`errors.rb`全体、そして非常によくあるパターン）でイディオム的。難易度低〜中、FPリスク低。
3. **T3——`respond_to?(sym)`のtruthyエッジでの非nilナローイング**。ナローイングのみで、健全な床が用意できる（nilが持たないあらゆるメソッドについて`nil.respond_to?(x)`はfalseなので、truthyエッジで`nil`を落とす）。測定半径は小さい（ここでは1件）が、クリーンなイディオム（`x.respond_to?(:each) && x.each`）でFPフリー。あれば嬉しい。

**コーパス横断の再確認（新規作業ではない）:**需要ゲート付きの**WD1bメソッド戻り値経由nil**が、またしても最大のFPクラスである——ここでは28サイト、`parser`の1つのヘルパー（`loc(token)`×25）が支配的。この第4のコーパスは、残存する最大半径の一般コードFPが「ローカル経由で素のまま消費されるメソッド戻り値`T | nil`」であることを再確認した。まさにADR-58アークが純粋に保守的（呼び出し先は本当にnilを返しうる）と裁定して先送りしたバケットである。WD1bをいつか再訪するなら、`parser`の`loc`が正当化の正準形だ: `token[1] if …`という末尾条件付き戻り値を持つprivateヘルパーが、証明可能に非nilなトークンに対して数十回呼ばれている。それ以外はすべて、免責（M3未注釈パラメータDynamic、ASプラグイン、ネイティブC拡張、実行時`extend`）か、正しい捕捉（異種ivar、壊れたjbuilderスクリプト）か、既知のC1/G1正規表現マッチinブロックのフォローアップである。
