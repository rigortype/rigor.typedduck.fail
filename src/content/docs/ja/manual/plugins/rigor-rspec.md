---
title: "rigor-rspec"
description: "Imported from rigortype/rigor docs/manual/plugins/rigor-rspec.md."
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-rspec.md"
sourcePath: "docs/manual/plugins/rigor-rspec.md"
sourceSha: "e945c48db83d54482fc8033998ec8da558ebe5881477449fb358135f992e2b1f"
sourceCommit: "5c304b2c680eccdbfaffc114c0f31ce89f740ad4"
translationStatus: "translated"
sidebar:
  order: 9050
---

各`describe` / `context`スコープ内でのRSpecの`let` / `subject`宣言を検証します。これは意図的に小さく作られています。同梱される2つのチェックは、提案されているRSpecサーフェス（surface）の中で偽陽性リスクが最も低く、純粋な構文ウォークモードで動作し、`rspec` / `rubocop-rspec`が必ずしも明確に表面化しない実際のバグを捕捉します。RSpecのランタイム依存はありません。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で有効化してください。

```yaml
plugins:
  - rigor-rspec
```

## 何をチェックするか

```ruby
RSpec.describe "User" do
  let(:user) { :alice }
  let(:user) { :bob }            # ← warning: duplicate `let(:user)`

  let(:tags) { tags.map(&:up) }  # ← error: self-referencing let

  context "when admin" do
    let(:user) { :admin }        # ← OK: different scope
  end
end
```

```text
spec/user_spec.rb:5:3: warning: duplicate `let(:user)` in this scope (first declared at line 4); the last declaration wins at runtime
spec/user_spec.rb:7:3: error:   `let(:tags)` references its own name `tags` — this will infinite-loop at runtime
```

1. **同一スコープ内での`let` / `subject`宣言の重複** ── `warning`。RSpecのランタイムは最後の宣言を優先するため、最初の宣言は黙ってシャドウされます。メッセージは最初の宣言の行を示します。
2. **自己参照する`let` / `subject`** ── 宣言した名前を自身のブロック本体の内側から呼び出すこと ── `error`。ランタイムでは無限ループになります。

ウォーカーは`RSpec.describe … do`（ルート）、ネストされた`describe` / `context … do`、`let(:name)` / `let!(:name)`、そして`subject(:name)` / 素の`subject`（暗黙の`:subject`）を認識します。

## 設定

設定ノブはありません。プラグインはプロジェクトの`paths:`上のすべてのファイルを`RSpec.describe … do`ブロックを探して走査します。認識されるdescribeブロックを持たないファイルは黙ってスキップされるため、spec以外のファイルと並べてプロジェクト全体で有効化しても安全です。

## 制限事項

- **`it`本体内でのletタイポ検出はなし**。 `it`ブロック内のスペルミスした`let`名をフラグするには、はるかに重いウォーカー（マッチャーDSL、ヘルパーメソッド、letスコープチェーン）が必要 ── 待機中です。
- **モックターゲット検証はなし**。 `x`のメソッドに対する`expect(x).to receive(:nme)`は別のスライス（slice）です。
- **共有コンテキストの解決はなし**。 `include_context`、`shared_context`、`it_behaves_like`は無視されます。
- **自己参照検出はブロック内のみ**。間接的なループ（`let(:user) { foo }`で`foo`が`user`を呼び戻す場合）はフラグされません。
- 定数検証（`RSpec.describe SomeClass`）はこのプラグインではなくエンジンの仕事です。

## 関連プラグイン

`rspec-rails`と`shoulda-matchers`のマッチャーはほとんどが*振る舞い的*（静的な型ではなくランタイムの状態をアサートする）なので、ここでは対象外です。待機中の`rigor-rspec-rails`と`rigor-shoulda-matchers`プラグインが、それらに対するドメイン固有のdiagnosticを発行することになります。READMEがその境界を詳しく扱っています。

## プラグイン内部

スコープウォーカー / アナライザーのレイアウト、デモの実行方法、このプラグインが行使する契約（contract）サーフェス、今後の方向性のスライスは[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-rspec/README.md)にあります。プラグインの書き方は[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
