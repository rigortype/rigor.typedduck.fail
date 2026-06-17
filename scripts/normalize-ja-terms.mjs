#!/usr/bin/env node
// Enforce the settled, *deterministic* Japanese term conventions:
//   1. Katakana long-vowel (ー) DROP/KEEP unification.
//   2. Settled 1:1 katakana→kanji translations that are NOT sense-divergent.
//
// This is the term-level counterpart of `normalize-ja-typography.mjs`
// (which handles spacing/parens only). Run it after translating, on the
// touched files, then run the typography normaliser.
//
// What this script deliberately does NOT do:
//   - It does not add ruby / paren glosses (first-occurrence placement is a
//     judgement call — left to the translator).
//   - It does not touch sense-divergent terms, because a blind substitution
//     would mistranslate. These stay katakana and are decided in context:
//       アイデンティティ(≠同一性) / アサーション(≠表明) / リレーション(≠関係)
//       / グラウンドトゥルース(≠真値) / 単独の頑健性(一般語) / イミュータブル(保留)
//     Decisions & rationale: docs/ja/translation-glossary.md and
//     docs/ja/katakana-longvowel-ledger.md.
//
// Idempotent and code-aware (fenced + inline code untouched). Skips
// upstream-owned JA-native pages (frontmatter `sourceLanguage: "ja"`).
//
// Usage:  node scripts/normalize-ja-terms.mjs [files...]
//         (no args → all src/content/docs/ja/**/*.md)

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// --- 1. Long-vowel (ー) bases ---------------------------------------------
// DROP: drop the trailing ー (short form is the entrenched engineering form).
const DROP = ['パラメーター', 'ハンドラー', 'クラスター', 'ポインター', 'フィルター', 'コンパイラー', 'コンストラクター', 'ジェネレーター', 'アクセサー', 'セレクター', 'プロセッサー', 'セパレーター', 'コンテナー', 'インタープリター', 'スケジューラー', 'リゾルバー', 'シリアライザー', 'コンビネーター', 'フォーマッター', 'アキュムレーター', 'スキャナー', 'ディスクリプター', 'エディター', 'パーサー', 'プロバイダー', 'ドライバー', 'カウンター', 'アダプター', 'リファクター', 'クロージャー', 'フィクスチャー', 'プロシージャー', 'インフラストラクチャー', 'イテレーター', 'シグネチャー'].sort((a, b) => b.length - a.length);
// KEEP: add the trailing ー (everyday / agent word whose short form is awkward).
const KEEP = ['プロデューサ', 'コンシューマ', 'ウォーカ', 'メンバ', 'ファミリ', 'レイヤ', 'ディスパッチャ', 'レシーバ', 'サーバ', 'エントリ', 'サマリ', 'カテゴリ', 'ファクトリ', 'ディスカバリ', 'アドバイザリ', 'トリガ', 'アナライザ', 'ビルダ', 'メンテナ', 'プレースホルダ', 'バインダ', 'マネージャ', 'コントローラ'].sort((a, b) => b.length - a.length);

const transformRun = (run) => {
  let s = run;
  // Insert the long vowel only when the base is word-final within its
  // katakana run — i.e. NOT followed by another katakana. Guarding only
  // against a trailing ー is insufficient: a KEEP base can be the prefix
  // of an unrelated word (メンテナ↛メンテナンス "maintenance") or a compound
  // boundary (レシーバ↛レシーバイディオム "receiver idiom"), where inserting
  // ー corrupts the text. Agent-noun long vowels are word-final, so a
  // following katakana means it is not the word we mean to lengthen.
  for (const k of KEEP) s = s.replace(new RegExp(k + '(?![ァ-ヶー])', 'g'), k + 'ー');
  for (const d of DROP) s = s.split(d).join(d.slice(0, -1));
  return s;
};

// --- 2. Settled 1:1 term substitutions (longest / most specific first) -----
const TERMS = [
  ['マルチコントリビューター', '複数貢献者'],
  ['頑健性原則', 'ロバストネス原則'], // only the unambiguous compound; bare 頑健性 left alone
  ['堅牢性原則', 'ロバストネス原則'], // 2026-06 reversal; bare 堅牢性 left alone (def-page gloss keeps it)
  ['リターン型', '戻り値型'], // return type → 戻り値型 (settled house form; folds リターン型/返り値型/戻り型)
  ['返り値型', '戻り値型'],
  ['戻り型', '戻り値型'],
  ['インプットアダプタ', '入力アダプタ'],
  ['レコグナイザー', '認識器'],
  ['コンパレーター', '比較器'],
  ['エバリュエーター', '評価器'],
  ['マテリアライズ', '実体化'],
  ['トラバーサル', '走査'],
  ['タクソノミー', '分類体系'],
  ['ユニフィケーション', '単一化'],
  ['マルチセット', '多重集合'],
  ['プロヴェナンス', '由来'],
  ['プロビナンス', '由来'],
  ['アーリーリターン', '早期リターン'],
  ['ランゲージ', '言語'],
  ['コントリビューター', '貢献者'],
];

const normalize = (text) => {
  const parts = text.split(/(```[\s\S]*?```|`[^`]*`)/g);
  for (let i = 0; i < parts.length; i += 2) {
    let seg = parts[i];
    seg = seg.replace(/[ァ-ヶー]{2,}/g, transformRun); // long-vowel
    for (const [from, to] of TERMS) seg = seg.split(from).join(to); // term subs
    parts[i] = seg;
  }
  return parts.join('');
};

let files = process.argv.slice(2);
if (files.length === 0) {
  files = execSync('grep -rl "" src/content/docs/ja/ --include=*.md').toString().trim().split('\n');
}

let changed = 0;
for (const f of files) {
  let txt;
  try { txt = readFileSync(f, 'utf8'); } catch { continue; }
  if (/sourceLanguage:\s*"ja"/.test(txt)) continue; // upstream-owned JA-native
  const out = normalize(txt);
  if (out !== txt) { writeFileSync(f, out); changed++; console.log('  normalized ' + f); }
}
console.log(changed === 0 ? 'No term changes.' : changed + ' file(s) normalized.');
