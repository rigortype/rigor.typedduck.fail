---
title: "Release Milestones"
description: "Imported from rigortype/rigor docs/MILESTONES.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/MILESTONES.md"
sourcePath: "docs/MILESTONES.md"
sourceSha: "a3423c8b6c6c2ccfb2dd6856387551ae8d8c5b64468bf08307742d826f1bdcc3"
sourceCommit: "b523ab36f62d89a1c16964a66864c27e3ebb0fe4"
translationStatus: "translated"
sidebar:
  order: 9050
---

各プレビューリリース周辺の意図的にスコープされたエンベロープを追跡します。マイルストーン内の項目はコミットメントです;それ以外の項目は延期されます。「含む」と「含まない」の境界がそれぞれのリリースを出荷可能にするものです。

このファイルは情報提供目的であり、規範的ではありません。拘束力のある契約は[`docs/adr/`](adr/)と[`docs/type-specification/`](type-specification/)にあります。このファイルがADRまたは仕様と矛盾する場合、ADR / 仕様が拘束力を持ち、このファイルは古くなっています。

## v0.0.3 — 2026-05-02にリリース

第3プレビュー。テーマ: **解析器が証明できる場所でリテラル値を見る** — 実際のRubyプログラムがコールサイトごとのアノテーションなしに恩恵を受けられる十分に広いサーフェスに渡って。全追加 / 修正リストは`CHANGELOG.md`を参照してください。

着地した主要サーフェス:

- 積極的な定数フォールド（単項 + 二項 + `Union[Constant…]`デカルト + 整数範囲算術 + Tupleシェイプdivmod）。
- PHPStan形式の`int<min, max>`ファミリー（`positive-int`、`negative-int`、`non-negative-int`、`non-positive-int`、`int<a, b>`）を持つ`Type::IntegerRange`キャリア。
- Numeric / Integer / Float / String / Symbol / Array / IO / Fileをカバーする組み込みメソッドカタログ抽出パイプライン（`tool/extract_builtin_catalog.rb`）。`data/builtins/ruby_core/`下に生成されたYAML。クラスごとのミューテーターブロックリストを持つカタログ駆動ディスパッチ。
- `<` / `<=` / `>` / `>=` / `positive?` / `negative?` / `zero?` / `nonzero?` / `between?`を通じたスコープレベルの整数範囲ナロイング。
- `case / when`整数範囲と整数リテラルナロイング。
- `times` / `upto` / `downto`のイテレーターブロックパラメーター型付け。
- 証明可能に真値 / 偽値の述語に対するブランチ除去。
- `Tuple`形状の`Integer#divmod` / `Float#divmod`フォールド。
- `Type::Difference`キャリア（OQ3のポイント除去半分）; `non-empty-string`、`non-zero-int`、`non-empty-array[T]`、`non-empty-hash[K, V]`が`RBS::Extended`の新しい`rigor:v1:return:`ディレクティブを通じてアクセス可能。
- 証明可能な整数ゼロ除算の`always-raises`診断。
- `fold_platform_specific_paths`設定の後ろにゲートされた`File`パス操作フォールド（デフォルトオフ、プラットフォーム非依存）。
- ADR-5（堅牢性原則）とADR-3のOQ1 / OQ2 / OQ3作業上の決定。

## v0.0.4 — 2026-05-02にリリース

第4プレビュー。テーマ: **OQ3精製キャリア戦略の完成と`RBS::Extended`ディレクティブサーフェスの拡張**。全追加 / 変更 / 修正リストは`CHANGELOG.md`の`[0.0.4]`セクションを参照してください。

着地した主要サーフェス:

- `Type::Refined`キャリア（OQ3述語サブセット半分）と`Type::Intersection`キャリア（合成精製名）——`Type::Difference`（v0.0.3）とともに、OQ3キャリアトリプルが機能完成。
- `Builtins::ImportedRefinements`を通じてアクセス可能な14のインポートされた組み込み精製名: v0.0.3のポイント除去4つ、v0.0.3のIntegerRangeエイリアス4つ、新しい述語6つ（`lowercase-string`、`uppercase-string`、`numeric-string`、`decimal-int-string`、`octal-int-string`、`hex-int-string`）、新しい合成2つ（`non-empty-lowercase-string`、`non-empty-uppercase-string`）。
- 境界の両側で完全な`RBS::Extended`ディレクティブサーフェス: `rigor:v1:return:`（パラメーター化されたペイロードを受け入れるようになった）、`rigor:v1:param:`（コールサイドの`argument-type-mismatch`ルール + ボディサイドの`MethodParameterBinder`ナロイング）、`rigor:v1:assert:`と`rigor:v1:predicate-if-*:`（クラス名に加えて精製ペイロードを受け入れるようになった）。
- `tool/extract_builtin_catalog.rb`を通じたHash / Range / Set / Timeの組み込みカタログインポート。`MethodDispatcher::ConstantFolding#catalog_for`はテーブル駆動（`CATALOG_BY_CLASS`）になったため、さらなるインポートは1行で済みます。
- `IteratorDispatch`でのEnumerable対応の`#each_with_index`ブロックパラメーター型付け——要素型がレシーバー形状ごとに射影され、インデックススロットが`non-negative-int`に引き締まります。
- `tool/scaffold_builtin_catalog.rb`が新しい組み込みカタログインポートの機械的な70 %を自動化します（`rigor-builtin-import`スキルのStage 0）。
- 精製ベアリング型の人間可読および`--format=json`出力両方でkebab-case正規名表示契約を拘束するCLI `type-of`リグレッションスペック。

## v0.0.5 — 2026-05-03にリリース

テーマ: **カタログカバレッジの継続、Enumerable対応射影の拡張、Steep相互チェックトリアージフォローアップの吸収**。全追加 / 変更リストは`CHANGELOG.md`の`[0.0.5]`セクションを参照してください。

着地した主要サーフェス:

- Comparable / Enumerableモジュールカタログインポート + `tool/scaffold_builtin_catalog.rb --module`モード。
- Date / DateTimeカタログインポート（`references/ruby/ext/date/`下のstdlib gem）。
- Rational / Complexカタログインポート——並行ワークツリー分離エージェントで着地。
- `MethodDispatcher::ConstantFolding#catalog_allows?`でのinclude対応モジュールカタログフォールスルーが直接の（再定義されていない）コーラーのComparable / Enumerableインポートをアクティブにします。
- 2引数定数フォールドディスパッチ（`try_fold_ternary`）が`Comparable#between?(min, max)`、`Comparable#clamp(min, max)`、`Integer#pow(exp, mod)`をフォールドします。
- IntegerRangeへの`narrow_not_refinement`拡張（ペアバウンド補完）とIntersection（De Morgan）;精製否定（`~T`）が`assert` / `predicate-if-*`ディレクティブのRHSとして受け入れられるようになりました。
- Cボディクラシファイアー——純粋な`rb_check_frozen`ラッパー検出が`Time#gmtime` / `Time#utc`を`:leaf`から`:mutates_self`に再分類します。
- `tool/catalog_diff.rb` + `make catalog-diff`ターゲットが2つのYAMLスナップショット間のサーフェスレベルの差分を計算します。
- **Steep相互チェッカースキャフォールディング。** `tool/steep/`がsig / implドリフト検出のために独立したシブリングBundler（`make steep-check`）としてSteep 2.0をリリースします。トリアージレポートとカテゴリー内訳は[`docs/notes/20260503-steep-cross-check-triage.md`](../notes/20260503-steep-cross-check-triage/)にあります。トリアージの機械的修正（A-1からA-5: 述語シグ、IntegerRangeナロイング、scope_indexerアリティ、env重複、CLIキーワードデフォルト）はすべて着地しました。
- **式位置の条件式に対するブランチ認識スコープ伝播。** `Inference::ScopeIndexer.propagate`がIfNode / UnlessNodeブランチを`Narrowing.predicate_scopes`を通じてルーティングするようになり、`if` / `unless`がCallNode引数または`[]=` RHSに埋め込まれていて`eval_if`のナロイングパスに到達しない偽陽性クラスを修正します。
- **`Kernel#Array`精密ティア（`MethodDispatcher::KernelDispatch`）。**引数の値格子形状から要素型を証明できる場合はいつでも`Array(arg)`を精密な`Array[E]`にフォールドします。ユニオン上で要素単位に分配して統合します。
- **`Const = Data.define(*Symbol)`の発見。** `Inference::ScopeIndexer.record_declarations`が`Const`（囲むパスで修飾）を発見されたクラスとして登録するため、`Const.new(...)`が`meta_new`を通じて`Nominal[<qualified>]`に解決します。オーバーライド対応のイニシャライザーシグネチャディスパッチ（ブロックボディの`def initialize(...)`を正規シグとして使用）はフォローアップとして残ります。

## v0.0.6 — 2026-05-05にリリース

第6プレビュー。テーマ: **定数フォールドティアを通じてブロックを取るEnumerableメソッドをフォールドする** — リテラルコレクションに対するイテレーター形状の式がRBSを通じて拡大するのではなく精密なキャリアを生成するよう。全追加 / 修正リストは`CHANGELOG.md`の`[0.0.6]`セクションを参照してください。

着地した主要サーフェス:

- **`MethodDispatcher::BlockFolding`精密ティア。** `dispatch_precise_tiers`は既存の`block_type:`を消費し、`select` / `filter` / `reject` / `take_while` / `drop_while` / `all?` / `any?` / `none?` / `find` / `detect` / `find_index` / `index` / `count`の定数ブロック側をフォールドします。
- **Tupleレシーバーに対する`ExpressionTyper#try_per_element_block_fold`** — `map` / `collect` / `filter_map` / `flat_map` / `find` / `detect` / `find_index` / `index`。ブロックボディはTupleの位置ごとに1回型チェックされ、その後メソッドごとに精密なTupleに組み立てられます。番号付きパラメーター（`_1`）も同様に参加します。
- **8要素のキャップまでの短い`Constant<Range>`レシーバーに対する位置ごとのフォールド** — `(1..3).map { |n| n.to_s }`は百万要素範囲が爆発することなく`["1", "2", "3"]`に解決します。
- **式位置の条件式に対するブランチ除去。** `if` / `unless` / 三項式の述語が`Type::Constant`にフォールドすると到達不能なブランチが削除されます。Constant形状の左オペランドに対する`&&` / `||`短絡はRubyの実際のセマンティクスに従います。3レイヤーを通じてコンポーズするため、`[1, 2, 3].filter_map { |n| n.even? ? n.to_s : nil }`は`Tuple[Constant["2"]]`に解決します。
- **IntegerRange対応の三項フォールド。** 2引数の`try_fold_ternary`パスが`Comparable#between?` / `Comparable#clamp`のためのスカラー`Constant<Integer>`引数とペアになった`IntegerRange`レシーバーを受け入れます。`int<3, 7>.between?(0, 10)`は`Constant[true]`; `int<3, 7>.clamp(4, 6)`は`int<4, 6>`にフォールドします。
- **空配列リテラルキャリア——`[]` → `Tuple[]`。** `:flat_map`がすべての空位置の結果にクリーンに連結できるよう、リテラルの既知のアリティをピン留めします。
- **Pathnameカタログインポート**（102インスタンスメソッド、2シングルトン、5エイリアス）— `tool/scaffold_builtin_catalog.rb --init-fn InitVM_pathname`を通じて。Pathnameは主にFile / Dir / FileTestに委譲する薄いラッパーなので、ユーザーが見えるペイオフはNumericやStringより狭い——このインポートはレシーバークラス認識、防御的な`:initialize_copy`ブロックリストエントリー、`<=>`の`:leaf`フォールドを提供します。
- **抽出器BeginNodeボディ`def`クラシファイアー修正。** `PreludeParser#analyse_body`は以前rescueオンdefイディオム（`def foo; …; rescue; …; end`）で発生していました。クラシファイアーはbeginブロックの`statements`に降りるようになりました。Pathnameをインポートする際に表面化;すべてのカタログは`make extract-builtin-catalogs`下でクリーンに再生成されます。

## v0.0.7 — 2026-05-05にリリース

テーマ: **プリプラグインカバレッジプッシュ**。v0.1.0でこのサーフェスに対して設計されるプラグインAPIが結び付くための完全な基板を持てるよう、型言語と組み込みカバレッジ仕様がすでにコミットしているものと解析器が実際に実装しているものとのギャップを埋めます。幅優先: 16の機能スライスに加えて3つのpre-v0.1.0基板スライス（Reflectionファサード、コンシューマー移行、2つの設計ドキュメント）。

全追加リストは`CHANGELOG.md`の`[0.0.7]`セクションを参照してください。着地した主要サーフェス:

- **型言語型関数。** `key_of[T]` / `value_of[T]`、`int_mask[…]` / `int_mask_of[T]`、`T[K]`インデックスアクセス演算子——すべて仕様リストにあったが以前は未実装。RBS::Extendedディレクティブペイロードから到達可能;パーサーは整数リテラル引数とクラス名ヘッドの型を直接受け入れます。
- **定数キャリア拡張。** `Rational` / `Complex`（リテラルノード + カーネル呼び出しフォールド）、`Regexp`（非補間リテラルリフト）、`Pathname`（コンストラクターリフト + 純粋なパス操作をカバーする14メソッドの単項 / 8メソッドの二項フォールドテーブル;ファイルシステムに触れるメソッドは拒否のまま）。
- **`Constant<Range>`単項精密性。** `to_a`は位置ごとのTupleにリフト（16でキャップ）; `first` / `last` / `min` / `max` / `count` / `size` / `length`は精密な定数にフォールド。
- **Tuple精密性（11の新しいハンドラー）。** `empty?`、`any?`、`all?`、`none?`、`include?`、`sum`、`min`、`max`、`sort`、`reverse`、`to_a`、`zip`。位置ごとのセマンティクスを保持;非Constant要素は拒否。
- **HashShape射影。** `keys`、`values`、`count`、`length`、`empty?`、`any?`、`first`、`flatten`、`compact`、加えてTuple ↔ HashShapeコンバージョンフォールド（`to_h`、`to_a`、`invert`、`merge`）。
- **String精密性。** Tuple / HashShape引数に対する`String#%`; `Constant<String>#chars` / `#bytes` / `#lines` / `#split` / `#scan`が配列結果を位置ごとのTupleにリフト。
- **精製ナロイング。** `~Refined[base, predicate]`が`current_type`をそのまま返すフォールバックの代わりに`Difference[base, refined]`を通じてナロイング。
- **空のリテラルキャリア。** `{}`が`HashShape{}`に解決; `Array.new(n)` / `Array.new(n, value)`が位置ごとのTupleにリフト。

v0.0.7サイクルで着地したpre-v0.1.0基板:

- **`Rigor::Reflection`ファサード** — `ClassRegistry` + `RbsLoader` + `Scope`発見ファクトに対する統一読み取りAPI。v0.1.0プラグインAPI準備のためのパブリック読み取り形状;仕様は[`docs/internal-spec/reflection.md`](../internal-spec/reflection/)。
- **ファサードへのエンジン内部コンシューマー移行。**機械的なリファクター;動作変更なし。
- **v0.1.0準備設計ドキュメント** — [`docs/design/20260505-v0.1.0-readiness.md`](../design/20260505-v0.1.0-readiness/)。
- **キャッシュスライスタクソノミー設計ドキュメント** — [`docs/design/20260505-cache-slice-taxonomy.md`](../design/20260505-cache-slice-taxonomy/)。

## v0.0.8 — 2026-05-04にリリース

テーマ: **最初のキャッシュ関連コードスライス**。v0.0.7のキャッシュスライスタクソノミー設計ドキュメント（[`docs/design/20260505-cache-slice-taxonomy.md`](../design/20260505-cache-slice-taxonomy/)）がコミットする永続化レイヤーを着地させ、Marshalクリーンなプロデューサーをエンドツーエンドで配線します。バックエンドは[ADR-6](../adr/6-cache-persistence-backend/)に従います: カスタム正規フォーマットを通じて書き込まれるバイナリエントリーのシャードディレクトリ、新しいgem依存関係ゼロ。

スライス（コミット順）:

1. **`Rigor::Cache::Descriptor`値オブジェクト。**タクソノミードキュメントの型付きスロットスキーマ（`FileEntry`、`GemEntry`、`PluginEntry`、`ConfigEntry`）;コンポジション（`union-by-key`、`files`の場合より厳格なコンパレーターが勝つ、不一致で`Conflict`）;正規シリアライゼーション; SHA-256キャッシュキー導出。純粋値オブジェクト、スペックで独立してテスト済み。
2. **`Rigor::Cache::Store`ファイルシステムバックエンド。** `<root>/<producer-id>/<2-prefix>/<62-suffix>.entry`レイアウト; `"RIGOR\x00\x01"`マジック + varint接頭辞付きディスクリプター + 値 + 末尾SHA-256ファイルフォーマット;デスティネーションの`flock(LOCK_EX)`を使ったリネームインプレースアトミシティ; `<root>/schema_version.txt`のスキーマバージョンマーカー（不一致でディレクトリを消去）。読み取り失敗（欠落、短い、不正マジック、不正チェックサム、不正varint、unmarshal不可）はサイレントにキャッシュミスに落とします。プロデューサーIDはファイルシステム安全のために`[a-z][a-z0-9._-]*`に制約されます。
3. **最初のキャッシュプロデューサー——`Rigor::Cache::RbsConstantTable`。**すべてのRBS宣言定数をその翻訳済み`Rigor::Type`にマッピングする`Hash<String, Rigor::Type>`をキャッシュします。スライス計画は最初のプロデューサーとして元々RBS環境ローダーを指名していましたが、実装により`RBS::Environment`はMarshalクリーンでない（推移的な`RBS::Location`に`_dump_data`がない）ことが発見されました。[ADR-6 § 8](../adr/6-cache-persistence-backend/)がその発見を文書化しています;スライスは代わりに翻訳後のアーティファクトをキャッシュします。`RbsLoader#constant_names`がプロデューサーがパブリックサーフェスを通じて定数を列挙できるよう追加されます。
4. **`rigor check --cache-stats`と`--clear-cache`。** `--cache-stats`はランの最後に`Store.disk_inventory`から取得したオンディスクインベントリを出力します（プロデューサーごとのエントリーカウント、合計バイト、スキーマバージョン）。`--clear-cache`はランの前に`.rigor/cache`を消去します。ランごとのヒット / ミスカウンターはプロダクションコードがキャッシュを配線するまで延期。
5. **診断ソースファミリープロビナンス。** `Rigor::Analysis::Diagnostic`が`source_family:`（デフォルト`:builtin`）と非デフォルトファミリーには`"#{source_family}.#{rule}"`を返す`qualified_rule`を獲得します。JSON出力は`source_family`と生の`rule`の両方を並べて持ちます。プラグインAPI自体にコミットすることなくADR-2のプラグイン可観測性ストーリーを準備します。

## v0.0.9 — 2026-05-05にリリース

一桁バージョンコンポーネントポリシーに従い（`0.0.9`の次のリリースは`0.1.0`であり`0.0.10`ではない）、ユーザーがリリースを承認するまですべてのpre-`0.1.0`スライスが`0.0.9`内に着地し続けます。クラスターはオリジナルの「キャッシュを`rigor check`に配線する」スレートとキャッシュサーフェス完成および3つの型言語作業（FlowContributionプロデューサー配線、Refined述語の対補完ナロイング、補間とconcatを通じたliteral-stringフロー追跡）を組み合わせます。

コミットの時系列順:

- 9378df2 — **A1**: `Analysis::Runner.cache_store`サーフェス + `rigor check --no-cache`。Runnerはデフォルトで`.rigor/cache`をルートとする`Cache::Store`を使用; CLIフラグは`nil`をスレッドして無効にします。
- ee021a2 — **A2**: `RbsLoader#constant_type`が`cache_store`設定時に`RbsConstantTable`を通じてルーティングします; `Environment.for_project(cache_store:)`がStoreを引き渡します。最初のエンドツーエンドのコールド / ウォームスタートギャップ。
- 1407225 — **A3**: `Cache::Store#stats`（インプロセスのヒット / ミス / 書き込みカウンター）; `rigor check --cache-stats`がディスクインベントリと並んで「このラン:」セクションを追加します。
- e764565 — **A4**: `Reflection.constant_type_for`がエンドツーエンドでキャッシュされることを確認;「`cache_store`下の定数ルックアップパス」ドキュメントを追加。
- c48f05f — **B**: `Rigor::FlowContribution`バンドル構造体（8コンテンツスロット + `Provenance`）。ADR-2 §「フロー貢献バンドル」に従うパブリック読み取り形状;要素リストのフラット化はコントリビューションマージャーとともにv0.1.0に延期。
- 8a94e7a — **C**: `Rigor::Cache::RbsKnownClassNames`（`Set<String>`） + `Rigor::Cache::RbsDescriptor`共有ビルダー; `RbsLoader#class_known?`がキャッシュされたセットを参照します。
- 41aec51 — **D**: `Rigor::RbsExtended.read_flow_contribution(method_def)`が単一メソッド上のすべての認識済みディレクティブを`Rigor::FlowContribution`バンドル（`:rbs_extended`ソースファミリー）にまとめます。内部ナロイングは型付きDataキャリアを保持します。
- 3ae65e2 — **E**: `Type::Refined`の対補完レジストリ（`COMPLEMENT_PAIRS`）。最初のペア: `lowercase ↔ not_lowercase`。`~lowercase-string`は`Difference[String, lowercase-string]`の代わりに`String`を`non-lowercase-string`にナロイングします。
- 908eb08 — **F**: `literal-string`と`non-empty-literal-string`キャリア; `ExpressionTyper`はすべての部分がリテラルベアリングの場合に補間された文字列を`literal-string`にリフトします。
- 8951c1d — **C1**: `Store#fetch_or_compute(serialize:, deserialize:)`呼び出し可能サーフェス。デフォルトは`Marshal.dump` / `Marshal.load`。ペアはラウンドトリップしなければなりません;デシリアライザーの例外はキャッシュミスになります。
- 9b50e2b — **B（キャッシュプロデューサー）**: `Rigor::Cache::RbsClassAncestorTable`（`Hash<String, Array<String>>`）。`RbsHierarchy#ancestor_names`がキャッシュされたテーブルを参照; `class_ordering`が推移的に恩恵を受けます。
- c601f40 — **A（キャッシュプロデューサー）**: `Rigor::Cache::RbsClassTypeParamNames`（`Hash<String, Array<Symbol>>`）。`RbsLoader#class_type_param_names`がキャッシュされたテーブルを参照します。
- d662d4a — **Eフォローアップ**: `non-uppercase-string`と`non-numeric-string`キャリアとともに`uppercase ↔ not_uppercase`と`numeric ↔ not_numeric`ペアを登録します。
- 5600efc — **Fフォローアップ**: `LiteralStringFolding`ディスパッチャーティア（ConstantFoldingとShapeDispatchの間）。`String#+`と`String#*`はすべてのオペランド自体がリテラルベアリングの場合に`literal-string`にリフトします。
- 8f7c32c — **C2**: `Rigor::Cache::RbsEnvironment`がC1の呼び出し可能サーフェスを通じて完全な`RBS::Environment`をキャッシュします。`lib/rigor/cache/rbs_environment_marshal_patch.rb`を追加——`RBS::Location`上の最小限の`_dump` / `_load`パッチでenvがMarshalを通じてラウンドトリップできます。クラスター中の最大のコールドスタート獲得。

## v0.1.0 — `master`にバージョンバンプ済み（リリース待ち）

テーマ: **最初のプラグイン契約**。ADR-2 §「拡張API」が設計サーフェスを固定; v0.1.0が実装をリリースします。pre-v0.1.0基板はv0.0.3 → v0.0.9で着地しました——型語彙、推論エンジン、`rigor check`に配線された永続キャッシュレイヤー、`Rigor::Reflection`ファサード、`Rigor::FlowContribution`バンドル、パブリックAPIドリフトピン（`Scope` / `Environment` / `Type::Combinator` / `Reflection`）、`Diagnostic#source_family`、RBS::Extendedディレクティブプラミング——これによりv0.1.0は開放的なアーキテクチャ上の練習ではなく有限のアセンブリジョブとなっています。

プラグインが結び付くパブリックサーフェスは[`docs/internal-spec/public-api.md`](../internal-spec/public-api/)に文書化され、`spec/rigor/public_api_drift_spec.rb`でピン留めされています。ピン留めされた名前空間を拡張するスライスは同じコミットでドリフトスペックを更新します。

スライス計画——**6つすべて着地（`master`に未リリース）**:

1. **プラグイン登録 / ロード。** ✅ ADR-2 §「登録、設定、キャッシュ」に従う`Rigor::Plugin`名前空間（Base / Manifest / Services / Registry / Loader / LoadError）。仕様[`docs/internal-spec/plugin.md`](../internal-spec/plugin/)。
2. **プラグイン信頼 / I/Oポリシー。** ✅ `Plugin::TrustPolicy` + `Plugin::IoBoundary` + `Plugin::AccessDeniedError` + `.rigor.yml`の`plugins_io:`セクション。仕様[`docs/internal-spec/plugin-trust.md`](../internal-spec/plugin-trust/)。
3. **プラグインコントリビューションマージャー。** ✅ `FlowContribution::Merger` + `Element`フラット化 + `MergeResult` + `Conflict`。仕様[`docs/internal-spec/flow-contribution-merger.md`](../internal-spec/flow-contribution-merger/)。
4. **内部ナロイングを通じたFlowContribution配線。** ✅ スライス4a（基板——`Fact`値オブジェクト + キャリア変換） + スライス4b（3つのコンシューマーコールサイト——`analyse_rbs_extended_contribution`、ポストリターンアサーション、戻り型オーバーライド）。作業上の決定は[ADR-7 §「スライス4」](../adr/7-v0.1.0-slice-decisions/)に。
5. **プラグイン診断エミッションプロトコル。** ✅ ファイルごとの`Plugin::Base#diagnostics_for_file`フック + `Analysis::Runner`が自動的に`source_family: "plugin.<id>"`をスタンプ + `Conflict#to_diagnostic`。
6. **プラグイン側キャッシュプロデューサー。** ✅ `Plugin::Base.producer` DSL + `Plugin::Base#cache_for`呼び出し可能 + 自動プレフィックス付き`plugin.<manifest.id>.` ID + 自動アセンブルされた`Cache::Descriptor`。仕様[`docs/internal-spec/plugin-cache-producers.md`](../internal-spec/plugin-cache-producers/)。

6つのスライスと並行して着地したv0.1.0ポリッシュ作業:

- **[`examples/`](https://github.com/rigortype/rigor/blob/main/examples/README.md)下の7つの動作プラグイン例** — `rigor-deprecations`、`rigor-lisp-eval`、`rigor-pattern`、`rigor-routes`、`rigor-statesman`、`rigor-units`、加えて`rigor-activerecord`（最もアーキテクチャ的に完成: DSL解釈 + マルチファイル`IoBoundary` + チェーンされたキャッシュプロデューサー + 2パス発見-検証）。`spec/integration/examples/`に渡る67の統合例。
- **[`docs/handbook/`](../handbook/)下の9章エンドユーザーハンドブック。**
- **2つの精密性改善** — `if /(?<x>...)/ =~ str`を通じたnamed-captureのregexナロイング; `;`プレフィックスのブロックローカル`Constant[nil]` shadow。
- **メソッドごとのReflectionキャッシュ**（v0.0.9からのキャリーオーバー）。`Rigor::Cache::RbsInstanceDefinitions` / `Rigor::Cache::RbsSingletonDefinitions`クラスごとのプロデューサーが着地; v0.0.9のフェイルソフト`NameError`リグレッションが診断・修正されました（2つのキャッシュファイルで`require_relative "descriptor"`が欠落）。

`Rigor::VERSION`は`"0.1.0"`にバンプされ、`CHANGELOG.md`はコミット`6170832`で`[0.1.0] - 2026-05-07`セクションに再編成されました。[`AGENTS.md`](https://github.com/rigortype/rigor/blob/main/AGENTS.md)の自律バージョンバンプ禁止ルールに従い、`bundle exec rake release`（`v0.1.0`をタグ付けし、originにプッシュし、RubyGemsに公開）は明示的なユーザー承認を待ちます。カットが承認されたら[`.codex/skills/rigor-release-prep/SKILL.md`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-release-prep/SKILL.md)に従ってください。

v0.1.0を超えて延期された項目は以下の[v0.1.1セクション](#v011--planned)で追跡されます（Track 1–4に加えてv0.1.1の「スコープ外」リスト）。v0.1.1を超えてキューに入れられた項目（LSP / 長期実行デーモン、LRU退避、クロスマシンキャッシュ共有、ObjectSpace / URI / Kernelカタログインポート、Pathname / URI委譲ルール、`rigor:v1:conforms-to`、より広いCheckRulesルールファミリー）もそこにリストされています。

## v0.1.1 — 計画中

テーマ: **リテラル文字列ナロイングサーフェスを深化させ、クロスプラグインAPIをリリースし、プラグイン作成DXを安定させる**。v0.1.0はプラグイン契約（6スライス）を完了し7つの動作プラグイン例をリリースしました; v0.1.1は基板を2方向に拡張し、永続的なメンテナンス項目を整理します。

### Track 1 — リテラル文字列 / 精製ナロイングの深化（テーマ）

1. ✅ **Regexパターン → 精製名認識器** — 未リリースで着地。`Rigor::Builtins::RegexRefinement`（正規サブパターンの厳選テーブル: `\d+`、`\d{N}`、`\d{N,M}`、`\h+`、`[0-9a-fA-F]+`など、`n >= 1`の`+` / `{n}` / `{n,m}`量数子を認める）が`Inference::Narrowing.analyse_match_write`から参照され、`if /(?<year>\d+)/ =~ str`の真値ブランチで`year`がプレーンな`String`の代わりに`decimal-int-string`にナロイングされます。

2. ✅ **整数変換述語を通じた`numeric-string` / `decimal-int-string`の伝播** — 未リリースで着地。2つのコンシューマーサイトが引き締まりました:
   - **2a — `String#to_i` / `#to_int`。** `MethodDispatcher::ShapeDispatch.dispatch_refined`は`decimal-int-string`と`numeric-string`レシーバーを認識し、`to_i` / `to_int`（引数なし）を`non-negative-int`に射影します。
   - **2b — `Kernel#Integer`。** `MethodDispatcher::KernelDispatch.try_integer_from_refinement`が同じルールを`Kernel#Integer(s)`（単一引数）形式に反映します。
   - エンドツーエンドで、`if /(?<year>\d+)/ =~ str; year.to_i; end`と`… Integer(year); end`の両方が`non-negative-int`にフォールドします。

3. ✅ **`predicate-if-*` / `assert-if-*` / `assert`ディレクティブでの`self`ナロイング** — 未リリースで着地。4つのレシーバー形状がself対象のファクトをナロイングするようになりました: `LocalVariableReadNode`（v0.1.0からすでに動作）、`InstanceVariableReadNode`（新規——`Scope#with_ivar`を通じてivarをナロイング）、`Prism::SelfNode`（新規——`scope.self_type`をナロイング）、暗黙的selfコール（nilレシーバー、新規——`scope.self_type`をナロイング）。

4. ✅ **追加の`String`述語ナロイング** — 未リリースでFactStoreベースのフローファクトとして着地。`Inference::Narrowing#analyse_string_predicate`は`Prism::LocalVariableReadNode`レシーバーと`Constant<String>`ニードルに対して`s.start_with?("foo")`、`s.end_with?(...)`、`s.include?(...)`をマッチさせ、真値エッジに`:positive`極性、偽値エッジに`:negative`極性を持つ`bucket: :relational` Factを付与します。型のナロイングなし——Rigorには今日「starts-with-X」精製キャリアがないため、レシーバーの型は両エッジで変更されません。

5. ✅ **追加メソッドを通じた`literal-string`伝播** — 3つのサブスライスが未リリースで着地。
   - **5a — `String#strip` / `#lstrip` / `#rstrip` / `#chomp`（引数なし） / `#chop` / `#scrub`（引数なし）。** `LiteralStringFolding`の`LITERAL_PRESERVING_METHODS`。各々は末端から既知の文字サブセットを除去するため、リテラルベアリングのレシーバーはリテラルベアリングのまま残ります。`non-empty-literal-string`はプレーンな`literal-string`に折り畳まれます（`"   ".strip == ""`）。
   - **5b — 非負`IntegerRange`に対する`Integer#to_s(base)`。** `MethodDispatcher::ShapeDispatch.dispatch_integer_range`は`lower >= 0`の`IntegerRange`レシーバーを認識し、`to_s`（引数なし、デフォルト基数10）を`decimal-int-string`に、`to_s(8)`を`octal-int-string`に、`to_s(16)`を`hex-int-string`にリフトします。
   - **5c — `String#center` / `#ljust` / `#rjust`。** `LiteralStringFolding.fold_width_pad`。width引数はInteger型でなければなりません;オプショナルなpaddingは引数はリテラルベアリングでなければなりません（デフォルトパディング形式はパススルー）。結果は`literal-string`です。

### Track 2 — クロスプラグインAPI + 戻り型貢献（並行）

6. ✅ **ADR-9クロスプラグインAPI——スライス1 → 5**、すべて未リリースで着地。
   - **スライス1** — `Plugin::FactStore`値オブジェクト（`#publish` / `#read` / `#published?` / `#each_fact`、加えて`Fact = Data.define(:plugin_id, :name, :value)`形状と`Conflict`例外）。スレッドセーフ; `plugin_id`をStringに、`name`をSymbolに正規化します。
   - **スライス2** — `Plugin::Services#fact_store`アクセサー。新しい`FactStore`はServicesごとに構築されます; runnerはランごとの独自インスタンスをスレッドします。
   - **スライス3** — `Plugin::Base#prepare(services)`デフォルト無操作フック。`Analysis::Runner.run`はランごとにすべてのロードされたプラグインに対して`#init`の後、ファイルごとのイテレーションの前に`#prepare`を呼び出します;失敗は`:plugin_loader runtime-error`診断として分離されます。
   - **スライス4** — `manifest(produces: [...])`  / `manifest(consumes: [{plugin_id:, name:, optional:}])`宣言 + `Manifest::Consumption` Data形状。ローダーはスライス4ではまだそれらを強制しません。
   - **スライス5** — `Plugin::Loader.load`が`consumes:`によってプラグインをトポロジカルソートし（設定順序タイブレーク）、非オプショナルのコンシュームが`(plugin_id, name)`を名前付けしてロードされたプラグインが生産しない場合`Plugin::LoadError(reason: :"missing-producer")`を発行し、コンシュームがサイクルを形成する場合`Plugin::LoadError(reason: :"dependency-cycle")`を発行します。Tier 2 Railsプラグイン（`rigor-actionpack` Phase 1、`rigor-factorybot`）のブロックが解除されました。

7. ✅ **プラグイン戻り型貢献スライス1** — 未リリースで着地。新しい`Plugin::Base#flow_contribution_for(call_node:, scope:)`デフォルト無操作フックが`Rigor::FlowContribution`を返します。`MethodDispatcher.dispatch`はオプショナルな`call_node:` / `scope:` kwargsを獲得します;両方が存在し、スコープの環境が非空の`Plugin::Registry`を持つ場合、精密ティアと`RbsDispatch`の間の新しいディスパッチャーティアがすべてのプラグインのフックを歩き、`FlowContribution::Merger`を通じて貢献をマージし、マージされた`return_type`を使用します。

### Track 3 — プラグイン作成DX（並行）

8. **プラグインスペックヘルパーモジュール抽出。** ✅ **着地（コミット`ce64bb6`）。** `Rigor::IntegrationSupport::PluginHelpers`が`spec/integration/examples/support/plugin_helpers.rb`に抽出されます; 7つのプラグインスペックが移行されます; `rigor-plugin-author` SKILL Phase 6がスリム化されたボイラープレートで更新されます。

9. ✅ **デモキャッシュディレクトリ処理** — 明示的設定形式として未リリースで着地。各`examples/rigor-*/demo/.rigor.yml`が`cache.path: tmp/.rigor/cache`を設定します;各デモはキャッシュがgitから外れるよう`/tmp/`のみの`.gitignore`を持ちます。

10. ✅ **例のRuboCop緩和** — 未リリースで着地。`.rubocop.yml`が`examples/**/*`の包括的除外を削除し、文書化された緩和ブロックを追加しました。RuboCopは262ファイル / 0オフェンスを検査するようになりました（以前は210）。

### Track 4 — メンテナンス（任意のv0.1.xリリース）

11. ✅ **3つの`lib/` sigドリフト** — 未リリースで着地。`Trinary#negate`は`:maybe`アームを`else`に折り畳みました。`IntegerRange#lower` / `IntegerRange#upper`は`is_a?(Integer)`アーリーリターンに書き換えられました。`bundle exec exe/rigor check lib`は`No diagnostics`を報告するようになりました。

12. ✅ **`spec/rigor/source/node_locator_spec.rb:82` — `String#index + 1`ガードなし** — 診断として表面化しなくなりました。v0.0.7で追加された`Constant<String>#index(Constant<String>)`上の定数フォールドが`source.index("\"")`のために`Constant<Integer>`を生成するため、`+ 1`レシーバーは既知の`Integer`となり`possible-nil-receiver`は発火しません。

13. ✅ **`numeric.yml`の`Integer#ceildiv` `unknown`エントリー** — 未リリースで着地。`tool/extract_builtin_catalog.rb`の`classify_purity`は`body_kind: composed`プレリュードボディを`unknown`の代わりに`dispatch`として分類するようになりました。`unknown`と`dispatch`の両方は`FOLDABLE_PURITIES`ごとに非フォールド可能なので、フォールディング動作は変更されません;リネームは純粋にカタログの自己文書化クリーンアップです。

v0.1.1のスコープ外（v0.1.2以降に延期）:

- **新しいCheckRulesルールファミリー。** `flow.unreachable-branch`、`flow.dead-assignment`、`flow.always-truthy-condition`、`def.ivar-write-mismatch`、`def.method-visibility-mismatch`、加えて型キャリア述語の`def.return-type-mismatch`。各々に慎重な偽陽性トリアージが必要。
- **Cボディクラシファイアーのより広い推移的ミューテータースキャン。** `str_modifiable` / `time_modify` / 類似のヘルパーを正当な非ミューテーター（v0.0.5修正を制限した`Array#to_a`リグレッション）を過剰フラグ付けせずに追跡する必要がある長期延期のカタログ抽出器作業。
- **`Data.define`オーバーライド対応イニシャライザーディスパッチ。** `Const.new`の正規シグとしてのブロックボディ`def initialize(...)`。
- **`Plugin::IoBoundary#open_url`アローリスト。**現在は常に発生します;具体的なプラグインが必要とする時点で緩和されたネットワークポリシーが着地します。
- **`rigor:v1:conforms-to`ディレクティブ。**実際の構造的適合チェッカーが必要。
- **DXツールトラック。** `rigor explain <rule-id>` / `rigor diff <baseline>` / `# rigor:disable-file <rule>` / エディターオートコンプリートのための`.rigor.yml` JSONスキーマ。別のユーザー向けサーフェス; v0.1.2にキューイング。
- **LSP / 長期実行デーモンモード。**ファイルごとの`flock`モデルを超えた同時マルチプロセス安全性が必要。プラグインエコシステムが成長するにつれてますます関連性が高まりますが、まだ実質的です。
- **キャッシュ退避 / LRU / サイズ上限。**キャッシュは制限なし;ユーザーは必要に応じて`--clear-cache`を実行します。
- **クロスマシンキャッシュ共有。**
- **ObjectSpace / URI / Kernelカタログインポート。** ObjectSpaceはカタログティアがまだ提供しないシングルトンモジュールディスパッチパスが必要。URIはCサーフェスのない純粋RubyのstdlibGemです; KernelメソッドはInit関数なしの20以上のCファイルに散在しています。両方とも手作りまたはカスタムスキャフォールドアプローチが必要。
- **Pathname / URI委譲ルール。**より広いリファクター（ファイル射影を通じてルーティングするPathnameファサード）。
- **軽量HKT / 型レベル型計算。** [`docs/type-specification/rigor-extensions.md`](../type-specification/rigor-extensions/)行22 / 51の条件付きおよびインデックスアクセス型。より大きなサーフェス;単一スライスの項目ではありません。
- **過負荷選択でのインターフェース厳格性。** v0.1.1の自己解析中に表面化しました: `Array#[](Range) -> Array[Elem]?`は`Array#[](int) -> Elem`に負けます——RBS `int`エイリアスが`Integer | _ToInt`に展開され、RigorがRBSの`_ToInt`インターフェースを`Dynamic[top]`に変換するため（あらゆる型をグラデュアルに受け入れる——Rangeを含む）。症状: `arr = Array<String>; arr[0..i]`は`Array[String]?`の代わりに`String`を返します。v0.1.1では`tool/extract_builtin_catalog.rb`の1つのサイトで`# rigor:disable call.undefined-method`で抑制されています。

## v0.1.2 — 計画中

テーマ: **プラグイン例ファミリーをv0.1.1の`flow_contribution_for`基板に移行する**。v0.1.1はクロスプラグインAPIとコールごとの戻り型コントリビューションティアを着地させました; v0.1.2はその基板を活用します——実行時に型付け可能な値を返す4つのプラグイン例が「情報診断専用」から「ナロイングされた戻り型」に移行し、チェーンされたコールがRBSレベルの`untyped`エンベロープの代わりに解析器の通常のディスパッチを通じて解決されます。診断トレースは残ります——両チャンネルが同じ解釈から実行されます。

### Track 1 — プラグイン例の戻り型移行

1. ✅ **`rigor-lisp-eval`** — `Lisp.eval(literal)`はリテラルインタープリターが生成するキャリアにナロイングします（`Nominal[Integer]`、`Nominal[Float]`、`Union[Constant[true], Constant[false]]`、または`:if`ブランチを越えたユニオン）。

2. ✅ **`rigor-pattern`** — `validate(:name, value)`は成功したマッチでvalue引数の型にナロイングします（通常Rigorのリテラル文字列フォールドの後`Constant<String>`）。

3. ✅ **`rigor-units`** — 次元算術 / チェーンされたコンストラクター / クエリが既存の`MethodTable`ディスパッチを通じてナロイングします（`Distance / Time -> Speed`、`Distance + Distance -> Distance`、`Speed * Time -> Distance`、`.in_<unit>`クエリは`Float`を返すなど）。

4. ✅ **`rigor-activerecord`** — `Model.find(id)`は`Nominal[Model]`にナロイングします; `Model.find_by(...)`は`Nominal[Model] | nil`にナロイングします。

他の3つのプラグイン例（`rigor-deprecations`、`rigor-statesman`、`rigor-routes`）は設計上診断専用のまま残ります。

### プラグイン作成DX

5. ✅ **`spec/integration/examples/support/plugin_helpers.rb`が`signature_paths:`キーワードを受け入れます。**プラグイン統合スペックがテストごとのtmpdirの下にRBSシグファイルを実体化し、そのディレクトリを`Configuration#signature_paths`を通じてスレッドできます。

### v0.1.2のスコープ外（v0.1.3以降に延期）

v0.1.1の「スコープ外」リスト全体が適用されます——過負荷選択でのインターフェース厳格性、新しい`flow.*` / `def.*`ルールファミリー、`Data.define`イニシャライザーディスパッチ、`Plugin::IoBoundary#open_url`、`rigor:v1:conforms-to`、DXツールトラック、LSPデーモン、キャッシュLRU、ObjectSpace / URI / Kernelカタログインポート、Pathname / URI委譲、軽量HKT。

## Railsエコシステムプラグイン（v0.1.xコア作業に並行した実行トラック）

フルロードマップは[`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/)にあります。実行トラックのサマリー:

**すでに着地（`master`に未リリース）:**

- [`rigor-activerecord`](../examples/rigor-activerecord/) — スキーマ + ファインダー + カラム。7番目の動作プラグイン例で最もアーキテクチャ的に完成しています（DSL解釈 + マルチファイルIoBoundary + チェーンされたキャッシュプロデューサー + 2パス発見-検証）。

**Tier 1（現行API、解析器側の変更不要）— 次に作成:**

- `rigor-rails-routes` — 実際の`config/routes.rb` DSL → `*_path` / `*_url`バリデーション。
- `rigor-rails-i18n` — `config/locales/*.yml` → `t('key.path')`バリデーション。
- `rigor-actionmailer` — メーラーメソッド + ビューテンプレート存在確認。
- `rigor-activejob` — ジョブ`perform`のアリティ。

**Tier 2（[ADR-9](../adr/9-cross-plugin-api/)に従うクロスプラグインAPIが必要）:**

- `rigor-actionpack` Phase 1（ストロングパラメーター → ARカラムバリデーション）。
- `rigor-factorybot`（ファクトリー属性 → ARカラムバリデーション）。
- `rigor-actionpack` Phase 2-4（フィルターチェーン、レンダーターゲット、ルートヘルパー消費）。
- `rigor-activerecord`拡張（アソシエーション、enum、スコープ、バリデーション、コールバック——既存gemの0.2.0+のマイナーバンプとして着地）。

**Tier 3（特化型、具体的なユーザー需要があれば作成）:**

- `rigor-rspec`、`rigor-pundit`、`rigor-sidekiq`、`rigor-graphql`、`rigor-activestorage`、`rigor-actioncable`。

各プラグインは[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md) SKILLの規律に従って`examples/rigor-<id>/`にステージされ、契約が安定したら`git subtree split`で抽出されます。最終的な`rigor-rails`メタgemはTier 1+2プラグインをgem依存関係として宣言し、単一のGemfile行でユーザーがスタック全体にオプトインできるようにします。

[ADR-9](../adr/9-cross-plugin-api/)はv0.1.x向けにキューに入れられています——Tier 1はそれをブロックしません; Tier 2はブロックします。ADR-9 §「実装スライシング」に従ったスライシングにより部分的な着地が可能です。
