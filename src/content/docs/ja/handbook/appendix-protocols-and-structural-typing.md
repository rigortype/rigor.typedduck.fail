---
title: "付録: プロトコル、インターフェース、構造的型付け"
description: "rigortype/rigor docs/handbook/appendix-protocols-and-structural-typing.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/handbook/appendix-protocols-and-structural-typing.md"
sourcePath: "docs/handbook/appendix-protocols-and-structural-typing.md"
sourceSha: "654de754f1aecfbb67e0ce610d9cd6e21d4d0df8fd59db142631054a69c8ac61"
sourceCommit: "212f2c491920cc5c39a12d75aee385cb6c51fa0c"
translationStatus: "translated"
sidebar:
  order: 1050
---

Pythonから来た読者にとって、「protocol」は一つの特定の意味を持ちます。すなわち`typing.Protocol`、PEP 544の**構造的型付け**（structural typing）です。クラスは*適切なメソッドを持っていること*によってプロトコルを満たし、継承は不要です。これは「静的なダックタイピング（duck typing）」であり、Python型付けユーザーが真っ先に手を伸ばすものの一つです。

その直感は正しいのですが、Rigorではこの*言葉*が罠になります。Rigorの構造的型付け機能は「protocol」とは呼ばれません。それはRBSの**`interface`**です。一方で「protocol」という言葉はRigorにも*登場します*が、それは**別の**機能、すなわちフレームワークのパススコープな*振る舞い的契約*（[ADR-28](../../adr/28-path-scoped-protocol-contracts/)）を指します。この付録は、あなたが正しい方を選べるよう、この二つを解きほぐします。

> **一行版**。Rigorの`interface`は**構造的**です ── Goの`interface`やPythonの`Protocol`と同じです。クラスは*メソッドを持っていること*で適合します。**`implements`句はありません**（Rubyにはそもそも存在しません）。これはJava／PHPの名前的な`interface`、すなわちクラスが名前で適合を宣言するものとは*異なります*。素の「interface」という言葉は多くのRuby開発者にはJava／PHP流のものとして読まれてしまう（Rubyに`interface`キーワードがないため、直感が外部から持ち込まれる）ので、Rigorのドキュメントは初出時にそれを限定します ── **「構造的インターフェース」**または**「RBSインターフェース」**と ── あなたもそれについて書くときはそうすべきです。

## 「protocol」と呼ばれる二つのもの

| あなたが言いたいのは… | Rigorでの言葉 | それは何か | どこに存在するか |
| --- | --- | --- | --- |
| 「静的なダックタイピング」── クラスがメソッドを持っていれば適合する（Pythonの`Protocol`） | **interface** | 型束における構造的な*型*。 | RBSの`interface _Foo`、`sig/`から読み込まれる |
| 「`app/actions/`配下のすべてのアクションは`#handle`を定義しなければならない」── ツールによって強制されるフレームワークの規約 | **protocol contract** | ファイルパスによってクラスに束縛される*振る舞い的契約*。プラグインが宣言する。 | プラグインの`protocol_contracts:`マニフェストフィールド（ADR-28） |

この二つは異なる軸であり、一つのものの二つの味付けではありません。そしてこのページの残りの大部分は、この二つを区別し続けることについて述べます。一行で言える判別基準は次のとおりです。

- **interface**はシグネチャ内で名前を挙げる*型*です。検査は*インターフェースが言及される場所*で起こります（`def f: (_Closable)
  -> void`は`f`の引数を検査します）。
- **protocol contract**は*適合するクラスやどのシグネチャからも一切言及されません*。プラグインが「このディレクトリ配下のクラスはこの契約を担う」と述べ、エンジンが暗黙的にそれらを供給・検査します。

## 構造的型付け：RBSのインターフェース

これはPythonの`Protocol`の直接の対応物です。RBSは最初のリリースから構造的な`interface _Foo`を持っています。Rigorはそれらを`sig/`から読み込み、適合性を構造的に検査します。

```python
# Python (PEP 544)
class SupportsClose(Protocol):
    def close(self) -> None: ...
```

```ruby
# RBS — the same idea
interface _SupportsClose
  def close: () -> void
end
```

互換性のあるシグネチャで`close`を定義したクラスは、**`include`もスーパークラスも実行時マーカーもなしに**そのインターフェースを満たします。マッチは構造的です。規範的仕様（[`structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/)）より：

> RBSのインターフェース型…は*名前付きの構造的契約*である。名前的型（nominal type）またはオブジェクトシェイプは、必要なメンバーすべてを互換性のある型で提供することをRigorが証明できるとき、インターフェースに代入可能である。

Rigorはどこで構造的マッチングを適用するのでしょうか。意図的に**境界**で適用し、デフォルトではクラス対クラスでは適用しません。

- RBSインターフェースが期待される場所に値を代入または渡すとき。
- 推論されたオブジェクトシェイプがインターフェースを満たすかどうかを検査するとき。
- 既知のシェイプに対する直接のメソッド送信。
- プラグインが提供する動的リフレクションがシェイプにメンバーを追加するとき。

通常の`Foo`/`Bar`のクラス互換性は**名前的**なままです。Ruby自身の`is_a?`／`kind_of?`はクラス階層に依存し、RBSはクラス名をRubyの定数についての宣言として使うため、Rigorはクラスについて完全にTypeScript風の構造的型付けには*踏み込みません*。構造的型付けは、Pythonで`Protocol`に対して注釈を付けることでオプトインするのとまったく同じように、インターフェースの名前を挙げることでオプトインするツールです。（[mypy / Pyright付録](../appendix-mypy/#protocols--rbs-interfaces)が同じ対応をPython側から扱っています。）

## オブジェクトシェイプとケイパビリティロール

RBSインターフェースは*名前付き*の構造的型です。Rigorは値が実際に応答するものから**無名**の構造的型 ── *オブジェクトシェイプ（object shape）* ── も推論し、よくあるIO的な契約のための**ケイパビリティロール（capability role）**の厳選されたカタログを提供します。

- `_Reader`、`_Writer` ── ストリームの読み取り／書き込みの両半分。
- `_RewindableStream`、`_ClosableStream` ── `rewind`／`close`のケイパビリティ。
- `_Callable` ── `call`に応答する。

これらは`IO`と`StringIO`を別々の*名前的*型として保ちつつ、メソッドが実際に必要とするより小さな構造的*ロール*をそれぞれが満たせるようにします。これが構造的型付けの利点（具体的なクラスではなくケイパビリティに対して書く）であり、Rubyの実行時が依拠する名前的同一性を手放さずに済みます。

「Rigorのプロトコル」を探してここに来たのなら、**このセクションがそれです**。RBSインターフェース＋オブジェクトシェイプ＋ケイパビリティロールがRigorの構造的型付けのサーフェスです。そのいずれも「protocol」とは綴られていません。

## 言葉と意味論、言語をまたいで

なぜRigorは構造的型を`interface`と綴り、`protocol`を別のもののために取っておくのでしょうか。それは「protocol」という*言葉*と「構造的型付け」という*意味論*が言語をまたいで乖離してきたからであり、Rigorはruby読者を最も驚かせない綴りを選ぶからです（RBSはすでに`interface`と言っています）。

この用語自体は古いものです。**Smalltalk**（1970年代）は、オブジェクトが理解するメッセージの集合をその*protocol*と呼び、クラスブラウザでは「メッセージプロトコル」にまとめていました。それは静的検査の構成要素では決してなく、「このオブジェクトに何を送れるか」を名付けたもので、Rubyのダックタイピングの直接の祖先です。後続のすべての用法はこの核心的な考え ── 「適合するオブジェクトが提供するメソッドの集合」 ── を受け継ぎ、そのうえで*適合性がどのように確立されるか*についての独自の規則を追加します。

そうした規則のうち二つが重要であり、それらは綴りとは独立しています。

- **構造的／暗黙的** ── *メソッドを持っていること*によって適合する。宣言は不要。（Pythonの`Protocol`、Goの`interface`、**RBSの`interface`**、Smalltalkの本来の意味。）
- **名前的／明示的** ── *適合すると宣言すること*によって適合する。（Java／PHPの`interface ... implements`、Swift／Objective-Cの明示的な採用を伴う`protocol`。）

綴りは規則を**追跡しません**。この二つはずっと前に交差しました。

| 言語 | 綴り | 適合性 | Rigorと同じか？ |
| --- | --- | --- | --- |
| Smalltalk | "protocol" | （動的、ダックタイピング） | この考えの祖先 |
| **Rigor / RBS** | **`interface`** | **構造的／暗黙的** | — |
| Python (PEP 544) | `Protocol` | 構造的／暗黙的 | ✅ 同じモデル、異なる言葉 |
| Go | `interface` | 構造的／暗黙的 | ✅ 同じモデル、同じ言葉 |
| Java / PHP | `interface` | 名前的／明示的な`implements` | ❌ 同じ言葉、正反対のモデル |
| Swift / Objective-C | `protocol` | 名前的／明示的な採用 | ❌ 異なる言葉*かつ*異なるモデル |

つまり読者の直感は、その人がどこから来たかに完全に依存します。

- **Swift／Objective-Cから：**「protocol」は適合を*宣言する*型を意味します（`struct Resource: Closable`）。Rigorの`interface`はそのような宣言を必要とせず、ただ`close`を定義するだけです。（Objective-Cの`respondsToSelector:`と非形式プロトコルが実行時のダックタイピングの抜け道です。Swiftは拡張を通じた*遡及的*な適合を許しますが、採用は依然として明示的です。）そしてRigorで*言葉*を再利用する唯一のサーフェス ── 後述の**プロトコル契約**（protocol contract） ── もまた、Swiftのプロトコルではありません。それは採用句ではなくファイルパスによってクラスを束縛します。
- **Java／PHPから：**「interface」はクラスが名前で`implement`しなければならない契約を意味します。Rigorは*言葉*を再利用しますが規則は再利用しません。RubyのクラスはRBSの`interface`を構造的に満たすのであって、`implements`句によって満たすのでは決してありません（Rubyには`implements`句がありません）。
- **PythonまたはGoから：**あなたはすでにわが家にいます。RBSの`interface`はあなたの`Protocol`／`interface`です ── 構造的、暗黙的、名前が挙げられた場所で検査される。

そしてSmalltalkの意味 ── 「適合する型が提供しなければならない、名前付きのメッセージの集合」 ── こそ、Rigorが次のセクションで**プロトコル契約**の名のもとに復活させるものにほかなりません。ふさわしいことに、それがRigorが*実際に*「protocol」と綴る唯一のものです。

## プロトコル契約（ADR-28）

さて、もう一方の軸です。Rack型のWebフレームワークは、コントローラーアクションがリクエストを受け取りレスポンスを返すことを期待します。ジョブフレームワークは`#perform`を期待します。シリアライザは`#call`を期待します。この規約は実在しますが、それはフレームワークの説明文の中に住んでいます ── *それを記録するクラス宣言は存在せず*、それを検査するものも何もないため、違反は実行時の予期せぬ事態となります。

RBSインターフェースはこれを表現できません。RBSは（Pythonと同様に）**「このディレクトリ配下のすべてのクラスはインターフェースIを実装する」という形式**を**持ちません**。インターフェースはシグネチャがそれを名指す場所でしか効きませんが、これらのコントローラーは何も名指していません。その隙間こそ、ADR-28の**プロトコル契約**が埋めるものです。

フレームワークを知るプラグインは、そのマニフェストに契約を宣言します（`param_types`は位置引数ごとの`{ index:, type_name: }`供給の配列です）。

```ruby
# inside a framework plugin's manifest — an illustrative serializer contract
protocol_contracts: [
  Rigor::Plugin::ProtocolContract.new(
    path_glob:        "app/serializers/**/*.rb", # which files
    method_name:      :call,                      # the method every class must define
    param_types:      [{ index: 0, type_name: "ActiveRecord::Base" }],
    return_type_name: "String",
    severity:         :error
  )
]
```

するとエンジンは**供給と検査（provide-and-check）**を行います。

- **供給（provide、エンジン側）**。マッチするファイル内の`def call(record)`を束縛するとき、契約の`param_types`が、注釈のない引数が通常受け取るはずの`Dynamic[top]`を*置き換えます*。本体はその後、`record`がその実際の型を担うかのように解析されます。つまり本体内の誤用（`record.no_such_column`）は通常の`call.undefined-method`として顕在化し、推論される戻り値型は精密になります。
- **検査（check、プラグイン側）**。プラグインは、マッチするファイル内のすべてのクラスがそのメソッドを定義していること（さもなくば`missing-protocol-method`）、およびその推論される戻り値型が`return_type_name`に適合すること（さもなくば`protocol-return-mismatch`）を確認します。

供給の側こそが要を担います。それがなければ`request`は`Dynamic[top]`になり、これはあらゆるメソッドに応答するため、それから組み立てられるどんな戻り値もまた`Dynamic[top]`となり、戻り値の検査は空虚になります。

（プラグイン作者ではなく）*アプリケーション*開発者として注意すべきことが二つあります。

- あなたは`protocol_contracts:`を**決して書きません** ── フレームワークのプラグインが書きます。あなたはただの`def handle(request)`を書けば、それが無償で検査されます。
- `missing-protocol-method`／`protocol-return-mismatch`の診断は**プラグイン診断**であり、プラグインの`plugin.<id>.`という由来のもとで発行されます ── コアのRigorルールではありません。実例の参照先は[`examples/rigor-web/`](https://github.com/rigortype/rigor/tree/master/examples/rigor-web/)（最小限のチュートリアル）と[`plugins/rigor-hanami/`](../../manual/plugins/rigor-hanami/)（本番のHanami 2のアクション）です。

## インターフェース対プロトコル契約

| | RBSの`interface`（構造的型） | ADR-28のプロトコル契約 |
| --- | --- | --- |
| **それは何か** | 型束の中の型 | ツールによって強制される規約。型では*ない* |
| **言語をまたいだ対応物** | Pythonの`Protocol`、Goの`interface` | Smalltalkの「必要なメッセージ集合」の意味 ── ただし**ファイルパス**によって束縛される。これは主流の`protocol`／`interface`のいずれも持たない仕組み |
| **クラスがどうオプトインするか** | 構造的に ── ただメソッドを持てばよい | 暗黙的に ── パスglobの配下に定義されればよい |
| **どこで参照されるか** | シグネチャ内で名指される（`(_Closable) -> void`） | *どこでも*名指されない。ファイルパスによって束縛される |
| **検査がどこで発火するか** | インターフェースを名指す使用箇所で | 契約された`def`で（供給）＋クラスごとに（検査） |
| **誰が宣言するか** | `.rbs`を書く者 | フレームワークプラグインのマニフェスト |
| **引数型を供給するか？** | しない（型であり、名指された場所で使われる） | **する** ── 注釈のない`def`へ |
| **診断** | 使用箇所でのコア型エラー | `missing-protocol-method`、`protocol-return-mismatch`（プラグイン） |

この命名の重複は歴史的なものです（上記の[言語をまたいだ寄り道](#言葉と意味論言語をまたいで)を参照）。Smalltalkの「必要なメッセージの集合」の意味は*プロトコル契約*の中に生き残り、一方でPythonの`typing.Protocol`は、Ruby／RBSが`interface`と綴る*構造的型*の考えのためにこの言葉を再利用しました。よってRigorでは、「protocol」が構造的型を意味することは決してありません。

## 自分が欲しいのはどちら？

- **`#close`を持つものなら何でも受け取るメソッドを書きたい** → それは構造的型です。RBSの**`interface _Closable`**を宣言してそれに対して注釈を付けます（または無名の場合は推論されるオブジェクトシェイプに頼ります）。[第7章 ── RBSとRBS::Extended](../07-rbs-and-extended/)を参照。
- **あるディレクトリ内のすべてのクラスが、与えられた引数／戻り値型を持つフレームワークのメソッドを実装することを強制したい** → それは**プロトコル契約**であり、*プラグイン作成*の機能です。[ADR-28](../../adr/28-path-scoped-protocol-contracts/)と[`examples/`](https://github.com/rigortype/rigor/blob/master/examples/README.md)のウォークスルーを参照。
- あなたがそのようなフレームワークを使う**アプリケーション開発者**である → あなたはどちらも明示的には行いません。慣用的なRubyを書けば、フレームワークのプラグインが契約を供給し、Rigorがそれに照らしてあなたのアクションを検査します。`missing-protocol-method`を見たら、それはフレームワークが要求するメソッドを忘れたということです。`protocol-return-mismatch`を見たら、それはあなたのアクションが間違ったシェイプを返しているということです。

## 次に読むもの

- [第7章 ── RBSとRBS::Extended](../07-rbs-and-extended/) ── インターフェースが住む`.rbs`の書き方。
- [第9章 ── プラグイン](../09-plugins/)と[examples/のランディングページ](https://github.com/rigortype/rigor/blob/master/examples/README.md) ── プロトコル契約が作成される場所。
- [`docs/type-specification/structural-interfaces-and-object-shapes.md`](../../type-specification/structural-interfaces-and-object-shapes/) ── インターフェース、オブジェクトシェイプ、ケイパビリティロールの規範的仕様。
- [ADR-28](../../adr/28-path-scoped-protocol-contracts/) ── プロトコル契約の設計判断と、却下された代替案（ディレクトリによって束縛されるRBSインターフェースが*なぜ*その道ではなかったかを含む）。
- 別のチェッカーから来た？[mypy / Pyright付録](../appendix-mypy/#protocols--rbs-interfaces)が`Protocol`↔RBSの`interface`をPython側から対応づけ、[型理論付録](../appendix-type-theory/)が名前的型付け対構造的型付けをより広い見取り図の中に位置づけます。
