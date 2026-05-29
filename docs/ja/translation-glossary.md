# 日本語翻訳メモリ（用語集・表記ルール）

このファイルはrigor.typedduck.failの日本語翻訳作業で決定した訳語と表記ルールを管理します。
新しい訳語が決まったらここに追記してください。

## 訳語一覧

| 原語 | 訳語 | 初出時の注記形式 | 備考 |
|---|---|---|---|
| gradual | 漸進的 | 初出: 漸進的型付け（gradual typing）。複合語も初出で英語を併記: 漸進的一貫性（gradual consistency）、漸進的保証（gradual guarantee）、漸進的境界（gradual boundary） | 型理論の "gradual typing" 文脈。旧表記「グラデュアル」「段階的」は廃止し「漸進的」に統一。複合語も一括で寄せる |
| carrier | キャリア | — | カタカナのまま（訳さない） |
| nominal type | 名前的型 | 見出しはシンプルに「名前的型」、本文初出で「名前的型（nominal type）は公称型とも呼ばれます」と補足 | TAPLの訳語に準拠。本文中の「公称」表記（公称ベース・公称クラス等）は「名前的」に統一。初出の併記にのみ「公称型とも」を残す |
| subtyping / subtype | 部分型（型）／サブタイピング（関係・過程） | 初出: 部分型（subtype）、サブタイピング（subtyping） | 名詞 subtype は「部分型」、規律・関係・過程としての subtyping は「サブタイピング」。中間表記「サブタイプ」（カタカナ名詞）は廃止し「部分型」に統一 |
| narrowing | ナローイング | 初出: ナローイング（narrowing） | TypeScript等で定着している語として据え置き。技術用語としての「絞り込み」「狭め」は「ナローイング」に統一する（一般動詞「絞り込む」は対象外） |
| union type | ユニオン型 | 初出: ユニオン型（union type、合併型とも） | RBSのユニオン型構文。「直和型」（sum type）とは別概念で統合しない。「合併型」は併記のみ |
| lint（Rigor自身の動作）| 解析 | 「リント時」→「解析時」 | Rigorは型解析器であり、スタイルチェッカーとの混同を避ける |
| lint scope（RuboCopの文脈）| リント対象 | 「リントスコープ」→「リント対象」 | RuboCop自体はリンターなので「リント」は残す。「スコープ」をカタカナで重ねない |
| refinement type | リファインメント型 | 見出しはシンプルに「リファインメント型」、本文初出で「リファインメント型（refinement type、篩型とも）」と補足 | TAPL系の伝統的訳語「篩型」を併記する |
| syntactic sugar / sugar syntax | 糖衣構文 | 「シュガー構文」ではなく伝統的訳語の「糖衣構文」。単独の名詞「sugar」も文脈に応じて「糖衣構文」に展開 | プログラミング言語論の標準訳 |
| acknowledge mode | acknowledgeモード | 初出: acknowledgeモード（容認モード、ベースライン採用） | ADR-22のベースライン採用モード。英単語＋「モード」。カタカナ化（アクノレッジ）しない |
| strict mode（ADR-22の採用モード）| strictモード | 初出: strictモード（厳格モード、妥協なし） | ADR-22のacknowledgeモードと対になる採用モード。`severity_profile: strict`一般の文脈の「ストリクトモード」とは別物 |
| sum type | 直和型 | 初出: 直和型（sum type） | 「総和型」は使わない。"recursive sum type" は「再帰的な直和型」（"再帰直和型" "再帰的総和型" は使わない） |
| product type | 直積型 | 初出: 直積型（product type） | 「積型」単独は使わない。`A & B` のインターセクション型とは別物 |
| intersection type | インターセクション型 | 初出: インターセクション型（intersection type、交叉型とも） | RBSの `A & B` 構文。「直積型」「積型」は誤訳なので使わない |
| surface | サーフェス | 初出: サーフェス（surface） | 主表記カタカナ。漢語「表層」はサーフェスに統一。ただし動詞「表面化する」（diagnose を顕在化させる意）は別概念で据え置き |
| shape | シェイプ／形状（文脈で使い分け） | 初出: シェイプ（shape）／形状（shape） | Rigorのキャリア（`HashShape`/`ObjectShape`、シェイプエントリ等）は「シェイプ」、一般的な「形・かたち」は「形状」。機械的な一律化はしない |
| capability | ケイパビリティ | 初出: ケイパビリティ（capability） | 主表記カタカナ。`ケイパビリティロール`等はRigorの定義語。漢語「能力役割」「能力プロバイダ」「能力（capability）」はケイパビリティに統一。一般語「能力（ability）」（レビュー能力・クエリ能力等）は据え置き |
| contract | 契約 | 初出: 契約（contract） | 「契約プログラミング」の語に合わせ漢語を主表記。カタカナ「コントラクト」は契約に統一。コード内（`RBS::Extended`等）は原文のまま |
| flow-sensitive | フローセンシティブ | 初出: フローセンシティブ（flow-sensitive） | カタカナのみ。「フロー感応」「フロー感度」のような和語混じりは使わない。"flow-insensitive" は「フローインセンシティブ」、"semi-flow-sensitive" は「セミフローセンシティブ」（プレフィックスもカタカナで統一、「半」は使わない）。学術文献では「制御フロー依存／非依存」（松本＆南出2010ほか）の訳語も見られるが、Rigorサイト内ではカタカナ統一を優先する。論文を引用・参照する文脈では原典の訳語を併記してもよい |
| Liskov Substitution Principle / LSP | リスコフの置換原則 | 初出: リスコフの置換原則（Liskov Substitution Principle、LSP） | LSPはこのサイトでは通常Language Server Protocol（言語サーバープロトコル）を指す。`handbook/appendix-liskov`ページ内に限りLSP＝リスコフの置換原則。同ページ冒頭の注記でこの衝突を明示する |
| substitutability / substitution | 置換可能性／置換 | 初出: 置換可能性（substitutability） | LSP文脈。「代入可能性」は使わない |
| behavioral subtyping | 振る舞い的部分型 | 初出: 振る舞い的部分型（behavioral subtyping） | Liskov & Wing 1994 の語。シグネチャ規則と振る舞い規則の両方を含む |
| signature rule | シグネチャ規則 | 初出: シグネチャ規則（signature rule） | LSPのうち型システムで表現できる半分（パラメーター反変・戻り値共変） |
| robustness principle | 頑健性原則 | 初出: 頑健性原則（robustness principle） | 既存の `type-specification/robustness-principle` ページ題に準拠。「堅牢性原則」「ロバストネス原則」は使わない。"Postel's law" は「Postelの法則」、句は「第1句／第2句」 |
| covariant / contravariant / invariant（分散）| 共変／反変／不変 | 初出: 共変（covariant）／反変（contravariant）／不変（invariant） | `appendix-type-theory` に準拠。分散（variance）の文脈での invariant は「不変」、振る舞い規則の invariant（クラス不変条件）は「不変条件」と訳し分ける。variance自体は「分散」 |
| precondition / postcondition | 事前条件／事後条件 | 初出: 事前条件（precondition）／事後条件（postcondition） | LSPの振る舞い規則。事前条件は強化不可、事後条件は弱化不可 |
| invariant（クラス不変条件）/ history constraint | 不変条件／履歴制約 | 初出: 不変条件（invariant）／履歴制約（history constraint） | 分散の「不変」とは別概念。履歴制約はLiskov-Wingの振る舞い規則 |
| Design by Contract | 契約による設計 | 初出: 契約による設計（Design by Contract） | Meyer / Eiffel。`require`/`ensure`/`invariant`。[契約](#訳語一覧)（contract）の訳に整合 |
| override | オーバーライド | 初出: オーバーライド（override） | カタカナ。`def.override-*` ルール名は原文のまま |
| duck typing | ダックタイピング | 初出: ダックタイピング（duck typing） | カタカナ定着語 |
| arity | アリティ | 初出: アリティ（arity） | カタカナ。既存コーパスで定着（「項数」「引数の個数」は使わない）|
| visibility | 可視性 | 初出: 可視性（visibility） | `public`/`protected`/`private`。`def.override-visibility-reduced` ルール名は原文のまま |
| self type | self型 | 初出: self型（self type） | `appendix-type-theory` のセクション見出し「F有界多相とselfType」を参照するときはその表記に合わせる。RBSの `self` キーワードは原文のまま |
| effect system | エフェクトシステム | 初出: エフェクトシステム（effect system） | カタカナ。既存コーパスで定着 |
| occurrence typing | occurrence typing | — | 既存コーパスに倣い英語のまま据え置く（「オカレンス型付け」「出現型付け」は使わない）|

## 用語紹介の表記ルール

専門用語は**漢語・カタカナを問わず**、各ページで**初めて登場するとき**に
英語原語を一度併記する。これは読者が原語で検索・参照できるようにするため
のサイト全体ポリシーである。別訳語がある場合は併せて添える。

形式: `日本語訳（english、別訳語とも）`

例:
- 名前的型（nominal type、公称型とも）
- 漸進的型付け（gradual typing）
- 部分型（subtype）
- キャリア（carrier）

2回目以降は括弧注記なしで日本語訳（またはカタカナ）のみ使う。併記は
ページ単位の初出に付ける（同一ページで繰り返さない）。

## 据え置く用語（カタカナ主表記・漢語化しない）

Rigor固有語または定訳のない語は、意図的にカタカナを主表記とする。
後続の翻訳で「親切心で」漢語化しないこと。各ページ初出で英語を併記する。

| 原語 | 表記 | 初出注記 | 備考 |
|---|---|---|---|
| carrier | キャリア | （carrier） | Rigor固有語 |
| fact | ファクト | （fact） | Rigor固有語 |
| slice | スライス | （slice） | Rigor固有語 |
| baseline | ベースライン | （baseline） | |

surface・shape・capability・contract の主表記は[訳語一覧](#訳語一覧)で決定済み
（旧「保留」を解消）。

## 翻訳対象外（upstream所有のja-nativeページ）

フロントマターに `sourceLanguage: "ja"` を持つページ（`notes/` 配下の
一部など）は、upstream/rigorがja-nativeで所有し、`pnpm sync:docs`
（`prebuild`で自動実行）がupstreamから上書き再生成する。当リポジトリの
翻訳対象ではないため、**用語統一・英語併記・表記正規化の対象にしない**。
編集してもビルド時に巻き戻る。該当ファイルは
`grep -rl 'sourceLanguage: "ja"' src/content/docs/ja` で一覧できる
（2026-05時点で `notes/` の6ファイル）。

## 変更しないもの

- RFC 2119 キーワード（MUST, SHOULD, MAY, MUST NOT, SHOULD NOT）は英語大文字のまま
- コードブロック・型名・識別子は原文のまま
- `RBS::Extended`, `Dynamic[T]`, `~T`, `T - U` などのRigor型表記は原文のまま
