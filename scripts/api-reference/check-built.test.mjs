import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkBuiltApi } from './check-built.mjs';

test('publication check rejects missing API output and dangling declaration fragments', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'api-built-'));
  try {
    await assert.rejects(checkBuiltApi(root));
    for (const directory of ['apiref', 'ja/apiref']) await mkdir(path.join(root, directory), { recursive: true });
    await writeFile(path.join(root, 'apiref/index.html'), '<a href="#zard-01">API</a><h2 id="zard-01">Example</h2>');
    await writeFile(path.join(root, 'ja/apiref/index.html'), '<a href="/apiref/#zard-01">English</a>');
    const search = { version: 1, entries: [{ id: 'one', kind: 'class', name: 'Example', qualifiedName: 'Example', owner: '', scope: 'sdk', url: '/apiref/sdk/#zard-01' }] };
    await mkdir(path.join(root, 'apiref/sdk'));
    await writeFile(path.join(root, 'apiref/sdk/index.html'), '<h2 id="zard-01">Example</h2>');
    await writeFile(path.join(root, 'api-symbols.json'), JSON.stringify(search));
    assert.deepEqual(await checkBuiltApi(root), { pages: 3, links: 2, searchTargets: 1 });
    search.entries[0].url = '/apiref/sdk/#zard-02';
    await writeFile(path.join(root, 'api-symbols.json'), JSON.stringify(search));
    await assert.rejects(checkBuiltApi(root), /Broken API search target/);
    search.entries[0].url = '/apiref/missing/';
    await writeFile(path.join(root, 'api-symbols.json'), JSON.stringify(search));
    await assert.rejects(checkBuiltApi(root), /Broken API search target/);
    search.entries = [];
    await writeFile(path.join(root, 'api-symbols.json'), JSON.stringify(search));
    await writeFile(path.join(root, 'ja/apiref/index.html'), '<a href="/apiref/#missing">English</a>');
    await assert.rejects(checkBuiltApi(root), /Broken API link/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
