---
title: "Compatibility and the public surface"
description: "Imported from rigortype/rigor docs/compatibility.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/compatibility.md"
sourcePath: "docs/compatibility.md"
sourceSha: "9e6ac7a714924312ddf40401694fa5b7e06ce02cdef83a56856e41e4e6fad148"
sourceCommit: "7c189bd84c14aa0f88b13306f3796c488c52a8b0"
translationStatus: "translated"
sidebar:
  order: 9050
---

ステータス: **トライアル（v0.2.0評価ライン。以下に列挙されたサーフェスは、マイナー非破壊の<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>としてコミットされる —— v1.0.0凍結のリハーサルである）**。

これは[ADR-50](../adr/50-release-engineering-and-stability-strategy/)（リリースエンジニアリングと安定性戦略）の人間が読める併走ドキュメントです。リリースが公開することで、ユーザーが一箇所で**Rigorが安定維持を約束するサーフェス（surface）、意図的に変更の自由を残すサーフェス、そして各保証がどのリリースから拘束力を持つのか**を見渡せるようにするための文書です。権威はADR-50にあります。このファイルがADRと食い違う場合は、ADRが拘束力を持ち、このファイルが古いということです。このサーフェスのうち機械的に強制される部分集合は[`spec/rigor/public_api_drift_spec.rb`](../spec/rigor/public_api_drift_spec.rb)によって固定されています（[§機械的強制](#machine-enforcement)を参照）。固定された名前空間をプラグイン作者の視点から見るには、[`docs/internal-spec/public-api.md`](../internal-spec/public-api/)を参照してください。

## Where we are on the trajectory

Rigorは**トライアルしてから凍結する**経路をたどります（ADR-50 § Decision 1）。

| ライン | ここでの安定性の意味 |
| --- | --- |
| **`0.1.x` — プレビュー** | サーフェスはまだ*拡張中*で、ライン内での破壊的変更が許容されていました。この文書はサーフェスを**列挙**して凍結に標的を与えましたが、まだ拘束力は持ちませんでした。（例えば[ADR-60](../adr/60-pre-freeze-plugin-contract-consolidation/)は、このラインで最後の機会となるプラグイン契約の後方互換性破壊を意図的に取り込みました。） |
| **`v0.2.0` — 評価トライアル（現行）** | **列挙されたサーフェスでのマイナー非破壊を約束する**最初のバージョンであり、運用上の規律として位置づけられます。推論エンジンがまだ進化を続ける中で実施される、v1.0.0契約のリハーサルです。サーフェスは列挙され、トライアルとしてコミットされますが、凍結はされません。 |
| **`v1.0.0` — ハード凍結** | 以下に列挙されたサーフェスが互換性ポリシーのもとで**拘束力を持つ**ようになります。適合ユーザーの設定・プラグイン・抑制を無効化する変更は破壊的変更となり、これ以降はメジャーバージョンでのみ許されます。 |

つまり今日（`v0.2.0`のカット）これは**コミットされたトライアル**です。以下に列挙されたサーフェスは、Rigorがマイナー非破壊を保つと約束する規律であり、v1.0.0がそれを凍結します。エンジンがトライアルを通じてまだ進化を続ける間は、特定のRigorバージョンを固定してください。

## The compatibility model

2つの原則が、拘束力を持つものと自由なままに留まるものの境界線を引きます（ADR-50 § Decisions 2 and 3）。

1. **公開サーフェスは凍結、エンジン内部は自由**。変更が*破壊的*であるのは、列挙された公開サーフェス（下記）を、適合ユーザーの設定・プラグイン・抑制を無効化する形で変更したときだけです。推論エンジン── `Rigor::Inference::*`、`Rigor::Scope`の内部機構、`Rigor::Type::*`のキャリア（carrier）、ディスパッチ階層──は**明示的に非公開**であり、どのリリースでも変更されうります。（同じ内部／公開の分離は、[ADR-19](../adr/19-language-server-packaging/)が言語サーバー（language server）向けにすでに依拠しているものです。）

2. **診断出力は契約ではないが、診断の*語彙*は契約である**。あるファイルで*どの*診断が発火するかは互換性契約の一部では**ありません**。ルールを強化して以前は見逃していた本物のエラーを報告するようになることはマイナーで許容され、[ベースライン](../manual/06-baseline/)が常設の吸収体となります。契約**である**のは、ユーザーの設定と抑制が依拠する安定した**語彙**です。すなわちルール識別子、抑制マーカー、ベースライン形式、そして`severity_overrides:`のキーです。これらは発火が変わってもアップグレードをまたいで動き続けます。ユーザーに**以前は課されていなかった新しい記述の規律への準拠を強制する**変更は破壊的とみなされ、メジャーでオンになるまで`bleeding_edge:`オプトインの背後でデフォルト無効として着地します（ADR-50 § WD2/WD3）。オプトイン機構は配線済みです（`bleeding_edge:`設定＋`rigor show-bleedingedge`インスペクター）。それが参照するオーバーレイは今日のところ空なので、ゲートされているものはまだありません。

## The enumerated public surface

各行は、**権威ある列挙**（信頼できる情報源。この文書はドリフトしないよう複製しません）と、**ユーザー向けリファレンス**を指し示します。「Contract」列は、その行がいつ拘束力を持つか、そして保証が何であるかを述べます。

| Surface | Authoritative enumeration | User reference | Contract |
| --- | --- | --- | --- |
| **CLIコマンド＋フラグ**（`check`、`triage`、`baseline`、`sig-gen`、`lsp`、`mcp`、`annotate`、`type-of`、`coverage`、`plugins`、`plugin`、`skill`、…） | [`lib/rigor/cli.rb`](../lib/rigor/cli.rb)と`lib/rigor/cli/`内の`CLI::HANDLERS`＋コマンドごとの`OptionParser` | [Manual ch. 2 — CLI reference](../manual/02-cli-reference/) | **yes** ── 文書化されたコマンド／フラグは名前と意味を保つ。削除／改名は破壊的 |
| **`.rigor.yml`のキー＋値の文法** | [`lib/rigor/configuration.rb`](../lib/rigor/configuration.rb)内の`Configuration::DEFAULTS`＋強制変換器 | [Manual ch. 3 — Configuration](../manual/03-configuration/) | **yes** ── 文書化されたキーは名前・形・デフォルト意味論を保つ |
| **プラグイン契約** ── `Plugin::Base`のフック＋マニフェストフィールド（[ADR-37](../adr/37-plugin-interface-segregation/)のナロープロトコル`node_rule` / `dynamic_return` / `type_specifier`＋宣言的フィールド）と読み取り側の名前空間（`Scope`、`Type`、`Reflection`、`Environment`、…） | [`docs/internal-spec/public-api.md`](../internal-spec/public-api/)、[`public_api_drift_spec.rb`](../spec/rigor/public_api_drift_spec.rb)が固定 | [ADR-2](../adr/2-extension-api/)＋[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)配下のプラグイン例 | **yes** ── ADR-37のナロープロトコル（非推奨のファットフックは1.0前に削除。例: ADR-52 slice 5b / ADR-60） |
| **診断識別子**（`flow.always-truthy-condition`、`call.unresolved-toplevel`、…）＋**抑制マーカー**（`# rigor:disable <id>` / `# rigor:disable-file <id>`）＋**`severity_overrides:`のキー** | [`lib/rigor/analysis/check_rules.rb`](../lib/rigor/analysis/check_rules.rb)内のルールID（`ALL_RULES`、`LEGACY_RULE_ALIASES`）、[`lib/rigor/analysis/rule_catalog.rb`](../lib/rigor/analysis/rule_catalog.rb)内のメタデータ | [Manual ch. 4 — Diagnostics](../manual/04-diagnostics/)、`rigor explain <rule>` | **yes ── 語彙であって発火集合ではない**（§ compatibility model 2） |
| **ベースラインファイル形式**（`.rigor-baseline.yml`） | [`lib/rigor/analysis/baseline.rb`](../lib/rigor/analysis/baseline.rb)内の`Baseline::CURRENT_VERSION`（現在`1`） | [Manual ch. 6 — Baselines](../manual/06-baseline/) | **yes** ── オンディスク形式。バージョンの引き上げは無効化するが、決して誤読しない |
| **キャッシュスキーマバージョン** | [`lib/rigor/cache/`](../lib/rigor/cache/)内の`Descriptor::SCHEMA_VERSION`＋`Store::FORMAT_VERSION`（マーカー`4.2`） | [Manual ch. 12 — Caching](../manual/12-caching/) | **yes** ── スキーマ／形式の引き上げはキャッシュを無効化するが、決して静かに誤読しない |
| **`RBS::Extended`注釈文法**（`%a{rigor:v1:…}` ── 述語／表明／戻り値オーバーライド／`conforms-to`） | [`lib/rigor/rbs_extended.rb`](../lib/rigor/rbs_extended.rb) | [Spec — rbs-extended.md](../type-specification/rbs-extended/)（規範的） | **yes** ── `rigor:v1:`ディレクティブ文法 |

## What is explicitly *not* contract

これらはどのリリースでも変更されうり、依拠することはサポートされません。

- **エンジン内部** ── `Rigor::Inference::*`、`Rigor::Scope`の内部、`Rigor::Type::*`のキャリア、ディスパッチ階層、合成された`Rigor::AST::*`ノード、そして`Rigor::Analysis::{Runner,CheckRules,FactStore}`。[`docs/internal-spec/public-api.md` § Internal surfaces](../internal-spec/public-api/)を参照。
- **あるファイルでどの診断が発火するか** ── 精度とバグ捕捉はマイナー内で自由に向上します（§ compatibility model 2）。[ベースライン](../manual/06-baseline/)がそのチャーンを吸収します。
- **`rigor sig-gen`の出力精度** ── *推論されるシェイプ*は時間とともに先鋭化します。コマンド・フラグ・RBSとしての妥当性は契約ですが、出力するものの精度は契約ではありません。

## Format and schema versions

ツールやCIパイプラインが鍵にできる形式／バージョンのマーカーです。すべての引き上げは**無効化はするが誤読は決してしない**イベントです。新しいRigorが古いアーティファクトを読むとき、それを欠落／陳腐として扱い、決して静かに誤ったデータとしては扱いません。

| Artifact | Constant | Current value |
| --- | --- | --- |
| ベースラインファイル | `Rigor::Analysis::Baseline::CURRENT_VERSION` | `1` |
| 永続キャッシュ | `Cache::Descriptor::SCHEMA_VERSION`.`Cache::Store::FORMAT_VERSION`（`schema_version.txt`マーカー） | `4.2` |
| `RBS::Extended`ディレクティブ | `rigor:v1:`名前空間タグ | `v1` |

## Machine enforcement

公開サーフェスのうち固定された部分集合は、機械的に強制されます。

- [`spec/rigor/public_api_drift_spec.rb`](../spec/rigor/public_api_drift_spec.rb)は、固定されたすべての名前空間（`Scope`、`Environment`、`Type::Combinator`、`Reflection`、`Plugin::*`の契約サーフェス、`Source::Literals`、`FlowContribution`、…）のインスタンス／シングルトンのメソッド集合をスナップショットします。シグネチャ変更は同じコミット内で対応するスナップショットを更新しなければならず、偶発的なドリフトは静かな破壊ではなくテストの失敗となります。
- [リリース受け入れゲート](../adr/50-release-engineering-and-stability-strategy/)（ADR-50 § WD6）は、リリースをカットする前に、このドリフトspecがグリーンであること、加えてコーパスの偽陽性スイープ、`make check-incremental`、そして`make bench-perf`の性能ゲートを要求します。

## The trajectory in brief

ADR-50（これらすべての権威）から要約します。

- **v0.2.0**はリリースエンジニアリングの機構を出荷し、上記のサーフェスでのマイナー非破壊をトライアルの規律として約束します。
- **v1.0.0**はサーフェスを凍結します。それを破ることはメジャーバージョンでのみ可能になります。
- **サポートライン**（ADR-50 § WD5）: 1.0前は、最新のマイナーと直前のマイナーがセキュリティ＋リグレッションのバックポートを受けます。バックポートはそのラインのRubyピンを保ちます。1.0後は、`1.x`ブランチがデフォルトの開発ライン（PHPStanのモデル）になります。
- **新しい規律**（以前は慣用的だったコードに記述の変更を要求するルール）は、`bleeding_edge:`オプトインの背後でデフォルト無効として着地し、メジャーでのみオンになります（ADR-50 § WD2/WD3/WD7）。オプトインの土台は出荷済みです ── `bleeding_edge:`設定（`true` / 機能IDのリスト / `{ all:, except: }`）＋`rigor show-bleedingedge`インスペクターであり、あなた自身の`severity_overrides:`の下位でのseverity解決に組み込まれます。それが参照するオーバーレイは今日のところ空です。キューに入った最初の規律は、単一の機能エントリーとして着地します。

## See also

- [ADR-50](../adr/50-release-engineering-and-stability-strategy/) ── 統治するリリースエンジニアリングと安定性戦略（権威）。
- [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) ── 固定された名前空間とプロモーション経路をプラグイン作者の視点から見たもの。
- [Manual ch. 11 — Running Rigor in CI](../manual/11-ci/) § version pinning ── パイプラインでRigorバージョンを固定する方法。
- [`docs/ROADMAP.md`](../roadmap/) § "Release strategy — the road to v0.2.0" ── 将来を見据えたコミットメントの包絡線。
