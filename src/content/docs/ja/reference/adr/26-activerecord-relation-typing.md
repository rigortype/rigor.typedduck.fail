---
title: "ADR-26 — ActiveRecord relationの型付け"
description: "rigortype/rigor docs/adr/26-activerecord-relation-typing.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/adr/26-activerecord-relation-typing.md"
sourcePath: "docs/adr/26-activerecord-relation-typing.md"
sourceSha: "509f3799930609faaba0850d2129f0d53b05a419ddcbda5751201f4a8eb2a6d7"
sourceCommit: "75f1372f98e9b1b00cb79a72bf925849cead6956"
translationStatus: "translated"
sidebar:
  order: 4026
---

Status: **accepted、2026-05-22 — implemented**。 `rigor-activerecord`における`ActiveRecord::Relation`を返す呼び出しサイト（`has_many`アクセサ、`Model.where`、`scope`）の型付けの設計を記録する — 最初の実装試行がプロジェクトの偽陽性に関する規律をリグレッションさせ、リバートされた後のものである。この決定は4部構成の設計であり、エンジン側の変更はプラグインが宣言する「オープン」なレシーバークラスに対する狭い`call.undefined-method`の免除のみである。5つの実装スライスすべてが投入され、Mastodonの`app/models`（237モデル）に対してリレーションへのscope呼び出しの偽陽性ゼロで再検証された。

## コンテキスト

`rigor-activerecord`は、クラス側のファインダー（`Model.find` → `Nominal[Model]`、`find_by` → `Nominal[Model] | nil`）、単数アソシエーション（`post.user` → `Nominal[User]`）、インスタンス側のカラムアクセサ（`user.name` → `Nominal[String]`）を型付けする。ひとつの大きなサーフェスがまだ型付けされていない：`ActiveRecord::Relation`を返すすべての呼び出し — `has_many` / `has_and_belongs_to_many`アクセサ（`user.posts`）、`Model.where(...)` / `Model.all` / `Model.order(...)`、そしてユーザー宣言の`scope`（`Post.published`）である。これらの呼び出しサイトは、RBSによって消去された`untyped`エンベロープに縮退する：連鎖したクエリメソッド、ファインダー、そしてリレーションに対するブロックイテレーションは、要素型を持たない。

### リバートされた最初の試行

最初の実装（コミット`82dc9e0`、`c2b5d8f`によってリバート）は、ジェネリックな`ActiveRecord::Relation[Elem]` RBSをプラグインに同梱し（ADR-25の`signature_paths:`経由）、リレーションの呼び出しサイトに対して`Nominal[ActiveRecord::Relation, [Nominal[Model]]]`を提供した。

これは、プラグインを有効にした状態でMastodonの`app/models`（237モデルファイル）に対して`rigor check`を実行することで検証された。結果は**偽陽性のリグレッション**だった：20件の`call.undefined-method`診断のうち17件が、型付けされたリレーションに対して呼び出されたユーザー定義のscopeだった — `User.approved.confirmed`、`relation.with_domain`、`relation.by_rank`、`relation.newest_first`、`relation.unresolved`などである。

根本原因は構造的なものである。`ActiveRecord::Relation`の実際のメソッドサーフェスは**境界がない**：リレーションは、そのモデルに宣言されたすべての`scope`（`scope` DSL経由、concernの`included do … end`ブロック内、または素の`def self.…`クラスメソッドとして）に応答する。なぜなら、ActiveRecordは未知のリレーション呼び出しをモデルクラスに委譲するからである。静的なRBSではその集合を列挙できない。リレーションを閉じた`Nominal[ActiveRecord::Relation]`として型付けすると、そのクラスが`call.undefined-method`ルールにとって「既知」になるため、リレーションに対するすべてのscope呼び出し — 正統で、動作しているRailsコード — がエラーとして表面化する。それは動作しているコードを脅かすものであり、プロジェクトの第一の価値が禁じていることである。

### インターセクションの調査

リレーションを`Intersection[Relation[Model], untyped]`として型付けすることが修正案として調査された。undefined-methodルール（`Analysis::CheckRules`）は`concrete_class_name(receiver)`をキーにしており、これは`Union` / `Dynamic` / `Intersection` / `Top` / `Bot`に対して`nil`を返す — したがって`Intersection`レシーバーは偽陽性を**確かに**抑制する。しかしメソッドディスパッチャは`Intersection`のメンバーをRBSティアを通じてフルディスパッチしない（`ShapeDispatch#dispatch_intersection`はシェイプキャリアのみを射影し、素の`Nominal`メンバーには到達しない）。経験的に — 統合テスト`resolves the block element type through the relation end-to-end`によって確認された — `relation.each { |p| … }`はその後`p`をモデルとして型付けすることに失敗し、連鎖したクエリメソッドは要素型を失う。`Intersection`単独では、偽陽性を*すべての*リレーション精度の喪失と引き換えにし、この機能をRBSによって消去されたエンベロープと変わらないものにしてしまう。

## ゴール

正しいリレーション型付けは、次の4つすべてを満たさなければならない：

- **G1 — 連鎖クエリの精度**。 `User.where(x).order(y).limit(n)`は`Relation[User]`のままである。
- **G2 — ファインダーの抽出**。 `relation.first` → `Model?`、`relation.find(id)` → `Model`。
- **G3 — ブロック要素の型付け**。 `user.posts.each { |p| … }`は`p`を`Model`として型付けする；これはカラムアクセサの型付けと合成され、`user.posts.each { |p| p.title }`は`p.title`をカラムの値型に解決する。
- **G4 — 偽陽性ゼロ**。型付けされたリレーションに対する*いかなる*ユーザー定義のscope / クラスメソッドの呼び出しも、`call.undefined-method`を生成してはならない（MUST NOT）。

G1〜G3は、リレーションレシーバーが、エンジンがディスパッチしブロックフォールドできる具体的なキャリア — すなわち素の`Nominal` — であることを要求する。G4は、undefined-methodルールがスキップするように、リレーションレシーバーが非具体的であることを要求する。単一のキャリアでは、両者は逆方向に引き合う；インターセクションの試行は、その衝突を型キャリアの上で解決し、エンジンの制限によってG1〜G3を失った。

## 決定

衝突を**型キャリアではなく診断レイヤーで**解決する。リレーションは素の`Nominal[ActiveRecord::Relation, [Nominal[Model]]]`のままである — したがってメソッドディスパッチとブロックフォールドは完全に通常どおりであり、完全に精密である（G1〜G3） — そして`call.undefined-method`ルールがリレーションクラスを*免除*するように教えられる（G4）。4つの部分からなる：

### 第1部 — エンジン：`open_receivers`免除

クラスは**オープン**であると宣言できる — RBSで宣言されたメソッドサーフェスを超えて応答することが静的に既知である、という意味である。`Analysis::CheckRules`の`undefined_method_diagnostic`は、クラスがオープンであるレシーバーをスキップする：既存の`discovered_method?` / `rbs_class_known?` / `definition_available?` / `lookup_method`ガードの後、`build_undefined_method_diagnostic`の前で、クラスがオープンなら`return nil`する。

オープンなクラスの集合は、新しいオプショナルな**`open_receivers: [String]`**プラグインマニフェストフィールド（完全修飾クラス名の配列）を通じてプラグインによって提供される。`CheckRules`はプラグインレジストリ（`scope.environment.plugin_registry`として到達可能であり、`MethodDispatcher#plugin_owns_receiver?`がすでに使っているのと同じハンドル）を参照し、ロード済みのいずれかのプラグインが列挙しているレシーバークラスをオープンとして扱う。

これがエンジン変更の*すべて*である。リレーション型は素の`Nominal`のままなので、ディスパッチャ、RBSティア、ブロックフォールドは手つかずである — ディスパッチについて何も変わらないためG1〜G3は機能し、診断の*チェック*のみが免除される。

### 第2部 — プラグイン：同梱されるリレーションRBS

`rigor-activerecord`は`sig/active_record/relation.rbs`を同梱する — `Enumerable[Elem]`を`include`し、クエリビルダ（`self`を返す）、ファインダー（`Elem` / `Elem?`を返す）、集約、永続化、インスタンス化ビルダのサーフェスを宣言する、ジェネリックな`class ActiveRecord::Relation[Elem]`である。これはマニフェストの`signature_paths: ["sig"]`を通じて提供される（ADR-25）。マニフェストはまた`open_receivers: ["ActiveRecord::Relation"]`を宣言する。

このRBSは意図的に寛大である — 本当に`Relation`にあるがファイルから欠けているメソッドは、第1部の免除がなければ偽陽性になる；免除があれば、漏れは単に精度を犠牲にするだけである（呼び出しが`untyped`に解決される）。このRBSはG1〜G3の精度のために存在するのであって、G4の健全性のためではない。

### 第3部 — プラグイン：リレーション型付けされた提供

`flow_contribution_for`は次に対して`Nominal[ActiveRecord::Relation, [Nominal[Model]]]`を提供する：

- `has_many` / `has_and_belongs_to_many`アソシエーションアクセサ；
- クラス側の`Model.where` / `all` / `order` / `limit` / `none`；
- 名前がモデルの発見済み`scope`であるクラス側の呼び出し。

### 第4部 — プラグイン：リレーションへのscope呼び出しのインターセプト

すでに型付けされたリレーションに対するscope呼び出し（`User.where(active: true).published`）は、チェーンを通じてリレーション型を保たなければならない。`flow_contribution_for` — RBSティアより前に参照される — は`Nominal[ActiveRecord::Relation, [Nominal[Model]]]`と型付けされたレシーバーを認識し、メソッド名が`Model`の発見済み`scope`であるとき、再び`Relation[Model]`を提供する。scope以外のメソッドは辞退するため、RBSティアは引き続き`where` / `each` / `first`を精密に解決する。

## 作業上の決定

- **WD1 — 免除メカニズムは専用の`open_receivers:`マニフェストフィールドである**。却下された案：（a）既存の`owns_receivers:`フィールドを拡張してundefined-methodも抑制する — 最小の変更だが、現在の意味が「プラグインがこのレシーバーのディスパッチルーティングを処理する」であるフィールドに、無関係な診断抑制の関心をオーバーロードしてしまう；（b）RBSクラスアノテーション（`%a{rigor:v1:open}`）、または宣言された`method_missing`からオープン性を推論する — 最も汎用的（プラグインなしで機能する）だが最大の変更であり、`method_missing`推論にはハザードがある：`BasicObject#method_missing`はコアRBSにあり、すべてのクラスの祖先を通じて解決されるため、素朴な「method_missingを宣言する ⇒ オープン」ルールは、`BasicObject`のデフォルトを慎重に除外しない限り*すべての*クラスを免除してしまう。専用フィールドは明示的であり、プラグインスコープを持ち（免除はリレーションRBSも同時にロードされているときちょうど有効である）、新しい文法を必要とせず、曖昧さを伴わない。

- **WD2 — リレーション型は素の`Nominal`であり、決して`Intersection`や`Dynamic`ではない**。 G1〜G3とG4の衝突は、*型*を弱めることによってではなく、*診断*を免除することによって解決される。非具体的なキャリアは、ディスパッチとブロックフォールドの精度を失わせることが示された。

- **WD3 — リレーションに対する`first` / `last` / `find_by`は`Elem?`を返す**。これは誠実である — これらのメソッドは空のリレーションに対して本当に`nil`を返す。これは、リレーション型付けが新たに`call.possible-nil-receiver`を発生させうる唯一の箇所である（ガードなしの`relation.first.foo`に対して）。較正ポイント：Mastodonの`app/models`の実行はすでに、237モデルにわたる既存の`find_by`提供から5件の`possible-nil-receiver`を示している — 低い割合である。リレーションのファインダーがそれを実質的に大きく押し上げるなら、カラムアクセサの先例（カラムアクセサの作業におけるWD-non-nullable）に照らして再考する。それはnilの氾濫よりも寛容さを選んだものである。v1の決定：`Elem?`を維持する；実測されたエビデンスに基づいて見直す。

- **WD4 — scopeのインターセプトは`scope` DSLのみをカバーする**。 concernの`included do … end`ブロック内で宣言されたscope、およびscopeとして使われるクラスメソッド（`def self.recent`）は発見されないため、それらを通じたチェーンはその呼び出しの*後*でリレーション型を失う。これは精度のギャップであって偽陽性ではない — 第1部の免除はいずれにせよG4を無傷に保つ。concern内scopeの発見と`def self.…`-as-scopeの発見は、需要駆動のフォローアップである。

- **WD5 — 同梱RBSの衝突はADR-25のフェイラーメモを通じて縮退する**。自身のActiveRecord RBSを供給する（たとえば`rbs collection`経由）プロジェクトは、同梱の`ActiveRecord::Relation`と衝突する；その衝突は既存のプラグインRBSフェイラーメモ（ADR-25 WD4）によって処理される — より豊かな上流の定義が勝ち、`open_receivers`は依然としてそのクラスを免除する。

- **WD6 — `open_receivers`は1.0以前のプラグインコントラクトに加法的である**。新しいオプショナルなマニフェストフィールドであり、既存のプラグインは何も壊れない；v0.1.x / v0.2.x内で安全である。

## 却下された代替案

- **`Array[Model]`**。リレーションを配列として型付けすると、連鎖した`.where` / `.order`がすべて偽の`call.undefined-method`になる（それらのメソッドは`Array`にはない）。G4に違反する。

- **`Dynamic[Relation[Model]]`**。偽陽性を抑制する（`Dynamic`レシーバーは非具体的）が、G1〜G3を失う — `Dynamic`レシーバーは`Dynamic`にディスパッチする。経験的に型付けなしと等価である。

- **`Intersection[Relation[Model], untyped]`**。偽陽性を抑制するが、ディスパッチャは`Intersection`のメンバーをRBSを通じてフルディスパッチしないため、ブロック要素の型付けと連鎖クエリの精度が失われる（G1〜G3）。経験的に検証済み。

- **`Intersection`のメンバーをすべてのディスパッチティア（およびブロックフォールド）を通じてフルディスパッチするためのエンジン変更**。これはインターセクションアプローチを機能させるものであり、擁護できる汎用的な改善であるが、ディスパッチャ*と*ブロックフォールドに触れ、第1部の免除より実質的に大きい。`open_receivers`免除は、厳密により小さく、よりよく封じ込められた変更でG1〜G4を達成する；Intersectionディスパッチの一般化は、独立した将来の改善として残される。

## 実装のスライス

1. **エンジン — `open_receivers`**。オプショナルな`open_receivers:`フィールドを`Plugin::Manifest`に追加する（`owns_receivers`を踏襲したバリデーション付き）；`Plugin::Registry#open_receiver?`ヘルパーを追加する；`Analysis::CheckRules#undefined_method_diagnostic`がそれを参照し、オープンなレシーバーをスキップする。spec：マニフェストフィールドの受理 / デフォルト / バリデーション / `to_h`；オープンなクラスが免除され非オープンなクラスは依然としてフラグされることを証明する`CheckRules`の例。

2. **プラグイン — 同梱RBS**。 `sig/active_record/relation.rbs`とマニフェストの`signature_paths: ["sig"]` + `open_receivers: ["ActiveRecord::Relation"]`を再投入する；`sig/**/*.rbs`をgemspecの`files`に追加する。

3. **プラグイン — リレーション提供**。 `where` / `all` / `order` / `limit` / `none`、`has_many` / `has_and_belongs_to_many`アクセサ、クラス側のscopeに対する`flow_contribution_for`のリレーション型付け提供を再投入する。

4. **プラグイン — リレーションへのscope呼び出しのインターセプト**。 `flow_contribution_for`が`Nominal[ActiveRecord::Relation, [Model]]`レシーバーを認識し、発見済みscopeメソッドに対してリレーション型を再提供する。

5. **Mastodonの`app/models`に対する再検証**。リレーションへのscope呼び出しの偽陽性がゼロであること、およびブロック要素の精度が存在すること（`user.posts.each { |p| p.<column> }`が解決される）を確認する。その実行を既存のサーベイノートと並べて記録する。

このADRによってスケジュールされるスライスはない。

## 参考文献

- コミット`82dc9e0`（リバートされた最初の試行）と`c2b5d8f`（リバート。そのメッセージに検証で得られた発見とインターセクションの調査が記録されている）。
- [ADR-25](../25-plugin-contributed-rbs/) — 第2部が依拠する、プラグインによるRBS提供のメカニズム。
- [ADR-10](../10-dependency-source-inference/) § 5a — `owns_receivers`マニフェストフィールドと`plugin_owns_receiver?`。WD1の却下案（a）の先例であり、第1部が再利用するレジストリハンドル。
- [ADR-5](../5-robustness-principle/) — 第1部の免除を健全にする寛容性の原則：境界のない動的なメソッドサーフェスを持つクラスは、寛容な（偽陰性を許容する）読み方に値する。
- `lib/rigor/analysis/check_rules.rb`の`#undefined_method_diagnostic` — 第1部が修正するルール。
- `plugins/rigor-activerecord/README.md` §「Future direction」 — このADRが設計するリレーション型付けのトラック。
