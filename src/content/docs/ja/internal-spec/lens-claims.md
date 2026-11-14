---
title: "`rigor lens --claims`: ドキュメント主張チェック、リビジョン1"
description: "rigortype/rigor docs/internal-spec/lens-claims.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/internal-spec/lens-claims.md"
sourcePath: "docs/internal-spec/lens-claims.md"
sourceSha: "e03cccafa15a2030aafe23823dcedd7a19db4ad46ee55db306321e328ad14b17"
sourceCommit: "2d66acadc4b2f6a7bd12f4b731d28b396c355af8"
sourceDate: "2026-11-06T19:16:05+09:00"
translationStatus: "translated"
sidebar:
  order: 3050
---

ステータス: **実装済み、未リリース**。これは`rigor lens --claims`が計算および出力する内容を規定する拘束力のある記述です。理由は[ADR-113](../../adr/113-rigor-lens/) §「Amendment 2026-11-04」に記録されており、その境界は最初のコンシューマーであるZARDと[#2737](https://github.com/rigortype/rigor/issues/2737)で合意されました。これを搭載したRigorリリースはまだありません。ZARDは、このケイパビリティを広告し下記の適合性フィクスチャを通過するリリース済みプロデューサーに対してのみ、主張不一致の診断を有効にします。周囲のドキュメント、そのcontext、対象、および終了ステータスは[`lens.md`](../lens/)のものと同一です;このファイルはそこに1つのセクションを追加するものであり、そちらの仕様は何も変更しません。

キーワードMUST、MUST NOT、SHOULD、およびMAYは[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)と同様に解釈されます。

## 主張（claim）とは何か

**ドキュメント主張（documentation claim）**とは、APIドキュメントタグに書かれた型（`@param text [String]`、`@return [Integer]`）のことです。これはAPIに関する任意の表明であり、契約ではありません: 契約とはメンバーの著者記述によるシグネチャ（`sig/`またはインラインの`@rbs` / `#:`）です。主張チェックは、その契約がドキュメント化された約束を裏付けているかどうかを問います。

主張がRigorの解析に入ることは決してありません。主張はシグネチャになったり、推論された型をリファインまたは拡大したり、診断を変えたり、インクリメンタルスナップショットやいかなるキャッシュにも到達したりしてはなりません（MUST NOT）。`--claims`付きで生成されたlensドキュメントの`claims`以外のすべてのフィールドは、それなしで同じ対象に対して生成されたものと等しくなければなりません（MUST）。

## 呼び出し

```text
rigor lens --format json --claims REQUEST [--config FILE] [--workers N] FILE...
```

- `REQUEST`は作業ディレクトリに対して解決されるリクエストファイル（§ Request）へのパスです。リクエストはlensドキュメントを生成する同じ実行の中でチェックされるため、ドキュメントビルドがエンジンを呼び出すコストは1回で済みます。
- `--claims`には`--format json`が必要です; textフォーマットでは使用法エラーになります。
- lensの`capabilities`リストに`claims`が加わります。ドキュメントにはトップレベルの`claims`フィールド（§ Response）が加わり、`--claims`が渡されなかった場合は`null`になります。`capabilities`に`claims`を欠くプロデューサーは主張をチェックできません。
- 終了ステータスは`lens.md`と同じですが、終了コード64に1つ追加があります: 記述通りにRigorが回答できないリクエスト（§ Integrity errors）ではドキュメントを書き出しません。Rigorが`unknown`または`unavailable`と回答する主張が終了ステータスを変えることはなく、`conflict`も同様です: 何をもってビルドを失敗させるかはコンシューマーが決定します。

## リクエスト

リクエストファイルはUTF-8 JSONです:

```json
{
  "schema": "lens-claims-request/v0",
  "revision": 1,
  "grammar": "rbs",
  "files": [{ "path": "lib/widget.rb", "digest": "xxh3-64:0123456789abcdef" }],
  "claims": [
    {
      "id": "widget-result:tag-0",
      "file": "lib/widget.rb",
      "declaration": {
        "kind": "method", "owner": "Widget", "scope": "instance", "name": "result",
        "span": { "start_offset": 80, "end_offset": 110 }
      },
      "tag": { "name": "return", "subject": null, "span": { "start_offset": 40, "end_offset": 79 } },
      "claim": "String"
    }
  ]
}
```

オフセットとダイジェストは例示です。

- `grammar`は`claim`テキストの解釈方法を指定します。リビジョン1は`rbs`のみをサポートします（§ Grammar）。
- `files`は主張が参照する各ファイルを1回ずつ列挙し、コンシューマーが読み取った正確なバイト列のダイジェストを`lens.md`のファイル`digest`と同じ綴りと計算方法で含めます。各`path`はルート相対であり、呼び出しの`FILE`対象のいずれかを名指さなければなりません（MUST）: 作業ディレクトリに対して解決されたいずれかの`FILE`引数が、ファイルが存在するかどうかに関わらずそのパスである必要があります。複数の引数が名指すパスはその最初のものを参照します;後続のものはlensドキュメント内で`duplicate`となり、主張には回答しません。
- `claims`はチェックする主張を列挙します。`id`はリクエスト内で一意な呼び出し元の不透明な識別子です; Rigorはそれをそのまま返し、意味を割り当てません。
- `declaration`はコンシューマー自身のファイルパースから、主張がドキュメント化している宣言を特定します;事前のlens実行は不要です。`span`は`lens.md` § Sitesがサイトの`span`として与える宣言のバイトスパン（Prismの`def`ノード、0始まり、終端排他的）です。`kind`、`owner`、`scope`、および`name`はそのサイトのフィールドと同じ綴りです。
- `tag`はドキュメントタグです: `name`（リビジョン1では`param`または`return`;その他の名前は受け付けられ`unknown`と回答される）、`subject`（`@param`タグが与えるパラメータ名、または`null`）、および同じファイル内でのタグのバイト`span`。Rigorはタグスパンがファイル内に収まっているかをチェックします。コンシューマーがタグを正しい宣言に紐付けたかどうかはチェックしません: その紐付けはコンシューマーの責務であり、コンシューマーは結果を紐付ける際に再チェックします。
- `claim`は角括弧を除いたタグの型テキストです。

### 宣言の解決

対象のlens `status`が`ok`でない主張は解決されません: `unavailable`になります（§ Verdicts）。そうでなければ、その`declaration`は対象のlensサイトに対して解決され、隣接するサイトに対して解決されることは決してありません:

1. その`span`が`method`種類のちょうど1つのサイトの`span`と等しく、かつリクエストが名指すメンバー`(owner, scope, name)`がそのサイトをリストしている場合（`lens.md` § Members、`sites`）、主張はそのサイトとそのメンバーにバインドされます。モジュール関数のサイトはいずれのスコープでもそれぞれ自身のメンバーにバインドされます。
2. その`span`があるサイトの`span`と等しいがステップ1でバインドされない場合、主張は`unknown`になります: サイトが`method`サイトでない場合（ドキュメントツールがメソッドとしてモデル化しうる`attribute`、または`class`・`module`・`constant`）、あるいは複数のサイトがスパンを共有している場合（`attr_reader :a, :b`）は`unsupported_declaration`;リクエストが名指すメンバーがそれをリストしていない場合は`declaration_mismatch`になります。
3. その`span`が省略（`lens.md` § Omissions）の`span`と等しい場合、主張は`unsupported_declaration`を伴う`unknown`になります: 宣言は存在しますが、リビジョン1がそれをモデル化していません。
4. それ以外の場合、主張は`no_such_declaration`を伴う`unknown`になります。ファイルのダイジェストはすでに一致しているため、コンシューマーとRigorは同じバイト列を読み取っています; Rigorが宣言を持たないスパンは、古いリクエストではなくコンシューマーがモデル化しRigorがモデル化していない宣言（たとえばDSL呼び出しに付随するドキュメントディレクティブ）です。

結果はバインドされたサイトをそのlens `key`で名指すため、コンシューマーは同じ実行のlensドキュメントにそれを結合できます。サイトキーは実行をまたいで安定ではなく、保存してはなりません（MUST NOT）。

### 整合性エラー

主張ごとの回答が信用できないため、次の各ケースはドキュメントなしの終了コード64になります:

- リクエストファイルが読み取れない、UTF-8 JSONではない、またはリビジョン1が要求するフィールドを欠いている;
- サポートされない`schema`、`revision`、または`grammar`;
- 重複した`id`、重複した`files`パス、または`file`が`files`に含まれない主張;
- 呼び出しのターゲットのいずれでもない`files`パス;
- Rigorが読み取れるファイルについて、ターゲットが最終的にどのステータスになるかに関わらず、ファイルのバイト列のダイジェストと異なる`files`ダイジェスト（読み取れるファイルがないターゲット`not_found`は`unavailable`と回答する）;
- そのようなファイルについて、ファイル外の`declaration`または`tag`スパン。

Rigorは解析開始前にリクエストを検証し、各ダイジェストをディスク上のファイルと比較するため、不正または古いリクエストで実行コストがかかることはありません。実行中にファイルが変化した場合も、解析が読み取ったバイト列とダイジェストが食い違うため同じエラーになります。リビジョン1が定義しないフィールドは無視されます。有効なリクエスト内部の主張ごとの問題は整合性エラーではなく結果になります（§ Verdicts）。

## レスポンス

lensドキュメントはその`claims`フィールドとして回答を保持します:

```json
{
  "schema": "lens-claims/v0",
  "revision": 1,
  "request_digest": "xxh3-64:fedcba9876543210",
  "grammar": "rbs",
  "capabilities": ["return", "required_param", "required_keyword"],
  "results": [
    {
      "id": "widget-result:tag-0",
      "verdict": "conflict",
      "reason": "proven_disjoint_arm",
      "relation": "documentation_coverage",
      "direction": "contract_within_claim",
      "site": "lib/widget.rb:80-110:0",
      "member": { "owner": "Widget", "scope": "instance", "name": "result" },
      "slot": { "kind": "return" },
      "contract": { "type": "::Integer", "provenance": "sig", "path": "sig/widget.rbs" },
      "evidence": [{ "rule": "unrelated_classes", "arm": "::Integer", "against": "::String" }]
    }
  ]
}
```

- `schema`と`revision`はリクエストとこのセクションを`lens/v0`から独立してともにバージョニングします。どちらへの破壊的変更も`revision`をバンプします。
- `request_digest`はリクエストファイルの正確なバイト列のxxh3-64です。コンシューマーはいかなる判定も受け入れる前に、自身が書き出したリクエストとそれを比較しなければなりません（MUST）。
- `capabilities`はこのリビジョンがチェックする主張サブジェクトを列挙します: `return`（`@return`）、`required_param`（必須位置`@param`）、および`required_keyword`（必須キーワード`@param`）。ここに欠けているサブジェクトは決して`compatible`ではなく`unknown`と回答されます。
- `results`はリクエストされた主張ごとにちょうど1つの結果をリクエスト順で保持し、`id`をそのまま返します。

### Resultフィールド

| フィールド | 内容 |
| --- | --- |
| `id` | リクエストの`id`。 |
| `verdict` | § Verdicts。 |
| `reason` | 判定の理由コード（§ Verdicts）。決して`null`にはなりません。 |
| `relation` | スロットが解決された場合は`documentation_coverage`、それ以外は`null`。 |
| `direction` | パラメータでは`claim_within_contract`、戻り値では`contract_within_claim`、スロットが解決されなかった場合は`null`。 |
| `site` | バインドされたサイトのlens `key`、または宣言がバインドされなかった場合は`null`。 |
| `member` | 契約が読み取られたメンバーの`{owner, scope, name}`、または`null`。 |
| `slot` | `{kind: "return"}`、または`lens.md`のパラメータ`kind`語彙と契約オーバーロードの`params`内の0始まりインデックスを持つ`{kind: "param", name, param_kind, index}`;スロットが解決されなかった場合は`null`。 |
| `contract` | 読み取られた契約スロット: `typed`なlensスロットと同様に綴られた`{type, provenance, path}`;何も読み取られなかった場合は`null`。 |
| `evidence` | `[{rule, arm, against}]`、`compatible`または`conflict`を決定した`S`のアーム（§ Relation）で、それぞれそれを含めた`P`のアームまたはそれと互いに素である`P`のすべてを伴います（`compatible`ではアームごとに1エントリー、`conflict`では決定したアーム）;それ以外は`[]`。型は表示テキストです: 判定を説明するものであり、契約ではありません（ADR-50 § Decision 3）。コンシューマーはそれらから判定を再導出してはなりません（MUST NOT）。 |

## Verdicts

| `verdict` | 意味 | `reason` |
| --- | --- | --- |
| `compatible` | Rigorが要求される包含を証明した。 | `proven_inclusion` |
| `conflict` | Rigorが要求される包含が偽であることを証明した。 | `proven_disjoint_arm` |
| `unknown` | 対象は解析されたが、Rigorはどちらも証明しなかった。 | 以下のコードのいずれか。 |
| `invalid_claim` | 主張テキストが`grammar`（§ Grammar）の下で型ではない。 | `syntax_error` |
| `unavailable` | 主張の対象に解析がない: そのlens `status`が`ok`ではない。セマンティックな回答は与えられない。 | 対象の`status`（`not_found`、`not_ruby`、`outside_project`、`parse_error`、`failed`）。 |

`unknown`の理由:

| `reason` | 条件 |
| --- | --- |
| `no_such_declaration` | 解析されたファイルのどのサイトまたは省略も宣言のスパンを持たない。 |
| `unsupported_declaration` | 宣言が省略である、`method`サイトではない、または他のサイトとスパンを共有している。 |
| `declaration_mismatch` | 宣言のスパンを持つサイトはあるが、リクエストが名指すメンバーがそれをリストしていない。 |
| `unsupported_subject` | タグが`@param`でも`@return`でもない、または`@param`に`subject`がない。 |
| `no_authored_contract` | スロットに`sig`または`inline`の契約がない: メンバーの`basis`が`contract`でない、スロットが推論された（`inferred-return`メンバーの戻り値）、またはスロットが`unavailable`になっている。 |
| `unsupported_contract_source` | 契約スロットのプロバナンスが`library`または`plugin:<id>`である。 |
| `extrbs_contract` | サイトが`@extrbs`契約コメントを持っている。Rigorはまだ`@extrbs`を読み取らないため（[#1073](https://github.com/rigortype/rigor/issues/1073)）、保持している契約が著者記述のものの消去型である可能性がある。 |
| `refined_contract` | 契約スロットが著者記述の`%a{rigor:v1:…}`リファインメントを持っている。その消去型は契約より広いためパラメータについて何も証明しない;リビジョン1は消去型を通じたいずれの方向も読み取らない。 |
| `unsupported_overloads` | 契約が複数のオーバーロード、または転送パラメータリスト（`params`が`null`）を持っている。 |
| `no_such_parameter` | サイトのどのパラメータも`subject`という名前を持たない。 |
| `unsupported_parameter_kind` | 名指されたパラメータが必須位置引数でも必須キーワード引数でもない。 |
| `unmatched_parameter` | サイトの位置パラメータ種類と契約オーバーロードのものが揃わない、または契約が名指されたキーワードを必須として宣言していない（§ Subjects）。 |
| `unsupported_grammar_feature` | 主張が素のRBS型ではなくRigor拡張型（`non-empty-string`）である。 |
| `unresolved_name` | 主張内の型名が解決しない。 |
| `ambiguous_name` | 主張内の相対型名がRigorに見えないクラスを名指す可能性があり（§ Grammar、名前解決）、主張を比較できない。 |
| `dynamic_type` | 主張または契約スロットのどこかに`untyped`が含まれている。 |
| `unsupported_type` | 主張または契約スロットに§ Relationが推論しない形式が含まれている。 |
| `unproven` | すべての入力がサポートされていたが、包含もその反証も証明されなかった。 |

`status`が`ok`の対象内の主張については、まず`invalid_claim`が決定され、すべての`unknown`理由に優先します。次に`unknown`理由が列挙された順にチェックされ、該当する最初のものが報告されます。それらのいずれも該当しない場合にのみ関係が計算され、`compatible`、`conflict`、または最後に`unproven`が返されます: どこかに`untyped`を含む主張は、すべてのアームが等しく比較される場合であっても`dynamic_type`になります。後のリビジョンは理由コードを追加してもよい（MAY）;コンシューマーは認識できないコードをそれ以上の意味を持たない`unknown`として扱わなければなりません（MUST）。

## Grammar

`rbs`はロードされた`rbs` gemが型をパースするように（`context.rbs_version`がそれを名指します）、`claim`を1つのRBS型式として読み取ります。

- RBSパーサが拒否するもののRigorのリファインメント文法が受け入れるテキスト（`%a{rigor:v1:…}`ペイロードの型名とパラメータ化形式）は、`unsupported_grammar_feature`を伴う`unknown`になります。両方が拒否するテキストのみが`invalid_claim`です。パースは通るが不正な形式の型（未知の名前、型引数の個数誤り）はリビジョン1では`invalid_claim`になりません。
- 型エイリアスは展開されます;ジェネリックエイリアスは`unsupported_type`です。型変数はスコープ内にありません: それを名指す主張は解決に失敗します。

**名前解決**。絶対名（`::String`）は記述通りに読まれます。相対名は2通りに解決され、両方の答えが同じクラスまたはモジュールを名指さなければ主張は`unknown`になります:

- RBSでは、バインドされた宣言上のインライン`@rbs`アノテーションがそれを解決するのと同様に解決します（解決しない場合は`unresolved_name`）;
- Rubyでは、実行のシード済みプロジェクトインデックス上で、宣言の本体からのRubyの定数探索に従います: ソースファイルからの宣言のレキシカルネスト（最も内側が先、トップレベルは除外）、次に最も内側のクラスまたはモジュールの祖先、それがモジュールである場合は`Object`。インデックスは設定の`paths:`をルートとしているため（`lens.md` § 計算）、答えはどのファイルがリクエストされたかに依存しません。インデックスがそのパス上に記録しているどの定数もその名前を持たない場合、Rubyの答えはRBSの答えになります: インデックスはプロジェクトのRubyのみを保持し、コア・stdlib・gemのクラスはRBSを通じて知られるためです。インデックスがRBSの答えの名指さないプロジェクト定数を見つけた場合、主張は`ambiguous_name`になります: Rubyのみの`App::Data < Hash`はコアの`::Data`ではありません。その祖先パス上のクラスがインデックスの名指せないスーパークラスを持つ場合（`K = Class.new(Base)`、`class K < pick_base`、`class K < SomeConstantAlias`、またはビルダークラスの`Struct`/`Data`親）、あるいはRBSが宣言していない祖先を持つ場合、それが保持する定数はパス上にないため相対クラス名は`ambiguous_name`になります。

相対的な型エイリアス名にはRubyの読み取りがありません。これは主張のレキシカルコンテキストとバインドされたメンバーのオーナーの名前空間の両方で解決され、両者が同じエイリアスを名指さなければ主張は`ambiguous_name`になります。そこから展開されたアームは`conflict`において相対名として扱われます（後述）。

`Struct.new`または`Data.define`のブロック内に書かれたメソッドはその新しいクラスに属しますが、そのレキシカルネストはブロックを書いたスコープです: Rubyは新しいクラスを`Module.nesting`に追加することなくブロックを`class_eval`するため、そこでの相対名は両方の答えにおいてその囲むスコープで読まれ、ビルダークラス内では決して読まれません（型エイリアス名は引き続き上記のビルダークラスの名前空間に対してクロスチェックされます）。エイリアスはエイリアス文のネストではなく、エイリアスチェーンや再オープンを通じた元のメソッド本体のレキシカルコンテキストを使用します。その本体を特定できない場合、相対クラス名と相対エイリアス名は`ambiguous_name`になります。リビジョン1は`class << self`内で定義されたメソッドの相対クラス名と相対エイリアス名も辞退します: その無名特異クラスのレキシカルコンテキストは通常の名前付き名前空間としてモデル化されていません。これは通常のクラス本体内の`def self.method`には適用されません。どちらのケースでも絶対名は引き続きチェック可能です。

一致は`compatible`には十分です。`conflict`には十分ではありません。なぜならインデックスは名前空間が保持しうるすべての定数を見ているわけではないためです: `paths:`外または`exclude:`に一致するファイル、プロジェクト名前空間を再オープンするRBSなしのgem、計算された名前での`const_set`、`class_eval`文字列などです。`rbs.contradicting-signature`はその理由から相対名を全面的に拒否します（`Comparator#provable_names?`）。したがって相対名が`conflict`（§ Relation、非包含）に寄与するのはトップレベル宣言（任意のクラスまたはモジュール本体の外にある`def`、オーナー`Object`）においてのみです。そこではレキシカルネストが空であり、Rubyは`Object`がincludeするどのモジュールよりも先に`Object`自身の定数テーブルで名前を見つけるため、プロジェクトやgemがコア名をシャドウできるのはコア定数自体を再代入する場合のみになります。再オープンされたコアクラスでさえ適格ではありません: `paths:`外のファイルやRBSなしのgemは`class Integer`にネストされた`Integer::Data`を与えることができ、Rubyは`::Data`より先にそれを見つけます。他の場所では、相対アームは`compatible`を証明できても決して`conflict`を証明できず、conflictには絶対表記（`::Integer`）が必要です。

同じ死角が`compatible`の限界も定めます: 2つの探索間の一致は、Rigorが見ることのできるクラスに対する包含を証明します。未読のファイルのみが定義する定数へRubyが解決する相対名は、RBSが名指すクラスに対して`compatible`と判定されることがあります。これは見逃し（missed finding）であり診断ではありませんが、コンシューマーは相対名の`compatible`を実行中のプログラムに対する証明として提示してはなりません（MUST NOT）。

## Relation

`C`を主張の型、`F`を契約スロットの型とします。`documentation_coverage`は次を要求します:

- パラメータでは`C ⊆ F`: ドキュメントが広告するすべての入力を契約が受け入れる;
- 戻り値では`F ⊆ C`: 契約が許容するすべての結果がドキュメント化された約束を満たす。

要求される包含を`S ⊆ P`と書きます: `S`はパラメータなら`C`、戻り値なら`F`であり、`P`はもう一方です。より狭く広告されたパラメータとより広くドキュメント化された戻り値は互換です。ドキュメントが契約の全体を記述しているかどうかはチェックされません。

### アーム

両方の型は**アーム（arms）**のユニオンとして読まれます。`T?`は`T | nil`、`bool`は`true | false`です。アームは次のいずれかです:

- **リテラル**: 文字列・シンボル・整数リテラル、`true`、`false`、または`nil`であり、そのクラスはそのRubyクラスです（`nil`は`NilClass`）。型引数のないクラス`TrueClass`、`FalseClass`、および`NilClass`はコンパレータが読むようにそれぞれが保持する1つのリテラルとして読まれます;
- **クラスインスタンス**: 型引数の有無を問わないクラス名またはモジュール名。

どちらかの型のどこかに他の任意の形式（`top`、`bot`、`void`、`self`、`instance`、`class`、`singleton(…)`、インターフェイス、タプル、レコード、proc型、交差型、型変数）があると、主張は`dynamic_type`の後にチェックされる`unsupported_type`を伴う`unknown`になります。

### 包含: `compatible`

`S`のアーム`s`が`P`に**含まれる（included）**のは、`P`のあるアーム`p`が次のいずれかを満たすときです:

- 名前解決とエイリアス展開の後で型引数を含めて`s`と等しく、ユニオンはそのアームの集合として比較される（`Array[String | Integer]`は`Array[Integer | String]`と等しい）（`equal`）;
- 型引数のないクラスインスタンスであって、そのクラスがリテラル`s`のクラスのRBS祖先である（`literal_class_ancestor`）;または
- 非ジェネリッククラスまたはモジュールの型引数のないクラスインスタンスであって、クラスインスタンス`s`のRBS祖先である（`class_ancestor`）。`s`は型引数を伴ってもよい。

祖先関係はプロジェクト宣言を含むRBS環境のものです: 著者記述の契約が権威を持つため、その中の`class B < A`は`B ⊆ A`を証明します。RBSの祖先関係がRubyのものと食い違うことが知られているクラス（`MemberConsistency::RbsProof::UNRELIABLE_ANCESTRY`: rbsでは`Tempfile < File`、Rubyでは`Tempfile < Delegator`）は、どちらの側でもその祖先を通じた包含を証明しません。`S`のすべてのアームが含まれるとき、判定は`compatible`になります。

### 非包含: `conflict`

`S`のアーム`s`が`P`と**互いに素（disjoint）**であるのは、`rbs.contradicting-signature`のルール（`Environment::MemberConsistency::Comparator#disjoint?`）により`P`のいずれのアーム`p`とも値を共有しないときです:

- 2つの異なるリテラル（`distinct_literals`）;
- クラスがRBS祖先`p`を持たないリテラル（`literal_outside_class`）;
- どちらのクラスも他方のRBS祖先ではない2つのクラスインスタンス（`unrelated_classes`）。

クラスがカウントされるのは、RigorがそのRBS祖先関係を信頼するRubyコアまたはstdlibの**クラス**（モジュールは不可）であり、`MemberConsistency::RbsProof#class_ancestors`がそれを回答し、かつ主張がそれを相対的に書いた場合に§ Grammarのガードを通過するときだけです。プロジェクトクラス、gemクラス、またはモジュールは決して互いに素であることを証明しません（別の場所での再オープンや`include`が共有するものを変えうるため）。ここでは型引数は無視されます: インスタンスを共有しないクラスはいかなる引数でもインスタンスを共有しません。このフラグメントのすべてのアームは値を持つため、`S`の互いに素なアームは`P`の外にある値です。`S`のあるアームが`P`と互いに素であり、かつ`compatible`が成り立たないとき、判定は`conflict`になります。

重複（overlap）だけではどちらも証明しません: `"hello"`としてドキュメント化された`String`戻り値は`unproven`であり、`Project::B | Project::C`としてドキュメント化された`Project::A | Project::B`も同様です。

## サブジェクト

- **戻り値**。契約オーバーロードの`return`スロット。
- **必須位置パラメータ**。バインドされたサイト自身のパラメータリスト（`lens.md` § Sites、`params`）が位置パラメータ（`required`、`optional`、`rest`、`post`）の中で`subject`という名前のパラメータのインデックスを与えます;それは`required`でなければなりません（MUST）。同じインデックスにある契約オーバーロードの位置パラメータは、2つの位置リストが同じ長さを持ちすべての位置で同じ`kind`を持つ場合にのみ読み取られます;それ以外は`unmatched_parameter`です。ここではキーワードは比較されません: 契約はソース順に関わらず必須キーワードを任意キーワードの前に列挙します。契約のパラメータ名は参照されません: RBSが位置パラメータに名前を付けるのはドキュメント目的のみです。
- **必須キーワードパラメータ**。サイトが`subject`という名前の`keyreq`を宣言しており、契約オーバーロードのその名前の`keyreq`が読み取られます;契約がそのキーワードを任意として宣言しているかまったく宣言していない場合、主張は`unmatched_parameter`になります。

契約は、`sig/`とインライン宣言に対するRigor自身のマージ後のメンバーのものです（`check`が読み取るものであり、`lens.md` § Membersが報告します）。これはメンバーの`basis`が`contract`であり、かつオーバーロードをちょうど1つ持つ場合にのみ読み取られます。

## 適合性フィクスチャ

リリースが`claims`を広告する前に、プロデューサーのspecスイートは隔離されたプロジェクト上で実際のCLIを実行し、各リクエスト、ソースおよびシグネチャファイル、期待ドキュメント、stderr、および終了ステータスをリポジトリにチェックインしなければならず（MUST）、それによりZARDのアダプタがそれらをピン留めできるようにします。フィクスチャは次をカバーします:

- 双方向の`compatible`と`conflict`、これには#2737の表の5行を含む（その`Formatter`はプロジェクトクラスであるため、そのconflict行は`::Integer`と綴ったものが`conflict`、`Integer`と綴ったものが`unproven`になる）;
- 異なる綴りの等しい型（相対名、絶対名、型エイリアス）;
- より狭いパラメータ主張とより広い戻り値主張（`compatible`）、および重複のみ（`unproven`）;
- 宣言された祖先関係を通じたプロジェクトクラスの包含（`compatible`）、および順位付けできないプロジェクトクラス（`unproven`、決して`conflict`ではない）;
- Rubyのみでプロジェクト名前空間がシャドウする相対名（RBSなしで`App::Data < Hash`を定義する`module App`内の`Data`、`ambiguous_name`）; `paths:`外のファイルでの同じシャドウ（`unproven`、決して`conflict`ではない）;プロジェクトクラス内および再オープンされたコアクラス内の相対コア名（絶対表記が`conflict`になる箇所でそれぞれ`unproven`になる）;およびトップレベル`def`内の相対コア名（`conflict`になる）;
- `equal`と判定されるRBS付き相対gem名（`Faraday::Response`）;
- 別の識別子の下でサイトに一致するスパン（`declaration_mismatch`）、属性サイト、および宣言のないスパン（`no_such_declaration`）;
- 各`unknown`理由、および失敗した対象に対する`unavailable`;
- 有効な拡張ペイロードに対する`invalid_claim`（`unsupported_grammar_feature`）;
- 各整合性エラー（終了コード64、ドキュメントなし）、これには古いダイジェストとファイル外のスパンを含む;
- `claims`を除き、`--claims`なしで生成されたものと等しいlensドキュメント。
