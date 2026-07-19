#!/usr/bin/env node
// Guard for the splash-page showcase examples (src/content/docs/index.mdx and
// its ja/ mirror): every inference claim printed on the landing page is run
// through the REAL rigor CLI from the pinned upstream/rigor submodule, and the
// page's `#=>` / diagnostic comments are diffed against actual output. The
// upstream showcase note (docs/notes/20260719-website-showcase-inference-
// examples.md) requires exactly this before publishing a snippet — the guard
// makes the requirement mechanical, so the landing page cannot drift from
// what the checker actually prints.
//
// What is asserted, per fenced ```ruby block inside a <ShowcasePanel>:
//   - a trailing `#=> VALUE` comment       → `rigor annotate --format=json`
//     must report exactly VALUE for that line;
//   - a `# error: MSG` / `# info: MSG` comment (inline, or standalone right
//     after the code line it describes; `#    …` continuation lines join with
//     a space) → `rigor check` must emit a same-severity diagnostic with
//     exactly MSG on that line, and no UNclaimed error/warning may appear;
//   - panels listed in `checkClean` → `rigor check` must emit no error and
//     no warning at all;
//   - the hero ```shell-session block (`$ rigor check demo.rb` + output)
//     → `rigor check` on the preceding ruby block must reproduce the shown
//     diagnostic lines verbatim;
//   - the sig-gen panel's `# rigor sig-gen emits:` comment lines
//     → `rigor sig-gen --print` output must contain each emitted line;
//   - every ```ruby / ```shell-session block must be byte-identical between
//     the EN page and the JA mirror (the locales share code verbatim).
//
// Plugin panels run inside a per-snippet fixture project (mirroring the
// upstream integration specs): rigor-units gets the examples/rigor-units/demo
// lib/ + sig/ and a `require_relative "lib/units"` preamble; rigor-activerecord
// gets the spec's db/schema.rb + app/models fixtures. Preamble lines shift the
// diagnostic line numbers and are accounted for.
//
// This guard needs the upstream dev environment and is therefore NOT part of
// `pnpm build` (the site's CI has no Nix). Run it standalone after a submodule
// bump or any splash edit — the sync-upstream skill lists it as a checklist
// step:
//
//   node scripts/verify-showcase-examples.mjs
//
// Prerequisites (one-time, ~minutes): Nix plus the submodule bundle —
//   cd upstream/rigor && nix --extra-experimental-features 'nix-command flakes' \
//     develop --command make setup
//
// Each rigor invocation goes through `nix develop` (per upstream AGENTS.md:
// never run bundle/ruby against the host), so a full run takes ~1 minute.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SITE_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const RIGOR_ROOT = path.join(SITE_ROOT, 'upstream', 'rigor');
const EN_PAGE = path.join(SITE_ROOT, 'src/content/docs/index.mdx');
const JA_PAGE = path.join(SITE_ROOT, 'src/content/docs/ja/index.mdx');

// ─── Environment ────────────────────────────────────────────────────────────

function resolveNix() {
  const fallback = '/nix/var/nix/profiles/default/bin/nix';
  const probe = spawnSync('nix', ['--version'], { stdio: 'ignore' });
  if (probe.status === 0) return 'nix';
  if (existsSync(fallback)) return fallback;
  return null;
}

const nix = resolveNix();
if (!nix) {
  console.error('verify-showcase-examples: nix not found (PATH or /nix/var/nix/profiles/default/bin).');
  console.error('The guard runs rigor through the upstream Nix Flake and cannot fall back to the host.');
  process.exit(1);
}
if (!existsSync(path.join(RIGOR_ROOT, 'vendor', 'bundle'))) {
  console.error('verify-showcase-examples: upstream/rigor/vendor/bundle missing — run one-time setup first:');
  console.error("  cd upstream/rigor && nix --extra-experimental-features 'nix-command flakes' develop --command make setup");
  process.exit(1);
}

/**
 * Run `rigor <args>` from `cwd` through the flake dev shell. Returns combined
 * stdout+stderr; rigor's exit status is not meaningful here (`check` exits
 * non-zero whenever it reports an error diagnostic), so it is not checked.
 */
function rigor(args, { cwd, env = {} } = {}) {
  const envArgs = Object.entries({ BUNDLE_GEMFILE: path.join(RIGOR_ROOT, 'Gemfile'), ...env })
    .map(([k, v]) => `${k}=${v}`);
  const result = spawnSync(
    nix,
    ['--extra-experimental-features', 'nix-command flakes', 'develop', RIGOR_ROOT,
     '--command', 'env', ...envArgs, 'bundle', 'exec', 'ruby', path.join(RIGOR_ROOT, 'exe', 'rigor'), ...args],
    { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

// ─── Page parsing ───────────────────────────────────────────────────────────

/**
 * Walk the MDX source and return its fenced code blocks in order, each tagged
 * with the kicker of the enclosing <ShowcasePanel> (null before the first
 * panel — the hero area).
 */
function extractBlocks(source) {
  const lines = source.split('\n');
  const blocks = [];
  let kicker = null;
  let fence = null;
  for (const line of lines) {
    const kickerMatch = line.match(/^\s*kicker="([^"]+)"/);
    if (kickerMatch) kicker = kickerMatch[1];
    const fenceMatch = line.match(/^```(\S*)\s*$/);
    if (fenceMatch && !fence) {
      fence = { lang: fenceMatch[1], kicker, lines: [] };
      continue;
    }
    if (fence) {
      if (line === '```') {
        blocks.push({ ...fence, code: fence.lines.join('\n') });
        fence = null;
      } else {
        fence.lines.push(line);
      }
    }
  }
  return blocks;
}

/** `#=> VALUE` trailing comments → [{ line (1-based), value }]. */
function annotateExpectations(code) {
  const expects = [];
  code.split('\n').forEach((line, i) => {
    const m = line.match(/\s#=>\s+(.*\S)\s*$/);
    if (m) expects.push({ line: i + 1, value: m[1] });
  });
  return expects;
}

/**
 * `# error: MSG` / `# info: MSG` comments → [{ line, severity, message }].
 * An inline comment claims its own line; a standalone comment line claims the
 * nearest preceding code line. `#   …` continuations extend the message.
 */
function diagnosticExpectations(code) {
  const expects = [];
  let lastCodeLine = null;
  code.split('\n').forEach((raw, i) => {
    const standalone = raw.match(/^\s*#\s*(error|info|warning):\s+(.*\S)\s*$/);
    const inline = raw.match(/\S.*#\s*(error|info|warning):\s+(.*\S)\s*$/);
    const continuation = raw.match(/^\s*#\s+(?!(?:error|info|warning):)(.*\S)\s*$/);
    if (standalone) {
      expects.push({ line: lastCodeLine, severity: standalone[1], message: standalone[2] });
    } else if (inline && !raw.trimStart().startsWith('#')) {
      lastCodeLine = i + 1;
      expects.push({ line: i + 1, severity: inline[1], message: inline[2] });
    } else if (continuation && expects.length > 0 && lastCodeLine !== null) {
      expects[expects.length - 1].message += ` ${continuation[1]}`;
    } else if (raw.trim() && !raw.trimStart().startsWith('#')) {
      lastCodeLine = i + 1;
    }
  });
  return expects;
}

/** Parse `rigor check` output lines for `file` → [{ line, severity, message }]. */
function parseDiagnostics(output, file) {
  const diags = [];
  for (const raw of output.split('\n')) {
    const m = raw.match(/^(.+?):(\d+):(\d+): (error|warning|info): (.*)$/);
    if (!m) continue;
    if (path.basename(m[1]) !== file) continue;
    diags.push({ line: Number(m[2]), severity: m[4], message: m[5].replace(/ \[[^\]\s]+\]$/, '') });
  }
  return diags;
}

// ─── Assertions ─────────────────────────────────────────────────────────────

const failures = [];
let checksRun = 0;

function fail(context, detail) {
  failures.push(`${context}\n    ${detail}`);
  console.log(`  FAIL ${context}`);
  console.log(`       ${detail}`);
}

function pass(context) {
  checksRun++;
  console.log(`  ok   ${context}`);
}

function runAnnotate(label, workdir, file, code, offset = 0) {
  const expects = annotateExpectations(code);
  if (expects.length === 0) return;
  const output = rigor(['annotate', '--format=json', file], { cwd: workdir });
  const jsonLine = output.split('\n').filter((l) => l.startsWith('{')).pop();
  let annotations = {};
  try {
    annotations = JSON.parse(jsonLine ?? '{}').annotations ?? {};
  } catch {
    fail(`${label} annotate`, `unparseable annotate output: ${output.slice(0, 200)}`);
    return;
  }
  for (const { line, value } of expects) {
    const actual = annotations[String(line + offset)];
    if (actual === value) pass(`${label} annotate L${line} #=> ${value}`);
    else fail(`${label} annotate L${line}`, `page says \`#=> ${value}\`, rigor says \`#=> ${actual ?? '(nothing)'}\``);
  }
}

function runCheck(label, workdir, file, code, { clean = false, offset = 0, env } = {}) {
  const expects = diagnosticExpectations(code);
  const output = rigor(['check', file], { cwd: workdir, env });
  const actual = parseDiagnostics(output, file);
  if (clean) {
    const noisy = actual.filter((d) => d.severity !== 'info');
    if (noisy.length === 0) pass(`${label} check: clean`);
    else fail(`${label} check`, `expected no diagnostics, got: ${noisy.map((d) => `L${d.line - offset} ${d.severity}: ${d.message}`).join(' | ')}`);
    return;
  }
  for (const e of expects) {
    const hit = actual.find((d) => d.line === e.line + offset && d.severity === e.severity && d.message === e.message);
    if (hit) pass(`${label} check L${e.line} ${e.severity}`);
    else {
      const near = actual.filter((d) => d.line === e.line + offset).map((d) => `${d.severity}: ${d.message}`).join(' | ') || '(no diagnostic on that line)';
      fail(`${label} check L${e.line}`, `page claims \`${e.severity}: ${e.message}\`; rigor says ${near}`);
    }
  }
  const unclaimed = actual.filter(
    (d) => d.severity !== 'info' && !expects.some((e) => e.line + offset === d.line && e.severity === d.severity),
  );
  if (unclaimed.length > 0) {
    fail(`${label} check`, `unclaimed ${unclaimed[0].severity} at L${unclaimed[0].line - offset}: ${unclaimed[0].message}`);
  } else if (expects.length > 0) {
    pass(`${label} check: no unclaimed errors`);
  }
}

// ─── Snippet drivers ────────────────────────────────────────────────────────

const scratchRoot = mkdtempSync(path.join(tmpdir(), 'rigor-showcase-'));

function workdirFor(name) {
  const dir = path.join(scratchRoot, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function verifyHero(rubyBlock, shellBlock) {
  const dir = workdirFor('hero');
  writeFileSync(path.join(dir, 'demo.rb'), `${rubyBlock.code}\n`);
  const expected = shellBlock.code.split('\n').filter((l) => l && !l.startsWith('$'));
  const output = rigor(['check', 'demo.rb'], { cwd: dir });
  const actual = output.split('\n').filter((l) => /^demo\.rb:\d+:\d+: /.test(l)).map((l) => l.replace(/ \[[^\]\s]+\]$/, ''));
  const missing = expected.filter((l) => !actual.includes(l));
  const extraNoise = actual.filter((l) => / (error|warning): /.test(l) && !expected.includes(l));
  if (missing.length === 0 && extraNoise.length === 0) pass('hero rigor check output matches');
  else fail('hero rigor check', `missing: ${JSON.stringify(missing)}; unexpected: ${JSON.stringify(extraNoise)}`);
}

function verifyPlain(label, block, { checkClean = false }) {
  const dir = workdirFor(label.replace(/[^a-z0-9]+/gi, '-'));
  writeFileSync(path.join(dir, 'snippet.rb'), `${block.code}\n`);
  runAnnotate(label, dir, 'snippet.rb', block.code);
  if (checkClean || diagnosticExpectations(block.code).length > 0) {
    runCheck(label, dir, 'snippet.rb', block.code, { clean: checkClean });
  }
}

function verifyUnits(label, block) {
  const dir = workdirFor('units');
  execFileSync('cp', ['-R', path.join(RIGOR_ROOT, 'examples/rigor-units/demo/lib'), path.join(RIGOR_ROOT, 'examples/rigor-units/demo/sig'), dir]);
  const preamble = 'require_relative "lib/units"\n\n';
  const offset = preamble.split('\n').length - 1;
  writeFileSync(path.join(dir, 'snippet.rb'), `${preamble}${block.code}\n`);
  writeFileSync(path.join(dir, '.rigor.yml'), 'paths:\n  - snippet.rb\nsignature_paths:\n  - sig\nplugins:\n  - rigor-units\n');
  const env = { RUBYLIB: path.join(RIGOR_ROOT, 'examples/rigor-units/lib') };
  const output = rigor(['annotate', '--format=json', 'snippet.rb'], { cwd: dir, env });
  const jsonLine = output.split('\n').filter((l) => l.startsWith('{')).pop();
  const annotations = JSON.parse(jsonLine ?? '{}').annotations ?? {};
  for (const { line, value } of annotateExpectations(block.code)) {
    const actual = annotations[String(line + offset)];
    if (actual === value) pass(`${label} annotate L${line} #=> ${value}`);
    else fail(`${label} annotate L${line}`, `page says \`#=> ${value}\`, rigor says \`#=> ${actual ?? '(nothing)'}\``);
  }
  runCheck(label, dir, 'snippet.rb', block.code, { offset, env });
}

// Fixture project mirroring DEFAULT_SCHEMA / DEFAULT_MODELS in upstream's
// spec/integration/plugins/activerecord_plugin_spec.rb.
function verifyActiverecord(label, block) {
  const dir = workdirFor('activerecord');
  mkdirSync(path.join(dir, 'db'), { recursive: true });
  mkdirSync(path.join(dir, 'app/models'), { recursive: true });
  writeFileSync(path.join(dir, 'db/schema.rb'), `ActiveRecord::Schema[8.0].define(version: 2026_05_07_000000) do
  create_table "users", force: :cascade do |t|
    t.string  "name", null: false
    t.string  "email", null: false
    t.boolean "admin"
    t.timestamps
  end
end
`);
  writeFileSync(path.join(dir, 'app/models/application_record.rb'), 'class ApplicationRecord\nend\n');
  writeFileSync(path.join(dir, 'app/models/user.rb'), 'class User < ApplicationRecord\nend\n');
  writeFileSync(path.join(dir, 'snippet.rb'), `${block.code}\n`);
  writeFileSync(path.join(dir, '.rigor.yml'), 'paths:\n  - snippet.rb\nplugins:\n  - rigor-activerecord\n');
  runCheck(label, dir, 'snippet.rb', block.code, {});
}

function verifySigGen(label, block) {
  const dir = workdirFor('sig-gen');
  const emitted = [];
  const codeLines = [];
  let inEmits = false;
  for (const line of block.code.split('\n')) {
    if (/^#\s*rigor sig-gen emits:/.test(line)) { inEmits = true; continue; }
    if (inEmits && /^#\s+(.*\S)\s*$/.test(line)) { emitted.push(line.replace(/^#\s+/, '').trim()); continue; }
    codeLines.push(line);
  }
  writeFileSync(path.join(dir, 'snippet.rb'), `${codeLines.join('\n').trim()}\n`);
  const output = rigor(['sig-gen', '--print', 'snippet.rb'], { cwd: dir });
  const outLines = output.split('\n').map((l) => l.trim());
  for (const sig of emitted) {
    if (outLines.includes(sig)) pass(`${label} sig-gen emits \`${sig}\``);
    else fail(`${label} sig-gen`, `page claims emitted \`${sig}\`; not found in sig-gen --print output`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

const enSource = readFileSync(EN_PAGE, 'utf8');
const jaSource = readFileSync(JA_PAGE, 'utf8');
const enBlocks = extractBlocks(enSource);
const jaBlocks = extractBlocks(jaSource);

// EN ↔ JA lockstep: the locales must share every code block byte-for-byte.
{
  const pick = (blocks) => blocks.filter((b) => b.lang === 'ruby' || b.lang === 'shell-session');
  const en = pick(enBlocks);
  const ja = pick(jaBlocks);
  if (en.length !== ja.length) {
    fail('EN/JA lockstep', `EN has ${en.length} ruby/shell-session block(s), JA has ${ja.length}`);
  } else {
    en.forEach((b, i) => {
      if (b.code !== ja[i].code) fail('EN/JA lockstep', `block ${i + 1} (${b.kicker ?? 'hero'}) differs between locales`);
    });
    if (en.every((b, i) => b.code === ja[i].code)) pass(`EN/JA lockstep: ${en.length} code blocks identical`);
  }
}

const ruby = enBlocks.filter((b) => b.lang === 'ruby');
const byKicker = (kicker) => ruby.filter((b) => b.kicker === kicker);

// Hero: the first ruby block plus its shell-session transcript.
const heroRuby = enBlocks.find((b) => b.lang === 'ruby' && b.kicker === null);
const heroShell = enBlocks.find((b) => b.lang === 'shell-session' && b.kicker === null);
if (heroRuby && heroShell) verifyHero(heroRuby, heroShell);
else fail('hero', 'could not locate the hero ruby + shell-session block pair');

const PLAIN_PANELS = [
  { kicker: 'Constant folding', checkClean: false },
  { kicker: 'Flow-sensitive narrowing', checkClean: true },
  { kicker: 'Tuples and hash shapes', checkClean: false },
  { kicker: 'Blocks', checkClean: false },
  { kicker: 'Sound under mutation', checkClean: true },
];

for (const { kicker, checkClean } of PLAIN_PANELS) {
  const blocks = byKicker(kicker);
  if (blocks.length === 0) fail(kicker, 'no ruby blocks found under this kicker');
  blocks.forEach((b, i) => verifyPlain(`${kicker} #${i + 1}`, b, { checkClean }));
}

const pluginBlocks = byKicker('Plugins');
if (pluginBlocks.length === 2) {
  verifyUnits('Plugins/rigor-units', pluginBlocks[0]);
  verifyActiverecord('Plugins/rigor-activerecord', pluginBlocks[1]);
} else {
  fail('Plugins', `expected 2 ruby blocks (units, activerecord), found ${pluginBlocks.length}`);
}

const sigGenBlocks = byKicker('sig-gen');
if (sigGenBlocks.length === 1) verifySigGen('sig-gen', sigGenBlocks[0]);
else fail('sig-gen', `expected 1 ruby block, found ${sigGenBlocks.length}`);

// ─── Report ─────────────────────────────────────────────────────────────────

if (failures.length === 0) {
  rmSync(scratchRoot, { recursive: true, force: true });
  console.log(`\nOK: ${checksRun} showcase assertion(s) verified against rigor @ ${RIGOR_ROOT}.`);
  process.exit(0);
} else {
  console.log(`\n${failures.length} showcase assertion(s) FAILED (${checksRun} passed).`);
  console.log(`Snippet projects kept for inspection under: ${scratchRoot}`);
  console.log('Fix the page (or the harness) so the printed output matches what rigor actually says.');
  process.exit(1);
}
