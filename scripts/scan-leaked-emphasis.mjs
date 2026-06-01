#!/usr/bin/env node
// One-off diagnostic: find raw ** or *…* emphasis markers that leaked into
// rendered PROSE (i.e. outside code). Strips scripts/styles, fenced <pre>
// code, inline <code>, then all remaining tags (which also drops the
// data-code copy-button attribute), leaving visible prose text only.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync('find dist -name index.html', { encoding: 'utf8' })
  .trim()
  .split('\n');

function prose(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/data-code="[^"]*"/gi, '')      // copy-button code payload
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')   // fenced code blocks
    .replace(/<code[\s\S]*?<\/code>/gi, ' ') // inline code
    .replace(/<[^>]+>/g, ' ')                // all remaining tags + attrs
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");
}

const doubleStar = [];
const singleStar = [];

for (const f of files) {
  const text = prose(readFileSync(f, 'utf8'));

  // ** anywhere in prose
  let m;
  const dbl = /(.{0,35})\*\*(.{0,35})/gs;
  while ((m = dbl.exec(text))) {
    doubleStar.push({ f, ctx: (m[1] + '**' + m[2]).replace(/\s+/g, ' ').trim() });
  }

  // emphasis-like single *…* on one line (no ** involved), e.g. *word* in prose
  const sgl = /(^|[^*])\*([^*\s][^*\n]{0,40}?)\*(?!\*)/g;
  while ((m = sgl.exec(text))) {
    const seg = m[0].replace(/\s+/g, ' ').trim();
    singleStar.push({ f, ctx: seg });
  }
}

console.log(`### Raw ** in prose: ${doubleStar.length} occurrence(s)`);
for (const d of doubleStar) console.log(`  [${d.f.replace('dist/', '')}]  …${d.ctx}…`);

console.log(`\n### Possible raw *…* emphasis in prose: ${singleStar.length} occurrence(s)`);
for (const s of singleStar) console.log(`  [${s.f.replace('dist/', '')}]  …${s.ctx}…`);
