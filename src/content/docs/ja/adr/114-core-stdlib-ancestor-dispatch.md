---
title: "ADR-114 — コアおよび標準添付ライブラリRBSへの継承ディスパッチ"
description: "rigortype/rigor docs/adr/114-core-stdlib-ancestor-dispatch.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/114-core-stdlib-ancestor-dispatch.md"
sourcePath: "docs/adr/114-core-stdlib-ancestor-dispatch.md"
sourceSha: "a0832da90a213a47b011677f38e08da5069a194b1ccca8f3ad8e1d0e2680c2b6"
sourceCommit: "0f252e3218936e8dc7004b574c709a434b996d2a"
translationStatus: "translated"
sidebar:
  order: 4114
---

ステータス：**Accepted ── スライス1着地済み、2026-09-20**。検出されたSUPERCLASSチェーンがRubyコアまたは標準添付ライブラリ（stdlib）によって宣言されたクラスに到達するRubyソースクラスは、継承されたインスタンス呼び出しをその祖先のRBSに対して解決するようになりました。`class SubHash < Hash`は`has_key?`に対して`bool`を回答し、`class MyError < StandardError`は`message`に対して`String`を回答し、`class S < ::StringScanner`は`scan`に対して`String?`を回答します。（2026-09-01のスイープで名指しされた`Kramdown::Utils::StringScanner`は**対象外**です：そのクラスはkramdown自身の部分的な`sig/`を通じてRBS認識されているため、WD4の第1の辞退が適用されます ── 「制限事項」を参照）。include / prepend側（issue #527スライス2）、任意のRBS認識済み祖先（スライス3）、`super`（スライス5）、およびシングルトン側（スライス6）は本稿の対象外であり、独自の測定に基づいて着地するかどうかが決まります。本ADRは[ADR-43](../43-rbs-complete-ancestor-resolution/)の却下された代替案A ── そのうち「コア / stdlib」と読める部分 ── を部分的に置き換え、その却下の残りの部分はそのまま有効とします。

根拠（Grounding）：このファミリーを特定しその規模を測定した、2026-09-01のコーパス不透明度スイープ（[`docs/notes/20260901-corpus-opacity-attribution.md`](../../notes/20260901-corpus-opacity-attribution/)、ハーネスは`origin/opacity-sweep-harness-20260901`上）；およびmaster `24661077`ですべての形状を再調査し、7つのうち3つがすでに修正されていることを発見したissue #527の設計パス。

## コンテキスト

ADR-43は、Rubyソースサブクラスが継承された呼び出しをRBS祖先に対して解決してよいかを問い、「RBSが完全である許可リストに載った祖先に対してのみ」と回答し、包括的な形式を却下しました：

> 部分的なgemのRBSは、省略された継承メソッドのすべてを、動作しているコードに対する`call.undefined-method`のFP（偽陽性）に変えてしまう

その推論はgemに対して健全です。それは問題全体に適用され、その結果、リテラルの`{}.has_key?`は畳み込まれる一方で、`Oj::EasyHash < Hash`は`has_key?`に対して`Dynamic[top]`と読むことになりました ── 1つのgemで26サイト、18の調査対象にわたって約125の`class X < <core/stdlib class>`宣言、そして数千件台前半の呼び出しサイトです。サブクラスは解析が全体を見通せるRubyクラスです；祖先は`Hash`です。そのペアのどこにも部分的なgem RBSはありません。

**その間の2年間で何が変わり、それがなぜ重要（load-bearing）なのか**。HEADにおけるディスパッチを通じてADR-43の壁に到達することはできません。`CheckRules#undefined_method_diagnostic`は`Reflection.rbs_class_known?`で辞退し、`arity_envelope_for`も同じ理由でソース専用レーンを取ります ── どちらも**レシーバー**をキーとしており、RubyソースサブクラスのレシーバーがRBS認識されることは決してありません。そのゲートはADR-43（`7b780f5c8`）より前のものです。したがって、本ADRが議論しなければならないFPは、ADR-43が議論したものではありません ── それは次の節が挙げるものであり、本スライスの初稿が出荷したものです。

## 決定事項

以下の辞退（decline）のいずれかが適用されない限り、`RbsDispatch.lookup_method`はレシーバーの検出されたスーパークラスチェーンが到達する最初のコアまたは標準添付ライブラリ（stdlib）クラスに対して`method_name`を解決します。

**基準**。コアまたはstdlibのRBS宣言は、すべての否定的な検査ルールがそのクラスの直接レシーバーに対して*すでに*信頼しているメソッドセットです：今日`{}.bogus`は発火し、それは`hash.rbs`の強さに基づいて発火します。その信頼を1つの継承エッジ分拡張することは、シグネチャに関して何も新しいことを主張しません ── `class SubHash < Hash`がRubyが言うとおりの意味を持つと主張するだけです。GEMのRBSは異なる主張であり、日常的に部分的であるため、対象外に留まります；これは変更されないADR-43の却下そのものです。

**メカニズムはルックアップの変更であり、新しいティアではない**。`dispatch_one`は`self`、`instance`、型変数マップ、および`SelfSubstitute`をレシーバーのクラス名でキー付けするため、`lookup_method`が返す定義のみを置き換えることで、正しい`self`束縛が自動的に得られます ── `SubHash`レシーバー上の`Hash#clear: () -> self`は`Hash`ではなく`SubHash`と回答します。新しいティアではこれら4つすべてを再導出しなければならなかったはずです。

### 実務決定事項（Working decisions）

**WD1 ── 探索（walk）は単一の所有者を持つ**。`ExpressionTyper#rbs_ancestor_answers?`はすでに、#633 / ADR-110の暗黙のself束縛拒否権のために、「このプロジェクトが宣言していない祖先がこの名前を宣言しているか？」を真偽値として問い合わせていました。スライス0（PR #1127）はそれを[`Inference::ExternalAncestorResolution`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/external_ancestor_resolution.rb)へと抽出し、これは`[definition, owner_name]`を返します。MROカットオフルールの2つのコピーは1つ多すぎであり、2つ目のコピーこそがドリフトするものです。

**WD2 ── カットオフは`::Object`であり、再言明するのではなく再利用される**。所有者が`Object`、`Kernel`、または`BasicObject`である宣言は解決されません：これらはトップレベルの`def`自身のMROの段、またはその後に位置しており、#316 / #319はそれらが所有する名前がサブクラスに関するいかなる証拠も持たないことを解決しました。リゾルバの`declared_before_object?`がそのルールであるため、本スライスは2つ目を書くのではなくそれを継承します。これは`Kernel#<=>`の同一性`0?` ── issue #661のハザード ── がこれらのレシーバーに到達するのを完全に防ぐものでもあります。

**WD3 ── 型変数は縮退する；推論はされない**。`Nominal[SubHash]`レシーバーは型引数を持たないため、`build_type_vars`は空のマップを生成し、`Hash[K, V]`の自由変数はトランスレーターの契約に従って`Dynamic[top]`となります。`SubHash#keys`は`Array[Dynamic[top]]`です。これはまさに生の`Hash`レシーバーがすでに回答しているものそのものであるため、損失ではなく誠実な挙動です ── そしてサブクラスの書き込みから`K` / `V`を推論することは、本スライスが意図的に開かない、別個のはるかに大きな問題です。

**WD4 ── 辞退（decline）と、それぞれが保護するもの**。

| 辞退条件 | 保護対象 |
| --- | --- |
| `class_name`自体がRBS認識されている | 直接ルックアップがすでに権威を持っていた ── およびスーパークラスを持たずにクラスを宣言する部分的なプロジェクトサイドカー（kramdownのケース） |
| ADR-26プラグイン宣言されたオープンレシーバー | その宣言よりも大きなサーフェス |
| 探索された祖先、または宣言が書かれているクラスがコア／stdlibではない | `< ActionController::Base`（RBSがまったくない）および`< Prism::Visitor`（RBSを出荷するgem） ── スライス3の問い |
| **宣言の戻り値型が探索された所有者または所有者自身のRBS祖先のいずれかを、型引数の内部を含めどこかで指名（NAME）している** | WD7を参照 ── 初稿に欠けており、動作するコードに対して`call.undefined-method`を発火させた辞退 |
| レシーバーまたはソース祖先上のissue #992 `ENVELOPE_DYNAMIC_MARK` | クラス本体の外側に書かれた`Klass.include(M)` / `class_eval`（本体内探索が決して見ないメンバーを追加しうる） |
| ADR-17 `pre_eval:`パッチが、レシーバー上、それと所有者の間のソース祖先上、または所有者の任意のRBS祖先上でその名前を宣言している | プロジェクトが置き換えたメソッドの宣言を採用すること |
| サブクラスまたはより近いソース祖先がその名前を宣言している（[ADR-110](../110-inherited-declaration-precedence/)） | 決して実行されないメソッドについて回答すること |
| 探索が`Scope::ANCESTOR_WALK_LIMIT`を超える | 有界でない、または循環する階層；`BudgetTrace`ヒットとして記録され、ADR-110プローブは未完了の探索から「宣言されていない」と回答するのではなく抑制する |

辞退は連言的（conjunctive）であるため、その順序は自由です ── そして、コア／stdlibの宣言が手元にあれば、プロジェクトのテーブルを探索する2つが**最後**に実行されるように選択されています。Rubyソースレシーバー上の未解決の呼び出しはすべてこのコードに到達し、それらの探索はADR-46の継承エッジを記録します；それらを無条件に実行すると、クラスをまたぐすべてのメソッド呼び出しがファイル粒度の継承依存関係に変わってしまいます。

**WD5 ── `ALLOWED_RBS_COMPLETE_ANCESTORS`は降格されるが削除はされない**。この定数とそのプラグインマニフェストのツイン（`rbs_complete_ancestors:`、ADR-43 WD4）はそのエントリーと契約を維持し、1つの仕事を取得します：許可リストに載った祖先は上記の辞退を**バイパス**します。それこそが本来の目的でした ── `Rigor::Plugin::Base`はコアでもstdlibでもありませんが、それを指名した趣旨は、いずれにせよそのRBSが権威を持つということでした。それを削除するとプラグイン契約の効力が失われてしまいます；それを並行メカニズムとして残すと、1つの問いに2つの答えが残ることになります。

**WD7 ── 探索された継承関係を返す宣言は採用されず、回答は`-> self`ではなく辞退（DECLINE）となる**。コア／stdlibのRBSが基底クラスを指名している場所で、CRubyはサブクラスを保持します：`SubHash#merge`は`SubHash`を返し、`SubSet#flatten`は`SubSet`を返し、`SubPathname#basename`は`SubPathname`を返し、`SubDate#+`は`SubDate`を返し、同じことが`Time#utc / localtime / gmtime`、`Date#- >> << next_day succ`、および`Pathname#dirname expand_path sub cleanpath`にも当てはまります。その宣言を採用すると`Nominal[Hash]`と回答され、`Hash`はRBS認識されて**いる**ため、否定的なルールはそれを**閉じた**サーフェスとして読み取ります ── その結果、動作するコードにおいて`sub.merge({}).own_method`が`error`重要度の`call.undefined-method`を引き起こしました。それこそが後述の境界セクションが挙げる誤って正確な伝播であり、本スライスの初稿がこれを出荷してしまいました。

**判定は戻り値型の中の、型引数を含めたどこかに所有者が存在するかどうかである**。初稿ではトップレベル、ユニオン、およびオプショナルのみをアンラップし、`Array[...]`の内側で指名されたクラスは返されるオブジェクトではなく要素を記述していると推論しました。それは事実ですが、論点がずれています：**要素**もサブクラスのインスタンスなのです。`Pathname#children: () -> Array[Pathname]`は`SubPath`の配列を返します ── インタプリタに対して検証済みであり、`entries`、`each_child`、`ascend`、`descend`、および`find`も同様です；`glob`のみがプレーンな`Pathname`を生成します ── したがって`sub.children.first.own_method`は1レベル下で同じ診断を発火させました。`Date#step`、`Date#upto`、および`Set#classify`も同じファミリーであり、その宣言の形状によって浅いテストをすり抜けただけでした。

RBSはこの2つのファミリーを区別できません：`String#upcase: () -> String`はサブクラスに対して実際にプレーンな`String`を返し（Ruby 3.0で変更）、一方で`Hash#merge: () -> Hash[K, V]`は実際にサブクラスを返し、これら2つの宣言は同じ形状です。代替案 ── 宣言が`-> self`と読めるかのようにレシーバーを置換すること ── は、`merge`にとっては正しく、`upcase`にとっては誤りとなります。その誤りはメソッドルックアップにとどまりません：実際には`String`である`Nominal[SubStr]`は、ナローイングや到達可能性のルールも読み取る主張であるため、エラーモードはプレーンな`Dynamic[top]`のように診断の見落としにとどまりません。DECLINEはmasterの回答であるため、証明可能にコーパスターゲットをリグレッションさせることができず、ADR-5のもとでは、影響範囲の拡大が実証された発火ではなく原則である場合でも、これで決着がつきます。

**代償は所有者を返すサーフェス全体であり、隠されるのではなく明示される**。`SubStr#upcase`だけでなく：`Array`サブクラスは`map / select / sort / first(n)`を失い、`Hash`サブクラスは`to_h / select / reject / invert / compact`を失い、`String`サブクラスは`+ * sub gsub strip to_s chars`を失い、さらに`Exception#cause`、`Time#+ -`、および`Set#divide`も失います。これらは`Dynamic[top]`と回答し、これは本ADR以前に回答していたものと同じであるため、本スライスの測定された利益は完全にそのサーフェスの外側に位置します ── `has_key?`、`size`、`message`、`backtrace`、`scan`、`pos`、`length`、`keys`。

`-> self`および`-> instance`の戻り値は手つかずのままであり、その精度を維持します。これらはすでにレシーバーを置換しているためです：`SubHash#clear` → `SubHash`、`SubStr#force_encoding` → `SubStr`、`MyError#exception` → `MyError`、これらはすべてCRubyと一致します。

**WD6 ── コア／stdlibへの所属はリストではなく宣言から読み取られる**。`RbsLoader#core_or_stdlib_class?`は、クラスの主宣言のファイルを`rbs` gem自身の`core/`および`stdlib/`ツリーと照合してテストし、`class_decls`に対する1回のパスでローダーごとにメモ化されます ── `#project_declared_classes`と同じメカニズムであり、同じ制限を持ちます。手動でメンテナンスされた名前リストは、すべてのrbsバージョンに対して陳腐化してしまいます。`prism`と`rbs`は`DEFAULT_LIBRARIES`のメンバーですが、シグネチャがgemとともに出荷されるGEMであるため、正しくセットの外側に置かれます。

## 偽陽性の境界、再考

ADR-43の境界は「解決によって`call.undefined-method`が到達可能になる」というものでした。それは本スライスが行うことでは**なく**、そう主張することはリスクを誤って描写することになります。不在を証拠と見なす挙動（absence-as-evidence）は導入されません：否定的なルールはレシーバーがRBS認識されていることをゲートとしており、これらのレシーバーはそうではありません。masterおよびブランチで調査したところ、そのようなサブクラス上の`h.bogus`、`h.has_key?(:a, :b)`、`e.message(1, 2)`、および`e.totally_bogus`は前後どちらでも沈黙しており、一方で直接のコアコントロールは両方で発火します。

本スライスが実際に伴うリスクは**誤って正確な伝播（wrong-precise propagation）**です：今や正確になった型が**次の**呼び出しのレシーバーとなり、否定的なルールがそこでその型に到達します。`MyError.new("x").message`は`String`であるため、`.bogus_downstream`が発火します ── ここでは正しく発火しますが、宣言が実行されるものと一致しないあらゆるケースで誤って発火します。WD4のすべての辞退はその1つの障害モードを狙ったものであり、そのためADR-110のシャドウイングプローブと`pre_eval:`プローブは、レシーバー単独ではなく継承ツリー全体に対して行われます。

## 制限事項

- **`rbs_class_known?`の発見事項はコードリーディングとプローブによるものであり、監査ではない**。否定的なルールがRubyソースサブクラスのレシーバーに到達できないという主張は、`undefined_method_diagnostic`と`arity_envelope_for`の読解、および上記のプローブに基づいています。すべての`call.*` / `static.*`ルールがそれに対して列挙されたわけではありません。レシーバーではなく**宣言の**所有者に基づいて判断するルールはこれらの呼び出しを見ることになります；もし見つかった場合、このセクションこそが修正の属する場所です。
- **コーパスの証拠は、それが到達できないものを識別しない**。`sig/`を出荷しないターゲットに対する`check`スイープは、gem RBSの辞退を形式的に測定するにすぎません。gemが出荷するRBSの辞退（`< Prism::Visitor`）、`pre_eval:`の辞退、および本体外の`include`の辞退は、コーパスではなくフィクスチャによって固定されています。**14ターゲットのコーパスゲートはWD7の偽陽性も捕捉しませんでした**：たまたま`sub.<base-returning method>.<sub-only method>`チェーンを含むターゲットがなく、WD7のネストされた引数の半分（`sub.children.first.<sub-only method>`）も捕捉しませんでした。クリーンなコーパスゲートは、それらのターゲットで何もリグレッションしなかったことの証拠であり、ルールが健全であることの証拠ではありません。どちらの半分もインタプリタとの照合レビューによって発見され、それこそがここで実際に識別できるチェックです。
- **スイープで2番目に大きな対象となったkramdownは、本スライスでは修正されない**。`Kramdown::Utils::StringScanner`はkramdown自身の`sig/kramdown/utils/string_scanner.rbs`によって宣言されており、これは`< ::StringScanner`スーパークラスを省略しているため、クラスはRBS認識されWD4の第1の辞退が適用されます。26件の不透明なサイトは実在します；その原因は部分的なプロジェクトサイドカーであり、これは#653の「より多くのRBSを書いたことで実行が悪化した」形状であり、プロジェクト自身のsigが省略しているソーススーパークラスを読み取ることは別個の決定事項です。
- **コアクラスのソース再オープンは、そのサブクラスに対して機能をオフにする**。`class Hash; def whatever; end; end`を含むプロジェクトファイルは`Hash`を`discovered_methods`に置き、ADR-110プローブはすべての`Hash`サブクラスおよびすべての名前に対して辞退します。これは偽陰性に対して安全（false-negative-safe）であり意図的なものです ── プロジェクトのソースは自身が書いていないRBSに勝るためです ── しかし、どこかでコアクラスにモンキーパッチを適用しているプロジェクトでは、この機能がサイレントに不在になることを意味します。
- **キャッシュされた環境のセンチネルは、機能をオンではなくオフにする**。バッファ名はADR-54の環境キャッシュ（#725）を生き延びますが、古いblobの`<cached>`センチネルはすべてのクラスをコア／stdlibセットの外側に着地させます。失敗の方向は`Dynamic[top]`へのサイレントな復帰であり、決してより広い解決ではありません ── これは[ADR-5](../5-robustness-principle/)が求める方向ですが、陳腐化したキャッシュによって本スライスが着地していないかのように見える可能性があることを意味します。

## 却下／保留された代替案

- **（却下）`RbsDispatch`の前にある新しいディスパッチティア**。`self`束縛、`instance`射影、型変数マップ、および`SelfSubstitute`を再導出しなければならなかったはずであり、これらはすべて`dispatch_one`がすでにレシーバーのクラス名でキー付けしています。ルックアップの変更によりこれらが無償で得られます。
- **（却下）所有者を返す宣言を`-> self`として扱う**。WD7を参照。精度は向上しますが、実行時が常に生成するとは限らないサブタイプを主張することになり、誤ったサブタイプはメソッドルックアップだけでなくナローイングや到達可能性にも到達します。2つのファミリーを区別する方法がある場合にのみ再検討してください。
- **（却下）`ALLOWED_RBS_COMPLETE_ANCESTORS`をコアクラス名で拡張する**。そこへの所属は「このRBSは完全であるため、それが省略する呼び出しは間違いである」ことを意味します ── 否定的なルールに関する主張です。コアRBSはその意味で完全ではなく（`Hash`はプログラムがその上で定義するあらゆるものに応答する）、本スライスが必要とする主張はより弱いものです。
- **（保留、スライス2）RBSモジュールへの`include` / `prepend`**。`include Enumerable` → `#sort`、`include Comparable` → `#clamp`。同じ探索がそれに到達します ── `Scope#external_ancestor_name_candidates`が両方のエッジを収集するため ── したがって1つのキーワードの距離にあり、独自の測定ができるようにするためにのみ保留されています。実装がまさにこの理由で`mixins: false`を渡しています。
- **（保留、スライス3）任意のRBS認識済み祖先**。ADR-43が却下したgemのケース。本ADRが行っていない部分的なgem RBSに関する論拠と、本ADRが持っていない測定が必要です。
- **（保留、スライス5および6）`super`の解決およびシングルトン側**。`resolve`は`kind`を受け取りメモをそれでキー付けするため、シングルトンアームはキャッシュを再キー付けすることなく着地します；現在は辞退しており、これはエンジンが現在そこで回答しているものと同じです。

## 他のADRとの関係

- **[ADR-43](../43-rbs-complete-ancestor-resolution/)** ── 部分的に置き換えられた。却下された代替案Aはgemのケースへと狭められた；その許可リストはバイパスとして存続する（WD5）。
- **[ADR-110](../110-inherited-declaration-precedence/)** ── プロジェクトの`def`が継承された宣言にいつ勝つかを決定するシャドウイングルールを提供する；本スライスはそれを変更なく消費する。
- **[ADR-24](../24-self-method-call-resolution/)** ── `discovered_superclasses`エッジを提供する。
- **[ADR-26](../26-activerecord-relation-typing/)** ── 逆のノブ；オープンレシーバーはここで辞退する。
- **[ADR-17](../17-monkey-patch-pre-evaluation/)** ── 本スライスが調査する`pre_eval:`パッチテーブル。
- **[ADR-5](../5-robustness-principle/)** ── 境界セクションが準拠して書かれた偽陽性への規律。
