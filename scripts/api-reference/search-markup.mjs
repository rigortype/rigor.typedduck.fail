export const searchMarkup = `<section class="api-search" aria-label="API symbol search" data-api-search hidden>
<button type="button" data-api-search-toggle aria-expanded="false" aria-controls="api-search-panel">Search API symbols <kbd>Alt /</kbd></button>
<div id="api-search-panel" hidden>
<label for="api-search-input">Find an API symbol</label>
<input id="api-search-input" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="api-search-results" aria-describedby="api-search-help" autocomplete="off" spellcheck="false" placeholder="Name, Namespace#method or Namespace.method" />
<p id="api-search-help">Search names, not prose. ↑ ↓ to choose, Enter to open, Esc to close.</p>
<p data-api-search-status role="status" aria-live="polite"></p>
<button type="button" data-api-search-retry hidden>Retry loading symbols</button>
<ul id="api-search-results" role="listbox" aria-label="API symbols"></ul>
</div>
</section>

`;
