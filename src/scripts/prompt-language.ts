// Language-aware <details> chooser.
//
// The install/quickstart pages present the same "tell your AI agent to
// install Rigor" prompt in several languages, each inside a separate
// `<details lang="…">` block. This script reads the visitor's language
// preference (an Accept-Language string when one is exposed on the
// document, otherwise `navigator.languages`), reorders each run of
// language-tagged `<details>` so the preferred languages come first in
// Accept-Language priority order, and opens the best match by default.
//
// Markup contract — a "group" is either:
//   * every `<details lang="…">` inside an element with `data-lang-details`, or
//   * a maximal run of adjacent sibling `<details lang="…">` elements.
// Groups of a single element are left untouched (nothing to choose from).

interface RankedDetails {
  el: HTMLDetailsElement;
  domIndex: number;
  key: MatchKey;
}

// Ordering key for a `<details>` language against the preference list:
// [preference index, subtags dropped, exactness]. Smaller is better;
// `Infinity` in the first slot means no match. Compared lexicographically,
// so a higher-priority loose match still beats a lower-priority exact one
// (standard Accept-Language semantics).
type MatchKey = [number, number, number];

const NO_MATCH: MatchKey = [
  Number.POSITIVE_INFINITY,
  Number.POSITIVE_INFINITY,
  Number.POSITIVE_INFINITY,
];

const compareKey = (a: MatchKey, b: MatchKey): number =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Parse an Accept-Language header value into tags ordered by descending q. */
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part, index) => {
      const [rawTag, ...params] = part.trim().split(';');
      let q = 1;
      for (const param of params) {
        const match = /^\s*q\s*=\s*([0-9.]+)\s*$/i.exec(param);
        if (match) q = Number.parseFloat(match[1]);
      }
      return {
        tag: rawTag.trim().toLowerCase(),
        q: Number.isFinite(q) ? q : 0,
        index,
      };
    })
    .filter((entry) => entry.tag && entry.tag !== '*' && entry.q > 0)
    // Sort by q descending; preserve declared order for equal weights.
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.tag);
}

// Minimal CLDR "likely subtags" slice: browsers send region-based Chinese
// tags (`zh-CN` / `zh-TW`) but the prompts are keyed by script
// (`zh-Hans` / `zh-Hant`). Map a script-less Chinese region to its script
// so a Traditional-region reader gets Traditional content.
const ZH_REGION_TO_SCRIPT: Record<string, string> = {
  cn: 'hans',
  sg: 'hans',
  my: 'hans',
  tw: 'hant',
  hk: 'hant',
  mo: 'hant',
};

/** Canonicalise a preference tag toward the script-based content tags. */
function canonicalizePreference(tag: string): string {
  const subtags = tag.split('-');
  if (subtags[0] !== 'zh') return tag;
  if (subtags.includes('hans') || subtags.includes('hant')) return tag;
  const script = ZH_REGION_TO_SCRIPT[subtags[1]];
  return script ? `zh-${script}` : tag;
}

/** The raw, ordered preference tags before canonicalisation. */
function rawPreferredLanguages(): string[] {
  const explicit = document.documentElement.dataset.acceptLanguage;
  if (explicit) {
    const parsed = parseAcceptLanguage(explicit);
    if (parsed.length) return parsed;
  }
  const langs = navigator.languages;
  if (Array.isArray(langs) && langs.length) {
    return langs.map((lang) => lang.toLowerCase());
  }
  return navigator.language ? [navigator.language.toLowerCase()] : [];
}

/** The visitor's preferred languages, highest priority first. */
function preferredLanguages(): string[] {
  return rawPreferredLanguages().map(canonicalizePreference);
}

/**
 * Best-fit match of a `<details>` language against the ordered
 * preference list, following RFC 4647 "lookup": each preference is
 * progressively truncated subtag by subtag, and a content tag matches a
 * truncated range when it equals the range or is a sub-tag-boundary
 * descendant of it. This keeps BCP 47 script/region distinctions —
 * `zh-Hant` beats `zh-Hans` for a `zh-Hant` reader, and an exact `pt`
 * beats `pt-BR` for a generic `pt` reader at the same depth.
 */
function bestMatchKey(lang: string, preferred: string[]): MatchKey {
  const content = lang.trim().toLowerCase();
  if (!content) return NO_MATCH;
  let best = NO_MATCH;
  for (let i = 0; i < preferred.length; i += 1) {
    const subtags = preferred[i].split('-');
    for (let dropped = 0; dropped < subtags.length; dropped += 1) {
      const range = subtags.slice(0, subtags.length - dropped).join('-');
      let exactness: number;
      if (content === range) exactness = 0;
      else if (content.startsWith(`${range}-`)) exactness = 1;
      else continue;
      const key: MatchKey = [i, dropped, exactness];
      if (compareKey(key, best) < 0) best = key;
      break; // ascending `dropped`, so the first hit is the best for this i
    }
  }
  return best;
}

/** The next adjacent sibling that is a `<details lang>`, skipping blank text. */
function nextLangDetails(el: Element): HTMLDetailsElement | null {
  let sib = el.nextSibling;
  while (sib) {
    if (sib.nodeType === Node.TEXT_NODE) {
      if ((sib.textContent ?? '').trim() === '') {
        sib = sib.nextSibling;
        continue;
      }
      return null;
    }
    if (sib.nodeType === Node.ELEMENT_NODE) {
      const el2 = sib as Element;
      return el2.tagName === 'DETAILS' && el2.hasAttribute('lang')
        ? (el2 as HTMLDetailsElement)
        : null;
    }
    sib = sib.nextSibling;
  }
  return null;
}

function collectGroups(): HTMLDetailsElement[][] {
  const groups: HTMLDetailsElement[][] = [];
  const seen = new Set<HTMLDetailsElement>();

  // 1. Explicit containers — collect every descendant <details lang>.
  document.querySelectorAll('[data-lang-details]').forEach((container) => {
    const members = Array.from(
      container.querySelectorAll('details[lang]'),
    ) as HTMLDetailsElement[];
    members.forEach((el) => seen.add(el));
    if (members.length > 1) groups.push(members);
  });

  // 2. Adjacent-sibling runs for everything not already grouped.
  const all = Array.from(
    document.querySelectorAll('details[lang]'),
  ) as HTMLDetailsElement[];
  for (const el of all) {
    if (seen.has(el)) continue;
    const run: HTMLDetailsElement[] = [el];
    seen.add(el);
    let next = nextLangDetails(el);
    while (next && !seen.has(next)) {
      run.push(next);
      seen.add(next);
      next = nextLangDetails(next);
    }
    if (run.length > 1) groups.push(run);
  }

  return groups;
}

function applyGroup(group: HTMLDetailsElement[], preferred: string[]): void {
  const ranked: RankedDetails[] = group.map((el, domIndex) => ({
    el,
    domIndex,
    key: bestMatchKey(el.getAttribute('lang') ?? '', preferred),
  }));

  // Stable sort: by match quality, then original document order for ties.
  const sorted = [...ranked].sort(
    (a, b) => compareKey(a.key, b.key) || a.domIndex - b.domIndex,
  );

  // Reorder the DOM so preferred languages come first.
  const anchor = group[0];
  const parent = anchor.parentNode;
  if (parent) {
    const marker = document.createComment('lang-details');
    parent.insertBefore(marker, anchor);
    for (const item of sorted) parent.insertBefore(item.el, marker);
    parent.removeChild(marker);
  }

  // Open the best match; if nothing matched, fall back to the first block.
  // (When no language matches, every key is NO_MATCH and the sort keeps
  // original order, so sorted[0] is the first authored block anyway.)
  for (const item of sorted) item.el.open = item === sorted[0];
}

function run(): void {
  const groups = collectGroups();
  if (!groups.length) return;
  const preferred = preferredLanguages();
  for (const group of groups) applyGroup(group, preferred);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run, { once: true });
} else {
  run();
}
