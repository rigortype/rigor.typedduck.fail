---
title: "ADR-48 — Struct / Data値畳み込み（メンバーシェイプキャリア）"
description: "Imported from rigortype/rigor docs/adr/48-data-struct-value-folding.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/48-data-struct-value-folding.md"
sourcePath: "docs/adr/48-data-struct-value-folding.md"
sourceSha: "c99509171300e354ed041ef5408287a0aac1eaa9c35f045603a6889f893f8666"
sourceCommit: "aec4ca7f5f87b1972dea8fecaaf5b62c8880a3af"
translationStatus: "translated"
sidebar:
  order: 4048
---

ステータス: **Accepted — `Data.define`スライス1〜4実装済み（v0.1.17）;`Struct`フォローアップのスライス1〜3実装済み（フレッシュチェーン + 畳み込み安全なバインドローカルのメンバー畳み込み）**。2つの新しい型キャリア（carrier）— **メンバークラスキャリア**（`Type::DataClass`）と**メンバーインスタンスキャリア**（`Type::DataInstance`）— を導入し、`Data.define`で定義した値オブジェクト（value object）のメンバー読み取りが精密な型に畳み込まれる（`Point = Data.define(:x, :y); Point.new(1, 2).x` → `Constant[1]`）。3種の定義形式すべて（定数代入形式・`class X < Data.define(...)`サブクラス形式・ベアローカル形式）、位置引数とキーワード引数の両構築、および`[]` / `to_h` / `deconstruct` / `deconstruct_keys` / `members` / `with`の各プロジェクションに対応して出荷済み。`DataFolding`ディスパッチ層は、名前付き形式に対してスコープインデクサが書き込むクロスファイルの`Scope#data_member_layouts`サイドテーブルを参照する。**スライス4（ブロックボディ堅牢化）が着地:**ボディがメンバーの合成済みリーダー（`def x`）を再定義している名前付きクラスは、そのメンバーの*読み取り*畳み込みを行わなくなった（再定義済みメソッドが呼ばれるため）— 一方、値アクセサ（`[:x]` / `to_h`）はリーダーをバイパスするので引き続き畳み込み対象 — プロジェクトdef-nodeテーブルの実`def`ノードを条件とする。ベアローカルのブロック形式は保守的に畳み込みなし（unfolded）のまま。`Struct`の姉妹実装は変異健全性（mutation-soundness）の設計が固まるまで先送り（§「Structのフォローアップ」参照）。畳み込みは**精度追加のみ** — 新しい診断ファミリーなし、偽陽性のサーフェスなし（プロジェクトの偽陽性の規律に沿う）。フェーズ5カバレッジ監査[`docs/notes/20260523-struct-encoding-coverage.md`](../../notes/20260523-struct-encoding-coverage/)に基づき、同監査がこれをADR相当として先送りし`Data.define`をより良い最初のターゲットと指名した。

**`Struct`フォローアップ — スライス1 + 2着地（健全な*トランジェント*形式）**。可変な姉妹キャリア`Type::StructClass` / `Type::StructInstance`が出荷され、`Struct.new(...)`は`StructClass`のメンバーレイアウトに畳み込まれ、`.new` / `[]`が`StructInstance`を実体化し、**フレッシュな**（チェーンされた）インスタンスからのメンバー読み取りが畳み込まれる（`Struct.new(:x, :y).new(1, 2).x` → `Constant[1]`。匿名・定数・サブクラス・ローカルクラスの各形式、位置引数 + `keyword_init:`に対応）。変異健全性のストーリーは、書き込みサイトの無効化ではなく**フレッシュレシーバゲート**によって解決される: *格納された*バインディングからのメンバー読み取りは`Dynamic[top]`に劣化する（トランジェントはマテリアライゼーションとチェーン読み取りの間に変異され得ないため無効化は不要;格納されたバインディングは変異され得るため畳み込まない）。これは書き込みサイトに一切触れず — すべてのエスケープ経路を列挙するよりはるかに偽陽性リスクが低く — まさに先送りされたスライス3が緩めるゲートそのものだ。完全な記録は後述の§「Structのフォローアップ」を参照。

**Structスライス3着地（2026-06-15）— 畳み込み安全なバインドローカルのメンバー畳み込み**。いまや、*格納された*ローカルからのメンバー読み取りも、保守的な本体全体の許可リストスキャン（[`Inference::StructFoldSafety`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/struct_fold_safety.rb)）がそのローカルは決して変異・エイリアス・エスケープされないと証明したときに畳み込まれる（`p = Point.new(1, 2); p.x` → `Constant[1]`）;書き込み・エイリアス・エスケープされたローカルは`Dynamic[top]`のままだ。スキャンは許可リストであり（すべての使用が既知の純粋読み取りでなければならない — 取りこぼしは過度に保守的になるだけで決して不健全にはならない）、本体ごとに一度、トップレベルとメソッド本体のエントリーポイントでスコープ（`Scope#struct_fold_safe?`）にインストールされる。§「Structのフォローアップ」を参照。

**残余（需要依存）:**ベアローカルのブロック形式のパリティ（`c = Data.define(:x) do … end`。ブロックのdefが解決可能な名前のもとに登録されないためリーダー再定義ガードを参照できない — コーパスの需要なし、保守的なbailはFPセーフ）、および`Struct`の**スライス4**（セッターを通じた変異済みメンバーの精密な再型付け — `s.x = 5; s.x` → 代入された型、姉妹メンバーは精度を保つ）。これは[`docs/notes/20260615-struct-folding-slice3-design.md`](../../notes/20260615-struct-folding-slice3-design/)で設計されている。

## 動機

`Data.define`（Ruby 3.2+）と`Struct.new`は、小さな不変/可変の値オブジェクトを書くための慣用的な方法だ。Rigorはこれらを頻繁に扱う — Rigor自身の`lib/`も数十個定義している（`Scope::IndexedKey`、`triage.rb`・`fact_store.rb`・`incremental_session.rb`内の各`Data.define(...)`など）。現状、これらのインスタンスはすべて`Dynamic[top]`として型付けされ、すべてのメンバー読み取り（`record.consumer`・`summary.total`）が`Dynamic[top]`を返す。これは、シェイプキャリアの畳み込み層（Tuple / HashShape / String / Hash）が網羅的になった今、残る最大の*値の畳み込み*（value folding）ギャップだ。

得られるものは精度であり、偽陽性の削減ではない。`Dynamic[top]`の代わりに`Constant[1]`に畳み込まれたメンバー読み取りは、精密な型を下流へ流し、ナローイングを鋭くし、値オブジェクトで`dump.type`を有用にする。診断は何も付かない — このADRはキャリアとfoldハンドラを追加するのみで、ルールは一切追加しない。

## 現状

認識層は*存在*側（ADR-24スライス4a / v0.1.2）で**すでに半分構築済み**であり、そのままここで再利用できる。

- `Inference::ScopeIndexer#data_define_call?` / `#struct_new_call?`は`Data.define(...)`/`Struct.new(...)`呼び出しノードを認識する。
- `#meta_member_names(call_node)`は順序付きSymbolメンバー名の配列を抽出する（`Struct.new`のオプション先頭String名と末尾の`keyword_init:`ハッシュを`#struct_new_positionals`で除去する）。
- `#record_meta_superclass_members(class_node, …)`は`class Point < Data.define(:x, :y)`の合成済みリーダーメソッドを発見済みメソッドの**存在**テーブルにすでに登録している — つまり`Point.new(1, 2).x`は*存在する*とすでに知られている。このADRはその*値*を畳み込む。
- `#meta_new_block_body`は`Const = Data.define(:a) do … end`のブロックボディイディオム（ブロックが`Const`に追加メソッドを定義する）を認識する。

ディスパッチ/型側は**防御的のみ**だ。

- `Inference::Builtins::STRUCT_CATALOG`（[`struct_catalog.rb`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/builtins/struct_catalog.rb)）は`Struct`をレシーバーとして認識し、「仮想的な将来の`Constant<Struct>`キャリア」に対して`:[]/` `:hash` / `:initialize_copy`をブロックリストに登録する。`data/builtins/ruby_core/struct.yml`では`Data.define` / `Struct.new`を`:block_dependent`に分類しており、`ConstantFolding`はこれを拒否してRBS経由で`Dynamic[top]`に解決する。
- インテグレーションフィクスチャ[`struct_catalog.rb`](https://github.com/rigortype/rigor/blob/master/spec/integration/fixtures/struct_catalog.rb)が現状を固定している: `Struct.new(:foo, :bar)` → `Struct`（Nominal）、`Struct.new(:foo).new(1)` → `Dynamic[top]`。

つまり: メンバーの*名前*は認識され、メンバーの*存在*は登録されているが、読み取りをプロジェクションするためのインスタンスごとのメンバー**レイアウト**をモデル化するものがない。そのレイアウトが欠けているキャリアだ。

## 決定

### 2つのキャリア（Data優先）

`Singleton[C]`（クラスオブジェクト）/インスタンス（値）の分割を踏まえ、メンバーレイアウトでパラメータ化された2つのキャリアを導入する。

1. **`Type::DataClass`** — `Data.define(:x, :y)`が生成する*クラスオブジェクト*をモデル化する。フィールド:
   - `members` — メンバー名の凍結済み順序付き`Array<Symbol>`。
   - `class_name` — バインドされた定数名（既知の場合は`"Point"`、代入前の匿名インフライト値は`nil`）。表示とインスタンスタグ付けのみ。フィールドワイズ比較を超えた構造的同一性の**一部ではない**（2つの異なる`Data.define(:x)`の結果は型として等しい — 同じ*シェイプ*だから。エンジンは*定数*をキャリアでなくバインディングで区別する）。
   - （`keyword_init`フィールドなし — `Data`にそのフラグはない。Structフォローアップのために予約、後述）。

   `DataClass`は定数`Point`（または`class Point < …`サブクラス）がその型として持つものだ。畳み込みの役割は`.new` / `.[]` / `.members`のみ。

2. **`Type::DataInstance`** — *値*の`Point.new(1, 2)`をモデル化する。フィールド:
   - `class_name` — タグ付けクラス名（`"Point"`）または`nil`。
   - `members` — メンバー名→値型の凍結済み順序付き`Hash{Symbol => Rigor::Type}`。HashShapeのような構造だが、**クローズドかつ全域**（宣言された全メンバーが存在する。`Data`インスタンスにオプショナルなメンバーはない）かつ**クラスタグ付き**（構造的な裸の`HashShape`とは異なる）。

両者は`Rigor::ValueSemantics`の`value_fields`によって構築された**不変、構築時凍結、構造的等価**なキャリアだ（手書きの同一性なし — `Constant`のInteger-vs-Floatケースのようなクラス識別子のサブタイルな問題はない）。両者は`Rigor::Type::AcceptanceRouter`をインクルードする。

`Data`の**凍結インスタンスが最初のターゲットである理由**: `DataInstance`のメンバー型は、後続のセッター・`[]=`・エイリアス経由の変異によって無効化されることが決してないため、メンバーマップはインスタンスの全ライフタイムにわたって健全だ。（これが`Struct`を先送りする健全性の穴だ。）

### 畳み込みパイプライン

```
Data.define(:x, :y)        → DataClass{ members: [:x, :y] }
Point = <DataClass>        → constant Point carries DataClass            (existing constant-binding flow)
class Point < <DataClass>  → Singleton[Point] inherits the member layout (via record_meta_superclass_members + a new member-layout side-table)
Point.new(1, 2)            → DataInstance{ class: "Point", members: { x: Constant[1], y: Constant[2] } }
Point.new(x: 1, y: 2)      → DataInstance{ … }  (keyword form mapped by name)
inst.x                     → Constant[1]        (member read projection)
inst[:x] / inst[0]         → Constant[1]
inst.to_h                  → HashShape{ x: Constant[1], y: Constant[2] } (closed)
inst.deconstruct           → Tuple[Constant[1], Constant[2]]
inst.deconstruct_keys(nil) → HashShape{ … }
inst.with(x: 9)            → DataInstance{ members: { x: Constant[9], y: Constant[2] } }
inst.members               → Tuple[Constant[:x], Constant[:y]]
```

2つの新しいディスパッチハンドラ（どちらも`Inference::MethodDispatcher::ShapeDispatch::RECEIVER_HANDLERS`に登録 — `Type::HashShape => :dispatch_hash_shape`をルーティングするのと同じテーブル）:

- `Type::DataClass => :dispatch_data_class` — `:new`（インスタンスマテリアライゼーションのチョークポイント）・`:members`・`:[`（Data 3.2の`Point[1, 2]`という`.new`エイリアス）を処理する。
- `Type::DataInstance => :dispatch_data_instance` — メンバーリーダー（`members[name]`をプロジェクション）・`:[`・`:to_h`・`:deconstruct`・`:deconstruct_keys`・`:with`・`:members`・`:==`/`:eql?`/`:hash`（`Nominal[bool]`/`Nominal[Integer]`に畳み込む — `Constant`にはならない、キャリア間の等価性は値決定可能でない）・`:inspect`/`:to_s` → `Nominal[String]`を処理する。

`Data.define(...)`自体は`:block_dependent`によるRBS拒否の*前に*認識されなければならない。新しい精密層エントリー（または`Singleton[Data]` + `:define`キーで`ConstantFolding`のレシーバーディスパッチを拡張したもの）が、既存の`meta_member_names`ロジックを通じてリテラルSymbol引数を読み取り、`DataClass`を生成する。これは`RbsDispatch`の上位、`PRECISE_TIERS`バンドで動作する。

メンバー読み取りは`HashShape#hash_dig_step`とまったく同様にプロジェクションする: `DataInstance`でのメンバー`:x`の読み取りは`members[:x]`を返す — オプショナリティのユニオンなし（Dataインスタンスは全域）、宣言済みメンバーへの`Constant[nil]`フォールバックなし（欠落メンバーはランタイムの`NoMethodError`で、スコープ外。未宣言メンバー読み取りは既存の未定義メソッドパスに委ねる）。

### 劣化契約（FPセーフティ境界）

畳み込みは**完全に決定可能なシェイプに対してオプトイン**であり、前提が不確かになった瞬間に今日の挙動（`Nominal` / `Dynamic[top]`）に劣化する。各劣化は*精度の床*であり、誤った答えではない。

1. **ブロックボディが存在する**（`Data.define(:x) do … end` / `class Point < Data.define(:x); def m; end; end`）— ブロックは追加メソッドを定義したり、リーダーを再定義したり、定数を追加したりする可能性がある。**出荷済み（スライス4）:** **名前付き形式**（`class Point < Data.define(...)`と`Const = Data.define(...) do … end`）はメンバーレイアウトを引き続き畳み込む — ブロックは通常ヘルパーメソッドを追加するのみで、`.x` / `to_h` / `[]`は精度を保つ。拒否される読み取りは、ボディが実`def x`でリーダーを*再定義*しているメンバーのみ: その読み取りはメンバーを返さず再定義済みメソッドを実行するため、畳み込みは不健全になる。両名前付き形式はオーバーライドをクラス名のもとに`def`ノードとして登録するため、プロジェクトdef-nodeテーブル（`Scope#user_def_for`）のエントリーが識別子となる — 合成済みリーダーにはdefノードがない。値アクセサ`[]` / `to_h` / `deconstruct`はリーダーをバイパスするためfoldable（畳み込み可能）のままで、ゲートはベアメンバー読み取りのみにかかる。**ベアローカル**ブロック形式（`c = Data.define(:x) do … end`）は解決可能なクラス名を持たないためブロックのdefをガードのために参照できない — 保守的に畳み込みなし（current behaviour、FPセーフ）のまま。Rigor自身の`lib`（ブロック+サブクラス形式が密集）に対して検証済み: 自己チェックのリグレッションなし。
2. **非リテラル/非Symbolメンバー**（`Data.define(*names)`、`Data.define(dynamic_expr)`）— メンバーセット不明 → キャリアなし（`Nominal[Data]` / 現行の挙動）。
3. **`.new`のアリティ（arity）/キーの不一致** — 位置引数数≠メンバー数、またはキーワードキー∉members、または位置+キーワード混在 → **インスタンスを畳み込まない**（ランタイムの実`ArgumentError`。誤ったメンバーマップを出力しないことがここでの責務）。`Nominal`に劣化。
4. **畳み込み不可能な引数型** — `Dynamic[top]`のメンバー引数はメンバーマップに`Dynamic[top]`として保存される（インスタンスは引き続き*構造的に*畳み込まれる。メンバー読み取りは`Dynamic[top]`を返すが、これは正しく、インスタンス全体がdynamicであるよりも依然良い — *隣接する*メンバーは精度を保つため）。
5. **クラスの再オープン**（`Point = Data.define(...); Point.class_eval …`または後続の`class Point; def m; end; end`）— スコープ外。メンバー*リーダー*は有効なまま（Dataリーダーは凍結合成済みで削除できない）なのでメンバー値の畳み込みに影響なし。追加メソッドはユーザーメソッドパスで解決される。

畳み込みは`Dynamic[top]`から証明済みメンバー型へ型を*絞り込む*のみで、不確かな場合は現状に劣化するため、**このADRは偽陽性のサーフェスを導入しない** — 正常に動作するプログラムが新たにチェックに失敗することはない。メンバー読み取りをより精密にできるだけだ。

### 重大度/診断姿勢

**なし**。このADRはルールも、診断識別子も、重大度マッピングも追加しない。これは推論エンジンのディスパッチ層への純粋な精度向上だ。（ADR-47と対比せよ。ADR-47はルールを*追加*するためWD4コーパスFPゲートを持つ。このADRはfireできないためそのようなゲートを持たない。）*将来*の診断がアタッチし得る唯一の場所 — `.new`アリティ不一致を`arg.*`エラーとする — は明示的にここでの**スコープ外**であり、独自のADRスライスと独自のFPエンベロープを持つ。ちょうどADR-24スライス4が未定義メソッドをアリティから分割したように。

## キャリア動物園チェックリスト

新しい`Rigor::Type::*`キャリアはすべて[`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/)の完全な契約を満たさなければならない。`DataClass`と`DataInstance`それぞれに対して:

- [ ] **コアクラス** `lib/rigor/type/data_class.rb` /
  `lib/rigor/type/data_instance.rb` — `include Rigor::ValueSemantics`
  + `value_fields`; `include Rigor::Type::AcceptanceRouter`; `initialize`終了時に`freeze`（メンバーコレクションも`freeze`）。
- [ ] **メタサーフェス** — `describe(verbosity)`（`Point(x: 1, y: 2)` /
  クラスは`Point`）、`erase_to_rbs`（両者とも`Point`のNominal — 保守的。インスタンスの構造的メンバーはクラスインスタンスとしてRBSで表現できないため、Nominalのクラス名か、匿名ケースは`untyped`に消去）、`normalize`（冪等。`self` — 既に正規形）、`traverse(&block)`（各メンバー値型をyield。`DataClass`はリーフなのでno-op）、構造的`==`/`eql?`/`hash`（`value_fields`経由）。
- [ ] **ケイパビリティ述語** — すべて`Trinary.no`、ただし: `DataInstance`は`record`に答えるか？ 実装時に決定 — `Data`インスタンスはレコードに*似て*いるがクラスタグ付き。構造的レコードファミリーには`Trinary.no`に倒し、「あるオブジェクトか」は`class_object`/Nominalケイパビリティを頼る。`DataClass#class_object` → `Trinary.yes`。
- [ ] **リファインメント（refinement）プロジェクション** — 空配列（定数ウィットネスの寄与なし）。両キャリアが完全定数の場合の`finite_values`は先送り。スライス1では空を返す。
- [ ] **関係クエリ** — `subtype_of` / `accepts`は`AcceptanceRouter`経由で`Inference::Acceptance`にルーティング。受理ルールを追加（`DataInstance`はその`Nominal[class]`が受理されるところで受理可能。メンバーワイズの深度はフォローアップ）。
- [ ] **構造クエリ** — `members`（構造的メンバーシェイプ）、`has_method(name)`（`DataInstance`の宣言済みリーダーに対して`Trinary.yes`）、`method(name, scope:)`。`key_type`/`value_type`/`tuple_arity` → 非適用センチネル。
- [ ] **コンビネータファクトリー** — `Rigor::Type::Combinator.data_class_of(
  members:, class_name: nil)` + `.data_instance_of(members:,
  class_name: nil)`。プロダクションコードはこれらを通じてのみ構築する。
- [ ] **中央require** — `lib/rigor/type.rb`に`require_relative`。構造的キャリア（Tuple、HashShape）の後に順序付け。
- [ ] **RBSサーフェス** — 両クラスを`sig/rigor/type.rbs`に追加。`type t`ユニオンエイリアスと`Combinator`ファクトリシグネチャを含む。
- [ ] **パブリックAPIドリフトスナップショット** — `spec/rigor/public_api_drift_spec.rb`の`PublicApiDriftSnapshots::COMBINATOR_SINGLETON`に新`Combinator`ファクトリメソッドを追加。
- [ ] **キャリアごとのspec** — `spec/rigor/type/data_class_spec.rb` /
  `data_instance_spec.rb`（同一性、describe、erase、accepts、members）。
- [ ] **ディスパッチ配線** — `RECEIVER_HANDLERS` + `ShapeDispatch`の2ハンドラメソッド。精密層の`Data.define`認識器。
- [ ] **インテグレーションフィクスチャ+スナップショット** —
  `spec/integration/fixtures/data_define*.rb`（+`.yml`スナップショット）。`struct_catalog`フィクスチャはStructフォローアップが着地したときのみ更新。
- [ ] **Ractorの共有可能性** — 凍結不変キャリア。`freeze`を超えた`Ractor.make_shareable`は不要（メンバーコレクションは凍結済み）。
- [ ] **CHANGELOG** — 着地時に`[Unreleased]`エントリー（リリーススタイル）。

## スライス計画

1. **スライス1 — `DataClass`キャリア + `Data.define`認識**。
   キャリア、ファクトリー、リテラルSymbolの`Data.define`から`DataClass`を生成する精密層認識器、および`Nominal[Data]`を返す`.new`アリティ処理（インスタンスキャリアはまだなし）— すなわちクラスの半分が先に着地し、`Data.define(...)`が`Dynamic[top]`でなくなる。`DataClass`のキャリア動物園チェックリスト。
2. **スライス2 — `DataInstance`キャリア + メンバー読み取り畳み込み**。
   `.new`が`DataInstance`を実体化（位置引数+キーワード引数 → メンバーマップ）。インスタンスディスパッチハンドラがメンバー読み取り・`[]`・`to_h`・`deconstruct`・`deconstruct_keys`・`members`・`with`をプロジェクション。ヘッドラインの勝利。`DataInstance`のキャリア動物園チェックリスト。
3. **スライス3 — `class Point < Data.define(:x, :y)`サブクラスイディオム**。
   `DataClass`スーパークラスからメンバーレイアウトを名前付きサブクラスにスレッドして`Point.new(...)`を畳み込む（実世界で一般的な形式。存在側は`record_meta_superclass_members`で既に存在する）。これは統合が重いスライス（クラス→メンバーレイアウトのサイドテーブル読み取りを`.new`チョークポイントで行う）。
4. **スライス4 — ブロックボディ劣化の堅牢化（着地済み）**。名前付き形式のリーダー再定義ガード（§劣化1）: クラスボディがリーダーを再定義しているメンバーは読み取り時に畳み込まなくなる。`Scope#user_def_for`を通じた実`def`ノードでゲート。Rigor自身の`lib`（最も密度の高いブロック+サブクラスコーパス）に対してopen-set-vs-bailの選択を確定: 名前付き形式はガード付きで畳み込む。ベアローカルブロック形式は保守的に畳み込みなし（解決可能なクラス名がなくガードを参照できない、コーパスの需要なし）のまま。ベアローカルブロック形式のパリティは需要依存の残余。

スライス1〜2が価値の核心。スライス3が実コードで機能させるもの（多くの`Data`値オブジェクトはメソッドを付加するサブクラス形式で定義される）。スライス4は、ボディがリーダーを再定義しているときにサブクラス形式を健全に保つ偽陽性ガード。

## Structのフォローアップ（スライス1 + 2着地;スライス3 + 4先送り）

クラスキャリアは`DataClass`とほぼ同じだ（`keyword_init: bool`フィールドを追加し、既存の`struct_new_positionals`がすでに除去する末尾の`keyword_init:`オプションを解析する）。だが**インスタンスキャリアは可変**だ: `Struct`には`x=`セッターと`[]=`があり、`StructInstance`のメンバーマップは後続の書き込みやエイリアス + 外部変異によって無効化され得る。2026-06-15の実装は、当初の先送りが未解決のまま残した点を2つの方法で解決する:

**キャリアの決定 — 専用の`StructClass` / `StructInstance`キャリア**（`Data*`キャリアへの`kind:`識別子ではなく）。可変性ゲート・受理プロジェクション・`receiver_descriptor`はいずれもキャリア型に対してクリーンにパターンマッチし、`keyword_init`がクラスキャリアを分岐させる;`Data*`キャリアは構造的にも振る舞い的にも不変のままだ。

**健全性 — 書き込みサイトの無効化ではなく、フレッシュレシーバゲート（ルートb、先鋭化）**。本ADRは2つのルートを挙げていた: （a）観測されたすべてのセッター / `[]=` / エスケープでのフローセンシティブな無効化（先行技術は`ScopeIndexer#widen_member_for_observed_mutators`）、または（b）変異が到達し得ない箇所でのみ読み取りを畳み込む。ルート（a）は*すべてのエスケープ経路を列挙する*ことを要求し — 呼び出し引数・エイリアス代入・コンテナへの格納・ブロックキャプチャ — **その1つでも取りこぼせば不健全になり、偽陽性を製造する**（プロジェクトの大罪だ）。ルート（b）はその最も健全な極限で実現される: `StructInstance`のメンバー読み取りは、**そのレシーバノードがフレッシュな`.new(...)` / `.with(...)`呼び出しであるときに限り**畳み込まれる — マテリアライゼーションとチェーン読み取りの間に変異され得ないことが証明可能なトランジェントだ。*格納された*バインディングからの読み取りは`Dynamic[top]`に劣化する。これは**書き込みサイトに一切触れない**ため、エスケープ経路を取りこぼしようがない;代償は、バインドされたインスタンス（一般的な`p = Point.new(1, 2); p.x`形式）がまだ畳み込まれないことだ。メンバー*セッター*（`s.x = v`）は代入された値の型を返す（セッター自身の戻り値をモデル化したもので、変異状態に関わらず健全であり、未登録のライターでの未定義メソッドへのフォールスルーを避ける）。

**スライス計画（Struct）:**スライス1 = `StructClass`キャリア + `Struct.new`認識;スライス2 = `StructInstance`キャリア + フレッシュチェーンのメンバー畳み込み + 定数/サブクラス形式のためのサイドテーブル（`Scope#struct_member_layout`）。両者は一緒に着地した（サイドテーブルは一般的な定数形式に必要で、マテリアライゼーションの基盤を完成させる）。**スライス3着地（2026-06-15）:**フレッシュレシーバゲートは、いまや*変異のないバインドローカル*からのメンバー読み取りも畳み込む。これは保守的な畳み込み安全スキャン（[`Inference::StructFoldSafety`](https://github.com/rigortype/rigor/blob/master/lib/rigor/inference/struct_fold_safety.rb) — ローカルは、そのすべての使用がメンバー読み取り / 既知の純粋プロジェクションであるときに限り畳み込まれる;セッター・インデックス書き込み・エイリアス・エスケープ・未知のメソッド呼び出しのいずれもがそれを失格にする）によって証明される。健全性はカウント恒等式に依拠する: ローカルが畳み込み安全であるのは、すべての`LocalVariableReadNode(n)`が純粋読み取り呼び出しのレシーバーである（`total_reads == pure_receiver_reads`）とき、かつそのときに限る。これはエスケープ経路を列挙せずにすべての変異 / エスケープ / エイリアスを捕捉する（許可リストにより、取りこぼしは過度に保守的になるだけで決して不健全にはならない）。この集合はローカル変数スコープごとに一度計算され（`def` / `class` / `module`の境界を尊重する;ブロックはローカルを共有する）、トップレベル（`ScopeIndexer`）とメソッド本体（`build_method_entry_scope` / `build_user_method_body_scope`）のエントリーポイントでスコープ（`Scope#struct_fold_safe?`）にインストールされる — セルフチェックで性能中立と計測済み。**先送り:**スライス4 = セッターを通じた変異済みメンバーの精密な再型付け（`s.x = 5; s.x` → 代入された型、姉妹メンバーは精度を保つ）。これは[`docs/notes/20260615-struct-folding-slice3-design.md`](../../notes/20260615-struct-folding-slice3-design/)で設計されている。

## 却下/先送りした代替案

- **インスタンスに`HashShape`を再利用し、クラス名でタグ付けする**。
  却下: `HashShape`は*構造的*（同じペアを持つ2つのシェイプは等しく交換可能）。一方、`Data`インスタンスは*名前的* — `Point`と`Line`が同じメンバー名を持っていても型は別で、`is_a?`はクラスでナローイングし、`to_h`とインスタンスは別物だ。クラスタグを`HashShape`に後付けすると、すべての`HashShape`ハンドラが「タグ付きか？」で分岐する必要が生まれる。専用キャリアの方がクリーンで、`HashShape`の構造的契約をそのまま保てる。（インスタンスキャリアは`to_h`のために`HashShape`に*消去*する。これが正しい方向だ。）
- **`Struct.new` / `Data.define`のRBSを改善して`Dynamic[top]`の代わりに`Nominal[Struct]`を返す**。
  これは厳密に小さく直交する修正だ（`Dynamic[top]`を取り除くがメンバーの精度は与えない）。これに関わらず行う価値はあるが、値の畳み込みではなくこのADRを必要としない。キャリアなし劣化パスのスライス1の床としてのみここに折り込む。
- **`Constant<Struct>`全インスタンス定数キャリア**（防御的`STRUCT_CATALOG`ブロックリストが守る形状）。却下: 定数キャリアは合成インスタンスで実際の`Struct`メソッドを呼ぶ*振る舞い*を畳み込もうとする。これはカタログブロックリストが防ごうとするプロセス依存と変異ハザードを再導入する。メンバーシェイプキャリアは*メンバーレイアウト*を畳み込むのであって、振る舞いではない — 実オブジェクトをインスタンス化しない。
- **同じスライスで`Struct`を畳み込む**。
  § 「Structのフォローアップ」のとおり却下/先送り — 変異健全性の話が本質的により難しく、監査は明示的に`Data`をより良い最初のターゲットと指名している。

## 結果

- **精度:** `Data`値オブジェクト（Rigor自身の`lib`と慣用的なモダンRubyに遍在する）のメンバー読み取りが`Dynamic[top]`の代わりに精密な型へ畳み込まれる。下流のナローイングと`dump.type`が向上。
- **FPサーフェスなし:**畳み込みは追加的で、不確かな場合は現状に劣化する。新しい診断なし、コーパスゲートなし。
- **キャリア動物園コスト:** 2つの新しいキャリア（`DataClass`、`DataInstance`）が動物園を広げる — `describe` / `erase_to_rbs` / 等価性 / 受理 / Ractor共有可能性のサーフェスそれぞれが満たされなければならない。`Data`/`Struct`値オブジェクトの遍在性によって正当化される。同じ監査が`Encoding`キャリアを対価を払えないとして却下したのとは対照的だ。
- **自己チェック:** Rigor自身の`lib`は`Data.define` + サブクラス形式の密なコーパスであるため、`make check`がライブなリグレッションガードとなる — 不健全なメンバーfoldはセルフチェックの変化として表面化する。

## 関連

- [`docs/notes/20260523-struct-encoding-coverage.md`](../../notes/20260523-struct-encoding-coverage/)
  — これをADR相当として先送りし`Data`を最初とした名付け親のフェーズ5カバレッジ監査。`Encoding`除外の永続的決定も含む。
- [ADR-3](../3-type-representation/) — 型オブジェクトの表現とキャリアシェイプに関するオープンクエスチョン。このADRが新しいキャリアのためにインスタンス化する。
- [ADR-24](../24-self-method-call-resolution/) — スライス4aの`record_meta_superclass_members`がメンバーの*存在*を登録する。このADRはそれを*値の畳み込み*にする。
- [`docs/internal-spec/internal-type-api.md`](../../internal-spec/internal-type-api/)
  — 上のチェックリストが列挙するキャリア契約。
- [`docs/type-specification/structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/)
  — `members`構造クエリが充填するメンバーシェイプスキーマ。
