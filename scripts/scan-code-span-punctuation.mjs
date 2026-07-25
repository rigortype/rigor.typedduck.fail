#!/usr/bin/env node
// Guard against Japanese prose punctuation leaking INTO an inline code span.
//
// A code span is code: it must keep half-width `(` `)` and `,` even when the
// surrounding prose is Japanese (AGENTS.md, Japanese typography rule 4 — "code
// fences and inline code are exempt"). A span like `（スロット,キー）` where the
// English source reads `(slot, key)` is a corrupted code sample, not a style
// choice.
//
// This existed because the rule was documented but not enforced:
// normalize-ja-typography.mjs ran its CJK/ASCII space strip and its
// full-width-paren conversion over whole lines, reaching inside code spans and
// rewriting them. That is fixed (the prose rules now mask code spans first),
// and this scanner is the regression guard.
//
// Expected baseline is ZERO. A hit is repaired by hand against the English
// source — the words stay Japanese, only the punctuation is restored.
//
//   node scripts/scan-code-span-punctuation.mjs                 # owned JA trees
//   node scripts/scan-code-span-punctuation.mjs "src/**/*.md"

import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const FENCE = /^\s*(```|~~~)/;
// Full-width parens and the ideographic comma never belong in code. A bare `,`
// followed directly by a CJK character is the other fingerprint of the old bug:
// the space after it was eaten because the next character was Japanese.
const SUSPECT = /[（）、]|,(?=[぀-ヿ一-鿿])/;

/**
 * CommonMark-style code-span tokenizer: a run of N backticks closed by the next
 * run of exactly N. A naive `/`[^`]*`/g` mis-pairs on lines with an odd number
 * of runs and reports prose as if it were code.
 */
function codeSpans(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '`') { i += 1; continue; }
    let n = 1;
    while (line[i + n] === '`') n += 1;
    let j = i + n;
    let close = -1;
    while (j < line.length) {
      if (line[j] === '`') {
        let m = 1;
        while (line[j + m] === '`') m += 1;
        if (m === n) { close = j; break; }
        j += m;
      } else {
        j += 1;
      }
    }
    if (close === -1) { i += n; continue; }
    out.push(line.slice(i + n, close));
    i = close + n;
  }
  return out;
}

const patterns = process.argv.slice(2);
const globs = patterns.length
  ? patterns
  : ['src/content/docs/ja/**/*.md', 'translations/**/*.md'];

const files = [];
for (const g of globs) {
  for await (const f of glob(g)) files.push(f);
}
files.sort();

let offending = 0;
let scanned = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  // Upstream-owned JA-native pages are regenerated from upstream on every sync
  // and are not this repo's to normalise (see translation-glossary.md).
  if (/sourceLanguage:\s*"ja"/.test(text)) continue;
  scanned += 1;

  const lines = text.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (FENCE.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    // An odd number of backticks means the line cannot be tokenized reliably;
    // reporting it would be noise, not a finding.
    if ((line.match(/`/g) ?? []).length % 2) continue;

    for (const span of codeSpans(line)) {
      if (!SUSPECT.test(span)) continue;
      offending += 1;
      console.log(`${file}:${i + 1}`);
      console.log(`   \`${span}\``);
    }
  }
}

console.log(
  offending === 0
    ? `\nOK: no Japanese prose punctuation inside a code span in ${scanned} file(s).`
    : `\n${offending} code span(s) carry Japanese prose punctuation (repair against the English source).`,
);
process.exit(offending === 0 ? 0 : 1);
