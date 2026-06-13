#!/usr/bin/env node
// Escape unescaped `|` that appears inside an inline code span within a GFM
// table row, rewriting it to `\|`.
//
// Why this is needed on THIS site. Astro renders Markdown through
// micromark / remark-gfm, whose table tokenizer splits a row on EVERY
// unescaped `|` — even one inside a `` `code span` ``. So a cell like
// `` `T | U` `` is mis-split: the text after the pipe is dropped (the row is
// truncated to the header's column count) and the now-unbalanced backticks can
// leak `<...>` to the HTML parser as raw tags. cmark-gfm / mdBook (what
// upstream Rigor renders with) instead protect code-span pipes, which is why
// the same source renders fine upstream and breaks here.
//
// `\|` renders as a literal `|` on BOTH engines (the backslash is consumed by
// the table-cell escape, not shown), so escaping is the universally-correct,
// lossless fix. This transform is idempotent, fence-aware and frontmatter-aware,
// and only ever touches lines that are part of a GFM table block.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DELIMITER_ROW =
  /^\s{0,3}\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const FENCE = /^\s*(```|~~~)/;

// True for the line indices that belong to a GFM table block: the header row,
// the delimiter row, and the contiguous body rows beneath it. Fenced blocks and
// a leading YAML frontmatter block are excluded.
export function tableRowLineSet(lines) {
  const rows = new Set();
  let inFence = false;
  let inFrontmatter = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.trim() === '---') { inFrontmatter = true; continue; }
    if (inFrontmatter) {
      if (line.trim() === '---') inFrontmatter = false;
      continue;
    }
    if (FENCE.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (!DELIMITER_ROW.test(line)) continue;
    const header = lines[i - 1];
    // A real table needs a pipe in the header (this also rules out a bare
    // `---` thematic break sitting under a plain prose line).
    if (header === undefined || !header.includes('|')) continue;
    if (!line.includes('|') && !header.includes('|')) continue;
    rows.add(i - 1); // header
    rows.add(i); // delimiter
    for (let j = i + 1; j < lines.length; j++) {
      const row = lines[j];
      if (!row.trim() || !row.includes('|') || FENCE.test(row)) break;
      rows.add(j);
    }
  }
  return rows;
}

// Escape every `|` inside the content of an inline code span on a single line.
// A code span is a run of N backticks closed by the next run of exactly N
// backticks; an unterminated run is left untouched.
function escapeCodeSpanPipesInLine(line) {
  let out = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '`') { out += line[i++]; continue; }
    let n = 1;
    while (line[i + n] === '`') n++;
    // find a closing run of exactly n backticks
    let j = i + n;
    let close = -1;
    while (j < line.length) {
      if (line[j] === '`') {
        let m = 1;
        while (line[j + m] === '`') m++;
        if (m === n) { close = j; break; }
        j += m;
      } else {
        j++;
      }
    }
    if (close === -1) {
      out += line.slice(i, i + n);
      i += n;
      continue;
    }
    const fence = '`'.repeat(n);
    const content = line.slice(i + n, close);
    out += fence + escapePipes(content) + fence;
    i = close + n;
  }
  return out;
}

// Replace each `|` not already escaped with `\|`. Idempotent and safe for
// consecutive pipes (`||` -> `\|\|`).
function escapePipes(content) {
  let out = '';
  for (let k = 0; k < content.length; k++) {
    const c = content[k];
    if (c === '|' && !(k > 0 && content[k - 1] === '\\')) {
      out += '\\|';
    } else {
      out += c;
    }
  }
  return out;
}

export function escapeTablePipes(markdown) {
  const lines = markdown.split('\n');
  const rows = tableRowLineSet(lines);
  if (rows.size === 0) return markdown;
  for (const i of rows) {
    if (lines[i].includes('`')) {
      lines[i] = escapeCodeSpanPipesInLine(lines[i]);
    }
  }
  return lines.join('\n');
}

// CLI: rewrite each file argument in place, reporting changed files.
function main(argv) {
  const files = argv.slice(2);
  if (files.length === 0) {
    console.error('usage: node scripts/escape-table-pipes.mjs <file.md> [...]');
    process.exit(1);
  }
  let changed = 0;
  for (const file of files) {
    const before = readFileSync(file, 'utf8');
    const after = escapeTablePipes(before);
    if (after !== before) {
      writeFileSync(file, after);
      changed++;
      console.log(`escaped table pipes: ${file}`);
    }
  }
  console.log(`\n${changed} file(s) changed.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv);
}
