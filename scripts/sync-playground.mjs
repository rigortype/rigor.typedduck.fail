#!/usr/bin/env node
// Sync the Rigor in-browser playground frontend into public/playground/.
//
// ADR-29 (rigor) WD9/WD10: the playground page is a self-contained static app
// that boots a ruby.wasm VM. It lives in the rigor repo at
// plugins/rigor-playground/wasm/index.html; this script copies it verbatim into
// public/playground/ (served at /playground/) and injects the URL of the wasm
// binary — which is hosted on Cloudflare R2, not committed here (it is ~70 MB,
// over the 25 MiB Workers Static Assets cap) — into the page's
// <meta name="rigor-wasm-url"> tag.
//
// The wasm URL is resolved (deploy env), in precedence order:
//   1. RIGOR_WASM_URL — an explicit, full URL (overrides everything).
//   2. RIGOR_WASM_BASE_URL — the R2 public root (r2.dev or a custom domain);
//      the object path is derived from the rigor commit the submodule is pinned
//      at, matching the playground-wasm workflow's R2 key
//      (playground/rigor-playground-<sha8>.wasm). This is the recommended
//      setup: set the base URL once, and every submodule bump points the page
//      at the matching version-pinned binary automatically.
//   3. neither set — the meta is left empty; the page falls back to a relative
//      path and reports a clear fetch error. The wiring is complete, only the
//      URL is pending.
import { execFile } from 'node:child_process';
import { access, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = path.resolve(projectRoot, process.env.RIGOR_SOURCE_DIR ?? 'upstream/rigor');
const sourcePage = path.join(sourceRoot, 'plugins/rigor-playground/wasm/index.html');
const outputDir = path.resolve(projectRoot, 'public/playground');
const outputPage = path.join(outputDir, 'index.html');

// Canonical site origin, used to build the absolute Open Graph / Twitter Card
// URLs the playground page advertises. Mirrors `site:` in astro.config.mjs;
// override with SITE_URL for a preview deploy on another origin.
const siteUrl = (process.env.SITE_URL?.trim() || 'https://rigor.typedduck.fail').replace(/\/+$/, '');

// The playground page only exists in upstream/rigor once the wasm work has
// merged and the submodule is bumped to a commit that carries it. Until then,
// skip rather than fail the whole build — keeps this wiring safe to land ahead
// of the submodule bump. (The homepage "Try in your browser" link will 404
// until the page is synced, which is the intended interim state.)
try {
  await access(sourcePage);
} catch {
  console.warn(
    `sync-playground: ${path.relative(projectRoot, sourcePage)} not found in the rigor ` +
      'submodule yet — skipping. Bump upstream/rigor to a commit with the playground.',
  );
  process.exit(0);
}

const wasmUrl = await resolveWasmUrl();

async function resolveWasmUrl() {
  const explicit = process.env.RIGOR_WASM_URL?.trim();
  if (explicit) return explicit;

  const base = process.env.RIGOR_WASM_BASE_URL?.trim();
  if (!base) return '';

  // Derive the object path from the rigor commit the source tree is pinned at,
  // matching the workflow's `playground/rigor-playground-${GITHUB_SHA::8}.wasm`.
  let sha;
  try {
    const { stdout } = await execFileAsync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD']);
    sha = stdout.trim().slice(0, 8);
  } catch {
    console.warn('sync-playground: could not read the rigor commit SHA — leaving the wasm URL empty.');
    return '';
  }
  return `${base.replace(/\/+$/, '')}/playground/rigor-playground-${sha}.wasm`;
}

let html = await readFile(sourcePage, 'utf8');

// Inject the R2 URL into <meta name="rigor-wasm-url" content="...">. The source
// ships it empty; rewrite the content attribute (idempotent across re-syncs).
const metaRe = /(<meta\s+name="rigor-wasm-url"\s+content=")[^"]*(">)/;
if (!metaRe.test(html)) {
  throw new Error(
    `sync-playground: <meta name="rigor-wasm-url"> not found in ${sourcePage} — ` +
      'the upstream playground page changed shape; update this script.',
  );
}
html = html.replace(metaRe, `$1${wasmUrl}$2`);

// Inject Open Graph / Twitter Card metadata. The upstream page ships none —
// social cards are a docs-site concern (canonical URL, hosted card image), not
// something the framework-agnostic playground source should hard-code. The
// card art is committed at public/og/playground.png (served at /og/...). The
// rest of the site gets its tags from Starlight's <Head>; this standalone
// static page needs them spelled out. Injected after <title> so the tags sit
// in the document head alongside the page title.
const ogImage = `${siteUrl}/og/playground.png`;
const pageUrl = `${siteUrl}/playground/`;
const ogTitle = 'Rigor Playground';
const ogDescription =
  'Type-check Ruby in your browser with the Rigor static analyzer — no install, ' +
  'no annotations, no backend. Powered by ruby.wasm.';
const ogImageAlt = 'Rigor Playground — type-check Ruby in your browser';
const ogTags = `
  <!-- Open Graph / Twitter Card — injected by scripts/sync-playground.mjs.
       Card image committed at public/og/playground.png (source: assets/og/playground.svg). -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Rigor">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${ogImageAlt}">
  <meta property="og:locale" content="en">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="twitter:image:alt" content="${ogImageAlt}">`;

const titleRe = /<\/title>/;
if (!titleRe.test(html)) {
  throw new Error(
    `sync-playground: <title> not found in ${sourcePage} — the upstream playground ` +
      'page changed shape; update the Open Graph injection in this script.',
  );
}
html = html.replace(titleRe, `</title>\n${ogTags}`);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPage, html);

// Carry over any sibling static assets (none today, but keep the contract).
for (const asset of []) {
  await copyFile(path.join(path.dirname(sourcePage), asset), path.join(outputDir, asset));
}

if (wasmUrl) {
  console.log(`sync-playground: wrote ${path.relative(projectRoot, outputPage)} (wasm: ${wasmUrl})`);
} else {
  console.warn(
    'sync-playground: no wasm URL — playground page written, but the binary URL is empty. ' +
      'Set RIGOR_WASM_BASE_URL (recommended) or RIGOR_WASM_URL in the deploy env once R2 is live.',
  );
}
