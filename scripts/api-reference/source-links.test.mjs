import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceLinksFor } from './source-links.mjs';

const commit = 'a'.repeat(40);
const policy = { template: 'https://github.com/example/sdk/blob/{commit}/{path}#L{start_line}-L{end_line}' };
function fixture(path = 'lib/日本語 #?.rb') {
  return { scopes: [{ files: [{ path }], declarations: [
    { id: 'app:zard-01', span: { path, start_line: 2, end_line: 9 } },
    { id: 'app:zard-02', span: { path, start_line: 12, end_line: 15 } },
  ] }] };
}

test('pins every retained definition to the documented commit and exact source lines', () => {
  const links = sourceLinksFor(fixture(), policy, commit);
  assert.equal(links['app:zard-01'], `https://github.com/example/sdk/blob/${commit}/lib/%E6%97%A5%E6%9C%AC%E8%AA%9E%20%23%3F.rb#L2-L9`);
  assert.match(links['app:zard-02'], /#L12-L15$/);
  assert.deepEqual(sourceLinksFor(fixture(), null, commit), {});
  const data = fixture();
  data.scopes[0].declarations[0].span.end_line = null;
  assert.equal(sourceLinksFor(data, policy, commit)['app:zard-01'], undefined);
});

test('rejects traversal, unselected paths, unsafe templates and mutable commits', () => {
  for (const file of ['../private.rb', '/tmp/private.rb', 'C:/private.rb', 'lib/../private.rb', 'lib\\private.rb']) {
    assert.throws(() => sourceLinksFor(fixture(file), policy, commit), /repository-relative/);
  }
  const data = fixture();
  data.scopes[0].files = [];
  assert.throws(() => sourceLinksFor(data, policy, commit), /selected/);
  for (const template of ['javascript:{path}', 'https://example.com/{unknown}', 'https://example.com/{path}#L{start_line}', 'https://user:password@example.com/{commit}/{path}#L{start_line}']) {
    assert.throws(() => sourceLinksFor(fixture(), { template }, commit));
  }
  assert.throws(() => sourceLinksFor(fixture(), policy, 'master'), /commit/);
});
