#!/usr/bin/env node
// One-shot helper: normalise Japanese-Western typography in JA reference pages.
// Applies these rules outside fenced code blocks:
//   - removes a single space that sits between Japanese and ASCII text
//   - rewrites `(...)` to `（...）` when the content contains Japanese
//   - rewrites `?` `!` to `？` `！` when they follow a Japanese character
// Markdown link URLs `[text](url)` are left intact via a lookbehind on `]`.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeTablePipes, tableRowLineSet } from './escape-table-pipes.mjs';

const JP = '[\\u3000-\\u303F\\u3040-\\u30FF\\u4E00-\\u9FFF\\uFF00-\\uFFEF々ー]';
const ASCII_RIGHT = '[A-Za-z0-9`(\\[*_]';
// Intentionally omit `.` so Markdown ordered-list markers (`1. text`) keep
// their required space; the digit before the period is enough to anchor
// other "filename / version / abbreviation" cases. Likewise omit `:` so
// YAML-style and Markdown label patterns (`text: 内容`, `**型仕様**: 型モデル`)
// keep their separating space. And omit `]` for the same label-separator
// reason: a bracketed tag like the language-picker label `[ja] 日本語` keeps
// its space so the CJK entries stay consistent with the Latin-script siblings
// (`[fr] Français`, `[pt-BR] Português`) that the rule never touches.
const ASCII_LEFT = '[A-Za-z0-9,;!?)`*_]';

if (import.meta.url === `file://${process.argv[1]}`) {
  await runCli();
}

async function runCli() {
  const projectRoot = fileURLToPath(new URL('..', import.meta.url));
  const targets = process.argv.slice(2).map((p) => path.resolve(projectRoot, p));
  if (!targets.length) {
    console.error('usage: normalize-ja-typography.mjs <file>...');
    process.exit(1);
  }

  for (const file of targets) {
    const original = await readFile(file, 'utf8');
    const transformed = transform(original);
    if (transformed === original) {
      console.log(`= ${path.relative(projectRoot, file)}`);
      continue;
    }
    await writeFile(file, transformed);
    console.log(`* ${path.relative(projectRoot, file)}`);
  }
}

function stripSpacesAroundJp(text) {
  let next = text;
  // Protect the space of a Markdown unordered-list bullet marker. `*` is an
  // ASCII_LEFT char (needed to collapse closing-emphasis↔Japanese, e.g.
  // **太字**こと), but at line-start it is also a bullet marker, and a bullet
  // whose first word is Japanese — `* 項目` — would otherwise collapse to
  // `*項目`, which Markdown renders as a literal `*` instead of a list item.
  // (`-`/`+` are already safe — they are not in ASCII_LEFT.) Mask the single
  // marker space, run the strip, then restore it. Mirrors AGENTS.md rule 6.
  // Matches only a lone `*` + one space (not `**bold` or `*italic*`).
  const BULLET = '\0B\0';
  next = next.replace(/^([ \t]*\*)[ ](?=\S)/gm, `$1${BULLET}`);
  next = next.replace(new RegExp(`(${JP})[ ]+(?=${ASCII_RIGHT})`, 'g'), '$1');
  next = next.replace(new RegExp(`(?<=${ASCII_LEFT})[ ]+(${JP})`, 'g'), '$1');
  next = next.split(BULLET).join(' ');
  return next;
}

export function transform(content) {
  // Pull off the YAML frontmatter so its colon-delimited fields are
  // never touched. A frontmatter block is `---` on the first line,
  // a body of arbitrary lines, then a closing `---` on its own line.
  let frontmatter = '';
  let body = content;
  if (content.startsWith('---\n')) {
    const closeIndex = content.indexOf('\n---', 4);
    if (closeIndex !== -1) {
      const afterClose = content.indexOf('\n', closeIndex + 4);
      const splitAt = afterClose === -1 ? content.length : afterClose + 1;
      frontmatter = content.slice(0, splitAt);
      body = content.slice(splitAt);
    }
  }

  const parts = body.split(/(^```[\s\S]*?^```)/gm);
  const transformedBody = parts
    .map((part, index) => (index % 2 === 1 ? part : transformProse(part)))
    .join('');
  // transformProse strips every `\|` (correct for prose code spans, where the
  // backslash would render literally). Re-add the escape on table-row code-span
  // pipes, where micromark/remark-gfm REQUIRES `\|` or the cell is truncated.
  return frontmatter + escapeTablePipes(transformedBody);
}

function unescapePipes(text) {
  // `\|` is the GFM escape that stops `|` from being read as a table column
  // separator. It is REQUIRED on a table row (micromark splits a row on every
  // unescaped `|` — even one inside a `` `code span` `` or between two spans —
  // unlike cmark-gfm), but elsewhere it is noise this site's renderer shows
  // literally:
  //
  //   - In bullet lists and prose (e.g. **Join `T \| U`**) the escape was
  //     never needed; the backslash was just carried over from the GFM source.
  //   - Inside a prose inline code span the `\` is NOT a Markdown escape
  //     character, so `` `T \| U` `` renders the backslash literally — stripping
  //     it gives the intended `` `T | U` ``.
  //
  // So strip `\|` only on lines that are NOT part of a GFM table; a table row's
  // escapes are load-bearing and must survive. (escapeTablePipes() in
  // `transform` additionally ADDS the escape to code-span pipes that upstream
  // left bare.) Fenced code blocks are already excluded by the caller (the
  // `parts.split` in `transform`), so their content is never passed here.
  const lines = text.split('\n');
  const tableRows = tableRowLineSet(lines);
  return lines
    .map((line, i) => (tableRows.has(i) ? line : line.replace(/\\\|/g, '|')))
    .join('\n');
}

function transformProse(text) {
  let next = text;
  next = unescapePipes(next);
  next = stripSpacesAroundJp(next);

  const jpRe = new RegExp(JP);
  const parenRe = /(?<!\])\((?:[^()\n]|\([^()\n]*\))*\)/g;
  let prev;
  do {
    prev = next;
    next = next.replace(parenRe, (match, offset, full) => {
      const inner = match.slice(1, -1);
      const before = full[offset - 1] ?? '';
      const after = full[offset + match.length] ?? '';
      if (jpRe.test(inner) || jpRe.test(before) || jpRe.test(after)) {
        return `（${inner}）`;
      }
      return match;
    });
  } while (next !== prev);

  // Re-run space removal: half→full paren conversion above may have introduced
  // `ASCII （JP` boundaries that the first pass couldn't see when the `(` was
  // still half-width. e.g. `tracking (仕様…)` → `tracking （仕様…）`, and the
  // remaining space between `tracking` and `（` needs to be dropped now.
  next = stripSpacesAroundJp(next);

  next = next.replace(new RegExp(`(${JP})\\?`, 'g'), '$1？');
  next = next.replace(new RegExp(`(${JP})!`, 'g'), '$1！');

  // Move a leading or trailing 。/… out of a **bold** span: a bold span should
  // neither begin nor end with sentence punctuation. ！ and ？ are intentionally
  // excluded — they stay inside the span (see the rule below).
  //   **foo。**       → **foo**。      (trailing)
  //   です**。内部**   → です。**内部**  (leading; this exact shape is what the
  //                                     earlier buggy version of THIS rule
  //                                     produced, so the rule now self-heals it)
  //
  // Two hazards this guards against:
  //   1. A literal ** / * documented inside an inline-code span (e.g. the `**`
  //      power operator in a method-coverage table) is NOT an emphasis marker.
  //      Mask inline code first so it cannot anchor a bogus span.
  //   2. A naive `**…。**` match can pair one span's CLOSING ** with the NEXT
  //      span's OPENING ** when the first span carries no trailing 。 (e.g.
  //      `**訂正告知**。…述べていた。**それは誤りだった**`), dragging an unrelated
  //      sentence-final 。 inside. Match COMPLETE spans left-to-right instead,
  //      and relocate punctuation only at the span's own edges.
  const codeSpans = [];
  // NUL never occurs in Markdown source, so a NUL-delimited index is a
  // collision-free placeholder: the bold-span regex treats it as opaque
  // content, and the restore step matches it back exactly.
  let masked = next.replace(/`[^`\n]*`/g, (m) => {
    codeSpans.push(m);
    return `\0${codeSpans.length - 1}\0`;
  });
  masked = masked.replace(
    /\*\*((?:[^*\n]|\*(?!\*))+?)\*\*/g,
    (m, inner) => {
      let lead = '';
      let trail = '';
      let body = inner;
      const lm = body.match(/^([。…]+)([\s\S]+)$/);
      if (lm) { lead = lm[1]; body = lm[2]; }
      const tm = body.match(/^([\s\S]+?)([。…]+)$/);
      if (tm) { body = tm[1]; trail = tm[2]; }
      return lead || trail ? `${lead}**${body}**${trail}` : m;
    },
  );
  next = masked.replace(/\0(\d+)\0/g, (_, i) => codeSpans[Number(i)]);

  // After ？ or ！, insert a space before the next word character so that the
  // following clause is not run together with the closing marker or the punctuation.
  // Handles bare punctuation, *italic*, and **bold** closing markers alike.
  //   *本当に？*そうです。  →  *本当に？* そうです。
  //   **本当に？**そうです。  →  **本当に？** そうです。
  //   本当に？そうです。  →  本当に？ そうです。
  const WORD_START = '[A-Za-z0-9\\u3040-\\u30FF\\u4E00-\\u9FFF]';
  next = next.replace(
    new RegExp(`(？|！)(\\*{0,2})(?=${WORD_START})`, 'g'),
    '$1$2 ',
  );
  return next;
}
