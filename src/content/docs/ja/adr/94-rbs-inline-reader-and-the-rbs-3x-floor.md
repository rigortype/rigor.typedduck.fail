---
title: "ADR-94 — インラインRBSリーダー: `RBS::InlineParser`とrbs 3.x下限"
description: "rigortype/rigor docs/adr/94-rbs-inline-reader-and-the-rbs-3x-floor.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/adr/94-rbs-inline-reader-and-the-rbs-3x-floor.md"
sourcePath: "docs/adr/94-rbs-inline-reader-and-the-rbs-3x-floor.md"
sourceSha: "705fc42efa7246bbd316b5d585110cfa9c00f58779bb6937dfd9a554c0aabb51"
sourceCommit: "78b18cea6a576475c92bce020535269f2eebc20d"
translationStatus: "translated"
sidebar:
  order: 4094
---

Status: <strong>Accepted、2026-07-16。WD2は2026-07-17に訂正・クローズ。</strong>rbs 4.0がインライン実装を吸収し、それは[ADR-32](../32-rbs-inline-comment-ingestion/)がプラグイン境界を選んだ前提を溶かす。そこへ移行するのは正しい方向であり、**先送り**されている: それはrbs 3.x下限を犠牲にするが、その下限を落とすことはv0.3.0でもその近辺のバージョンでも計画されていない。`rigor-rbs-inline`プラグインがリーダーであり続ける。WD2の`UntypedFunction`欠陥は本物であり、記録どおり移行とは独立していた── だが、このADRはその発生箇所と症状を誤認しており、再裁定はそれが手書きの`.rbs`より広いことを発見した。それは修正済みである。実際に真であったことについてはWD2を参照。

根拠: [`docs/notes/20260716-dspec-formal-spec-substrate-evaluation.md`](../../notes/20260716-dspec-formal-spec-substrate-evaluation/) § 「ADR-93 WD1の実装」および以下の測定。

## Context

soutaroは[soutaro/rbs-inline#9](https://github.com/soutaro/rbs-inline/issues/9)（2024-05）で`rbs-inline` gemをプロトタイプと呼んだ:「実装はrbs-gemにマージされる」。実際にそうなった。rbs 4.0.0は`RBS::InlineParser`、`RBS::Source::Ruby`、およびそれに対する`Environment#add_source`のサポートを出荷する。rbs 3.9.4以前はそのいずれも出荷しない。

ADR-32 WD1は、インラインコメントをコアで読むことを却下した。それは`rbs-inline`をコアのランタイム依存にしてしまい、[ADR-0](../0-concept/)の依存ゼロの姿勢に反するためであり、代わりにプラグイン境界を選んだ。**`rbs`はすでにコア依存である**ので、`rbs`の中に住むリーダーはWD1の反論に答える。それはまた、[ADR-93](../93-default-rbs-inline-ingestion/)のWD2（プラグインのデフォルト配線）とWD3（スタンドアロンの残余、これは`gem install rigortype`が`rbs-inline`を持たないためだけに存在する）を退役させるであろう。

2026-07-16に測定、rbs 4.0.3対rbs-inline 0.14.0:

| ソース | rbs-inline 0.14.0 | `RBS::InlineParser` |
| --- | --- | --- |
| アノテーションなし | `def f: (untyped x) -> untyped` | `(?) -> untyped` |
| 本物のアノテーション | 尊重される | 尊重される |
| `def f #:nodoc:` | `-> nodoc`、何も宣言しない型 | `AnnotationSyntaxError`、メソッドはuntypedのまま |
| 1つのクラス内のアノテーション＋`#:nodoc:` | クラスのビルドが失敗し、すべてのアノテーションが失われる | アノテーションが生き残る |

PR #113の両方のワークアラウンドは、`RBS::InlineParser`が持たない欠陥に対処している。スケルトンの行が要となるものであり、害は決して`untyped`の**戻り値**ではなかった: `(untyped x)`はアリティ（arity）とパラメータ型を宣言し、それが推論に勝る（`"A"`は`Dynamic[top]`に劣化する）。一方`(?)`（`RBS::Types::UntypedFunction`）は何も主張せず、推論をそのままにする。この区別が、mailがrbs-inlineのオプトアウトモードの下で26 → 42へ動き、rbsのモードの下ではそうならないであろう理由である。

## Decision

> **ワークアラウンドがすでに買っている正しさを買うだけの依存移行は、サポートされるツールチェーン範囲を狭めることを正当化しない**。

移行のコストのすべては、rbs 3.x下限である。その便益は、機能する2つのワークアラウンドを削除することである。[ADR-79](../79-rbs-version-range-over-pinned-determinism/)は、Rigorはプロジェクトが実際に解決するツールチェーンに対してチェックするという原則に基づき、範囲を`rbs >= 3.0, < 5.0`に固定した。4.xへ狭めると、それより下にピン留めされたすべてのプロジェクトが切り捨てられ、PR #22の`Gemfile.rbs-compat`マトリクス（`~> 3.10` ∧ `~> 4.0`）は、その幅を正直に保つために存在する。約40行のプラグインコードを削除するためにそれを支払うのは、トレードを逆転させている。

## Working decisions

**WD1 — `rigor-rbs-inline`プラグインがリーダーであり続ける**。ADR-32は、ADR-93 WD1によって修正された形で有効なままである。アノテーション存在ゲートとRDoc無害化は残る。どちらも移行時には削除されるが、いずれも移行を強いるほど要とはならない。

**WD2 — `UntypedFunction`欠陥は別個のバグであり、独立して投入される。書かれたとおりでは正しいが、細部のすべてで誤り。2026-07-17修正**。このワーキングディシジョンが下した判断── 欠陥は移行とは独立しており、移行なしに到達可能で、単独で投入される── は成り立った。再裁定（2026-07-17、主張が再現しないことを契機とする）はバグを確認し、それについて3つのことを訂正した:

- **クラッシュではない**。`rigor check`は決して死ななかった。`NoMethodError`は送出され、その後ディスパッチャーの広い`rescue StandardError`節の1つに飲み込まれたので、ディスパッチは`Dynamic[top]`に機能低下し、メソッドの**宣言された戻り値型がサイレントに破棄された**。`(?) -> String`のメソッドがuntypedとして型付けされた。サイレントな精度の喪失が症状であり、それが、元のプローブが再現しないクラッシュとして読めた理由である。
- **`Analysis::CheckRules`ではない**。そのパスはすでにガードされており、このADRが書かれる前からそうであった: `arity_eligible?`と`argument_check_eligible?`はどちらも`respond_to?(:required_keywords)`を通じて撤退し、それぞれuntyped関数のケースを理由として文書化している。ガードされていなかった箇所は`MethodDispatcher::ReceiverAffinity`のプリソートであり、それはレシーバー親和性でオーバーロードを並べ替える際に`required_positionals`に手を伸ばした── セレクタの上流であり、それがセレクタレベルのガードでは捕まえられなかった理由である。`OverloadSelector`自身のアリティパスもガードされていなかったが、潜在的だった: プリソートが先に例外を送出したのである。
- **手書きの`.rbs`に限られない**。このADRは、トリガーがユーザーが`(?)`を書くこと「またはrbs 4.xのコアRBSがそれを採用すること」だと推測した。コアRBSはそれを**すでに**出荷している。`Proc#call`、`Method#call`、`Ractor.select`、`IO.for_fd`においてである── そのため欠陥は、`sig/`をまったく持たないプロジェクトに対する素の`rigor check`で発火した。`Proc#call`と`Method#call`はいずれにせよ`untyped`を返すが、それがおそらく、この喪失がこれほど長く不可視のままだった理由である。

修正は、その形が含意する撤退で各箇所をガードする: 比較すべき親和性がない、強制すべきアリティがない、zipすべき宣言済みパラメータがない── そして偽陽性にとって要となるのは、`(?)`が、本当に型付けされた兄弟オーバーロードに対してセレクタのstrictパスを決して勝ち取ってはならないことである。さもなければ、空のパラメータリストが「すべてのパラメータがstrict」を空虚に満たしてしまうためである。

**WD3 — レビュー中の決定はリーダーではなく下限である**。rbs 3.x下限が、移行を可能にするためではなく、それ自身の理由で動くときに、このADRを再オープンせよ。リーダーは下限に従う。

**WD4 — カバレッジは未測定であり、いかなる移行もゲートする**。上記の4ケースは調査ではなくプローブである。ADR-32の § Contextは、プラグインが無償で継承する文法を列挙している: 3つの形式のメソッド型、ジェネリクス、ミックスインジェネリクス（`include Foo #[String]`）、`@rbs inherits`、`@rbs override`、ブロック導入型、属性、インスタンス変数、定数、alias、`@rbs skip`、`@rbs!`の生RBS、`%a{…}`アノテーション。そのリストに対する`RBS::InlineParser`のカバレッジは未知である。未測定のサブセットで移行するのは、ワークアラウンドをサイレントな精度の喪失と引き換えにすることであり、それはより悪い取引である。

## Rejected / deferred alternatives

- **今移行してrbs 3.xを落とす**。却下: 下限が動く予定はなく、Decisionの基準は、ワークアラウンドと等価な便益は範囲の狭小化を買わないと述べている。
- **`#:nodoc:`修正とともに`rbs-inline`をvendorまたはforkする**。却下: PR #113の無害化が、公開・追跡すべきgemなしに、我々が所有するコードの内部ですでに同じ結果を得ている。
- **アノテーション文法をRigorで再実装する**。二重に却下: ADR-32 WD1/WD3の文法ドリフトの論拠が有効であり、かつ文法は`rbs-inline`から`rbs`へ移動の途中なので、再実装は移転しつつあるターゲットを追いかけることになる。
- **アノテーション存在ゲートをupstreamへ送る**。却下: `with_annotation`はrbs-inlineに1日だけ存在し（#18、その後`83aaf69a`）、upstreamの目的はスケルトンを求めている── `rbs-inline --output`は`sig/`を生成し、そこではdefごとのシグネチャが正しい。ゲートは、Rigorが推論優先であるがゆえのRigorの要件であって、upstreamのバグではない。

## Re-evaluation triggers

- rbs 3.x下限が無関係な理由で動く（Rigorが必要とするrbs 4のみの機能、またはエコシステム自身の3.xサポートの終了）。そのときリーダー移行は、ほぼゼロの限界コストで相乗りする。
- `RBS::InlineParser`が`rbs-inline` gemに欠けているケイパビリティを獲得し、移行がワークアラウンドの削除ではなく精度を買い始める。
- `rbs-inline` gemが、`rbs`における後継が実装する文法の追跡をやめ、プラグインの継承したカバレッジが腐り始める。

## Relationship to other ADRs

- **ADR-32** — これが保存するプラグイン境界。そのWD1の前提（リーダーは非コアのgemである）はもはや成り立たない。境界は今や、代わりにrbs 3.x下限に載っている。
- **ADR-79** — これが狭めることを拒む範囲と、その背後にある忠実性の原則を供給する。
- **ADR-93** — WD2/WD3は移行によって退役されるであろう。移行が先送りされている間、両者とも生きたままである。
- **ADR-0** — `rbs-inline`をプラグインにした依存ゼロの姿勢。`rbs`の内部のリーダーは、それを直接満たすであろう。
