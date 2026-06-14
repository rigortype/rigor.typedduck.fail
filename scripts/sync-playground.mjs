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
// The wasm URL comes from RIGOR_WASM_URL (set in the deploy env once the R2
// bucket exists). If unset, the meta is left empty: the page then falls back to
// a same-origin relative path and will report a clear fetch error until the
// binary is published — the wiring is complete, only the URL is pending.
import { access, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = path.resolve(projectRoot, process.env.RIGOR_SOURCE_DIR ?? 'upstream/rigor');
const sourcePage = path.join(sourceRoot, 'plugins/rigor-playground/wasm/index.html');
const outputDir = path.resolve(projectRoot, 'public/playground');
const outputPage = path.join(outputDir, 'index.html');

const wasmUrl = process.env.RIGOR_WASM_URL ?? '';

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
    'sync-playground: RIGOR_WASM_URL is unset — playground page written, but the wasm ' +
      'binary URL is empty. Set RIGOR_WASM_URL in the deploy env once the R2 bucket is live.',
  );
}
