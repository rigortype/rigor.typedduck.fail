---
title: "ADR-25 — プラグインが提供するRBSシグネチャ"
description: "rigortype/rigor docs/adr/25-plugin-contributed-rbs.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/25-plugin-contributed-rbs.md"
sourcePath: "docs/adr/25-plugin-contributed-rbs.md"
sourceSha: "ec85adcb90e4f6e35cb7bc72b4f808d6b16bb37da546db987091208edc0c2594"
sourceCommit: "75f1372f98e9b1b00cb79a72bf925849cead6956"
translationStatus: "translated"
sidebar:
  order: 4025
---

Status: **accepted、2026-05-21**。プラグインgemが、そのマニフェストを通じてRigorの解析環境にRBSシグネチャディレクトリを提供できるようにする決定を記録する — 今日、RBSのみの「バンドル」gemを手書きの`signature_paths:`パスで配線せざるをえないギャップを解消する。WD1（`signature_gems:`設定キーではなく`Manifest`フィールド）が承認された。却下された設定キー案は、書面上の前提として記録しておく。

## コンテキスト

今日のRigorは、3つのソースからRBS環境を構成しており、いずれも`RbsLoader`の`signature_paths`に解決される：

1. **`signature_paths:`**（`.rigor.yml`内）— ディレクトリパスの明示的なリスト。`.rigor.yml`はプレーンな`YAML.safe_load_file`（ERBなし）でパースされるため、エントリはリテラルなパスである — gem名は解決されず、「インストール済みgem内の`sig/`」を名指しするポータブルな手段がない。
2. **`bundler:`ディスカバリ**（`Environment::BundleSigDiscovery`）— `<bundle_path>/ruby/*/gems/*/sig/`を走査する。自動検出するのは`vendor/bundle` / `.bundle/config`の`BUNDLE_PATH`レイアウトのみであり、*無差別*である：選ばれた集合ではなく、スキップされないすべてのgemの`sig/`を取り込む。プレーンな`bundle install`（gemがシステム / rbenvのgemディレクトリにある）を実行するプロジェクトは、明示的な`bundle_path:`なしでは何も得られない。
3. **`rbs_collection:`** — `rbs_collection.lock.yaml`をパースする。

`Plugin::Base`プラグインは、診断（`diagnostics_for_file`）、呼び出しごとの戻り値型（`flow_contribution_for`）、マクロサブストレート宣言、型ノードリゾルバ、プラグインをまたぐファクト（fact）を提供できる — しかし**RBSは提供できない**。「このプラグインがロードされたときにシグネチャ環境を拡張する」というマニフェストフックが存在しない。

具体的な被害者は`rigor-activesupport-core-ext`である。これは、ActiveSupportの`core_ext`セレクター（Railsプロジェクトで最大の単一`call.undefined-method`クラスター — 実測されたMastodonの実行では488件中≈365件の診断）向けに`sig/`を同梱することだけを目的としたgemである。プラグイン側のRBSフックが存在しないため、これは**そもそもプラグインではない** — その`lib/rigor-activesupport-core-ext.rb`は素のコメントであり、ユーザーは`signature_paths:`をそのgemの`sig/`へ手で配線しなければならない。設定にERBがないため、機能する形式は、絶対かつバージョン固定のパス（`bundle show …`）か、ディレクトリのベンダリングコピーのみである。そのgem自身のREADMEは、この手作業のステップを既知の欠点として文書化し、欠けているメカニズムを名指ししている：*「Rigorが『ロード時に`signature_paths`を拡張する』というプラグインマニフェストエントリを備えるまでは、最もシンプルなパッケージングは、ユーザーが手で配線する`sig/`ディレクトリである。」*

同じギャップは、将来のあらゆるプラグインが、アナライザーコードと並んでRBSオーバーレイを同梱することを妨げる — たとえば、診断と、認識するフレームワーククラス向けの`sig/`オーバーレイの両方を同梱したいRailsプラグインのように。

このADRはそのギャップを解消する。

## 決定

プラグインの`Manifest`にオプショナルな**`signature_paths:`**フィールドを追加する。プラグインは、自身が同梱するRBSディレクトリを、自身のgemルートからの相対パスとして宣言する。プラグインが`.rigor.yml`の`plugins:`に列挙され、正常にロードされると、`Plugin::Loader`は宣言された各ディレクトリを絶対パスに解決し、解決された集合が、設定の`signature_paths:`および`bundler:` / `rbs_collection:`ディスカバリの出力と並んでRBS環境にマージされる。

**純粋なRBSバンドルは些細なプラグインになる**：`signature_paths:`を宣言し、それ以外には何も宣言しない（`diagnostics_for_file`なし、`flow_contribution_for`なし）マニフェストを持つ`Plugin::Base`サブクラスである。`rigor-activesupport-core-ext`はまさにこの形に変換され、プロジェクトはあらゆるプラグインを有効化するのと同じ方法で — `plugins: [rigor-activesupport-core-ext]` — パスなし、ベンダリングなし、絶対参照なしで有効化する。プラグインgemは自身の`sig/`の場所を内部で解決する。

## 作業上の決定

### WD1 — 設定キーではなくマニフェストフィールド

メカニズムは`Manifest`フィールドであり、新しい`.rigor.yml`のトップレベルキー（たとえば却下された`signature_gems:`）ではない。

- マニフェストはすでに、他のすべてのプラグイン提供宣言を担っている — `config_schema`、`produces` / `consumes`、`owns_receivers`、`type_node_resolvers`、`block_as_methods`、`heredoc_templates`、`trait_registries`、`external_files`、`hkt_registrations`。RBSの提供も同じ場所に属する；それはプラグインの性質であり、作者によって一度だけ宣言されるものであって、プロジェクトごとの設定ではない。
- `signature_gems:`設定キーは、ユーザーが学ぶべき*2つ目の*メカニズムになる。プラグインがRBSを提供できる以上、それは冗長である — gemの`sig/`が欲しいプロジェクトは、そのgemを`plugins:`の下に列挙するだけでよい。
- 有効化はひとつのリストにとどまる。`.rigor.yml`を読むレビュアーは、すべてのRigor拡張 — 診断プラグインもRBSバンドルも同様に — を`plugins:`の下に見る。

### WD2 — パスはプラグインのgemルートからの相対

このマニフェストフィールドは**相対的な**ディレクトリ文字列（一般的なケースでは`["sig"]`）を保持する。公開されたgem内の絶対パスは、別のマシンでは無意味である。

`Plugin::Loader`はすでに各プラグインgemを`require`し、それが登録するプラグインクラスを観測している。ローダーはそのクラスの定義ファイル（`Object.const_source_location`）を記録し、gemルート（`lib/`を含むディレクトリ）まで遡り、各マニフェストの`signature_paths:`エントリをそれに対して解決する。存在しないディレクトリが宣言されている場合、そのプラグインに対するロード時の`LoadError`になる — サイレントではなく大声で、なぜなら`sig/`の欠落はバンドルgemが壊れていることを意味するからである。

### WD3 — 純粋なRBSバンドルもプラグインである

RBSのみのgem（アナライザーコードなし）は、`signature_paths:`を宣言しフックを何もオーバーライドしないマニフェストを持つ`Plugin::Base`サブクラスとしてパッケージングされる。`diagnostics_for_file`はベースのno-opを継承する。これは意図的でわずかなセレモニー — ≈10行のプラグインクラスひとつ — であり、その対価として、ポータブルな有効化、単一の`plugins:`リスト、他のすべてのRigor拡張との統一性を得る。

却下された案 — 独自のローダーパスを持つ別個の「RBSバンドル」アーティファクト型：それはローダーのgem-require / 登録 / id一意性の機構を、振る舞い上の利得なしに重複させることになる。

### WD4 — プラグインのシグネチャは加法的；衝突は穏やかに縮退する

プラグインが提供する`signature_paths:`は、設定の`signature_paths:`、`bundler:`ディスカバリの出力、`rbs_collection:`とマージされる — 決して置き換えない。重複宣言の衝突（プラグインの`sig/`が、別のソースがすでに定義している定数を再宣言する）は、`BundleSigDiscovery`の衝突がすでに使っている`RbsLoader#env`内の**同じO7フェイラーメモパス**を通じて縮退する：問題のファイルを名指しする警告がひとつ出て、解析は続行する。新しい衝突処理サーフェスはない。

### WD5 — ターゲットを絞った提供 対 広範なディスカバリ

`BundleSigDiscovery`（`bundler:`設定）は残る。両者は補完的である：

| | プラグイン提供（このADR） | `BundleSigDiscovery` |
| --- | --- | --- |
| 対象範囲 | `plugins:`の下にあるプラグインそのもの | `vendor/bundle`内のスキップされないすべてのgem |
| 意図 | 作者が「このgemはRBSソースである」と*宣言する* | 機会主義的 — `sig/`を同梱するものを何でも拾う |
| レイアウト | 任意 — プラグインが自身のパスを解決する | `vendor/bundle` / `.bundle/config`のみ |

プラグイン提供は**意図的でポータブルな**パスであり、バンドルディスカバリは機会主義的な総合受け皿のままである。`BundleSigDiscovery`をデフォルトの`bundle install`レイアウトに拡張することは、別個でより小さなフォローアップである（§「対象外」に記載）。

### WD6 — 1.0以前のプラグイン契約に加法的

プラグイン契約（ADR-2）は1.0以前であり、v0.2.0で安定化する。この変更は**新しいオプショナルなマニフェストフィールド**である — `signature_paths:`を宣言しないプラグインは影響を受けず、既存のプラグインは何も壊れない。v0.1.x系統内で投入しても安全であり、v0.2.0が凍結する契約サーフェスの一部であるべきである。

## 結果

### ポジティブ

- **`rigor-activesupport-core-ext`がポータブルな1行の有効化を得る**。`plugins: [rigor-activesupport-core-ext]` — `bundle show`なし、絶対パスなし、ベンダリングなし。READMEの手作業による配線セクションと、そのv0.1.xの欠点が消える。
- **`rigor-project-init` SKILLが単純化する**。ASバンドル向けの`signature_paths:`ステップ（現在はディレクトリをベンダリングする指示）が、通常のプラグイン選択ステップに畳み込まれる。
- **将来のプラグインがRBSオーバーレイを同梱できる**。Railsプラグインは、診断*と*、モデル化するクラス向けの`sig/`オーバーレイの両方を、ひとつのgem内に同梱し、ひとつのマニフェストで宣言できる。
- **有効化サーフェスがひとつ**。すべてのRigor拡張 — 診断プラグインもRBSバンドルも — が`plugins:`エントリである。

### ネガティブ

- **純粋なRBSバンドルが今やプラグインクラスを抱える**。今日は素のgemである場所に≈10行のセレモニー。ポータビリティと統一性のため、それに見合うと判断した（WD3）。
- **マニフェストフィールドがひとつ増える** — 1.0以前の契約に。加法的かつ低リスク（WD6）。

### 持ち越し

- `BundleSigDiscovery`の自動検出をデフォルトの`bundle install` gemレイアウトに拡張することは、ここでは*解決されていない* — 機会主義的ディスカバリの改善のままであり、別途キューに入れる。

## 実装のスライス分け（提案）

### スライス1 — マニフェストフィールド + ローダー解決 + 環境マージ

- `Manifest`がオプショナルな`signature_paths:`フィールド（相対文字列の配列、フリーズ済み）を得る。
- `Plugin::Loader`が、ロードされた各プラグインの宣言ディレクトリを、プラグインgemルートに対して絶対パスに解決する（WD2）；欠落したディレクトリはそのプラグインに対する`LoadError`になる。
- `Runner` / `Environment.for_project`が、レジストリの解決済みプラグインシグネチャディレクトリを、`RbsLoader`に渡されるシグネチャパス集合にマージする（レジストリはすでに`Environment.for_project`に通されている）。
- spec：マニフェストフィールドの配線、ローダー解決 + ディレクトリ欠落エラー、エンドツーエンドの`Environment`取り込み。

### スライス2 — `rigor-activesupport-core-ext`をプラグインに変換

- `signature_paths: ["sig"]`を宣言するマニフェストを持つ`Rigor::Plugin::ActivesupportCoreExt < Plugin::Base`クラスを追加し、登録する。
- READMEの「Usage」を`plugins:`有効化を中心に書き直し、手作業の`signature_paths:` / ベンダリングの指示を削除する。

### スライス3 — オンボーディングのフォロースルー

- `rigor-project-init` SKILLを更新する：ASバンドルが`signature_paths:`配線ステップから通常のプラグイン選択へ移る。
- `bundler:` / `rbs_collection:`設定ドキュメントから相互参照する。

## 参考文献

- [ADR-2](../2-extension-api/) — このADRが拡張するプラグイン契約。
- `plugins/rigor-activesupport-core-ext/README.md` §「なぜ`Rigor::Plugin::Base`サブクラスではなく`sig/`バンドルなのか」 — このADRが解消するギャップであり、バンドル自身によって名指しされている。
- [`docs/notes/20260521-mastodon-v4.5-regression-sweep.md`](../../notes/20260521-mastodon-v4.5-regression-sweep/)および[`docs/notes/20260515-real-world-rails-survey.md`](../../notes/20260515-real-world-rails-survey/) — ActiveSupportの`core_ext`クラスターがRailsの支配的な診断ソースであることを確立したサーベイ。
- `lib/rigor/environment/bundle_sig_discovery.rb` — このADRのターゲットを絞ったメカニズムが補完する、機会主義的ディスカバリ。
