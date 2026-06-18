#!/usr/bin/env node
// One-off: restamp a translation's recorded sourceSha/sourceCommit from its
// regenerated EN counterpart, WITHOUT touching the body. Used when a
// sync-rigor-docs.mjs change alters only link *rendering* (not upstream prose),
// which shifts the EN body hash and makes check-translations.mjs report false
// drift for pages whose translation is in fact current. Only run on pages whose
// body has been verified equivalent (here: scan-plugin-links is clean and the
// page was in sync before the rewriter change).
//
//   node scripts/restamp-translation-sha.mjs <en-relpath> [<en-relpath> …]
//
// Forward (EN-native) pages restamp src/content/docs/ja/<relpath>; ja-native
// pages restamp translations/en/<relpath>.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const docs = 'src/content/docs';
const rels = process.argv.slice(2);
if (!rels.length) {
  console.error('usage: restamp-translation-sha.mjs <en-relpath> ...');
  process.exit(1);
}

function field(src, key) {
  return new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(src)?.[1]?.trim();
}
function setField(src, key, valueLiteral) {
  const re = new RegExp(`^(${key}:\\s*).*$`, 'm');
  if (!re.test(src)) throw new Error(`no ${key} in target frontmatter`);
  return src.replace(re, `$1${valueLiteral}`);
}

for (const rel of rels) {
  const enPath = path.join(docs, rel);
  const enSrc = readFileSync(enPath, 'utf8');
  const sha = field(enSrc, 'sourceSha');
  const commit = field(enSrc, 'sourceCommit');
  const lang = field(enSrc, 'sourceLanguage');
  if (!sha) throw new Error(`no sourceSha in ${enPath}`);

  const targetPath = lang === '"ja"' || lang === 'ja'
    ? path.join('translations/en', rel)
    : path.join(docs, 'ja', rel);

  let target = readFileSync(targetPath, 'utf8');
  const before = target;
  target = setField(target, 'sourceSha', sha);
  if (commit) target = setField(target, 'sourceCommit', commit);
  if (target === before) {
    console.log(`= ${targetPath} (already current)`);
    continue;
  }
  writeFileSync(targetPath, target);
  console.log(`✓ ${targetPath}  sourceSha=${JSON.parse(sha).slice(0, 8)}`);
}
