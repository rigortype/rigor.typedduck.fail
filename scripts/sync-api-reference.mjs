#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { referenceFor, pagesFor } from './api-reference/presentation.mjs';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));
const artifactPath = path.join(root, 'src/data/api-reference.json');
const outputRoot = path.join(root, 'src/content/docs');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const git = async (cwd, ...args) => (await exec('git', ['-C', cwd, ...args])).stdout.trim();

async function producerDigest(directory) {
  const hash = createHash('sha256');
  const visit = async (relative) => {
    for (const entry of (await readdir(path.join(directory, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const file = path.join(relative, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && entry.name.endsWith('.rb')) hash.update(file).update('\0').update(await readFile(path.join(directory, file))).update('\0');
    }
  };
  await visit('lib');
  await visit('zard-doc/lib');
  return hash.digest('hex');
}

async function generate(rigorRoot, commit) {
  const zardRoot = await realpath(path.resolve(root, process.env.ZARD_SOURCE_DIR));
  const config = JSON.parse(await readFile(path.join(root, 'api-reference.config.json'), 'utf8'));
  for (const scope of Object.values(config.scopes)) {
    for (const source of scope.sources) source.root = path.resolve(rigorRoot, source.root);
  }
  await mkdir(path.join(root, '.astro'), { recursive: true });
  const temporary = await mkdtemp(path.join(root, '.astro/api-export-'));
  try {
    const configPath = path.join(temporary, 'zard-doc.yml');
    await writeFile(configPath, JSON.stringify({ ...config, docroot: 'unused', layout: 'namespace' }));
    const args = ['-I', path.join(zardRoot, 'lib'), '-I', path.join(zardRoot, 'zard-doc/lib'),
      path.join(zardRoot, 'zard-doc/exe/zard-doc'), 'build', '--config', configPath, '--format', 'json'];
    const result = await exec(process.env.RUBY || 'ruby', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
    if (result.stderr) process.stderr.write(result.stderr);
    const data = JSON.parse(result.stdout);
    const sourcePath = (file) => {
      const relative = path.relative(rigorRoot, path.resolve(temporary, file)).split(path.sep).join('/');
      if (relative.startsWith('../') || path.isAbsolute(relative)) throw new Error('API source outside the pinned Rigor tree');
      return relative;
    };
    const spans = (value) => {
      if (!value || typeof value !== 'object') return;
      if (Number.isInteger(value.start_line) && typeof value.path === 'string') value.path = sourcePath(value.path);
      for (const child of Object.values(value)) spans(child);
    };
    for (const scope of data.scopes) {
      for (const file of scope.files) file.path = sourcePath(file.path);
    }
    spans(data);
    return { source: { commit, selectionDigest: sha256(await readFile(path.join(root, 'api-reference.config.json'))),
      zardCommit: await git(zardRoot, 'rev-parse', 'HEAD'), zardSourceDigest: await producerDigest(zardRoot) }, export: data };
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

async function validateSource(artifact, rigorRoot, commit) {
  if (artifact.source?.commit !== commit || !/^[0-9a-f]{40}$/.test(commit)) throw new Error('API artifact does not match the pinned Rigor commit; regenerate it');
  if (artifact.source.selectionDigest !== sha256(await readFile(path.join(root, 'api-reference.config.json')))) throw new Error('API source selection changed; regenerate the artifact');
  for (const scope of artifact.export.scopes) {
    for (const file of scope.files) {
      const actual = await realpath(path.resolve(rigorRoot, file.path));
      if (!actual.startsWith(rigorRoot + path.sep) || sha256(await readFile(actual)) !== file.digest) throw new Error(`Stale or escaped API source: ${file.path}`);
    }
  }
}

async function publish(pages, artifact) {
  await mkdir(path.join(root, '.astro'), { recursive: true });
  const staging = await mkdtemp(path.join(root, '.astro/api-pages-'));
  const changed = [];
  let preserveBackup = false;
  try {
    for (const [file, content] of pages) {
      const target = path.join(staging, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    await mkdir(path.dirname(artifactPath), { recursive: true });
    const prepared = path.join(staging, 'artifact.json');
    await writeFile(prepared, JSON.stringify(artifact, null, 2) + '\n');
    const replacements = ['apiref', 'ja/apiref'].map((directory) => [path.join(staging, directory), path.join(outputRoot, directory)]);
    replacements.push([prepared, artifactPath]);
    for (const [index, [from, target]] of replacements.entries()) {
      await mkdir(path.dirname(target), { recursive: true });
      const backup = path.join(staging, `backup-${index}`);
      const existed = existsSync(target);
      if (existed) await rename(target, backup);
      changed.push({ target, backup, existed });
      await rename(from, target);
    }
  } catch (error) {
    try {
      for (const { target, backup, existed } of changed.reverse()) {
        await rm(target, { recursive: true, force: true });
        if (existed) await rename(backup, target);
      }
    } catch (recovery) {
      preserveBackup = true;
      throw new Error(`API publication failed: ${error.message}; recovery failed: ${recovery.message}; restore from ${staging}`);
    }
    throw error;
  } finally { if (!preserveBackup) await rm(staging, { recursive: true, force: true }); }
}

async function main() {
  const input = process.env.ZARD_API_JSON ? path.resolve(root, process.env.ZARD_API_JSON) : artifactPath;
  if (!process.env.ZARD_SOURCE_DIR && !process.env.ZARD_API_JSON && !existsSync(input)) {
    await rm(path.join(outputRoot, 'apiref'), { recursive: true, force: true });
    await rm(path.join(outputRoot, 'ja/apiref'), { recursive: true, force: true });
    console.log('API reference disabled: set ZARD_SOURCE_DIR or ZARD_API_JSON to enable generation.');
    return;
  }
  const rigorRoot = await realpath(path.resolve(root, process.env.RIGOR_API_SOURCE_DIR || 'upstream/rigor'));
  const commit = await git(rigorRoot, 'rev-parse', 'HEAD');
  const artifact = process.env.ZARD_SOURCE_DIR ? await generate(rigorRoot, commit) : JSON.parse(await readFile(input, 'utf8'));
  const reference = referenceFor(artifact);
  await validateSource(artifact, rigorRoot, commit);
  const files = artifact.export.scopes.flatMap((scope) => scope.files.map((file) => file.path));
  if ((await git(rigorRoot, 'status', '--porcelain', '--', ...new Set(files))).length) throw new Error('API input sources have uncommitted changes; use a clean pinned Rigor checkout');
  const pages = pagesFor(reference);
  await publish(pages, artifact);
  console.log(`API reference: ${pages.size} pages from Rigor ${commit.slice(0, 8)}.`);
}

try { await main(); } catch (error) { console.error(`API generation failed: ${error.message}`); process.exitCode = 1; }
