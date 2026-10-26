import assert from 'node:assert/strict';
import test from 'node:test';
import { pagesFor, referenceFor, topicFor } from './presentation.mjs';
import { publicationFixture } from './publication-fixture.mjs';
import { searchIndexFor } from './search-index.mjs';
import { matchSymbols } from '../../src/scripts/api-search-model.mjs';

test('selected export stays consistent across pages, sidebar, search and display filtering', () => {
  const artifact = publicationFixture();
  const reference = referenceFor(artifact);
  const pages = pagesFor(reference);
  const index = searchIndexFor(artifact, reference);
  const example = pages.get('apiref/sdk/example.md');
  assert.match(example, /data-api-publication="internal"/);
  assert.match(example, /data-api-visibility="private"/);
  assert.match(example, /data-api-deprecated="true"/);
  assert.match(example, /Use \*\*call\*\* instead\./);
  assert.match(example, /Symbols excluded at build time are not published/);
  assert.ok(pages.get('apiref/sdk/excludedcontainer.md').includes('id="zard-05"'));
  assert.ok(JSON.stringify(topicFor(reference)).includes('/apiref/sdk/excludedcontainer/'));
  assert.equal(index.entries.some((entry) => entry.qualifiedName === 'ExcludedContainer' && entry.kind !== 'namespace'), false);
  const synthetic = index.entries.find((entry) => entry.kind === 'namespace' && entry.qualifiedName === 'InternalOnly');
  assert.equal(synthetic.publication, 'internal');
  assert.equal(synthetic.visibility, 'private');
  assert.equal(matchSymbols(index.entries, 'InternalOnly', 20, { includeInternal: false }).total, 0);
  assert.equal(matchSymbols(index.entries, 'call', 20, { includeInternal: false }).total, 4);
  assert.equal(matchSymbols(index.entries, 'call', 20, { includeInternal: true }).total, 6);
  assert.equal(matchSymbols(index.entries, 'call', 20, { visibility: 'private', includeInternal: true }).total, 2);
  for (const declaration of artifact.export.scopes[0].declarations) {
    const entry = index.entries.find((entry) => entry.id === declaration.id);
    assert.ok(entry);
    assert.ok([...pages.values()].some((body) => body.includes(`id="${declaration.anchor}"`)));
  }
});

test('regenerated pages, navigation and index remove declarations omitted from the next export', () => {
  const artifact = publicationFixture();
  const before = pagesFor(referenceFor(artifact));
  assert.ok(before.has('apiref/sdk/internalonly.md'));
  const scope = artifact.export.scopes[0];
  scope.declarations = scope.declarations.filter((row) => row.publication === 'public' && row.visibility === 'public');
  const retained = new Set(scope.declarations.map((row) => row.id));
  scope.pages = scope.pages.map((page) => ({ ...page, declarations: page.declarations.filter((id) => retained.has(id)) })).filter((page) => page.declarations.length);
  const reference = referenceFor(artifact);
  const pages = pagesFor(reference);
  const index = searchIndexFor(artifact, reference);
  assert.equal(pages.has('apiref/sdk/internalonly.md'), false);
  assert.equal(index.entries.some((entry) => entry.publication === 'internal' || entry.visibility !== 'public'), false);
  assert.equal(JSON.stringify(topicFor(reference)).includes('/apiref/sdk/internalonly/'), false);
  for (const body of pages.values()) assert.doesNotMatch(body, /zard-02|zard-03|zard-06/);
});
