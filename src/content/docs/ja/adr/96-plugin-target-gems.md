---
title: "ADR-96 — プラグインのtarget-gem宣言、プラグインギャップアドバイザリー、存在ゲート付きアンブレラ展開"
description: "rigortype/rigor docs/adr/96-plugin-target-gems.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/96-plugin-target-gems.md"
sourcePath: "docs/adr/96-plugin-target-gems.md"
sourceSha: "f7085678e750ccc626d55c68fbf69704901c3eef10988278f9d1124877a9a444"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
translationStatus: "translated"
sidebar:
  order: 4096
---

ステータス: **Accepted、2026-07-17**。 WD1（`target_gems:`マニフェストフィールド）とWD2（プラグインギャップアドバイザリー）はコミット済みのスライス（slice）であり、**WD3（存在ゲート付きアンブレラ展開）は提案段階でWD2にゲートされている**——「なぜWD2がWD3に先立たねばならないか」を参照。WD5は`plugins/rigor-rails/`のステータスをその将来を決めずに確定させる。すなわち、死んだGemfileの枠組みは今すぐドキュメントから外すが、メタgem自体は残す。

コーパスに答えのない問いに促されたものである。すなわち、*次のRailsメジャーが`ActionFoobar`をコア機能として出荷し、Rigorが`rigor-actionfoobar`を追加したとき、既存のRailsプロジェクトはそれに気づく機会があるのか？* 今日それは気づけない——そして調査により、このギャップは仮想でもRails固有でもないことが判明した。

根拠:
[`docs/notes/20260717-install-channel-evaluation.md`](../../notes/20260717-install-channel-evaluation/)
§ 6（`rigor-rails`の古びたGemfileの枠組みを未処理事項として指摘したもの。本ADRはその糸が着地した場所である）。

## コンテキスト

`.rigor.yml`の`plugins:`は手書きのリストであり、**それを最新に保つものは何もない**。`rigor-project-init`はカタログがその実行日に存在した状態から一度だけ集合を提案する。その後リストはプロジェクトの生涯にわたって凍結される。Rigorのカタログが成長したとき、プロジェクトが新しいgemを採用したとき、あるいはフレームワークがサブシステムを追加したときに、それを見直すものは何もない。

失敗モードはノイズではなく沈黙である。有効化されていないプラグインは警告を出さない——そのレシーバーは単に`Dynamic`として型付けされる、つまり保護されない。これはまさに保護カバレッジの一連の流れ（[ADR-63](../63-type-protection-coverage/)、[ADR-82](../82-dynamic-provenance-wiring/)）が可視化しようとしているクラスである。古びた`plugins:`リストは、何も報告しないカバレッジホールである。

ツリーに対して確認された3つの発見:

**1. 我々が持つ唯一のメカニズムはall-or-nothingである**。 `rigor doctor`のRailsチェック（`doctor_command.rb:262`）と`rigor skill describe`のプローブ（`skill_describe.rb:60`）は、どちらも同じテストで終わる。

```ruby
!file_mentions_any?(config_path, RAILS_PLUGIN_MARKERS)
```

設定内に**いずれか1つ**のRailsプラグインがあればこれを満たす。`rigor-activerecord`だけを有効化したフルRailsアプリは、残り7つについて何も知らされない。`ActionFoobar`のシナリオは将来のリスクではなく、現在の状態である。

**2. その知識は4回重複しており、そのコピーのどれもがプラグインではない**。 `RAILS_LOCK_MARKERS` / `RAILS_PLUGIN_MARKERS`は`doctor_command.rb:39-42`と`skill_describe.rb:22-23`にある**バイト単位で同一のコピペ定数**である。`rigor-project-init`は3つ目を[`references/01-detect.md`](https://github.com/rigortype/rigor/blob/master/skills/rigor-project-init/references/01-detect.md)の散文の「プラグイン推奨テーブル」として持つ。[`plugins/README.md`](https://github.com/rigortype/rigor/blob/master/plugins/README.md)のカタログが4つ目である。各プラグインは自分が何のためのものかを知っている。それを尋ねるものは何もない。

**3. これをカバーするはずだったアンブレラは死んでいる**。 [ADR-12](../12-dry-rb-packaging/)は`rigor-rails`を*Gemfile向けの利便性*のメタgem——「Gemfileの1行でユーザーがオプトインできる」——として、各プラグインが独自のgemであった世界向けに設計した。コミット`9769f5fa`はプラグインごとのgemspecを削除し、[ADR-31](../31-contribution-and-supply-chain-policy/)は配布を単一のバンドルされた`rigortype` gemに確定させた。前提は死んだが、言葉は死ななかった。`gem "rigor-rails"`は不可能（gemspecなし、RubyGemsで404）、`plugins: [rigor-rails]`は設計上ローダーに拒否される。にもかかわらず5箇所がなおそれを記述している——`rigor docs`が配信する**出荷済みの**[ユーザーマニュアル](../../manual/07-plugins/)を含めて。

つまりアンブレラの*名前*は死んでいる。その*役割*——Rigorが成長するにつれフレームワークを追跡するキュレーションされた集合——は、他の何にも引き継がれなかった。

## 決定

**基準1——プラグインが自分の用途を宣言し、ツールは決して推測しない**。プラグイン自身のマニフェスト以外の場所に住むgem→プラグインの対応付けはコピーであり、コピーは黙って古びる。この対応付けは導出可能でもなく、それがこれを慣習ではなくフィールドにする理由である。

| プラグイン | 実際のgem | 名前ルールが破綻する理由 |
| --- | --- | --- |
| `rigor-factorybot` | `factory_bot` | アンダースコア——`factorybot`はRubyGemsで404 |
| `rigor-rspec` | `rspec-core` | サフィックスはファミリー名でありgem名ではない |
| `rigor-sorbet` | `sorbet-runtime` | 同上 |
| `rigor-rails-routes` | `actionpack` / `railties` | ターゲットは*別の*gemである |
| `rigor-typescript-utility-types` | *（なし）* | すべてのプラグインにターゲットgemがあるわけではない |

**基準2——存在はアドバイスの証拠であり、実行の証拠ではない**。 `Gemfile.lock`にgemを見つけることは、そのためのプラグインが存在することをユーザーに*伝える*ことを正当化する。それ自体はそのプラグインのコードを*実行する*ことを正当化しない。それにはユーザーの明示的なオプトインが必要である。これは[ADR-27](../27-tool-distribution-model/) / [ADR-31](../31-contribution-and-supply-chain-policy/)のプラグイン自動ロード先送りであり、[ADR-72](../72-gemfile-lock-gated-rbs-overlays/)が意図的に越えなかった一線である——そのlockゲート付きオーバーレイはRBSの**データ**をロードするのであって、プラグインのコードは決してロードしない。基準2がWD2とWD3を分けるものである。

### WD1 — マニフェスト上の`target_gems:`

バンドルされた各プラグインは、その存在によって自分が関連するようになるgemを宣言する。空リストは有効で意味のある答えである。すなわちプラグインはターゲットgemを持たず（`rigor-typescript-utility-types`）、決してアドバイスされない。[ADR-88](../88-incremental-plugin-fact-soundness/)の不透明性の先例に従い、何も宣言しないプラグインは黙ってスキップされるのではなく*そのように名指しされる*ので、その不在は記録上の選択となる。

これは公開プラグイン契約への追加であり、[ADR-50](../50-release-engineering-and-stability-strategy/) WD1のもとv1.0で凍結される。ADR-60自身の変更と同じ理由で、ADR-60のプレフリーズウィンドウ内に着地する。

### WD2 — プラグインギャップアドバイザリー（コミット済みスライス）

`rigor doctor`と`rigor skill describe`は、コピペ定数の代わりに`target_gems:`を読み、**プラグインごとに**報告する。すなわち、このgemはlockされている、このプラグインはそれのために存在する、それは`plugins:`に入っていない、と。Railsを超えて一般化するのは追加作業ではない——Rails固有のテーブルを削除した後に残るものそのものである。

深刻度は**`:fail`ではなく`:warn`**である。プラグインを採用しないことは正当な選択であり、選択がコマンドを永久に失敗させてはならない。`doctor`は`:fail`のときだけ非ゼロで終了する。*「フレームワークがlockされていて、そのプラグインのどれも有効化されていない」*ための既存の`:fail`は保たれる——それは真に未設定であり、今日の挙動である。

このアドバイザリーは`check`診断で**はない**。それはセットアップ状態であり、[ADR-77](../77-doctor-and-upgrade-commands/)の枠組みである。すなわち、実行がすでに生成する証拠をルーティングするのであって、ルールを発明しない。

### WD3 — 存在ゲート付きアンブレラ展開（提案）

`plugins: [rigor-rails]`は、その`target_gems:`が実際に`Gemfile.lock`に入っているメンバーを有効化する。ユーザーのオプトインは明示的であり——彼らは`rigor-rails`と書いた——展開はディスク上の証拠によって正当化される。これはまさにADR-72の形（「実際のgemの存在にゲートすることがそれを健全にする」）である。これが`ActionFoobar`のシナリオである。`rigor-actionfoobar`がアンブレラに加わり、ActionFoobarを採用したプロジェクトは`.rigor.yml`を編集することなくアップグレード時にそれを得る。

出荷前に確定させねばならないことが2つあり、これが提案でありコミットされていない理由である。

- **アップグレードの驚き**。新しいメンバーは既存プロジェクトのチェックを黙って強化する。診断出力は非契約でありベースライン（baseline）がそれを吸収する（ADR-50）が、*新たに要求される<ruby>規律<rp>（</rp><rt>discipline</rt><rp>）</rp></ruby>*はBCであり`bleeding_edge:`オーバーレイに乗る。自動加入したプラグインがこの2つのどちらであるかは、仮定するのではなく決定しなければならない。
- **メンバーごとのオプトアウト**。 [`plugins/README.md`](https://github.com/rigortype/rigor/blob/master/plugins/README.md)は、有効化がプラグインごとに保たれる「ので、ユーザーは個々のメンバーをオプトアウトできる」と約束している。アンブレラがその約束を守るには除外の形式が必要である。

### WD4 — 却下されたまま残るもの

**C1、無差別なアンブレラ**（`plugins: [rigor-rails]` → lockに関係なくすべてのメンバー）。これはADR-12 WD1自身のふくらみの論拠——*「ロードされたすべてのプラグインは、そのレシーバークラスが決して現れなくてもディスパッチに参加する」*——を再び持ち込み、プロジェクトが持たないgemのためにコードを実行する。WD3のゲートはコストゼロで両方の異論を取り除く。

### WD5 — `plugins/rigor-rails/`は残るが、そのドキュメントは残らない

[ADR-92](../92-normative-status-fidelity/)の規律は、型仕様ではなくプラグインパッケージングのコーパスにおける自身の4つ目のインスタンスに適用される。すなわち、**ステータスの問いを設計の問いから分離せよ**。ステータスの問いは今すぐ無条件に確定する——`gem "rigor-rails"`を指示する5箇所は不可能な操作を記述しており、外に出される。沈黙は決して正直な状態ではなく、マーカーは常に安上がりだからである。設計の問い（アンブレラはWD3を得るのか、それとも削除されるのか？）は証拠を待つ。

今日ディレクトリを削除することは[ADR-60](../60-pre-freeze-plugin-contract-consolidation/) WD1の動き——それは決して配線されておらず*ドキュメント上不可能*なサーフェス（surface）であり、まさにADR-60が`external_files:`を削除するのに使った基準——だろう。ここでそうしないのは、WD3が役割を再び開いたからだけである。すなわち、この概念には他の住処がなく、削除は問いが決着する前に答えを閉ざしてしまう。もしWD3が却下されれば、ADR-60 WD1の基準がそのまま適用され、ディレクトリは消える。

上記すべてとは独立に、素朴なバグとしても訂正された。`loader.rb:73-75`の実例は`{ "gem" => "rigor-rails", "id" => "rails" }`だが、**id `rails`を持つプラグインは存在しない**（本物のidは`actionmailer`、`actionpack`、`activejob`、`activerecord`、`factorybot`、`rails-i18n`、`rails-routes`）。同じ架空の形が`spec/rigor/configuration_spec.rb:156`にも反映されている。

## なぜWD2がWD3に先立たねばならないか

慎重さではない——**WD2はテーブルを証明するものである**。 WD1の`target_gems:`は世界についての30の手書きの主張であり、間違ったエントリーは各スライスで異なるコストを課す。WD2のもとではユーザーが無視する悪いヒントを表示するだけだが、WD3のもとでは同じエントリーが、プロジェクトが対応するgemを持たないプラグインを黙って有効化するか、必要なプラグインを黙って保留する。WD2はアドバイザリーというステークでプリミティブの正しさを買い、その後でWD3が実行というステークでそれを使う。

これは[ADR-82](../82-dynamic-provenance-wiring/) WD5（安いスライスを着地させ、何が再バケット化されるかを計測し、*その後で*高価なものに価値があるか決める）と[ADR-58](../58-ivar-field-typing/)の順序付けルールを反映している——精度はポリシー変更の後に意図的に段階配置され、それが直そうとしている問題そのものを製造できないようにする。

## 却下した代替案

| 代替案 | 却下理由 |
| --- | --- |
| プラグイン名からgemを導出する | 計測で偽——`factory_bot` / `rspec-core` / `sorbet-runtime` / `actionpack`、そして`rigor-typescript-utility-types`はgemを一切持たない |
| テーブルを`doctor` / `skill_describe`に残す | 1つの事実の4つのコピーで、どれもプラグインではない。今日それらが同一なのは偶然であって構造によるものではない |
| C1——無差別なアンブレラ有効化 | WD4 |
| 今すぐ`plugins/rigor-rails/`を削除する | WD5——WD3の唯一の住処を閉ざす。WD3が却下されたら再検討 |
| 欠けているプラグインに対する`check`診断 | セットアップ状態はコード状態ではない（ADR-77）。かつ、意図的な不採用のたびに発火してしまう |
| アドバイザリーを`:fail`にする | 正当な選択を永久に赤いコマンドに変えてしまう |

## 影響

- **プラス**。 1つの事実、1つの住処。Rails固有のテーブルとそのコピペの双子は消え、アドバイザリーはターゲットgemを持つすべてのプラグイン——`ActionFoobar`のケースを含む——を自動ロードのリスクなしでカバーする。WD3は発明せずに済むゲートを得る。
- **マイナス**。真であり続けさせるべき30の手書きの`target_gems:`の主張と、v1.0で凍結すべき新しい公開契約フィールド。プラグインを意図的に断ったプロジェクトは`doctor`から常時`:warn`を見る。それがノイジーだと判明すれば、オプトアウトがフォローアップである。
- **持ち越し**。上記のWD3の2つの未決問題。`rigor-project-init`の散文テーブルは4つ目のコピーであり、ここではそのまま放置される——WD1が存在すれば`target_gems:`からそれを生成するのが明白なフォローオンである。

## 他のADRとの関係

- [ADR-12](../12-dry-rb-packaging/) —— Gemfileの世界向けにメタgemを設計した。そのパッケージングの前提はADR-31に取って代わられており、本ADRはそれを暗黙のままにするのではなく記録する。
- [ADR-72](../72-gemfile-lock-gated-rbs-overlays/) —— WD3がRBSデータからプラグイン有効化へと拡張するlockゲートの先例であり、基準2が引く一線。
- [ADR-77](../77-doctor-and-upgrade-commands/) —— WD2はその枠組みにおけるdoctorチェックである。
- [ADR-92](../92-normative-status-fidelity/) —— WD5はそのステータス／設計の分離を、同じ病の4つ目のインスタンスに適用したものである。
- [ADR-60](../60-pre-freeze-plugin-contract-consolidation/) —— WD1はそのウィンドウ内に着地する。WD5はその削除基準を却下するのではなく先送りする。
