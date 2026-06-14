---
title: "アプリ／ネットワーク系コーパスのサーベイ（一般コードのDynamic転落＋FPハント）"
description: "rigortype/rigor docs/notes/20260613-app-network-corpora-survey.md からインポート。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260613-app-network-corpora-survey.md"
sourcePath: "docs/notes/20260613-app-network-corpora-survey.md"
sourceSha: "cc014e1ac7fa049b34989d01638b3a3cfb0e253ae90a9cf03874504be82931ce"
sourceCommit: "636f8725dd79aab2f711249ace6357a98b7e73a4"
translationStatus: "translated"
sidebar:
  order: 20266613
---

2026-06-13。`/Users/megurine/repo/ruby/rigor-survey/`配下の実世界のアプリケーション／ネットワーキング／並行処理ライブラリ8本に対する、読み取り専用のエンジン挙動サーベイ。**`lib/`（rigor）の変更はなし**。2026-06-12の三部作（`20260612-cruby-stdlib-survey.md`、`20260612-algorithm-corpora-survey.md`、`20260612-rails-monorepo-survey.md`）の姉妹編。今回は*イディオマティックなgem*のRuby――コールバックレジストリ、パーサ、グラフのミックスイン、FFIラッパー――を対象とする。ここでユーザーの信頼性の基準が効いてくる。方法論はstdlibサーベイの恒常的な教訓に従う: **あらゆる半径（radius）は、規模を測る前にソースに照らしてサンプル裁定する**。

対象（読み取り専用、`lib/`）: mail、net-ssh、faraday、concurrent-ruby、textbringer、tdiary-core、rgl、protobuf（`ruby/lib`）。

呼び出し: cwd=対象、`BUNDLE_GEMFILE=<rigor>/Gemfile`、flakeでラップした`bundle exec exe/rigor {coverage|check --no-cache} lib`。

**パフォーマンスに関する注記（朗報）:** Railsサーベイがフラグを立てたファイル数スケーリングの壁は**消えた**――ランドした実行スコープのreturnメモ＋consultゲートの修正（`4b476918`）が持ちこたえている。mail（111ファイル）とconcurrent-ruby（178ファイル）を含むすべての対象で、`lib`全体の`check`が実時間3.6秒以下で完了した。シャーディングは不要。

## リポジトリ別テーブル

| repo | files | coverage (precise) | errors | warnings | top class | 判定 |
| --- | --- | --- | --- | --- | --- |
| mail | 111 | 0.977\* | 6 | 19 | `flow.unreachable-branch`（11） | \*比率は生成されたRagelパーサで水増しされている。本物の一般ファイルは0.32–0.37。エラー＝AS core-ext／nilableなルックアップで、大半はneeds-RBS／既知 |
| net-ssh | 97 | 0.514 | 17 | 14 | `call.possible-nil-receiver`（12） | **N1コールバックivarのスワップ→always-falsey＋for-nil**。残りはC3のnilable-return／needs-RBS |
| faraday | 33 | 0.442 | 8 | 0 | `call.undefined-method`（5） | **N4 `respond_to?`ガード**（2）＋Structサブクラスの`self.class`シングルトン（4）＋`URI.find_proxy`のRBSギャップ |
| concurrent-ruby | 178 | 0.505 | 11 | 17 | `def.override-visibility-reduced`（15） | **N2 `<=`内の`0?`/`Dynamic?`なivar**（2）＋Enumeratorメタプログラミング＋Monitor/Floatのカタログギャップ |
| textbringer | 77 | 0.656 | 28 | 17 | `call.undefined-method`（23） | **N1（for-nil）＋N3 `&.`-on-nilの発火＋N2 `Dynamic?`な`<`**。モジュールシングルトンのファイル横断残余（13件の`Utils.message`） |
| tdiary-core | 69 | 0.525 | 3 | 244 | `call.unresolved-toplevel`（234） | プラグインDSLのトップレベルイディオム（EXCUSED、ADR-17）。3件はgenuine-conservativeなpossible-nil |
| rgl | 28 | 0.434 | 0 | 13 | `flow.always-truthy-condition`（13） | **N5オーバーライド可能メソッドのリテラル畳み込み**（`directed?`ミックスイン）――警告セット全体 |
| protobuf | 24 | 0.547 | 4 | 0 | `call.possible-nil-receiver`（2） | Structサブクラスのシングルトン（`Struct`上の`from_hash`/`new`）＋nilable-returnの`<` |

`refined`/`dynamic_specific`はどこでも約0（これらのツリーにはRBSもリファインメントもない）。`dynamic_top`は24–57 %。高い側はパラメータ由来のM3漸進的型付け（免責）＋後述のivarメカニズムによる。

\* **mailのカバレッジは測定上のアーティファクトである**。 `address_lists_parser.rb`単体でmailの422 116式のうち255 548を占める――定数畳み込み器が精密に型付けする機械生成のRagel状態テーブルであり、リポジトリ全体のprecise比率を0.977まで引き上げている。手書きのmailファイル（`address.rb` 0.32、`part.rb` 0.34、`common_address_field.rb` 0.34）が本当のシグナルで、コーパスの他のリポジトリと同水準にある。リポジトリのカバレッジは、生成パーサで水増しされたサマリーではなく、最悪ファイルのリストから読み取ること。

## NEWメカニズムのバケットテーブル

すべて最小のスタンドアロン再現に落とし込んでプローブした（単離できなかった場合はその旨を記す）。半径＝8リポジトリにまたがる、サンプル裁定済みの発火箇所数。

| バケット | スニペット（最小再現） | サンプル裁定済みの半径 | 判定 | 難易度 | 修正のFP-risk |
| --- | --- | --- | --- | --- | --- |
| **N1. 多重／並列代入のivarターゲットがクラスivarのユニオンから脱落する** | `old, @cb = @cb, block`（net-ssh `channel.rb`）；`@i, @o, @stderr, @wait_thr = Open3.popen3(c)`（textbringer）。当該ivarが純粋な`nil`（または定数nil）に型付けされる→`if @cb`が**always-falsey**に畳まれ、`@wait_thr.alive?`が**undefined-for-nil**になる | **約21以上**（net-ssh: channelのalways-falsey 6＋state/key_factory。textbringerの13件の`for nil`もこれに乗る） | **ARTIFACT――エンジンギャップ（NEW最優先）** | low–medium（`ScopeIndexer`のivar書き込み収集器を`MultiWriteNode`/`MultiTargetNode`のivarターゲットへ再帰するよう拡張――stdlibの分割代入クラッシュ修正と同じノードファミリー） | **low**（本物の書き込みを収集することは構成要素を*加える*だけ。偽のnilを除去する） |
| **N2. 宣言由来のivarのnil/`Dynamic`が`argument-type-mismatch`のコンテキストを汚染する** | `@lines = lines`（型なしパラメータ）の後に`while n < @lines`→`got Dynamic[top]?`；`@length = 0; … while k <= @length`→`got 0?`。素の`Dynamic[top]`/`Integer`なら漸進的一貫性を満たすが、`?`（確定代入されていないivarの読み出し箇所のnil）が拒絶の原因 | **約9**（textbringer floating_windowの`< @lines` 5件、concurrentの優先度キューの`<= @length` 2件、散在） | **ARTIFACT――ADR-58のカバレッジギャップ** | medium（ADR-58の「宣言由来のnilはdiagnosticの燃料にしない」を`possible-nil`から`argument-type-mismatch`へ拡張するか、漸進的一貫性チェックで`Dynamic[top]?`オペランドのnil構成要素を飲み込む） | low–medium（*フロー上生きている*nilをマスクしてはならない。ADR-58 WD1と同様に宣言由来であることでゲートする） |
| **N3. レシーバーが正確に`nil`に型付けされたとき、セーフナビゲーション`&.m`が`undefined-method`を発火する** | `@t = nil; … @t&.alive?`→`undefined method 'alive?' for nil` | textbringerの`for nil`クラスタとほぼ重なりN1と重複（N1がivarを純粋なnilのまま残したからこそ到達する）が、`&.`の発火は**それ自体として誤り** | **ARTIFACT――エンジンバグ**（セーフナビゲーションがundefined-methodを出してはならない。確定的にnilのレシーバーでは呼び出しは静的にスキップされる） | low（`&.`呼び出しのnilレシーバー側エッジで存在チェックを抑止する） | **なし**（健全――`&.`はまさにnilスキップ演算子である） |
| **N4. `x.respond_to?(:m)`のtruthyエッジが`x`を非nilにナローイングしない** | `url = "./#{url}" if url.respond_to?(:start_with?) && url.start_with?('//')`→`&&`の右辺でpossible-nil | 約3（faraday `connection.rb`で2、ダックタイピングのガードが他に散在） | **ARTIFACT――欠落しているナローイング述語** | low（truthyナローイング述語に`respond_to?`を追加。`nil.respond_to?(:m)`は`false`なのでtruthyエッジは健全に非nilを証明する――理想的には`m`を持つ構造的シェイプへもナローイングする） | **low**（ナローイングのみ） |
| **N5. *オーバーライド可能*なメソッドへの暗黙self呼び出しで、ベース定義がリテラルを返すと定数畳み込みされる** | `module Graph; def directed?; false; end; … def reverse; return self unless directed?; end`――`directed?`が`false`に畳まれ（ADR-57採用）、`unless directed?`がalways-true／`if directed?`がalways-falseyになる。**具象サブクラスが`directed?`を`true`にオーバーライドすることを無視している** | **13**（rgl `adjacency`/`base`/`dot`/`transitivity`/…――rglの警告セット全体） | **ARTIFACT――openなメソッドに対するADR-57採用の過剰適用** | medium（メソッドがopen／オーバーライド可能――再定義するサブクラス／includerを持つ――なら、self呼び出しの戻り値を定数に畳まない。採用は*値*としては健全だが、テンプレートメソッドの*フロー定数*としては不健全） | **medium**（真にfinalなself呼び出しの畳み込みは維持しなければならない。過剰な保守化はDynamicの源を再び開く） |

## 既知バケットの集計（各1行――再確認であり、新規ではない）

- **C3／G2過剰にnilableな組み込み／メソッド戻り値がそのまま消費される**（`<`、`%`、`[]`）: net-ssh `buffer.rb`の`read_bignum → T?`の後の`d % (p-1)`（4）、ed25519、passwordの`type`、forwardの`shutdown`/`close`、protobuf/mail/tdiaryに散在するpossible-nil。約20箇所。genuine-conservative／カタログ精度の問題。従来ノートのとおり需要駆動でゲート。
- **C2／G4メソッド横断ivarの状態結合→nil/Dynamic**（N2に流れ込む`Dynamic[top]?`の半分）: ipaddrの`@mask_addr`と同じメカニズム（ADR-58 WD3がコンストラクタ確定代入のサブセットをランドさせた）。N2行はこれの*新しいdiagnosticルール上のサーフェス*であって、新しい根本原因ではない。
- **M5／C5 ivar値の定数畳み込みの過剰さ**（`if @callback`、`if @size == 1`）: ここではN1に包含される（脱落した書き込みを受け入れるなら畳み込み自体は*正しい*。実際のバグはN1）。純粋なM5（多重代入なし）のalways-truthy/falseyはmail（6）／textbringer（6）に現れる――既知であり、従来ノートのとおりMastodonに対するFP検証でゲート。
- **モジュールシングルトン`def self.x`／`module_function`の解決**: textbringerの`Utils.message`/`foreground`（13）は発火したが**単離しなかった**――最小の2ファイル構成のネストした`module_function`＋`Util.message`のファイル横断再現は現行エンジンですべてクリーン。発火はフルツリーでのファイル横断の発見順序の相互作用による。新メカニズムではなく、ランド済みモジュールシングルトンバケットの残余として記録。
- **Structサブクラスの`self.class`／`Struct.new(...)`シングルトンディスパッチ**: faradayの`Options < Struct`（`self.class.member_set`/`options_for`、4）、protobuf（`Struct`上の`from_hash`/`new`、2）。Structサブクラスのインスタンスの`self.class`が汎用の`Class`/`Struct`に型付けされ、ユーザー定義の`def self.x`を見落とす。Structメタプログラミング隣接で、免責ぎりぎりのボーダーライン。
- **M3型なしパラメータ→メソッド全体がDynamic**: グラフアルゴリズム（rglのdijkstra/bellman_ford/transitivityは0.19–0.25）、パーサ、FFIラッパーの0.43–0.55のフロアを駆動。EXCUSED（漸進的型付けのエントリポイント）。
- **`call.unresolved-toplevel`のプラグイン／スクリプトイディオム**: tdiary-core 234（あらゆる`NN<name>.rb`プラグインがトップレベルのヘルパー`def`を定義し、トップレベルでtdiaryのプラグインDSLを呼ぶ）。EXCUSED――ADR-17の`pre_eval:`の領分。
- **needs-RBSのカタログギャップ**: mailの`Hash#symbolize_keys`／`File.makedirs`（AS-core-extモンキーパッチがここでは不在）、faradayの`URI.find_proxy`、concurrentの`Float#strftime`／`Monitor#from`（RBSなし）、`Numeric#to_f`ファミリー（G3、キュー投入済み）。NEEDS-RBS。
- **`def.override-visibility-reduced`**（concurrent 15）: フレームワークのオーバーライド可視性。既知／無害。
- **`flow.dead-assignment`**: net-ssh socks5の`hostname`/`portnum`（3）、mail（2）、tdiary（3）――GENUINE catch（本物のdeadなローカル）。維持。

## ランク付けした攻略順――NEWの一般コードメカニズムのみ

1. **N1――多重／並列代入のivarターゲットをクラスivarのユニオンへ収集する**。 NEW最大の半径（net-ssh＋textbringerで約21以上）。ユビキタスなコールバックレジストリ（`old, @cb = @cb, block`）とpopenタプル捕捉（`@i,@o,@e,@thr = Open3.popen3`）イディオムに対するalways-falsey＋for-nilのFPクラスタ全体の根本原因。FPセーフ（本物の書き込みを加えるだけ）、難易度はlow–mediumで、stdlibの分割代入修正で既に追加した`MultiWriteNode`/`MultiTargetNode`処理を再利用できる。**最初にやる**。
2. **N3――`&.m`のnilレシーバー側エッジで存在チェックを抑止する**。それ自体として健全性／FPのバグ（セーフナビゲーションがundefined-methodを出してはならない）。極小でFP-riskゼロ。サーフェスは部分的にN1と重なるが、`&.`配下の純粋なnilレシーバーを確実に沈黙させるため、それ自体の価値で修正する。安価なのでN1と並行して。
3. **N4――`respond_to?(:m)`を非nil（理想的には構造的）ナローイング述語にする**。難易度low、ナローイングのみ（健全: `nil.respond_to?`はfalse）。きれいなダックタイピングFPのスライスを除去する。安価で独立した勝ち。
4. **N2――ADR-58の「宣言由来nilは燃料にしない」を`possible-nil`から`argument-type-mismatch`へ拡張する**（`<`/`<=`内の`Dynamic[top]?`／`0?`オペランド）。medium。ADR-58 WD1とまったく同様に宣言由来であることでゲートし、Mastodon/hamlに対してFP検証。約9箇所。
5. **N5――*オーバーライド可能*なメソッドのself呼び出し戻り値を定数畳み込みしない**（ベース定義はリテラルを返すがサブクラス／includerが再定義する）。rglの警告セット全体（13）とテンプレートメソッドの誤畳み込みクラスを除去。難易度medium＋FP-riskもmedium（真にfinalなself呼び出しの畳み込みは維持――「発見済みのどのサブクラス／includerにも当該メソッドのオーバーライドがない」でゲート）。今回唯一のADR-57採用の引き締め。

**ヘッドライン**。このアプリ／ネットワークコーパスで支配的なNEWの一般コードFPは**N1――並列代入のivar書き込みが静かに脱落する**である。ユビキタスなコールバックレジストリとpopenタプル捕捉のイディオムを純粋なnilにし、always-falsey（`if @cb`）、undefined-for-nil（`@thr.alive?`）、セーフナビゲーションの発火（N3）へカスケードする。FPセーフで安価。N5（オーバーライド可能メソッドのリテラル畳み込み）は単一ファイルとして最大の半径（rglの警告13件すべて）であり、それ以外では良好なADR-57の採用ゲートがテンプレートメソッドのミックスインに過剰適用される唯一の箇所。残りはすべて2026-06-12三部作のC2/C3/M3/モジュールシングルトン/needs-RBSバケットの再確認である。ファイル数スケーリングの壁は閉じたことが確認された。
