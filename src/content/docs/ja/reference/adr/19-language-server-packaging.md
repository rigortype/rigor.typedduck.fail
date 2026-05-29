---
title: "ADR-19 — 言語サーバーのパッケージング"
description: "rigortype/rigor docs/adr/19-language-server-packaging.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/19-language-server-packaging.md"
sourcePath: "docs/adr/19-language-server-packaging.md"
sourceSha: "f2a9e424c5fb71060cd03dc329806da63f408b9514b5a5fc27c199711305d84d"
sourceCommit: "203008e9741e8ffd61448e32cf9b89c19f1339da"
translationStatus: "translated"
sidebar:
  order: 4019
---

Status: **accepted、2026-05-17**。Rigorの言語サーバー実装のパッケージング形を決定し、将来のLSP作業（リファクタリング機能、追加のケイパビリティ（capability）、エコシステム統合）が、毎サイクルgem境界の問題を蒸し返すのではなく、明文化された前提から始まるようにします。

## コンテキスト

言語サーバーv1はv0.1.6で着地しました（コミット`a3e9c47` → `e2d1c9a`、1つの設計ドキュメント + 8つのスライス（slice） + クリーンアップにわたる12コミット）。完全な設計は[`docs/design/20260517-language-server.md`](../../design/20260517-language-server/)にあります;このADRは**LSPコードがどこに住むか**という直交する質問に取り組みます。

今日の形: `rigor lsp`はメインの`rigortype`gemのCLIサブコマンドで、実装は`lib/rigor/language_server/`の下、`language_server-protocol ~> 3.17`への新しいランタイム依存があります。LSPはRigorの内部APIを直接読みます — `Analysis::Runner`、`Scope#type_of`、`Environment`、`BufferTable`、`Inference::ScopeIndexer`、`Source::NodeLocator` — どれもADR-0のCLIファーストスコープに従って公開を約束されていません。

**LSPはバンドルされたままにするのか、別個のgemに分割するのか、既存のLSPフレームワークのアドオンにするのか？** という質問は、LSP機能追加（リファクタリング、codeAction、リネームなど）が積み重なって境界の移動が後から難しくなる前に、明示的な答えが必要です。

Rubyエコシステムには3つの実際の先例があります。

| パターン | 例 | 形 |
|---|---|---|
| **A. 単一gem、LSPはサブコマンド** | Steep（`steep langserver`）、Solargraph（`solargraph stdio`） | アナライザー + LSPサーバーが1つのgemに住む。ツール作者が両方のレイヤーを所有する。 |
| **B. アナライザーに依存する単独のLSPgem** | （Rubyにはほとんど先例がない;TSエコシステムで`typescript-language-server`が`tsc`の上にあるのが近い） | アナライザーgemとLSPgemが別々にバージョン管理される。LSPgemがアナライザーの公開APIに依存する。 |
| **C. 共有LSPシェルへのアドオン** | [`ruby-lsp`](https://github.com/Shopify/ruby-lsp)に対する`ruby-lsp-rubocop`、`ruby-lsp-rails`、`ruby-lsp-sorbet` | 共通のLSPシェルがアドオンプロトコル経由で複数のアナライザーをホストする。複数のアナライザーが1つのエディタセッションで共存できる。 |

SteepとSolargraph — Rigorと構造的に最も類似した2つのRubyプロジェクト（アナライザーファースト、単一ツール、型認識）— はどちらも**A**を選びました。Ruby LSPは**C**を選びましたが、これはLSPオーケストレーターシェルであり、アナライザーではありません;Rigorのようなツールの1つ上のレイヤーに座ります。

## 決定

**パターンA — LSPを`rigortype`gemにバンドルしたままにする**。

- `rigor lsp`は`check` / `type-of` / `sig-gen`と並ぶサブコマンドのままです。gem分割なし。
- LSP実装は`lib/rigor/language_server/`の下に住み、Rigorの内部APIに直接アクセスします。LSP / アナライザー境界での公開API安定性の誓約は不要です。
- `language_server-protocol ~> 3.17`は`rigortype`のランタイム依存のままです。それは薄いgem（約500行 + 自動生成されたLSP型）であり、バンドルコストはユーザーベース全体にとって受容可能です。

却下された代替案は、この決定を再開させるトリガー条件とともに「検討した代替案」に記録されています。

## 根拠

Aの理由:

1. **内部APIの結合**。LSPは`Analysis::Runner` / `Scope#type_of` / `Environment` / `BufferTable` / `Inference::ScopeIndexer` / `Source::NodeLocator`を直接読みます。これらはどれもADR-0に従って公開を約束されていません — アナライザーが自由に進化させる「いつでも変わってもよい」内部サーフェス（surface）として扱われています。別個のgemへの分割は次のいずれかを強制します:
   - それらのAPIが公開になる（アナライザー進化への萎縮効果）、または
   - 内部ヘルパーをLSPgemに重複させる（バージョンドリフトで腐る）。
   どちらの結果もアナライザーの主要ミッションには資しません。

2. **SteepとSolargraphの先例**。Rigorと構造的に最も類似した2つのRubyプロジェクトはどちらも、アナライザーgemのサブコマンドとしてLSPを出荷しています。彼らの経験は、バンドルされた形がアナライザーファーストのツールにとって自然なフィットであることを示唆し、どちらのプロジェクトでも境界が摩擦を生んだという証拠はありません。

3. **分割への需要圧力なし**。分割は、プロジェクトが現在抱えていない問題を解決します: インストールの肥大化（ユーザー苦情なし）、独立したリリースケイデンス（スケジューリング衝突なし）、複数のLSPバックエンド（地平線上に2つ目のバックエンドなし）。

4. **リファクタリング機能はパッケージングと直交**。フレーミングの質問 — 「リファクタリング機能を構築できるように分割すべきか？」 — は誤った前提です。リファクタリングケイパビリティ（`textDocument/codeAction`、`textDocument/rename`、`textDocument/formatting`）は、分割gem実装と同じように`rigortype`の内部で実装可能です。アーキテクチャ上のゲートは型認識コード書き換えと編集適用セマンティクスであり、どちらもどちらのレイアウトにも等しく収まります。

5. **可逆性が高い**。将来の分割（A → BまたはA → C）は、gem間でファイルを移動し1つのgemspec依存行を調整することを必要としますが、LSPコード自体は再設計を必要としません。一方、時期尚早の分割は、編集が難しくなるAPIサーフェスを固定化します。

## 再評価のトリガー条件

このADRはこれらの条件**の下で**受け入れられます。いずれかのトリガーが発火したら、次の実装者はパッケージングの問題を再開すべきです（SHOULD）。

| トリガー | 再評価する方向 |
|---|---|
| LSP実装が約2,000行を超えて成長する（今日: 約360行） | B（単独の`rigor-lsp`）。分割コストはLSP自体が実質的なサブシステムになったときに正当化される。 |
| 「`rigor check`をCIから使うが`language_server-protocol`をGemfile.lockに入れたくない」という具体的なユーザー需要 | B、`rigortype`がランタイム依存を失う;`rigor-lsp`がそれを運ぶ。 |
| 独立したリリースケイデンスが痛みになる（rigorアナライザーは型正確性のリズムで出荷;LSPはUXのリズムで出荷;リズムが衝突する） | B、別々のバージョニングで。 |
| 2つ目のLSPバックエンドが出現する（例えば同じアナライザーを使う別のオーディエンス向けのLSP） | B、両方のバックエンドがgem間結合なしに合成できるように。 |
| 「rigorの解析をRuboCop / Sorbet / Rails LSPと1つのエディタセッションで合成したい」という具体的なユーザー需要 | C（`ruby-lsp-rigor`アドオン、Aと並行）。 |
| 新しいLSPシェルプロジェクトがRuby LSPを置き換え、Rigorが統合する必要がある | C、新しいシェルに対して。 |

期待は**これらのいずれもv0.1.xまたはv0.2.xサイクルでは発火しない**ことです。v0.3.x / v0.4.xの実装者がそれらを再導出する必要がないように記録されています。

## 分割する場合の命名規則

トリガー条件が発火して分割が起こる場合:

- **`rigor-lsp`** — 既存のRigorプラグインファミリーのプレフィックス（`rigor-rails-routes`、`rigor-dry-types`、`rigor-activerecord`など）に一致します。移行が漸進的（gradual）なら、[`rigor-plugin-author`](https://github.com/rigortype/rigor/blob/master/skills/rigor-plugin-author/SKILL.md)SKILL規律に従って`plugins/rigor-lsp/`の下にステージし、安定したら`git subtree split`で抽出します。
- **`ruby-lsp-rigor`** — 分割がC（Ruby LSPアドオン）に向かう場合、Ruby LSPの`ruby-lsp-<name>`アドオン命名規則に従います。両方の形が共存するなら`rigor-lsp`（A）とは独立にリリースされます。
- **`lsp-rigor`は不可** — Rigorの既存のプレフィックス体制と逆順;一貫性の理由で却下。

## 検討した代替案

### B. `rigortype`に依存する単独の`rigor-lsp`gem

**長所**

- 専用の製品サーフェス: `rigor-lsp`は「Ruby言語サーバー」を検索しているユーザーに名前で発見可能。
- `rigortype`のランタイムが最小限に保たれる（CLIのみのユーザーに対する`language_server-protocol`依存なし）。
- 独立したリリースケイデンス。LSP UXの変更はアナライザーのバンプなしで出荷;アナライザーの型正確性の変更はLSPのバンプなしで出荷。
- 理論的には、`rigortype`を消費する別のLSPシェルを可能にする（実際にはあり得ない）。

**短所**

- アナライザーの内部API（Runner / Scope / Environment / BufferTable / ScopeIndexer / NodeLocator）が公開になることを強制する — または内部ヘルパーを`rigor-lsp`に重複させることを強制する。両方の結果は現在の形より悪い。
- gem間のバージョン互換性マトリックス（`rigortype 0.x` ↔ `rigor-lsp 0.y`）。解決可能だがリリース調整を追加する。
- 両方のレイヤーに触れる貢献者にとっての認知的オーバーヘッドが高い。

**却下された理由**は、APIの結合コストがリストされたあらゆる長所を支配するためです。長所はLSPが十分に大きく成長したとき、または分割インストールへのユーザー需要が表面化したときにのみ現実になります — トリガー表を参照してください。

### C. Ruby LSPシェル下の`ruby-lsp-rigor`アドオン

**長所**

- 1つのエディタセッションで他のRuby LSPアドオン（RuboCop、Rails、Sorbet）と共存。
- 維持するLSP配管が少ない（Ruby LSPがフレーミング、ライフサイクル、ケイパビリティネゴシエーションを所有）。
- ShopifyがプッシュしているRubyツーリングエコシステムv2の方向性に一致する。

**短所**

- 大幅な再アーキテクチャ: v0.1.6で着地した約250行の`Server` / `Loop`レイヤーは、ほぼRuby LSPアドオンの足場で置き換えられる。
- Ruby LSPのアドオンプロトコルの安定性に依存する — Shopifyが契約（contract）を変更できる;Rigorは追従するか動かなくなる。
- LSPライフサイクル（ケイパビリティ選択、起動順序、リクエスト優先順位付け）に対するアーキテクチャ制御を放棄する。
- Ruby LSPがアドオンAPIを通じて公開するLSP機能セットに、Rigorを閉じ込める。

**今のところ却下**されますが、複数アナライザー合成への具体的なユーザー需要が表面化したら再訪する価値があります。その場合の理想的なパスは**Aと並行してC**です（Rigorだけを望むユーザーのために単独サブコマンドを保ち、合成を望むユーザーのためにアドオンを追加する）。

### リファクタリングツールを含むメガgem

考慮: LSPスライスの一部としてcodemodツーリング、Prismリライターなどを`rigortype`にバンドルし、gemをRubyの「静的解析 + IDE」の全部入りツールにする。

**却下された理由**は、codemod / リライターレイヤーは、gemのランタイムアイデンティティに吸収されるべきではなく、それ自身でアドレス可能なサブシステムであるべきだからです。リファクタリング機能が出荷されるとき（ROADMAPの§「エディタ / IDE統合」の下でキューイング済み）、リライターは`rigortype`内の独自の`lib/rigor/refactoring/`名前空間の下に住み、LSPレイヤーが呼び出すクリーンな内部APIを持つべきです。これがアナライザー / リファクタリング / LSPを1つのgem境界の下にある3つの識別可能なサブシステムとして保ちます — Steepが実証するバンドルされているが分割可能（bundled-but-modular）な形です。

## 帰結

**ポジティブ**

- LSP開発は、`rigor check`と`rigor type-of`を駆動しているのと同じ内部APIサーフェスに対して継続する。新しい公開API安定性の負担なし。
- 当面の間、単一gemインストールモデル。1つのコマンド（`gem install rigortype`）でユーザーにCLI + LSPを与える。
- Rails / dry-rbのプラグインファミリーパターン（`examples/`の下のgemごと、安定したら抽出）は正準的なマルチgemパスのままである — LSPは単にそれに当てはまらない。

**ネガティブ / コスト**

- `language_server-protocol`ランタイム依存は、CIのみのユーザーを含むすべての`rigortype`インストールで恒久的になる。緩和: gemは小さく、`json`（Ruby 3+のstdlib）以外の推移的ランタイム依存はない。トリガー表が発火するまで受容可能。
- 将来の再評価は明示的に起こる必要がある。このADRは質問が忘れられないようにするブックマークである。

**中立**

- リファクタリング機能は出荷時に新しいgemではなく`rigortype`内に着地する。LSPを使わない`rigor check`の消費者はコードサイズのコストを払うが、ランタイムコストは払わない（リファクタリングコードは`rigor lsp`パス経由でのみロードされる）。

## ステータスレビューのケイデンス

このADRは次のときにレビューされます。

- 上記の任意のトリガー条件が発火する（必須のレビュー）。
- 大きなLSPケイパビリティが着地する（リファクタリング、セマンティックトークン、インレイヒント） — バンドルされた形がまだ役立っていることをサニティチェック。
- Rubyエコシステムが変化する（Ruby LSPがシェルとして普及する、あるいは衰退する;新しいシェルが出現する）。

これらのいずれかが起こるまで、このADRは書かれたままの形で重要であり続けます。
