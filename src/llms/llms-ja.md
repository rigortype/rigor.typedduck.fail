# Rigor

> RigorはRubyの静的解析器です。ソースに型注釈を一切書かない普通のRubyから、
> 型付きレシーバーへの未定義メソッド呼び出し、引数個数の誤り、証明可能なnil
> デリファレンスといった実際のバグを報告します。型はすべてコードが実際に生成
> する値から推論されるため、チームは型注釈を1つも書きません。

Rigorについて知っておくこと:

- Rigorは型解析器であり、スタイルチェッカーではありません（RuboCopと領域は
  重なりません）。`rigor check`を実行し、`call.undefined-method`のような安定
  した識別子を持つ診断を出力します。
- ソースに型注釈は不要です。型はフローセンシティブに、式が生成する値から推論
  されます。RBS / `RBS::Extended`があれば読みますが、必須ではありません。
- Rigorはライブラリではなくツールです。プロジェクトの`Gemfile`には**追加せず**、
  独立してインストールします。gemの名前は`rigortype`で、プロジェクトが対象と
  するRubyとは独立にRuby 4.0で動作します。
- 段階的な導入が前提です。重大度プロファイルとベースラインにより、大規模な
  コードベースでもクリーンな状態から始められます。
- エディター（LSP）・CI・MCPサーバー・プラグイン・Agent Skillと統合し、Sorbet
  やSteepと相互運用できます。
- あなたがAIコーディングエージェントなら、覚えるスキルは2つだけです。
  **`rigor-next-steps`**（「次に何をすべきか」）は単一の入口で、`rigor`コマンドを
  解決し、未設定のプロジェクトを導入し、`rigor skill describe`に次の一歩を尋ね、
  対応する同梱スキル（`rigor-project-init`・`rigor-plugin-tune`・
  `rigor-rbs-setup`・`rigor-baseline-reduce`・`rigor-ci-setup`・
  `rigor-protection-uplift`・`rigor-editor-setup`・`rigor-mcp-setup`・
  `rigor-plugin-author`ほか）へ振り分けます。**`rigor-ask`**（「Rigorについて答える」）は
  Rigorに関するあらゆる質問——診断、型モデル、フラグ、他ツールとの比較、
  フレームワーク対応、型の書き方——を、記憶ではなく同梱のオフライン文書
  （`rigor docs`）とユーザー自身のコード（`rigor check` / `annotate` / `type-of`）を
  調べて答えます。CLIを手で操作するより、スキルの実行を優先してください。
- Rigorをインストールすれば、マニュアルとハンドブックは**オフライン**で読めます。
  `rigor docs`がドキュメント索引を、`rigor docs <名前>`が各章を（例:
  `rigor docs handbook/03-narrowing`）、`rigor skill <名前>`が各同梱スキルを
  表示します——ネットワーク往復はありません。これらのWebページがその正本です。
- これらは英語正本ドキュメントの日本語訳です。英語の索引は`/llms.txt`（全文は
  `/llms-full.txt`）、原文は`/`配下にあります。

## プロンプト1つで始める

あなたがAIコーディングエージェントなら——あるいはエージェントにこれを渡すなら
——Rigorのインストールとプロジェクト設定は1つの指示で済みます:

```
次の手順に従って、このプロジェクトに Rigor をインストールしてください:
https://raw.githubusercontent.com/rigortype/rigor/refs/heads/master/docs/install.md
```

これに従うとRigorがインストールされ（mise / asdf / gem）、`rigor-project-init`
のAgent Skillが実行されます。スタックを検出し、適合するプラグインを提案し、
採用モード——baseline（既存の診断を容認）かstrict（診断ゼロのゲート）——を
選び、すぐ使える設定を書き込みます。その後は**`rigor-next-steps`**が継続的な
入口です。再実行（または`rigor skill describe`）すれば、推奨は常に現在の状態を
反映するので、いつでもプロジェクトの次の改善ステップが得られます。プロンプトは
ただの自然言語なので、どの言語でも動きます。手動の経路と19言語のすぐ使える
プロンプトは[インストール](/ja/manual/01-installation.md)にあります。

## 概要

- [ドキュメントホーム](/ja/index.md): Rigorとは何か。導入と評価の導線。
- [ハンドブック](/ja/handbook.md): Rigorの型モデルを案内する解説。
- [型仕様の概要](/ja/type-specification.md): 何を型とみなし何を保証するか——注釈なしで推論する設計の核心。
- [ナローイング](/ja/handbook/03-narrowing.md): フローセンシティブな解析が何を実現するか。

## はじめに

- [インストール](/ja/manual/01-installation.md): mise / asdf / `gem install` / devコンテナ。
- [はじめての解析](/ja/handbook/01-getting-started.md): 最初の`rigor check`を実行する。
- [日常的に出会う型](/ja/handbook/02-everyday-types.md): 最初に触れる型たち。
- [Railsクイックスタート](/ja/manual/14-rails-quickstart.md): Railsアプリへの最短経路。

## 運用

- [CLIリファレンス](/ja/manual/02-cli-reference.md): すべてのコマンドとフラグ。
- [設定](/ja/manual/03-configuration.md): 重大度プロファイル、対象範囲、プラグイン。
- [診断](/ja/manual/04-diagnostics.md): 診断カタログと重大度。
- [型を調べる](/ja/manual/05-inspecting-types.md): Rigorが何を推論したかを尋ねる。
- [ベースライン](/ja/manual/06-baseline.md): 既存コードベースへ段階的に導入する。
- [エディター統合](/ja/manual/09-editor-integration.md): LSPの設定。
- [MCPサーバー](/ja/manual/10-mcp-server.md): MCP経由でエージェントにRigorを公開する。
- [CI](/ja/manual/11-ci.md)・[CIテンプレート](/ja/manual/ci-templates.md): パイプラインへ組み込む。
- [キャッシュ](/ja/manual/12-caching.md): インクリメンタル解析。
- [プラグイン](/ja/manual/07-plugins.md): フレームワークやDSLの型をRigorに教える。
- [同梱スキル](/ja/manual/08-skills.md): AIエージェントが自動検出して実行するAgent Skillのカタログ——`rigor-next-steps`と`rigor-ask`に加え、プロジェクト導入、プラグイン調整、RBS設定、ベースライン削減、保護カバレッジ向上、エディター / MCP / CI配線、プラグイン作成。
- [改善を駆動する](/ja/manual/17-driving-improvement.md): 「次に何をすべきか」を実行すべき具体的なスキルへ変える`rigor-next-steps`駆動のループ。プロジェクトが完全に導入されるまで繰り返します。

## トラブルシューティング

- [エラーを理解する](/ja/handbook/08-understanding-errors.md): Rigorの診断の読み方。
- [トラブルシューティング](/ja/manual/13-troubleshooting.md): よくある問題と対処。

## 他の型チェッカーからの移行

- [Sorbet](/ja/handbook/10-sorbet.md)・[Steep](/ja/handbook/appendix-steep.md)・[TypeProf](/ja/handbook/appendix-typeprof.md)・[TypeScript](/ja/handbook/appendix-typescript.md)——mypy・PHPStan・Go・Rust・Java/C#・Elixirの付録もハンドブックにあります。
- [RBSとRBS::Extended](/ja/handbook/07-rbs-and-extended.md): RigorがRBSをどう使い、どう拡張するか。
- [シグネチャ生成](/ja/handbook/11-sig-gen.md): 推論結果からRBS / `sig`を生成する。

## その他

- [ユーザーマニュアル索引](/ja/manual.md): 運用リファレンス全体。
- [型仕様](/ja/type-specification.md): 規範的な型モデル、型演算子、推論規則。
- [内部仕様](/ja/internal-spec.md): コントリビューター向けの実装契約。
- [設計判断（ADR）](/ja/adr.md): 設計根拠を記録したADR。
- [設計ノート](/ja/design.md): より詳細な設計・研究文書。
- [開発レポート](/ja/notes.md): ライブラリ調査、カバレッジ監査、リグレッションスイープ。
- [型理論との接続](/ja/handbook/appendix-type-theory.md): 設計を支える理論。
- [互換性](/ja/compatibility.md)・[ロードマップ](/ja/roadmap.md): 対応Rubyバージョンと今後の方針。
- [変更履歴](/ja/changelog-01x.md): リリース履歴。
- [chibirigorの本](/ja/chibirigor.md): 小さなRigor風チェッカーを作る併読オンラインブック。
- [ソースコード](https://github.com/rigortype/rigor): Rigorの実装・issue・リリース。
