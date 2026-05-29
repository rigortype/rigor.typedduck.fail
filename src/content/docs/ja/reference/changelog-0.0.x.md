---
title: "Changelog — 0.0.x archive"
description: "Imported from rigortype/rigor docs/CHANGELOG-0.0.x.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CHANGELOG-0.0.x.md"
sourcePath: "docs/CHANGELOG-0.0.x.md"
sourceSha: "8a9f8a0d6f2d34cf8fb3f28464c5997ac034aee0e889edec680b8c9ae8ce2404"
sourceCommit: "203008e9741e8ffd61448e32cf9b89c19f1339da"
translationStatus: "translated"
sidebar:
  order: 9050
---

`0.0.x`開発サイクルのアーカイブリリースノートです。

フォーマットは[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)に従い、プロジェクトは[Semantic Versioning](https://semver.org/spec/v2.0.0.html)に準拠しています。

このファイルは`0.0.1`から`0.0.9`までの静的アーカイブであり、プロジェクトのアーカイブルールに従ってメインの[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)から移動されました: **先頭桁のバンプ後の最初のリリース（例: `0.0.x` → `0.1.x`バンプ後の最初のリリース`0.1.1`）の時点で、以前の桁の範囲全体が`docs/CHANGELOG-<old-prefix>.md`アーカイブファイルに移動されます**。

現在のサイクルのリリースノートは[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)に存在します; v0.1.0のリリースノートもそこに残ります。次の先頭桁バンプ（例: `0.3.1`でトリガーされる`0.2.x` → `0.3.x`）が着地すると、`0.2.x`ブロックが同じルールに従って`docs/CHANGELOG-0.2.x.md`に移動します。

## [0.0.9] - 2026-05-05

第9プレビュー。テーマ: **キャッシュサーフェス（surface）の完成、型語彙の拡張、v0.1.0プラグイン契約（contract）に向けたパブリックAPIのロック**。v0.0.9はすべての残存するpre-`0.1.0`サブストレートスライス（slice）を完了します: 永続キャッシュが`rigor check`にエンドツーエンドで配線され（ウォーム実行はディスクバックのテーブルにヒットし; `--cache-stats`は実際のヒット / ミス / 書き込みカウントを報告し; `--no-cache`でオフにできます）、型語彙は対補完`~T`ナローイング（narrowing）と補間 / `+` / `*` / `<<`を通じた`literal-string`フロー追跡を取り込み、[`RBS::Extended`](../docs/type-specification/rbs-extended/)ディレクティブサーフェスはメソッド上のすべての認識済みディレクティブを1つの`Rigor::FlowContribution`バンドルにまとめ、6つの新しい組み込みカタログが`Random`、`Struct`（+ `Data`）、`Encoding`、`Regexp` / `MatchData`、`Proc` / `Method` / `UnboundMethod`、`Exception`をカバーします。

`0.0.9`の次のリリースは`0.1.0`です——一桁バージョンコンポーネントポリシー、`0.0.10`なし。v0.1.0がプラグイン契約を本格的に開始します; v0.0.9はその契約が設計される基板をリリースします。

### 追加

#### `rigor check`に配線されたキャッシュレイヤー

- **`Analysis::Runner.cache_store`サーフェス + `rigor check --no-cache`**。Runnerはデフォルトで`.rigor/cache`をルートとする`Cache::Store`を使用します; CLIフラグは`nil`をスレッドして無効にします。`Environment.for_project(cache_store:)`はStoreを基礎の`RbsLoader`まで引き渡します。
- **最初のエンドツーエンドキャッシュプロデューサー——`RbsLoader#constant_type`が`RbsConstantTable`から読み取ります**。コールドランは翻訳済み定数型テーブルを一度構築して永続化します;ウォームラン（および同じStoreを共有する別のローダー）は環境の走査を完全にスキップし、テーブルの`Marshal.load`のみを支払います。
- **さらに5つのキャッシュプロデューサー** — `RbsKnownClassNames`（Set<String>）、`RbsClassAncestorTable`（Hash<String, Array<String>>）、`RbsClassTypeParamNames`（Hash<String, Array<Symbol>>）、`RbsEnvironment`（完全な`RBS::Environment`）。5番目のプロデューサー（`RbsEnvironment`）は最大のコールドスタートコスト——`RBS::EnvironmentLoader#load + Environment.from_loader + resolve_type_names`——を、rbsgemのC拡張`RBS::Location`に最小限の`_dump` / `_load` Marshalフックを追加することでキャッシュします。パッチは純粋にアディティブかつべき等です; `RBS::Location`はどの解析パスからも読まれないため、失われたソース位置メタデータは不活性です。
- **`Cache::Store#stats` + `--cache-stats`ランタイム内訳**。`fetch_or_compute`内でバンプされるインプロセスのヒット / ミス / 書き込みカウンター（プロデューサーごとの内訳）; `rigor check --cache-stats`はオンディスクインベントリに続いて「このラン:」セクションを出力します。`--no-cache`下ではセクションは省略されます。
- **`Cache::Store#fetch_or_compute(serialize:, deserialize:)`呼び出し可能サーフェス**。戻り値がMarshalクリーンでないプロデューサー（`RBS::Location`メンバーを持つRBSネイティブオブジェクト、生の`IO`など）はカスタムラウンドトリップ呼び出し可能オブジェクトを登録できます。デフォルトは`Marshal.dump` / `Marshal.load`のまま。デシリアライザーの例外はキャッシュミスになります。`RbsEnvironment`はこのサーフェスを利用します。
- **共有`Rigor::Cache::RbsDescriptor`**。すべてのRBS由来プロデューサーは同じディスクリプター（rbsgemのロックバージョン + `signature_paths`下のすべての`.rbs`ファイルの`:digest`エントリー + `rbs.libraries`設定エントリー）を付与します。これにより、シグネチャの変更やrbsgemのバンプが一斉に無効化されます。

#### 型語彙

- **`Refined[base, predicate]`の対補完ナローイング**。`Type::Refined::COMPLEMENT_PAIRS`が双方向ペアを登録します;ナローイングティアは不精確な`Difference[base, refined]`フォールバックの代わりに`Refined[base, complement]`を返します。v0.0.9では3つのペアが着地します: `lowercase ↔ not_lowercase`、`uppercase ↔ not_uppercase`、`numeric ↔ not_numeric`。ポジティブキャリア（carrier）`non-lowercase-string`、`non-uppercase-string`、`non-numeric-string`が`Builtins::ImportedRefinements::REGISTRY`に追加され、直接書けるようになります。
- **`literal-string`キャリアと`non-empty-literal-string`コンポジション**。ソースコードリテラル（またはリテラルのコンポジション）から来ることが既知の`String`。文字列補間`"#{...}"`（すべての部分がリテラルベアリングの場合`literal-string`にリフト）および`String#+`、`String#*`、`String#<<`、`String#concat`をカバーする新しい`LiteralStringFolding`ディスパッチャーティアを通じて追跡されます（すべてのオペランドがリテラルベアリングの場合にリフト）。
- **6つの新しい組み込みカタログ** — Random、Struct（+ Data）、Encoding、Regexp + MatchData、Proc / Method / UnboundMethod、Exception。各カタログはクラスごとの間接ミューテーターブロックリストでフォールドディスパッチャーを駆動します（RandomのMT状態を進めるメソッド、Regexpの`$~`を書くマッチャー、Proc / Methodの`:call` / `:[`実行パス、Exceptionのランタイム状態リーダーなど）。
- **`Numeric#clone`の再分類**。`numeric`トピックの`c_index_paths`に`references/ruby/object.c`が含まれるようになりました。`Numeric#clone`の`rb_immutable_obj_clone`へのエイリアスがCボディ分類器によって発見され、エントリーが`purity: unknown`から`purity: leaf`に移動します。

#### pre-v0.1.0サブストレート（プラグイン契約が結び付くサーフェスをロック）

- **`Rigor::FlowContribution`バンドル構造体**。8つのコンテンツスロット（`return_type`、`truthy_facts`、`falsey_facts`、`post_return_facts`、`mutations`、`invalidations`、`exceptional`、`role_conformance`）と`Provenance` Dataキャリア（`source_family`、`plugin_id`、`node`、`descriptor`）。構築時に凍結;コレクションスロットはdupeして凍結。ADR-2 §「フロー貢献バンドル」に従うパブリック読み取り形状;要素リストのフラット化はそれを消費するコントリビューションマージャーとともにv0.1.0に延期。
- **`Rigor::RbsExtended.read_flow_contribution(method_def)`**。単一のRBSメソッド上のすべての認識済みディレクティブ（`predicate-if-(true|false)`、`assert*`、`return:`）を1つの`FlowContribution`（`:rbs_extended`ソースファミリー）にまとめます。内部ナローイングは型付きDataキャリアを消費し続けます;バンドルはv0.1.0のコントリビューションマージャーが読むパブリックパッケージングです。
- **`Rigor::Scope`、`Rigor::Environment`、`Rigor::Type::Combinator`、`Rigor::Reflection`のパブリックAPIドリフトスペック**。`spec/rigor/public_api_drift_spec.rb`のスナップショットスタイルスペックが各名前空間のインスタンス + シングルトンメソッドセットをピン留めし、偶発的なシグネチャ変更がサイレントな破壊ではなくテスト失敗として現れるようにします。4つの名前空間はv0.1.0プラグイン契約の接続点です。
- **`docs/internal-spec/public-api.md`**。パブリック / 内部安定性境界が明示的に宣言されました: 今日どの名前空間がドリフトピン留めされているか（Scope / Environment / Type::Combinator / Reflection）、v0.1.0まで流動的なパブリック形状のもの（FlowContribution、Diagnostic、Cache::Store#fetch_or_compute、RbsExtendedディレクティブリーダー）、および厳密に内部のもの（Inference::*、Analysis::FactStore / CheckRules / Runner、AST::*バーチャル、Source / CLI / Configurationプラミング）。

### 内部

- キャッシュレイヤーのパブリック読み取り形状が[`docs/internal-spec/cache.md`](../docs/internal-spec/cache/)の全6プロデューサーをカバーするよう拡大: `Descriptor`、`Store`（新しい`serialize:` / `deserialize:` kwargsと`Store#stats`を含む）、`RbsConstantTable`、`RbsKnownClassNames`、`RbsClassAncestorTable`、`RbsClassTypeParamNames`、`RbsEnvironment`、共有`RbsDescriptor`ビルダー、`RBS::Location` Marshalパッチ。
- `Rigor::FlowContribution`が[`docs/internal-spec/flow-contribution.md`](../docs/internal-spec/flow-contribution/)に文書化されました（スロットテーブル、等値性 / `to_h` / `empty?`セマンティクス、`RbsExtended.read_flow_contribution`マッピング（predicate-if-* → `truthy_facts` / `falsey_facts`、`assert*` → `post_return_facts`、`return:` → `return_type`）、延期された要素リストフラット化のノートを含む）。

## [0.0.8] - 2026-05-04

第8プレビュー。テーマ: **最初のキャッシュ関連コードスライス** — v0.0.7のキャッシュスライスタクソノミー設計ドキュメントがスキーマを固定した永続化レイヤーを着地させ、Marshalクリーンなプロデューサーをエンドツーエンドで配線します。バックエンドの選択は[ADR-6](../docs/adr/6-cache-persistence-backend/)によって固定: カスタム正規フォーマットを通じて書き込まれるバイナリエントリーのシャードディレクトリ、**新しいgem依存関係ゼロ**。

### 追加

- **`Rigor::Cache::Descriptor`値オブジェクト**。[`docs/design/20260505-cache-slice-taxonomy.md`](../docs/design/20260505-cache-slice-taxonomy/)に従う純粋値の4スロットスキーマ（`files`、`gems`、`plugins`、`configs`）。各スロットは型付きの凍結エントリーを保持します; `FileEntry`はコンパレーターenum（`:digest > :mtime > :exists`）を検証します;その他はすでに正規化されたハッシュを受け入れます。`Descriptor.compose(*descriptors)`はキーでスロットを統合し、ファイル競合ではより厳格なコンパレーターを優先し、値が一致しない場合は`Descriptor::Conflict`を発生させます。`descriptor.cache_key_for(producer_id:, params:)`は合成された入力に対して正規16進SHA-256を導出します; `to_canonical_bytes`はソート済みで決定的なJSONを生成し、等価なディスクリプターが同一バイトにラウンドトリップします。
- **`Rigor::Cache::Store`ファイルシステムバックエンド**。シャードレイアウト`<root>/<producer-id>/<2-prefix>/<62-suffix>.entry`、`<root>/schema_version.txt`のスキーマバージョンマーカー。カスタムバイナリエントリフォーマット（`"RIGOR\x00\x01"`マジック、varint接頭辞付きディスクリプターと値、末尾SHA-256整合性）。書き込みはデスティネーションの`flock(LOCK_EX)`と一時ファイルの`fsync`を使ったリネームインプレースに従います。読み取りはあらゆる失敗（ファイルなし、不正マジック、不正SHA-256、不正varint、unmarshal不可なペイロード）をキャッシュミスに落とします。`Store#fetch_or_compute(producer_id:, params:, descriptor:) { ... }`が唯一のプロデューサー向けAPIです;プロデューサーIDはファイルシステム安全のために`[a-z][a-z0-9._-]*`に制約されます。
- **最初のキャッシュプロデューサー——`Rigor::Cache::RbsConstantTable`**。すべてのRBS宣言定数（例: `"::Math::PI"`）をその翻訳済み`Rigor::Type`にマッピングする`Hash<String, Rigor::Type>`をキャッシュします。ディスクリプター: ロックバージョンを持つ`rbs` gem、`signature_paths`下のすべての`.rbs`ファイルの`:digest`エントリー、ライブラリリストの設定エントリー。スライス計画は最初のプロデューサーとして元々RBS環境ローダー（`build_env`）を指名していましたが、実装により`RBS::Environment`はMarshalクリーンでない（`RBS::Location`は`_dump_data`を持たないC拡張クラス）ことが発見されました。[ADR-6 § 8](../docs/adr/6-cache-persistence-backend/)がその発見を文書化しています;スライスは代わりに翻訳後のアーティファクトをキャッシュします。`RbsLoader#constant_names`が追加され、プロデューサーがローダーのプライベート状態に触れることなく定数を列挙できます。
- **`rigor check --cache-stats`**。ランの最終にオンディスクインベントリを出力します（プロデューサーごとのエントリーカウント、合計バイト、スキーマバージョンマーカー）。新しい`Rigor::Cache::Store.disk_inventory(root:)`クラスメソッドから取得。ランごとのヒット / ミスカウンターはプロダクションコードがキャッシュを配線するまで延期。
- **`rigor check --clear-cache`**。解析ランの前に`.rigor/cache`ディレクトリ（CWD相対）を削除します。`Cleared cache: .rigor/cache`または`Cache already empty: .rigor/cache`を出力します。チェック自体は完了まで実行されます。
- **診断ソースファミリープロビナンス**。`Rigor::Analysis::Diagnostic`に`source_family:` kwarg（デフォルト`:builtin`）と非デフォルトファミリーには`"#{source_family}.#{rule}"`を、組み込み診断には`rule`を返す`qualified_rule`アクセサーが追加されました。JSON出力（`to_h`）は`source_family`と生の`rule`の両方を並べて持ちます。プラグインAPI自体にコミットすることなくADR-2のプラグイン可観測性ストーリーを準備します; v0.0.8でデフォルト以外のソースファミリーを設定するプロダクション呼び出し元はありません。

### 内部

- 新しい規範的仕様[`docs/internal-spec/cache.md`](../docs/internal-spec/cache/)がキャッシュレイヤーのパブリック読み取り形状を追跡します（Descriptor API、Store API、ファイルフォーマット、アトミシティとロック、スキーマバージョン不一致動作、ディスクインベントリ、診断プロビナンス）。

## [0.0.7] - 2026-05-05

第7プレビュー。テーマ: **プリプラグインカバレッジプッシュ** — v0.1.0でこのサーフェスに対して設計されるプラグインAPIが結び付くための完全な基板を持てるよう、型言語と組み込みカバレッジ仕様がすでにコミットしているものと解析器が実際に実装しているものとのギャップを埋めます。リリースは深さより幅を重視: 多数の小さな追加、加えてpre-v0.1.0シーケンスにおける最初の設計出力。

### 追加

#### 型言語型関数

- **`key_of[T]` / `value_of[T]`** — `HashShape`、`Tuple`、`Nominal[Hash, [K, V]]`、`Nominal[Array, [E]]`、有限境界`Constant<Range>`の既知キー（resp. 値）の型レベル和集合を射影します。`RBS::Extended`ディレクティブペイロードから到達可能。パーサーは`kebab-case`の精製とともに`lower_snake`ヘッドも受け入れ、名目的引数が独自の型引数を持てるようにします。`key_of[Hash[Symbol, Integer]]`は`Symbol`にパースされます。
- **`int_mask[1, 2, 4]` / `int_mask_of[T]`** — 有限整数リテラルセットに対するビット単位OR閉包を計算し、小さな閉包には`Union[Constant<Integer>…]`を返し、カーディナリティ上限を超えたら網羅する`IntegerRange`を返します。整数リテラルがパーサー引数として受け入れられるようになりました。
- **`T[K]`インデックスアクセス演算子** — 構造化された`T`からインデックス / キー`K`の型を射影します。パースされた型の後ろに続く`[K]`セグメントを通じて`RBS::Extended`ディレクティブペイロードから到達可能（連鎖した`T[K1][K2]`を含む）。パーサーのトップレベルエントリーはクラス名ヘッドの型を直接受け入れるようになりました。`Hash[Symbol, Integer][Symbol]`は`Symbol`にパースされます。

#### 定数キャリアカバレッジ

- **`Rational` / `Complex`リテラルリフト**。`Prism::ImaginaryNode`（`1i`）と`Prism::RationalNode`（`1.5r`）は`Constant<Complex>` / `Constant<Rational>`として型付けされます; `Kernel#Rational(num, den)`と`Kernel#Complex(re, im)`の呼び出しはすべての引数が数値Constantの場合に同じ精密な定数にフォールドします。`foldable_constant_value?`は`Rational` / `Complex`を受け入れるよう拡張され、定数レシーバーに対するすべてのカタログティア`Rational#…` / `Complex#…`フォールドのブロックを解除します。
- **`Regexp`リテラルリフト**。非補間の`Prism::RegularExpressionNode`は`Constant<Regexp>`にリフトします（ソースとオプションフラグを保持）;補間されたregexは保守的な`Nominal[Regexp]`を保持します。新しい`Constant<String>#scan(/regex/)`フォールドパスをエンドツーエンドでアクティブにします。
- **Pathname委譲**。`Pathname`が`Type::Constant::SCALAR_CLASSES`に追加されます; `Pathname.new(Constant<String>)`は`MethodDispatcher#meta_new`定数コンストラクターテーブルを通じてリフトします;厳選された14メソッドの単項 / 8メソッドの二項フォールドテーブルが純粋なパス操作をカバーします（`to_s`、`basename`、`dirname`、`extname`、`cleanpath`、`+`、`join`、`<=>`、`==`、`relative_path_from`など）。ファイルシステムに触れるメソッド（`exist?`、`file?`、`read`、`stat`など）は意図的にフォールドしません。

#### `Constant<Range>`精密性

- **`to_a`**は有限整数範囲に対して位置ごとの`Tuple[…]`にリフトします（16要素でキャップ）; **`first` / `last` / `min` / `max`**と**`count` / `size` / `length`**はオプショナルブロックバリアントの`:block_dependent`分類をバイパスして、引数なし形式の精密な`Constant<Integer>`値にフォールドします。

#### Tuple精密性（11の新しいShapeDispatchハンドラー）

- **`empty?` / `any?` / `all?` / `none?`**（ブロックなし、引数なし）はタプルのアリティと要素の真偽値に基づいて`Constant[bool]`にフォールドします。
- **`include?(needle)`**はneedleが`Constant`でタプルの要素がすべて`Constant`の場合に精密なboolにフォールドします。
- **`sum` / `min` / `max`**はすべてのConstant要素に対して数値 / 比較可能な極値にフォールドします。
- **`sort` / `reverse`**は適切な順序で位置ごとのTupleを返します。
- **`to_a`**はレシーバーTupleをそのまま返します。
- **`zip`**はレシーバーの位置ごとの要素を他の各Tupleシェイプ（shape）引数の位置ごとの要素とペアにします;短い他のTupleは`Constant[nil]`でパディングします;複数引数の`zip`はより広い位置ごとのTupleを生成します（8でキャップ）。

#### HashShape精密性

- **`keys` / `values`**は宣言順を保持して位置ごとのTupleにフォールドします。
- **`count` / `length`**は既存の`size`ハンドラーとマッチします。
- **`empty?` / `any?`**（引数なし、ブロックなし）は形状の空き具合に基づいて`Constant[bool]`にフォールドします。
- **`first` / `flatten` / `compact`** — オプショナルキーなしのクローズドシェイプに対して: `first`は最初のペアの`[k, v]` 2-Tupleを返します; `flatten`は位置ごとの`[k_1, v_1, k_2, v_2, …]` Tupleを生成します; `compact`は値が`Constant[nil]`のすべてのエントリーを削除します。
- **Tuple ↔ HashShapeコンバージョン** — `Tuple#to_h`、`HashShape#to_a`、`HashShape#to_h`、`HashShape#invert`（Symbol / String値のシェイプのみ）、クローズドシェイプ × クローズドシェイプマージの`HashShape#merge(other)`。

#### String精密性

- **`Tuple` / `HashShape`引数に対するフォーマット文字列フォールド**。`"%d / %d" % [1, 2]`は`Constant<"1 / 2">`にフォールドします; `"%{name} is %{age}" % {name: "Alice", age: 30}`は`Constant<"Alice is 30">`にフォールドします。不正なフォーマット仕様は拒否されRBSティアが拡大します。
- **配列を返すメソッドリフト**。`s.chars` / `s.bytes` / `s.lines` / `s.split`（引数なし、セパレーター、または`Constant<Regexp>`パターン）/ `s.scan`は、すべての要素がフォールド可能なスカラーでカーディナリティが32以内の場合に、結果のArrayを位置ごとの`Tuple[Constant…]`にリフトします。大きな結果は拒否されRBSティアが拡大します。

#### 精製ナローイング

- **`~Refined[base, predicate]`**は`current_type`をそのまま返すフォールバックの代わりに`Difference[base, refined]`を通じてナローイングします。`assert value is ~lowercase-string`は`String`を`Difference[String, lowercase-string]`にナローイングするようになりました。Intersection精製のDe Morganコンポジションも引き締まります。

#### 空のリテラルキャリア

- **`{}` → `HashShape{}`**はv0.0.6の空配列リテラル変更を反映します。新しいHashShape射影がそれに対してフォールドします。
- **`Array.new(n, value)` / `Array.new(n)`**は`n`が小さな`Constant<Integer>`の場合（16でキャップ）に位置ごとの`Tuple[…]`にリフトします。過大な`n`は`Nominal[Array]`にフォールバックします。

#### pre-v0.1.0サブストレート

- **`Rigor::Reflection`読み取り側ファサード** — Rigorの3つのリフレクションソース（`ClassRegistry` + `RbsLoader` + `Scope`発見ファクト（fact））を1つの読み取りAPIの下に結合します。9つのクエリ: `class_known?`、`class_ordering`、`nominal_for_name`、`singleton_for_name`、`constant_type_for`（インソースがRBSとの衝突に勝つ）、`instance_method_definition`、`singleton_method_definition`、`discovered_class?`、`discovered_method?`。v0.1.0プラグインAPI準備のためのパブリック読み取り形状;仕様は[`docs/internal-spec/reflection.md`](../docs/internal-spec/reflection/)。
- **リフレクションコンシューマー移行**。5つのエンジン内部コーラー（`Analysis::CheckRules`、`Inference::Narrowing`、`Inference::StatementEvaluator`、`Inference::MethodDispatcher`、`Inference::MethodParameterBinder`、`Inference::MethodDispatcher::RbsDispatch`）が生の`scope.environment.rbs_loader`アクセスからファサードに移行します。ファサードは`rbs_class_known?`、`instance_definition` / `singleton_definition`、`class_type_param_names`、ディスパッチャーコールパスのために`Scope`を持たない場合に`environment:` kwargバリアントを獲得します。機械的なリファクター;動作変更なし。
- **v0.1.0準備設計ドキュメント** — [`docs/design/20260505-v0.1.0-readiness.md`](../docs/design/20260505-v0.1.0-readiness/)。すべてのADR-2サーフェスを今日の実装にマッピングし、7つの主要なpre-v0.1.0作業項目のシーケンスを定め、ADR-2の未解決の問題を調和させ、v0.0.xドットリリースとして着地できる項目を列挙します。
- **キャッシュスライスタクソノミー設計ドキュメント** — [`docs/design/20260505-cache-slice-taxonomy.md`](../docs/design/20260505-cache-slice-taxonomy/)。スロットごとのエントリー形状（`:digest` / `:mtime` / `:exists`コンパレーターを持つ`FileEntry`、`GemEntry`、`PluginEntry`、`ConfigEntry`）、コンポジションルール、正規キャッシュキー導出、粒度ガイダンス、スキーマバージョニングを固定します。v0.1.0でリリースされる永続化レイヤーの前提条件契約。

## [0.0.6] - 2026-05-05

第6プレビュー。テーマ: **定数フォールドティアを通じてブロックを取るEnumerableメソッドをフォールドする** — リテラルコレクションに対するイテレーター形状の式がRBSを通じて拡大するのではなく精密なキャリアを生成するよう。

### 追加

- **定数ブロック述語とフィルターに対するブロック形状フォールドディスパッチ**。`[1, 2, 3].select { false }`、`arr.all? { true }`、`arr.any? { false }`のような呼び出しは、ブロックの推論された戻り型がRubyの真値または偽値の`Constant`の場合に精密なエンドポイントに折り畳まれます。フィルターメソッド（`select` / `filter` / `reject` / `take_while` / `drop_while`）はレシーバーまたは`Tuple[]`にフォールドします;述語メソッド（`all?` / `any?` / `none?`）は、Rubyのセマンティクスでレシーバーの空き具合 × ブロックの真偽値の組み合わせが無条件の場合（空レシーバーの空白真値ケースを含む）に`Constant[true]` / `Constant[false]`にフォールドします。レシーバーの空き具合は`Tuple`、`HashShape`、`Constant<Array|Hash|String|Range>`、インポートされた`non-empty-array[T]`キャリア（`Difference[Array, Tuple[]]`）に対して認識されます。
- **`map` / `collect` / `filter_map` / `flat_map` / `find` / `detect` / `find_index` / `index`のTupleレシーバーに対する位置ごとのブロック再評価**。ブロックボディは対応する要素がブロックパラメーターにバインドされた状態でTupleの位置ごとに1回型チェックされ、その後メソッドごとに組み立てられます:
  - `map` / `collect`は`Tuple[U_1..U_n]`を生成します。`[1, 2, 3].map { |n| n.to_s }`は`Array["1" | "2" | "3"]`の代わりに`["1", "2", "3"]`に解決されます。
  - `filter_map`は`Constant[nil]` / `Constant[false]`位置を削除し、残りをTupleに連結します。
  - `flat_map`は位置ごとの`Tuple`結果を連結し、位置ごとの`Constant`スカラーを単一要素の寄与として扱い、不透明なキャリアでは拒否します。
  - `find` / `detect`は最初の真値位置のレシーバー要素を返します（すべての位置が偽値の場合は`Constant[nil]`）。
  - `find_index` / `index`は最初の真値位置のインデックスを返します（`Constant[nil]`の場合あり）。値検索形式`index(value)` / `find_index(value)`は拒否されRBSティアがそれらを引き続き担当します。
- **8要素のカーディナリティ上限までの短い`Constant<Range>`レシーバーに対する位置ごとのブロックフォールド**。範囲内の各整数はブロックボディを対応する`Constant<Integer>`がパラメーターにバインドされた状態で1回再型付けします。`(1..3).map { |n| n.to_s }`は`["1", "2", "3"]`に解決し、`(1..5).find { |n| n.even? }`は`Constant[2]`に解決します。大きな範囲は拒否されRBSティアが拡大し、ブロック型付けコストを制限します。
- **式位置の条件式に対するブランチ除去**。述語が`Type::Constant`にフォールドする`if` / `unless` / 三項式は到達不能なブランチを削除し、生きているブランチの型を採用します。ステートメントレベルのブランチ除去はv0.0.3からすでに存在していました;このスライスは式位置での使用（例: 代入の右辺、引数式、ブロックボディ）をカバーします。位置ごとのフォールドと直接コンポーズするため、`[1, 2, 3].filter_map { |n| n.even? ? n.to_s : nil }`は`Tuple[Constant["2"]]`に解決します。
- **Constant形状の左オペランドに対する`&&` / `||`短絡除去**。`&&` / `||`の左オペランドが`Type::Constant`にフォールドする場合、結果型はRubyの実際の短絡セマンティクスに従います: `Constant[truthy] && rhs`は右オペランドの型、`Constant[falsey] && rhs`は左を保持、そして`||`にはデュアルルールが適用されます。非Constantの左オペランドは以前の両オペランドの和集合の動作を保持します。
- **`find { false }` / `detect { false }` / `find_index { false }` / `index { false }` / `count { … }`の短絡フォールド**。ファインドファミリーのブロック形式偽値側は`Constant[nil]`にフォールドします; `count { false }`は`Constant[0]`にフォールドします; `count { true }`は、レシーバーが有限サイズをピン留めしている場合（Tuple、HashShape、有限整数エンドポイントを持つ`Constant<Range>`）に`Constant[size]`にフォールドします。値検索形式`index(value)` / `count(value)`は位置引数を持ち、RBSティアが引き続き回答するため拒否されます。
- **IntegerRange対応の三項フォールド——`Comparable#between?` / `Comparable#clamp`**。2引数の`try_fold_ternary`パスは`IntegerRange`レシーバーと2つのスカラー`Constant<Integer>`引数を受け入れるようになりました。`int<3, 7>.between?(0, 10)`は`Constant[true]`にフォールドします; `int<3, 7>.clamp(4, 6)`は`int<4, 6>`にフォールドします（積集合が単一点をピン留めする場合は`Constant`に折り畳まれます）。ブラケットが範囲と完全に交差しない場合——すべてのレシーバー値が一方のブラケット境界にスナップする場合——フォールドは拒否されRBSティアが拡大します。
- **空配列リテラルキャリア——`[]`が`Tuple[]`に解決**。空の配列リテラルは以前`Nominal[Array]`として型付けされていましたが、v0.0.6では空の`Tuple[]`キャリアに切り替わります。これにより位置ごとのブロックフォールドが`[1, 2, 3].flat_map { |_| [] }`のようなすべての空位置に対してクリーンに連結できます（現在`Tuple[]`にフォールドします）。両キャリアともRBS相互運用パスでプレーンな`Array`に消去されます。
- **Pathnameカタログインポート**。`data/builtins/ruby_core/pathname.yml`（102インスタンスメソッド、2シングルトン、5エイリアス）と対応する`Builtins::PATHNAME_CATALOG`がカタログティアに加わります。PathnameはほぼFileおよびDirに委譲する薄いラッパーなので、ユーザーが見えるペイオフはNumericやStringより狭い——このインポートは`Pathname.new(...)`のレシーバークラス認識、防御的な`:initialize_copy`ブロックリストエントリー、唯一の`:leaf`メソッド（`<=>`）に対するカタログフォールドを提供します。

### 修正

- **`tool/extract_builtin_catalog.rb`のrescue-on-defクラシファイアークラッシュ**。`PreludeParser#analyse_body`は以前、Prismがボディを`StatementsNode`ではなく`BeginNode`でラップするrescue-on-defイディオム（`def foo; …; rescue; …; end`）を持つRubyメソッドで`NoMethodError`を発生させていました。クラシファイアーはそのケースのbeginブロックの`statements`に降りるようになりました。このバグはPathname（そのpreludeに`def initialize(path); @path = …; rescue TypeError; …; end`がある）をインポートする際に表面化しました;すべてのカタログは`make extract-builtin-catalogs`下でクリーンに再生成されます。

## [0.0.5] - 2026-05-03

### 追加

- **RationalとComplexの組み込みカタログインポート**。新しいローダー`RATIONAL_CATALOG`と`COMPLEX_CATALOG`が`CATALOG_BY_CLASS`テーブルに加わります;対応するYAMLが`data/builtins/ruby_core/{rational,complex}.yml`下に`tool/extract_builtin_catalog.rb`を通じて`references/ruby/{rational,complex}.c`から生成されます。両クラスはRubyで完全に不変なので、クラスごとの`mutating_selectors`ブロックリストは従来の防御的な`:initialize_copy`エントリーのみを持ちます。Rigorには今日`Constant<Rational>` / `Constant<Complex>`リテラルリフト（`Prism::ImaginaryNode`と`Rational(...)` / `Complex(...)`カーネル呼び出しフォールドは延期）がないため、カタログ配線は現在防御的なサーフェスです——すべてのフィクスチャーアサーションは`Nominal[<class>]`レシーバー上のRBSティア射影を通じて行われます。このブロックリストは将来のスライスが型付け器にこれらのリテラルを`Constant<…>`にリフトする方法を教えた時点でロードベアリングになります。
- **`Const = Data.define(*Symbol)`の発見**。`Inference::ScopeIndexer.record_declarations`は`Const`（囲むクラス / モジュールパスで修飾）を、定数が`Singleton[<qualified-name>]`に解決する発見されたクラスとして登録するようになりました。以前`Const.new(...)`は未ナローイングの`Dynamic[top]`エンベロープを返していましたが、定数の登録により`meta_new`はそれを新しい`Nominal[<qualified-name>]`に解決し、メンバーアクセサーはユーザークラスフォールバックを通じて偽陽性なしで流れます。ベア形式`Data.define(:x, :y)`とブロックオーバーライド形式`Data.define(:x, :y) do; def initialize(x:, y:); …; end end`の両方が認識されます;非Symbol引数と非`Data`レシーバーは拒否されます。実例: `lib/rigor/analysis/fact_store.rb`の`Target`と`Fact`が`singleton(Rigor::Analysis::FactStore::Target)`と`singleton(Rigor::Analysis::FactStore::Fact)`として型付けされるようになりました。
- **`Kernel#Array`精密ティア（`MethodDispatcher::KernelDispatch`）**。新しい精密ティアディスパッチャーが、引数の値格子形状から要素型を証明できる場合はいつでも`Array(arg)`を精密な`Array[E]`にフォールドします。ルールはRubyの変換契約を反映します——`Array(nil) -> []`、既存の`Array[E]`はその要素を保持、Tupleは`Array[T1|T2|…]`に実体化、Unionは要素単位で分配して統合します。不透明な形状（Top / Dynamic / Bot）は既存のRBSティアエンベロープにフォールスルーします。実例: `lib/rigor/analysis/fact_store.rb#fact_targets`で、`fact.target: Target | Array[Target]`に対する`Array(fact.target)`は以前`Array[Dynamic[top]]`として型付けされていましたが、現在は`Array[Target]`として型付けされます。
- **式位置の条件式に対するブランチ認識スコープ伝播**。`Inference::ScopeIndexer.propagate`は`Prism::IfNode`と`Prism::UnlessNode`を特殊ケースとして扱うようになり、述語のナローイングされた真値 / 偽値スコープを対応するブランチサブツリーにスレッドします。以前、`if` / `unless`が式位置（例: 呼び出し引数や`[]=`のRHS）にある場合、インデクサーはそれを`eval_if`のナローイングパスに転送せず、内部ノードはナローイングなしのエントリースコープを継承し、下流のルール（`possible-nil-receiver`、type-ofプローブ）が偽の`T | nil`を見ていました。実例: `cache[k] = if x; x.foo; else; default; end`は真値ブランチ内で`x`がnilでないフラグメントにナローイングされるようになりました。これはステートメントレベル形式`if x; cache[k] = x.foo; else; cache[k] = default; end`の動作と一致します。
- **`RbsLoader#instance_definition` / `#singleton_definition`が`untyped?`として宣言されるようになりました**。以前のsig形式（`untyped`）は上記の真値ナローイングギャップの回避策でした;そのギャップが閉じたことで、sigが実装の`nil`-on-unknown-class戻り値契約を忠実に反映できます。
- **2引数定数フォールドディスパッチ**。`MethodDispatcher::ConstantFolding#try_fold`は以前`args.size`でスイッチし、0引数と1引数の形状のみを処理していました; `Comparable#between?(min, max)`、`Comparable#clamp(min, max)`の明示的境界形式、`Integer#pow(exp, mod)`のような2引数のリーフメソッドはすべてRBS拡大ティアにベイルしていました。ディスパッチは`try_fold_ternary`を通じてルーティングされる`when 2`アームを獲得し、すべてのオペランドが`Constant`（または`Union[Constant…]`）でカタログがメソッドを`:leaf` / `:trivial`と分類する場合にレシーバー × arg0 × arg1のデカルト積をフォールドします。バイナリパスを制限する同じ`UNION_FOLD_INPUT_LIMIT`上限がデカルト爆発を防ぎます。IntegerRangeオペランドはフォローアップのために予約されています。実例: `5.between?(0, 10)`は`Constant[true]`にフォールド、`100.clamp(0, 10)`は`Constant[10]`にフォールド、`100.pow(50, 17)`は`Constant[4]`にフォールド。
- **`tool/catalog_diff.rb` + `make catalog-diff`**。2つの`data/builtins/ruby_core/<topic>.yml`スナップショット間のサーフェスレベルの差分を出力します——クラスごとの追加 / 削除 / 純粋性変更 / cfuncリネーム / アリティ変更。動機となるユースケースは、完全なYAML差分が散文コメント、RBSプル、`defined_at`行番号をインターリーブするため見通しが悪い`references/ruby`サブモジュールのバンプです;このツールはレビュアーが確認すべきカタログセマンティクスの差分を抽出します。デフォルト呼び出し: `make catalog-diff BEFORE=… AFTER=…`。
- **Cボディクラシファイアーが純粋な`rb_check_frozen`ラッパーをミューテーターとして検出するようになりました**。`time_modify(time)` / `time_gmtime(time)`のようなボディ全体が1つ以上の`rb_check_frozen(...)`呼び出しのみのクラスごとのラッパーは、レシーバーのミューテーションゲートを集中管理しているにもかかわらず`:leaf`として分類されていました。`CBodyIndex#mutator_helpers`は純粋な凍結チェックパターンにマッチするボディを持つインデックス済みcfuncのセットを返すようになりました; `CBodyClassifier.classify`はメソッドがそれらのヘルパーのいずれかを呼び出す時に`:mutate`エフェクトをフリップします。このパターンは意図的に狭く制限されています——単純な推移的伝播は`Array#to_a`のような正当な非ミューテーターを過剰にフラグ付けしたため、`rb_check_frozen`呼び出しのみで構成されるボディのみが適格です。再抽出により2つのTimeメソッド（`#gmtime`、`#utc`、両方とも`time_gmtime`にバインド）が`:leaf`から`:mutates_self`に切り替わります;他のすべてのカタログはバイト同一で再生成されます。
- **include対応のモジュールカタログフォールスルーがComparable / Enumerableインポートをアクティブにします**。`MethodDispatcher::ConstantFolding#catalog_allows?`がレシーバークラスの`Module#ancestors`を歩き、プライマリクラスカタログにメソッドのエントリーがない場合にインポートされたモジュールカタログ（`COMPARABLE_CATALOG`、`ENUMERABLE_CATALOG`）を参照するようになりました。解決: プライマリクラスカタログが最初（その`rb_define_method`登録はエントリーが`:dispatch`と分類されていても権威あります）、プライマリにエントリーがない場合のみモジュールカタログ。ユーザーが見えるペイオフ: 直接の`rb_define_method`登録なしに純粋に`include Comparable` / `include Enumerable`ミックスインから来るメソッドがフォールドするようになりました。実例: `5.clamp(0..10)`は`Constant[5]`、`100.clamp(0..10)`は`Constant[10]`にフォールド。
- **ComparableとEnumerableモジュールカタログインポート**。新しい`data/builtins/ruby_core/comparable.yml`と`enumerable.yml`が`Init_Comparable`（compar.c）と`Init_Enumerable`（enum.c）から`tool/extract_builtin_catalog.rb`によって生成されました。カタログ統計: Comparableには7インスタンスメソッド（`<` / `<=` / `==` / `>=` / `>` / `between?` / `clamp`ファミリー）; Enumerableには58インスタンスメソッド（47 `:block_dependent`、9 `:leaf`、2 `:mutates_self`）。対応する`Builtins::COMPARABLE_CATALOG` / `Builtins::ENUMERABLE_CATALOG`シングルトンはブート時にロードされますが、モジュールはディスパッチャーがルーティングするレシーバークラスではないため`MethodDispatcher::ConstantFolding::CATALOG_BY_CLASS`に登録されません;データはレシーバーの祖先チェーンを歩く将来のinclude対応ルックアップのために用意されています。
- **`tool/scaffold_builtin_catalog.rb --module`**。スキャフォールドスクリプトはモジュールモードを獲得しました。このモードはすべてが意味をなさない`CATALOG_BY_CLASS`行、フィクスチャースタブ、統合`describe`ブロックをスキップします（include対応ディスパッチが着地するまで）。ローダーファイルはモジュール対応バナーを持ちます; `require_relative`はシングルトンがアクセス可能なまま挿入されます。関連する抽出器アップグレード（`MODULE_DEFINE_RE`）は`rb_mFoo = rb_define_module("Foo");`登録を認識し、各トピックの`classes`マップに`parent: "Module"`でモジュールを記録します。以前はドロップされていた2つのモジュール登録（`Init_File`の`FileTest`、`Init_String`の`UnicodeNormalize`）がそれぞれのYAMLで空バケットクラスエントリーとして表面化するようになりました。
- **IntegerRangeとIntersectionへの`~refinement`否定の拡張**。`Narrowing.narrow_not_refinement`は以前`Difference[base, Constant[v]]`のみを処理していましたが、代数は2つのキャリア種類をさらにカバーします:
  - `Type::IntegerRange[a, b]` — 補完は2つの開いた半分`int<min, a-1>`と`int<b+1, max>`で、それぞれ`current_type`の整数ドメイン部分と積集合します。Unionレシーバーの非整数部分は変更されません。`Integer`に対する`assert n is ~int<5, 10>`は`int<11, max> | int<min, 4>`にナローイングします。エンドツーエンドのフィクスチャー: `spec/integration/fixtures/assert_negation_integer_range/`。
  - `Type::Intersection[M1, M2, …]` — De Morgan: `D \ (M1 ∩ M2) = (D \ M1) ∪ (D \ M2)`。各メンバーの補完は独立して計算されてユニオン（union、合併型とも）されます;代数が補完を計算できないメンバー（Refined、非Constant Difference）は`current_type`自体を寄与するため、ユニオンは拡大することがあります。`String`に対する`~non-empty-lowercase-string`は、述語対応の補完で得られるより厳密な`Constant[""]`ではなく`Constant[""] | Nominal[String]`を生成します。`Refined[base, predicate]`はその保守的な`current_type`答えを保持します（述語補完は有限キャリアで表現できません）。
- **`assert:` / `predicate-if-*:`ディレクティブでの`~refinement`否定**。`<target> is <RHS>`右辺は精製アームで既存のクラス名アームに加えて`~T`否定プレフィックスを受け入れるようになりました。ナローイングティアはDifference + Constant除去形状のために`Narrowing.narrow_not_refinement`を導入します: 現在の型のユニオンメンバーを歩き、精製のベースから分離された各部分を保持し、任意の現在のメンバーがそれをカバーする場合に除去された値Constantを正確に1回追加します。

  ```rbs
  class Validator
    %a{rigor:v1:assert value is ~non-empty-string}
    def assert_empty!: (::String value) -> void
  end
  ```

  `name: String | nil`に対する`v.assert_empty!(name)`の後、ナローイングされた型は`Constant[""] | NilClass`です——`non-empty-string`ではないオリジナルのユニオンの唯一の住人たち。他の精製キャリア（`Refined`、`Intersection`、`IntegerRange`、および除去がConstantでない`Difference`）は今のところ`current_type`を変更せずに返します;述語補完と境界範囲補完はフォローアップスライスです。
- **`group_by` / `partition` / `each_slice` / `each_cons`ブロックパラメーター射影（プレースホルダー;将来のプラグイン）**。RBSはすでに汎用置換を通じてプレーンな`Array[T]` / `Set[T]` / `Range[T]`レシーバーに対してこれらのメソッドを正しくバインドします;新しいIteratorDispatchアームは、TupleおよびHashShape形状のレシーバーが射影された`Array[union]`拡大ではなく精密な位置ごとの要素ユニオン（またはHashShapeの`Tuple[K, V]`ペア）でブロックボディに到達するためのものです。
- **メモ型Enumerableブロックパラメーター射影**。`IteratorDispatch`は`#each_with_object`（第2引数の実際の型にメモ型が従う`(element, memo)`をyield）と`#inject` / `#reduce`（`(memo, element)`をyield）をカバーします。injectファミリーは3つの呼び出し形状を処理します:
  - `inject(seed) { |memo, elem| … }` — `[seed_type, element_type]`。
  - `inject { |memo, elem| … }` — 両方のブロックパラメーターがレシーバーの要素型にバインドされます（Rubyの最初の要素をメモとするセマンティクス）。
  - `inject(:+)` / `inject(seed, :+)` — Symbol呼び出し形式にはブロックがありません;ディスパッチャーはそれらを認識して拒否します。
- **Date / DateTimeカタログインポート**。新しい`data/builtins/ruby_core/date.yml`が`references/ruby/ext/date/date_core.c`の`Init_date_core`と`lib/date.rb`プレリュードから生成されました。両クラスは単一トピックに着地します——DateTimeはDateから継承し、同じInit関数が両方を登録するため、`tool/extract_builtin_catalog.rb`は2つのRBSバインディング（`date.rbs`、`date_time.rbs`）を持つ1つのエントリーを持ちます。カタログ統計: 2クラス、96インスタンスメソッド、60シングルトンメソッド、149 `:leaf` / 2 `:mutates_self` / 3 `:block_dependent`分類。

### 修正

- **`tool/extract_builtin_catalog.rb`の複数行ブロックコメント**。`CInitParser#join_continuations`はInit関数ボディを1行ずつ走り、パレン深度を追跡して複数行の登録マクロを1つの論理行にマージします。以前の`strip_line_comments`ヘルパーは1行に収まる`/* … */`の実行のみを除去していたため、（`date_core.c`の`cDateTime = rb_define_class("DateTime", cDate);`の前に200行の`/* … */`ブロックがあるような、`rb_define_class`呼び出しの上によく見られる）複数行rdocブロックが深度カウンターへのアンバランスなパレンを寄与し、次のコード行がコメントバッファにマージされていました。修正は行ごとのインデックスが有効のまま残るよう改行を保持しながらCソース全体からブロックコメントを事前除去します。

## [0.0.4] - 2026-05-02

第4プレビュー。テーマ: **OQ3精製キャリア戦略の完成と`RBS::Extended`ディレクティブサーフェスの拡張**。

OQ3キャリアトリプル（v0.0.3からの`Type::Difference`に加えて新しい`Type::Refined`と`Type::Intersection`）はインポートされた組み込みカタログ（[`docs/type-specification/imported-built-in-types.md`](../docs/type-specification/imported-built-in-types/)）に対して機能完成しています。作者は`%a{rigor:v1:…}`アノテーションから精製名のフルセットを表現でき、解析器はメソッドディスパッチ、受け入れ、`argument-type-mismatch`チェックルールを通じてそれらを対称的に射影します。

`RBS::Extended`ディレクティブサーフェスは`rigor:v1:param:`（コール境界とメソッドボディ内での`MethodParameterBinder`を通じた両方）を取り込み、既存の`assert*` / `predicate-if-*`ファミリーは右辺で精製ペイロードを受け入れるようになりました。

組み込みカタログインポートパイプラインはさらに4クラス（Hash / Range / Set / Time）と`tool/scaffold_builtin_catalog.rb`スクリプトを獲得し、各新しいインポートの機械的な70 %を自動化します。

テスト数: 1148 → 1250例（+102）、RuboCopクリーン、`bundle exec exe/rigor check lib`は0件の診断。

### 追加

#### OQ3精製キャリア

- **`Type::Refined`キャリア（述語サブセット半分）**。`Type::Difference`のシブリング。`Type::Refined::PREDICATES`から引かれたSymbolである`(base, predicate_id)`をラップします。構築は`Type::Combinator.refined(base, predicate_id)`と以下に列挙するごとの名前ファクトリーを通じて行われます。RBS消去はキャリアをそのベース名目的型に折り戻します。漸進的（gradual）モードの受け入れは保守的な`accepts_difference`ポリシーを反映します——同じ述語の`Refined`と認識された`Constant`値は`:yes`、その他の形状は`:no`を得ます。
- **`Type::Intersection`キャリア——合成精製名**。`Union` / `Difference` / `Refined`と並んでIntersectionピアを追加してOQ3キャリア戦略を完成させます。キャリアはメンバーの値セットの交わりを表します。構築は`docs/type-specification/value-lattice.md`の決定論的正規化を実行します——flatten / drop-Top / Bot-absorb / dedupe / sort / 0-1 collapse——2つの等しい積集合が構築順序に関わらず等しく比較されます。受け入れはLHSで連言的、RHSで選言的、加えてトップレベルの構造的等値性短絡。`ShapeDispatch.dispatch_intersection`はすべての結果が境界整数の場合IntegerRangeの交わりを通じてメンバーごとの射影を組み合わせます。`(non_empty_string ∩ lowercase_string).size`はより緩い`non-negative-int`ではなく`positive-int`に解決します。
- **14のインポートされた組み込み精製名**。すべて`Builtins::ImportedRefinements`（および`Type::Combinator`のごとの名前ファクトリー）を通じて解決可能:
  - **ポイント除去**（v0.0.3からすでに存在）: `non-empty-string`、`non-zero-int`、`non-empty-array[T]`、`non-empty-hash[K, V]`。
  - **IntegerRangeエイリアス**（v0.0.3からすでに存在）: `positive-int`、`non-negative-int`、`negative-int`、`non-positive-int`。
  - **述語**（新規）: `lowercase-string`、`uppercase-string`、`numeric-string`、`decimal-int-string`、`octal-int-string`、`hex-int-string`。base-N int-string述語は設計上互いに素です——`:octal_int`と`:hex_int`はその慣習的なプレフィックス（`0o` / `0O` / 先頭`0`; `0x` / `0X`）を必要とするため、ベアな`"755"`は`decimal-int-string`であり`octal-int-string`ではありません。
  - **合成積集合**（新規）: `non-empty-lowercase-string`、`non-empty-uppercase-string`。
- **`Refined[String, …]`に対するカタログティア射影**。`String#downcase` / `String#upcase`は述語ごとにフォールドします: `:lowercase` / `:uppercase` / `:numeric`と3つのbase-N int-string述語に対するケースフォールドの冪等性、加えてクロス呼び出しのための`lowercase ↔ uppercase`リフト。サイズティア射影は述語キャリアを通じても適用されるため、`Refined[String, *]`に対する`String#size`は`non-negative-int`に引き締まります。

#### `RBS::Extended`ディレクティブサーフェス

- **`rigor:v1:return:`はパラメーター化された精製ペイロードを受け入れます**。ベア名形状に加えて、ディレクティブは`non-empty-array[T]` / `non-empty-hash[K, V]`（`T` / `K` / `V`がkebab-case精製名またはCapitalisedなRBSクラス名であり得る型引数ペイロード）と`int<min, max>`（符号付き整数リテラルを持つ境界整数範囲）を受け入れるようになりました。パーシングは新しい`Builtins::ImportedRefinements::Parser`再帰下降パーサーに存在し、`ImportedRefinements.parse(payload)`を通じて公開されます。失敗はフェイルソフトです——パースミスはnilを返し、ディレクティブサイトはRBS宣言型にフォールバックします。
- **`rigor:v1:param: <name> [is] <refinement>`ディレクティブ**。v0.0.3で着地した`return:`ルートに対称的で、メソッド境界の両側で機能完成:
  - **コールサイト半分**。`OverloadSelector`と`argument-type-mismatch`チェックルールが`RbsExtended.param_type_override_map(method_def)`を参照し、RBS翻訳型よりオーバーライドを優先するため、広すぎるコールサイトがフラグ付けされます。
  - **ボディ側半分**。`MethodParameterBinder`は同じオーバーライドマップを読み、RBS翻訳パラメーターバインディングを精製で置き換えます。これにより、推論中にメソッドボディ内でキャリアを通じた射影（例: `non-empty-string`パラメーターに対する`id.size`が`positive-int`に解決）が観察可能になります。

  オプショナルな`is`グルーワードは既存の`assert` / `predicate-if-*`サーフェスとマッチします;作者は`param: id non-empty-string`と書くことも可能です。
- **`rigor:v1:assert:`と`rigor:v1:predicate-if-*:`が精製ペイロードを受け入れます**。`<target> is <RHS>`右辺はCapitalisedなクラス名（既存の動作）またはkebab-case精製ペイロードのいずれかにマッチするようになりました。`AssertEffect`と`PredicateEffect`の両方が`refinement_type`フィールドを獲得します;ナローイングティアはそれが存在する場合にキャリアを置き換え、クラス名ディレクティブのためのレガシー`narrow_class`パスを維持します。精製形式ディレクティブはまだ`~T`否定をサポートしません——差異対精製代数が必要であり、将来のスライスに予約されています。

### 修正

- **`accepts_nominal`が精製キャリアをベースに射影します**。`Difference`または`Refined`を受け入れるNominalは以前、`accepts_nominal`のcaseステートメントに精製種類のブランチがなかったため`:no`にフォールスルーしていました。キャリアの値セットはそのベース名目的型のそれに含まれるため、`other.base`に射影して受け入れを再実行することは健全（soundness）です——Intersectionコンジャンクションの配線中に潜在的なバグが表面化しました。
- **ネストされたDifferenceの`provably_disjoint_from_removed?`**。`Difference[A, R].accepts(Difference[B, R])`は以前、内部差異のBASEが`R`から証明可能に非交叉であることを必要としていましたが、これは決して成り立ちません（Nominalベースは構築上において除去された値を含みます）。同じ`removed`で十分です。内部差異レイヤーで非交叉性が示されるからです。

## [0.0.3] - 2026-05-02

第3プレビュー。v0.0.3は推論エンジンを「証明できる場所ではリテラル値を見る」ようにします。v0.0.2よりはるかに広いサーフェスに渡って: 積極的な定数フォールド（単項 + 二項 + `Union[Constant]`デカルト + 整数範囲算術 + Tupleシェイプdivmod）、PHPStan形式のインポートされた組み込み精製キャリア（`non-empty-string`、`positive-int`、`non-zero-int`、`non-empty-array[T]`、`non-empty-hash[K, V]`、`negative-int`、`non-positive-int`、`non-negative-int`）、フォールドディスパッチャーを駆動する抽出済み組み込みメソッドカタログ（CRubyから自動抽出されたNumeric / String / Symbol / Array / IO / File）、イテレーターブロックパラメーター型付け、スコープレベルの整数範囲ナローイング、case / when範囲ナローイング、証明可能な整数ゼロ除算の`always-raises`診断、そして`RBS::Extended`の新しい`rigor:v1:return:`ディレクティブを通じた新しい精製キャリアのエンドツーエンドのオプトイン。

堅牢性原則（型のためのPostelの法則——戻り値は厳格に、パラメーターは寛容に）は今や設計の根拠としてADR-5を持つ型仕様の規範的セクションです。

### 追加

- **ユーザーメソッドを通じた積極的な定数フォールド**。`Rigor::Inference::MethodDispatcher::ConstantFolding`は、メソッドが厳選されたアローリストにあり、オペレーションがレシーバーのドメインで発生させることができず、結果が`Type::Combinator.constant_of`を通じてラウンドトリップするスカラーである場合はいつでも、`Constant`レシーバーと引数の実際のRubyメソッドを呼び出します。プロシージャー間推論（v0.0.2 #5）と組み合わさって:

  ```ruby
  class Parity
    def is_odd(n) = n.odd?
  end
  Parity.new.is_odd(3)   # v0.0.2では`false | true`
                         # 現在は`Constant[true]`
  ```

- **`Union[Constant…]`に対するデカルトフォールド**。二項算術と比較はUnionレシーバーと引数に対してペアワイズでフォールドし、重複を排除して精密な`Union[Constant…]`結果を再構築します。`UNION_FOLD_INPUT_LIMIT = 32`と`UNION_FOLD_OUTPUT_LIMIT = 8`で制限;整数のみの結果セットに対して出力上限を超えた場合、解析器は諦める代わりに正常に境界の`IntegerRange[min, max]`に拡大します。

- **`Type::IntegerRange`キャリアと範囲算術**。名前付きエイリアスを持つPHPStan形式の`int<min, max>`ファミリー——`positive-int`（`1..`）、`non-negative-int`（`0..`）、`negative-int`（`..-1`）、`non-positive-int`（`..0`）、`int<a, b>`。RBSでは`Integer`に消去されます。二項の`+`、`-`、`*`、`/`、`%`と単項の`succ` / `pred` / `abs` / `-@` / `even?` / `odd?` / `bit_length` / `zero?` / `positive?` / `negative?`がすべて精密にフォールドします。単一点積集合（`int<5, 5>`）は`Constant[5]`に折り畳まれます。

- **比較と述語を通じたスコープレベル範囲ナローイング**。`if x > 0 ... end`は真値エッジで`x`を`positive-int`に、偽値エッジで`non-positive-int`にナローイングします。`<`、`<=`、`>=`、反転形式（`0 < x`）、`x.positive?` / `x.negative?` / `x.zero?` / `x.nonzero?`、`x.between?(a, b)`に対しても同様。ナローイングはすでにスコープ内に`IntegerRange`境界がある場合にそれと積集合を取ります。

- **`case / when`整数範囲ナローイング**。`case n when 1..10 then …`はボディ内で`n`を`int<1, 10>`にナローイングします; `when 1...10`は`int<1, 9>`に（排他的終端）; `when (100..)`は`int<100, max>`に; `when (..-1)`は`negative-int`に; `when 0`は`Constant[0]`にナローイングします。

- **イテレーターブロックパラメーター型付け**。`5.times { |i| … }`は`i`を`int<0, 4>`として型付けします; `1.times { |i| … }`は`Constant[0]`に折り畳まれます; `3.upto(7) { |i| … }`と`7.downto(3) { |i| … }`の両方が`i`を`int<3, 7>`として型付けします。より広いIntegerレシーバー（`Nominal[Integer]`、`positive-int`）は`non-negative-int`にフォールバックします。

- **証明可能に真値 / 偽値の述語に対するブランチ除去**。`if 4.even? ; :even ; else ; :odd ; end`は、述語のnarrow_truthy / narrow_falseyが一方を`Bot`に折り畳む場合に`Constant[:even]`のみに解決します——デッドブランチはスキップされます。`Constant[true]` / `Constant[false]` / `Nominal[Integer]`（常に真値）がすべて適格です; `Union[true, false]`は以前と同様に両方のブランチをアクティブに保ちます。

- **`Tuple`形状の`Integer#divmod` / `Float#divmod`フォールド**。`5.divmod(3)`は`Tuple[Constant[1], Constant[2]]`にリフトするため、マルチターゲット分解が各スロットの型をローカルにスレッドします（`q, r = 11.divmod(4)`は`q: 2`、`r: 3`をバインドします）。Float / Integer-Floatミックスdivmodは混合`Tuple[Constant<Integer>, Constant<Float>]`を生成します。

- **組み込みメソッドカタログ抽出パイプライン**。`tool/extract_builtin_catalog.rb`はCRubyの`Init_<Topic>`ブロック（Numeric / Integer / Float / String / Symbol / Array / IO / File）を解析し、各cfuncボディを静的に分類し（leaf / leaf-when-numeric / dispatch / block-dependent / mutates-self / raises / unknown）、対応する`references/rbs/core/*.rbs`シグネチャと結合します。出力は`data/builtins/ruby_core/<topic>.yml`に存在します（`make extract-builtin-catalogs`で再生成）。生成されたYAMLはgemとともにリリースされます。

- **`Type::Difference`キャリア（OQ3ポイント除去半分）**。`Difference[base, removed]`は`base`から有限の除去値セットを引いた値を表し、「non-empty / non-zero / non-empty-array / non-empty-hash」ファミリーのすべてのインポートされた組み込み精製が使用する構造的プリミティブです。受け入れは保守的です: `Constant`と同じ除去の`Difference`候補のみが除去セットから非交叉と証明できるため、`Difference[String, ""].accepts(Nominal[String])`は正しく`no`を返します（より広いNominalは`""`である可能性があります）。

- **`Rigor::Builtins::ImportedRefinements`レジストリ**。すべてのインポートされた組み込みkebab-case名を対応するRigor型キャリアにマッピングします。`RBS::Extended`と将来のトークナイザースライスのための単一統合ポイントです。

- **`rigor:v1:return:` `RBS::Extended`ディレクティブ**。メソッドのRBS宣言戻り型をインポートされた組み込み精製の1つでオーバーライドします:

  ```rbs
  class User
    %a{rigor:v1:return: non-empty-string}
    def name: () -> String

    %a{rigor:v1:return: positive-int}
    def age: () -> Integer
  end
  ```

  コールサイトでオーバーライドが伝播します: `User.new.name.size`は`positive-int`、`User.new.name.empty?`は`Constant[false]`、`User.new.age.zero?`は`Constant[false]`。RBS消去はベース名目的型のまま残るため、通常のRBSへのラウンドトリップは影響を受けません。不明な精製名はRBS宣言戻り値に低下します（サイレントミス、クラッシュなし）。

- **`always-raises`診断ルール**。`5 / 0`、`5 % 0`、`5.div(0)`、`5.modulo(0)`、`5.divmod(0)`、`rand(100) / 0`はすべてルール`always-raises`（「常にZeroDivisionErrorを発生させる」）下で`:error`診断として表面化します。Float算術（`5.0 / 0`は`Infinity`を返す）と`Integer#fdiv(0)`はサイレントのままです。`# rigor:disable always-raises`で行ごとに抑制可能。

- **堅牢性原則（PostelのTypeのための法則）**。新しいADR（[`docs/adr/5-robustness-principle.md`](../docs/adr/5-robustness-principle/)）と規範的仕様セクション（[`docs/type-specification/robustness-principle.md`](../docs/type-specification/robustness-principle/)）が非対称な作成ルールを文書化します: Rigorが作成した戻り型は証明できる限り厳格であるべき; Rigorが作成したパラメーター型はボディの正しい動作が許す限り寛容であるべき。手書きのRBS作成が拘束し;この原則はRigorのデフォルトのみを指示します。

### 修正

- `Rigor::Analysis::CheckRules`の`arity_eligible?` / `argument_check_eligible?`は、RBS関数が`RBS::Types::UntypedFunction`（例: `(?) ->`または特定のstdlib可変長シグネチャ）の場合に発生させなくなりました。両方の述語は型なし関数に対して保守的な結果として`false`を返します——ファイルの解析をクラッシュさせる代わりに。

- `ConstantFolding`のユニオンフォールドは、メソッドがサポートされていないメンバーをサイレントにドロップしなくなりました。以前の動作では、`String#nil?`が`STRING_UNARY`になく、部分フォールドがStringペアをドロップしたため、`Union[Constant[String], Constant[nil]].nil?`は`Constant[true]`にフォールドしていました。フォールドはすべてのレシーバーのメソッドがアローセット内にあることを要求するようになりました;部分カバレッジは間違った答えを生成する代わりにRBSにベイルします。

## [0.0.2] - 2026-05-01

第2プレビュー。v0.0.2はv0.0.1パイプライン周りの必須エンベロープを閉じます: より豊富な`RBS::Extended`ディレクティブサーフェス（`assert` / `assert-if-true` / `assert-if-false`、`~T`否定、`target: self`）、ユーザー定義メソッドのプロシージャー間推論、`argument-type-mismatch`ルール、ルールごとの診断抑制（プロジェクトレベル + インソースコメント）、stdlibライブラリとシグネチャパスの設定パススルー、フェイルソフトフォールバックイベントを表面化する`--explain`モード。

### 追加

- **`rigor check --explain`モード**。エンジンが`Dynamic[Top]`に低下した場所をユーザーが見られるよう、フェイルソフト推論フォールバックを`:info`診断として表面化します。各イベントは`Rigor::Inference::CoverageScanner`によって駆動されるため、それをトリガーしたリーフノードに帰属できます（`ProgramNode` / `StatementsNode` / `ParenthesesNode`のようなパススルーラッパーは二重カウントされません）。各診断は`rule: "fallback"`、`severity: :info`、ノードクラスとエンジンがフォールバックした型を名前に含む短いメッセージを持ちます。Info診断は実行を失敗させません。

- **`.rigor.yml`の`libraries:`と`signature_paths:`キー**。設定レイヤーが`Rigor::Environment.for_project`にパススルーするようになりました:
  - `libraries:`は`Environment::DEFAULT_LIBRARIES`に加えてロードするstdlibライブラリをリストします（例: `["csv", "set"]`）。各エントリーは`RBS::EnvironmentLoader#has_library?`が受け入れる名前でなければなりません;不明なライブラリはフェイルソフト。
  - `signature_paths:`は`sig/`形式ディレクトリの明示的なリストです。キーを未設定（または`null`）にすると`<root>/sig`の自動検出デフォルトを保持します; `[]`はプロジェクトRBSロードを完全に無効にします。

  `rigor check`、`rigor type-of`、`rigor type-scan`を通じて配線されます（後の2つは`check`と一致する`--config=PATH`オプションを獲得します）。

- **ルールごとの診断抑制**。2つのメカニズムが合成されます:
  - **プロジェクトレベル**: `.rigor.yml`の新しい`disable:`キーが`rigor check`ルール識別子のリスト（`undefined-method`、`wrong-arity`、`argument-type-mismatch`、`possible-nil-receiver`、`dump-type`、`assert-type`）を受け入れます;マッチする診断はプロジェクト全体でサイレント化されます。
  - **インソース**: 問題のある行の末尾の`# rigor:disable <rule>`（または`<rule1>, <rule2>`）が行ごとにサイレント化します。`# rigor:disable all`はその行のすべてのルールを抑制します。

  `Rigor::Analysis::Diagnostic`はソースルールの安定した識別子を持つ`rule:`フィールドを獲得します。パースエラー / パスエラー / 内部解析器エラーは`rule`を`nil`として残し、抑制不可のままです。

- **ユーザー定義メソッドのプロシージャー間推論**。コールのレシーバーがRBSシグなしのユーザー定義クラスの`Nominal[T]`でメソッドがインスタンス`def`として発見されている場合、エンジンはコールサイトでコールの引数型をパラメーターにバインドしてメソッドのボディを再型付けし、ボディの最後の式の型を返します。`user_methods.rb`統合フィクスチャーはRBSシグなしで`Parity.new.is_odd(3)`を`false | true`に解決するようになりました（v0.0.1では`Dynamic[top]`）。

  最初のイテレーションは最もシンプルなパラメーター形状（必須の位置引数、オプショナル / rest / キーワード / ブロックパラメーターなし）のみを受け入れます;レシーバーはNominal（Singletonではない）でなければなりません;再帰はスレッドごとの推論スタックで防がれるため、相互再帰ヘルパーは無限ループの代わりに`Dynamic[Top]`にフォールバックします。

- **`argument-type-mismatch`ルール**。すべての明示的レシーバーの`Prism::CallNode`（`rest_positionals`なし、必須キーワードなし、末尾の位置引数なし）に対して、ルールは各位置引数の推論された型を`Rigor::Inference::Acceptance.accepts(parameter, argument, mode: :gradual)`を通じてルーティングし、パラメーターが受け入れない最初の引数に`:error`を発生させます。`Dynamic`としてのみ既知の引数またはパラメーター型はチェックをスキップします（コールは静的に反証できません）。

- `Rigor::Inference::Acceptance`は`Singleton[T]`を`Module`、`Class`、`Object`、`BasicObject`の部分型（subtype）として扱うようになりました。このルールなしに、パラメーターが`Class | Module`として型付けされているメソッド（例: `Object#is_a?`、`Module#define_method`）はすべてのsingletonレシーバーを拒否し、`lib/`と`spec/`の両方に全体的な偽陽性を生成していました。

- `RBS::Extended`の`target: self`ディレクティブが実際にマッチするエッジでレシーバーローカルをナローイングするようになりました（以前: パーサーは受け入れたがエンジンは破棄していた）。3つのルール形状をカバーします:
  - `predicate-if-true self is LoggedInUser` / `predicate-if-false self is User` — `if` / `unless`述語の真値 / 偽値エッジでレシーバーローカルをナローイングします。
  - `assert-if-true self is AdminUser` — 同じ形状、コールが真値述語として観察された場合に適用されます。
  - `assert self is RegisteredUser` — ポストコールスコープで無条件にレシーバーローカルをナローイングします。

  ナローイングはコールのレシーバーが`Prism::LocalVariableReadNode`（エンジンのナローイングサーフェス）であり、レシーバー型が静的に既知（Nominal / Singleton / Constant——どのクラスのメソッドがアノテーションを持つかを解決するためにエンジンが必要）の場合のみ発火します。

- `RBS::Extended`は`~ClassName`構文を通じて述語 / アサートディレクティブで**否定**を認識するようになりました:
  - `predicate-if-true value is ~NilClass`は真値エッジで`value`を`NilClass`から**離れる**方向にナローイングします。
  - `assert value is ~NilClass`はポストコールスコープで`value`を`NilClass`から**離れる**方向にナローイングします。

- `RBS::Extended`は3つの追加ディレクティブを認識します:
  - `rigor:v1:assert <target> is <Class>` — ポストコールスコープで無条件にマッチする引数のローカルを精製します。
  - `rigor:v1:assert-if-true <target> is <Class>` — コールが真値述語として観察された場合（例: `if call_node`）に引数を精製します。
  - `rigor:v1:assert-if-false <target> is <Class>` — 偽値のための対称形。

- `Rigor::Environment::DEFAULT_LIBRARIES`は`tmpdir`、`stringio`、`forwardable`、`digest`、`securerandom`を含むようになりました。一般的なstdlib呼び出し（`Dir.mktmpdir`、`StringIO.new`、`Forwardable#def_delegator`、`Digest::SHA256.hexdigest`、`SecureRandom.hex`）はユーザーがライブラリを列挙することなくそれらのRBSシグを通じて解決します。

### 変更

- `Rigor::Analysis::CheckRules`の`dump_type` / `assert_type`ルールは、コールサイトの`self_type`が`Rigor`または`Rigor::Testing`の場合に抑制されます。Rigor自身のスタブ内の再帰的な`Testing.dump_type(value)` / `Testing.assert_type(...)`呼び出しは`rigor check lib`で診断を表面化しなくなりました。

## [0.0.1] - 2026-05-01

最初のプレビューリリース。Rigorは実際のRubyプロジェクトに向け、フローセンシティブ（flow-sensitive）なスコープを通じてエンドツーエンドで型を推論し、小さいが実用的なルールカタログに対して診断を発行できます。

gemはRubyGemsに**`rigortype`**として公開されています（`rigor`の名前はすでに使われていました）。Rubyモジュール名は`Rigor`のままなので、ユーザーコードは`require "rigor"`を使い`Rigor::Scope`、`Rigor::Testing`などを参照します——`gem install` / `Gemfile`の行のみが`rigortype`を使います。

### 追加

- **`rigor check`エンドツーエンドパイプライン**。Prismを通じてRubyを解析し、ノードごとのスコープインデックスを構築し、3ルールカタログに対して実行します:
  - 型付きレシーバーでの未定義メソッド、
  - 位置引数の数の誤り、
  - 可能性があるnilレシーバー（セーフナビゲーションとアーリーリターンナローイングの除外を含む）。
  再開クラス、`define_method`で定義されたメソッド、定数宣言エイリアスクラス（`YAML` → `Psych`）、動的 / 未知のレシーバーに対する偽陽性は抑制されます。
- **`rigor type-of FILE:LINE:COL`** — 任意のソース位置での推論型をプローブします。
- **`rigor type-scan PATH...`** — ツリーに対するカバレッジレポート。
- **`rigor init`** — ヘッダーコメント付きの`.rigor.yml`を書き込みます。
- **型モデル**。`Top`、`Bot`、`Dynamic[T]`、`Constant[v]`、`Nominal[Class, type_args]`、`Singleton[Class]`、`Union[A, B, ...]`、`Tuple[T1, ..., Tn]`、required / optional / read-onlyキーポリシーを持つ`HashShape`キャリア。`Trinary`（`yes` / `no` / `maybe`）と`AcceptsResult`。
- **推論エンジン**。`Rigor::Scope`を通じて追跡されるローカル、インスタンス、クラス、グローバル変数バインディング。クロスメソッドivar / cvarアキュムレーターが`ScopeIndexer`プレパスで設定されます;プログラム全体のグローバル。
- **複合書き込み**（`||=`、`&&=`、`+=`、`-=`、`*=`など）が`MethodDispatcher`を通じた演算子ディスパッチとともに、すべての変数種類のスコープを通じてスレッドされます。
- **`self`型付け**。クラスとメソッドボディの境界が`Singleton[T]` / `Nominal[T]`を注入します;暗黙的自己コールディスパッチが囲むクラスのRBSを通じてルーティングされます。
- **語彙的定数ルックアップ**。プロジェクトsig、RBSコア、一般的なstdlibバンドル（pathname、optparse、json、yaml、fileutils、tempfile、uri、logger、date、prism、rbs）、インソースクラス発見、インソース定数値追跡。
- **述語ナローイング**。真偽値、`nil?`、`is_a?` / `kind_of?` / `instance_of?`、有限リテラル等値、Class / Module / Range / Regexpに対する`===`（ケース等値）、`case` / `when`統合。
- **ブロックパラメーターバインディング** — 分解（`|(a, b), c|`）と番号付きパラメーター（`_1`、`_2`など）を含む。ジェネリックメソッドを通じたブロック戻り型アップリフトにより`[1, 2, 3].map { |n| n.to_s }`は`Array[String]`に解決します。
- **クロージャーエスケープ解析**。コアとstdlibのブロックを受け入れるメソッドのカタログが`:non_escaping`（Array#each / map / select / ...）、`:escaping`（Module#define_method、Thread.new、Proc.new、...）、`:unknown`として分類されます。エスケープコールはブロックが再バインドできるキャプチャされた外部ローカルのナローイングされた型をドロップし、`closure_escape`ファクトをFactStoreに記録します。
- **`RBS::Extended`述語効果**。RBSシグネチャに`%a{rigor:v1:predicate-if-true target is T}` / `predicate-if-false`アノテーションを持つメソッドは対応するエッジでマッチする引数をナローイングします。
- **PHPStan形式の型ヘルパー**。`Rigor::Testing.dump_type`は推論された型を`:info`診断として表面化します; `Rigor::Testing.assert_type("expected", value)`は推論された型の短い説明がマッチしない場合にエラーを発生させます。フィクスチャーを自己アサーティングにするために使用します。
- **自己アサーティング統合スイート**。`spec/integration/fixtures/`下のフィクスチャー駆動の例——等価性 / case-when / 複合書き込み / is_a?ナローイング / TupleとHashShapeアクセス / Array#mapブロック戻り型アップリフト / アーリーリターンナローイング / RBS::Extended述語 / ユーザー定義メソッドディスパッチをカバーします。

### 既知の制限事項（v0.0.2に延期）

- ユーザー定義メソッドのプロシージャー間推論。`def is_odd(n) = n.odd?`のようなヘルパーはdef内で正しく型付けされますが、呼び出し元はRBSシグが提供されるまで`Dynamic[top]`を観察します。
- `RBS::Extended`は述語効果サーフェスのみをリリースします。`assert` / `assert-if-true` / `assert-if-false`、否定（`~T`）、自己ターゲットナローイング、積集合 / ユニオン精製、`param` / `return` / `conforms-to`ディレクティブは延期されます。
- 永続キャッシュなし——すべての`rigor check`実行がプロジェクトを再解析して再型付けします。
- バンドルされた`RBS::Extended`リーダーを超えたプラグイン貢献レイヤーなし。
- ルールごとの重大度は`:error`にハードコードされています（`dump_type`用の`:info`を予約）;ルールごとの設定と抑制コメントは延期されます。


[0.0.9]: https://github.com/rigortype/rigor/compare/v0.0.8...v0.0.9
[0.0.8]: https://github.com/rigortype/rigor/compare/v0.0.7...v0.0.8
[0.0.7]: https://github.com/rigortype/rigor/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/rigortype/rigor/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/rigortype/rigor/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/rigortype/rigor/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/rigortype/rigor/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/rigortype/rigor/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/rigortype/rigor/releases/tag/v0.0.1
