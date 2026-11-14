---
title: "ADR-128 — 構造的インターフェースとしてのプラグインフック面と、その破壊的変更の出荷方法"
description: "rigortype/rigor docs/adr/128-plugin-hook-surface-interfaces.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/128-plugin-hook-surface-interfaces.md"
sourcePath: "docs/adr/128-plugin-hook-surface-interfaces.md"
sourceSha: "53a2bc3009a32660474cbd0ed46279a0ef47ac9a73d6eb47255d640b095e9e46"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-14T02:41:33+09:00"
translationStatus: "translated"
sidebar:
  order: 4128
---

ステータス: **Accepted、2026-11-03**。実装済み: スライス1は#2714、スライス2は#2694、スライス3は#2822で着地した。

スライス3は#2681（#2768）および#929のADR-130側の半分（#2808、#2815）に基づいており、これらがフック型を有効化した。その`plugin.api-surface`ルール（WD6）はbleeding-edgeオーバーレイで出荷される。WD5の継ぎ目は、代入可能性ではなくADR-130のuntypedパリティによって決着した（WD5の注記）。

根拠: #2681の計測（`make check-plugins`、47個のプラグインクラス、2026-11-03）。

## コンテキスト

ADR-50がv1.0.0でプラグイン契約を凍結する前に、2つのことを決める必要がある。プラグイン作者が何に依存してよいのか、そしてRigorがそれ以外に依存していないことをどう検査するのかである。現在、どちらも決まっていない。

- **フック面はuntypedである**。 `sig/rigor/plugin/base.rbs`には90個の`untyped`がある。フックが受け取るエンジンオブジェクトはすべて`untyped`である: `scope`、`call_node`、`root`、`node`、`services`、`config`。
- **何が公開APIであるかについて、拘束力のある仕様とADR-50が食い違っている**。
  [`public-api.md`](../../internal-spec/public-api/)は`Rigor::Scope`を公開とし、`spec/rigor/public_api_drift_spec.rb`はそのインスタンスメソッド207個（`SCOPE_INSTANCE`）をピン留めしており、その中には`locals`や`fact_store`といったバケットアクセサも含まれる。
  [ADR-50](../50-release-engineering-and-stability-strategy/) WD1は`Scope`と`Type::*`を「どのリリースでも変更されうる」エンジン内部実装としている。
  [`control-flow-analysis.md`](../../type-specification/control-flow-analysis/) §「Scope snapshots and fact buckets」は、`Scope`の公開面はそのバケットを公開してはならない（MUST NOT）と定めている。
- **プラグインが実際に使っているものは小さい**。
  - フックから渡されたスコープに対して、バンドル済みプラグインが直接呼ぶ`Scope`メソッドは5つである: `type_of`、`self_type`、`local`、`source_path`、`environment`。
  - また、2つの祖先ウォーク`user_def_through_ancestors`と`discovered_method_through_ancestors?`も呼んでいる: `rigor-activerecord`、`rigor-active-model-serializers`、`rigor-rspec`の8つの式で計10回の呼び出しがある。
  - これら2つのウォークは交換可能ではない:
    - 祖先バジェットが尽きたとき、discoveryウォークは`true`を返し、defウォークは`[nil, nil]`を返す（`lib/rigor/scope.rb` ~L1915、~L2040）。
    - discoveryテーブルは`attr_*`や`define_method`も数える。
    - 特異クラス側の探索は3つ目のウォーク`singleton_def_through_ancestors`を通る。

    各呼び出し箇所は、自身が必要とする不確実性の方向を持つウォークを選んでいる。
  - `rigor-active-model-serializers`は`scope.respond_to?(:user_def_through_ancestors)`でガードしている。これは誰も約束していないメソッドに対する作者側の自衛である。
  - プラグインはまた、フックのスコープを公開の`Rigor::Reflection`に渡しており、そのRBSは`scope: Scope`を取る（`sig/rigor/reflection.rbs`）。
  - `rigor-alba`と`rigor-typelizer`は内部の`Rigor::Inference::DeclarationWalk`に到達している。
- **現状でフックに型を付けても、プラグインソースでは何も検査されない**。 #2681の計測では3つの原因が見つかった:
  1. RBSのインターフェース型が`untyped`に消去される（`lib/rigor/inference/rbs_type_translator.rb` ~L81、`RBS::Types::Interface => :translate_untyped`; #929）。
  2. ソースのみのプラグインクラスは、DSLブロック引数、オーバーライド引数、リーダーに対して`Base`のRBS型を受け取らない（#2681）。
  3. （1）と（2）を回避して`call_node`と`scope`に型を付けると、`scope.type_of(call_node.receiver)`に対して9件の`call.argument-type-mismatch`診断が追加される。そのうち8件は真偽値または`nil?`ガードの後に続いており、誤検知である: メソッド呼び出しチェーンに対するそのようなガードは、再読み取りを狭めない（#2692;仕様が記述する`%a{pure}`の経路は未実装、#2687）。9件目はガードなしでレシーバーを読んでおり、その診断は正しい。

  その実行では、フックが直接受け取ったスコープに対するドラフト面外の呼び出しは見つからなかった。面外の呼び出しはすべて、スコープを通常の引数として受け取るヘルパー内か、インスタンス変数から読み取る箇所にあり、そのため`check`のもとではスコープが`Dynamic`になっている。

用語（[`CONTEXT.md`](https://github.com/rigortype/rigor/blob/master/CONTEXT.md)）: RBSの構造型は**インターフェース**（interface）である。「プロトコル」（protocol）はADR-28のパススコープ契約のために予約されている。

## 決定

フックが受け取る各エンジンオブジェクトは、`Rigor::Plugin`配下の名前付きRBS構造的インターフェース（`_Scope`、`_Environment`、`_Services`、…）としてプラグインに公開する。`base.rbs`はすべてのフック位置を、これらのインターフェース、具象Prismノードクラス、`Rigor::Type::t`、またはコア型で型付けする。エンジン側のシグネチャは具象クラスを保つ（WD5）。

**基準**。あるメソッドが公開プラグインAPIであるのは、`Plugin::Base`上、プラグイン向けインターフェース上、または`public-api.md`が公開として列挙する名前空間（`Type::Combinator`、`Reflection`、`Source::Literals`、…）内に宣言されている**場合かつその場合に限る**。実行時に到達可能であることは公開を意味せず、ドリフトピン留めも同様である。

**採用ルール**。メソッドがインターフェースに入るのは、次の両方を満たすときのみである:

- プラグインがそれを必要としている;
- エンジン内部型を名指ししたり、不確実性の方向を隠したりせずにその契約を記述できる。

2つ目を満たせない場合、Rigorはプラグインの実際の問いに答えるファサードを公開名前空間に追加する。

## 作業上の決定

**WD1 — 初期の`_Scope`と、`Reflection`上の祖先ファサード**。

```ruby
interface Rigor::Plugin::_Scope
  def type_of: (::Prism::Node node) -> Rigor::Type::t
  def self_type: () -> Rigor::Type::t?
  def local: (String | Symbol name) -> Rigor::Type::t?
  def source_path: () -> String?
  def with_local: (String | Symbol name, Rigor::Type::t type) -> Rigor::Plugin::_Scope
  def environment: () -> Rigor::Plugin::_Environment
end
```

`with_local`は新しいスコープを返す純粋な関数的更新である。スライス1の境界ゲートにより、`rigor-web`のプロトコルチェッカが`type_of`の前にこれを使って仮引数の型を再束縛していることが判明したため、リストに加わった。
`environment`は非nilであり、`Scope#environment`と一致する。nil許容の約束にすると、ガードなしでこれを呼ぶプラグインに対して`call.possible-nil-receiver`が発火してしまう。

祖先の問いは`Rigor::Reflection.project_method_defined(class_name, method_name, kind:, source:, scope:) -> Rigor::Trinary`になる。これは公開の読み取り側ファサードである`Reflection`に置かれる。引数は以下のとおりである:

- `kind:`は`:instance`または`:singleton`である。各kindは自身のチェーンをウォークする。
- `source:`はウォークを明示的に指定し、そのウォークの既存の順序と決着方法に従う:
  - `:def`はdefノードのウォーク（`user_def_through_ancestors`、または`kind: :singleton`なら`singleton_def_through_ancestors`）;
  - `:discovered`はdiscoveryテーブルのウォーク（`discovered_method_through_ancestors?`）であり、`attr_*`と`define_method`も数える;
  - `:either`はそれらの和集合であり、`rigor-rspec`が現在尋ねているのと同様に3値ORで結合される: `yes`が勝ち、次に`maybe`、次に`no`。

ウォークがバジェットで諦めた場合、`maybe`を返す。移行された各呼び出し箇所は、ヒット時に何をするかにかかわらず、現在のウォークが返す答えに`maybe`をマップする:

- `:def`箇所は`yes?`をテストする（defウォークは打ち切りを不在とみなすため）。
- `:discovered`または`:either`箇所は`!no?`をテストする（discoveryウォークは打ち切りを存在とみなすため）。

これにより、8つの式すべてで現在の挙動が維持される。ファサードが`Rigor::Trinary`を返すため、スライス1は`public-api.md`に`Rigor::Trinary`も列挙する。`_Environment`は、プラグインがそれを経由して呼ぶ2つのメンバー`nominal_for_name`と`rbs_module?`から始める。スライス1はその集合の残りを同じ方法で計測する。

フックの`scope`が`nil`になりうるかは、スライス1で位置ごとに決着させる。すべてのエンジン呼び出し箇所が証明可能に`Scope`を渡す位置のみを非nilとし、そうでなければ`_Scope?`とする。既存の13個の`scope.nil?`ガードはどちらにしても有効なままである。

**WD2 — その他のフック位置**。

- `call_node`、`root`、`node`は具象Prismクラスを取る。Prismは自身のRBS（prism gem内の`sig/`）を出荷している。
- `node_rule`ブロックは`(node, scope, path, file_context, context)`を受け取る（`base.rb` ~L614）。`context`は`Plugin::NodeContext`であり、スライス1でRBS宣言を得る。
- `dynamic_return`ブロックは`Rigor::Type::t?`を返す。
- `narrowing_facts`ブロックは`narrowing_facts_for`が収集するfact配列を返す（`base.rb` ~L644）;スライス1はその要素型を宣言する。
- 診断フックは`Array[Rigor::Analysis::Diagnostic]`を返す。
- `services`は`_Services`になる: `fact_store`、`configuration`、`reflection`、`type`。`fact_store`と`configuration`はプラグインが呼ぶメンバーに絞られる; `reflection`と`type`は`singleton(Rigor::Reflection)`と`singleton(Rigor::Type::Combinator)`になる。両者とも公開名前空間として列挙されており、より狭いインターフェースにすると定数パスよりも約束が少なくなるためである（スライス1の承認キュー項目`adr128-plugin-interfaces`、PR #2714）。
- `config`は`Hash[String, untyped]`になる。その値はプラグインごとのスキーマ駆動であり、厳密に型付けすることはスコープ外である。
- `TypeNodeResolver`フックは`TypeNode::NameScope`を受け取る。`plugin.md`はこれを文書化しているが、`public-api.md`は列挙しておらず、その`resolver`は内部のリゾルバチェーンを返す。基準のもとではまだ公開ではなく、後のスライスでそのインターフェースを決定する。

**WD3 — ジェネリクスを適用する箇所**。ジェネリクスは、キーが書き込みと後の読み取りを結びつける箇所にのみ適用する: `producer`と`producer_value`、およびfact storeの`publish`と`read`である。これらは*追加的*（additive）な型付きキーのオーバーロード、すなわち`(Symbol) -> untyped`と並んで`(ProducerKey[V]) -> V`を得るため、どの呼び出し元も壊れない。これらはスライス1の一部ではなく、プラグインがその精度を必要としたときに着地する。

**WD4 — 境界は型チェックではなくspecでゲートする**。バンドル済みプラグインの統合spec上で、spec専用の`TracePoint`レコーダを実行する。

- `:call`と`:c_call`をリッスンする。`self_type`、`environment`、およびバケットアクセサは`attr_reader`であり、`:c_call`のみを発火する。
- `plugins/`または`examples/`配下のフレームから、`Rigor::Scope`（および他の各インターフェースのバッキングクラス）に対して呼ばれたすべてのメソッドを記録する。
- 記録されたメソッドがインターフェース上になく、`Object`/`Kernel`/`BasicObject`から継承されたものでもない場合に失敗する。`nil?`、`respond_to?`、`is_a?`などの呼び出しは引き続き許可される。
- 何もラップせず、本番コストはゼロである。そのカバレッジはプラグインspecが実行する範囲に限られる。

型チェックはこのゲートを担えない（#2681）: ヘルパー引数が`Dynamic`であるため、#929と#2681が修正された後でも直接のフック本体しか見えない。既知の内部到達（`Inference::DeclarationWalk`）にはファサードを与えるか、起票されたissueを引用する許可リスト項目を与える。

**WD5 — 具象クラスは内部実装にとどめる**。 ADR-50 WD1は維持される。スライス1では:

- `public-api.md`の`Rigor::Scope` / `Rigor::Environment`項目をインターフェースに置き換える。
- インターフェース型はプラグイン向けの位置にのみ現れる: `base.rbs`のフックとインターフェース自身である。`Reflection`の`scope: Scope`を含むエンジン側のシグネチャは具象クラスを保つ。`Reflection`の実装は約20個の内部`Scope`メンバーを読むため、そこの引数をインターフェース型にすると、Steepのもとで`lib`のセルフチェックが直ちに失敗し、#929の後は`rigor check`のもとでも失敗する。
- ドリフトspecにインターフェースのスナップショットを追加する。既存の`SCOPE_INSTANCE`スナップショットは内部変更検出器として残し、約束として読まれないようにラベルを付け直す。

これにより、スライス3向けに1つの継ぎ目が残る。プラグインは自身の`_Scope`を`Reflection`の`scope: Scope`に渡すが、インターフェースはクラスに代入可能ではない。#929の代入可能性は、インターフェースのバッキングクラスが期待される箇所でインターフェース型の値を受け入れなければならず、そうでなければ正しいプラグインに対して`call.argument-type-mismatch`が発火してしまう。どのように行うかはスライス3で決定し計測する: 各プラグイン向けインターフェースにバッキングクラスを宣言するか、それらのインターフェースに限定した例外を設けるかである。

> **スライス3（#2822）で[ADR-130](../130-interface-typed-values-dispatch-under-untyped-parity/)により決着**。
> ADR-130はプラグインインターフェースの値を`Dynamic[Rigor::Plugin::_Scope]`として運び、これはメンバーディスパッチ以外の代入可能性を含むすべてのルールに対して`untyped`である。その値は`Dynamic[top]`と同様に`Scope`引数をパスするため、継ぎ目は生じない。フィクスチャは、フックのスコープを位置引数`Rigor::Scope`に渡すプラグインが`call.argument-type-mismatch`を出さないことを、ルールが報告する対照例と並べてピン留めしている。`Reflection`の`scope:`はキーワード位置であり、`call.argument-type-mismatch`は現在これを検査しない;いずれ検査するようになったとき、それらの呼び出しを通し続けるのはADR-130のuntypedパリティである。バッキングクラスの仕組みは作られない。この継ぎ目は構造的代入可能性（ADR-130で先送りされた半分B）で再び生じるため、そのときに決定しなければならない。

**WD6 — プラグインAPIの破壊的変更をどう出荷するか**。まず変更を分類する;分類がリリースの器を決める。ADR-50 WD5のティアがそのまま適用される: パッチは挙動の驚きを運ばず、メンテナンスラインは新しい診断を得ない。

| 変更 | 例 | 1.0前 | 1.0後 |
| --- | --- | --- | --- |
| シグネチャの精密化のみ | `base.rbs`で`untyped` → `Prism::CallNode` | マイナー、またはスライス3が観測可能にしていない間のみパッチ | マイナー |
| 約束の縮小（公開ではなくなるが、呼び出し可能のまま） | `Scope`のピン留めされた207メソッド → `_Scope` | マイナー（`changed`フラグメント付き） | メジャー |
| 実行時破壊 | フックのリネーム・削除、ブロックのアリティ変更 | マイナーNで非推奨化し、マイナーN+1で削除 | マイナーで非推奨化し、次のメジャーで削除 |

> **オーナー裁定、2026-11-14**。 v0.4.8はスライス3（#2822）を出荷し、それとともに#2714および#2768のシグネチャ精密化を、スライス3がその精密化を観測可能にした後にこの表が求めるマイナーではなく、パッチとして出荷する。承認キューがこの問いを提起した際、メンテナーはバージョンを0.4.8に据え置いた。`plugin.api-surface`はbleeding-edgeオーバーレイで`since: "0.4.8"`として出荷される。以降のリリースではこの表に従う。

ADR-50 Decision 1は列挙された面での「マイナーでの非破壊」（minor-non-break）を誓約している。約束の縮小は、実行中のプラグインに対してその誓約を守る。なぜなら、実行時にプラグインが呼ぶものは何も変わらないからである。変わるのはRigorが維持すると約束する範囲である。

実行時破壊はADR-80の前例に従う: `type_specifier`は0.2.xを通じて警告を出し、0.3.0で削除され、クラス定義時に例外を発生させる。

- **非推奨化シム**はプラグインクラスごとに1回警告し、代替名を提示する。移行手順を記した`deprecated`フラグメントとともに出荷される。
- **削除**はロード時またはクラス定義時に大声で失敗し、決して黙って失敗しない。
- **バンドル済みプラグインは非推奨化するPR内で移行する**。 specはバンドル済みプラグインが非推奨警告を発しないことをアサートする。
- **サードパーティプラグイン**は、1.0前は`rigortype`に`~> 0.N.0`で依存し（1.0前はマイナーがハードブレイクであるため、ADR-50 WD5）、1.0後は`~> 1.0`で依存するよう文書化する。

**スライス3が有効化する検査は新しい規律である**。インターフェース外の呼び出しは実行時には動作するため、`call.undefined-method`をそれに対して発火させてはならない。スライス3はそのような呼び出しを専用ルール（`plugin.api-surface`）のもとで報告し、そのレシーバーはプラグイン向けインターフェースで型付けされる。このルールはプラグインソース、すなわち`lib/`の外で`Plugin::Base`を継承するクラスにのみ適用される。`lib/rigor/plugin/base.rb`にある`Plugin::Base`自身のフック実装は、インターフェース型の引数を受け取ってエンジンヘルパーに渡す。たとえば、`dynamic_return_type`は`_Environment`が持たない`environment.class_ordering`に到達する。これらはエンジンコードであるため、ルールがこれらを裁いてはならない。このルールは次のハードブレイクまでbleeding-edgeオーバーレイに置かれる（ADR-50 Decision 3、WD2、WD7）。

> **スライス3（#2822）で修正**。プラグインソースはパスではなくクラス宣言から判定される: スーパークラスチェーンが`Plugin::Base`に到達するクラスのレキシカル内部のコードである。`Plugin::Base`自身の本体は`Base`が自身を継承しないため該当しない。サードパーティのプラグインgemは自身の`lib/`配下にプラグインを置くため、パス検査ではそのすべてが免除されてしまう。

**WD7 — 順序立て**。

1. **スライス1:**インターフェースと`NodeContext`を宣言する; `base.rbs`を型付けする; `Reflection.project_method_defined`を追加する; 3つのプラグインを移行する; `public-api.md`を修正する（インターフェースと`Trinary`）;各フック位置のスコープnil許容性を決着させる; WD4ゲートとWD5スナップショットを追加する。受け入れ基準:
   - `make check-plugins`と`make check`が新しい診断を報告しない。`make check`が重要なのは、`lib/`が型付けされたフックを明示的レシーバー付きで呼んでおり、ADR-43ブリッジとRBSディスパッチがすでにそれを検査しているためである。`lib`に対するローカルのSteep実行も新しい報告を出さない。
   - 移行されたプラグインの統合specが変更なしで通る。
   - それらのプラグインが対象とするプロジェクト（`rigor-active-model-serializers`と`rigor-activerecord`にはMastodon、`rigor-rspec`にはRSpecを多用するターゲット）の調査差分に変化がない。
2. **スライス2:**バンドル済みプラグインは、`call_node.receiver`をガードする前にローカル変数へ束縛し、型が有効になったときに9件の誤検知が出ないようにする。ガードされたリーダーチェーンのエンジン側ナローイングは#2690で試みられたが収束しなかった;これは#2692である。
3. **スライス3:** #2681、続いて#929が型を有効化し、WD6の`plugin.api-surface`ルールをbleeding-edgeオーバーレイに入れ、WD5のインターフェース対バッキングクラスの継ぎ目を決着させる。受け入れ基準:
   - `make check-plugins`と`make check`が新しいデフォルト有効の診断を報告しない;
   - フックのスコープを`Reflection`に渡すプラグインが`call.argument-type-mismatch`を引かない;
   - 発火したものはすべて着地前に裁定される。

## 却下／先送りした代替案

| 候補 | ステータス | 理由 |
| --- | --- | --- |
| 現在の`public-api.md`の記述どおりに`Rigor::Scope`を丸ごと昇格させる | 却下 | プラグインが直接使うのは5つである面のために、CFA仕様が公開を禁じるバケットアクセサを含む207メソッドをv1.0で凍結することになる。 |
| フックに実行時ファサードやラッパーオブジェクトを渡す | 却下 | フックは呼び出しノードごとに走るため、最もホットなプラグイン経路でアロケーションが発生する（ADR-50のperfゲート）。また、プラグインはスコープを`Reflection`に渡し返しており（`rigor-activesupport-core-ext`、`rigor-rspec`）、そこでは実オブジェクトが必要になる。 |
| 既存のウォークをORする真偽値`project_defines?`を`_Scope`に置く | 却下 | ヒット時に採用する箇所（`rigor-active-model-serializers`）でバジェットの不確実性を採用側へ反転させてしまい、またdefテーブル・discoveryテーブル・特異チェーンを混同する。 |
| インターフェースではなくRBSで公称ファサードクラスを定義する | 却下 | 実行時に存在しないクラスを宣言することになり、すべてのRBSリーダーがその嘘を信じてしまう。#2681の計測では代替手段としてのみこれを使った。 |
| 型チェックのみで境界を強制する | 却下 | すべての面外呼び出しが存在する場所であるヘルパーに対して盲目であることが計測された。 |
| 型付き`config`のための`Base[Config]`クラスジェネリクス | 却下 | プラグイン作者がRBSを書く必要が生じ、ADR-0の「Rigor固有のアノテーションなし」に反する。 |
| インターフェース外の呼び出しを`call.undefined-method`として報告する | 却下 | メソッドは存在するため、正しいコードに対する誤検知になる。WD6の専用bleeding-edgeルールがこれに代わる。 |
| マニフェストにプラグインAPIバージョンフィールドを設ける | 先送り | ADR-2はgem制約が不十分と判明するまで先送りした。非gemプラグインがマイナーをまたいで黙って壊れた最初の報告で再検討する。 |
| 出荷RBSの`%a{deprecated}`で駆動される`call.deprecated`診断 | 先送り | そもそもプラグインコードに到達するためにスライス3が必要である。スライス3以降の最初のプラグインAPI非推奨化で再検討する。 |

## 影響

- **プラス:** v1.0プラグイン凍結（#927）が列挙可能なリストになる: `Base`、公開名前空間、およびインターフェースのメンバーリスト。`public-api.md`とADR-50 WD1の矛盾が解消される。
- **プラス:**プラグイン作者は型付けされたフック引数と、内部ウォークに対する`respond_to?`ガードの代わりに祖先の問いへの3値の答えを得られる。
- **マイナス:**有用な半分、すなわち`check`がプラグイン内の誤用を報告することは、2つのエンジンissueを待つことになる。それでもハードブレイクまではオプトインである。
- **マイナス:** WD4ゲートはプラグインspecのカバレッジと同じ程度にしか完全ではなく、バンドル済みプラグインのみをカバーする。
- **持ち越し:** `Inference::DeclarationWalk`のプラグイン利用者にはファサードまたは追跡された許可リスト行が必要である。`_Environment`、`_Services`、`NameScope`はまだ最終形状に向けて計測する必要がある。ADR-2のサードパーティ適合スイートが、WD4スタイルの検査をバンドル済みプラグインの外へ届かせる場所であり続ける。

## 他のADRとの関係

- [ADR-2](../2-extension-api/) — 本ADRがその公開名前空間を列挙する拡張API。プロトコルバージョンの先送りは維持される（WD6）。
- [ADR-37](../37-plugin-interface-segregation/)と[ADR-80](../80-narrowing-facts-rename/) — 型付けされるフックDSL。ADR-80のエイリアス後削除はWD6の実行時破壊の前例である。
- [ADR-43](../43-rbs-complete-ancestor-resolution/) — #2681が引数束縛へと拡張する許可リストブリッジ。
- [ADR-50](../50-release-engineering-and-stability-strategy/) — Decision 1（マイナーでの非破壊）、Decision 3（新しい規律は破壊的）、WD1（何が内部か）、WD2/WD7（bleeding-edgeオーバーレイ）、WD5（リリースティア; 1.0前はマイナーがハードブレイク）。本ADRはこれらをプラグインAPIに適用するものであり、変更はしない。
- [ADR-1](../1-types/) — RBSインターフェース上のケーパビリティロール。#929がその代入可能性を実装する。
- [ADR-0](../0-concept/) — アプリケーションコードにおけるRigor固有のアノテーションなし（`Base[Config]`の却下）。
