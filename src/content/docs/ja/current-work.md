---
title: "現在の作業 — 再開ブックマーク"
description: "rigortype/rigor docs/CURRENT_WORK.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/CURRENT_WORK.md"
sourcePath: "docs/CURRENT_WORK.md"
sourceSha: "2fefd71d340fa0cd0fcd47cb563e74416b68efa38c7f32e90106053c489a5427"
sourceCommit: "ee19f4b60fca3bd0ceb677ebb395593203f2ea48"
sourceDate: "2026-06-20T14:52:23+09:00"
translationStatus: "translated"
sidebar:
  order: 9050
---

次の実装者のための一時的なブックマーク: 直近の次セッションのエントリーポイントに加え、他では完全には捕捉されていないエンジン内部の項目。**規範的な**契約（contract）は[`docs/internal-spec/inference-engine.md`](../internal-spec/inference-engine/)と[`docs/adr/4-type-inference-engine.md`](../adr/4-type-inference-engine/)に残ります;将来を見据えたコミットメントエンベロープ（リリース戦略 + 完全なバックログ）は[`docs/ROADMAP.md`](../roadmap/)にあり;リリース済みバージョンの記録は[`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md)です。このファイルがそれらのいずれかと矛盾する場合、仕様 / ADR / ロードマップが拘束力を持ち、このファイルは古くなっています。

## ステータス

**最新リリース: v0.2.8（2026-07-06）** —— 8番目の`0.2.x`評価ラインのカットであり、[ADR-50](../adr/50-release-engineering-and-stability-strategy/)が統制する。下記のRailsの型カバレッジの弧（`coverage --protection`の由来/tractabilityラベリング + 呼び出しサイトのパラメータ推論）に加え、env / sig-genのRBS妥当性のロバストネス修正を出荷した。カットごとの完全な記録は`CHANGELOG.md`（§ `[0.2.8]` … `[0.2.0]`）にある;ここで再要約しないこと。`make verify`はクリーン。

**次の2つのカットは[`docs/ROADMAP.md`](../roadmap/) §「The next two cuts — v0.2.9（最後の`0.2.x`）then v0.3.0」に描かれている:** v0.2.9＝**型推論の強化**カット（偽陽性に安全なfold / ナローイング / ADR-47 WD3b / コーパスゲート付きのデフォルト拡大診断——なお`0.2.x`のマイナー非破壊の誓約の内側）;v0.3.0＝**ハード非推奨の一掃 + パフォーマンス**マイナー（`docs`/`skill`の動詞サブコマンド + `type_specifier`エイリアス + `parallel_tests`を削除;ADR-46のインクリメンタル解析 + その他のパフォーマンスレバーを着地）。v0.2.9が最後の`0.2.x`だ（1桁ポリシー → 次は`0.3.0`）。

**master上の未リリース分: ドキュメントレビューバッテリー** —— [`rigor-docs-review`](../.claude/skills/rigor-docs-review/SKILL.md)スキル（5層L0〜L4のレンズ方法論） + 最初のL1忠実度パス（PR #54、4件のマニュアル忠実度修正;台帳[`20260706-docs-review-fidelity.md`](../notes/20260706-docs-review-fidelity/)）。残り: 同じ章に対するL2の読者レンズ / L3の肥大 / L4のコピーエディット + ハンドブック対仕様コーパスの忠実度パス（逐次実行する——後の層は修正されたテキストを読む）。これらは内部/ドキュメントの変更であり、`[Unreleased]`のCHANGELOGエントリーではない。

**v0.2.8で出荷 —— Railsの型カバレッジの弧**（`rigor-survey`のredmine / mastodonターゲットのオンボーディングから、2026-07-04 → 2026-07-06;ノート[`20260704-rails-coverage-onboarding-carrier-trap.md`](../notes/20260704-rails-coverage-onboarding-carrier-trap/) + [`20260706-mastodon-coverage-provenance-and-siggen-rbs-validity.md`](../notes/20260706-mastodon-coverage-provenance-and-siggen-rbs-validity/)）。スレッド、順に:

- **カバレッジスコープの忠実度（2026-07-04）** —— `rigor coverage --protection`が保護を約13ポイント過小カウントしていた: そのスキャンスコープが（a）プラグインレジストリと（b）クロスファイルのクラス発見を欠いていたため、プラグインが型付けするレシーバー（`params`、`Model.where → Relation[Model]`）と兄弟ファイルのクラス定数が`Dynamic`と読まれていた。両方修正済み;メトリクスは今や`check`が型付けするものと一致する（redmine `app`+`lib` 0.195 → 0.339、mastodon `app/models` 0.177 → 0.311）。加えてrigor-actionpackがリクエストコンテキストのリーダー（`params`/`session`/`request`/`flash`/`cookies`、寛容な名前的型、バンドルRBSなし）を型付けし、sig-genのスーパークラス修正 + それが表面化させたenvクラッシュ耐性。**要となる教訓: `check`経由の`dump_type`がグラウンドトゥルースだ;単一ファイルの`dump_type`プローブはクロスファイルのシンボルには誤りだ——ディレクトリ全体を解析すること**。
- **[ADR-82](../adr/82-dynamic-provenance-wiring/)の`Dynamic[T]`由来配線の弧（2026-07-06、WD1+2+3+6+7+8、PR #42〜48）** —— `coverage --protection`は今や各ホールが*なぜ*動的なのかをラベリングし、それをルーティングする（型なしパラメータ → ADR-67、束縛されていないivar → ADR-58、解決済みだが推論不能な戻り値 → 推論）。記録（WD2/3） → バインディング伝播（WD1） → チェーン伝播（WD6） → **サイトごとの正確な`cause_site_counts`メトリクス（WD7）** → パラメータ + ivarの根の拡充（WD7/WD8）。Mastodonの原因なしホールは49%→26%に落ち、アクション可能な推論ルーティング済みバケットは351→5,399（15倍）に増え、比率は不変（精度加算的）。**要となる訂正（WD7）: 旧来のグループ支配的な`add_a_type_here`集約はロッシーだった** —— 混在グループの原因なしサイトを隠していたので、WD1/WD6の「null 2,921→1,356」という数字はアーティファクトだった（WD1〜6後の真の原因なしは10,390）。Redmineでクロスプロジェクト検証済み（推論バケット30% 対mastodon 26%）。この弧にはもう1つ: sig-genのレコードキーのRBS妥当性修正（`Type::HashShape#erase_key_prefix`が非識別子のシンボルキーをクォートするので`{ :"data-contrast" => T }`がパース可能なRBSへ消去される——パースできないものは環境全体をnullにし、偽の約5ポイントのカバレッジ*低下*として読まれていた）。
- **[ADR-67](../adr/67-parameter-type-inference/)の呼び出しサイトのパラメータ推論、シェイプ拡張（2026-07-06、PR #49）** —— コレクターは今や、末尾にオプショナル/キーワード/レスト/ブロックパラメータが続く場合でも（`def f(x, opts = {})`）、メソッドの先頭の必須パラメータを推論し、WD3の実証済みの健全性（解決された実引数のユニオン）を再利用する。コレクターの既存の+190に上乗せしてmastodonで+36保護サイト。**呼び出しサイトのレバー全体は控えめだ（約+226サイト、mastodonで+0.75ポイント）。というのも、パラメータの穴のほとんどが、呼び出しサイト推論では見えない動的ディスパッチ / フレームワークコールバックで到達されるからだ** —— これがWD2の本体内推論のスパイクを動機づけた天井である（次項）。
- **env / sig-genのロバストネス + WD2の停止（2026-07-06、PR #50/#51）** —— 由来マップはADR-67 WD2（本体内パラメータ推論）を最後の保護レバーと名指したが、**計測されたスパイクがそれを延期させた**（ARの属性の罠 + 保護メトリックの循環性 + 見返りの出ない構造的インターフェースキャリアが必要——[スパイクノート](../notes/20260706-adr67-wd2-in-body-inference-design-spike/)）。マップがそれより*上位*にランクした、範囲の限られたロバストネスレバーが代わりに着地した: **env-buildの耐性（#50** —— 1つのパースできない`signature_paths:`の`.rbs`が隔離され、RBS環境全体を崩さなくなる。スキップしたファイルを名指す一度きりの警告付き）と**2つ目のsig-genのRBS妥当性修正（#51** —— `&block`コンストラクタパラメータが、環境を壊す`(**untyped, ?{ (?) -> void })`ではなく、括弧の*後ろ*に有効なRBSブロックとしてレンダリングされるようになった）。この弧のレコードキー修正と合わせて、sig-genは環境を壊すRBSをもう出さず、不正な`.rbs`はもう環境を吹き飛ばさない。**保護の天井は今や計測されたフロアだ;次の動きは別のエンジン機能ではなく、評価ラインの目的そのものだ**。

ラインは**`0.2.x` —— 評価**のままだ: 外部からのフィードバックを集め、計画された機能セットを高い完成度へ持っていく。道は**v1.0.0**、ハードな契約フリーズを指している。[`docs/ROADMAP.md`](../roadmap/) §「Release strategy」を参照。

**リリースゲート:**両ベースライン（`bench/baseline.json` + `data/oss-sweep/mastodon-thresholds.json`）は正確なカウント / 帯であり、決定的なシグナルがドリフトしたときにのみ再較正される —— 再較正の規律については下記の`bench-perf` gotchaを参照（アロケーションは決定的だ;`wall_s`は再実行可能なフレークだ;より高いカウントを容認する前にOSSスイープの診断を偽陽性についてdiffすること）。

ヘッドラインのリアリズム（**v0.1.12のOSSリアリズムカット** —— このツールを実コードで信頼に足るものにした偽陽性削減の成果;偽陽性削減のフロアであって、今日の正確なカウントではない —— v0.2.0の検出の歯は、精度を変えずにこれらのコーパスで表面化するカウントを意図的に*引き上げる*）:

| プロジェクト | スコープ | Before | After | Delta |
|---|---|---:|---:|---:|
| Mastodon | `app + lib` | 789 | 6 | **−99.2%** |
| Redmine | フルプラグインセット | 163 | 79 | −51% |
| GitLab FOSS | `app/{controllers,mailers,workers,services}` | ~670 | ~140 | ~−79% |

## 次セッションのエントリーポイント

> **▶ v0.2.8が最新リリース（Railsカバレッジの弧は出荷済み）。masterは未リリースのドキュメントレビューバッテリー（スキル + L1パス;内部/ドキュメント）だけを運んでいる。進行中のリリースはない** —— 次のカットは**v0.2.9**、ユーザーがタグを打つ型推論強化カットだ（バージョンバンプ + `rake release`はゲートされたまま;自律的にバンプしないこと）。**アクティブなターゲットは今や[`docs/ROADMAP.md`](../roadmap/) §「The next two cuts」のv0.2.9 / v0.3.0の憲章だ** —— v0.2.9＝偽陽性に安全な推論精度（fold / ナローイング / ADR-47 WD3b / コーパスゲート付きのデフォルト拡大診断、（A）/（B）キューと互換性安全なバックログから）;v0.3.0＝ハード非推奨の一掃 + パフォーマンス（ADR-46のインクリメンタル）。下記のエンジン精度キュー（A/B）がv0.2.9の候補プールだ;ADR著作バックログ（D）も引き続き利用可能。`make verify`はクリーン。
>
> **（0）Railsの型カバレッジの弧 —— 2026-07-04 → 07-06の引き継ぎ（状態 + なぜ天井がハードなフロアなのか）:**
> カバレッジスコープの忠実度（2026-07-04）と**[ADR-82](../adr/82-dynamic-provenance-wiring/)の由来配線の弧（2026-07-06）**はどちらもDONEでマージ済み。`coverage --protection`は今や（a）`check`のスコープを鏡写しにし、（b）各ホールのdynamic-origin原因をラベリングしてそのレバーへルーティングし、（c）**サイトごとの正確な`cause_site_counts`**を報告する（以前のグループ支配的な`add_a_type_here`集約はロッシーだった——メソッドグループごとの合計ではなく`cause_site_counts`を信頼すること）。弧の後の正確な図、mastodon app+lib（未保護21,119件、比率0.316）: **約26%が原因なし（本当に未モデル化——`yield`/`super`/ブロックの結果 + cvar/gvar）、約48%が`unsupported_syntax`（未解決の呼び出しに根ざしたチェーン）、約26%が`inferred_return_untyped`（型なしパラメータ / 束縛されていないivar → アクション可能なADR-67/58のバケット）**。
> - **由来の作業は保護の獲得ではなくマップだ** —— ホールを精度加算的にラベリングする（比率は不変）ので、天井を動かさずに天井が*どこ*にあるかをロードマップに伝える。Redmineでクロスプロジェクト検証済み（同じ形）。
> - **ADR-67（呼び出しサイトのパラメータ推論）は実装済み + 拡張済み**（WD1+WD3+WD5 + 2026-07-06の先頭必須シェイプ拡張）で、`coverage --protection`内でのみ走り（`ParameterInferenceCollector.collect`、上限付き不動点）、`check`では走らない（診断はバイト同一）。計測された天井: 合計で**約+226 mastodonサイト（+0.75ポイント）**。これは*本質的に*控えめだ——パラメータの穴のほとんどが、呼び出しサイト推論では根本的に見えない動的ディスパッチ / フレームワークコールバック（`before_action`、ミドルウェア）で到達される。
> - **[ADR-67](../adr/67-parameter-type-inference/) WD2（本体内の構造的推論）はスパイクされ、延期された（2026-07-06、PR #50ブランチ）** —— 計測されたスパイクが以前の「残る唯一のレバー」という枠付けを覆した（[スパイクノート](../notes/20260706-adr67-wd2-in-body-inference-design-spike/) + ADR-67 WD2補遺）。mastodon/redmine/rigor-libにわたる純AST的なプローブ: 型なしパラメータのうち、**44〜58%は本体内で一度もレシーバーにならず**（→ WD3 / ADR-58、WD2ではない）、19〜27%はユニバーサルなダックメソッドしか呼ばず（名前的型を絞り込まない）、何らかの弁別的なメソッドを持つのは23〜29%の天井にとどまり——そのうち名前的型を少しでも絞り込めるのは**約10%の「2つ以上の弁別的メソッド」の部分集合**だけだ。その約10%さえ（i）**ARの属性の罠**（絞り込めそうに見えるドメインパラメータはRailsのヘルパーで、その弁別的なメソッドは静的な発見インデックスにない動的なARアクセサだ）と（ii）本体由来の構造的境界の**循環性**（それはまさに自らが構築される基となったサイトを保護済みとマークし、同一本体内のタイポを噛めない）に沈められる。WD2は新しい構造的インターフェースキャリア（ハイステークスな型の動物園の拡張）を必要とするが、その見返りは正当化されない。ARの罠が存在しない（スキーマ＋プラグインが完全、または非Railsのドメインオブジェクトコード）のでない限り、**WD2を再推奨しないこと**。
> - **保護の天井は今や、欠けているクイックスライスではなく、計測されたハードなフロアだ**。そして由来ノートが大機能作業より上位にランクした範囲の限られたロバストネスレバーは尽きた: env-buildの耐性が着地し（**#50** —— 1つのパースできない`signature_paths:`の`.rbs`が隔離され、RBS環境全体を崩さなくなる）、sig-genのRBS妥当性のバグは両方修正された（レコードキーはADR-82の弧内;`&block`コンストラクタのレンダリングは**#51**）。ADR-58のivar型付けはDONE（保護ではなくpossible-nilの発火ポリシーを統制する）;呼び出しサイトのパラメータ推論は動的ディスパッチの天井にある;WD2は見返りが出ない。**したがって次の方向は、別のエンジン精度機能ではなく、`0.2.x`評価ラインの実際の目的（C）——外部からのフィードバックを集め、計画された機能セットをv1.0完成へ駆動すること——だ**。まだ開いている範囲の限られたエンジン項目は1つ、env耐性の**CI可視性フォローアップ**だ（隔離の`warn`を適切な診断 / 非ゼロ終了に変える）;これはADR-50の語彙に触れる（新しいルールIDがv1.0で凍結される）ので、まず重大度の判断が必要だ——純粋に機械的なスライスではない。
> - オンボーディングの成果物はサーベイのチェックアウト内にUNTRACKEDで存在する（`~/repo/ruby/rigor-survey/{redmine,mastodon}/.rigor.dist.yml` + `.rigor-baseline.yml`、acknowledgeモード、プラグイン配線済み、`sig/`なし）;由来のエンリッチメントの各スライスが`coverage_command_spec`のnil時省略フィクスチャを壊した（依然として原因なしのレシーバーが必要: パラメータ/ivarがエンリッチされたので`def f(x)`→`@x`→`$x`——今やグローバル読み取り）。
>
> **（A）エンジン精度 —— M3 / メンバーシェイプの弧（キュー済み・ゲート順;2026-06-16に留保付きで先送り —— 順序を違えて着手しないこと）:**
> 1. **[ADR-67](../adr/67-parameter-type-inference/)の`check`ウォーク配線** —— ADR-66/68が実アプリで効くための前提条件。WD1+WD3+WD5は着地済み（呼び出しサイトでのパラメータ型推論（parameter type inference） + 上限付き不動点、`coverage --protection`のみに配線）;残るステップは`param_inferred_types`をメインのcheckウォークに供給することで、ウォーク前の収集（予算ゲート付き、おそらくオプトイン / インクリメンタル裏付け）に加え、WD1の本体内由来（provenance）**マーク** + 診断ガードを要する。**価値は不透明だ** —— WD1の抑制によってfold精度のみとなり、下流の偽陽性を表面化させればネットでマイナスになりうるため、具体的な需要が現れるまで先送りが妥当なままかもしれない。**エンジンのエントリーポイント（ウォームコンテキスト）:**収集は`ScopeIndexer.discovered_*_for_paths`に乗る;再利用する戻り値メモは`9a3d6f5c`（[ADR-57](../adr/57-self-call-return-adoption/)）;パラメータは`lib/rigor/inference/method_parameter_binder.rb:203`（`default_types_for`）でデフォルト`untyped`。
> 2. **[ADR-68](../adr/68-class-builder-folding/)のビルダー畳み込み** —— #1にゲートされる（パラメータ推論なしでは見返り~0、faradayで計測済み）。**三度のウォーク・二段階**の変更だ: 2つのサイドテーブル（`struct_member_layouts[Const]` + `discovered_classes[Const] = Singleton[Const]`、さもないとStructFolding層が決して発火しない）に加え、`collect_class_decls`へのスーパークラスのスレッド + レシーバー名解決 + 推移的な`< Struct`チェック。偽陽性に安全な部分的選択肢は、完全なスーパークラスのシードを既に持つファイルごとの2経路での同一ファイル限定の認識だ。ADRの「Corrected scope」補遺を参照。
> 3. **[ADR-66](../adr/66-discriminated-union-member-typing/)のタグナローイング** —— 同じゲート、より難しく（tag⇒payloadマップ + ビジターディスパッチ）、ADR-58より下位にランクされる。3つのうち最も優先度が低い。
>
> **（B）ゲートなしのエンジン精度（リリース / M3依存なし）:**
> - **type-coverage-uplift** —— より多くのビルトインメソッドを精密な型へfoldする（`rigor-type-coverage-uplift`スキル）。2026-06-17に`Range#first(n)` / `#last(n)` / `#take(n)` → `Tuple`、`Array#minmax` → `Tuple[min, max]`、`String#codepoints` → `Tuple`が着地;2026-06-19（v0.2.1で）はスカラー完全性バッチ`Symbol#name` / `#id2name` / `#intern`、`Integer#finite?` / `#infinite?` / `#nonzero?`、`Float#nonzero?` / `#integer?`、`String#grapheme_clusters` → `Tuple`を追加した。2026-06-21はニッチなキャリアの残り物を最後まで枯渇させた: `Float#numerator` / `#denominator` / `#arg` / `#angle` / `#phase`、`Pathname#split` → `Tuple`、そして`String#shellescape` / `#shellsplit`（`Shellwords.escape` / `.split`のString受信者版の双子）。キャリアスイープはこれで勝ちの取れるものをすべて使い果たした —— 残る名前付きのギャップ（`coerce`、`unpack1`）は内部プロトコルである / フォーマット依存が強すぎて健全にfoldできない。**教訓（再確認）:** 2026-05-22のカバレッジドキュメントは🔲ギャップを過大報告する（カタログの`leaf`パスがほとんどのスカラーメソッドを自動foldする）—— 実装前に`MethodDispatcher.dispatch`を経験的にプローブすること（候補ごとに定数レシーバー上でディスパッチして非nilの精密な結果をチェックする使い捨てスクリプトが最速のフィルタだ）;本当のギャップは、Tuple昇格ハンドラ + キャリアの`*_HANDLERS`エントリーを要するArray / 構造を返すメソッドに集まり、加えてたまにあるスカラー述語の一貫性ギャップにも集まる。
> - **[ADR-47](../adr/47-narrowing-driven-clause-reachability/) WD3b** —— 分解 / 値 / 変数キャッチオール（catch-all）パターンの`case`/`in`網羅性（ゼロ発火のWD4スイープにより優先度引き下げ;アドホックに推論しないこと）。
> - **セルフミューテーションのファイルごとの有効性（Product C）—— 成熟;扱いやすい層はCOMPLETE、巨大コア層は需要ゲート付き**。`tool/mutation/self_mutate.rb <file…>`（融合したself-check ∪ rspec）で`lib/rigor`のテストスイートの穴を塞ぐ。2026-07-01時点で、spec済みの約600 LOC以下のすべてのファイル + specのないキャリアは、100%融合 / 等価ミュータントのフロアにある（ツリー全体のコールドメソッド層はすでに枯渇していた）。**巨大なコアエンジンファイル**（`statement_evaluator` 3388、`expression_typer` 3059、`scope_indexer`、`narrowing`、…）はCHARACTERIZEDされ、選択によってSTOPPEDされている: `--type-only`はすべての噛める（biteable）サイトが型で保護されていることを示すが、融合軸は本物の未テストのエッジパスを表面化させる（例: `statement_evaluator`の約316サバイバー、統合スイートで本物と確認済み、カバーされていない）。それらのクローズは大規模で低収穫のマルチセッション作業だ。実演的なスライスが1つ着地した（`e486fc11`、begin/rescue/retryのクラスタ + デッドコード除去）。**再開:**巨大ファイルを1つ選ぶ → サバイバーを凝集した領域に分割する → 各領域をSonnetサブエージェントに委譲する（それぞれ互いに素なspecファイル1つ;まず`--type-only`、次にファイルごとの融合を`run_in_background`で）。load-bearingなポリシー + 6つの再利用可能なkill技法 + UTF-8ロケール要件（`450a3016`で修正）は、トラッカー[`docs/notes/20260618-self-mutation-testing-plan.md`](../notes/20260618-self-mutation-testing-plan/)とROADMAP §「Analyzer self-testing」にある。
>
> **（C）`0.2.x`評価ライン + [ADR-50](../adr/50-release-engineering-and-stability-strategy/)の残り:**
> - 外部からのフィードバックを集める（評価ラインの目的）;[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」の需要駆動バックログが`0.2.x`の完成目標だ（Ractor並行性トラックを除くすべて）。
> - **ADR-50の残りWD:**サポートラインモデル（WD5 —— 最新 + 1つ前のマイナー）、`rigor upgrade`マイグレーションコマンド（WD7、具体的なBCが対象を与えるまで先送り）、そして次のメジャー境界の規律がキューに入ったときの最初の**bleeding-edge `FEATURES`エントリー**（オーバーレイは今日時点で空 —— `Rigor::BleedingEdge`、`bleeding_edge:`設定キー、`rigor show-bleedingedge`、`rigor check --bleeding-edge[=ids]`はすべて配線済み;最初の規律は単一の`FEATURES`エントリーとして着地し、エンジン配線は不要）。
>
> **（D）ADR著作バックログ —— 2026-06-22の互換性安全な強化サーベイから**（[ノート](../notes/20260622-rigor-0.2.x-compatibility-safe-strengthening-survey/);11のルート + P0〜P7は[`docs/ROADMAP.md`](../roadmap/) §「Compatibility-safe strengthening backlog（0.2.x）」でBCバケットに分類されている）。既存のADRがすでに所有する内部的 / 機械的な作業ではなく、真に*代替案のある決定*であるものだけがADRタスクになった。**バケット1 —— 3つのADRすべてが2026-06-24にWRITTEN + IMPLEMENTED（Accepted;`make check`/`check-plugins`クリーン、208 spec + drift green、rubocopクリーン）:**
> 1. **[ADR-75](../adr/75-dynamic-provenance/) —— `Dynamic[T]`の来歴（provenance）と説明**（実装済み`01e291cb`;サーベイ§3 / P2）。dynamic由来の原因ファクト（外部gem・RBSなし / DSLマクロ境界 / 予算打ち切り / プラグイン宣言 / 明示的untyped / 非サポート構文）を運び、`coverage --protection`ラベル + `--format json`経由で加算的に表面化する;`untyped = Dynamic[top]`関係のセマンティクスは保存する。**最高価値** —— #4の前提条件でもあり、上記ですでにキュー済みの**カバレッジ扱いやすさラベル**フォローアップ（ADR-73 §「P6」）の具体的な実現でもある。ステークスは中（キャリアに触れる、加算のみ）。
> 2. **[ADR-76](../adr/76-effect-modeling-freeze-dup-shape-preservation/) —— `freeze`/`dup`/`clone`のエフェクトモデリング & シェイプキャリア保存**（WD1実装済み`2751bc78`;**WD2は2026-06-26に完全着地** —— HashShape + Tuple、`c75161a0`、ADR-78 WD1のブロック形式オーバーfold修正後;サーベイ§4）。分割された決定を記録する: 保守的な無効化（バケット1、FP削減） + `freeze`/`dup`/`clone`/`itself`を通したシェイプキャリア保存であり、再帰的な`always-truthy`のルート修正（今や完了）にゲートされる。ステークスは高（FP / 健全性）;`lib` + mail/kramdownコーパスで診断同一と検証済み。
> 3. **[ADR-77](../adr/77-doctor-and-upgrade-commands/) —— `rigor doctor` / `rigor upgrade`のエビデンスルーティングコマンド**（実装済み`8048991c`、`upgrade`はスケルトン;共有の`CLI::CheckRunnerFactory`抽出はADR-73の`describe --deep`も解放する;サーベイ§7 / P5）。デフォルトの`check`挙動を変えずに既存のcheck / baseline / プラグインのエビデンスを再利用する加算的コマンド;初日から安定した構造化JSON契約、深いプローブはオプトイン。ADR-50 WD7（`rigor upgrade`、具体的なBCの対象があるまで先送り） + ADR-73の`rigor-doctor`スキル（今日はカタログのみ） + 先送りされた`describe --deep`フォローアップを結びつける。ステークスは中;前例はADR-23 / ADR-33 / ADR-51。
>
> **ゲート済み / 需要先送り —— 順序を違えて着手しないこと:**
> 4. **ADR —— 最初の`bleeding_edge:`規律（strict-dynamicプレビュー）**（サーベイ§11 / §3-tail / P7、バケット2）。最初の`BleedingEdge::FEATURES`エントリー;**#1にブロックされる**（来歴ファクトの上に構築される） + 具体的な次メジャーの著作の期待に需要ゲートされる —— オーバーレイは設計上今日空である（（C）「ADR-50の残り」を参照）。あらゆる将来のエントリーのfeature-idスタイルを設定するので、真の規律のために取っておくこと、精度修正のダンピンググラウンドにしないこと。
> 5. **ADR-41を改訂 —— 設定可能な推論バジェットを配線**（サーベイ§6、原則的にはバケット1）。新しいADRでは*ない*;設定サーフェスWD（現行挙動のデフォルト、exhaustion-as-explanation、意図的なキー命名、事実上のAPIとしての内部fuel定数なし）でADR-41をproposed→acceptedへ進める。**需要先送り** —— 下記「オープンエンジニアリング項目 §推論バジェット」の通り、バジェット型のコストを示すコーパスプロジェクトはまだない;まずADR-41 WD3の分布プローブを再実行すること。
>
> **意図的にADRに値しない**（再トリアージされないよう記録）: セルフミューテーション / ティース、決定論的fold、キャッシュ / パフォーマンス、加算的な診断メタデータフィールド、加算的なプラグイン精度 —— 内部的 / 機械的で、ADR-62/63/65/61/54と（B）のキューが所有する。バケット4の罠（`rigor:v1:`文法の変更、`untyped=Dynamic[top]`セマンティクス、エイリアスなしのID変更、必須プラグインフック、サイレントなアーティファクトの誤読）はメジャーバージョン限定の「してはならない」であって、タスクではない。
>
> **▶ [ADR-48](../adr/48-data-struct-value-folding/)の`Struct`値fold —— スライス1 + 2 + 3が2026-06-15に着地;スライス4は完全な設計とともに先送り**（セッターを通じた変更されたメンバーの精密な再型付け;ルートaの書き戻しをスライス3で証明されたno-alias/no-escapeケースに絞ったもの、設計は[`docs/notes/20260615-struct-folding-slice3-design.md`](../notes/20260615-struct-folding-slice3-design/)）。`Data.define`はスライス1〜4を出荷した（v0.1.17）。残るより小さな項目: `Data.define`の素のローカルブロック形式のパリティ（`c = Data.define(:x) do … end` —— リーダー再定義ガード用の解決可能なクラス名なし、保守的にbail）。
>
> **▶ [ADR-73](../adr/73-skill-driven-user-experience/)のSKILL駆動ユーザー体験 —— 2026-06-20に着地（本セッション;未リリース、`CHANGELOG.md` § `[Unreleased]`）**。v0.1.xのSKILL三点セットを超えるオンボーディングUXの向上だ: `rigor skill describe`（**presence限定**の状態プローブ → 推奨される次のスキル、WD2;`rigor describe`トップレベルエイリアス） + `rigor-next-steps`エントリーポイント + **13スキルカタログ**（`rigor-rbs-setup` / `rigor-editor-setup` / `rigor-mcp-setup` / `rigor-protection-uplift` / `rigor-monkeypatch-resolve` / `rigor-plugin-tune` / `rigor-upgrade` / `rigor-doctor`を追加）であり、**vercel-labs/skills** + バンドルされたgem経由で配布される（貢献者の`.claude/skills/`は`metadata.internal: true`でマークされる）。**フィールドトライアルで堅牢化済み** —— カンファレンスアプリのドッグフード + **13モデルのOpenCode ACPクロスベンダー検証**（13個すべての非Claudeモデルがラッパースクリプトでフローを忠実に駆動した;唯一の失敗は並列実行下でのOpenCodeの単一SQLiteセッションロックであり、今や`acp-agent-runner`スキルに記録済み）;ノートは[`20260620-skill-driven-onboarding-dogfood.md`](../notes/20260620-skill-driven-onboarding-dogfood/) + [`20260620-opencode-acp-cross-model-validation.md`](../notes/20260620-opencode-acp-cross-model-validation/)。トライアルは**6件のUX修正（すべて着地）**を駆動した: `target_ruby`のPrismフロアメッセージ（サポートされるフロア + 値の読み取り場所を明示する）、実行可能な便利メタgem（`rigor-rails`）のロードエラー、有効なパスに紛れた欠落パスに対する`check`のwarn-and-skip、空のRBS環境のWARNINGバナー（`RBS classes available: 0`は壊れた`signature_paths:`であって、クリーンな実行ではない）、**checkを認識する`describe`のエージェントプロンプトルーティング**（「presenceヘッドラインがときどき誤る」へのWD2を保つ答え —— *エージェント*がすでに持っている`check`の所見から精緻化する）、そしてRailsロック済みだがRailsプラグインなし → `plugin-tune`の推奨。
>
> **2件の先送りフォローアップ**（ADR-73 §「Field-trial follow-ups」、未決の決定 —— 着手したら先送りを解除する）: **（1）`rigor skill describe --deep`** —— *ヘッドライン*の推奨をcheck認識にする（スコープを絞った`rigor check`を実行 + 実際の所見でルーティングする: エラー → baseline削減、モンキーパッチのクラスタ → monkeypatch-resolve、`RBS 0` / 設定エラー → doctor）。必要な共有の「checkを実行 → `Analysis::Result`」ヘルパは**2026-06-24に`CLI::CheckRunnerFactory`として着地した**（ADR-77により`CheckCommand#build_check_runner`から抽出）ので、`describe --deep`は今やメカニズムの面ではブロック解除されている;限界価値は依然として**控えめ**だ —— 着地済みのエージェントプロンプトルーティングは、エージェントがどのみち実行する`check`の所見でエージェントをルーティングさせるので、これはエージェントの推論を省くだけだ。**（2）カバレッジ可解性ラベル**（トライアルの「P6」） —— `coverage --protection`の「ここに型を追加」の穴をジェネリック型パラメータ / 外部gem / フレームワークDSLで分類し、ユーザーが解決不能なものを追いかけずに済むようにする。ブロックしていた**`Dynamic`由来（provenance）追跡**は**2026-06-24に[ADR-75](../adr/75-dynamic-provenance/)として着地した**（`Scope#dynamic_origins`のアイデンティティキー付きサイドテーブル + `ProtectionScanner::Site`の`dynamic_origin`フィールド / JSONレポート）、そして**可解性ラベル自体は2026-06-26に着地した**: `coverage --protection`は各穴の`dynamic_origin`（`DynamicOrigin.tractability`）から`tractability`軸（`add_rbs` / `enable_plugin` / `engine_gap`）を今や導出し、`--format json`とテキストレポートに表面化する。**このフォローアップはDONEだ**。残る磨き込みは需要ゲート済みのみ: 原因ごとのより詳細なヒント / 軸によるレポートのグループ化。
>
> check-rulesルート経由でADR-24スライス4を**再起動しない**こと（2026-06-05にリバート済み、135件の偽陽性 —— 着地済みのルートは評価時の`SelfCallResolutionRecorder`）。`Runner#initialize`のivar事前シードをヘルパに**抽出しない**こと（エンジン自身のフロー解析からそれらが隠れる → self-check偽陽性;「Gotchas」を参照）。`make verify`クリーンのシグナルだけでユニオン / nilableレシーバーの診断を**広げない**こと —— `rigor-survey`コーパスに対してゲートすること（外部コードは誤って型付けされたレシーバーの偽陽性を露呈する;「Gotchas」を参照）。**`freeze` / `dup` / `clone` / `itself`を通したシェイプキャリア保存は（2026-06-26）DONEだ**——`HashShape`と`Tuple`の両方について（[ADR-76](../adr/76-effect-modeling-freeze-dup-shape-preservation/) WD2 / [ADR-78](../adr/78-reflexive-overfold-always-truthy/) WD3、`ShapeDispatch`内の`shape_self`）。Tuple側は**まずブロック形式のオーバーfoldのルート修正**を必要とした（ADR-78 WD1の持ち越し分）: `ShapeDispatch.try_dispatch`は今やブロックが存在する場合に処理を辞退する —— ハンドラはノーブロックのセマンティクスをfoldするだけでどれもブロックを評価しないため —— `CONST = [...].freeze; CONST.any? { … }`はブロックを無視して`Constant[true]`にfoldしていた、これがTuple層が最初に露呈した6件の反射的`always-truthy`発火だ。ゲート: `lib`のself-check + mail/kramdownコーパスがmasterと診断同一、reconノートの8プロジェクト検証、471件のshape/foldスペックがグリーン。（先行する反射的send`REFLECTIVE_SEND_METHODS`ガード`89be0860`は必要だったが、残存クラスは`public_send`ではなくブロック形式だった。）

### 参照読書

1. [`docs/ROADMAP.md`](../roadmap/) §「Release strategy」—— `0.2.x`評価ラインとv1.0.0フリーズへの道のり（ADR-50が統制する）。
2. [`docs/adr/50-release-engineering-and-stability-strategy.md`](../adr/50-release-engineering-and-stability-strategy/) —— v0.2.0→v1.0.0のリリース / QA契約（互換性サーフェス、診断の非契約 + bleeding-edge、パフォーマンスゲート、サポートライン、昇格ケイデンス）。
3. [`CHANGELOG.md`](https://github.com/rigortype/rigor/blob/master/CHANGELOG.md) § `[0.2.1]` / `[0.2.0]` —— 現在の評価ラインのカット。アーカイブされた`0.1.x`サイクル（[`docs/CHANGELOG-0.1.x.md`](../changelog-0.1.x/)）はパフォーマンス / インクリメンタル（[0.1.17]）、プラグイン契約 + ADR-43（[0.1.16]）、OSSリアリズム（[0.1.12]）の各サイクルを保持する。
4. [`docs/internal-spec/public-api.md`](../internal-spec/public-api/) —— パブリック対内部の安定性境界（ADR-50 WD1がそれを列挙する）;ピン留めされた名前空間を拡張する前に`spec/rigor/public_api_drift_spec.rb`をクロスリファレンスする。

## Gotchas（load-bearing、苦労して学んだもの）

- **ADR-46** —— `Runner#initialize`のivar事前シード（`@class_decl_paths_snapshot = {}`等）をヘルパに抽出**しない**こと;コンストラクタの外に移すと、エンジン自身のフロー解析からそれらが隠れ、`make check`が`snapshot.size`をnil-receiver偽陽性として自己フラグする。インラインに保つこと（コンストラクタは`AbcSize`のdisableを持つ）。
- **ADR-45** —— `@collect_stats`はデフォルトで真（キャッシュをこれでゲートできない;ヒットはnil統計を返す）;フリーズ済みプラグインへの遅延`@io_boundary ||=` → `FrozenError`（`instance_variable_get`を使う）;キャッシュの書き込み / シリアライズ失敗は握り潰される（実行を決して壊さない）。
- **ADR-24** —— セルフ呼び出し解決のcheck-rules*再実装*は、エンジン実際の解決（精度のために`module_function` / `Data.define`アクセサ / mixinを既に処理する）から乖離する → 135件のFP（リバート済み）。着地済みのルートは評価時`SelfCallResolutionRecorder`（「collect, don't recompute」）。
- **ADR-62 / ADR-63** —— `make verify`がゲートするのは`lib` + `plugins`のみ;**外部コーパスは依然として偽陽性を露呈しうる**、Rigorが誤って型付けするレシーバーから。ユニオン/nilableのundefined-methodルールはスカラールールの「推論された型と同程度にしか良くない」露出を継承する —— nilableスタディはmailでの`Hash | Hash`#pack FPを捕捉した（`compose_codepoints`が`Array`を誤って型付けした）。ユニオン / nilableレシーバー上のいかなる診断拡張を信頼する前にも、`rigor-survey`コーパス差分（`cd $proj; BUNDLE_GEMFILE=$rigor/Gemfile nix develop $rigor -c bundle exec $rigor/exe/rigor check --format json $paths`）を実行すること。さらに: 推論スキャナ（`PrecisionScanner` / `ProtectionScanner`）は`require "rigor"`で自動ロードされない（そのspecがそうするように明示的にrequireすること）;rubocopは注釈付きの`%<name>s`フォーマットトークンを強制する;そして`Data.define(:method, …)`メンバーは`Data#method`をシャドウする（`:method_name`を使う）。
- **セルフミューテーション（Product C、`tool/mutation/self_mutate.rb` —— `lib/rigor`自体をミューテートし、self-check ∪ Rigor自身のrspecでkillする）** —— `--coverage-gap`のツリー全体の穴のカウントは、**メソッドコールドネス**によるノイズ除去なしには無意味だ: Rubyの行カバレッジは複数行の式をその**最初の行**に計上するので、*カバー済み*の式の継続行（テスト済みの`to_h`のハッシュリテラルのエントリー）が未カバーとして読まれてしまう。穴は完全に未カバーの`def`の内側でのみカウントすること;クラスボディ／定数のサイトは除外する（ロジックではなくデータ）。このノイズ除去は`lib/rigor`の生のツリー全体カウントを**1969 → 22**にした（すべて`cli/mcp_command`内で、今や解消済み —— ユニットスイートはそれ以外メソッドレベルで完全）。テスト軸は**in-bundle**のrspecランナーを要する —— `with_unbundled_env`では**なく**、それは*外部*プロジェクトのGemfile向けでありRigor自身のスイートを壊すからだ。有効性層（カバー済みだがアサートされていない）は融合モードを介してファイルごとに進められ、ゼロではなく等価ミュータント（メッセージ / inspectテキスト）のフロアに収束する。生きたトラッカー: [`docs/notes/20260618-self-mutation-testing-plan.md`](../notes/20260618-self-mutation-testing-plan/);ロードマップのエントリーは §「Analyzer self-testing」の下にある。
- **bench-perf** —— Makeターゲットは`bench`ではなく`bench-perf`（素の名前は`bench/`データディレクトリと衝突する;ファイルは`.PHONY`なしの規約を保つ）。`release/x.y.z`へのプッシュでこれを走らせる`release-gate.yml`ワークフローは**`0.2.x`の試行中はアドバイザリー**だ —— レポートはするがマージをブロックしない（必須ゲートは`ci.yml`）;シグナルは依然としてリリース品質でレビューする価値がある。両方のベースライン（`bench/baseline.json`のパフォーマンスターゲット + `data/oss-sweep/mastodon-thresholds.json`）は**決定論的なシグナルがドリフトしたときだけ再較正される** —— v0.2.0カットはlibのアロケーションを≈1877万 / ピークRSS ≈232 MB / 壁時計13.75秒に、Mastodonの`app lib config`を468診断・最小精度0.4284に設定した;**v0.2.1は両方とも据え置いた**（アロケーション≈1930万は帯内に収まり、スイープはグリーン）。これらは余裕の少ない厳密カウント / 帯ゲートなので、精度やアロケーションの変化は設計上、**再較正されるまで**赤にフリップする。パフォーマンスは失敗した実行のログ内の**CIで計測されたLinux値**から再較正すること（アロケーションが決定論的なシグナル;**wall_sはノイジー → `gh run rerun --failed`が壁時計のみのフレークを片付ける。壁時計だけのためにベースラインを再較正してはならない** —— v0.2.1の唯一の赤はまさにこれだった）、そして**より高いカウントを容認する前にOSSスイープの診断を偽陽性についてdiffすること**（v0.2.0の再較正は3件の`StringScanner#[]`偽陽性を発見 → `data/core_overlay/string_scanner.rbs`経由で修正、しきい値へは容認していない）。

## オープンエンジニアリング項目

次の実装者が直接見ることで恩恵を受けるエンジン内部の項目。完全な需要駆動バックログは[`docs/ROADMAP.md`](../roadmap/) §「Future cycles」にある。

### ADR-52 — コンパイル済みプラグイン貢献ディスパッチ（完了 —— スライス1〜6が2026-06-10/11着地）

呼び出しごと / defごと / ファイルごと / ノードごとのすべてのプラグイン参照は、レジストリ構築時に実行ごとに一度コンパイルされるテーブルを介して、エンジンが既に保持する鍵でゲートされる —— プラグインコードは候補ヒット時にのみ走る。5つすべてのレガシー`flow_contribution_for`ユーザーが移行し（ARの「receivers-ゲートブロッカー」は**新しいゲート形式なしで**解決された —— ランタイムの`methods:` callableはレシーバー型を決して読まないので、既存のスライス4ゲートに適合する）、フックは**削除され**（ロード時`ArgumentError` + CHANGELOG移行ノート）、そしてエンジン所有の単一の`Plugin::NodeRuleWalk`がファイルごとに走る。スライスごとの完全な記録（コミットハッシュ、解決されたARブロッカー、委譲の教訓）は[ADR-52](../adr/52-compiled-plugin-contribution-dispatch/) + [`docs/ROADMAP.md`](../roadmap/) §「compiled plugin contribution dispatch」にある。需要ゲートの残り物のみ: ノードメジャー診断の再ソート（取らない —— バイト同一性を壊す）、そしてプロファイルがレシーバー祖先ウォークがホットだと示した場合の厳密メンバーシップSetゲートの精緻化。

### ADR-24 — 暗黙的selfメソッド呼び出し解決、残り

- **スライス4（レコーダー + `call.self-undefined-method`ルール、`:off`で出荷）—— 着地済みv0.1.17;WD4コーパスFP評価は2026-06-14に完了 → ルールは`:off`のまま、昇格不可**（[ノート](../notes/20260614-adr24-slice4-self-undefined-fp-eval/)）。評価は普遍ベース除外（バケット1、`Object`/`BasicObject`/`Kernel`、287件のコーパスFP）を着地させたが、**抽象 / テンプレートメソッドの基底クラスパターン**（バケット2、167件）が現在のクラスごとのゲートでは対処不能なFPであることを見出した。抽象ベースのFPが解決されるまで、**スタンドアロンのみのゲートをスーパークラス / includeチェーンへ拡張しない**こと —— 必要な形は**サブクラス認識ゲーティング**（見逃したメソッドが既知のサブクラスに定義されているかをレコーダーで記録し、そうなら抑制する）だ。解決されたclosed-classセルフ呼び出しに対する**arity診断**はスライス4の一部では**なかった**（undefined-methodのみ） —— ルールが実績を積んだ後の後続拡張。
- **クラスボディ内の非`Bot`一般採用** —— 解決されたセルフ呼び出しの戻り値型は、それが`Bot`であるときのみ採用される。精確な非`Bot`戻り値の無条件採用は`rigor check lib`を16診断リグレッションさせた（既存の呼び出し先戻り推論の不精度が下流で表面化した）;このフォローアップは、精確な型を採用してもそれらの不精度が表面化しないほど呼び出し先戻り推論が精確である必要がある。

### ARスコープボディのラムダ`self`

`scope :x, -> { select(...).group(...) }`のインスタンスラムダ内で、ラムダの`self`がモデルクラスにリバインドされる必要が依然ある。v0.1.12は通常のメソッドボディに対する暗黙的selfのクラス側解決をクローズした;ラムダボディは残る（ADR-26領域）。経験的なケースは[`docs/notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9.md`](../notes/20260523-mastodon-v4.5-regression-sweep-v0.1.9/) §「What is increasing」項目2にある。

### ADR-23 — `rigor triage`スライス4プラグイン認識器

残り: プラグインが自身の認識器（recognizer）を貢献できる`Plugin`フック（先送り）。（構造化された`receiver_type` / `method_name`フィールド + SKILL統合はv0.1.8 / v0.1.9サイクルで出荷。）

### 推論バジェット — 仕様表は未配線（Layer 1ドキュメント衛生は完了）

仕様の設定可能な`budgets:`表（[`docs/type-specification/inference-budgets.md`](../type-specification/inference-budgets/)）はv1向けに規範的でありながら**配線されていない** —— 実際に効いているカットオフは、ハードコードされた3つのサイレントガード（再帰の再入≈深さ1、祖先ウォーク100、HKT fuel 64）とADR-10の`budget_per_gem`だけ。**Layer 2は解決済み、そしてそれはバジェットではなかった:**大規模アプリのコストの崖は`rigor-activerecord`の4.2 M保持Stringリーク（v0.1.16で修正）で、`union_size`はメモリと無相関と反証された。バジェット配線は**需要先送り** —— バジェット型のコストを示すコーパスプロジェクトは存在しない;もし現れたら、まず2aの分布プローブを再実行する（[ADR-41 WD3](../adr/41-inference-budget-design/)）。`RIGOR_BUDGET_TRACE` / `RIGOR_HEAP_PROFILE` / `RIGOR_HEAP_TRACE`プローブは再利用可能。

### Stdlib RBSカバレッジギャップパターン + ステージ済みの上流PR

上流の`ruby/rbs`ギャップが単一の内部呼び出しサイトで表面化したとき、**（a'）**インソースの`# rigor:disable` + ライブラリのロードを好む;複数の呼び出しサイトまたはユーザー向けコードでは、**（b）**Rigor自身の`sig/`下の焦点を絞ったRBSオーバーレイ、または**（c）**上流`ruby/rbs`修正にエスカレートする。`references/rbs`ブランチ`widen-strscan-resolv-stdlib-sigs`（`StringScanner#[]`、`Resolv#initialize`を拡張）はステージ済み —— **ブランチプッシュ + `ruby/rbs` PR作成はユーザーのタスク**。

### Sig-gen（ADR-14）残りギャップ

`initialize`以外のソース（DB読み取り、設定、副作用）からivarが設定される`attr_reader`は依然`:untyped_return`を生成 → 手書きのsig。untypedレシーバーへの深いチェーンは`rbs collection install` / ADR-10の`source_inference:`。動的メソッド（`define_method`、DSLマクロ）はプロジェクトプラグイン。`update_existing`は兄弟の親/子クラスブロックを畳み込まない（回避策: ターゲットsigを削除 + 再生成）。`skills/rigor-project-init/references/04-sig-uplift.md`に記載。

### ADR-49コーパス経済フォローアップ（オプション）

2026-06-05のコーパス監査は、過剰情報がコーパスの唯一の系統的ドリフトであることを見出した;ADR-22のSKILLスケッチ肥大はトリミングされた（v0.1.17）。ADR-1 / ADR-16が残る長さの外れ値だが、その長さは監査によれば「弁護可能」（高ステークス）で、抽出は基礎的な根拠を分断するため —— **割に合わない**と評価、完全性のために記録、キューには入れない。
