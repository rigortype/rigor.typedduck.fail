---
title: "センサス走査のギャップ — いずれかを修正する前に3つの形状の規模を測る（#693）"
description: "rigortype/rigor docs/notes/20260909-census-walk-gap-movable-sites.mdの翻訳です。"
editUrl: "https://github.com/rigortype/rigor/edit/master/docs/notes/20260909-census-walk-gap-movable-sites.md"
sourcePath: "docs/notes/20260909-census-walk-gap-movable-sites.md"
sourceSha: "59748ec13e866f5409196fece3fdcdf0a707515d2dbfe23b0fc876c35fbb139b"
sourceCommit: "db7b23d42e9b47560438b67dfe16d53e03f70575"
sourceDate: "2026-09-09T22:02:58+09:00"
translationStatus: "translated"
sidebar:
  order: 20266909
---

ステータス: 計測ノート。[#693](https://github.com/rigortype/rigor/issues/693)は実装前にこれらの形状の規模を測ることを求めており、本ノートはその規模測定である。結論は**見送り**である；以下の唯一の設計コミットメントは「決定」に記録されたものである。

- 日付: 2026-09-09
- ツリー: `5ad2f450`の`master`、Flake経由のRuby 4.0.5
- 測定ツール: [`tool/probe-693/`](https://github.com/rigortype/rigor/blob/master/tool/probe-693/README.md)、生データは`tool/probe-693/results-20260909.json`

## 3つの形状の再現

`ScopeIndexer`は各ivar / cvarがどこで書き込まれたかを記録する事前パスを実行し、クラス内の別の場所での読み取りにシードできるようにしている。3つの書き込み位置が読み取りに決して到達しない。master上では3つすべてが`Dynamic[top]`と応答するが、対照群は精密に応答する:

```ruby
class Control                              # 対照群
  @@def_klass = nil
  def store = (@@def_klass = Post)
  def read_def_cvar = dump_type(@@def_klass)   # singleton(Post)
  def initialize = (@post = Post.new)
  def read_post = dump_type(@post)             # Post
end

class Census                               # A — クラス本体のcvar
  @@body_klass = Post
  def read = dump_type(@@body_klass)           # Dynamic[top]
end

class Compact                              # B — `class << self`
  class << self
    def configure = (@cfg = Post.new)
    def read_cfg = dump_type(@cfg)             # Dynamic[top]
  end
end

class SelfDef                              # B — `def self.x`、同一の機構
  def self.configure = (@cfg2 = Post.new)
  def self.read_cfg2 = dump_type(@cfg2)        # Dynamic[top]
end

Widget = Class.new do                      # C — 匿名クラス本体
  def initialize = (@thing = Post.new)
  def thing = dump_type(@thing)                # Dynamic[top]
end
```

イシューは2つの形状を名指している；プローブは`def self.x`を形状Bの一部として扱う。同じ機構であり同じ無回答だからだ。**A**は停止が早すぎる走査である——`walk_class_cvars`は`DefNode`でリターンし、クラス本体に対して`gather_cvar_writes`を決して呼び出さない。**B**は走査のギャップではまったくない: 書き込みは*収集されており*、`StatementEvaluator#seed_instance_ivars`が、本体がシングルトン本体であるという理由でシードを拒絶している（`return body_scope if singleton`）。**C**はプレフィックスのギャップである: トップレベルにおいて`collect_def_ivar_writes`は`qualified_prefix.empty?`でリターンする。

## なぜ診断差分ではなく可動サイトのプローブなのか

[#692](https://github.com/rigortype/rigor/pull/692)と同じ理由である: `Dynamic`レシーバーは漸進的にディスパッチするため、これらのいずれも`call.undefined-method`を発火させることができず、コーパス全体での診断の事前／事後差分は、その形状が遍在していようと不在であろうとゼロと読まれる。プローブはPrismのみを用い、意図的にRigorをループから外しているため、カウントは測定対象の解析器に依存しない。

判断基準となる列は**movable（可動）**である: 右辺値が復元可能（定数、`Const.new`、またはリテラル——不透明な右辺値は修正後も`Dynamic`を記録する）**かつ**、その名前の少なくとも1つの読み取りが**書き込みとは異なるメソッド内の**呼び出しのレシーバーとなっていること。メソッド間（cross-method）の条件こそが、真のギャップと支配的なイディオムを分けるものであり、母集団全体の3分の2を取り除く:

```ruby
def producer(id, ...)
  @producers ||= {}          # プローブが見る書き込み
  @producers[id.to_sym] = …  # 読み取り — 同一本体内であり、フローがすでに型付けしている
end
```

これは`lib/rigor/plugin/base.rb:113`であり、形状Bの605サイトの大部分がこのような形をしている。センサスのシードはそこでは何の得にもならない。

## 結果

14のターゲット、17,706個のパースされたファイル。`sites`は正確；`with_read`は**下限**（実行の外部にあるファイルで再オープンされたクラスは読み取りに寄与しない）；`movable`は**上限**（復元された型が診断に到達するかどうかは検査しない）。

### A — 決してセンサスされないクラス本体の`@@x = …`

| ターゲット | ファイル数 | サイト数 | 復元可能 | 読み取りあり | 可動 | 衝突 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| rigor `lib`、`plugins` | 674 | 0 | 0 | 0 | 0 | 0 |
| mastodon | 1,325 | 0 | 0 | 0 | 0 | 0 |
| gitlab | 11,344 | 11 | 11 | 11 | 11 | 0 |
| redmine | 346 | 15 | 12 | 10 | 7 | 0 |
| rails | 2,829 | 18 | 9 | 11 | 5 | 0 |
| mail | 111 | 5 | 4 | 4 | 3 | 0 |
| liquid | 63 | 2 | 2 | 2 | 1 | 0 |
| kramdown | 55 | 1 | 1 | 1 | 1 | 0 |
| dependabot-core、concurrent-ruby、haml、faraday、parser、rubocop-ast | 959 | 0 | 0 | 0 | 0 | 0 |
| **合計** | **17,706** | **52** | **39** | **39** | **28** | **0** |

### B — シードされない`class << self` / `def self.x`内のivar書き込み

| ターゲット | ファイル数 | サイト数 | 復元可能 | 読み取りあり | 可動 | 衝突 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| gitlab | 11,344 | 321 | 81 | 77 | 8 | 1 |
| rails | 2,829 | 152 | 58 | 52 | 4 | 2 |
| redmine | 346 | 36 | 17 | 26 | 5 | 0 |
| rigor `lib`、`plugins` | 674 | 29 | 12 | 8 | 2 | 0 |
| mastodon | 1,325 | 22 | 14 | 4 | 0 | 0 |
| faraday | 33 | 12 | 5 | 0 | 0 | 0 |
| dependabot-core | 540 | 8 | 3 | 6 | 3 | 0 |
| parser | 56 | 8 | 8 | 0 | 0 | 0 |
| concurrent-ruby | 178 | 6 | 4 | 4 | 2 | 0 |
| liquid | 63 | 5 | 1 | 4 | 1 | 0 |
| kramdown | 55 | 4 | 0 | 2 | 0 | 0 |
| haml、rubocop-ast | 152 | 2 | 1 | 1 | 0 | 0 |
| **合計** | **17,706** | **605** | **204** | **184** | **25** | **3** |

### C — `Class.new do … end`内のivar書き込み

| ターゲット | ファイル数 | サイト数 | 復元可能 | 読み取りあり | 可動 | 衝突 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| rails | 2,829 | 22 | 15 | 5 | 2 | 2 |
| dependabot-core | 540 | 9 | 2 | 9 | 0 | 0 |
| gitlab | 11,344 | 4 | 2 | 2 | 1 | 0 |
| その他すべて | 2,993 | 0 | 0 | 0 | 0 | 0 |
| **合計** | **17,706** | **35** | **19** | **16** | **3** | **2** |

## 裁定

**可動サイトは実在するが、すべて同一のサイトである**。形状Aの28サイトは例外なくプラグインマネージャー上のレジストリテーブルである——`Redmine::Activity.@@available_event_types`、`Redmine::WikiFormatting.@@formatters`、`Mail.@@delivery_interceptors`、`Kramdown::Parser::Kramdown.@@parsers`、そしてgitlabの5つの`Gitlab::Testing::*`ミドルウェア。推論ではなく実際のツリーで検証済み:

```
$ rigor type-of lib/redmine/activity.rb:42:9   # `@@available_event_types << event_type`
type:    Dynamic[top]
```

形状Bの25サイトは、1階層上のファセットにおける同一のイディオム（`@permissions`、`@registered_plugins`、`@scms`、`@stubs`）であり、形状Cの3サイトは`rails/…/test/`にある2つのRSpec近傍の`Class.new`ブロックと1つのgitlab設定ウォーカーである。

**そして、復元された型は1ホップで停止する**。右辺値の内訳がそれを物語っている: 3つの形状すべてを通じて、復元可能な右辺値は`[]`、`{}`、`Mutex.new`、`Hash.new { … }`——*要素*型がuntypedであるコレクションである。これを復元すると、`@@available_event_types`は`Dynamic[top]`から`Array[untyped]`に変わり、`<<`、`delete`、`include?`を解決した上で、要素を読み取る任意の処理に`untyped`を渡すことになる。したがって、得られるものは流播する型ではない；コーパス全体の28 + 25 + 3箇所のレシーバーにおいて、間違ったコレクションメソッドに対する抑止力（teeth）が得られるだけである——およそ300ファイルに1箇所であり、しかも現在すでに正しく動作しており事前にも事後にも何も報告しないコードの上での話である。

**偽陽性の観点からの、イシューの前提に対する1つの訂正**。 #693は「どちらも誤った回答を生成しない」と述べている。形状BとCについて、これは真ではない: 書き込みは失われるのではなく、*外側のクラスのインスタンスファセット*に対して記録される。`collect_def_ivar_writes`がファセット分割なしでクラスごとにセンサステーブルをキー付けしており、`class << self`のdefにはそれをシングルトンとしてマークするレシーバーが存在しないからだ。これらは両方とも正しいRubyであり、どちらもmaster上で発火する:

```ruby
class SingletonMix
  def initialize = (@state = Post.new)
  class << self
    def configure = (@state = Comment.new)   # warning: def.ivar-write-mismatch
  end
end

class Outer
  def initialize = (@own = Post.new)
  Inner = Class.new do
    def initialize = (@own = Comment.new)    # warning: def.ivar-write-mismatch
  end
end
```

`def self.x`は発火しない——書き込み不一致コレクターはその記述をシングルトンとして認識するが、`class << self`はそうではない。これは[#681](https://github.com/rigortype/rigor/issues/681)が扱ったのと同一の「2つの記法、1つの意味」の非対称性である。プローブはこの母集団を`collides`（ギャップ形状の書き込みが、同名の通常`def`の書き込みとセンサススロットを共有する）としてカウントする: **コーパス全体で5サイト**、`activesupport/lib/active_support/key_generator.rb:18,25`、`lib/gitlab/database/connection_timer.rb:22`、および2つのrailsテストファイルである。**現在はいずれも発火しない**——それぞれが1つの既知の型と1つの不透明な型をペアにしており、不一致チェックは見送られるからだ。形状からの推論ではなく、両方のファイルを実行してそれを確認した。

## 決定 — 着手する価値なし

**これらの形状は稀であり、復元された型は何も動かさないため、これは着手する価値がない**。具体的には、形状ごとに:

- **A**は3つの中で最も強力だが、依然として基準をクリアしない: 14ターゲット中6ターゲットで28の可動サイトがあり、それぞれ素のコレクションを復元する。それに対して、クラス本体の`@@x = nil`（3サイト: railsの`@@app`、`@@parallel_worker_id`、redmineの`@@listeners`）は、クラス内のそのcvarのすべての読み取りに`nil`をjoinすることになり、まさにADR-58 WD1の宣言由来（declaration-sourced）マークとC2のデッドライト除去がivarパスから排除するために構築されたwidening（型拡大）である。28のコレクションレシーバーのためにそのガードコストを支払うことは、偽陽性最優先（FP-first）ルールのもとで誤ったトレードオフである。
- **B**は走査の修正ではない。センサステーブルにファセット分割がない*からこそ*、`seed_instance_ivars`はシングルトン本体を見送っている。したがってこれを塞ぐことはテーブルを分割することを意味し——独自の偽陽性予算を伴う本物のエンジン変更である——25サイトのためであり、そのうち2つはRigor自身の`lib/`内にある。
- **C**は3つの可動サイトであり、うち2つは`test/`下にある。実際に必要なのはシードの逆である: 匿名クラスの書き込みが外側のクラスに帰属されるのをやめるべきである。

副産物こそが、オープンにしておく価値のある部分である。BとCにおけるファセットの混同は、精度のギャップではなく**誤った型**であり、両ファセットに異なる公称型が存在すれば、偽の`def.ivar-write-mismatch`が発生する一歩手前の状態にある。また、シードするよりもはるかに安価である: 書き込み不一致コレクターに対して`class << self`のdefをシングルトンとしてマークすることは記法の修正であり、テーブル分割ではない。その半分は独自のイシューとすべきであり、可動列ではなく`collides`列（5サイト、0発火）によって規模を測るべきである。

## 本ノートが行わないこと

- 可動サイトの*レシーバー*がRBS既知であるかどうかは検査しない。その必要はない: ここで復元されたすべての型はコアコレクションであるため、上限はすでに楽観的な読み取りであり、いずれにせよ結論は見送りである。
- `Struct.new do … end`や`class << SomeConstant`に対して同じ3つの形状の規模を測ることはしない。プローブは意図的に両方をスキップしている。
