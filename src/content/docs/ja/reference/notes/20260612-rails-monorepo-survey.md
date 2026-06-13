---
title: "Railsモノレポサーベイ（サブgem別のDynamic落ち＋FPハント）"
description: "rigortype/rigor docs/notes/20260612-rails-monorepo-survey.mdからの取り込み。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260612-rails-monorepo-survey.md"
sourcePath: "docs/notes/20260612-rails-monorepo-survey.md"
sourceSha: "8ed474077b812c54ad7481cac9b47537b2a768ceb766cac766b6280a4e01d322"
sourceCommit: "94bccefcb8e324ea2322199418f33e80617b8e33"
translationStatus: "translated"
sidebar:
  order: 20266612
---

2026-06-12。`rails/rails`の12個のサブgem（`/Users/megurine/repo/ruby/rigor-survey/rails`）に対する、読み取り専用のエンジン挙動サーベイ。**`lib/`（rigor）の変更はなし**。対象は動作しているリリースツリーであるため、すべての`error`診断は偽陽性（false positive）の候補である。`20260612-cruby-stdlib-survey.md`の姉妹編。本ノートは同じエンジンを*フレームワーク*コード（重度のメタプログラミング＋ジェネリクス）に対して測り直す。

ミッションの枠組みに従い、ユーザーは**メタプログラミングと重度のジェネリクスを免責**する（Railsは両方で飽和している）。成果物では「予期されるメタプログラミング由来のDynamic」と、**型付くべきなのに型付かない素朴な一般コード**を分離する。ランク付きの攻略順序に入るのは後者だけである。

## 方法論＋重要なパフォーマンス上の発見

サブgemごとに、`rigor coverage --format=json lib`（precise ratio）＋`rigor check --no-cache`（診断）を、cwd=`<rails>/<gem>`、`BUNDLE_GEMFILE=<rigor>/Gemfile`、flakeでラップして実行した。

**このコーパスでは`lib`全体の解析が病的に遅い**。`rigor check lib`（デフォルトの逐次パス）は、activestorageの47ファイルに対して*シングルコア*で**20分超**走り続け、予算内に完了しなかった――一方、各ファイルを**個別に解析すると約1秒で完了する**。`--workers=8`は効かなかった（user 1093秒≈wall 1107秒＝並列化が機能していない）。コストは*1プロセスで解析するファイル数*に対して超線形であり（ファイル横断状態の蓄積）、単一の病的なファイルが原因ではない。これ自体がパフォーマンスADRのフォローアップに値する発見である（プロジェクト全体でのファイル横断状態の成長。ADR-44/52のアロケーション作業を参照――あちらが対象としたのはディスパッチ単位のチャーンであり、プロセス単位のファイル数スケーリングではない）。

**本サーベイへの帰結:** 以下の`check`の数値はすべて**ファイル単位**のスイープ（`find lib`でループした`rigor check <file>`、ファイルごとに60秒タイムアウト）による。検証: actiontextの`lib`全体（完了した中で最大のgem）は**2 err / 2 warn**を返し、ファイル単位スイープが報告するエラーとバイト単位で一致した――よってファイル単位は、ファイルローカルなメカニズムについては忠実である。過剰報告が起きる唯一の箇所は**ファイル横断のivar確定代入**（ファイルAで書かれたivarをファイルBで読むと`nil`と読まれる）で、これがivarの多いgemの`… for nil`／`possible-nil`のバケットを膨らませる。影響する箇所はインラインでフラグした。

カバレッジは、完了したところでは`lib`全体で読んでいる（同じスケーリングの壁を共有する――activestorageのカバレッジはファイル単位で計算した: 0.497）。

## gem別の採用config

サブgemごとの`.rigor.yml`（railsのチェックアウトには未コミット――そのまま残し、あちらには**コミットしない**）。すべてに`target_ruby: "4.0"`、`paths: [lib]`、`cache.path: tmp/.rigor/cache`、`rigor-activesupport-core-ext`を持たせた（どのgemもAS core_extに依存している）。gemごとの追加分:

| Gem | プラグイン（core-ext以外） | 注記 |
| --- | --- | --- |
| activesupport | — | core-extのみ（それ自身がASなので） |
| activemodel | — | |
| activejob | rigor-activejob | |
| actionmailer | rigor-actionmailer | |
| actioncable | rigor-actioncable | |
| activerecord | rigor-activerecord | |
| actionpack | rigor-actionpack | |
| actionview | rigor-actionpack | APプラグインを共用 |
| actionmailbox | — | rigor-activerecordを**外した**: `db/schema.rb`がないとファイルごとの`load-error`警告を出すだけでオーバーヘッドが増える |
| actiontext | — | rigor-activerecord/activestorageを外した（スキーマなし） |
| activestorage | — | rigor-activerecord/activestorageを外した（スキーマなし） |
| railties | — | |

**プラグインの注意（rigor-activerecord、スキーマなし）:** activerecord自身では、ARプラグインがファイルごとに1件の`load-error`*警告*（`schema file db/schema.rb not found; AR call checks skipped`）を出す→下のactiverecordの列に**純粋なノイズの402警告**が乗る。これは設定上のアーティファクト（ライブラリツリーにスキーマがない）であってRigorの発見ではないので、警告数から差し引くこと。スキーマを持たないサテライトgemではこの理由でプラグインを外した。

## gem別カバレッジ／エラー表

`prec` = `coverage`のprecise_ratio（preciseティア÷型付き式）。`err`／`warn` = ファイル単位スイープのエラー／警告の診断件数。

| gem | files | prec | err | warn | 最多のFPクラス | 判定 |
| --- | --- | --- | --- | --- | --- | --- |
| activesupport | 301 | 0.513 | 44 | 38 | 正規表現グローバルのpossible-nil（C1）＋Class特異メタプログラミング | ほぼメタプロ＋C1/C3。一般コードは少数 |
| activemodel | 76 | 0.453 | 3 | 1 | `for nil`（メソッド横断ivar） | クリーン。アーティファクトのみ |
| activejob | 54 | 0.471 | 4 | 0 | `singleton(Hash)#ruby2_keywords_hash`（builtinギャップ） | 真のbuiltinギャップ2件 |
| actionmailer | 23 | 0.424 | 1 | 0 | possible-nil（`mail.decoded`） | クリーン |
| actioncable | 46 | 0.502 | 13 | 2 | nio4rの要素が`String`に誤型付け（外部ライブラリ） | メタプロ／外部。アリティ1件 |
| actionmailbox | 22 | 0.548 | 0 | 1 | — | クリーン（エラー0件） |
| actiontext | 34 | 0.515 | 2 | 2 | possible-nil＋`renderer for Class`（メタプロ） | クリーン |
| activestorage | 47 | 0.497 | 1 | 0 | —（1ファイルがタイムアウト） | クリーン |
| actionpack | 156 | 0.455 | 36 | 18 | `superclass`／祖先系のpossible-nil＋`delegate for Class` | メタプロ祖先系＋C1 |
| actionview | 120 | 0.455 | 32 | 6 | `Regexp.last_match[]`のpossible-nil（C1）＋`Numeric#to_f` | C1＋真のカタログギャップ |
| activerecord | 402 | 0.421 | 224 | 439\* | relationビルダーの`define_method`メタプロ（`Integer`レシーバー） | 約90%がメタプロ。\*439 warn＝ARプラグインのスキーマなしノイズ |
| railties | 159 | 0.533 | 18 | 5 | `Shellwords#split`のarg-mismatch＋ジェネレータメタプロ | 混在。真の引数型2件 |

gem横断のprecise ratioの平均: **約0.48**。カバレッジは`constant`＋`nominal`ティアが支配的で、`dynamic_top`はどこでも約45–58%、すなわちどのRailsサブgemもおよそ半分が不透明に型付く――フレームワークのメタプログラミング密度の高さと整合する。

## gem横断の診断合計（ファイル単位スイープ、全12 gem）

| Rule | Sev | Count | 支配的な要因 |
| --- | --- | --- | --- |
| `call.undefined-method` | error | **322** | 下のクラスタ表を参照 |
| `flow.always-truthy-condition` | warning | 62 | 定数畳み込みされたガード＋ループ再束縛ローカル |
| `call.possible-nil-receiver` | error | **43** | C1正規表現グローバル／C3 nil許容builtin戻り値 |
| `call.unresolved-toplevel` | warning | 20 | トップレベル暗黙self（ADR-34） |
| `def.return-type-mismatch` | warning | 17 | アクセサ越しのivar状態Dynamic落ち（C2） |
| `call.wrong-arity` | error | 10 | 外部ライブラリRBSのアリティギャップ（Redis/Thread/nio4r） |
| `def.override-visibility-reduced` | warning | 9 | フレームワークのオーバーライド可視性 |
| `call.argument-type-mismatch` | error | 3 | `Shellwords#split`、`ENV#[]`の引数シグネチャ |
| `def.ivar-write-mismatch` | warning | 2 | 真の異種ivar書き込み |
| `flow.unreachable-clause` | info | 1 | （ADR-47、空虚） |
| `load-error` | warning | 402 | **ARプラグインのスキーマなしノイズ――破棄** |

### `call.undefined-method`（322）のレシーバー別分解

| レシーバークラスタ | Count | クラス | 判定 |
| --- | --- | --- | --- |
| `singleton(ActiveRecord)`（`.deprecator`、`.reading_role`、`.application_record_class`、…） | 137 | メタプロ（`mattr_accessor`/`class_attribute`） | **EXCUSED** |
| `Integer`――すべて`activerecord/.../query_methods.rb`内（`joins!`、`where!`、`_select!`、…） | 47 | メタプロ（`MULTI_VALUE_METHODS`上のrelationビルダー`define_method`。レシーバーが`Integer`に誤型付け） | **EXCUSED** |
| `Class`（`redefine_method`、`delegate`、`class_attribute`、`mattr_accessor`） | 32 | メタプロ（`Class`に対するAS core_ext） | **EXCUSED**（core-extプラグインが部分的） |
| `nil`（`first`/`pop`/`each`/`module_eval`/`method_defined?`） | 23 | メソッド横断／ブロックのivar nil――**ファイル単位で膨張** | 大半がARTIFACT（スイープモード） |
| `singleton(ERB::Util)` | 11 | モジュール特異の`def self.`チェーン | ARTIFACT――**モジュール特異ギャップ**（キュー済み） |
| `Numeric`（`to_f`×4＋他10件） | 14 | コア型カタログギャップ | **GENUINE――一般コード** |
| `singleton(File)#atomic_write`、`singleton(Hash)#ruby2_keywords_hash[?]`など | 約58 | 混在: モンキーパッチされたコア（`File.atomic_write`はAS定義）＋真のbuiltinギャップ | MIXED |

## Dynamic落ちメカニズムのバケット表（一般コードのみ）

上のメタプログラミングクラスタは免責としてここからは落とす。以下は*型付くべき素朴なコード*の背後にあるメカニズムで、半径順にランク付けした。これらはCRuby stdlibサーベイのC1/C2/C3を、第二のコーパスで**再確認**している。

| バケット | メカニズム | 半径（Rails） | stdlibと同一か | 精度加算的か | クラス |
| --- | --- | --- | --- | --- | --- |
| **G1. 正規表現グローバル／`last_match`のnilユニオン** | `str.gsub!(re){ $2.capitalize! }`、`match = Regexp.last_match; match[:k]`、`$1 ? … : …`→レシーバーが`T?`に型付き→下流のあらゆる`[]`/`capitalize!`/`<<`でpossible-nil | **高**（あらゆるパーサ: inflector、erb_tracker、ルートパース、テンプレートハンドラ） | ＝stdlib **C1** | yes（FPを除去） | エンジン――グローバル変数のフロー型付け＋`=~`/`scan`後のナローイング |
| **G2. nil許容builtin戻り値のガードなし消費** | `StringScanner#skip → Integer?`、`String#unpack → Array?`、`Hash#[] → V?`を読んでそのまま`< … `／`[2]=`／`<<` | 高 | ＝stdlib **C3** | 一部（真に欠けているものもある） | エンジン／カタログ――過剰にnil許容なbuiltin戻り値シグネチャ。呼び出しが確実にヒットする箇所で絞り込む |
| **G3. `Numeric#to_f`（＋`Float#round`の過剰拡大）** | `(time_delta / 60.0).round`が`Numeric`に型付き（roundのオーバーロードが`Integer\|Float`→`Numeric`にjoin）、続いて`Numeric#to_f`が**カタログに存在しない**→素朴な算術チェーンでundefined-method | 中（`Float#round`して変換するあらゆる箇所。date/numberヘルパー） | 新規（stdlibはInteger/Floatに直接依存していた） | yes | カタログ――`Numeric#to_f`/`to_i`/`to_r`を追加。`Float#round`引数なし→`Integer`を再検討 |
| **G4. メソッド／ファイル横断のivar状態join→nilユニオン／Dynamic** | N個のメソッド／ファイルで書かれたivarを別の場所で読む→`Dynamic[top]`/`nil`。アクセサ越しの`def.return-type-mismatch`と`… for nil`として表面化 | 高（ただし**ファイル単位モードはここのnil側を膨らませる**） | ＝stdlib **C2** | おおむねyes | エンジン――ivar宣言型推論／確定代入（キュー済み） |
| **G5. モジュール特異の`def self.x`チェーン** | `ERB::Util`のself呼び出し、`SecureRandom`/`Date`の特異ヘルパーが部分的にしか解決しない。`def self`横断チェーンがundefined-methodに落ちる | 低〜中（stdlibで小さいと確認済み。Railsはインスタンスmixinに依存） | ＝stdlib **C4** | yes | エンジン――キュー済みとして既知（ADR-57モジュール特異フォローアップ） |

外部ライブラリの要素／レシーバー誤型付け（nio4rの`@nio.select`要素→`String`。Redis/Threadのアリティ）は一般コードのエンジンバグでは**ない**――それらのgemのRBSが存在しないことが原因であり、原理的にはDynamicへ正しく退化する。少数の`String`／アリティの発火は、Dynamicの代わりに不正な畳み込みが漏れた箇所で、C2に隣接する狭いアーティファクトであり、ランク付け対象ではない。

## ランク付きの攻略順序――一般コードのメカニズムのみ

1. **G1――正規表現グローバル／`Regexp.last_match`のマッチ後ナローイング**。
   コーパス横断で最大の半径（ここでの43件のpossible-nilの大半*と*stdlibサーベイの約180件を駆動する）。FP純減の勝ち筋（パターンがマッチしたからこそコードが動いている）。両サーベイが指す同一のエンジン作業: `$1..$9`/`$~`/`Regexp.last_match`を型付けし、マッチ成功エッジで非nilにナローイングする。**最初にやること。2つのコーパスに効く**。
2. **G2――過剰にnil許容なbuiltin戻り値（`StringScanner#skip`、`String#unpack`、確実に存在する位置での`Hash#[]`）**。カタログ精度。中程度の労力で、安定的に出続けるpossible-nilを除去する。
3. **G3――`Numeric#to_f`/`to_i`/`to_r`のカタログエントリー＋`Float#round`引数なし→`Integer`**。最小・最安・完全に自己完結のカタログ修正で、素朴な算術に対する真のundefined-methodを精密な型付けに変える。良いウォームアップスライス。
4. **G4――メソッド／ファイル横断のivar確定代入**。潜在半径は最大だが、キュー済みの難物（ADR-46のインクリメンタル依存グラフが基盤）。本サーベイのファイル単位モードはnil側を*過大評価*している点に注意――ファイル数スケーリングの壁（上のパフォーマンス発見）に対処したら`lib`全体で再測定すること。さもないとシグナルが汚染される。
5. **G5――モジュール特異の`def self.x`解決**。両コーパスで半径が*小さい*と確認済み（Railsもstdlibもインスタンスメソッド／mixinに依存する）。すでにADR-57のフォローアップとしてキュー済み。実測の収量からして低優先度。

### 横断的な前提条件

**`lib`全体のファイル数スケーリングの壁**（プロセス単位のコストが解析ファイル数に超線形。単体で約1秒/ファイルvs 47ファイル一括で20分超、`--workers`は無効）は、プロジェクト全体での誠実な再測定を阻んでおり、実際のRailsアプリでRigorを走らせる上での単一最大の障害である。G4（正しく測るには`lib`全体の実行が必要）に先立ち、独立したパフォーマンス調査に値する。
