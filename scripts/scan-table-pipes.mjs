#!/usr/bin/env node
// Guard against the table-cell pipe breakage (see escape-table-pipes.mjs):
// a `|` left unescaped inside an inline code span on a GFM table row, which
// micromark/remark-gfm mis-reads as a column separator and truncates the cell.
//
// The check is exactly "would escapeTablePipes() change this file?" — if so, a
// table row carries an unescaped code-span pipe. The expected baseline is zero.
// `pnpm sync:docs` / `sync:chibirigor` and the JA typography normalizer all
// apply the escape automatically, so a non-zero result means hand-authored
// content (almost always a JA translation under src/content/docs/ja/reference/)
// introduced one; fix it with:
//
//   node scripts/escape-table-pipes.mjs <file.md>
//
// Run over source (not the built HTML):
//   node scripts/scan-table-pipes.mjs "src/content/docs/**/*.md"
// With no args it scans the whole content tree.

import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { escapeTablePipes } from './escape-table-pipes.mjs';

const patterns = process.argv.slice(2);
const globs = patterns.length ? patterns : ['src/content/docs/**/*.md'];

const files = [];
for (const g of globs) {
  for await (const f of glob(g)) files.push(f);
}
files.sort();

let offending = 0;
for (const file of files) {
  const before = readFileSync(file, 'utf8');
  const after = escapeTablePipes(before);
  if (after === before) continue;
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  for (let i = 0; i < beforeLines.length; i++) {
    if (beforeLines[i] !== afterLines[i]) {
      offending++;
      console.log(`${file}:${i + 1}`);
      console.log(`   ${beforeLines[i].trim().slice(0, 120)}`);
    }
  }
}

console.log(
  offending === 0
    ? `\nOK: no unescaped table-cell code-span pipes in ${files.length} file(s).`
    : `\n${offending} table row(s) with an unescaped code-span pipe (run escape-table-pipes.mjs).`,
);
process.exit(offending === 0 ? 0 : 1);
