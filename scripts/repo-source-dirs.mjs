// Repo-root directories in upstream rigortype/rigor that hold sources/assets
// rather than docs. Upstream prose links into them with repo-root-relative paths
// (`../../lib/…`, `../../plugins/…`); those have NO on-site route, so the sync
// rewriter and the owned-tree guard redirect them — a bare `plugins/<slug>` with
// a published reference page to `/manual/plugins/<slug>/`, everything else to the
// upstream GitHub repo.
//
// This is an explicit ALLOW-LIST on purpose. A deny-list ("anything that is not
// an on-site route section") would also sweep up malformed on-site cross-links —
// e.g. a stray `../docs/type-specification/rbs-extended/` (the author meant the
// on-site page but left a `docs/` prefix) or a bare `../../08-skills/` — and turn
// them into broken GitHub URLs. Those are upstream content bugs; we leave them
// untouched rather than mis-route them.
export const REPO_SOURCE_DIRS = new Set([
  'plugins',
  'examples',
  'lib',
  'sig',
  'spec',
  'references',
  'data',
  'schemas',
  'skills',
]);
