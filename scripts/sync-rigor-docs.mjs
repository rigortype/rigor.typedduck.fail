#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = path.resolve(projectRoot, process.env.RIGOR_SOURCE_DIR ?? 'upstream/rigor');
const outputRoot = path.resolve(projectRoot, 'src/content/docs/reference');
const releaseOutputPath = path.resolve(projectRoot, 'src/data/rigor-release.json');
const upstreamDocsDirs = ['docs', 'doc'];

const sectionOrder = new Map([
  ['handbook', 10],
  ['type-specification', 20],
  ['internal-spec', 30],
  ['adr', 40],
  ['design', 50],
  ['notes', 60],
]);

const sectionLabels = new Map([
  ['handbook', 'Handbook'],
  ['type-specification', 'Type Specification'],
  ['internal-spec', 'Internal Specification'],
  ['adr', 'Architecture Decisions'],
  ['design', 'Design Notes'],
  ['notes', 'Development Notes'],
]);

const docsRoot = await findDocsRoot();
const docsRootName = path.basename(docsRoot);
const sourceCommit = await readUpstreamCommit();
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const markdownFiles = await collectMarkdownFiles(docsRoot);
for (const file of markdownFiles) {
  const relativePath = path.relative(docsRoot, file);
  const destinationPath = outputPathFor(relativePath);
  const sourcePath = path.relative(sourceRoot, file).split(path.sep).join('/');
  const source = await readFile(file, 'utf8');
  const page = normalizeMarkdown(source, relativePath, sourcePath);

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, page);
}

await writeFile(
  path.join(outputRoot, 'index.md'),
  buildReferenceIndex(markdownFiles.map((file) => path.relative(docsRoot, file)))
);

const release = await readUpstreamRelease();
await mkdir(path.dirname(releaseOutputPath), { recursive: true });
await writeFile(releaseOutputPath, `${JSON.stringify(release, null, 2)}\n`);

console.log(`Synced ${markdownFiles.length} Markdown files from ${path.relative(projectRoot, docsRoot)}.`);
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

function normalizeMarkdown(source, relativePath, sourcePath) {
  const { frontmatter, body } = splitFrontmatter(source);
  const heading = firstHeading(body);
  const title = heading?.text ?? titleFromFile(relativePath);
  const strippedBody = heading ? removeFirstHeading(body, heading.index) : body;
  const rewrittenBody = rewriteMarkdownLinks(normalizeCodeFences(strippedBody), relativePath);
  const order = orderFor(relativePath);
  const normalizedBody = `${rewrittenBody.trimStart()}`;
  const sourceSha = createHash('sha256').update(normalizedBody).digest('hex');
  const mergedFrontmatter = mergeFrontmatter(frontmatter, {
    title,
    sourcePath,
    order,
    sourceSha,
    sourceCommit,
  });

  return `---\n${mergedFrontmatter}\n---\n\n${normalizedBody}`;
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
  return body.replace(/\]\((?![a-z][a-z+.-]*:|\/|#)([^)\s]+?\.md)(#[^)]+)?\)/gi, (_match, target, hash = '') => {
    const sourceDirectory = path.posix.dirname(relativePath.split(path.sep).join('/'));
    const normalizedTarget = target.replace(/\\/g, '/');
    const resolvedDocsPath = path.posix.normalize(path.posix.join(sourceDirectory, normalizedTarget));

    if (resolvedDocsPath.startsWith('../')) {
      const sourceRootPath = path.posix.normalize(path.posix.join(docsRootName, sourceDirectory, normalizedTarget));
      return `](${githubBlobUrl(sourceRootPath)}${hash})`;
    }

    const currentOutputPath = toOutputPath(relativePath);
    const targetOutputPath = toOutputPath(resolvedDocsPath);
    return `](${relativeRouteLink(currentOutputPath, targetOutputPath)}${hash})`;
  });
}

function normalizeCodeFences(body) {
  return body.replace(/^(```+)rbs(\s*)$/gim, '$1ruby$2');
}

function mergeFrontmatter(frontmatter, { title, sourcePath, order, sourceSha, sourceCommit }) {
  const lines = frontmatter ? [frontmatter] : [];
  if (!hasFrontmatterKey(frontmatter, 'title')) {
    lines.push(`title: ${JSON.stringify(title)}`);
  }
  if (!hasFrontmatterKey(frontmatter, 'description')) {
    lines.push(`description: ${JSON.stringify(`Imported from rigortype/rigor ${sourcePath}.`)}`);
  }
  if (!hasFrontmatterKey(frontmatter, 'editUrl')) {
    lines.push(`editUrl: ${JSON.stringify(`https://github.com/rigortype/rigor/edit/main/${sourcePath}`)}`);
  }
  if (!hasFrontmatterKey(frontmatter, 'sourcePath')) {
    lines.push(`sourcePath: ${JSON.stringify(sourcePath)}`);
  }
  if (sourceSha && !hasFrontmatterKey(frontmatter, 'sourceSha')) {
    lines.push(`sourceSha: ${JSON.stringify(sourceSha)}`);
  }
  if (sourceCommit && !hasFrontmatterKey(frontmatter, 'sourceCommit')) {
    lines.push(`sourceCommit: ${JSON.stringify(sourceCommit)}`);
  }
  if (!hasFrontmatterKey(frontmatter, 'sidebar')) {
    lines.push('sidebar:');
    lines.push(`  order: ${order}`);
  }
  return lines.join('\n');
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

function githubBlobUrl(sourceRootRelativePath) {
  return `https://github.com/rigortype/rigor/blob/main/${sourceRootRelativePath}`;
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

function buildReferenceIndex(relativePaths) {
  const sections = new Set(
    relativePaths
      .map((relativePath) => relativePath.split(path.sep)[0])
      .filter((segment) => segment && segment.endsWith('.md') === false)
  );
  const sectionLinks = [...sections]
    .sort((left, right) => (sectionOrder.get(left) ?? 90) - (sectionOrder.get(right) ?? 90))
    .map((section) => `- [${sectionLabels.get(section) ?? titleFromFile(`${section}.md`)}](./${section}/)`)
    .join('\n');

  const body = `These pages are generated from upstream Markdown files during the site build.\n\n${sectionLinks}\n`;
  const sha = createHash('sha256').update(body).digest('hex');
  const front = [
    'title: Reference',
    'description: Documentation imported from the upstream rigortype/rigor repository.',
    'sourcePath: "(generated)"',
    `sourceSha: ${JSON.stringify(sha)}`,
  ];
  if (sourceCommit) front.push(`sourceCommit: ${JSON.stringify(sourceCommit)}`);
  front.push('sidebar:');
  front.push('  order: 0');
  return `---\n${front.join('\n')}\n---\n\n${body}`;
}
