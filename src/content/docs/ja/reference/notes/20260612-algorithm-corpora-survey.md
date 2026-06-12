---
title: "Algorithm / data-structure corpora survey (general-code Dynamic-fall + FP hunt)"
description: "Imported from rigortype/rigor docs/notes/20260612-algorithm-corpora-survey.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260612-algorithm-corpora-survey.md"
sourcePath: "docs/notes/20260612-algorithm-corpora-survey.md"
sourceSha: "156f4cfc010944e81607b79d619d62d87bb067d689b066b52524098f1eb49c8a"
sourceCommit: "95ff0e09e408504d17102725823e1978301d05ef"
translationStatus: "translated"
sidebar:
  order: 20266612
---

2026-06-12。`/Users/megurine/repo/ruby/rigor-survey/`配下に新規クローンした4つのアルゴリズム／データ構造リポジトリに対する、読み取り専用のエンジン挙動サーベイ（survey）。**`lib/`（rigor）の変更はなし**。 `20260612-cruby-stdlib-survey.md`の姉妹編。今回はメタプログラミングをほぼ含まない*教科書的*なRubyを対象とする。ここでユーザーの信頼性の基準が最も厳しく効いてくる: 素朴なquicksortや`node = node.next`ループに対する予期しない`Dynamic[top]`、あるいは偽陽性は、Rigorへの信頼を損なう。重度のジェネリクス／メタプログラミングは免責対象とする。ここで不精密なものは、ほぼすべてがシグナルである。

方法論はstdlibサーベイの**「残余の裁定（Residual adjudication）」の教訓**に従う: あらゆる半径（radius）の見積もりは、規模を測る前に*ソースに照らしてサンプル裁定*される。見出しとなるメカニズムは、件数から推論したのではなく、発火箇所を読んで確認した。

対象（読み取り専用）: `algorithms/`（kanwei/algorithms gem、`lib/`のみ）、`Ruby/`（TheAlgorithms/Ruby）、`Algorithms-and-Data-Structures-in-Ruby/`（ADSR）、`Data-Structures-and-Algorithms-in-Ruby/`（DSAR）。

呼び出し: cwd=対象、`BUNDLE_GEMFILE=<rigor>/Gemfile`、flakeでラップした`bundle exec exe/rigor {coverage|check --no-cache} <paths>`。

## リポジトリ別カバレッジ（rigor coverage --format=json）

| Repo | files | exprs | precise_ratio | constant | nominal | shaped | dynamic_top |
| --- | --- | --- | --- | --- | --- | --- | --- |
| algorithms (gem `lib/`) | 14 | 4 076 | **0.357** | 0.212 | 0.084 | 0.038 | 0.642 |
| Ruby (TheAlgorithms) | 188 | 17 755 | **0.595** | 0.399 | 0.120 | 0.061 | 0.404 |
| ADSR | 256 | 18 755 | **0.519** | 0.319 | 0.136 | 0.037 | 0.480 |
| DSAR | 113 | 49 743 | **0.606** | 0.419 | 0.131 | 0.031 | 0.394 |

`refined`と`dynamic_specific`はどこでも約0（これらのコーパスはRBSを同梱せず、リファインメントを使わない）。`bot`は0.01–0.03（dead節／空の本文）。

**カバレッジの差は1つの軸で説明できる: データ構造の密度である**。 kanwei gem（`algorithms/`）は*すべて*がコンテナクラス（RB／スプレイ木、ヒープ、トライ、kd木）であり――どのメソッドもivarに裏打ちされたノードフィールドを引き回すため、0.357（64 %がDynamic）でフロアに張りつく。TheAlgorithms/Rubyはほぼスタンドアロンなトップレベル`def`の配列／数値スクリプトで→0.595。2つの混在リポジトリはその中間に位置する。**precise-ratioは「このファイルのうちどれだけがノードivarの配管で、どれだけが型なしパラメータの配列演算か」を直接読み出したものである**。

### 最悪のファイル（30 exprs以上）、リポジトリ別――いずれもコンテナ／木クラスか、注釈なしの配列アルゴリズム

- **algorithms**: `kd_tree` 0.256、`rb_tree_map` 0.279、`heap` 0.297、`sort` 0.330、`trie` 0.338、`splay_tree_map` 0.374。
- **Ruby**: `binary_trees/avl_tree` 0.212、`binary_trees/bst` 0.271、続いて注釈なしのソート（`merge_sort` 0.297、`quicksort` 0.357、`bucket_sort` 0.322、`pancake_sort` 0.346）。
- **ADSR**: `middle_of_a_linked_list` 0.129、`invert_binary_tree` 0.137、`lowest_common_ancestor` 0.174、`*_linked_list` 0.19–0.20、`sorted_array_to_bst` 0.244。
- **DSAR**: `RBTree` 0.273、`SPLAYTree` 0.329、`AVLTree` 0.369、`BTree` 0.386、加えて注釈なしの`QuickSort`/`QuickSelect`/`MergeSort`。

## diagnosticの裁定（rigor check --no-cache）

リポジトリ別の合計: algorithms 32 err / 3 warn・Ruby 20 err / 15 warn・ADSR 27 err / 19 warn・DSAR 100 err / 11 warn。ここではどのファイルも*実行できる*（教科書的な実装）ため、各`error`は、教科書コード自身の真のバグでない限りFP候補である（真のバグは別途フラグを立てる――fun finds）。

| diagnosticクラス | 概数（4リポジトリ） | 判定 | メカニズム／注記 |
| --- | --- | --- | --- |
| **ノードフィールド**（`left` `right` `next` `parent` `value` `val` `data` `key` `color`/`colour` `child` `src` `dest` `cost`）に対する`call.possible-nil-receiver` | **109**（alg 31、Ruby 0、ADSR 11、DSAR 67） | **ARTIFACT――エンジンギャップ（支配的）** | attr_accessorに裏打ちされたノードivarの読み出しが`Dynamic[top] \| nil`になる。回転／走査内の`node.left.foo`チェーンが発火する。本サーベイの見出し――§ivar半径を参照。 |
| `<`/`*`/`+`で消費される`Array#index`/`#last`/`#first`/`#pop`の結果に対する`call.undefined-method`/`possible-nil` `… for nil` | 約8（Ruby `topological_sort_test`で9×の`index < `、`get_products`で2×の`.last *`） | **MIXED――genuine-conservative、ガードのニアミス** | `Array#index`は実際に`Integer?`を返す。`.last * num`は`count > 0`でガードされているが、既存の非空配列ナローイングは`empty?`/`any?`に依拠しており、`count > 0`/`size > 0`には依拠していない。 |
| `flow.always-truthy/falsey-condition` | 14（alg 3、Ruby 1、ADSR 4、DSAR 6） | **ARTIFACT――ivar／ローカルの定数畳み込みの過剰さ** | 例: dequeの`if @size == 1`がfalseに畳まれる: `@size`はコンストラクタで`0`に播種され、変更が反映されない。stdlibのC5 `$extmk`と同じファミリー。 |
| `call.unresolved-toplevel`（`traverse`、`private`など） | 22（Ruby 12、ADSR 9、DSAR 1） | **EXCUSED――スクリプトイディオム** | 各スタンドアロンスクリプトが自前のトップレベル`def traverse`を定義し／トップレベルで`private`を呼ぶ。ADR-17の`pre_eval:`の領分であり、ライブラリコードに対するエンジンバグではない。 |
| `flow.dead-assignment`（`… assigned but never read`） | 11（Ruby 2、ADSR 5、DSAR 4） | **GENUINE catch（無害）** | 教科書コード内の本物のdeadなローカル（`two_sum`が`result`/`result_array`を確保した後`return [i,j]`する。`find_missing_number`の`missing_element`など）。正しく、影響は小さい――fun finds。 |
| `instance variable … previously assigned Float; this write assigns Array` | 1（ADSR `min_stack`） | **ARTIFACT――1ファイルに2つの実装** | このファイルは2つの`MinStack`クラス本体（Floatセンチネル版とArray版）を保持する。フローインセンシティブなクラスivarのユニオン型がそれらを横断する。 |
| `wrong number of arguments to 'new' on OpenStruct` | 1（ADSR） | **NEEDS-RBS** | `OpenStruct.new(hash)`――RBSのアリティのギャップ。 |
| `String`に対する`.Equals` / `.ToCharArray`、`Console.WriteLine` | 6（DSAR `String/StringClass.rb`） | **GENUINE catch（真の発見）** | このファイルは文字どおり**`.rb`に貼り付けられたC#**で――Rubyとして実行できない。Rigorは正しい。 |
| parse errors | 12ファイル（Ruby 4、ADSR 3、DSAR 5） | **GENUINE catch――壊れたスクリプト** | 未終端の正規表現/`while`、迷子の`else`/`end`、C#風の`)`――真にparse不能な教科書ファイルであり、Rigorのバグではない。 |

### Fun finds（教科書コード自身の真のバグ）

- **deadな確保**: `Ruby/two_sum.rb`の`result_array = []`、`ADSR two_sum.rb`の`result`、`ADSR FindMissingNumber`の`missing_element`、`FindTwoRepeatingElem`の`temp`、`run_length_encoding`の`curr_char`、`insert_delete_get_random_o1`の`last_index`――いずれも代入されるが一度も読まれない。
- **`.rb`内のC#**: `DSAR String/StringClass.rb`（`Console.WriteLine`、`str.Equals`、`text.ToCharArray`）。
- **壊れたスクリプト**: 12ファイルがparseに失敗する（真の構文エラー）。

## Dynamicへの転落のメカニズムのバケット

発火箇所と`rigor type-of`プローブに照らしてサンプル裁定した。半径＝4リポジトリにまたがる箇所数。

| バケット | 代表的なスニペット | 半径（4リポジトリ） | 判定 | 難易度 | 修正のFP-risk |
| --- | --- | --- | --- | --- | --- |
| **M1. ノードivarのnilableな読み出し**（attr_accessorのivarが複数メソッドにまたがって`nil`／型なしで書かれる→`Dynamic[top] \| nil`。あらゆる`node.left.x`チェーンがpossible-nilを発火する） | `r = @right; r_key = r.key`（rb_treeの`rotate_left`）；`self.left = nullNode`の後の`node.left.colour`（RBTree） | **109件のpossible-nilエラー**＋すべてのコンテナファイルで**64 %/48 %の`dynamic_top`フロア**を駆動 | **ENGINE GAP――最優先**（キューに積まれたメソッド横断ivar確定代入ADRの候補） | high | **medium**（真にオプショナルなフィールドはnilableに保つ必要がある） |
| **M2. `node = node.next` / `root = root.right`のwhileループ走査** | `root = @next; loop { root = root.right; break if root == @next }; … root.key`（heap）；`current = current.next until current.next.next.nil?`（連結リスト） | M1に包含（109件のうち約20件はnilableなivarのループ再束縛による読み出し） | ENGINE GAP（ループで持ち回るnilableなローカルを伴うM1） | high | medium |
| **M3. 型なしパラメータ→メソッド全体がDynamic** | `def quicksort(arr); pivot = arr.delete_at(…)`→`arr`が型なし→派生するものすべてがDynamic；`def merge_sort(array); mid = array.length/2`がDynamic | *あらゆる*注釈なしソート／数値スクリプト（Ruby/DSARの`QuickSort`など）の0.33–0.40のprecise-ratioを駆動 | **EXCUSED**（漸進的型付けのエントリポイント――シグネチャなし、推論の種なし） | n/a | n/a |
| **M4. `Array#index`/`#last`/`#first`/`#pop`が`T?`を返し、それがそのまま消費される** | `sorted_items.index(:a) < sorted_items.index(:b)`（topoテスト）；`count > 0`下での`prefix_products.last * num` | 約8（Ruby） | **MIXED**: `index`についてはgenuine-conservative；`count > 0`/`size > 0`ガードの後の`.last`/`.first`については**ニアミス**（既存の非空ナローイングは`empty?`/`any?`に依拠し、`count`には依拠しない） | low（非空ナローイングを`count`/`size`の比較へ拡張） | low |
| **M5. ivar／ローカルの定数畳み込みの過剰さ→always-truthy/falsey** | `def initialize; @size = 0; end … if @size == 1`がfalseに畳まれる（deque） | 14件のalways-truthy/falsey | **ARTIFACT**――stdlibサーベイC5（`$extmk`）と同じファミリー。変更されたivarの値を他のメソッド本文内で定数畳み込みしてはならない | medium | **medium–high**（まずMastodon/hamlでFP検証） |
| **M6. `nil`を返すメソッドの後に`\|\|`でガードした利用** | `d = distance2(node, target)`（`return nil if node.nil?`）；`if nearest.size < k \|\| d < nearest.last[0]` | 約1–2（kd_tree） | genuine-conservative（メソッドはnilを返し*得る*）。`\|\|`が短絡するが、エンジンは両者を関連づけない | medium | low |
| **M7. トップレベル`def`のファイル横断解決** | 各スクリプト自前の`def traverse` | 22件の`unresolved-toplevel`警告 | **EXCUSED**――`pre_eval:`／スクリプトイディオムであり、ライブラリコードではない | n/a | n/a |

## ivarメカニズムの半径（キューに積まれたivar確定代入ADRを決める）

**ここがユーザーの信頼性の基準にとって肝となるセクションである**: ノードivarのnilableな読み出し（M1+M2）は、4つのコーパスすべてを通じて、圧倒的な差で支配的な一般コードのFPである。

- **半径: 全116件のpossible-nilエラーのうち109件（94 %）**がノードフィールドの読み出し――`algorithms` 31/32、`Ruby` 0/0、`ADSR` 11/13、`DSAR` 67/71。Rubyリポジトリの**ゼロ**は対照群である: ノードクラスを一切持たず（トップレベルの配列関数のみ）、ノードivarのpossible-nilもゼロ。このメカニズムはデータ構造の密度を正確に追従する。
- **根本原因（仮定ではなくプローブで確認）**。 `rb_tree_map.rb`の`r = @right`に対する`rigor type-of`→`Dynamic[top]?`。ノードクラスは`attr_accessor :left, :right`を行い、`initialize`内で`@left = nil` / `@right = nil`としている（あるいは`nullNode`が型なしの状態で`self.left = nullNode`）。したがってaccessorの読み出しは、`nil`の構成要素（コンストラクタ／`left=`の書き込み由来）と`Dynamic[top]`の値（型なし／メソッド横断の結合）の**両方**を帯びる。この`nil`構成要素が、回転や走査の内部に偏在する`r.key`、`node.left.colour`、`current.next`の読み出しでpossible-nilを発火させる――これらは呼び出し側が子の存在を*すでに*確立しているために実行されるコード（左回転は`@right`が非nilのときにのみ呼び出される）だが、手続き内の証明は存在しない。
- **なぜこれが「メソッド横断ivar確定代入」ADRの正準ケースなのか**。これはstdlibサーベイのC2メカニズムだが、C2は少数のstdlib ivarに対する稀な`argument-type-mismatch`/`return-type-mismatch`として表面化したのに対し、ここでは存在しうる最もイディオマティックなRubyのデータ構造コードに対する**主要なFPクラス**となっている。stdlibサーベイはすでにFPセーフな*リテラル書き込み*のサブセット（`dead_transient_nil_writes`）を導入し、実コードで**半径ゼロ**と測定したうえで、本当の修正（「ivarに対する手続き内確定代入。メソッド横断の書き込み効果サマリーを含む」）をADRの背後に先送りした。**このコーパスこそ、そのADRが待っていた正当化である**: 実行できる教科書コードでの109件のFPは、これまでに測定されたRigorの一般コード信頼性への最大の打撃である。
- **ADRが扱わなければならないもの**（これらの箇所から読み取る）: (a) `initialize`内の`@x = nil`＋後続の`self.x =` / `attr_accessor`ライターによる非nil書き込みがフローインセンシティブに結合される――防御的な`nil`をあらゆる読み出しに畳み込まない確定代入／宣言型のビューが必要。（b）ノードフィールドは*正当に*ときどきnilである（葉の子）――したがって一律の「ivarは決してnilでない」ルールは**健全でない**。修正はナローイング駆動（読み出しをガード／メソッド横断で確立された非nilコンテキストに関連づける）か、nilを保ちつつローカルの`if node.left` / ループ脱出ガードでナローイングできる宣言型でなければならない。FP-riskはlowではなく**medium**である――だからこそパッチではなくADRを要する。

## 攻略順のランク付け（一般コードの信頼性で重み付け）

ユーザーの基準: 素朴な`node = node.next`ループや教科書的なquicksortがDynamic/FPに転落することが最優先。メタプログラミングは免責対象。したがって順序は**実行できる教科書コードに対するFPを最優先**、Dynamicの精度を次に、免責／needs-RBSを最後にする。

1. **M1+M2――ノードivarの確定代入（キューに積まれたivar ADR）**。最もイディオマティックなデータ構造コードでの109件のFP（全possible-nilの94 %）。このコーパスは*先送りされたivar確定代入ADRを正当化する*――それは利用可能な一般コード信頼性の手のうち、単独で最も価値の高いものである。エンジン、高難度、FP-risk medium→ADRでゲートする。
2. **M4――非空配列ナローイングを`count`/`size`の比較へ拡張**。 `if arr.count > 0` / `arr.size > 0`の後の`arr.last`/`first`は、既存の`empty?`/`any?`の非空リファインメントを再利用して、非nilにナローイングすべき。低難度、低FP-risk、きれいなFPスライスを除去する。安価で独立した勝ち。
3. **M5――変更されたivarの値を他のメソッド本文内で定数畳み込みするのをやめる**（`if @size == 1`がalways-falsey）。14件のalways-truthy FP。stdlibのC5と同じファミリー。中難度、**FP-risk medium–high→まずMastodon/hamlに対してFP検証**（stdlibノートの常設の注意書きに従う）。
4. **M6――`nil`を返した後の`||`でガードした利用**のナローイング。小さい半径（約2）、低FP-risk。あれば嬉しい程度。
5. **M3――型なしパラメータ→メソッド全体がDynamic: EXCUSED、追求しない**。これは最大の*カバレッジ*寄与要因だが（あらゆる注釈なしソートで0.33–0.40のフロアを設定する）、正しい漸進的型付けの挙動である――プログラムがシグネチャを供給していない。追求すれば、本文／呼び出し箇所からパラメータ型を推論すること（別の、大規模な取り組み）を意味し、信頼性のギャップを刈り取ることにはならない。放置する。
6. **M7のトップレベル`def`解決、OpenStructのアリティ、parse errors、`.rb`内のC#、dead-assignmentのcatch: EXCUSED / NEEDS-RBS / GENUINE**。エンジンスライスなし。dead-assignmentとC#ファイルのdiagnosticは、残しておく価値のある正しいcatchである。

**見出し**。メタプログラミングをほぼ含まない4つのコーパスを通じて、精密な絵柄は二分される: **ノードivarのnilableな読み出し（M1/M2）はFP表面の94 %であり、信頼性の物語のすべてである**。そしてそれらはまさに、stdlibサーベイがADRの背後に先送りしたメソッド横断ivar確定代入のケースである。それ以外はすべて、免責される漸進的型付け（型なしパラメータのDynamic）か、安価で独立したナローイングの勝ち（M4の`count`ガードによる非空）か、正しいcatch（deadコード、Rubyに貼り付けられたC#、壊れたスクリプト）のいずれかである。ivar ADRは正当化される。
