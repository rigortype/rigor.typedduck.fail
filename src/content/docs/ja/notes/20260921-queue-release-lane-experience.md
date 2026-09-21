---
title: "v0.4.0プレクリアバッチ: 4つのレーンが実際に直面したこと"
description: "rigortype/rigor docs/notes/20260921-queue-release-lane-experience.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260921-queue-release-lane-experience.md"
sourcePath: "docs/notes/20260921-queue-release-lane-experience.md"
sourceSha: "bc870e13f2b3abf83d49113ab1c7df653e16be64c81e0a4bceea523e36e03328"
sourceCommit: "b5af5cf72f6b666f74479df959b1ee467feda5c6"
translationStatus: "translated"
sidebar:
  order: 20266921
---

ステータス: 2026-09-21の`/queue-release`バッチからのプロセスノート;設計コミットメントなし。`237e76dd`、Ruby 4.0.5に基づくワークツリーに対して採取。執筆時点で4つのドラフトPRはまだマージされていなかった。

4つのレーンが完了した後に、実装者が以下の4つのセクションを執筆した。次のバッチがCIタイムアウトから再学習しなくて済むよう、共有プロセスファクトをここに記載する。

| Issue | Draft PR | Head SHA | レビュー（Grok-max） |
| --- | --- | --- | --- |
| [#1011](https://github.com/rigortype/rigor/issues/1011) | [#1158](https://github.com/rigortype/rigor/pull/1158) | `c922003c3c2a111cad4401c3330a63c824ce04c7` | 承認。CIの赤はshard-1アーティファクトアップロードの403であり、テスト失敗ではない。 |
| [#1130](https://github.com/rigortype/rigor/issues/1130) | [#1159](https://github.com/rigortype/rigor/pull/1159) | `4dc1b7badb53892b5a0e2a3047a09bbd04a57b25` | 承認。CIグリーン。 |
| [#1071](https://github.com/rigortype/rigor/issues/1071) | [#1160](https://github.com/rigortype/rigor/pull/1160) | `4ffd97017a5e1d666d291e50501b8de81aa033c9` | 承認。P2: `plugin.md` / `effect-summaries.md`は依然としてユニットあたり1つのhtmlエッジと述べている。 |
| [#1089](https://github.com/rigortype/rigor/issues/1089) | [#1161](https://github.com/rigortype/rigor/pull/1161) | `f8dc257e25a733a9e2263b86f308cf407e143da6` | 承認。 |

## 共通の罠（4つのレーンすべて）

- `deepseek/deepseek-flash`はこのセッションのモデルレジストリに存在しない。最初のファンアウトは1秒で死亡した。`rigor-lane`上で`opencode-go/deepseek-v4-flash`（または`subagent({ action: "models" })`からの現在のFlash ID）を固定すること。
- 30分のchildタイムアウトはコードには十分だが、mastodon＋redmineの`check`を2回行うには不十分である。#1071と#1089はいずれもコーパスアームでタイムアウトした。再計測せずに再開し、PR本文にカウントを記載すること。
- シェルヒアドキュメント内でバッククォートを含む`gh issue create` / `gh pr create`を実行すると、コマンド置換が実行されてしまう。本文をファイルに書き出し、`--body-file`を渡すこと。
- 管理されたワークツリーにはvendored bundleがない。最初のRubyプロセスの前に、未追跡の`.bundle/config`の`BUNDLE_PATH`をメインチェックアウトの`vendor/bundle`に向けるか、ワークツリー内で`bundle install`すること。
- `pi-subagents/`ワークツリー名ではなく、変更名を付けたブランチ（`sig-gen-gap-markers-1011`）をpushすること。最初のpushの前にローカルブランチを作成すること。
- PR番号が存在した後にchangelogフラグメントを書くこと。フラグメントゲートはPRリンクを要求する。

## #1011 ── 実際に行ったこと

#1011に関する裁定（ruling）はリポジトリのどのファイルにも存在しなかった。メンテナーによって2026-09-19に投稿された、issue自身へのコメントであり、LaneInputの「既知の原因」が生のツリーと一致しなかった後に初めて見つけたものだった。`gh issue view 1011 --comments`で読んだ。それはゲート規則を維持し、マーカーが誤っていると宣言し、8つのエンジンの原因を行とともに列挙していた。

ワークツリーには、12個のissue番号（うち8個はクローズ済みの機能issue）を引用する25個のマーカー行が8つの`sig/`ファイルにわたって存在していた。何かに触れる前に、コメントを信じるのではなく各行が何であるかを知るために実際の分類器（`runtime: true`を付けた`SigProvenanceAuditor.audit`）を実行した。`tighter_return`である行は2つのみだった: #1007を引用する`plugin/base.rbs`の`dynamic_return_type`と、#1008を引用する`rigor.rbs`の`return_summaries`であり、どちらも真にオープンのギャップissueだった。他の21個のマークされた行は`unrenderable`、`declared_divergent`、または`synthetic_source`であり、これが変更についての考察方法を変えた: ハードルールはその2つのみを固定し、レンダリング不能な行が直面するのは残余ラチェットである。

実際のエンジンの原因ごとに1つずつ、10個の新しいギャップissueを起票した: #1148 endless-defリーダー、#1149 `||`フォールバック、#1150 `Data.define`メンバー、#1151 frozen-Set attr_reader、#1152タプルキー上の`Set#include?`、#1153 `Array[untyped] | []`早期リターン、#1154 initializeパラメータからのattr_reader、#1155メモ化された`||=`リーダー、#1156後のレコードを固定するシードリテラル、#1157ブロックを取る名前解決器。すでにギャップを追跡していた#160、#1007、#1008はそのまま保持した。その後、23個すべてのギャップマーカーを向け直し、`plugin/base.rbs`の2つのフック契約拡大を新しい`# authored:`マーカーに変換し、`spec/rigor/sig_gen/gap_issues.yml`をコミットし、`provenance_spec.rb`で`YAML.safe_load_file`を用いてロードし、リストされていない番号を引用する任意のマーカーで失敗するコーパスのexampleとauthoredマーカーのフィクスチャを追加した。監査器は`Declaration.authored_reason`と、いずれかのマーカーをカウントする`Row#marked?`を獲得したため、`SIG_PROVENANCE_RESIDUE`内の残余ピンは動かなかった。

`sig-gen-gap-markers-1011`と名付けた新しいローカルブランチ上でコミットし、明示的なrefspecでpushし、独立した行に`Fixes #1011`を記載してDraft PR #1158をオープンし、PR番号が存在した後に初めてchangelogフラグメントを書いた。対象を絞ったチェック: provenance spec 28件グリーン、rbs妥当性＋エイリアスレンダリング24件グリーン、docs-check 480件グリーン、変更された2つのRubyファイル上のRuboCopクリーン、`git diff --check`クリーン。

### 誤った判断

最初の過ちは、LaneInputの既知の原因リストを網羅的なものとして扱ったことだった。5つのマーカー行が裁定の行リストの外側に位置しており、「すべてのマーカーを向け直す」ことでそれらに関する決定を迫られた。エスカレーションする代わりに拡張した: `scope.rbs:24`は#1154にマージされ、`base.rbs:51`はauthoredになり、`type.rbs`の`yes/no/maybe`は#1155になり、`io_boundary.rbs`は#1156になり、`reflection.rbs`は#1157になった。これは意図された読み取りだが、それぞれはレビュアーが確認すべき判断だった。

2番目の過ちはシェルクォートだった。`gh issue create`のタイトルにバッククォートを含めて#1149を作成したため、コマンド置換がバッククォートのスパンを消費してしまい、タイトルから例のフレーズが失われた。`gh issue edit`で修正し、その後のすべての本文はファイルに書き出して`--body-file`を渡した。

3番目の回り道は環境だった。ワークツリーにはvendored bundleがなく、最初の分類器実行では異なるRubyに対してコンパイルされたホストの`rbs` gemがロードされ、dyld LoadErrorで死亡した。flakeは`BUNDLE_PATH`のみを設定する; bundleはメインリポジトリに存在する。メインリポジトリの`vendor/bundle`への絶対`BUNDLE_PATH`を持つ未追跡の`.bundle/config`を書き、すべてが動作した。

4番目に、インデントを誤認したか古いテキストに間違った先頭単語を残したため、いくつかの編集が完全一致のアンカーで失敗した。信頼できる修正法は、再試行する前にPythonの`repr`で正確な行を取得することだった。

特筆すべき脆い点: 監査器がauthored行をマーク済みとしてカウントしなかった場合、2つのフック行をauthoredマーカーに変換すると`plugin/base.rbs`のピンが2つ移動してしまうところだった。ラチェットのexampleを実行する前に、いずれかのマーカーに対して`Row#marked?`がtrueを返すようにしたことで、グリーンを維持できた。

### 次のレーンが再発見すべきでないこと

何かを実行する前にbundleをセットアップすること。このワークツリーに`make setup`は存在しない。パターンをコピーすること: メインリポジトリの`vendor/bundle`を指す`BUNDLE_PATH`を持つ`.bundle/config`であり、未追跡のまま保つ。

許可リストymlがレビュー対象のアーティファクトである。マーカーはその中の番号のみを引用できる。#1148から#1157のいずれかがクローズしたときは、リストからその番号を削除し、マーカーが移動するまでゲートが失敗するようにする。#1011自体を決して引用してはならない;それはエンジンのギャップではなく規約を追跡するものである。

マーカーを追加または変換するときに`SIG_PROVENANCE_RESIDUE`を動かしてはならない。両方のマーカー形式がカウントから差し引かれ、ピンを動かすと真のエンジン修正がマスクされてしまう（ゲートメッセージはこれを個別に扱う）。

2つの行のみが`tighter_return`である。陳腐化した引用を実際にキャッチするexampleは、tighter-returnのものではなく新しい許可リストコーパスexampleである。sigマーカーの編集後は`provenance_spec.rb`を実行すること;ファイルロード時の約15秒のジェネレータパスが実際のコストである。

issue起票の際は、bash経由で渡される`gh issue create`タイトルにバッククォートを決して入れないこと。`--body-file`とシングルクォートで囲んだタイトルを使用すること。

ハーネスのワークツリーブランチは`pi-subagents/i1011-...`だった。PRブランチ名はpush前にローカルで作成しなければならず、さもなければPRがツールプレフィックス付きの名前を帯びることになる。

残留リスク: `docs/handbook/11-sig-gen.md`は依然としてギャップマーカーのみを命名している。`# authored:`向けに更新することは、このレーンの変更リストから除外された小さなフォローアップである。

## #1130 ── 実際に行ったこと

バグは2つのパス間の1単語の違いだった。`dispatch_one`の`Bases::Self`の戻り値パス型付けは`SelfSubstitute.for`（issue #1092、PR #1096）を通っていたため、`ints.tap {}`は`Array[Integer]`を返した。`extract_block_param_types`は型引数なしで`self_type = Type::Combinator.nominal_of(class_name)`を構築していたため、`Object#tap`の`(self)`ブロックパラメータは生の`Array`として到着した。`ints.tap { |a| }`は`a`を`Array`に束縛し、`[1, 2].tap { |a, b| }`はissue #1128の`Dynamic[top]`床に着地した。

`probe_block_param_types_one`から`extract_block_param_types`へ`receiver`、`receiver_args`、`method_name`をスレッドし、`SelfSubstitute.for`を保持対劣化の判定のみとして呼び出し、nilでない判定ではブロックの`self_type`を値固定定数を保持したまま`nominal_of(class_name, type_args: receiver_args)`に設定した。nil判定（要素を変更するミューテーター）は生の公称型を保持した。`dispatch_one`と戻り値パスはバイト単位で変更されなかった。

その分割は私のものではなかった。受け入れ基準は`[1, 2].tap { |a, b| }`がADR-101の楽観的マークを付けてスロットごとに`1 | 2`を束縛することを要求しており、素の`SelfSubstitute`の再利用ではそれを生成できなかった（後述）。具体的な分岐を挙げてエスカレーションし、スーパーバイザーは候補B（1つの判定、戻り値のみの拡大）を選択した。`docs/internal-spec/inference-engine.md`はまさにそれを記録している。

証拠は`tmp/`内のプローブから得られた。`probe1130.rb`はローカル読み取り上の`on_enter`ウォッチャーとともにスコープ評価を通じてエンジンを実行した: 変更後、`ints.tap { |a| }`は`Array[Integer]`を束縛し、`[1, 2].tap { |a, b| }`は`scope.optimistic_local`が`implicitly_returns_nil`を報告した状態で両スロットに`1 | 2`を束縛し、`[1, 2].tap {}`は依然として`Array[Integer]`を返す。`probe_binder.rb`はバインダーが`Array[T]` yieldをスロットごとにTに写像することを確認した。スペック: `rbs_dispatch_spec.rb`に6つの新しい`.block_param_types` example、加えて本物のランナーを通じて`assert_type`を駆動する`block_param_self_substitute_spec.rb`。どのRBSコアメソッドもミューテーターかつself-yielderではないため、ミューテーター辞退のケースにはフィクスチャsigが必要だった: `pure`と`rewrite!`を持つ`SubBox[A]`、および型付けされた`SubBox[Integer]`値を取得するための`SubBoxMaker.pack`。beforeアームのためにエンジンファイルをスタッシュして実行したlibおよびpluginsのセルフチェックは、バイト単位で同一の結果を返した。

### 誤った判断

SelfSubstituteは深く拡大する。`projected_self`はすべての型引数に`deep_widen`を適用し、`deep_widen`は値固定定数を`widen_value_pinned`経由でルーティングするため、`Constant[1] | Constant[2]`は`Integer`になる。タプル`[1, 2]`に対する`SelfSubstitute.for`は`Array[Integer]`を返す。その生成物をブロック翻訳器に渡すとスロットごとに`Integer`を束縛し、受け入れ基準のリテラル`1 | 2`に失敗する。ブロックパスは拡大された生成物ではなく判定を消費しなければならない。

1 | 2対明示的な1, 2の罠。受け入れ基準の括弧内の「明示的な`a, b = [1, 2]`と一致」という記述は、エンジンがその位置でも`1 | 2`を束縛することを意味していると思い込んでいた。計測したところ、そうではなかった。リテラルタプルは要素ごとに分配束縛される: `a, b = [1, 2]`は`Constant[1]`と`Constant[2]`を束縛する。`1 | 2`という読み取りは`Array[T]` yieldのブロックオートスプラットに属するものであり、これはスロットごとに要素unionであるTを束縛する。2つの答えは要素ファミリーを共有するが、異なるメカニズムである。

より小さな点。単一パラメータ形式`[1, 2].tap { |pair| }`は`Array[1 | 2]`全体を保持し、楽観的マークを運ばない;スプラット位置のみがマークされるため、アサートしすぎてはならない。`map!`のブロックパラメータは`type_vars`を通じて解決される`Elem`であるため、ミューテーター上であっても今日すでに`1 | 2`を束縛する;辞退が観察可能なのはselfをyieldするパラメータにおいてのみであり、それゆえにフィクスチャsigが必要だった。メモ化された環境での`Dir.mktmpdir`はスペック残余ゲートの下でリークする; `SpecTmpdir.suite_lifetime`がその修正である。RuboCopは代入を後置ifに強制し、拡大されたキーワードリストに対して`ParameterLists`の無効化を強制した。`Dynamic[Array[Integer]]`レシーバーについては判定が非nilとなり、ラッパーは素の`Array[Integer]`ブロックselfに平坦化される;受け入れ基準はそれをカバーしておらず、残留リスクとしてフラグを立てた。

### 次のレーンが再発見すべきでないこと

判定と拡大は分離可能である。保持対劣化には`SelfSubstitute.for`を再利用し、ブロックselfは`receiver_args`から直接構築すること。戻り値パスの拡大された代替物をブロック翻訳器にルーティングしては決してならない。

受け入れ言語における「明示的な分配束縛と一致」とは、明示的な多重代入が束縛する正確な定数ではなく、要素ファミリーを意味する。散文を信じる前に計測すること: `on_enter`プローブとスタッシュ切り替えによるセルフチェックのdiffが迅速な証拠ループとなる。

ワークツリーは何かを実行する前に自身の`vendor/bundle`（`bundle install`）を必要とする;不在の`references/`サブモジュールは失敗ではなく2件の既存のdocs-check pendingとして現れる。changelogフラグメントの前にPRを作成すること。フラグメントゲートがPRリンクを要求するためである。そしてnil判定は、`Dynamic`レシーバーのブロックselfが何であるべきかについて依然として答えていない;誰もまだその疑問を所有していない。

## #1071 ── 実際に行ったこと

このレーンはPR #1160を実装した。`respond_to`ディスパッチャーの内部で、アームが自身のブロックのトップレベルで無条件に応答しない限り、各フォーマットアームはアーム内部の任意の明示的なレンダリングのターゲットに加えて、アームの慣例的テンプレート`<action>.<fmt>`へのエッジをアクションに張るようになった。古いユニット規則はユニットあたり1つのhtmlエッジを答えていたため、`format.js`と書いたアクションはその`.js.erb`テンプレートに決して到達しなかった。

機械的には`unit_scan.rb`に存在する。`record_format_arm`はレシーバーがディスパッチャーブロックの最初の必須パラメータである`format.<fmt>`呼び出しを認識し、ウォークが降下するすべての`BlockNode`をプッシュするようになったブロックスタックに依存しているため、最も内側の囲むブロックを透過的な`respond_to`ブロックとして識別できる。ブロックを持つアームは`@arms_by_block`内に同一性エントリーを取得する; `enter_arm_block`はアームブロック自身の条件付きインクリメントの後に`[arm, @conditional]`をプッシュするため、その本体のトップレベルは記録されたまさにその深さに位置する。その深さで発火するプラグインの`responds:`行はアームを応答済みとしてマークする;ネストされた`if`やブロック内部のより深い応答はマークせず、ユニットレベルの`@responded`規則を反映する。したがって空のブロックや代入のみを行うブロックは変更されない: `format.js {}`や`format.js { @users = [] }`は依然として`default_render`へとフォールスルーし慣例的テンプレートを保持する。これこそが裁定の最初のドラフトが覆されたまさにその点だった。`format.any`と`format.all`はいかなる慣例的エッジも取得しない。すべてのリクエストフォーマットを処理し、単一のテンプレートがそれらの慣例になり得ないためである。

`callee_rule.rb`は`rails_implicit_render`を拡張して`html`をデフォルトとする`format:`引数を取るようにしたため、`apply_unit_callee_row`はそのアームのフォーマットでアームごとに1回ユニットcallee行を適用する。htmlユニットエッジはディスパッチャーがユニットのトップレベルで見られた場合にのみ立ち下がる;分岐の下にネストされたディスパッチャーは、フォールスルーパスが依然として実行されるため、素の暗黙的エッジを保持する。

スペック作業: `actionpack_template_edge_spec.rb`は古い`dispatched`過大近似を反転させ（`format.html { render :show }`は`show.html`のみを命名するようになった）、`js_arm`、`js_arm_with_block`、`js_arm_answered`、`any_plus_js_arms`、`any_all_arms`を獲得した。redmineとmastodonのコーパスページは、前後でバイト単位で同一の`check` JSONを生成した;エフェクトテーブルはラベルのみを移動させ（redmineは2アクション獲得、23変更、0喪失; mastodonは0）、獲得したラベルは`mutate.local`を運ぶ`.js.erb`テンプレートユニットに遡ることができた。

### 誤った判断

コーパスが最も時間を消費した。ハーネスは2つのプロジェクトに対して`check`と`effects`を実行し、アームあたり2回実行され、各実行は数分かかる; redmineの23の変更された行を1つずつ精査しようとしたことで事態を悪化させた。親がリダイレクトした: コーパスを再実行せず、カウントを残留リスクとして記録すること。タイムアウトはコードではなくセッション予算を食いつぶした。

スペックヘルパーの外部での素のRubyプローブは、プラグインrequirerが何も登録しなかったため、load-error診断と空のエッジを生成した。本物のRSpecハーネスのみが信頼できた。ハーネスをスキップするスクリプトを通じてプラグインの挙動をデバッグしてはならない。

最初の`any_plus_js_arms`フィクスチャは、フィクスチャから`.js.erb`ファイルが欠落しており、プロパゲーターがどのユニットにも解決しないエッジをドロップしたため、空のエッジリストに対してアサートしてしまった。これはスキャンのバグではない;スペックはエッジが主張するテンプレートを出荷しなければならない。

`apply_unit_callee`が`true`/`false`を返したため、RuboCopは`Naming/PredicateMethod`の下でフラグを立て、`attribute_plugin`と`apply_unit_callees`の両方が複雑さの上限を超えた。`mark_arm_responded`と`apply_unit_callee_row`を抽出し、`apply_unit_callee`が真偽値ではなくcalleeを返すようにした。

また編集時にファイルを壊してしまった: `private`キーワードの上に`FormatArm`構造体を挿入する意図の編集が、`def add`ヘッダーを静かに削除してしまった。何かを実行する前に`ruby -c`がそれをキャッチしたが、パッチのやり直しで1サイクルを浪費した。

### 次のレーンが再発見すべきでないこと

アーム応答済みビットは、スコープが再設定されたユニット応答済みビットである: アーム突入時の深さを記録し、`responds:`行が発火したときに等価性を比較し、アームブロック自身の条件付きインクリメントこそがそのトップレベルをその深さに置くものであることを忘れないこと。

ウォークが`responded`をミューテートするため、`FormatArm`は`Data`ではなく可変の`Struct`にしておくこと。

スキャン内部のエッジリストは、統合スペックの`entry.edges`が返すものとは異なる;後者はプロパゲーター後の解決されたリストであるため、フィクスチャ内に実際に存在するテンプレートに対してアサートすること。

ブロックスタックを尊重すること: 透過的なものだけでなく、すべての`BlockNode`がpushおよびpopしなければならず、さもなければ`record_format_arm`は`respond_to`ブロックを最も内側の囲いとして見ることができない。`@conditional`のインクリメントは`enter_arm_block`の前に、デクリメントはpopの後に保つこと。

最後に、コーパスゲートをそれが持つ高価なステップとして扱うこと。アーム間の`check` JSONのバイト同一性が安価なシグナルである;エフェクトラベルのカウントはラベルのみの脚注であり、アクションごとの監査タスクではない。このレーンからの数値はすでにPR #1160に記載されている。

## #1089 ── 実際に行ったこと

修正は1つのファイルに着地した: `plugins/rigor-activerecord/lib/rigor/plugin/activerecord.rb`。バグは完全に、レシーバーが書かれたパスである`column_return_type`の内部にあった。`column.ruby_type`をRigor型に写像し、`entry.enums`を決して参照していなかったため、`enum status: { active: 0, archived: 1 }`（`t.integer`カラム）上の`post.status`は、Railsがキー`"active"`を返すのに対し、`Integer`と型付けされていた。分岐を追加した: `entry.enum?(column_name)`のとき、キーのString定数のunion（`Constant["active"] | Constant["archived"]`）を構築し、空のキーリストに対しては`Nominal[String]`にフォールバックする`enum_key_type`を返す。`parse_enum_call`がパース可能な宣言として`enum :status, []`を受け入れるため、空キーガードは重要である。`ModelIndex`はすべてのキーが静的Symbolリテラルであるときにのみenumを記録するため、unionは構造によって完全であり、より広い`String`ではなく正確である。

暗黙のselfリーダーは変更されていない。精密なバリアントが#963でmastodon上で57件の偽陽性と計測されたため、`implicit_self_instance_member_type`は`Dynamic[top]`を答え続ける。私の新しいスペックは両方の綴りを並べて固定している: 書かれたレシーバーは絞り込まれ、モデルの`def`内部の素の読み取りは`untyped`のままである。

またマニフェストを0.11.0から0.12.0にバンプした。プロデューサーのペイロードの形状は何も変わっていないが、0.11.0のコメントはバージョンがプロジェクトが挙動の主張のために参照するキャッシュキーであるという前例を確立しており、これはプラグインが主張する書かれたレシーバーの呼び出しを変更する。

スペック作業は、整数を基盤とするenum（`status`）と文字列を基盤とするenum（`visibility`）の両方を運ぶフィクスチャを備えた、新しいネストされたdescribeの下の`spec/integration/plugins/activerecord_plugin_spec.rb`に存在する。5つのexample: 両方のバックエンドに対するunion絞り込み、`upcase`の沈黙、`status + 1`は`Integer`ではなく`String`を出力、`status?`は`bool`のまま、暗黙のselfは`Dynamic[top]`のまま。

### 誤った判断

`+ 1`の受け入れアームは満たすことができなかった。どのようなStringファミリーの型を寄与しても、`post.status + 1`はいかなる診断も生成しなかった。プロービングにより、これはエンジン全体にわたることが示された: `s = "a"; s + 1`、`"active" + 1`、および`post.title + 1`はすべて沈黙し、`+ nil`のみが発火する。`call.argument-type-mismatch`は型強制の安全性（coerce-safety）のために意図的にnil専用とされており、`spec/rigor/analysis/check_rules/nil_argument_mismatch_spec.rb`に文書化されている。スーパーバイザーにエスカレーションしたところ、選択肢（a）を選択した: プラグイン側にとどまり、エンジン変更は行わず、`Rigor.dump_type(post.status + 1) == String`を介して型レベルでアームを検証する。受け入れテストが失敗した後ではなく、最初の1時間でこれをプローブしておくべきだった。

RSpecブロックを2回誤配置した。挿入アンカーがネストされたdescribeの閉じ`end`に一致してしまい、最初は`ActiveRecord::Relation typing`の内部、次に`declarations inside a with_options block`の内部となり、最初の再配置では本物の親を閉じていた`end`を落としてしまい、ファイルの最終行で構文エラーとして現れる閉じられていない`RSpec.describe`が残った。ヘルパー`column_contribution`と`bool_union`は`describe "instance column accessors"`内に存在しており、スプライスする前にこれを確認しておくべきだった。Pythonの再インデントスクリプトでブロックを修正したが、編集前には目視での`end`一致ではなくdescribeレジストリを使用すること。

最初の`gh pr create`は本文を損壊させた: ヒアドキュメント内のバッククォートがシェルラッパーによってコマンド置換され、`column?`のようなインラインスパンを剥ぎ取り、迷い込んだフラグメントを実行してしまった。`gh pr edit --body-file`を用いてファイルから本文を書き直した。PR本文はまずファイルに書き出すこと。

コーパスアームが予算を食いつぶした。調査チェックアウトでのmastodonの完全チェックは重い。前後のmastodonのみを実行し（バイト同一、2548行、0喪失、0新規）、redmineには決して到達しなかった。

### 次のレーンが再発見すべきでないこと

診断を期待する受け入れテストを書く前にエンジンをプローブすること。設計上、`+`上の非nilの不一致はこのビルドでは発火し得ない。

コーパス計測については`docs/agents/measurement.md`に従うこと: 作業ツリー内の変更されたファイルを`git stash push -- <file>`で切り替え、このワークツリーの`exe/rigor`と`Gemfile`を使用して、各アーム上のすべてのターゲットを自身のcwdから`--no-cache --no-baseline`で実行する。第2のワークツリーチェックアウトをベースラインアームとして使用してはならない。2つのターゲットにコミットする前に1つのアームの時間を測定し、コーパスのダンプをスクラッチとして扱い、決してコミット材料としてはならない。

`entry.enums`はシンボル名の文字列を運び、リーダーはStringキーを返すため、`constant_of`の前に`key.to_s`を通じて写像すること。記録を辞退する報告されたenum（非リテラル値）は通常のストレージ型付けにフォールバックするが、これは正しい。

新しい`describe`を配置する前に、`RSpec.describe`のネストとヘルパーメソッドの配置場所を確認すること。ブロック再配置後は`ruby -c`を検証すること。バッククォートを含むヒアドキュメントの代わりに、PR本文を一時ファイルに書き出して`--body-file`で渡すこと。

最後に、`version:`に関するマニフェストコメントこそが、挙動の主張に対するキャッシュキーの推論が存在する場所である。変更がプラグインが応答する呼び出しを変更する場合、0.11.0エントリーがまさにそうしているように、それをバンプしそのコメントで理由を述べること。
