import assert from 'node:assert/strict';
import test from 'node:test';
import { referenceFor } from './presentation.mjs';
import { searchIndexFor } from './search-index.mjs';
import { matchSymbols, moveSelection, validateSearchIndex } from '../../src/scripts/api-search-model.mjs';

const row = (id, name, qualifiedName, kind = 'instance_method') => ({ id, name, qualifiedName, kind, owner: qualifiedName.split(/[.#]/)[0], scope: 'sdk', url: '/apiref/sdk/example/#zard-01' });

test('matching ranks qualified exact, short exact, qualified prefix, name prefix, then substring deterministically', () => {
  const entries = [row('5', 'recall', 'Z#recall'), row('4', 'caller', 'Z#caller'), row('3', 'x', 'call::Z#x'), row('2', 'call', 'Z#call'), row('1', 'call', 'call', 'class')];
  assert.deepEqual(matchSymbols(entries, 'call').entries.map((x) => x.id), ['1', '2', '3', '4', '5']);
  assert.equal(matchSymbols(entries, ' ::Z#CALL ').entries[0].id, '2');
  assert.deepEqual(matchSymbols(entries, '').entries, []);
  assert.equal(matchSymbols(entries, 'missing').total, 0);
  assert.equal(matchSymbols(entries, 'call', 2).total, 5);
  assert.equal(matchSymbols(entries, 'call', 2).entries.length, 2);
  const duplicates = [row('b', 'call', 'Z#call'), row('a', 'call', 'Z#call'), row('c', 'call', 'Z.call', 'singleton_method')];
  assert.deepEqual(matchSymbols(duplicates, 'call'), matchSymbols(duplicates.toReversed(), 'call'));
  assert.equal(matchSymbols(duplicates, 'Z.call').entries[0].id, 'c');
  assert.equal(matchSymbols(duplicates, 'Z#call').entries[0].id, 'a');
});

test('keyboard selection handles unselected, wraparound, reset and empty results', () => {
  assert.equal(moveSelection(-1, 'ArrowDown', 3), 0);
  assert.equal(moveSelection(-1, 'ArrowUp', 3), 2);
  assert.equal(moveSelection(2, 'ArrowDown', 3), 0);
  assert.equal(moveSelection(0, 'ArrowUp', 3), 2);
  assert.equal(moveSelection(2, 'ArrowDown', 0), -1);
  assert.equal(moveSelection(1, 'Tab', 3), 1);
});

function fixture() {
  const declarations = [
    { id: 'sdk:one', kind: 'instance_method', name: 'call', display_name: 'Example#call', anchor: 'zard-01' },
    { id: 'sdk:two', kind: 'singleton_method', name: 'call', display_name: 'Example.call', anchor: 'zard-02' },
    { id: 'sdk:three', kind: 'constant', name: 'VALUE', display_name: 'Example::VALUE', anchor: 'zard-03' },
    { id: 'sdk:four', kind: 'instance_attribute_reader', name: 'name', display_name: 'Example#name', anchor: 'zard-04' },
  ].map((item) => ({ ...item, visibility: 'public', parameters: [], page: 'sdk/Example.md', span: { path: 'lib/example.rb', start_line: 1 }, documentation: [] }));
  return { export: { schema: 'zard-doc/v0', revision: 1, layout: 'namespace', producer: { zard: '0', zard_doc: '0' },
    scopes: [{ name: 'sdk', destination: 'sdk', declarations, pages: [{ path: 'sdk/Example.md', declarations: declarations.map((row) => row.id) }] }], links: {} } };
}

test('index uses published page membership, exact declaration anchors, owners and synthetic namespaces', () => {
  const artifact = fixture();
  const reference = referenceFor(artifact);
  const index = searchIndexFor(artifact, reference);
  assert.equal(index.entries.length, 5);
  assert.deepEqual(index.entries.find((row) => row.id === 'sdk:one'), {
    id: 'sdk:one', kind: 'instance_method', name: 'call', qualifiedName: 'Example#call', owner: 'Example', scope: 'sdk', location: 'lib/example.rb:1', url: '/apiref/sdk/example/#zard-01',
  });
  assert.equal(index.entries.find((row) => row.kind === 'namespace').url, '/apiref/sdk/example/');
  assert.equal(index.entries.find((row) => row.kind === 'constant').owner, 'Example');
  assert.equal(index.entries.find((row) => row.kind.includes('attribute')).owner, 'Example');
  assert.deepEqual(validateSearchIndex(index), index.entries);
  assert.deepEqual(searchIndexFor(artifact, reference), index);
  assert.throws(() => searchIndexFor(artifact, { ...reference, pages: [] }), /not published/);
  const privateArtifact = fixture();
  privateArtifact.export.scopes[0].declarations[0].visibility = 'private';
  assert.throws(() => referenceFor(privateArtifact), /non-public/);
  const excluded = fixture();
  excluded.export.scopes[0].pages[0].declarations.pop();
  assert.throws(() => referenceFor(excluded), /missing from pages/);
});

test('malformed and external search targets fail closed', () => {
  for (const value of [{}, { version: 1, entries: [row('x', 'call', 'Example#call')] }]) {
    if (value.entries) value.entries[0].url = 'https://evil.example/';
    assert.throws(() => validateSearchIndex(value), /Invalid API search index/);
  }
});


test('client accepts published Unicode namespace slugs and rejects unsafe URLs', () => {
  const entry = row('unicode', '試験', '試験', 'class');
  for (const url of ['/apiref/sdk/試験/#zard-01', '/apiref/sdk/%E8%A9%A6%E9%A8%93/', '/apiref/sdk/dotted-name/']) {
    entry.url = url;
    assert.equal(validateSearchIndex({ version: 1, entries: [entry] })[0].url, url);
  }
  for (const url of ['//evil.example/apiref/sdk/', '/apiref/../../elsewhere/', '/apiref/sdk/?q=x', '/apiref/sdk/#wrong', '/apiref/sdk/%00/']) {
    entry.url = url;
    assert.throws(() => validateSearchIndex({ version: 1, entries: [entry] }));
  }
});
