---
title: "ADR-126 — 統一されたCLI文法、バージョン付きJSONドキュメント、およびゲート付きコマンドカタログ"
description: "rigortype/rigor docs/adr/126-cli-grammar-and-catalogue.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/126-cli-grammar-and-catalogue.md"
sourcePath: "docs/adr/126-cli-grammar-and-catalogue.md"
sourceSha: "5f078a3ca61ff350d8684e7844b066a18c58c01a87bf0776c3614e3378a4f030"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-10-30T03:47:14+09:00"
translationStatus: "translated"
sidebar:
  order: 4126
---

ステータス: **Accepted、2026-10-30;未実装**。作業は[#2503](https://github.com/rigortype/rigor/issues/2503)（バージョン付きJSONドキュメント、WD2）、[#2504](https://github.com/rigortype/rigor/issues/2504)（文法の収束、WD1）、および[#2505](https://github.com/rigortype/rigor/issues/2505)（カタログとゲート、WD3）として登録されている。決定を要しない1件の欠陥である[#2502](https://github.com/rigortype/rigor/issues/2502)（`--format`が解析後に検証されるか、まったく検証されない問題）は独立して着地する。ADR-50 WD1のJSON行は#2503とともに着地する。

根拠: Cloudflareの[`cf` CLIローンチ](https://blog.cloudflare.com/cloudflare-cf-cli-launch/)（2026年）——1つの行為に対して`d1 info`、`hyperdrive get`、`workflows describe`といったWranglerの手作りのコマンド群を1つのスキーマから生成されるコマンドに置き換え、JSONをデフォルト出力とし、エージェント向けのコマンド検索を追加したもの——と、それに対する`lib/rigor/cli/`の調査（本ADRのコンテキスト）。

## コンテキスト

Rigorの26個のコマンドは、それを必要とした変更ごとに1つずつ追加されたため、Wranglerと同様のドリフトを起こしている:

- **1つの行為に2つの文法**。`rigor skill`と`rigor docs`は位置引数とフラグ（`--list`、`--path`）でバンドルされたアセットを閲覧する——[ADR-73](../73-skill-driven-user-experience/)の2026-06-21修正および[ADR-74](../74-offline-doc-access-and-llms-txt/)が移行した先の文法である。一方、`rigor plugin`は同じ仕事を動詞（`list`、`path`、`print`、`root`）で行っている。
- **1つの言葉に2つの意味**。`rigor baseline`は`.rigor-baseline.yml`（ルールIDのバケット、[ADR-22](../22-baseline-and-project-onboarding/)、[`CONTEXT.md`](https://github.com/rigortype/rigor/blob/master/CONTEXT.md)における意味）を管理する。一方で`rigor diff`は保存された`check --format=json`ドキュメントを`rigor.baseline.json`と呼んでいる（`lib/rigor/cli/diff_command.rb` ~L24）。両者は照合方法が異なり、互換性がない。
- **一部のコマンドにのみ適用されるルール**。`--format`は11個のコマンドではパース時に拒否され、4個のコマンド（`check`、`coverage`、`type-of`、`type-scan`）では解析全体が終わった後に拒否され、2個のコマンド（`trace`と`unused`）ではまったく拒否されない（`json`以外の任意の値に対してテキストを出力する）。
- **契約のないJSONドキュメント**。[ADR-61](../61-agent-friendly-diagnostic-statistics/)は構造化JSONをエージェントが集約するサーフェスとしたが、[ADR-50](../50-release-engineering-and-stability-strategy/) WD1のv1.0テーブルは「CLIコマンド＋フラグ」を挙げるのみで、ドキュメントについては沈黙している。マーカーを持つのは`baseline dump`（`version`）と`lens`（`schema: lens/v0`、`revision`）だけである。3つのドキュメントは安定したトップレベル形状を持たない: `type-of`は単一位置ではオブジェクトで、複数位置では`{ "results": [...] }`となり（`type_of_renderer.rb` ~L93）、`explain`はインデックスやルールでは配列で、sig-genスキップ理由ではオブジェクトとなり（`explain_command.rb` ~L64–L109）、`trace`は裸の配列である（`trace_command.rb` ~L84）。
- **手作業で維持される4つの記述**——`CLI#help`、各コマンドのバナー、`docs/manual/02-cli-reference.md`、MCPの`inputSchema`。コマンド*名*は`HANDLERS`に対してゲートされている（`spec/docs/manual_drift_spec.rb`、`spec/rigor/cli_spec.rb`）が、フラグ、フォーマット、およびMCPツールはゲートされていない。

なぜ今か: ADR-50はv1.0.0でコマンドとフラグを凍結する。それまではリネームのコストは1回の非推奨化マイナーリリース（WD7の1.0前リハーサル）で済むが、それ以降はメジャーリリースを要する。

## 決定

コマンドを生成するのではなく、2つの基準に文法を収束させ、各JSONドキュメントをバージョン付き契約とし、カタログに基づくゲートでサーフェスをその両方に適合させ続ける。

**基準A — 名前を誰が所有するかが文法を決める**。Rigorが出荷する名前空間（スキル、ドキュメントページ、プラグイン）を閲覧するコマンド——そのメンバーはリリースのたびに増える——は、将来のメンバーが動詞と衝突しないよう、メンバー名を位置引数として、そのモードをフラグとして受け取る。プロジェクト状態に対して作用するコマンドは動詞サブコマンド（`baseline generate|…|prune`、`effects update|check|diff|explain`）を取る。動詞と衝突するプロジェクトパスは`./update`のように書く。既存の行為に対して新たな表記は追加しない。ただし慣例的な`--help`のエイリアスとしての`rigor help <command>`（WD3）は例外であり、AcceptedなADRが保持する表記（ADR-73に基づく`rigor describe`、`skill describe`、`skill --describe`）はそのまま残る。

**基準B — コンシューマーが分岐する対象はバージョン付きフィールドである**。フィールドからドキュメントへと引き上げたADR-61の「メッセージテキストはプレゼンテーションである」ルール: JSONドキュメントのトップレベル形状は入力に依存してはならず、ドキュメント自身がどの形状であるかを宣言する。フラグによって異なるドキュメントが選択される場合（`coverage`の通常 / `--protection` / `--mutation` / fused、`plugins --capabilities`）、トップレベルの`"mode"`文字列がそれを命名し、`schema_version`はモードごとにカウントする。

### WD1 — 文法の変更（[#2504](https://github.com/rigortype/rigor/issues/2504)）

- `rigor plugin`は`skill`/`docs`の文法（基準A）を採用する: `rigor plugin <name>`、`--path <name>`、`--list`（デフォルト）、`--root`。従来の動詞は非推奨化される（WD4）。
- `diff`の入力は「保存された`rigor check --format=json`の結果」であり、ベースラインではない。サンプルファイルは`rigor-check.json`になる。挙動の変更はない。
- 未知のコマンド、または未知の`baseline` / `effects`の動詞に対しては最も近い名前を提案し、これによりリネームなしで`plugin`/`plugins`もカバーされる。

### WD2 — JSONドキュメントは契約である（[#2503](https://github.com/rigortype/rigor/issues/2503)）

ADR-50 WD1に1行追加される: 各`--format=json`ドキュメントのキー集合はv1.0.0で契約となる。キーの追加はマイナーリリースで許容され、削除またはリネームはメジャーリリースでのみ行える。空白は契約に含まれないため、`lens`と`annotate`はコンパクト出力を維持する。Rigorが定義するドキュメントは`1`から始まるトップレベルの整数`schema_version`を持つが、次の3つの例外がある:

- 独自の仕様によってすでにバージョン付けされているドキュメントはそのマーカーを維持し、2つ目を追加しない——`lens`（`schema`/`revision`、[`docs/internal-spec/lens.md`](../../internal-spec/lens/)により`lens/v1`まで契約外）および`baseline dump`（`version`）。
- `check`の外部フォーマット（`sarif`、`gitlab`など）はそれぞれのスキーマを維持する。
- 保存されたドキュメントのリーダー（`rigor diff`）は、`schema_version`を持たないものをバージョン`1`として受け入れる。

安定したトップレベルオブジェクトを持たない3つのドキュメント——`type-of`、`explain`、`trace`——は`{ "schema_version": 1, "<plural noun>": [...] }`になる。これはstdoutを保持できない形状変更であるため、WD4の第2のパスに従う。

### WD3 — カタログとそのゲート（[#2505](https://github.com/rigortype/rigor/issues/2505)）

`CLI::Catalogue`は`HANDLERS`の各コマンドに加えて`help`と`version`のエントリーを保持する。フラグはパースを行わずに構築された各コマンドの`OptionParser`から取得する。`argv`を手動でパースするコマンド（`skill`、`docs`、`plugin`、`describe`）は自身のフラグを宣言し、オプションの`rigor-playground` gemに委譲する`playground`はフラグなしでリストされる。`CLI#help`はそこからレンダリングされ、`rigor help --format=json`はそれを出力し、`rigor help <command>`は`rigor <command> --help`になる。既存の名前ゲート（`manual_drift_spec.rb`、`cli_spec.rb`）はカタログに切り替わり、新しいspecがMCPツールと文法ルールを追加する: 委譲されないすべてのコマンドの`--help`は0で終了し（現在`rigor describe --help`は64で終了する）、`json`を受け付けるすべてのコマンドは未知の`--format`を解析前に64で拒否する。

### WD4 — 非推奨化のメカニズム

- **表記**は1マイナーリリースの間動作し続け、stderrに1つの通知を出力し、stdoutはバイト単位で同一に保つことでそれを消費するパイプラインが壊れないようにする。次のマイナーリリースで`changelog.d/removed/`フラグメントとともに削除される。
- **JSON形状**は古いstdoutを維持できない。変更の前のマイナーリリースでは、対象コマンドのすべての`--format=json`実行時に`deprecated`フラグメントとstderr通知を出荷し、次のマイナーリリースで`changed`フラグメントとともに切り替える。MCPツールの結果はstdoutを保持してstderrを破棄する（`lib/rigor/mcp/server.rb`の`tool_result`）ため、対象コマンドをラップするMCPツール（`rigor_type_of`、`rigor_explain`）はそれぞれ独自の追加`text`コンテンツブロックとして通知を追記する。これは設定を受け取るツールが`config_warnings`に用いているコンテンツブロックの仕組みである（`rigor_explain`は設定を受け取らないため、新しいブロックを必要とする）。

どちらもADR-50 WD7の1.0前ケイデンスであり、v1.0.0以降はどちらもメジャーリリースを必要とする。

## 却下・先送りした代替案

| 代替案 | 判定 | 理由 |
| --- | --- | --- |
| JSONをデフォルト出力にする（`cf`） | 却下 | `check`の読み手は人間とCIであり、CIはすでにフォーマットを選んでいる（[ADR-51](../51-ci-diagnostic-output-formats/)）。エージェントにはMCPサーバー（[ADR-33](../33-mcp-server/)）と`--format=json`がある。 |
| stdoutがTTYでないときにコンパクトJSONにする | 却下 | `check --format=json > file`は`rigor diff`のためにコミットされる。1行のJSONではそのファイルの履歴が読めなくなる。 |
| 自然言語コマンド検索（`cf cli search`） | 却下 | 3,000の操作向けに作られたものであり、26個のコマンドは1つの一覧に収まる。カタログが同じニーズを満たす。 |
| `check --format=jsonl` / reviewdog `rdjsonl` | 先送り | `check`は実行完了後に出力するため、行単位にしてもストリーミングにはならない。`checkstyle`に対する`rdjsonl`の利点は修正提案だが、Rigorはそれを出力しない。診断が修正を伴うようになったときに再検討する。 |
| 宣言的仕様からコマンドを生成する（`cf`のForge） | 却下 | 動作している26個のコマンドの書き直しになる。イントロスペクトされたパーサに対するゲートが同じ一貫性を強制する。 |
| 3つの`describe`表記のいずれかを非推奨化する | 却下 | メンテナーの要望により、ADR-73の修正が`skill describe`と`skill --describe`をファーストクラスとして維持している。これを覆すのは別の決定である。 |
| `plugins`または`plugin`をリネームする | 却下 | 両者とも広く文書化され相互参照されている。did-you-meanがタイプミスに対処する。 |
| `diff`を`baseline`に統合する | 却下 | サイト単位の同一性かルール単位の同一性かの違いがある。統合するとどちらが照合するものが変わってしまう。 |
| 型付き設定フォーマット（`cloudflare.config.ts`） | 不要 | `rigor init`はすでに`.rigor.yml`に`yaml-language-server`のスキーマ参照を書き込んでいる。 |

## 結果

- 肯定的な結果: 凍結前にコマンドの種類ごとに1つの文法が定まる。JSONコンシューマーが形状の変更を検出できる。文法ルールをスキップする新しいコマンドは出荷されずspecで失敗する。
- 否定的な結果: `plugin`の動詞は1マイナーリリースの間警告を出し、`type-of`、`explain`、`trace`のJSON形状は1マイナーリリース前に予告された上で、すべてのコンシューマーに対して破壊的変更となる。手動でパースするコマンドはパーサの隣に宣言されたフラグリストを保持し、ゲートは存在のみをチェックでき、完全性はチェックできない。
- 順序: #2502を最初に（決定不要）、次に#2505を着地させ、#2503と#2504が着地する際にそのゲートがそれらをチェックできるようにする。

## 他のADRとの関係

- [ADR-50](../50-release-engineering-and-stability-strategy/) — WD2がWD1のテーブル行を追加し、WD4がWD7の1.0前非推奨化ケイデンスを適用する。
- [ADR-61](../61-agent-friendly-diagnostic-statistics/) — 基準Bがその基準Aを一般化する。
- [ADR-22](../22-baseline-and-project-onboarding/) — 「baseline」という語を所有し、WD1は`diff`がそれを借用するのを止める。
- [ADR-73](../73-skill-driven-user-experience/)、[ADR-74](../74-offline-doc-access-and-llms-txt/) — 基準Aが一般化するフラグ文法。ADR-73の`describe`表記はそのまま残す。
- [ADR-113](../113-rigor-lens/) — `lens/v0`は独自のバージョニングを維持し、契約外にとどまる。
- [ADR-33](../33-mcp-server/) — カタログがインデックスするMCPツール。
