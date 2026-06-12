#!/usr/bin/env node
// Sync the chibirigor online book into the site.
//
// Source:  upstream/chibirigor/book/v1/ja  (a git submodule)
// Output:  src/content/docs/ja/chibirigor  (the published pages)
//          public/chibirigor/figures        (the SVG figures)
//
// Only the book prose under book/v1/ja is published. The Ruby example
// sources (`*/examples/`, `*/dist/`) and any working files (`_*.md`,
// `.reviews/`) are NOT copied — links pointing at them are rewritten to
// the chibirigor GitHub repository instead.
//
// The book pages are upstream-owned, Japanese-native content. As with
// the `sourceLanguage: "ja"` pages in sync-rigor-docs, they are passed
// through verbatim: the Japanese typography / terminology normalizers
// are NOT applied (they would be clobbered on the next sync anyway).
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const submoduleRoot = path.resolve(projectRoot, process.env.CHIBIRIGOR_SOURCE_DIR ?? 'upstream/chibirigor');
const bookRoot = path.resolve(submoduleRoot, 'book/v1/ja');
const outputRoot = path.resolve(projectRoot, 'src/content/docs/ja/chibirigor');
const figuresOutputRoot = path.resolve(projectRoot, 'public/chibirigor/figures');

// Public URL the published pages live under (Starlight `ja` locale).
const siteBase = '/ja/chibirigor';
// Public URL the copied SVG figures are served from.
const figuresBase = '/chibirigor/figures';
// GitHub repository the un-published sources (Ruby examples, dist/) and
// any unrecognised links are pointed at.
const repoBase = 'https://github.com/rigortype/chibirigor';
const repoBookPath = 'book/v1/ja';

const sourceCommit = await readSubmoduleCommit();

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const markdownFiles = (await collectFiles(bookRoot, '.md')).filter(isPublishablePage);

for (const file of markdownFiles) {
  const relativePath = path.relative(bookRoot, file).split(path.sep).join('/');
  const destinationPath = path.resolve(outputRoot, outputRelPathFor(relativePath));
  const source = await readFile(file, 'utf8');
  const sourceDate = await fileLastCommitDate(`${repoBookPath}/${relativePath}`);
  const content = transformPage(source, relativePath, sourceDate);

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, content);
}

// Copy the SVG figures into public/ so the absolute /chibirigor/figures
// image links resolve.
await rm(figuresOutputRoot, { recursive: true, force: true });
const svgFiles = await collectFiles(path.join(bookRoot, 'figures'), '.svg');
for (const file of svgFiles) {
  const rel = path.relative(path.join(bookRoot, 'figures'), file);
  const dest = path.join(figuresOutputRoot, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(file, dest);
}

console.log(
  `Synced ${markdownFiles.length} chibirigor pages and ${svgFiles.length} figures from ${path.relative(projectRoot, bookRoot)}.`
);

// ---------------------------------------------------------------------------

function isPublishablePage(file) {
  const rel = path.relative(bookRoot, file).split(path.sep).join('/');
  if (rel.split('/').some((segment) => segment.startsWith('_') || segment.startsWith('.'))) return false;
  if (rel.includes('/examples/') || rel.includes('/dist/')) return false;
  return true;
}

// Map a book-relative source path to its output path under outputRoot.
// READMEs become directory index pages.
function outputRelPathFor(relativePath) {
  const segments = relativePath.split('/');
  const fileName = segments.at(-1);
  if (fileName.toLowerCase() === 'readme.md') {
    return [...segments.slice(0, -1), 'index.md'].join('/');
  }
  return segments.join('/');
}

// Map a book-relative source path to its public site route (no trailing
// file extension; READMEs collapse to the directory). Returns null when
// the path is not a published page.
function publishedRoute(relativePath) {
  if (!relativePath.endsWith('.md')) return null;
  const probe = path.resolve(bookRoot, relativePath);
  if (!markdownFiles.some((file) => file === probe)) return null;
  const outRel = outputRelPathFor(relativePath);
  const segments = outRel.split('/');
  const fileName = segments.at(-1);
  if (fileName === 'index.md') {
    segments.pop();
  } else {
    segments[segments.length - 1] = fileName.replace(/\.md$/i, '');
  }
  const tail = segments.join('/');
  return tail ? `${siteBase}/${tail}/` : `${siteBase}/`;
}

function transformPage(source, relativePath, sourceDate) {
  let { frontmatter, body } = splitFrontmatter(source);
  // Strip the leading H1 from the body: Starlight renders the frontmatter
  // `title` as the page heading, so keeping the Markdown H1 duplicates it.
  const heading = /^#\s+(.+?)\s*$/m.exec(body);
  const headingTitle = heading?.[1];
  // Only strip when the H1 is the document's opening line (the title).
  if (heading && body.slice(0, heading.index).trim() === '') {
    const lineEnd = body.indexOf('\n', heading.index);
    body = body.slice(0, heading.index) + (lineEnd === -1 ? '' : body.slice(lineEnd + 1));
  }
  body = rewriteLinks(body, relativePath);
  frontmatter = ensureFrontmatter(frontmatter, relativePath, sourceDate, headingTitle);
  return `---\n${frontmatter}\n---\n\n${body.replace(/^\n+/, '')}`;
}

function rewriteLinks(body, relativePath) {
  const sourceDir = path.posix.dirname(relativePath);
  // Matches both image (![alt](target)) and normal ([text](target)) links.
  return body.replace(/(!?)\]\(([^)\s]+?)(#[^)\s]*)?\)/g, (match, bang, target, hash = '') => {
    // Leave external links, mailto:, protocol-relative, and bare anchors alone.
    if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(target)) return match;

    const resolved = path.posix.normalize(path.posix.join(sourceDir, target));
    const rewritten = mapTarget(resolved, target);
    return `${bang}](${rewritten}${hash})`;
  });
}

// Resolve a book-relative target to its final URL.
function mapTarget(resolved, originalTarget) {
  const trailingSlash = originalTarget.endsWith('/');

  // Figures: copied into public/ and served at an absolute path.
  if (/\.svg$/i.test(resolved) && resolved.startsWith('figures/')) {
    return `${figuresBase}/${resolved.slice('figures/'.length)}`;
  }

  // Ruby example sources and packaged dist/ trees: link to GitHub.
  if (/\.rb$/i.test(resolved) || resolved.includes('examples/') || resolved.includes('dist/')) {
    const kind = /\.[a-z0-9]+$/i.test(resolved) ? 'blob' : 'tree';
    return `${repoBase}/${kind}/master/${repoBookPath}/${resolved}`;
  }

  // Published Markdown pages: link to the on-site route.
  const route = publishedRoute(resolved);
  if (route) return route;

  // Bare directory links to a section that has an index page.
  if (!/\.[a-z0-9]+$/i.test(resolved) || trailingSlash) {
    const dirIndex = publishedRoute(`${resolved.replace(/\/$/, '')}/README.md`);
    if (dirIndex) return dirIndex;
    // `appendix/` has no index page — land on the first appendix entry.
    if (resolved.replace(/\/$/, '') === 'appendix') return `${siteBase}/appendix/a1-special-types/`;
  }

  // Anything else (working files, unknown paths): point at GitHub so the
  // link still resolves rather than 404-ing on-site.
  const kind = /\.[a-z0-9]+$/i.test(resolved) ? 'blob' : 'tree';
  return `${repoBase}/${kind}/master/${repoBookPath}/${resolved}`;
}

function ensureFrontmatter(frontmatter, relativePath, sourceDate, headingTitle) {
  const sourcePath = `${repoBookPath}/${relativePath}`;
  const lines = frontmatter ? [frontmatter] : [];

  if (!hasKey(frontmatter, 'title')) {
    lines.push(`title: ${JSON.stringify(headingTitle ?? titleFromPath(relativePath))}`);
  }
  if (!hasKey(frontmatter, 'editUrl')) {
    lines.push(`editUrl: ${JSON.stringify(`${repoBase}/edit/master/${sourcePath}`)}`);
  }
  if (!hasKey(frontmatter, 'sourcePath')) {
    lines.push(`sourcePath: ${JSON.stringify(sourcePath)}`);
  }
  if (sourceCommit && !hasKey(frontmatter, 'sourceCommit')) {
    lines.push(`sourceCommit: ${JSON.stringify(sourceCommit)}`);
  }
  if (sourceDate && !hasKey(frontmatter, 'sourceDate')) {
    lines.push(`sourceDate: ${JSON.stringify(sourceDate)}`);
  }
  if (!hasKey(frontmatter, 'sourceLanguage')) {
    lines.push('sourceLanguage: "ja"');
  }
  return lines.join('\n');
}

function titleFromPath(relativePath) {
  const base = path.basename(relativePath, '.md');
  return base === 'README' ? 'chibirigor' : base;
}

function hasKey(frontmatter, key) {
  return new RegExp(`^${key}:`, 'm').test(frontmatter ?? '');
}

function splitFrontmatter(source) {
  if (!source.startsWith('---\n')) return { frontmatter: '', body: source };
  const end = source.indexOf('\n---', 4);
  if (end === -1) return { frontmatter: '', body: source };
  const afterEnd = source.indexOf('\n', end + 4);
  return {
    frontmatter: source.slice(4, end).trim(),
    body: afterEnd === -1 ? '' : source.slice(afterEnd + 1),
  };
}

async function collectFiles(directory, extension) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath, extension)));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(entryPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

async function readSubmoduleCommit() {
  try {
    const { stdout } = await execFileAsync('git', ['-C', submoduleRoot, 'rev-parse', 'HEAD']);
    return stdout.trim();
  } catch {
    return '';
  }
}

async function fileLastCommitDate(sourcePath) {
  try {
    const { stdout } = await execFileAsync('git', [
      '-C', submoduleRoot, 'log', '-1', '--format=%aI', '--', sourcePath,
    ]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}
