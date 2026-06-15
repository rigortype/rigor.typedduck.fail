#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const docsRoot = path.resolve(projectRoot, 'src/content/docs');
const upstreamRoot = path.resolve(projectRoot, process.env.RIGOR_SOURCE_DIR ?? 'upstream/rigor');
// The reference pages live at the docs content root now (the reference/
// namespace was removed): EN at <docsRoot>, JA at <docsRoot>/<locale>. The
// root is shared with the hand-authored splash pages (.mdx, skipped by the
// .md-only walker) and sibling trees, so collectMarkdownFiles skips the
// locale dir (when walking EN) and the generated chibirigor book.
const sourceLocaleRoot = docsRoot;
const targetLocale = process.env.RIGOR_LOCALE ?? 'ja';
const targetLocaleRoot = path.join(docsRoot, targetLocale);
const skipDirs = new Set([targetLocale, 'chibirigor']);
// For Japanese-native upstream sources, hand-edited English translations
// live under translations/en/<output-path>. sync-rigor-docs.mjs reads
// these and overlays them onto the gitignored EN tree.
const enOfJaTranslationsRoot = path.resolve(projectRoot, 'translations/en');

const args = process.argv.slice(2);
const flags = parseArgs(args);

if (flags.help) {
  printHelp();
  process.exit(0);
}

const enFiles = await collectMarkdownFiles(sourceLocaleRoot);
const enRecords = await Promise.all(enFiles.map((file) => buildSourceRecord(file)));

if (flags.bootstrap) {
  await bootstrapMissingTranslations(enRecords);
  process.exit(0);
}

if (flags.diff) {
  await showUpstreamDiff(enRecords, flags.diff);
  process.exit(0);
}

const report = await buildReport(enRecords);
printReport(report);
process.exit(report.stale.length + report.missing.length > 0 && flags.strict ? 1 : 0);

function parseArgs(input) {
  const out = { bootstrap: false, strict: false, help: false, diff: '' };
  for (let index = 0; index < input.length; index += 1) {
    const arg = input[index];
    if (arg === '--bootstrap') out.bootstrap = true;
    else if (arg === '--strict') out.strict = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--diff') out.diff = input[++index] ?? '';
    else if (arg.startsWith('--diff=')) out.diff = arg.slice('--diff='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function printHelp() {
  console.log(`Usage: node scripts/check-translations.mjs [options]

Compare English reference docs against ${targetLocale} translations and
report which files are missing, stale, or up to date based on the
sourceSha frontmatter field embedded by sync-rigor-docs.mjs.

Options:
  --bootstrap       Create skeleton translation files (English body +
                    translationStatus: pending) for any missing
                    ${targetLocale} pages. Existing files are left alone.
  --diff <path>     Show the upstream git diff for a single file between
                    its translated sourceCommit and the current upstream
                    commit. <path> may be either the EN reference path
                    (e.g. handbook/01-getting-started.md) or the
                    upstream sourcePath (e.g. docs/handbook/01-getting-started.md).
  --strict          Exit with a non-zero status when stale or missing
                    translations are found (useful in CI).
  -h, --help        Show this help text.
`);
}

async function buildReport(records) {
  const ok = [];
  const stale = [];
  const missing = [];
  const reverseOk = [];
  const reverseStale = [];
  const reverseMissing = [];
  const orphans = await findOrphans(records);

  for (const record of records) {
    if (record.sourceLanguage === 'ja') {
      // Reverse direction: upstream is JA; hand-edited EN translation
      // lives under translations/en/<output-path>.
      const targetPath = enTranslationPathFor(record.relativePath);
      let targetSource;
      try {
        targetSource = await readFile(targetPath, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          reverseMissing.push({ ...record, targetPath });
          continue;
        }
        throw error;
      }
      const targetFrontmatter = readFrontmatter(targetSource);
      const translatedSha = targetFrontmatter.sourceSha;
      const translatedCommit = targetFrontmatter.sourceCommit;
      const status = targetFrontmatter.translationStatus ?? 'translated';
      if (!translatedSha) {
        reverseStale.push({ ...record, targetPath, reason: 'missing-sourceSha', status, translatedCommit });
      } else if (translatedSha !== record.sourceSha) {
        reverseStale.push({ ...record, targetPath, reason: 'sha-mismatch', status, translatedSha, translatedCommit });
      } else if (status !== 'translated') {
        reverseStale.push({ ...record, targetPath, reason: `status:${status}`, status, translatedCommit });
      } else {
        reverseOk.push({ ...record, targetPath });
      }
      continue;
    }

    // Forward direction (default): upstream is EN; check JA mirror.
    const targetPath = mirrorPathFor(record.relativePath);
    let targetSource;
    try {
      targetSource = await readFile(targetPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        missing.push({ ...record, targetPath });
        continue;
      }
      throw error;
    }

    const targetFrontmatter = readFrontmatter(targetSource);
    const translatedSha = targetFrontmatter.sourceSha;
    const translatedCommit = targetFrontmatter.sourceCommit;
    const status = targetFrontmatter.translationStatus ?? 'translated';

    if (!translatedSha) {
      stale.push({ ...record, targetPath, reason: 'missing-sourceSha', status, translatedCommit });
    } else if (translatedSha !== record.sourceSha) {
      stale.push({ ...record, targetPath, reason: 'sha-mismatch', status, translatedCommit });
    } else if (status !== 'translated') {
      stale.push({ ...record, targetPath, reason: `status:${status}`, status, translatedCommit });
    } else {
      ok.push({ ...record, targetPath });
    }
  }

  return { ok, stale, missing, orphans, reverseOk, reverseStale, reverseMissing };
}

function printReport({ ok, stale, missing, orphans, reverseOk, reverseStale, reverseMissing }) {
  const total = ok.length + stale.length + missing.length;
  console.log(`Translation status (${targetLocale}): ${ok.length}/${total} translated, ${stale.length} stale, ${missing.length} missing.`);

  const reverseTotal = reverseOk.length + reverseStale.length + reverseMissing.length;
  if (reverseTotal > 0) {
    console.log(`Reverse translation status (en, of ja-native upstream): ${reverseOk.length}/${reverseTotal} translated, ${reverseStale.length} stale, ${reverseMissing.length} missing.`);
  }

  if (orphans.length) {
    console.log(`Orphaned ${targetLocale} files (no English source): ${orphans.length}`);
    for (const orphan of orphans) console.log(`  - ${path.relative(projectRoot, orphan)}`);
  }
  if (missing.length) {
    console.log(`\nMissing translations (${targetLocale}):`);
    for (const item of missing) {
      console.log(`  - ${path.posix.normalize(item.relativePath)}  (${item.sourcePath})`);
    }
  }
  if (stale.length) {
    console.log(`\nStale translations (${targetLocale}):`);
    for (const item of stale) {
      const detail = item.reason === 'sha-mismatch'
        ? `EN sha=${short(item.sourceSha)} vs translated sha=${short(item.translatedSha)} (last @ ${short(item.translatedCommit)})`
        : item.reason;
      console.log(`  - ${path.posix.normalize(item.relativePath)}  [${detail}]`);
    }
  }
  if (reverseMissing.length) {
    console.log(`\nMissing reverse translations (en of ja-native upstream — write under translations/en/):`);
    for (const item of reverseMissing) {
      console.log(`  - ${path.posix.normalize(item.relativePath)}  (${item.sourcePath})`);
    }
  }
  if (reverseStale.length) {
    console.log(`\nStale reverse translations (en of ja-native upstream):`);
    for (const item of reverseStale) {
      const detail = item.reason === 'sha-mismatch'
        ? `EN-source ja sha=${short(item.sourceSha)} vs translated sha=${short(item.translatedSha)} (last @ ${short(item.translatedCommit)})`
        : item.reason;
      console.log(`  - ${path.posix.normalize(item.relativePath)}  [${detail}]`);
    }
  }
  if (!stale.length && !missing.length && !reverseStale.length && !reverseMissing.length) {
    console.log(`\nAll translations are up to date.`);
  }
}

async function bootstrapMissingTranslations(records) {
  let created = 0;
  for (const record of records) {
    const targetPath = mirrorPathFor(record.relativePath);
    try {
      await stat(targetPath);
      continue;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const skeleton = buildSkeleton(record);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, skeleton);
    created += 1;
    console.log(`  + ${path.relative(projectRoot, targetPath)}`);
  }
  console.log(`\nCreated ${created} skeleton translation file(s).`);
}

function buildSkeleton(record) {
  const front = record.frontmatter;
  const lines = [];
  lines.push(`title: ${JSON.stringify(front.title ?? record.relativePath)}`);
  if (front.description) lines.push(`description: ${JSON.stringify(front.description)}`);
  if (front.editUrl) lines.push(`editUrl: ${JSON.stringify(front.editUrl)}`);
  lines.push(`sourcePath: ${JSON.stringify(record.sourcePath)}`);
  lines.push(`sourceSha: ${JSON.stringify(record.sourceSha)}`);
  if (record.sourceCommit) lines.push(`sourceCommit: ${JSON.stringify(record.sourceCommit)}`);
  lines.push(`translationStatus: "pending"`);
  if (front.sidebarOrder !== undefined) {
    lines.push(`sidebar:`);
    lines.push(`  order: ${front.sidebarOrder}`);
  }
  const banner = '> [!NOTE]\n> このページはまだ翻訳されていません。英語版の本文を参考表示しています。';
  return `---\n${lines.join('\n')}\n---\n\n${banner}\n\n${record.body}`;
}

async function showUpstreamDiff(records, requested) {
  const target = requested.replace(/^\/+/, '');
  const record = records.find((entry) => {
    const enPath = path.posix.normalize(entry.relativePath);
    return enPath === target || entry.sourcePath === target || entry.sourcePath.endsWith(`/${target}`);
  });

  if (!record) {
    console.error(`Could not match "${requested}" to a known reference page.`);
    process.exit(1);
  }

  const targetPath = mirrorPathFor(record.relativePath);
  let translatedCommit;
  try {
    const targetSource = await readFile(targetPath, 'utf8');
    translatedCommit = readFrontmatter(targetSource).sourceCommit;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (!translatedCommit) {
    console.error(`No translatedCommit recorded for ${record.relativePath}; nothing to diff.`);
    process.exit(1);
  }

  const currentCommit = await readUpstreamCommit();
  if (translatedCommit === currentCommit) {
    console.log(`Translation is at upstream ${short(currentCommit)}; nothing to diff.`);
    return;
  }

  console.log(`Diff for ${record.sourcePath}: ${short(translatedCommit)} → ${short(currentCommit)}`);
  try {
    const { stdout } = await execFileAsync('git', [
      '-C',
      upstreamRoot,
      'diff',
      `${translatedCommit}..${currentCommit}`,
      '--',
      record.sourcePath,
    ]);
    process.stdout.write(stdout || '(no upstream changes for this path)\n');
  } catch (error) {
    console.error(`git diff failed: ${error.message}`);
    process.exit(1);
  }
}

async function readUpstreamCommit() {
  try {
    const { stdout } = await execFileAsync('git', ['-C', upstreamRoot, 'rev-parse', 'HEAD']);
    return stdout.trim();
  } catch {
    return '';
  }
}

async function buildSourceRecord(file) {
  const relativePath = path.relative(sourceLocaleRoot, file);
  const source = await readFile(file, 'utf8');
  const frontmatter = readFrontmatter(source);
  const body = stripFrontmatter(source).trimStart();
  return {
    file,
    relativePath: relativePath.split(path.sep).join('/'),
    sourcePath: frontmatter.sourcePath ?? '',
    sourceSha: frontmatter.sourceSha ?? '',
    sourceCommit: frontmatter.sourceCommit ?? '',
    sourceLanguage: frontmatter.sourceLanguage ?? 'en',
    frontmatter,
    body,
  };
}

async function findOrphans(records) {
  // Both EN-native and JA-native records have a JA-tree target:
  // EN-native → hand-edited translation; JA-native → auto-overwritten
  // copy of upstream (managed by sync-rigor-docs.mjs).
  const expected = new Set(records.map((record) => mirrorPathFor(record.relativePath)));
  const targetFiles = await collectMarkdownFilesSafely(targetLocaleRoot);
  return targetFiles.filter((file) => !expected.has(file));
}

async function collectMarkdownFilesSafely(directory) {
  try {
    return await collectMarkdownFiles(directory);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      // Skip the locale tree (when walking the EN root) and the generated
      // chibirigor book so neither is mistaken for a reference source/target.
      if (skipDirs.has(entry.name)) continue;
      files.push(...(await collectMarkdownFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(entryPath);
  }
  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

function mirrorPathFor(relativePath) {
  return path.join(targetLocaleRoot, ...relativePath.split('/'));
}

function enTranslationPathFor(relativePath) {
  return path.join(enOfJaTranslationsRoot, ...relativePath.split('/'));
}

function readFrontmatter(source) {
  if (!source.startsWith('---\n')) return {};
  const end = source.indexOf('\n---', 4);
  if (end === -1) return {};
  const raw = source.slice(4, end);
  return parseFrontmatter(raw);
}

function stripFrontmatter(source) {
  if (!source.startsWith('---\n')) return source;
  const end = source.indexOf('\n---', 4);
  if (end === -1) return source;
  const afterEnd = source.indexOf('\n', end + 4);
  return afterEnd === -1 ? '' : source.slice(afterEnd + 1);
}

function parseFrontmatter(raw) {
  const result = {};
  const lines = raw.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (key === 'sidebar') {
      const next = lines[index + 1] ?? '';
      const orderMatch = /^\s+order:\s*(\d+)/.exec(next);
      if (orderMatch) result.sidebarOrder = Number.parseInt(orderMatch[1], 10);
      continue;
    }
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        // Leave the raw string in place if JSON.parse rejects it.
      }
    }
    result[key] = value;
  }
  return result;
}

function short(sha) {
  return sha ? sha.slice(0, 8) : '????????';
}
