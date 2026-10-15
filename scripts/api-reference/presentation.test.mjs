import assert from 'node:assert/strict';
import test from 'node:test';
import { pagesFor, referenceFor, topicFor } from './presentation.mjs';

test('installed presentation package preserves site routes, provenance and English fallback', () => {
  const row = { id: 'sdk:zard-01', kind: 'class', name: 'Example', display_name: 'Example',
    visibility: 'public', parameters: [], page: 'sdk/Example.md', anchor: 'zard-01',
    span: { path: 'lib/example.rb', start_line: 1 }, documentation: [] };
  const artifact = { source: { commit: 'a'.repeat(40) }, export: {
    schema: 'zard-doc/v0', revision: 1, layout: 'namespace', producer: { zard: '0.0.1', zard_doc: '0.0.1' },
    scopes: [{ name: 'sdk', destination: 'sdk', declarations: [row], pages: [{ path: row.page, declarations: [row.id] }] }], links: {},
  } };
  const reference = referenceFor(artifact);
  const pages = pagesFor(reference);
  assert.deepEqual([...pages.keys()], ['apiref/index.md', 'apiref/sdk/index.md', 'apiref/sdk/example.md', 'ja/apiref/index.md']);
  assert.match(pages.get('apiref/index.md'), /Rigor source aaaaaaaa/);
  assert.match(pages.get('apiref/index.md'), /https:\/\/github.com\/rigortype\/rigor\/tree\/a{40}/);
  assert.match(pages.get('apiref/sdk/index.md'), /\/apiref\/sdk\/example\/#zard-01/);
  assert.match(pages.get('ja/apiref/index.md'), /英語のAPIリファレンス/);
  const topic = topicFor(reference);
  assert.deepEqual(topic.label, { en: 'API Reference', ja: 'APIリファレンス（英語）' });
  assert.equal(topic.items[1].items[1].link, '/apiref/sdk/example/');
});
