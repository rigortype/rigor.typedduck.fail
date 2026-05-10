---
title: "Release Milestones"
description: "Imported from rigortype/rigor docs/MILESTONES.md."
editUrl: "https://github.com/rigortype/rigor/edit/main/docs/MILESTONES.md"
sourcePath: "docs/MILESTONES.md"
sourceSha: "de4be90f5fa5b903d57ee4d2f532f3a39fd512cf57674fef93eb652187cc3922"
sourceCommit: "f87b68f852350994a182dca35c52464a59be6e53"
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

- **新しいCheckRulesルールファミリー。** ~~`flow.unreachable-branch`~~（v0.1.2 Track 2でクローズ;リテラルのみエンベロープ）、~~`flow.dead-assignment`~~（v0.1.2 Track 2でクローズ; def内で読み込まれないエンベロープ）、~~`flow.always-truthy-condition`~~（v0.1.2 Track 2でクローズ;ループ / ブロック / 防衛的述語スキップ）、~~`def.ivar-write-mismatch`~~（v0.1.2 Track 2でクローズ;具体クラスドリフト）、~~`def.method-visibility-mismatch`~~（v0.1.2 Track 2でクローズ;ユーザークラスprivateのみ）、~~型キャリア述語の`def.return-type-mismatch`~~（v0.1.2 Track 2でクローズ; `rigor:v1:return:`精製オーバーライドを参照）。各々に慎重な偽陽性トリアージが必要でした。
- **Cボディクラシファイアーのより広い推移的ミューテータースキャン。** `str_modifiable` / `time_modify` / 類似のヘルパーを正当な非ミューテーター（v0.0.5修正を制限した`Array#to_a`リグレッション）を過剰フラグ付けせずに追跡する必要がある長期延期のカタログ抽出器作業。
- ~~`Data.define`オーバーライド対応イニシャライザーディスパッチ。~~ v0.1.2 Track 2でクローズ——以下を参照。
- ~~`Plugin::IoBoundary#open_url`アローリスト。~~ v0.1.2 Track 2でクローズ——項目17を参照。
- **`rigor:v1:conforms-to`ディレクティブ。**実際の構造的適合チェッカーが必要。
- **DXツールトラック。** ~~`rigor explain <rule-id>`~~、~~`rigor diff <baseline>`~~、~~`# rigor:disable-file <rule>`~~、~~`.rigor.yml` JSONスキーマ~~ ——4つすべてv0.1.2 Track 2でクローズ。
- **LSP / 長期実行デーモンモード。**ファイルごとの`flock`モデルを超えた同時マルチプロセス安全性が必要。プラグインエコシステムが成長するにつれてますます関連性が高まりますが、まだ実質的です。
- **キャッシュ退避 / LRU / サイズ上限。**キャッシュは制限なし;ユーザーは必要に応じて`--clear-cache`を実行します。
- **クロスマシンキャッシュ共有。**
- **ObjectSpace / URI / Kernelカタログインポート。** ObjectSpaceはカタログティアがまだ提供しないシングルトンモジュールディスパッチパスが必要。URIはCサーフェスのない純粋RubyのstdlibGemです; KernelメソッドはInit関数なしの20以上のCファイルに散在しています。両方とも手作りまたはカスタムスキャフォールドアプローチが必要。
- **Pathname / URI委譲ルール。**より広いリファクター（ファイル射影を通じてルーティングするPathnameファサード）。
- **軽量HKT / 型レベル型計算。** [`docs/type-specification/rigor-extensions.md`](../type-specification/rigor-extensions/)行22 / 51の条件付きおよびインデックスアクセス型。より大きなサーフェス;単一スライスの項目ではありません。
- ~~過負荷選択でのインターフェース厳格性。~~ v0.1.2 Track 2でクローズ——以下を参照。

## v0.1.2 — 計画中

テーマ: **プラグイン例ファミリーをv0.1.1の`flow_contribution_for`基板に移行する**。v0.1.1はクロスプラグインAPIとコールごとの戻り型コントリビューションティアを着地させました; v0.1.2はその基板を活用します——実行時に型付け可能な値を返す4つのプラグイン例が「情報診断専用」から「ナロイングされた戻り型」に移行し、チェーンされたコールがRBSレベルの`untyped`エンベロープの代わりに解析器の通常のディスパッチを通じて解決されます。診断トレースは残ります——両チャンネルが同じ解釈から実行されます。

### Track 1 — プラグイン例の戻り型移行

1. ✅ **`rigor-lisp-eval`** — `Lisp.eval(literal)`はリテラルインタープリターが生成するキャリアにナロイングします（`Nominal[Integer]`、`Nominal[Float]`、`Union[Constant[true], Constant[false]]`、または`:if`ブランチを越えたユニオン）。

2. ✅ **`rigor-pattern`** — `validate(:name, value)`は成功したマッチでvalue引数の型にナロイングします（通常Rigorのリテラル文字列フォールドの後`Constant<String>`）。

3. ✅ **`rigor-units`** — 次元算術 / チェーンされたコンストラクター / クエリが既存の`MethodTable`ディスパッチを通じてナロイングします（`Distance / Time -> Speed`、`Distance + Distance -> Distance`、`Speed * Time -> Distance`、`.in_<unit>`クエリは`Float`を返すなど）。

4. ✅ **`rigor-activerecord`** — `Model.find(id)`は`Nominal[Model]`にナロイングします; `Model.find_by(...)`は`Nominal[Model] | nil`にナロイングします。

他の3つのプラグイン例（`rigor-deprecations`、`rigor-statesman`、`rigor-routes`）は設計上診断専用のまま残ります。

### プラグイン作成DX

5. ✅ **`spec/integration/examples/support/plugin_helpers.rb`が`signature_paths:`キーワードを受け入れます。**プラグイン統合スペックがテストごとのtmpdirの下にRBSシグファイルを実体化し、そのディレクトリを`Configuration#signature_paths`を通じてスレッドできます。新しいナロイングテストがユーザー定義クラス（`rigor-activerecord`の`User`、`rigor-units`の`Distance / Time / Speed`ファミリー）に最小限のシグを提供して`call.undefined-method`が発火できるよう、これを使用します——ルールの`rbs_class_known?`ゲートが他の場合は診断をサイレンスします。

### Track 2 — エンジン深化フォローアップ

6. ✅ **過負荷選択でのインターフェース厳格性** ——未リリースで着地。`OverloadSelector`が2パスマッチを実行するようになりました: パス1はパラメーター型が厳密に型付けされた（`RBS::Types::Alias` / `Interface` / `Intersection` / `Bases::Any`から変換された`Dynamic[Top]`がない）オーバーロードのみを考慮し、パス2は既存のグラデュアルマッチャーにフォールバックします。厳密パスは引数自体が`Dynamic[Top]`（リテラルな`untyped`）の場合もスキップされ、未型付き引数に対するグラデュアル受け入れが任意に厳密なオーバーロードをロックインしません。v0.1.1の自己解析ミス（`Array[String]#[](Range)`が以前先着で勝っていたエイリアス型の`(::int) -> Elem`オーバーロードの代わりに`(::Range[::Integer?]) -> ::Array[Elem]?`オーバーロードを通じて`Array[String]?`を返すようになりました）をクローズします; `tool/extract_builtin_catalog.rb:750`の`# rigor:disable call.undefined-method`ワークアラウンドが削除されます。

7. ✅ **`def.ivar-write-mismatch`ルール** ——未リリースで着地。新しい`Analysis::CheckRules::IvarWriteCollector`がすべてのクラス / モジュールボディを走査し、クラスごとのインスタンスメソッドの`@var = ...`書き込みとそのrvalue型を収集します。後の書き込みの具体クラス（Nominal / Singleton / Constant / Tuple → "Array" / HashShape → "Hash"）が最初の書き込みのものと異なる場合にルールが発火します。`NilClass`は意図的な`@cache = nil`でクリアするイディオムのためにアローリストされます; Union / Dynamic / IntegerRange / シェイプが変わるキャリアはフォールスルーします。作成`: error`;重大度プロファイルエントリー: `:warning`（lenientとbalanced）、`:error`（strict）。

9. ✅ **`def.method-visibility-mismatch`ルール** ——未リリースで着地。新しい`Scope#discovered_method_visibilities`テーブルが`Inference::ScopeIndexer`によって周囲のクラスボディから入力されます;モディファイアーブロック（引数なしの`private` / `protected` / `public`が後続の`def`のデフォルトを切り替える）と名前付き引数形式（`private :foo, :bar`が特定の名前にバックパッチする）の両方がテーブルに入力されます。明示的レシーバーの`Prism::CallNode`が`discovered_method_visibilities[X][name] == :private`の`Nominal[X]`をターゲットにする場合にCheckRuleが発火します。暗黙的selfコールと`self.foo`はスキップされます（Ruby 2.7+は`self.private_method`を許可します）。作成`: error`;重大度プロファイルエントリー: `:warning`（lenient）、`:error`（balancedとstrict）。`:protected`アームとRBSで既知のクラスサーフェスは意図的に延期されます（サブクラス追跡 / コールサイトごとのトリアージが必要）。

10. ✅ **`flow.unreachable-branch`ルール** ——未リリースで着地。`if` / `unless` / 三項演算子の述語が構文的リテラル（`true` / `false` / `nil` / Integer / Float / String / Symbol / Regexp）**かつ**対応する到達不能ブランチが空でない場合に発火します。到達不能ブランチの位置を指します。作成`:warning`; `severity_profile`テーブルが`:info`（lenient）/ `:warning`（balanced）/ `:error`（strict）に再スタンプします。リテラルのみエンベロープはv0.1.2の意図的な保守性です——推論された定数述語（RBSの`Module#name -> String`シグが隠す匿名クラスのnilに対する防衛的な`Module#name.nil?`チェック; Rigorが拡幅しない`<<`ミューテーションのアキュムレーター`arr.empty?`パターン）はループ / ミューテーション / RBS厳格性モデリングが改善されるまで偽陽性を表面化させます。拡大は後のv0.1.xリリースのためにキューに入れられています。

11. ✅ **`Data.define` / `Struct.new`ブロックボディメソッド発見** ——未リリースで着地。`ScopeIndexer.walk_methods`と`walk_def_nodes`が、`Const`の修飾名をプレフィックスにプッシュして`Const = Data.define(*sym) do ... end` / `Const = Struct.new(*sym) do ... end`書き込みのブロックボディに再帰するようになりました。ブロックボディの`def initialize(...)`とその他のオーバーライドdefが`discovered_methods`と`discovered_def_nodes`の両方で定数名の下に登録されます。RBSで既知の`Point`定数の`Point.new`がブロックで定義されたアクセサーに対して偽陽性の`call.undefined-method`を表面化しなくなります。v0.0.5フォローアップ「オーバーライド対応イニシャライザーシグネチャーディスパッチ（ブロックの`def initialize(...)`を正規シグとして使用）」をクローズします。

12. ✅ **`rigor explain <rule>` CLIコマンド** ——未リリースで着地。新しい`Rigor::Analysis::RuleCatalog`がルールごとの単一情報源メタデータテーブルです（サマリー / 発火条件 / 非発火条件 / 抑制 / 作成重大度 / プロファイルごとの重大度 / 導入バージョン）。`Rigor::CLI::ExplainCommand`が`RuleCatalog.resolve`を通じて正規 / レガシーエイリアス / ファミリーワイルドカードトークンを解決し、`text`（デフォルト）または`json`（`--format=json`）出力をレンダリングします。引数なしの場合はすべてのルールのインデックスを表示します。DXツールトラック項目「rigor explain <rule>」をクローズします。

13. ✅ **`# rigor:disable-file <rule>`ファイルスコープ抑制** ——未リリースで着地。`Analysis::CheckRules.parse_suppression_comments`を別の`FILE_SUPPRESSION_PATTERN`で拡張します;ファイルスコープのセットが`filter_suppressed`の既存の行ごとのセットと合成されます。ファイルのどこにでも配置できます（先頭要件なし）。`# rigor:disable-file all`がすべてのルールを抑制します;ファミリーワイルドカードとレガシー未プレフィックス名が行スコープ形式と同じ展開ルールに従います。DXツールトラック項目「`# rigor:disable-file <rule>`」をクローズします。

14. ✅ **`rigor diff <baseline.json>` CLIコマンド** ——未リリースで着地。新しい`Rigor::CLI::DiffCommand`が保存されたベースラインJSONに対して現在の`rigor check`診断を比較し、新しい / 修正済みのデルタを表示します。マッチングの識別子は`(path, line, column, rule, source_family, message)`です。2つのモード: デフォルトは現在側の`rigor check`を実行します; `--current=<path>`はアナライザーを呼び出さずに2つの保存されたJSONファイルを比較します。エディター / ダッシュボード消費のための`--format=json`。新しい診断が現れた場合の終了コードは`1`、そうでない場合は`0`——CIはリグレッションで失敗しますが、ベースラインに記録されたレガシー診断は問題ありません。DXツールトラック項目「rigor diff <baseline>」をクローズします。

15. ✅ **`schemas/rigor-config.schema.json` — `.rigor.yml`のJSONスキーマ** ——未リリースで着地。ローダーが認識するすべてのキーとロード時の`includes:`ディレクティブのJSON Schema 2020-12ディスクリプター。定数は`Configuration::DEFAULTS`、`SeverityProfile::VALID_PROFILES`、`SeverityProfile::VALID_SEVERITIES`、プラグインエントリー強制ルールから取得されます;スペックがスキーマとローダーの契約を固定してサイレントに乖離できないようにします。コミットされた`.rigor.dist.yml`が`# yaml-language-server: $schema=...`マジックコメント（相対パス）を持ちます; `rigor init`が同じコメントを絶対GitHubのURLで書き込みます。DXツールトラック項目「.rigor.yml JSONスキーマ」をクローズします。

16. ✅ **`flow.dead-assignment`ルール** ——未リリースで着地。新しい`Analysis::CheckRules::DeadAssignmentCollector`がすべての`DefNode`ボディを走査し、ターゲット名が同じボディ内で一度も読まれない単純な`LocalVariableWriteNode`を見つけます。保守的なエンベロープ: トップレベル / クラスボディの代入、`_`で始まる名前、演算子 / and / or書き込み、`MultiWriteNode`分割代入、ボディの末尾代入（Rubyの暗黙のreturn）がすべてルールをバイパスします。読み込みはdefサブツリー全体（ネストされたブロックを含む）からカウントされます。作成`:warning`;重大度プロファイルエントリー: `:info`（lenient）、`:warning`（balanced）、`:error`（strict）。v0.1.1の「スコープ外」`flow.dead-assignment`項目をクローズします。

17. ✅ **`Plugin::IoBoundary#open_url`アローリスト** ——未リリースで着地。v0.1.0は`#open_url`を常に拒否するスタブとして出荷しました。v0.1.2はホストアローリストの後ろでゲートを解除します: `TrustPolicy`が`network_policy: :allowlist`と`allowed_url_hosts:`配列を受け入れます; `IoBoundary#open_url`が`policy.allow_url?(url)`がtrueを返す場合にGET専用のHTTPSフェッチを実行します（HTTPSスキーム + 完全一致ホスト名）。上限: 10秒タイムアウト、10 MBボディ。フェッチャーは`http_client:`で依存性注入されるためスペックはネットワークなしで実行されます。成功したフェッチがボディのSHA-256でキー付けされた`Cache::Descriptor::ConfigEntry`を記録します。設定 / JSONスキーマが`plugins_io.allowed_url_hosts:`と`plugins_io.network`の`allowlist`値を取得します。ワイルドカードホスト名は意図的に延期されます。v0.1.1の「スコープ外」`Plugin::IoBoundary#open_url`アローリスト項目をクローズします。

18. ✅ **`flow.always-truthy-condition`ルール** ——未リリースで着地。リテラルのみの`flow.unreachable-branch`に対応する推論された定数版。2つの外科的スキップがv0.1.2の最初の保守的なカットが誘発した偽陽性を再表面化させずに推論されたケースをもたらします: （1）`WhileNode` / `UntilNode` / `ForNode` / `BlockNode`祖先内の述語（ループボディを通じたミューテーション追跡が不完全）、（2）防衛的述語コール（`.nil?` / `.empty?` / `.zero?` / `.any?` / `.none?` / `.all?` / `.respond_to?`——これらは通常、RBSの厳密なシグが認める以上にユーザーが慎重になっている場合に発火します）。診断は到達不能ブランチではなく述語（ユーザーの主張）を指します（`flow.unreachable-branch`がすでにカバー）。作成`:warning`;重大度プロファイルエントリー: `:info`（lenient）、`:warning`（balanced）、`:error`（strict）。新しい`Analysis::CheckRules::AlwaysTruthyConditionCollector`が作業を行います。v0.1.1の「スコープ外」`flow.always-truthy-condition`項目をクローズします。

19. ✅ **`def.return-type-mismatch`が`%a{rigor:v1:return: <refinement>}`を尊重** ——未リリースで着地。`Analysis::CheckRules.declared_return_type`が`RbsExtended.read_return_type_override(method_def)`を参照し、裸のRBS宣言戻り型よりも精製キャリア（`non-empty-string`、`positive-int`、`non-empty-array[Integer]`など）を優先するようになりました。ボディの推論型が基礎となるRBSクラスが受け入れていたとしても精製に失敗する場合に受け入れチェックが発火します。v0.1.1の「スコープ外」型キャリア述語の`def.return-type-mismatch`項目をクローズします。

20. ✅ **Cボディクラシファイアーの`_modify` / `_modifiable`命名規則シード** ——未リリースで着地。v0.0.5のミューテーターヘルパー認識器は`{ rb_check_frozen(arg); }`そのままのボディのみをキャッチしていました。v0.1.2は`_modify` / `_modifiable`規則に名前がマッチする**かつ**ボディで`rb_check_frozen` / `rb_check_lockedtmp`コールを発行する関数もシードに拡張します。`str_modifiable`、`rb_struct_modify`、`range_modify`、`rb_class_modify_check`などをキャッチします——厳密なregexが見逃したゲート。カタログ再生成により`String#replace`、`String#initialize_copy`、`String#chomp!`、`String#delete_suffix!`、`String#force_encoding`、`Range#initialize`、`Range#initialize_copy`が`mutates_self`に切り替わります。最初の引数の形式パラメーターに対する推移的閉包アプローチが検討されましたが差し戻されました——最初の引数が形式であるにもかかわらずヘルパーが実際にはその引数をミューテートしない関数（`rb_ary_reject` → `ary_reject`はミューテートせずに反復）で偽陽性が発生。`*_catalog.rb`のクラスごとのブロックリストが残りのケースを吸収し続けます。`docs/CURRENT_WORK.md`からの長年の「Cボディクラシファイアーの間接ミューテーター」延期項目をクローズします。

### v0.1.2のスコープ外（v0.1.3以降に延期）

v0.1.1の「スコープ外」リスト全体が適用されます（現在クローズされたインターフェース厳格性と`Data.define`項目を除く）——新しい`flow.*` / `def.*`ルールファミリー、`Plugin::IoBoundary#open_url`、`rigor:v1:conforms-to`、DXツールトラック、LSPデーモン、キャッシュLRU、ObjectSpace / URI / Kernelカタログインポート、Pathname / URI委譲、軽量HKT。

**新しい延期項目（キューに入れられたが特定リリースには未コミット）:**

- **オプトイン依存関係ソース推論。**オプトインgem（RBS / RBS::Inline未使用）のRuby実装を走査し、依存関係境界で`Dynamic[top]`に降格する代わりに型情報を取得します。設計は[ADR-10](../adr/10-dependency-source-inference/)で固定されています: `dependencies.source_inference`設定軸、`Dynamic[T]`ラップされた戻り型、プラグインより厳密に下位のディスパッチャーティア、gemごとの予算プール、新しい`Cache::Descriptor::DependencyEntry`を通じたgemバージョンごとのキャッシュスライス。5つの実装スライス（設定配管 → ウォーカー → キャッシュディスクリプター → gemごとの予算 → ドキュメント）。最短目標v0.1.3ですが確約されていません;エントリーはRailsプラグイン並行トラックが安定した後のv0.1.xコアブランチの帯域幅に依存します。
- **`rigor-sorbet`プラグインアダプター（エコシステムプラグイントラック）。** Sorbetの`sig { ... }`ブロック、`T.let` / `T.cast` / `T.must` / `T.bind` / `T.absurd`、RBIファイルを型ソースとして読み取ります。Sorbet → Rigorの境界でのプラグイン側変換;コアはADR-0 / ADR-1に従いRBSカノニカルのまま。ランタイム強制は`sorbet-runtime`の仕事です（Rigorはアプリケーションコードを実行しない）。設計は[ADR-11](../adr/11-sorbet-input-adapter/)で固定されています。7つの実装スライス（`sig`パーサー → `T.*`フロープリミティブ → 型語彙翻訳器 → RBIウォーカー → シジル尊重 + ティア順序付け → `T.absurd`網羅性 → ドキュメント）。契約が安定するまで`examples/rigor-sorbet/`に格納され、その後`git subtree split`で抽出されます。Railsプラグイントラックと並行;特定リリースには確約されていません。

## v0.1.3 — 計画中

テーマ: **ADR-10をエンドツーエンドで提供し、ADR-11 + Rails Tier 2作業を吸収する。** v0.1.2がエンジン深化フォローアップスイープを閉じ、4つのプラグイン例をv0.1.1の`flow_contribution_for`基板に移行した; v0.1.3はキューに入れられたADR作業とクロスプラグインAPIに依存するRailsプラグインファミリーに転換する。

### Track 1 — ADR-10（オプトイン依存関係ソース推論）

ADR-10の5スライス実装エンベロープ + 4つの「オープンクエスチョン」フォローアップ:

1. ✅ **スライス1（設定配管）** — `Configuration::Dependencies`値オブジェクト + `Entry(gem:, mode:, roots:)` + `.rigor.yml` `dependencies.source_inference[]`セクション + JSONスキーマ。
2. ✅ **スライス2（リゾルバー + ウォーカー + ディスパッチャーティア）** — `GemResolver`、`Walker.walk`、`Index#contribution_for`、`MethodDispatcher.try_dependency_source`。プラグイン / RBSより厳密に下位の新しいティア、ヒット時に`Dynamic[top]`を返す。
3. ✅ **スライス3（キャッシュディスクリプター）** — `Cache::Descriptor::DependencyEntry(gem_name:, gem_version:, mode:)` + 新しい`dependencies:`スロット + `Index#cache_descriptor`経由のgemバージョンごとの無効化プリミティブ。
4. ✅ **スライス4（gemごとの予算）** — `dependencies.budget_per_gem`（デフォルト5000、範囲1250..20000）; `Walker.walk(budget:)`が`Outcome(catalog:, truncated:)`を返す;トリップしたgemごとに1回`dynamic.dependency-source.budget-exceeded` `:warning`。
5. ✅ **スライス5（ドキュメント）** — `docs/internal-spec/dependency-source-inference.md`規範的仕様。
6. ✅ **5a（レシーバーごとのプラグイン拒否権）** — `manifest(owns_receivers:)`宣言; `Environment#class_ordering`経由のサブクラス対応。
7. ✅ **5b（β予算セマンティクス）** — オプトイン`dependencies.budget_overrun_strategy: dependency_silence`が`Index#class_to_gem`逆ルックアップ経由で予算超過gemのカタログミスに対して`Dynamic[top]`を返す。デフォルトは`:walker_cap`のまま。
8. ⏸ **5c（バウンダリクロス診断）** — `mode: full`独自ディスパッチ前提として延期;仕様ドキュメントが依存関係を説明。
9. ✅ **5d（設定競合診断）** — `includes:`チェーンモードの不一致に対して`dynamic.dependency-source.config-conflict` `:warning`; later-wins + rootsユニオンでgemごとの重複排除。

### Track 2 — ADR-11（rigor-sorbetプラグイン）

フルプラグインは`examples/rigor-sorbet/`に格納されています。ADR-11スライス1〜6 + 8 + 軽量フォローアップ:

1. ✅ **スライス1** — sigパーサー、語彙変換（`Nominal` / `T.untyped` / `T.nilable` / `T.any` / `T::Boolean` / 等）。
2. ✅ **スライス2** — `T.let` / `T.cast` / `T.must` / `T.unsafe`認識器。
3. ✅ **スライス3** — 拡大型語彙（`T::Array[E]`、`T::Hash[K, V]`、`T.class_of(C)`、sig位置のタプル / シェイプリテラル）。
4. ✅ **スライス4** — RBIツリーウォーカー（`sorbet/rbi/**/*.rbi`）。
5. ✅ **スライス5** — カタログ収集時の`# typed:`シジル検出。
6. ✅ **スライス6** — `flow.unreachable-branch`との`T.absurd(x)`網羅性合成。
7. ✅ **スライス7** — ハンドブック第10章 + プラグインREADME。
8. ✅ **スライス8** — Tapioca DSLミックスインチェーン解決。
9. ✅ **軽量フォローアップ** — `T.must_because`（`T.must`のエイリアス）、`T.reveal_type`（info診断）、`T.assert_type!`（return + サブタイプチェック）、`T.bind(self, T)`（`post_return_facts(target_kind: :self)`経由のブロックスコープselfナロイング）。
10. ✅ **`enforce_sigil`ファイルごとのゲーティング** — デフォルト`true`; `# typed: false` / シジルなしファイルはsigsが収集されるが貢献されない;アサーション認識器（`T.let` / `T.cast`ファミリー）はシジルに関係なくライブのまま。

### Track 3 — クロスプラグイン基板（ADR-7 §「スライス4-A」クロージャー）

`Inference::StatementEvaluator#apply_plugin_assertions`がプラグイン側の`truthy_facts` / `falsey_facts` / `post_return_facts`をナロイングエンジンに配線します。これはT.bindが使う基板であり、PHPStanスタイルのType-Specifying Extensionsが必要とする基板でもあります——コール後に引数変数 / selfを絞り込むコールシェイプ認識が、エンジン変更なしに任意のRigorプラグインから作成可能になりました。ADR-7 §「スライス4-A」のプラグイン半分を閉じます。

ハンドブック第7章が`@phpstan-assert`対応表を追加し、各PHPStan PHPDocアノテーションをその`RBS::Extended`ディレクティブ等価物（`%a{rigor:v1:assert: x is T}` ⇄ `@phpstan-assert T $x`など）にマッピングします。

### Track 4 — Railsエコシステムプラグイン（Tier 2）

- ✅ **`rigor-actionpack`** — フェーズ4（`rigor-rails-routes`からの`:helper_table` ADR-9ファクト経由のルートヘルパー）+ フェーズ2（フィルターチェーン + 親クラス1レベル継承ルックアップ）+ フェーズ3（`view_search_paths`に対する`render :action` / `render partial:`レンダーターゲット）+ フェーズ1（`rigor-activerecord`からの`:model_index` ADR-9ファクトに対する`params.require(:user).permit(:name)`ストロングパラメーター）。
- ✅ **`rigor-factorybot`** — フェーズ1 （a）自立型ファクトリー + 属性キーバリデーション;フェーズ1 (c) `:model_index` ADR-9ファクト経由のARカラム相互チェック。
- ✅ **`rigor-activerecord`** — `manifest(produces: [:model_index])` + `prepare(services)`フックが実行ごとのモデルインデックスを公開。2つのコンシューマー（`rigor-actionpack`フェーズ1 + `rigor-factorybot`フェーズ1 （c））でADR-9をエンドツーエンドで実証する最初の公開-消費サイクル。

### v0.1.3のスコープ外（v0.1.4以降に延期）

- **`mode: full`独自ディスパッチ** — マージ競合解決を伴うgemソースとRBSの並行貢献。ADR-10 5c（バウンダリクロス）の前提条件——独自ディスパッチなしには診断が発火する条件がない。
- **rigor-sorbetのコールサイトごとのアサーションゲーティング** — 最後のADR-11延期項目。`enforce_sigil`ノブは現在カタログ収集時にsig認識をゲートする;コールサイトごとのゲーティングはディスパッチサイトのCALLERのシジルに基づいて認識されたsigsを抑制する。
- **残りTier 3プラグイン**: `rigor-graphql`、`rigor-activestorage`。具体的なユーザー需要があれば作成。
- **rigor-activerecord拡張**: アソシエーション、enum、スコープ、バリデーション、コールバック。ロードマップに従い各0.2.0+マイナーバンプとして出荷。
- **dry-rbエコシステムプラグイン**（[`docs/design/20260509-dry-plugins-roadmap.md`](../design/20260509-dry-plugins-roadmap/)）— パッケージング戦略（単一gem対ファミリー対中粒度バンドル）は個々のプラグインを作成する前に明示的なADR-12決定が必要。
- v0.1.1 / v0.1.2からの以前の「スコープ外」項目がすべて適用されます: LSPデーモン、キャッシュLRU、ObjectSpace / URI / Kernelカタログインポート、Pathname / URI委譲、軽量HKT、`rigor:v1:conforms-to`。

## Railsエコシステムプラグイン（v0.1.xコア作業に並行した実行トラック）

フルロードマップは[`docs/design/20260508-rails-plugins-roadmap.md`](../design/20260508-rails-plugins-roadmap/)にあります。実行トラックのサマリー:

**すでに着地（`master`に未リリース）:**

- **Tier 1**: [`rigor-rails-routes`](../examples/rigor-rails-routes/)（`:helper_table`を公開）、[`rigor-rails-i18n`](../examples/rigor-rails-i18n/)、[`rigor-actionmailer`](../examples/rigor-actionmailer/)、[`rigor-activejob`](../examples/rigor-activejob/)。
- **Tier 2**: [`rigor-activerecord`](../examples/rigor-activerecord/)（`:model_index`を公開）; [`rigor-actionpack`](../examples/rigor-actionpack/)（4フェーズ: ルート / フィルター / レンダー / ストロングパラメーター）; [`rigor-factorybot`](../examples/rigor-factorybot/)（フェーズ1 (a) + （c））。
- **Tier 3**: [`rigor-pundit`](../examples/rigor-pundit/)、[`rigor-sidekiq`](../examples/rigor-sidekiq/)、[`rigor-rspec`](../examples/rigor-rspec/)、[`rigor-actioncable`](../examples/rigor-actioncable/)。

**保留中Tier 3（特化型、具体的なユーザー需要があれば作成）:**

- `rigor-graphql`、`rigor-activestorage`。

**`rigor-activerecord`内の将来のサーフェス（0.2.0+マイナーバンプとして出荷）:**

- アソシエーション（`has_many` / `belongs_to`）、enum、スコープ、バリデーション、コールバック。

各プラグインは[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/main/.codex/skills/rigor-plugin-author/SKILL.md) SKILLの規律に従って`examples/rigor-<id>/`にステージされ、契約が安定したら`git subtree split`で抽出されます。最終的な`rigor-rails`メタgemはTier 1+2プラグインをgem依存関係として宣言し、単一のGemfile行でユーザーがスタック全体にオプトインできるようにします。
