# Rigor documentation design system

## 1. Atmosphere and identity

Preserve the existing Starlight documentation shell and Rigor's parchment/ink identity. API reference pages are navigable technical documents, with readable source names and quiet section rules. ApiGen informs information architecture, not pixel fidelity.

## 2. Color

Use the theme-aware `--sl-color-bg`, `--sl-color-text`, `--sl-color-gray-2`, `--sl-color-gray-6`, `--sl-color-text-accent`, `--sl-color-accent-low` and `--sl-color-hairline` from `src/styles/custom.css`. The existing light palette is parchment (`--rigor-paper`) with oxblood links (`--rigor-accent`); the dark palette uses the site's ink surfaces. No new colors are introduced.

## 3. Typography

Reuse `--sl-font` (Source Serif 4 prose), `--sl-font-system` (Inter labels) and `--sl-font-mono` (JetBrains Mono source names). The third family is inherited from the existing site rather than newly added. Reuse Starlight heading sizes. API secondary metadata is 0.875rem minimum, increasing to 1rem on narrow screens; primary text remains at least 1rem, 1.0625rem on narrow screens. Long Ruby identifiers wrap rather than clip.

## 4. Spacing and layout

Reuse Starlight's content width, 17rem sidebar, 3.5rem header and responsive sidebar behavior. API spacing steps are 0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem and 2rem, based on the site's existing rem spacing. The document owns content scrolling; native details elements provide grouped navigation, never a nested content scroll pane.

## 5. Components

- **Shell:** existing StarlightPage, header, theme selector, sidebar and mobile menu; retain their keyboard and responsive behavior.
- **Namespace navigation:** Starlight sidebar groups and links, expanded for the active namespace. Native disclosure states remain accessible without additional hydration.
- **Breadcrumbs:** semantic navigation with an accessible label and an ordered wrapping list; the current item is text, ancestors are links.
- **Declaration entry:** semantic section with a stable anchor, a wrapping monospace signature and visible kind label; original documentation follows in normal flow. Source definitions remain distinct. Heading levels follow the page hierarchy.
- **Category index:** named classes/modules/constants/member sections using real links; an empty category is omitted and an empty reference explains that no public declarations were exported.
- **Build provenance:** unobtrusive source commit and producer versions, without presenting unparsed contracts as authoritative rendered types.
- **Optional lens facts:** an `aside` within each declaration separates shared member signatures from the definition's own body return. A thin theme accent rule, sidebar surface, existing code styles and definition lists distinguish the producer's typed, dynamic and unavailable states. Signatures wrap on narrow screens; no type text is parsed. The protocol notice identifies the experimental producer.
- **Lens coverage:** a labelled aside with a hairline border and normal prose lists unavailable public declaration counts, incomplete source files and absent capabilities. Per-declaration explanations remain beside the affected definition.
- **Member index:** a labelled navigation landmark groups attributes, instance methods and singleton methods in native `details` elements, initially open. Each entry links to its exact declaration anchor and carries public visibility, source location and the first documentation line. A labelled native select switches the index and declaration groups between definition and name order. It appears only after enhancement; definition order remains readable without JavaScript. Definition order compares source path, line and anchor; name order first compares the Ruby name, then the same source keys, using locale-independent ordering.
- **Member disclosure:** individual methods and attributes use native `details`, initially open. The heading, kind, public visibility and source location stay in the summary, preserving visible direct-link targets even when collapsed. Documentation and lens facts remain in normal Markdown flow. Use 44px summaries, wrapping text and the standard focus ring. Sorting moves existing nodes without resetting open states or focus. No animation or additional UI framework is needed.
- **Source relationships:** definition lists show written superclass/mixin expressions, source lines and links to all retained target definitions. Separate hierarchy pages use nested lists for class relationships and a separate module-usage list. Conflicts, cycles and unresolved expressions remain readable; do not infer runtime ancestry or inherited members. Use existing text, spacing, link and focus tokens.
  Visual indentation stops after four levels on deeply nested trees, retaining semantic nesting and all links so narrow screens remain usable.

- **API symbol search:** an inline disclosure above API content, visibly separate from Starlight prose search. Use a 44px trigger and text field, system labels, monospace wrapping names, 0.875rem metadata (1rem on mobile), hairline result separators, and a tonal active row. The document owns scrolling; show at most 20 results. An explicit label and live status cover idle, loading, results, empty and retryable error states. Keep the API overview link available without JavaScript.

**Publication badges and page controls:** internal/deprecated badges use text on the existing gray-6 tonal surface, system labels and a 4px radius. Native selects and labelled checkboxes retain 44px label/control targets, wrapping and theme-aware focus. Their explanation distinguishes view filtering from publication. The adapter owns the markup and ensures direct anchors reveal selected declarations.

**Search publication filters:** a native fieldset separates display-only filters from build-time publication. Show a Ruby visibility select only when published non-public symbols exist and a labelled internal-documentation checkbox only when internal symbols exist. Use the existing system labels, hairline border, spacing scale and 44px control targets. Filtering resets result selection; it never changes page anchors or publication.

## 6. Motion and interaction

Reuse Starlight's built-in interactions. No new animation, modal or client framework is introduced. API search adapts the beui.dev command-palette input/active-row mechanism to an inline, motion-free combobox. Alt+/ opens and focuses it; arrows move the active result, Enter follows its URL, Escape closes and restores focus. Typing resets selection; closing during a fetch never reopens the panel. No new animation is introduced for reduced-motion users. Links have hover/active feedback and visible keyboard focus; selected navigation uses a tonal fill and weight, without adding an accent border. Native disclosure controls work by keyboard and touch. Reduced-motion preferences remain respected by the shell.

## 7. Depth and surface

Use the existing borders-only treatment: `--sl-color-hairline`, no card shadows or gradients. Small code surfaces use the site's existing 2px/4px radii. Do not introduce decorative cards around every declaration.

## 8. Accessibility constraints and accepted debt

Target WCAG AA: named landmarks, logical headings, visible focus, contrast in both themes, wrapping identifiers and no horizontal page overflow at 390px. New primary touch controls have a 44px minimum target. English API source remains canonical; the Japanese entry explicitly links to English rather than suggesting translated API content. No new visual debt is accepted. Existing unrelated typography and site-wide patterns are outside this addition.
