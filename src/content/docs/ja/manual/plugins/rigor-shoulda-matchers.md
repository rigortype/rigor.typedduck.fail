---
title: "rigor-shoulda-matchers"
description: "rigortype/rigor docs/manual/plugins/rigor-shoulda-matchers.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/manual/plugins/rigor-shoulda-matchers.md"
sourcePath: "docs/manual/plugins/rigor-shoulda-matchers.md"
sourceSha: "b294cfc2e301be0736cfe722010c36f4a3f873819e719b3a3b84e5aca15739a7"
sourceCommit: "6e5bd55274e20dfb59183559c4971d34f878c907"
translationStatus: "translated"
sidebar:
  order: 9050
---

`RSpec.describe <Model> do … end`ブロック内の[shoulda-matchers](https://github.com/thoughtbot/shoulda-matchers)呼び出しを、モデルの実際のスキーマに照らして検証します。カラムマッチャー（`validate_presence_of(:col)`、`have_db_column(:col)`、…）は実在のカラムを指していなければならず（MUST）、アソシエーションマッチャー（`belong_to(:assoc)`、`have_many(:assoc)`、…）は一致する種類の実在のアソシエーションを指していなければなりません（MUST）。これは[rigor-activerecord](../rigor-activerecord/)が公開する`:model_index`ファクト（fact）（ADR-9）に照らしてクロスチェックします ── そのためrigor-rspec（RSpec自身の`let` / `subject` DSLを扱う）と重複するのではなく補完します。

これは`rigortype`にバンドルされて配布されます。`plugins:`の下で、（消費するモデルインデックスを公開する）rigor-activerecordと一緒に有効化します。

```yaml
plugins:
  - rigor-activerecord     # :model_index を公開する
  - rigor-shoulda-matchers # それを消費する
```

## 何をチェックするか

```ruby
RSpec.describe User do
  it { should validate_presence_of(:email) }   # `email` がカラムならOK
  it { should validate_presence_of(:nme) }     # 警告: 未知のカラム
  it { should belong_to(:author) }             # `author` が単数ならOK
  it { should belong_to(:posts) }              # 警告: 種類の不一致（posts はコレクション）
  it { should have_many(:comments) }           # `comments` がコレクションならOK
  it { should have_many(:nonexistent) }        # 警告: 未知のアソシエーション
end
```

| ルール | 重大度 | 発火条件 |
| --- | --- | --- |
| `plugin.shoulda-matchers.unknown-column` | warning | カラムマッチャーがモデルに存在しないカラムを指している |
| `plugin.shoulda-matchers.unknown-association` | warning | アソシエーションマッチャーがモデルに存在しないアソシエーションを指している |
| `plugin.shoulda-matchers.association-kind-mismatch` | warning | マッチャーが期待する種類（単数 / コレクション）がアソシエーションの実際の種類と食い違っている |

カラムマッチャー: `validate_presence_of` / `_uniqueness_of` / `_length_of` / `_numericality_of` / `_acceptance_of` / `_inclusion_of` / `_exclusion_of` / `_absence_of` / `_format_of` / `_confirmation_of`、および`have_db_column` / `have_db_index`。アソシエーションマッチャーとその期待する種類: `belong_to` / `have_one`（単数）、`have_many` / `have_and_belong_to_many`（コレクション）。どのモデルが検査されるかは、囲んでいる`describe <Constant>`（最も内側が優先）が固定します。

限定したルールで抑制します（例: `# rigor:disable plugin.shoulda-matchers.unknown-column`）。あるいは`# rigor:disable plugin.shoulda-matchers`でファミリー全体を黙らせます。

## 設定なし

このプラグインに設定ノブはありません。rigor-activerecordがロードされていない場合 ── または解析対象のモデルのインデックスを公開していない場合 ── プラグインは沈黙します。クロスチェックはオプトインです。

## 制限事項

- **チェーンマッチャーの引数検証はありません** ── `validate_length_of(:col).is_at_most(50)`、`validate_inclusion_of(:col).in_array([...])`などのチェーン終端はランタイム専用です。
- **ポリモーフィック / `through:`の検証はありません** ── 名前付きアソシエーションのみが検査され、チェーン修飾子は無視されます。
- **ネスト属性マッチャーやコールバックマッチャーはありません**（`accept_nested_attributes_for`、`callback(...)`）。
- **ルート / ルーティングマッチャーはありません** ── それらはrigor-rspec-railsのドメインです。

## プラグインの内部

describeウォーカー / マッチャーの認識器（recognizer）と、このプラグインが行使する契約（contract）のサーフェス（surface）（オプショナルな`:model_index`の消費、`NodeContext`の祖先解決）については、[プラグインのREADME](https://github.com/rigortype/rigor/blob/master/plugins/rigor-shoulda-matchers/README.md)にあります。プラグインの書き方については[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)と[`rigor-plugin-author`](../../08-skills/)スキルを参照してください。
