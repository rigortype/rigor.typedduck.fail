#!/usr/bin/env node
// Guard against repo-root link breakage: a Markdown link that walks up out of
// the docs tree into the upstream monorepo's repo-root directories — plugin and
// example *sources* (`../../plugins/rigor-sorbet/`, `../../examples/rigor-web/`),
// or `lib/`, `sig/`, `spec/`, `references/`, `data/`, … Those paths have NO
// on-site route, so every such link 404s. The published plugin *reference* pages
// live at `/manual/plugins/<slug>/`; everything else belongs to the upstream
// GitHub repo.
//
// The sync rewriter (scripts/sync-rigor-docs.mjs) already produces correct links
// for the generated EN tree and the ja-native pages it regenerates. This script
// guards the hand-authored content the repo OWNS and the sync never rewrites:
// the JA translations under `src/content/docs/ja/**` and the English overrides
// under `translations/en/**`.
//
// Detection is ROUTE-aware (unlike the docs-relative sync rewriter, which must
// only ever run on upstream source — see the note in rewriteMarkdownLinks). We
// resolve each relative link against the page's route, strip the locale prefix,
// and flag it only when its first segment is a repo-root source dir
// (REPO_SOURCE_DIRS) — so `manual/…`, `adr/…`, `handbook/…` cross-links, and
// malformed `../docs/…` refs, are never touched, but `plugins/`, `lib/`, `sig/`,
// `spec/`, … are.
//
//   node scripts/scan-source-links.mjs                       # scan whole tree
//   node scripts/scan-source-links.mjs --fix <glob> [glob…]  # rewrite in place
//
// With no globs it scans `src/content/docs/**/*.md`. `--fix` retargets a bare
// `plugins/<slug>` with a published reference page to that on-site page and
// sends every other escape to the upstream GitHub repo (mirroring githubSourceUrl
// in sync-rigor-docs.mjs). Run scan-only after a build; baseline is zero.

import { readFileSync, writeFileSync } from 'node:fs';
import { glob, readdir } from 'node:fs/promises';
import path from 'node:path';
import { REPO_SOURCE_DIRS } from './repo-source-dirs.mjs';

const GH = 'https://github.com/rigortype/rigor';
const LINK_RE = /\]\((?![a-z][a-z+.-]*:|\/|#)([^)\s]+?)(#[^)]+)?\)/gi;
// `--fix` only: a bare `plugins/<slug>` directory linked as an absolute GitHub
// URL, where <slug> has a published manual reference page. Hand-authored JA
// translations sometimes point such references at the English GitHub source; we
// retarget them to the on-site (localized) manual page so EN and JA agree and JA
// readers stay on the JA reference page. `<slug>/README.md` and deeper source
// paths do NOT match, so genuine source links are left alone.
const ABS_PLUGIN_RE = /\]\(https:\/\/github\.com\/rigortype\/rigor\/(?:blob|tree)\/master\/plugins\/(rigor-[a-z0-9-]+)\/?(#[^)]+)?\)/gi;

const argv = process.argv.slice(2);
const fix = argv.includes('--fix');
const globs = argv.filter((a) => a !== '--fix');
const patterns = globs.length ? globs : ['src/content/docs/**/*.md'];

const contentRoot = 'src/content/docs';
const manualPluginSlugs = {
  '': await readManualPluginSlugs(path.join(contentRoot, 'manual', 'plugins')),
  ja: await readManualPluginSlugs(path.join(contentRoot, 'ja', 'manual', 'plugins')),
};
const files = [];
for (const g of patterns) {
  for await (const f of glob(g)) files.push(f);
}
files.sort();

let offending = 0;
let fixed = 0;
for (const file of files) {
  const before = readFileSync(file, 'utf8');
  const route = routeForFile(file);
  if (!route) continue;

  let changed = false;
  let after = before.replace(LINK_RE, (match, target, hash = '') => {
    const verdict = classify(route, target);
    if (!verdict) return match;
    offending += 1;
    const lineNo = before.slice(0, before.indexOf(match)).split('\n').length;
    console.log(`${file}:${lineNo}  ${target}${fix ? `  ->  ${verdict.replacement}` : ''}`);
    if (!fix) return match;
    changed = true;
    fixed += 1;
    return `](${verdict.replacement}${hash})`;
  });

  // Parity cleanup (fix-only): retarget bare plugin-source GitHub URLs that have
  // an on-site manual reference page. Not a 404, so it is never reported as a
  // scan failure — only rewritten under --fix.
  if (fix) {
    after = after.replace(ABS_PLUGIN_RE, (match, slug, hash = '') => {
      const replacement = manualLinkFor(route, slug);
      if (!replacement) return match;
      changed = true;
      fixed += 1;
      console.log(`${file}  plugins/${slug} (GitHub) -> ${replacement}`);
      return `](${replacement}${hash})`;
    });
  }

  if (fix && changed) writeFileSync(file, after);
}

if (fix) {
  console.log(`\n${fixed} link(s) rewritten across ${files.length} file(s).`);
  process.exit(0);
}
console.log(
  offending === 0
    ? `\nOK: no repo-root source escapes in ${files.length} file(s).`
    : `\n${offending} broken repo-root link(s) (run with --fix or correct by hand).`,
);
process.exit(offending === 0 ? 0 : 1);

// Resolve `target` against the page route; return null when the link is fine, or
// { replacement } when it escapes to a repo-root path with no on-site route.
function classify({ routeStr, locale }, rawTarget) {
  const target = rawTarget.replace(/\\/g, '/');
  const resolved = path.posix.normalize(path.posix.join(routeStr, target));
  if (resolved.startsWith('../')) return null; // over-escapes above the content root; leave as-is
  // Strip the locale prefix so `ja/lib/x` and `lib/x` are treated alike.
  const inLocaleRaw = locale && resolved.startsWith(`${locale}/`)
    ? resolved.slice(locale.length + 1)
    : resolved;
  // `normalize` preserves a trailing slash; drop it for segment matching.
  const inLocale = inLocaleRaw.replace(/\/$/, '');
  if (!inLocale) return null;

  const firstSeg = inLocale.split('/')[0];
  if (!REPO_SOURCE_DIRS.has(firstSeg)) return null; // a real on-site route, or a malformed ref we leave alone

  const isDir = target.endsWith('/');
  const rest = inLocale.length > firstSeg.length ? inLocale.slice(firstSeg.length + 1) : '';

  // A bare `plugins/<slug>` directory with a published manual reference page →
  // on-site page.
  if (firstSeg === 'plugins' && /^[^/.]+$/.test(rest)) {
    const replacement = manualLinkFor({ routeStr, locale }, rest);
    if (replacement) return { replacement };
  }

  // Everything else → upstream GitHub. Preserve the authored trailing slash to
  // pick tree (directory) vs blob (file).
  return { replacement: `${GH}/${isDir ? 'tree' : 'blob'}/master/${inLocale}${isDir ? '/' : ''}` };
}

// Relative on-site link from `routeStr` to the localized manual reference page
// for `slug`, or null when that slug has no published reference page.
function manualLinkFor({ routeStr, locale }, slug) {
  const slugs = manualPluginSlugs[locale] ?? new Set();
  if (!slugs.has(slug)) return null;
  const targetRoute = locale ? `${locale}/manual/plugins/${slug}` : `manual/plugins/${slug}`;
  return `${path.posix.relative(routeStr, targetRoute)}/`;
}

function routeForFile(file) {
  const posixPath = file.split(path.sep).join('/');
  let rel;
  if (posixPath.includes('src/content/docs/')) {
    rel = posixPath.slice(posixPath.indexOf('src/content/docs/') + 'src/content/docs/'.length);
  } else if (posixPath.includes('translations/en/')) {
    // English overrides map onto the root-locale EN tree route.
    rel = posixPath.slice(posixPath.indexOf('translations/en/') + 'translations/en/'.length);
  } else {
    return null;
  }
  const segments = rel.replace(/\.md$/i, '').split('/');
  const last = segments.at(-1)?.toLowerCase();
  if (last === 'index' || last === 'readme') segments.pop();
  const routeStr = segments.join('/');
  const locale = segments[0] === 'ja' ? 'ja' : '';
  return { routeStr, locale };
}

async function readManualPluginSlugs(dir) {
  const slugs = new Set();
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return slugs;
    throw error;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;
    const base = entry.name.replace(/\.md$/i, '');
    if (base.toLowerCase() === 'index' || base.toLowerCase() === 'readme') continue;
    slugs.add(base);
  }
  return slugs;
}
