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
