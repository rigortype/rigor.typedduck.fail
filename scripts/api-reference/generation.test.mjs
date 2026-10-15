import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../..', import.meta.url));

test('a rejected artifact cannot overwrite generated pages or provenance', async () => {
  const files = ['src/data/api-reference.json', 'src/content/docs/apiref/index.md'].map((file) => path.join(root, file));
  const before = await Promise.all(files.map((file) => existsSync(file) ? readFile(file, 'utf8') : null));
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'api-artifact-test-'));
  try {
    const input = path.join(temporary, 'invalid.json');
    for (const [artifact, message] of [
      [{ export: { schema: 'zard-doc/v0', revision: 999 } }, /unsupported schema\/revision/],
      [{ export: { schema: 'zard-doc/v0', revision: 1, lens: {} } }, /Lens artifacts require fresh analysis/],
    ]) {
      await writeFile(input, JSON.stringify(artifact));
      const result = spawnSync(process.execPath, [path.join(root, 'scripts/sync-api-reference.mjs')], {
        cwd: root, encoding: 'utf8', env: { ...process.env, ZARD_SOURCE_DIR: '', ZARD_API_JSON: input, RIGOR_API_SOURCE_DIR: root },
      });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, message);
      assert.equal(result.stdout, '');
      const after = await Promise.all(files.map((file) => existsSync(file) ? readFile(file, 'utf8') : null));
      assert.deepEqual(after, before);
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
