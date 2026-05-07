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

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const targets = process.argv.slice(2).map((p) => path.resolve(projectRoot, p));
if (!targets.length) {
  console.error('usage: normalize-ja-typography.mjs <file>...');
  process.exit(1);
}

const JP = '[\\u3000-\\u303F\\u3040-\\u30FF\\u4E00-\\u9FFF\\uFF00-\\uFFEF々ー]';
const ASCII_RIGHT = '[A-Za-z0-9`(\\[*_]';
const ASCII_LEFT = '[A-Za-z0-9.,;:!?)\\]`*_]';

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

function transform(content) {
  const parts = content.split(/(^```[\s\S]*?^```)/gm);
  return parts
    .map((part, index) => (index % 2 === 1 ? part : transformProse(part)))
    .join('');
}

function transformProse(text) {
  let next = text;
  next = next.replace(new RegExp(`(${JP})[ ]+(?=${ASCII_RIGHT})`, 'g'), '$1');
  next = next.replace(new RegExp(`(?<=${ASCII_LEFT})[ ]+(${JP})`, 'g'), '$1');

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

  next = next.replace(new RegExp(`(${JP})\\?`, 'g'), '$1？');
  next = next.replace(new RegExp(`(${JP})!`, 'g'), '$1！');
  return next;
}
