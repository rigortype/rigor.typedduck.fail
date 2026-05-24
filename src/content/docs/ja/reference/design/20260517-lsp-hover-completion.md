---
title: "LSP v2 — 型を意識したhover + completionの設計"
description: "rigortype/rigor docs/design/20260517-lsp-hover-completion.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/design/20260517-lsp-hover-completion.md"
sourcePath: "docs/design/20260517-lsp-hover-completion.md"
sourceSha: "935308ad39d8156162a4d7a0b1a0059bdd1d44a9301f8f57f923026a14a776f6"
sourceCommit: "dac915a9ee49b89e89774c34c518e8501275f6a3"
sourceDate: "2026-05-17T01:55:57+09:00"
translationStatus: "translated"
sidebar:
  order: 20265517
---

**Status:** Draft。
[`20260517-language-server.md`](../20260517-language-server/)
（LSP v1、v0.1.6で着地）のフォローアップであり、2つの表面を型を意識した
挙動へ拡張する。すなわち、よりリッチなhoverと、`textDocument/completion`
の最初の一手である。

LSP v1の`textDocument/hover`は最小限のmarkdownボディ
（`type:`、`erased:`、`node:`）を返す。動作はするものの、まだ解析器の
持つ完全な型情報を活かしきれていない。メソッド呼び出しのレシーバ型、
RBSコメント、シグネチャ、定数定義箇所へのsource-of-truthリンクなどである。
Completionはv1では完全に存在しない（設計ドキュメントの
§「Out of scope for v1」でキューに積まれている）。
両方のギャップは、エディタ利用者が自然に感じる次の一手のUX作業である。

このドキュメントが設計するのは:

1. **Hoverの強化** — ノードクラスでディスパッチするhoverレンダリングにより、
   形状ごとに型に関連する情報を表に出す。
2. **`textDocument/completion`** v1 — `.`の後のメソッド補完と、
   `::`の後の定数パス補完。いずれも推論された型または宣言された型に駆動される。

`textDocument/signatureHelp`は自然な兄弟として言及されるが、別スライスに
キューイングされる（completionと相補的だが、その表面は独立している）。

## 決定事項

- **Hoverはインラインのmarkdownボディのまま**とする（LSP `Hover.contents`
  で`kind: "markdown"`）。v2では`range`フィールドは持たない —
  エディタはカーソル位置をアンカーとして使う。
- **ノードクラスごとのレンダリング**を新しい`HoverRenderer`コラボレータで
  行い、Prismのノードクラスでディスパッチする。未知の形状については
  slice-5のデフォルトボディを維持し、`CallNode` / `ConstantReadNode` /
  `ConstantPathNode` / `LocalVariableReadNode` / `InstanceVariableReadNode` /
  リテラルキャリアについて特殊化する。
- **Completionのスコープv1**: `.`の後のメソッド補完と、`::`の後の
  定数パス補完。裸の名前による補完（ローカル変数 + 暗黙のself上のメソッド）と
  ハッシュキー補完（HashShapeキャリア）はv2のフォローアップにキューイングする。
- **トリガ文字**: `.`と`::`（LSP capabilityの
  `completionProvider.triggerCharacters: [".", ":"]`。`::`の2番目の
  `:`がトリガとなり、1文字前を覗き見る）。
- **メソッド列挙は`Reflection.instance_definition` /
  `singleton_definition`経由** — Rigorの既存のRBSクエリ表面である。
  新しい公開APIは追加しない。
- **CompletionItemのdetailフィールドはRBSシグネチャ**であり、
  `rigor sig-gen`と同じ方法でレンダリングする。シグネチャ1行、
  kebab-caseの精製は展開する。
- **サーバサイドでのファジーマッチングは行わない**。LSPクライアント
  （VSCode / Neovim / Emacs）が`CompletionItem[]`をユーザーの入力プレフィックスに
  対して自前でフィルタする。サーバは候補集合をまるごと返し、クライアントに
  フィルタさせる。こちらの方がシンプルで安価であり、エディタごとの
  ファジーマッチ設定を尊重できる。

## Hover強化の設計

### 現在の形状（slice 5のフロア）

```ruby
type:   <Type#describe>
erased: <Type#erase_to_rbs>
node:   Prism::IntegerNode
```

デバッグ用途としては有用だが、ユーザー向けのツールチップとしては弱い。
情報密度が低く、認知地図（「カーソル下のものにとってこの型は*何を意味する*のか」）
が欠けている。

### ノードごとのレンダリング行列

| ノードクラス | hoverボディの形状 |
|---|---|
| `Prism::CallNode`（`obj.foo(args)`） | レシーバ型 + メソッドシグネチャ（パラメータ + 戻り値）+ RBSコメント（あれば）+ ソース位置へのリンク。 |
| `Prism::ConstantReadNode` / `Prism::ConstantPathNode` | 解決済みのクラス／モジュールFQN + シングルトン型 + クラスのRBSコメント + ソース位置へのリンク。 |
| `Prism::LocalVariableReadNode` / `LocalVariableWriteNode` | 変数名 + 推論／絞り込み済みの型 + 直近のバインディングの行。 |
| `Prism::InstanceVariableReadNode` / `InstanceVariableWriteNode`（`@foo`） | スコープのインスタンスコンテキスト絞り込みによるivar型 + 囲んでいるクラス。 |
| `Prism::SymbolNode`（`:foo`） | リテラル値 + キャリア（`Constant<:foo>`）。 |
| `Prism::IntegerNode` / `FloatNode` / `StringNode` / `RegularExpressionNode` | リテラル値 + キャリア +（精製済みのStringについては）精製名。 |
| `Prism::ArrayNode` / `HashNode` | キャリアの形状（`Tuple<...>` / `HashShape<...>`）と、要素型を1行ずつレイアウトしたもの。 |
| _default_ | slice-5のボディ（`type:` / `erased:` / `node:`）。 |

レンダラーはノードに対するcaseディスパッチを持つ単一のクラスで、
各分岐は短い（markdown構築は1〜3行）。新規コードの総量は約150行。

### レンダリングの詳細

**メソッド呼び出し（`obj.foo(args)`）**:

```ruby
# Receiver
String

# Method
def upcase: () -> String

# Defined in
core (ruby/rbs)
```

1行目は**レシーバ型**のdescribe形式。2行目はRBSシグネチャで、
`Reflection.instance_method_definition(class_name: receiver.describe,
method_name: node.name)`で参照し、sig-genが使っているのと同じ消去パスを
通してレンダリングする（v1は単一オーバーロード表示。複数オーバーロードの
対応はフォローアップ）。

3行目はソース帰属を示す。RBS定義に`location.buffer.name`があればそれを
表示し、そうでなければ`Environment::Reflection`のパス分類に基づいて
"core (ruby/rbs)" / "bundled (gem-ships sig/)" / "project sig" のいずれかに
フォールバックする。

**定数**:

```ruby
# Constant
Foo::Bar

# Type
singleton(Foo::Bar)

# Defined in
lib/foo/bar.rb:3
```

定数のFQNは`qualified_name_of(node)`から得る（すでに
`DocumentSymbolProvider`にある）。型は型システムが付与した
`Type::Singleton`キャリア。ソース位置は
`Reflection.instance_definition(class_name).declarations.first.location`から
取得する。

**ローカル変数**:

```ruby
# Local
results

# Type
Array[Integer]

# Bound at
lib/example.rb:12
```

カーソル位置で絞り込まれた型は、`Scope#type_of`がすでに返しているものである。
Bound-atはスコープ内の直近の代入箇所であり、スコープインデクサが
`LocalVariableWriteNode`について既に追跡している。

**精製による絞り込み**:

値の絞り込み済み型が精製
（`Refined[non-empty-string]`、`Difference[Integer, -1..-1]`）である場合、
hoverは正準な精製名と基底型を併記して表に出す:

```ruby
# Type
String (non-empty-string)
```

これはUXとして価値が高い。絞り込みは解析器の特徴的な出力であり、
ユーザーは「なぜこれが絞り込まれているのか」を知りたいからである。

## Completionの設計

### LSPリクエストの形状

```
textDocument/completion request
params: {
  textDocument: { uri },
  position: { line, character },
  context: {
    triggerKind: 1 | 2 | 3,    # Invoked | TriggerCharacter | TriggerForIncompleteCompletions
    triggerCharacter?: "." | ":"
  }
}
returns: CompletionItem[] | CompletionList | null
```

サーバはフラットな配列（incomplete-list挙動なし）を返すか、nullを返す
（補完候補が得られない — 空配列とは区別され、空配列は「試したが何も
得られなかった」を意味する）。

### CompletionItemの形状

```ruby
{
  label: "upcase",                    # what the user sees
  kind: 2,                            # CompletionItemKind::Method
  detail: "() -> String",             # signature on the right side
  documentation: { kind: "markdown",
                   value: "..." },    # popup body
  insertText: "upcase",               # what the editor inserts
  filterText: "upcase",               # what the client fuzzy-matches against
  sortText: "0_upcase"                # sort priority (server-side rank)
}
```

`sortText`はサーバにランクのレバーを与える。v1のランキングは以下の通り:

1. **所有クラスの近さ** — レシーバの厳密なクラス上のメソッドが、
   継承元の祖先のメソッドよりも上位にランクされる。
2. **可視性** — public > protected > private。
3. **辞書順** — ランクグループ内のタイブレーク用。

経験的に、これはエディタ利用者の期待と一致する（Stringレシーバ上で
入力しているとき、`String#upcase`が`Object#hash`に勝つ）。

### メソッド補完（`obj.|`）

パイプライン:

1. **バッファをパースする**。Prismのエラー回復が部分的なASTを
   出力する。カーソルは、`name`が空または部分識別子である`CallNode`の
   上か直後にある。
2. **レシーバを特定する**。ASTをカーソル位置のノードへと辿る。
   レシーバはそのcallノードの`receiver`である。
3. **レシーバの型を推論する**。hoverプロバイダがすでに使っているのと
   同じ`Scope#type_of`パスを使う。
4. **メソッドを列挙する**。名前的型については
   `Reflection.instance_definition(class_name)`で、Union / Intersectionに
   ついては各メンバについて列挙する（intersection: メンバのメソッドの和集合。
   union: 意味論的にはメンバのメソッドの積集合 — ただしcompletionのUX
   としては「*有効でありうる*ものすべて」の和集合が欲しい）。
5. **可視性でフィルタする**。レシーバが`self`でない場合、
   privateメソッドを落とす。
6. **各メソッドをCompletionItemに変換する**。

レシーバ型 → 列挙の行列:

| レシーバキャリア | 列挙ソース |
|---|---|
| `Nominal[C]` | `Reflection.instance_definition(C).methods` |
| `Singleton[C]` | `Reflection.singleton_definition(C).methods` |
| `Constant<v>` | `Nominal[class_of(v)]`として列挙する |
| `Tuple<...>` / `HashShape<...>` | 名前的祖先（`Array` / `Hash`） |
| `Refined[...]` | 基底の名前的型を列挙する |
| `Union[A, B, ...]` | 各メンバのメソッドの積集合（あらゆるunionケースで確実にディスパッチされるメソッドのみ） |
| `Dynamic[T]` | `T`がTopでなければ`T`のメソッドを列挙する。さもなくば何もなし（`Dynamic[Top]`について有用な補完はない）。 |

Union / Intersectionの列挙は記録しておく価値のある設計ポイントである。
素朴な「メソッドの和集合」は偽陽性を多く生む（レシーバが`Integer | String`
のときに`Integer#upcase`が表示される）。「メソッドの積集合」は安全な集合を
与える。v1では積集合を採用する。UXフィードバックによって緩和すべきか
判断する。

### 定数パス補完（`Foo::|`）

パイプライン:

1. パース + カーソル位置の`ConstantPathNode`を特定する。
2. レキシカル・ネスティングチェーン経由で親定数を解決する
   （`Reflection.constant_type_for`を反映）。
3. 子定数を列挙する:
   - `Reflection.instance_definition(parent_fqn).declarations`から内部クラス
     ／モジュール。
   - `Environment::Reflection#known_classes`内のネストされた
     `Type::Singleton`登録。
4. それぞれをCompletionItemに変換する。`kind: 7`（Class）／
   `kind: 9`（Module）／`kind: 21`（Constant）。

### トリガ文字

LSP capabilities:

```ruby
completionProvider: {
  triggerCharacters: [".", ":"],
  resolveProvider: false   # CompletionItem fields are filled at request time
}
```

なぜ`resolveProvider: true`にしないのか？`completionItem/resolve`は、
ユーザーが特定の項目をハイライトするまで`detail`と`documentation`
フィールドの送信を遅延させ、大規模な補完集合での帯域を節約できる。
Rigorの典型的な補完集合（大半のレシーバで50メソッド未満）では帯域節約は
ごくわずかであり、ラウンドトリップが遅延を増やす。v1ではすべてを
先頭で送信し、特に大規模な列挙（`BasicObject`の子孫など）が出荷される
段階になればresolveが関連してくる。

トリガ文字が`:`のときは、直前の文字をMUST確認する — 意味のあるトリガは
`::`（定数パス）のみであり、裸の`:`はシンボルリテラルの開始であって、
v1ではシンボルを自動補完しない。

### パース回復

編集途中のバッファは定義上ill-formedである。Prismのエラー回復は
歩行可能な「ベストエフォート」のASTを生成する。Completionパイプラインは
パースエラーを許容し、部分的な情報を使う。

失敗モード:

- Prismは使えるASTを返すが、呼び出しサイトのレシーバ型が
  `Dynamic[Top]`（推論で絞り込めなかった） → 空の補完リストを返す
  （LSPとして正しい「試したが何も得られなかった」）。
- Prismが部分的なASTすら作れない → **レキシカルコンテキスト検出**に
  フォールバックする。カーソル直前の200文字を読み、メソッド補完は
  `/(\S+)\.(\w*)$/`、定数パスは`/(::?[A-Z]\w*)+(::)?(\w*)$/`で
  マッチさせる。どちらにも一致しなければnilを返す。
- レシーバがリテラルの`nil` → `NilClass`のパブリックメソッド
  （`nil?`、`inspect`、`to_s`）のみを返す。

### フィルタリング: サーバサイドかクライアントサイドか？

LSPクライアント（VSCode、Neovimの`nvim-cmp`、Emacsの`lsp-mode`）は
すべて、ユーザーの入力プレフィックスに対して`CompletionItem[].label`の
ファジーフィルタリングを行う。サーバが厳密なプレフィックス一致で事前
フィルタすることもできるが、そうすると:

- `isIncomplete: true`フラグが強制され、クライアントがキーストロークごとに
  再取得することになる。
- ファジー／部分文字列マッチというエディタのイディオムと合わない。
- 大して節約にならない。サーバはすでにすべて列挙しており、N件のラベルの
  フィルタリングは安価である。

**決定**: v1はレシーバの候補集合をフィルタせずまるごと返す。
クライアントがUXに応じてフィルタする。サーバは可視性フィルタ
（`self`でないレシーバ上のprivateメソッド）を適用する。これは
UXの好みではなく正しさの境界だからである。

## 実装スライス

各スライスはコミット + specを個別に出荷する。合計8スライス —
hoverで4、completionで4。hoverスライスが先に着地する。理由は
小さく、かつcompletionが依存する同じ`Scope#type_of`パイプラインを
行使するからである。

### Hoverスライス

1. **`HoverRenderer`コラボレータ + case-on-nodeディスパッチの足場**。
   デフォルトボディはslice-5の出力とbit-for-bitで一致させる。
   特殊化を1つ着地させる（`Prism::CallNode` → レシーバ + シグネチャ）。
   specはデフォルトとcall分岐の両方をカバーする。
2. **定数のレンダリング**（`ConstantReadNode` / `ConstantPathNode`）。
   FQN + シングルトン型 + ソース位置。
3. **ローカル + インスタンス変数のレンダリング**
   （`LocalVariableReadNode` / `InstanceVariableReadNode`）。型 +
   bound-atの行。
4. **リテラルレンダリングの磨き上げ**（`IntegerNode` / `StringNode` /
   `ArrayNode` / `HashNode` / `SymbolNode`）。リテラル値 + キャリア +
   精製名の表出。

### Completionスライス

5. **`textDocument/completion`の登録 + `obj.|`に対するメソッド補完**
   （レシーバ型が既知の場合）。新しい`CompletionProvider`コラボレータ +
   `Server`への新しいディスパッチ行。capabilityを広告する。specは
   `"x = 'hi'; x.|"`というバッファで`String`のメソッドが返ることをカバーする。
6. **定数パス補完** `Foo::|`について。
   `Environment::Reflection#known_classes`を親FQNの子に絞り込んで列挙する。
7. **Union / Intersection / Refinedレシーバの扱い**。Unionには
   メソッドの積集合、Refinedには基底の名前的型、shapeキャリアには
   祖先の名前的型を用いる。
8. **パース回復 + レキシカルフォールバック**。Prismが回復できない
   バッファについて。ASTが欠落または不完全のとき、カーソル文脈の
   正規表現で`obj.` / `Foo::`の形状を照合する。

## 性能目標

| 操作 | 目標壁時計時間 | パス |
|---|---|---|
| Hover（slice 1-4） | < 100ms p95 | Scope#type_of + レンダラーディスパッチ。LSP v1のslice-5 hoverと同じホットパスに、よりリッチなmarkdown構築のための約10msを加えたもの。 |
| Completion `obj.|` | < 150ms p95 | バッファのパース + 特定 + Scope#type_of + メソッド列挙。メソッド列挙はクラス階層の深さでboundされる。典型的なRubyのクラスは継承込みで200メソッド未満である。 |
| Completion `Foo::|` | < 50ms p95 | 定数解決 + known-classesのプレフィックススキャン。既知クラス数でboundされる（DEFAULT_LIBRARIES + project sigで約1,400）。 |

これらはウォームキャッシュ、ProjectContextのウォームアップ後の状態を
仮定している（LSP v1 slice 7の領域）。コールドスタートのhoverは基底の
`Environment.for_project`コスト（約3秒）にboundされており、スライス
ローカルではない。

## v2のスコープ外

- **`textDocument/signatureHelp`** — completionの自然な補完であり、
  引数リスト内でのパラメータリストヒント。表面が独立しているためキューイング
  する。hover + completionはカーソル停止とトリガ文字のケースをカバーするが、
  signatureHelpは引数リスト内のケースをカバーし、それ自身のUX +
  パース回復の問題を持つ。
- **スニペット展開** — 例えば`def foo` → 複数行の`def foo`ボディ
  テンプレート。LSPは`CompletionItem.insertTextFormat = 2`（Snippet）で
  サポートする。UX駆動でキューイング。
- **ハッシュキー補完** `HashShape`キャリアについて。概念的にはRigorが
  出荷できる最も型駆動な補完だが、`hash[:|]`のパース回復はそれ自体が
  1スライスである。
- **裸の名前による補完**（ローカル + 暗黙のself上のメソッド）。
  Object上のすべてのメソッド + スコープ内のすべての定数を表に出すため、
  良いランキングのヒューリスティックなしではノイズ対シグナル比が悪い。
- **シンボル補完** — `:|`で既知のシンボルの自動補完を発火させる。
  シンボルが既知の集合（Hashキー／ActiveRecordスコープなど）から来る
  ときに有用だが、プラグインの関与を必要とする。
- **複数オーバーロードのシグネチャ表示** — RBSメソッドが複数の
  オーバーロードを持つとき、現状のhoverは最初のオーバーロードのみ
  表示する。複数オーバーロード表示はmarkdownテーブルのサブ問題である。
- **使用テレメトリによる補完ランキング** — 「ユーザーが`to_s`を最も
  頻繁に選ぶ」。今日テレメトリパイプラインはなく、キューイングする。

## オープンクエスチョン

- **Unionレシーバの補完**: メソッドの積集合は保守的だが、ユーザーを
  驚かせる可能性がある（「レシーバが`Integer | Float`のとき、なぜ
  `Integer#zero?`はリストにないのか？`Float`にも`zero?`があるからで —
  実際あるので、この例は機能する」）。保守的なデフォルトを選択し、
  UXフィードバックが反対であれば改訂する。
- **`completionItem/resolve`のラウンドトリップ** — 遅延か即時か？
  v1は即時（最初のリクエストで完全ペイロード）。`Object`系の補完集合が
  目立つようになれば再評価する。
- **hoverのメソッド定義ソース位置** — RBS宣言は .rbsファイルを参照する
  `location`を持つ。ユーザー向けhoverには、「`lib/foo.rb:12`で定義」の
  方が「`sig/foo.rbs:5`で定義」よりも有用である。.rbs宣言から .rb
  ソースを解決するにはプロジェクト側のマッピングテーブルが必要であり、
  スライス計画には入っていないがフォローアップとして記録に値する。
- **プラグイン側の補完コントリビューション** — プラグイン
  （例: `rigor-rails-routes`）は解析器が知り得ないメソッド名
  （`signed_id`、ヘルパーメソッド）をコントリビュートできる。プラグイン
  APIの拡張が必要で、具体的なプラグイン需要の後ろにキューイングする。
- **`textDocument/hover`の`range`フィールド** — hover対象ノードの
  ソース範囲を返し、エディタが単一文字のカーソル位置ではなく正確な式を
  ハイライトできるようにする。些細な拡張であり、安価であればslice 1で
  着地しうる。

## スライシングの根拠

スライス1-4（hover）がスライス5-8（completion）より先に出荷されるのは、
以下の理由による:

- Hoverスライスはより小さく、completionが依存する同じ`Scope#type_of` +
  ノード位置特定パイプラインを行使する。
- よりリッチなmarkdownレンダリング作業（メソッドシグネチャ、ソース位置、
  精製名の表出）は、hoverとcompletionの`CompletionItem.documentation`の
  間で再利用可能である。
- HoverのミスステップはLSPセッションを壊さないが、completionの
  ミスステップ（パース回復、壊れた構文上でのAST歩行）は壊しうる。

スライス5はcompletionのMVP（メソッド補完のみ）を着地させる。
6-8で定数パス、union / shapeレシーバ、パース回復へと拡張する。
各スライスは独立してリバート可能である。
