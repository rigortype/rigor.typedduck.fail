import { matchSymbols, moveSelection, validateSearchIndex } from './api-search-model.mjs';

export function enhanceApiSearch() {
  const root = document.querySelector('[data-api-search]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const toggle = root.querySelector('[data-api-search-toggle]');
  const panel = root.querySelector('#api-search-panel');
  const input = root.querySelector('#api-search-input');
  const filters = root.querySelector('[data-api-search-filters]');
  const visibility = root.querySelector('[data-api-search-visibility]');
  const internal = root.querySelector('[data-api-search-internal]');
  const results = root.querySelector('[role="listbox"]');
  const status = root.querySelector('[role="status"]');
  const retry = root.querySelector('[data-api-search-retry]');
  let entries;
  let loading = false;
  let matches = [];
  let selected = -1;
  let returnFocus = toggle;

  function select(index) {
    selected = index;
    [...results.children].forEach((row, i) => row.firstElementChild.setAttribute('aria-selected', String(i === index)));
    const active = results.children[index]?.firstElementChild;
    if (active) {
      input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }

  function render() {
    if (!entries) return;
    const found = matchSymbols(entries, input.value, 20, { visibility: visibility.value, includeInternal: internal.checked });
    matches = found.entries;
    results.replaceChildren(...matches.map((entry, index) => {
      const row = document.createElement('li');
      row.setAttribute('role', 'presentation');
      const link = document.createElement('a');
      link.href = entry.url;
      link.id = `api-search-option-${index}`;
      link.setAttribute('role', 'option');
      link.setAttribute('aria-selected', 'false');
      link.tabIndex = -1;
      const name = document.createElement('span');
      name.className = 'api-search-name';
      name.textContent = entry.qualifiedName;
      const meta = document.createElement('span');
      meta.className = 'api-search-meta';
      meta.textContent = `${entry.kind.replaceAll('_', ' ')} · ${entry.owner || 'top level'} · ${entry.scope} · ${entry.visibility || 'public'}${entry.publication === 'internal' ? ' · internal documentation' : ''}${entry.deprecated ? ' · deprecated' : ''}${entry.location ? ` · ${entry.location}` : ''}`;
      link.append(name, meta);
      link.addEventListener('pointermove', () => select(index));
      row.append(link);
      return row;
    }));
    select(-1);
    input.setAttribute('aria-expanded', String(matches.length > 0 && !panel.hidden));
    status.textContent = !input.value.trim() ? 'Type a name to search published API symbols.' : found.total === 0
      ? 'No API symbols found. Try a shorter name or a namespace.' : found.total > matches.length
        ? `Showing ${matches.length} of ${found.total} symbols. Refine your search for more.` : `${found.total} ${found.total === 1 ? 'symbol' : 'symbols'} found.`;
  }

  async function load() {
    if (entries || loading) return;
    loading = true;
    retry.hidden = true;
    status.textContent = 'Loading API symbols…';
    input.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('/api-symbols.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('API search unavailable');
      entries = validateSearchIndex(await response.json());
      const visibilities = ['public', 'protected', 'private'].filter((value) => entries.some((entry) => (entry.visibility || 'public') === value));
      const hasInternal = entries.some((entry) => entry.publication === 'internal');
      filters.hidden = !hasInternal && !visibilities.some((value) => value !== 'public');
      visibility.hidden = !visibilities.some((value) => value !== 'public');
      root.querySelector('[data-api-search-visibility-label]').hidden = visibility.hidden;
      for (const value of visibilities) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        visibility.append(option);
      }
      root.querySelector('[data-api-search-internal-label]').hidden = !hasInternal;
      render();
    } catch {
      status.textContent = 'API symbols could not be loaded. Retry, or browse the API pages below.';
      retry.hidden = false;
    } finally {
      loading = false;
      input.removeAttribute('aria-busy');
    }
  }

  function open() {
    returnFocus = document.activeElement;
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    input.focus();
    render();
    void load();
  }
  function close() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    if (returnFocus?.isConnected) returnFocus.focus();
    else toggle.focus();
  }

  toggle.addEventListener('click', () => panel.hidden ? open() : close());
  retry.addEventListener('click', () => { input.focus(); void load(); });
  input.addEventListener('input', render);
  visibility.addEventListener('change', render);
  internal.addEventListener('change', render);
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      select(moveSelection(selected, event.key, matches.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (selected >= 0) results.children[selected].firstElementChild.click();
    }
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); close(); }
  });
  const shortcut = (event) => {
    if (!root.isConnected) { document.removeEventListener('keydown', shortcut); return; }
    if (event.altKey && event.code === 'Slash' && !event.ctrlKey && !event.metaKey && !event.isComposing) {
      event.preventDefault();
      if (panel.hidden) open();
      else input.focus();
    }
  };
  document.addEventListener('keydown', shortcut);
  root.hidden = false;
}
