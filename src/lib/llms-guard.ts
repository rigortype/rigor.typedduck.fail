import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Build-time integrity for the hand-authored llms.txt indexes (EN + JA mirror).
// The curated index deliberately links a *subset* of chapters, so "every chapter
// listed" is the wrong invariant. The drift that actually rots these files — the
// one that prompted ADR-74 — is a stale *skill surface*: the old index kept
// recommending skills that had been renamed or removed. This guard catches
// exactly that, and only that, so it can never false-positive on an editorial
// choice to omit a chapter.

// `rigor-rs` is the sibling experimental Rust port named in the corrections
// section, not a bundled skill — reference it freely.
const NON_SKILL_RIGOR_NAMES = new Set(['rigor-rs']);

/**
 * Backtick-quoted ``rigor-<name>`` references in `indexBody` that do not resolve
 * to a bundled skill under upstream/rigor/skills/. Returns `[]` when the
 * upstream submodule is not checked out, so a local build without submodules
 * stays green (the check is a CI safety net, not a hard dependency).
 */
export function danglingSkills(indexBody: string): string[] {
  // Resolved from the build's working directory (the repo root under `pnpm
  // build`), not `import.meta.url` — Vite rewrites the module URL of bundled
  // server code, which would break a source-relative path and silently disable
  // the check.
  const skillsDir = join(process.cwd(), 'upstream', 'rigor', 'skills');
  if (!existsSync(skillsDir)) return [];

  const bundled = new Set(
    readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
  const referenced = new Set(
    [...indexBody.matchAll(/`(rigor-[a-z-]+)`/g)].map((match) => match[1]),
  );

  return [...referenced].filter(
    (name) => !NON_SKILL_RIGOR_NAMES.has(name) && !bundled.has(name),
  );
}
