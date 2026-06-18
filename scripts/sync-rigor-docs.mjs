#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { transform as normalizeJaTypography } from './normalize-ja-typography.mjs';
import { escapeTablePipes } from './escape-table-pipes.mjs';
import { REPO_SOURCE_DIRS } from './repo-source-dirs.mjs';

const execFileAsync = promisify(execFile);

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = path.resolve(projectRoot, process.env.RIGOR_SOURCE_DIR ?? 'upstream/rigor');
// The upstream reference tree is written directly under the docs content
// root (no `reference/` namespace segment): upstream `handbook/x.md` →
// `src/content/docs/handbook/x.md` → URL `/handbook/x/`. The root is shared
// with the hand-authored splash pages (`index.mdx`, `recently-updated.mdx`)
// and the owned JA tree (`ja/`), so the stale-output cleanup below is
// selective rather than a wholesale wipe.
const outputRoot = path.resolve(projectRoot, 'src/content/docs');
// JA-native upstream files: the JA tree (`src/content/docs/ja/`) receives
// the upstream Japanese content verbatim — it's the canonical JA presentation
// and stays in sync on every sync. Hand-edited JA translations of EN-native
// upstream files also live in this directory but the script never touches
// those (it only writes the JA-native paths).
const jaOutputRoot = path.resolve(projectRoot, 'src/content/docs/ja');
const releaseOutputPath = path.resolve(projectRoot, 'src/data/rigor-release.json');
const upstreamDocsDirs = ['docs', 'doc'];

// When an upstream file is detected as Japanese-native (frontmatter
// `sourceLanguage: ja` or CJK byte ratio above this threshold),
// the script looks for a hand-edited English translation under
// `translations/en/<output-path>`. If found, that translation is
// written to `src/content/docs/<output-path>` with the
// upstream's sourceSha / sourceCommit / sourceDate stamped on top.
// If absent, a "translation pending" stub containing the upstream
// JA body is written instead so the page still renders.
const translationsEnRoot = path.resolve(projectRoot, 'translations/en');
const cjkLanguageThreshold = 0.4;

const sectionOrder = new Map([
  ['handbook', 10],
  ['type-specification', 20],
  ['internal-spec', 30],
  ['adr', 40],
  ['design', 50],
  ['notes', 60],
]);

const docsRoot = await findDocsRoot();
const docsRootName = path.basename(docsRoot);
// Slugs of the published plugin reference pages (`docs/manual/plugins/<slug>.md`
// → route `/manual/plugins/<slug>/`). Upstream prose links to a plugin's source
// directory with `../../plugins/<slug>/`, which escapes the docs tree and has no
// on-site route; when a slug appears here, the link rewriter retargets it to the
// on-site manual reference page instead of GitHub. Derived from the directory so
// new/removed reference pages are picked up automatically on every sync.
const pluginReferenceSlugs = await collectPluginReferenceSlugs();
const sourceCommit = await readUpstreamCommit();
await mkdir(outputRoot, { recursive: true });
// outputRoot is the shared docs content root, so we can't wipe it wholesale —
// it also holds the hand-authored splash pages and the owned JA tree. Remove
// only the previously generated EN artifacts: every top-level entry that isn't
// a hand-authored keeper. This also sweeps away a stale `reference/` directory
// left by an older sync, and upstream top-level additions/removals are handled
// automatically (anything not regenerated this run is gone next run).
const jaDirName = path.relative(outputRoot, jaOutputRoot).split(path.sep)[0];
const ownedRootEntries = new Set(['index.mdx', 'recently-updated.mdx', jaDirName]);
for (const entry of await readdir(outputRoot, { withFileTypes: true })) {
  if (entry.name.startsWith('.')) continue;
  if (ownedRootEntries.has(entry.name)) continue;
  await rm(path.join(outputRoot, entry.name), { recursive: true, force: true });
}

const markdownFiles = await collectMarkdownFiles(docsRoot);
let jaNativeCount = 0;
let jaNativeWithTranslationCount = 0;
let jaNativeStubCount = 0;
for (const file of markdownFiles) {
  const relativePath = path.relative(docsRoot, file);
  const destinationPath = outputPathFor(relativePath);
  const sourcePath = path.relative(sourceRoot, file).split(path.sep).join('/');
  const source = await readFile(file, 'utf8');
  const sourceDate = await getFileLastCommitDate(sourcePath);
  const page = await normalizeMarkdown(source, relativePath, sourcePath, sourceDate);

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, page.content);

  if (page.sourceLanguage === 'ja') {
    jaNativeCount += 1;
    if (page.translationApplied) jaNativeWithTranslationCount += 1;
    else jaNativeStubCount += 1;
    // Also write the JA tree page — for JA-native upstream the JA
    // page IS the upstream content (sourceLanguage: ja, sourceSha
    // = upstream sourceSha). check-translations skips this in the
    // forward (en→ja) direction; findOrphans accepts these paths
    // as expected.
    const jaPath = jaOutputPathFor(relativePath);
    await mkdir(path.dirname(jaPath), { recursive: true });
    await writeFile(jaPath, normalizeJaTypography(page.jaTreeContent));
  }
}

const release = await readUpstreamRelease();
await mkdir(path.dirname(releaseOutputPath), { recursive: true });
await writeFile(releaseOutputPath, `${JSON.stringify(release, null, 2)}\n`);

console.log(`Synced ${markdownFiles.length} Markdown files from ${path.relative(projectRoot, docsRoot)}.`);
if (jaNativeCount > 0) {
  console.log(`  Japanese-native upstream files: ${jaNativeCount} (${jaNativeWithTranslationCount} EN-translated, ${jaNativeStubCount} stub).`);
}
if (release.tag) {
  console.log(`Latest upstream release: ${release.tag} (${release.date ?? 'unknown date'}).`);
} else {
  console.log('No upstream release tag detected.');
}

async function readUpstreamCommit() {
  try {
    const { stdout } = await execFileAsync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD']);
    return stdout.trim();
  } catch {
    return '';
  }
}

async function readUpstreamRelease() {
  const commit = await readUpstreamCommit();
  let tag = await tagAtUpstreamHead();

  // CI shallow clones don't carry tag refs by default. If no tags exist
  // locally at all, fetch them explicitly — the implicit `--tags` form
  // silently no-ops on a pinned-SHA shallow clone, so a refspec is required.
  if (!tag && !(await hasAnyTags())) {
    try {
      await execFileAsync('git', [
        '-C', sourceRoot,
        'fetch', '--depth=1', 'origin',
        '+refs/tags/*:refs/tags/*',
      ]);
    } catch (error) {
      console.warn(`Failed to fetch upstream tags: ${error.message?.trim() ?? error}`);
    }
    tag = await tagAtUpstreamHead();
  }

  // Between releases (HEAD is past the latest tag), show the most recently
  // released tag we know about so the badge stays informative.
  if (!tag) tag = await latestKnownTag();

  if (!tag) return { tag: null, date: null, commit };
  return { tag, date: await tagCreatedAt(tag), commit };
}

async function hasAnyTags() {
  try {
    const { stdout } = await execFileAsync('git', ['-C', sourceRoot, 'tag', '-l']);
    return stdout.trim() !== '';
  } catch {
    return false;
  }
}

async function latestKnownTag() {
  try {
    const { stdout } = await execFileAsync('git', [
      '-C', sourceRoot,
      'for-each-ref',
      '--sort=-creatordate',
      '--format=%(refname:short)',
      'refs/tags',
    ]);
    const tags = stdout.split('\n').map((line) => line.trim()).filter(Boolean);
    return tags.find((tag) => /^v?\d/.test(tag)) ?? tags[0] ?? null;
  } catch {
    return null;
  }
}

async function tagAtUpstreamHead() {
  try {
    const { stdout } = await execFileAsync('git', [
      '-C', sourceRoot,
      'tag', '--points-at', 'HEAD', '--sort=-creatordate',
    ]);
    const tags = stdout.split('\n').map((line) => line.trim()).filter(Boolean);
    return tags.find((tag) => /^v?\d/.test(tag)) ?? tags[0] ?? null;
  } catch {
    return null;
  }
}

async function tagCreatedAt(tag) {
  try {
    const { stdout } = await execFileAsync('git', [
      '-C', sourceRoot,
      'for-each-ref',
      '--format=%(creatordate:iso-strict)',
      `refs/tags/${tag}`,
    ]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function findDocsRoot() {
  for (const dir of upstreamDocsDirs) {
    const candidate = path.join(sourceRoot, dir);
    try {
      const candidateStat = await stat(candidate);
      if (candidateStat.isDirectory()) return candidate;
    } catch {
      // Try the next supported upstream docs directory name.
    }
  }

  throw new Error(
    `Could not find upstream docs. Initialize the submodule with "git submodule update --init --recursive" or set RIGOR_SOURCE_DIR.`
  );
}

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

function outputPathFor(relativePath) {
  const segments = toOutputSegments(relativePath);
  const fileName = segments.at(-1);
  const outputFileName = fileName.toLowerCase() === 'readme.md' ? 'index.md' : fileName;
  return path.join(outputRoot, ...segments.slice(0, -1), outputFileName);
}

function jaOutputPathFor(relativePath) {
  const segments = toOutputSegments(relativePath);
  const fileName = segments.at(-1);
  const outputFileName = fileName.toLowerCase() === 'readme.md' ? 'index.md' : fileName;
  return path.join(jaOutputRoot, ...segments.slice(0, -1), outputFileName);
}

async function getFileLastCommitDate(sourcePath) {
  try {
    const { stdout } = await execFileAsync('git', [
      '-C', sourceRoot,
      'log', '-1', '--format=%aI', '--', sourcePath,
    ]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function normalizeMarkdown(source, relativePath, sourcePath, sourceDate) {
  const { frontmatter, body } = splitFrontmatter(source);
  const heading = firstHeading(body);
  const upstreamTitle = heading?.text ?? titleFromFile(relativePath);
  const strippedBody = heading ? removeFirstHeading(body, heading.index) : body;
  const rewrittenBody = rewriteMarkdownLinks(normalizeCodeFences(strippedBody), relativePath);
  const order = orderFor(relativePath);
  const normalizedBody = `${rewrittenBody.trimStart()}`;
  const sourceSha = createHash('sha256').update(normalizedBody).digest('hex');
  const sourceLanguage = detectSourceLanguage(frontmatter, normalizedBody);
  // Escape `|` inside table-cell code spans so micromark/remark-gfm does not
  // mis-split the row (see escape-table-pipes.mjs). Done AFTER the sourceSha so
  // this presentation-only fix never perturbs translation drift detection.
  const outputBody = escapeTablePipes(normalizedBody);

  // EN-native upstream (the common case): emit upstream content as-is.
  if (sourceLanguage !== 'ja') {
    const mergedFrontmatter = mergeFrontmatter(frontmatter, {
      title: upstreamTitle,
      sourcePath,
      order,
      sourceSha,
      sourceCommit,
      sourceDate,
      sourceLanguage: 'en',
    });
    return {
      content: `---\n${mergedFrontmatter}\n---\n\n${outputBody}`,
      sourceLanguage: 'en',
      translationApplied: false,
    };
  }

  // JA-native upstream: look for a hand-edited English translation.
  // If present, use its body (with its own title/description) but stamp
  // the upstream sourceSha / sourceCommit / sourceDate so check-translations
  // can detect drift. If absent, emit a stub containing the upstream JA
  // body so the page still renders.
  const overridePath = path.join(translationsEnRoot, ...toOutputSegments(relativePath));
  let overrideContent = null;
  try {
    overrideContent = await readFile(overridePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  // The JA tree for a JA-native upstream file is just the upstream JA
  // content, stamped with sourceLanguage: ja so the typography
  // normalizer and check-translations skip it from the EN-source path.
  const jaTreeFrontmatter = mergeFrontmatter(frontmatter, {
    title: upstreamTitle,
    sourcePath,
    order,
    sourceSha,
    sourceCommit,
    sourceDate,
    sourceLanguage: 'ja',
  });
  const jaTreeContent = `---\n${jaTreeFrontmatter}\n---\n\n${outputBody}`;

  if (overrideContent) {
    const { frontmatter: overrideFrontmatter, body: overrideBody } = splitFrontmatter(overrideContent);
    const overrideTitle = readFrontmatterValue(overrideFrontmatter, 'title') ?? upstreamTitle;
    const mergedFrontmatter = mergeFrontmatter(overrideFrontmatter, {
      title: overrideTitle,
      sourcePath,
      order,
      sourceSha,
      sourceCommit,
      sourceDate,
      sourceLanguage: 'ja',
    }, { forceSourceMetadata: true });
    return {
      content: `---\n${mergedFrontmatter}\n---\n\n${escapeTablePipes(overrideBody.trimStart())}`,
      jaTreeContent,
      sourceLanguage: 'ja',
      translationApplied: true,
    };
  }

  // No English translation yet — emit a stub. translationStatus:
  // pending tells check-translations.mjs the page is in the
  // ja-source-en-translation queue.
  const stubFrontmatter = mergeFrontmatter(frontmatter, {
    title: upstreamTitle,
    sourcePath,
    order,
    sourceSha,
    sourceCommit,
    sourceDate,
    sourceLanguage: 'ja',
    translationStatus: 'pending',
  });
  const banner = `> [!NOTE]\n> This page was authored in Japanese upstream. An English translation is pending; the original Japanese text is shown below.`;
  return {
    content: `---\n${stubFrontmatter}\n---\n\n${banner}\n\n${outputBody}`,
    jaTreeContent,
    sourceLanguage: 'ja',
    translationApplied: false,
  };
}

function detectSourceLanguage(frontmatter, body) {
  // Explicit marker wins.
  const explicit = readFrontmatterValue(frontmatter, 'sourceLanguage');
  if (explicit === 'ja' || explicit === 'en') return explicit;

  // Auto-detect: ratio of non-ASCII bytes in the normalized body.
  // Bodies with > cjkLanguageThreshold non-ASCII are treated as JA.
  if (!body) return 'en';
  const total = Buffer.byteLength(body, 'utf8');
  if (total === 0) return 'en';
  let asciiCount = 0;
  for (let i = 0; i < body.length; i += 1) {
    if (body.charCodeAt(i) < 128) asciiCount += 1;
  }
  // body.length counts code units, not bytes; use it as a fast proxy
  // since ASCII is 1 byte/code-unit. For CJK characters, code units
  // are 1 (BMP) but bytes are 3 (UTF-8), so byte-ratio diverges from
  // codepoint-ratio. We approximate via byte ratio of non-ASCII.
  const asciiBytes = asciiCount; // each ASCII char = 1 byte
  const nonAsciiBytes = total - asciiBytes;
  const ratio = nonAsciiBytes / total;
  return ratio > cjkLanguageThreshold ? 'ja' : 'en';
}

function readFrontmatterValue(frontmatter, key) {
  const match = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(frontmatter ?? '');
  if (!match) return undefined;
  let raw = match[1].trim();
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }
  return raw;
}

function splitFrontmatter(source) {
  if (!source.startsWith('---\n')) {
    return { frontmatter: '', body: source };
  }

  const end = source.indexOf('\n---', 4);
  if (end === -1) {
    return { frontmatter: '', body: source };
  }

  const afterEnd = source.indexOf('\n', end + 4);
  return {
    frontmatter: source.slice(4, end).trim(),
    body: afterEnd === -1 ? '' : source.slice(afterEnd + 1),
  };
}

function firstHeading(body) {
  const match = /^#\s+(.+)$/m.exec(body);
  if (!match) return undefined;

  return {
    index: match.index,
    text: match[1].replace(/\s+#+$/, '').trim(),
    raw: match[0],
  };
}

function removeFirstHeading(body, index) {
  const before = body.slice(0, index);
  const afterStart = body.indexOf('\n', index);
  const after = afterStart === -1 ? '' : body.slice(afterStart + 1);
  return `${before}${after}`;
}

function rewriteMarkdownLinks(body, relativePath) {
  // Match every relative Markdown link target (scheme, absolute, and pure-anchor
  // links are excluded by the lookahead). Targets that stay inside docs/ keep
  // their on-site routing; targets that escape docs/ into a repo-root source
  // tree (REPO_SOURCE_DIRS) are redirected. NOTE: this resolves against the docs
  // SOURCE path, so it must run only on upstream bodies. The owned-tree guard
  // (scripts/scan-source-links.mjs) does the equivalent ROUTE-aware resolution
  // for hand-authored translations; both share REPO_SOURCE_DIRS — keep in sync.
  return body.replace(/\]\((?![a-z][a-z+.-]*:|\/|#)([^)\s]+?)(#[^)]+)?\)/gi, (match, target, hash = '') => {
    const sourceDirectory = path.posix.dirname(relativePath.split(path.sep).join('/'));
    const normalizedTarget = target.replace(/\\/g, '/');
    const resolvedDocsPath = path.posix.normalize(path.posix.join(sourceDirectory, normalizedTarget));

    // Stays inside docs/: only `.md` targets become on-site routes. Non-`.md`
    // in-docs links (images, ci-template `.yml`, bare dir links) are untouched.
    if (!resolvedDocsPath.startsWith('../')) {
      if (!/\.md$/i.test(resolvedDocsPath)) return match;
      const currentOutputPath = toOutputPath(relativePath);
      const targetOutputPath = toOutputPath(resolvedDocsPath);
      return `](${relativeRouteLink(currentOutputPath, targetOutputPath)}${hash})`;
    }

    // Escapes docs/: a repo-root path with no on-site route. Links into the
    // upstream source/asset trees (REPO_SOURCE_DIRS) are redirected — a bare
    // `plugins/<slug>` with a published reference page to that on-site page,
    // everything else to GitHub. Every OTHER escape keeps the historical
    // behavior: `.md` → GitHub, anything else passes through untouched (so a
    // malformed on-site cross-ref like a stray `../docs/…` is left for upstream
    // to fix rather than mis-routed, and unrelated body hashes stay stable).
    const repoRelative = path.posix.normalize(path.posix.join(docsRootName, sourceDirectory, normalizedTarget));
    if (REPO_SOURCE_DIRS.has(repoRelative.split('/')[0])) {
      // `normalize` keeps a trailing slash, so allow it: `plugins/<slug>` and
      // `plugins/<slug>/` both denote the plugin's directory.
      const pluginDir = /^plugins\/([^/.]+)\/?$/.exec(repoRelative)?.[1];
      const pluginSlug = pluginDir ? normalizePathSegment(pluginDir) : null;
      if (pluginSlug && pluginReferenceSlugs.has(pluginSlug)) {
        const currentOutputPath = toOutputPath(relativePath);
        return `](${relativeRouteLink(currentOutputPath, `manual/plugins/${pluginSlug}.md`)}${hash})`;
      }
      return `](${githubSourceUrl(repoRelative, normalizedTarget.endsWith('/'))}${hash})`;
    }
    if (/\.md$/i.test(normalizedTarget)) {
      return `](${githubSourceUrl(repoRelative)}${hash})`;
    }
    return match;
  });
}

function normalizeCodeFences(body) {
  return body.replace(/^(```+)rbs(\s*)$/gim, '$1ruby$2');
}

function mergeFrontmatter(
  frontmatter,
  { title, sourcePath, order, sourceSha, sourceCommit, sourceDate, sourceLanguage, translationStatus },
  { forceSourceMetadata = false } = {}
) {
  // forceSourceMetadata: when overlaying upstream sourceSha / sourceCommit /
  // sourceDate onto a hand-edited translation file's frontmatter, the
  // translation's pre-existing sourceSha is the wrong value and must be
  // replaced. The "if !hasFrontmatterKey" guard from the EN-native path
  // would skip the replacement; forceSourceMetadata bypasses it.
  let cleaned = frontmatter ?? '';
  if (forceSourceMetadata) {
    for (const key of ['sourcePath', 'sourceSha', 'sourceCommit', 'sourceDate']) {
      cleaned = stripFrontmatterKey(cleaned, key);
    }
  }
  const lines = cleaned ? [cleaned] : [];
  if (!hasFrontmatterKey(cleaned, 'title')) {
    lines.push(`title: ${JSON.stringify(title)}`);
  }
  if (!hasFrontmatterKey(cleaned, 'description')) {
    lines.push(`description: ${JSON.stringify(`Imported from rigortype/rigor ${sourcePath}.`)}`);
  }
  if (!hasFrontmatterKey(cleaned, 'editUrl')) {
    lines.push(`editUrl: ${JSON.stringify(`https://github.com/rigortype/rigor/edit/master/${sourcePath}`)}`);
  }
  if (!hasFrontmatterKey(cleaned, 'sourcePath')) {
    lines.push(`sourcePath: ${JSON.stringify(sourcePath)}`);
  }
  if (sourceSha && !hasFrontmatterKey(cleaned, 'sourceSha')) {
    lines.push(`sourceSha: ${JSON.stringify(sourceSha)}`);
  }
  if (sourceCommit && !hasFrontmatterKey(cleaned, 'sourceCommit')) {
    lines.push(`sourceCommit: ${JSON.stringify(sourceCommit)}`);
  }
  if (sourceDate && !hasFrontmatterKey(cleaned, 'sourceDate')) {
    lines.push(`sourceDate: ${JSON.stringify(sourceDate)}`);
  }
  if (sourceLanguage && !hasFrontmatterKey(cleaned, 'sourceLanguage')) {
    lines.push(`sourceLanguage: ${JSON.stringify(sourceLanguage)}`);
  }
  if (translationStatus && !hasFrontmatterKey(cleaned, 'translationStatus')) {
    lines.push(`translationStatus: ${JSON.stringify(translationStatus)}`);
  }
  if (!hasFrontmatterKey(cleaned, 'sidebar')) {
    lines.push('sidebar:');
    lines.push(`  order: ${order}`);
  }
  return lines.join('\n');
}

function stripFrontmatterKey(frontmatter, key) {
  if (!frontmatter) return frontmatter;
  const lines = frontmatter.split('\n');
  const out = [];
  let skipBlockUntilDedent = false;
  for (const line of lines) {
    if (skipBlockUntilDedent) {
      // skip indented continuation
      if (/^\s/.test(line)) continue;
      skipBlockUntilDedent = false;
    }
    if (new RegExp(`^${key}:`).test(line)) {
      // If the key is a block (no value on same line), skip its
      // indented continuation as well. For scalar keys (with a value
      // on the same line) the next line is unrelated.
      const valueAfterColon = line.slice(key.length + 1).trim();
      if (valueAfterColon === '') skipBlockUntilDedent = true;
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

function hasFrontmatterKey(frontmatter, key) {
  return new RegExp(`^${key}:`, 'm').test(frontmatter);
}

function titleFromFile(relativePath) {
  const baseName = path.basename(relativePath, '.md');
  const withoutPrefix = baseName.replace(/^\d+[-_]/, '').replace(/^\d{8}[-_]/, '');
  return withoutPrefix
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function githubSourceUrl(sourceRootRelativePath, isDirectory = false) {
  // `tree` for directories, `blob` for files. We infer directory-ness from a
  // trailing slash on the authored target; GitHub redirects blob↔tree when the
  // guess is wrong, so a missing trailing slash on a directory still resolves.
  const kind = isDirectory ? 'tree' : 'blob';
  return `https://github.com/rigortype/rigor/${kind}/master/${sourceRootRelativePath}`;
}

async function collectPluginReferenceSlugs() {
  const dir = path.join(docsRoot, 'manual', 'plugins');
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
    if (entry.name.toLowerCase() === 'readme.md') continue;
    slugs.add(normalizePathSegment(entry.name).replace(/\.md$/i, ''));
  }
  return slugs;
}

function toOutputSegments(relativePath) {
  return relativePath.split(/[\\/]/).map(normalizePathSegment);
}

function toOutputPath(relativePath) {
  const segments = toOutputSegments(relativePath);
  const fileName = segments.at(-1);
  segments[segments.length - 1] = fileName.toLowerCase() === 'readme.md' ? 'index.md' : fileName;
  return segments.join('/');
}

function routeForOutputPath(outputPath) {
  const segments = outputPath.split('/');
  const fileName = segments.at(-1);
  if (fileName === 'index.md') {
    segments.pop();
  } else {
    segments[segments.length - 1] = fileName.replace(/\.md$/i, '');
  }
  return segments.join('/');
}

function relativeRouteLink(currentOutputPath, targetOutputPath) {
  const currentRoute = routeForOutputPath(currentOutputPath);
  const targetRoute = routeForOutputPath(targetOutputPath);
  const relativeRoute = path.posix.relative(currentRoute, targetRoute);

  if (!relativeRoute) return './';
  return `${relativeRoute}/`;
}

function normalizePathSegment(segment) {
  if (segment.toLowerCase() === 'readme.md') return segment.toLowerCase();

  const extension = path.extname(segment);
  const baseName = extension ? segment.slice(0, -extension.length) : segment;
  const normalizedBaseName = baseName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return `${normalizedBaseName}${extension.toLowerCase()}`;
}

function orderFor(relativePath) {
  const segments = relativePath.split(path.sep);
  const section = segments.length > 1 ? segments[0] : '';
  const sectionBase = sectionOrder.get(section) ?? 90;
  const fileName = segments.at(-1) ?? '';
  const explicitOrder = /^(\d+)/.exec(fileName)?.[1];

  if (explicitOrder) {
    return sectionBase * 100 + Number.parseInt(explicitOrder, 10);
  }

  if (fileName.toLowerCase() === 'readme.md') {
    return sectionBase * 100;
  }

  return sectionBase * 100 + 50;
}

