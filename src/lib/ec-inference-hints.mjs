// Expressive Code plugin: render Rigor inference output embedded in showcase
// code blocks as editor-style inlay hints instead of raw comments.
//
// The splash pages print real CLI output inside their snippets — `#=> value`
// trailing comments (the `rigor annotate` xmpfilter convention) and
// `# error:` / `# info:` diagnostic lines. Left as plain comments they can
// read as *type annotations in the source*, undermining the page's central
// claim that Rigor needs none. This plugin keeps the Markdown source in the
// CLI-faithful comment form (which scripts/verify-showcase-examples.mjs
// diffs against the real CLI, and the .md twins ship verbatim) and changes
// only the RENDERED form:
//
//   - `#=> value`  → the `#=>` marker is visually hidden and the value is
//     wrapped in a `.rigor-hint` badge (`--nominal` for type displays,
//     `--constant` for value displays — Rigor's carrier palette);
//   - a `severity:` keyword (`error:` / `warning:` / `info:`) → wrapped in a
//     `.rigor-sev--<severity>` span, matching the CLI's own colouring.
//
// Strictly opt-in via the fence meta flag `inferred` (```ruby inferred),
// so the generated handbook/manual pages — full of `#=>` comments of their
// own — are untouched. The badge styles live in src/styles/custom.css.
// The copy button is unaffected: it copies the original source, comments
// included, so a paste into the playground keeps the reference values.

import { definePlugin, ExpressiveCodeAnnotation } from '@astrojs/starlight/expressive-code';

class ClassedSpanAnnotation extends ExpressiveCodeAnnotation {
  constructor({ inlineRange, classNames }) {
    super({ inlineRange });
    this.classNames = classNames;
  }

  render({ nodesToTransform }) {
    return nodesToTransform.map((node) => ({
      type: 'element',
      tagName: 'span',
      properties: { className: this.classNames },
      children: [node],
    }));
  }
}

/**
 * Value displays (`120`, `"***"`, `[10, 30]`, `{ … }`, `:sym`, `true`,
 * `Point(x: 1, y: "two")`) get the constant-carrier colour; everything else
 * (`Integer`, `Journal?`, `Hash[…]`, `Speed`) reads as a type display and
 * gets the nominal colour.
 */
function hintKind(value) {
  return /^(?:[-\d"':\[{]|true\b|false\b|nil\b|[A-Z]\w*\()/.test(value) ? 'constant' : 'nominal';
}

export function rigorInferenceHints() {
  return definePlugin({
    name: 'Rigor inference hints',
    hooks: {
      postprocessAnalyzedCode: ({ codeBlock }) => {
        if (!codeBlock.metaOptions.getBoolean('inferred')) return;
        for (const line of codeBlock.getLines()) {
          const text = line.text;

          const hint = text.match(/(?:^|\s)#=>(\s+)(.+?)\s*$/);
          if (hint) {
            const markerStart = text.lastIndexOf('#=>');
            const valueStart = markerStart + 3 + hint[1].length;
            const valueEnd = valueStart + hint[2].length;
            line.addAnnotation(new ClassedSpanAnnotation({
              inlineRange: { columnStart: markerStart, columnEnd: valueStart },
              classNames: ['rigor-hint-marker'],
            }));
            line.addAnnotation(new ClassedSpanAnnotation({
              inlineRange: { columnStart: valueStart, columnEnd: valueEnd },
              classNames: ['rigor-hint', `rigor-hint--${hintKind(hint[2])}`],
            }));
            continue;
          }

          const sev = text.match(/(?:^|[#\s]\s*)(error|warning|info):\s/);
          if (sev) {
            const start = text.indexOf(`${sev[1]}:`);
            line.addAnnotation(new ClassedSpanAnnotation({
              inlineRange: { columnStart: start, columnEnd: start + sev[1].length + 1 },
              classNames: ['rigor-sev', `rigor-sev--${sev[1]}`],
            }));
          }
        }
      },
    },
  });
}
