---
title: "ADR-60: フリーズ前のプラグイン契約統合"
description: "Imported from rigortype/rigor docs/adr/60-pre-freeze-plugin-contract-consolidation.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/60-pre-freeze-plugin-contract-consolidation.md"
sourcePath: "docs/adr/60-pre-freeze-plugin-contract-consolidation.md"
sourceSha: "a10dbddc992115e08910461896569f8f090061e7f38b140579183905e9581319"
sourceCommit: "222d8e03ee0f4252795f6c7294672a76c20b7ae3"
translationStatus: "translated"
sidebar:
  order: 4060
---

- ステータス: Accepted（2026-06-13）
- アーキタイプ: mechanical-policy（WD1、WD2、WD4、WD5）＋deliberative（WD3）
- 利害: 中程度 — 1.0前に意図的に行う3件の後方互換性（BC）破壊だが、影響を受ける
  コンシューマーはすべてこのリポジトリにバンドルされており、ADR-52のスライス5bの
  移行プロトコルが確立済みの前例となっている。キャッシュセマンティクスの変更（WD3）が
  最も利害の大きいメンバーであり、設計を誤れば気づかぬうちに古いキャッシュ（stale cache）が
  出荷される。

## コンテキスト

[ADR-50](../50-release-engineering-and-stability-strategy/)は、列挙された
公開プラグインサーフェス（surface）をv1.0.0で凍結する。
[2026-06-13のプラグインインターフェースレビュー](../../notes/20260613-plugin-interface-bc-review/)は、
ADR-37/52/53適用後の契約（contract）を、本番プラグイン31個＋例6個すべてに対して
監査した。残存する性能由来のインターフェース問題は見つからなかったが、凍結**前に**
修正しなければならない欠陥が3件見つかった。凍結後には修正できないからである。

1. `external_files:`はマニフェストのフィールドだが、エンジン側のコンシューマーが
   ゼロである（ADR-16のTier D基盤はスライス5bに積まれたまま、一度も需要ゲート
   （demand-gate）されなかった）。これを凍結すると、永久に空のままの約束を出荷する
   ことになる。
2. マクロの値オブジェクトは、同じ2つの概念を3通りに綴っている。
   `BlockAsMethod`は`verbs:`を取るのに対し、`HeredocTemplate`／`TraitRegistry`は
   `method_name:`を取る。また`NestedClassTemplate`は`name_arg_position:`を取るのに
   対し、他は`symbol_arg_position:`を取る。
3. `Plugin::Base#cache_for`は自動構築したディスクリプタ（`IoBoundary`の読み取り
   履歴）を*呼び出し*時にスナップショットするが、プロデューサー（producer）ブロックは
   *あとで*実行される。そのため、ブロック内で行われた読み取りはキャッシュ
   ディスクリプタから見えない。素直に書いたプロデューサーは古いキャッシュを返す。
   rigor-actionpackとrigor-rails-routesには、「`cache_for`の**前に**境界をプライム
   （prime）せよ」という手書きコメントが付いている。契約上、この順序を強制するものが
   何もないからである。さらに6個のプラグインは、ファイルの追加・削除をカバーするため、
   `glob_descriptor`の行を手で組み立てている。

同レビューは、本ADRの追加層（additive tier、WD4）が吸収するオーサリングの
ボイラープレートも計測した。12個のプラグインが`*_index_or_nil`の遅延メモ（lazy memo）を
手作りしており（うち4個は「未照会」と「照会済みでnil」を区別する明示的な`_resolved`
フラグを持つ）、約23個の`node_rule`プラグインが同じ違反→`diagnostic`のマッピングを
繰り返している。

## 決定基準

**あるサーフェスがv1.0凍結に入れるのは、（a）エンジン側のコンシューマーに配線されており、
（b）兄弟と一貫した名前を持ち、（c）自身のドキュメントが示すとおりの使い方をしたときに
気づかぬうちに誤った結果を生み得ない、これらすべてを満たす場合に限る。**（a）を満たさない
サーフェスは削除する（再導入は需要ゲートされ、同一変更でエンジン側コンシューマーと
ともにランドしなければならない）。（b）の不備はコンシューマーがすべてバンドルされている
今のうちにリネームする。（c）の不備は、正しい使い方だけが表現可能な使い方になるよう
再設計する。

## WD1 — `external_files:`（および`Macro::ExternalFile`）の削除

マニフェストのフィールド、その検証、その`to_h`の行、`Macro::ExternalFile`値オブジェクト、
そしてCLIのケイパビリティ（capability）カウント用の配管を削除する。`external_files:`を
渡したプラグインは、クラス定義時に標準の未知キーワード`ArgumentError`で失敗する —
気づかぬうちにではなく、声高に。ADR-16のTier Dは記録された設計として残る。具体的な
ターゲット（Redmineのwebhookペイロード、tDiaryのプラグインローダー）がそれを要求した
ときに、フィールドはそのスキャナと**ともに**1つの変更で戻ってくる。

## WD2 — マクロ値オブジェクトの命名の正規化

| オブジェクト | 旧キーワード | 新キーワード |
| --- | --- | --- |
| `Macro::BlockAsMethod` | `verbs:` | `method_names:` |
| `Macro::NestedClassTemplate` | `name_arg_position:` | `symbol_arg_position:` |

リーダー（`#verbs` → `#method_names`、`#name_arg_position` →
`#symbol_arg_position`）と`to_h`のキーもこれに従う。エイリアスも非推奨シム
（deprecation shim）も設けない — 1.0前の窓は、まさに凍結されるサーフェスが
1通りの綴りを持つために存在する。エンジン内部のインデックス命名
（`block_entries_by_verb`など）は一貫性のために追従してよいが、契約ではない。同一変更で
移行するもの: rigor-sinatra、rigor-devise（block_as_methods）、rigor-mangrove
（nested_class_templates）、およびそれらのスペック。

## WD3 — プロデューサーの`watch:`とrecord-and-validate方式の`cache_for`

順序のハザードは構造的なものである。`fetch_or_compute`は値が計算される*前に*完全な
ディスクリプタを要求するが、プロデューサーの入力とは、まさにそのブロックが読み取る
ものである。ADR-45は、ラン結果キャッシュ（run-result cache）のために健全な代替手段を
すでに構築している — `Cache::Store#fetch_or_validate`である。これはエントリーを*安定した*
入力でキー付けし、値の傍らに、計算の**後で**記録された依存ディスクリプタを格納し、
次回ランで再ダイジェスト（re-digest）により再検証する（`Descriptor#fresh?`）。WD3は
プラグインのプロデューサーをこれに移す。

新しいサーフェス:

- `Cache::Descriptor::GlobEntry.new(root:, pattern:, value:)` — `value`は、
  `File.join(root, pattern)`にマッチするすべてのファイルの、ソート済みの
  `[relative_path, content_digest]`ペアにわたるSHA-256である。1つのエントリーが
  内容の変更・追加・削除をカバーする。`Descriptor#fresh?`は再glob・再ダイジェストを
  行い、`#cache_key_for`のシリアライズはこの新しいコレクションを含む。
- `producer :id, watch: …` — ディスカバリー型プロデューサーのglobカバレッジを宣言する。
  `watch:`は`[roots, pattern, …]`タプルの静的なArrayか、Procのいずれかである（Procは
  `cache_for`呼び出し時に`instance_exec`を通して実行されるので、`init`由来のrootも機能
  する）。`cache_for`呼び出しごとに評価され、クラス定義時には決して評価されない。
- `cache_for(id, params:, descriptor: nil)`は`fetch_or_validate`に切り替わる。**キー**
  ディスクリプタは`PluginEntry`テンプレート（id、version、config digest）に、任意の
  `descriptor:`追加分（gemのピン、`ConfigEntry`の行 — *アイデンティティ*入力）を
  合成したものである。**依存**ディスクリプタはブロック実行の後で記録される —
  `IoBoundary`の計算後の読み取り履歴に、評価済みの`watch:`の`GlobEntry`の行を加えた
  ものである。したがってブロック内の読み取りは常に捕捉される。「`cache_for`の前に
  プライム」イディオムと手で組み立てた`glob_descriptor`の呼び出し箇所は削除される。
  `Plugin::Base#glob_descriptor`はprivateになる（`watch:`機構の実装としては残る）。

許容するコスト: 検証パス上では、watch対象のプロデューサーごと・プロセスごとに、glob 1回
＋内容の再ダイジェストが1回かかる（旧来の`glob_descriptor`も`cache_for`呼び出しごとに
同じダイジェストを払っていたので、これはリグレッションではない）。計算後の境界
スナップショットは過大近似（over-approximate）である（同一プラグインインスタンス上の
先行プロデューサーからの読み取りを含む）が、これが引き起こし得るのは余計な再計算だけで、
古い値をヒットすることは決してない。

WD3内で却下したもの:
- *`fetch_or_compute`を維持しつつ`watch:`を必須にする* — 非glob型プロデューサー
  （例: 単一ファイルの`db/schema.rb`読み取り）についてハザードの境界履歴の半分を残し、
  2つのディスクリプタ規律を生かし続けてしまう。
- *`cache_for`の後の`io_boundary`読み取りを検出する解析（lint）* — 修正ではなく検出で
  あり、契約は依然として順序依存のままになる。

## WD4 — 追加的なオーサリングヘルパー（BCではない。同じ弧でランドする）

- `Plugin::Base#read_fact(plugin_id:, name:)` — nilを含むインスタンス単位のメモ付きの
  `services.fact_store.read`。`_resolved`フラグのイディオムを葬る。
- `Plugin::Base#producer_value(id, params: {})` — nilを含む`(id, params)`単位のメモ付きの
  `cache_for(id).call`であり、失敗を記録して（`#producer_error(id)`経由で読める）nilを
  返す`StandardError`レスキューを伴う — 支配的な`*_index_or_nil`の形に名前を付けたもの。
  失敗を顕在化させたいプラグインは、今日そうしているのとまったく同じように、
  `diagnostics_for_file`内で`producer_error`からdiagnosticを発行する。
- `Plugin::Base#diagnostics_for(violations, path:)` — ダックタイプ（duck-typed）の違反
  オブジェクト（`#location`、`#message`、任意の`#severity`、`#rule`）を`#diagnostic`を
  通してマップし、繰り返される`.map`ブロックを吸収する。

これらは、v1.0凍結が列挙する*最終的な*オーサリングイディオムを定義する。12個の
`*_or_nil`／7個の`fact_store.read`／約23個のマッピング箇所が移行し、バンドルされた
コーパスがプラグインの書き方の1つを示すようになる。

## WD5 — ドキュメントの整合

レビューのTier 3のkeep判定（`dynamic_return`／`type_specifier`の分割、ファイル
ルールサーフェスとしての`diagnostics_for_file`、`config_schema`の二重文法）は設計上の
決定であってギャップではない — それらはそのように文書化される。貢献者向け
SKILL（`.claude/skills/rigor-plugin-author`）と外部オーサー向けSKILL
（`skills/rigor-plugin-author`）には、次が加わる。`type_specifier`と
`TypeNodeResolver`のサーフェス、2つのファクト（fact）公開スタイル（軽いスキャン向けの
`prepare`＋`publish`と、キャッシュされたディスカバリー向けの`producer`）とその選択
ルール、エラーハンドリングのガイダンス（標準としての`producer_value`＋
`producer_error`）、そしてWD2/WD3のリネーム。

## 却下した代替案（凍結時に蒸し返されないよう記録する）

- **`dynamic_return`／`type_specifier`を1つのDSLに統合する** — この分割には筋が通って
  いる。戻り値の型vs戻り後のファクト、ディスパッチャーvsステートメント評価器、
  異なるコンパイル済みゲートの形。統合したDSLは内部で`on:`ディスクリミネーターによって
  分岐するだけになり、買えるのはリネームだけである。
- **`diagnostics_for_file`を削除する** — 15個のプラグインが、ノードウォークでは表現
  できないファイルレベルのdiagnostic（ディスカバリーのロードエラー、クロスファイルの
  集約）のためにこれを使っている。ContributionIndexによってゲートされており、コストは
  何もかからない。これはファイルルールサーフェスであって、レガシーなノードルールでは
  ない。
- **素の`config_schema`のkind形式を禁止する** — ADR-40は、素のkindの意図的なスーパー
  セットとして`{kind:, default:}`Hashを採用した。移行コストに見合うものは何も買えない。

## 検証

ADR-52のスライス5bの前例にならい、各WDは次とともにランドする。削除・リネームされた
綴りに対する声高なロード時失敗（気づかぬうちの劣化なし）、CHANGELOGの移行テーブル、
同一チェンジセットで移行されたすべてのバンドル済みコンシューマー、そしてグリーンな
`make verify`（self-check＋`check-plugins`）。WD3はさらに次をゲートとする。
クロスプロセスのプラグインキャッシュ・リグレッション群（ADR-45の`pundit_plugin_spec`
パターン — 2つのプロセスの間でwatch対象のファイルを編集し、プロデューサーが再計算する
ことをアサート。globにマッチするファイルを削除・追加した場合も同様）、Mastodon／GitLab
コーパスのランがバイト単位で同一であること、そして`make bench-perf`がニュートラルで
あること。WD4の移行は挙動を保つもので、同じゲートに乗る。
