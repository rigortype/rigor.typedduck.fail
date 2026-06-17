#!/usr/bin/env node
// Sync the chibirigor online book into the site.
//
// Source:  upstream/chibirigor/book/v2/{en,ja}  (a git submodule)
// Output:  src/content/docs/chibirigor      (EN edition, root locale)
//          src/content/docs/ja/chibirigor    (JA edition)
//          public/chibirigor/figures          (EN SVG figures)
//          public/ja/chibirigor/figures       (JA SVG figures)
//
// The published book is v2; v2 supersedes v1 and v1 is no longer synced.
// Only the book prose under book/v2/<locale> is published. The Ruby example
// sources (`*/examples/`, `*/dist/`) and any working files (`_*.md`,
// `.reviews/`) are NOT copied — links pointing at them are rewritten to
// the chibirigor GitHub repository instead.
//
// The book pages are upstream-owned content (both EN and JA are authored
// upstream). As with the `sourceLanguage` pages in sync-rigor-docs, they are
// passed through verbatim: the Japanese *terminology* normalizer is NOT
// applied (it would be clobbered on the next sync anyway). The *typography*
// normalizer IS applied — its CJK/Latin spacing rules are no-ops on the
// English edition, but its table-cell pipe escaping is needed on both.
//
// The EN edition lives in the root locale and the JA edition in the `ja`
// locale; the per-locale SVG figures carry localised text, so each edition
// copies its own figures to a locale-specific public path.
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { transform as normalizeTypography } from './normalize-ja-typography.mjs';

const execFileAsync = promisify(execFile);

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const submoduleRoot = path.resolve(projectRoot, process.env.CHIBIRIGOR_SOURCE_DIR ?? 'upstream/chibirigor');

// GitHub repository the un-published sources (Ruby examples, dist/) and any
// unrecognised links are pointed at.
const repoBase = 'https://github.com/rigortype/chibirigor';

// The published editions. v2 supersedes v1. Each edition is self-contained:
// its prose cross-links only within its own locale tree, and its figures are
// copied to a locale-specific public path because the SVGs carry localised
// text and would otherwise collide.
const editions = [
  {
    locale: 'en',
    bookRel: 'book/v2/en',
    outputRoot: path.resolve(projectRoot, 'src/content/docs/chibirigor'),
    figuresOutputRoot: path.resolve(projectRoot, 'public/chibirigor/figures'),
    siteBase: '/chibirigor',
    figuresBase: '/chibirigor/figures',
  },
  {
    locale: 'ja',
    bookRel: 'book/v2/ja',
    outputRoot: path.resolve(projectRoot, 'src/content/docs/ja/chibirigor'),
    figuresOutputRoot: path.resolve(projectRoot, 'public/ja/chibirigor/figures'),
    siteBase: '/ja/chibirigor',
    figuresBase: '/ja/chibirigor/figures',
  },
];

const sourceCommit = await readSubmoduleCommit();

let totalPages = 0;
let totalFigures = 0;
for (const edition of editions) {
  const { pages, figures } = await syncEdition(edition);
  totalPages += pages;
  totalFigures += figures;
}

console.log(
  `Synced ${totalPages} chibirigor pages and ${totalFigures} figures across ${editions.length} editions.`
);

// ---------------------------------------------------------------------------

async function syncEdition(edition) {
  const { locale, bookRel, outputRoot, figuresOutputRoot, siteBase, figuresBase } = edition;
  const bookRoot = path.resolve(submoduleRoot, bookRel);
  const repoBookPath = bookRel;

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const markdownFiles = (await collectFiles(bookRoot, '.md')).filter((file) =>
    isPublishablePage(bookRoot, file)
  );

  for (const file of markdownFiles) {
    const relativePath = path.relative(bookRoot, file).split(path.sep).join('/');
    const destinationPath = path.resolve(outputRoot, outputRelPathFor(relativePath));
    const source = await readFile(file, 'utf8');
    const sourceDate = await fileLastCommitDate(`${repoBookPath}/${relativePath}`);
    const content = transformPage(source, relativePath, sourceDate);

    await mkdir(path.dirname(destinationPath), { recursive: true });
    await writeFile(destinationPath, content);
  }

  // Copy the SVG figures into public/ so the absolute figure links resolve.
  await rm(figuresOutputRoot, { recursive: true, force: true });
  const svgFiles = await collectFiles(path.join(bookRoot, 'figures'), '.svg');
  for (const file of svgFiles) {
    const rel = path.relative(path.join(bookRoot, 'figures'), file);
    const dest = path.join(figuresOutputRoot, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(file, dest);
  }

  console.log(
    `  [${locale}] ${markdownFiles.length} pages, ${svgFiles.length} figures from ${path.relative(projectRoot, bookRoot)}.`
  );

  return { pages: markdownFiles.length, figures: svgFiles.length };

  // --- edition-local transforms (capture the edition's locale/base paths) ---

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
    // Convert GitHub-style alerts (`> [!NOTE]` …) to Starlight asides before
    // anything else: Starlight does not render the GitHub syntax (it would show
    // a literal `[!NOTE]`), and de-blockquoting first turns any fenced code
    // inside an alert back into a real fence that the link rewriter / typography
    // normaliser correctly skip.
    body = convertGithubAlerts(body);
    body = rewriteLinks(body, relativePath);
    // Apply Japanese typography normalisation (spaces between CJK/Latin, parens,
    // punctuation, table-cell pipe escaping) so pages match the same house style
    // as the reference docs. Applied here rather than post-hoc so it survives
    // every re-sync automatically. On the EN edition the CJK rules are no-ops;
    // the table-pipe escaping still applies (it breaks the same way in GFM).
    body = normalizeTypography(body);
    frontmatter = ensureFrontmatter(frontmatter, relativePath, sourceDate, headingTitle);
    return `---\n${frontmatter}\n---\n\n${body.replace(/^\n+/, '')}`;
  }

  // GitHub alert kind → Starlight aside opener. NOTE/TIP map 1:1. IMPORTANT is
  // the book's "core principle" marker (per its STYLE.md), not a hazard, so it
  // keeps the calm `note` colour but carries an explicit, locale-aware title so
  // it still reads as more than a plain note. WARNING/CAUTION (unused in v2 but
  // handled for completeness) map to the cautionary asides.
  function alertOpener(kind) {
    switch (kind.toUpperCase()) {
      case 'TIP': return ':::tip';
      case 'IMPORTANT': return `:::note[${locale === 'ja' ? '重要' : 'Important'}]`;
      case 'WARNING': return ':::caution';
      case 'CAUTION': return ':::danger';
      case 'NOTE':
      default: return ':::note';
    }
  }

  // Rewrite `> [!KIND]` … blockquote alerts as Starlight `:::kind` asides.
  // A GitHub alert is one blockquote: the `[!KIND]` marker alone on the first
  // line, then the body on consecutive `>` lines. Defensive blank lines are
  // added around the aside so the directive always parses.
  function convertGithubAlerts(body) {
    const lines = body.split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const marker = /^>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/.exec(lines[i]);
      if (!marker) {
        out.push(lines[i]);
        continue;
      }
      const inner = [];
      let j = i + 1;
      for (; j < lines.length && /^>/.test(lines[j]); j++) {
        inner.push(lines[j].replace(/^>[ \t]?/, ''));
      }
      while (inner.length && inner[0].trim() === '') inner.shift();
      while (inner.length && inner.at(-1).trim() === '') inner.pop();
      if (out.length && out.at(-1).trim() !== '') out.push('');
      out.push(alertOpener(marker[1]), ...inner, ':::');
      if (j < lines.length && lines[j].trim() !== '') out.push('');
      i = j - 1;
    }
    return out.join('\n');
  }

  function rewriteLinks(body, relativePath) {
    const sourceDir = path.posix.dirname(relativePath);
    // Only rewrite links in prose: a `](…)` sequence inside a fenced code block
    // or an inline code span (e.g. the Ruby `h.[](:foo)`) is code, not a link.
    // Split off fenced blocks (odd indices), then within each prose run mask
    // inline code spans before applying the link regex.
    return body
      .split(/(^```[\s\S]*?^```)/gm)
      .map((segment, index) => (index % 2 === 1 ? segment : rewriteProseLinks(segment, sourceDir)))
      .join('');
  }

  function rewriteProseLinks(text, sourceDir) {
    // NUL never occurs in Markdown source, so a NUL-delimited index is a
    // collision-free placeholder for a masked inline code span. Mask any
    // backtick run on a line so its contents can't be read as a link.
    const codeSpans = [];
    const masked = text.replace(/(`+)[^\n]*?\1/g, (span) => {
      codeSpans.push(span);
      return `\0${codeSpans.length - 1}\0`;
    });
    // Matches both image (![alt](target)) and normal ([text](target)) links.
    const rewritten = masked.replace(/(!?)\]\(([^)\s]+?)(#[^)\s]*)?\)/g, (match, bang, target, hash = '') => {
      // Leave external links, mailto:, protocol-relative, and bare anchors alone.
      if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(target)) return match;

      const resolved = path.posix.normalize(path.posix.join(sourceDir, target));
      return `${bang}](${mapTarget(resolved, target)}${hash})`;
    });
    return rewritten.replace(/\0(\d+)\0/g, (_, i) => codeSpans[Number(i)]);
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
      return toGithubUrl(resolved);
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
    return toGithubUrl(resolved);
  }

  // Build a GitHub URL for an un-published target. Normalises any leading
  // `../` that escapes the book root — e.g. an EN page's `../ja/README.md`
  // resolves to book/v2/ja/README.md — so the URL never carries a literal `..`.
  function toGithubUrl(resolved) {
    const repoPath = path.posix.normalize(`${repoBookPath}/${resolved}`);
    const kind = /\.[a-z0-9]+$/i.test(resolved) ? 'blob' : 'tree';
    return `${repoBase}/${kind}/master/${repoPath}`;
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
      lines.push(`sourceLanguage: ${JSON.stringify(locale)}`);
    }
    return lines.join('\n');
  }
}

// ---------------------------------------------------------------------------

function isPublishablePage(bookRoot, file) {
  const rel = path.relative(bookRoot, file).split(path.sep).join('/');
  if (rel.split('/').some((segment) => segment.startsWith('_') || segment.startsWith('.'))) return false;
  if (rel.includes('/examples/') || rel.includes('/dist/')) return false;
  // STYLE.md is a contributor style/terminology guide (the EN edition ships
  // one), not part of the reader's path — keep it out of the published tree.
  if (path.basename(rel).toLowerCase() === 'style.md') return false;
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
