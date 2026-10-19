import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startServer } from '../tools/serve.mjs';

test('the server supports nested index pages and blocks traversal to a sibling sharing its prefix', async (t) => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'athenaion-server-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const root = path.join(temporary, 'public');
  await mkdir(path.join(root, 'nested'), { recursive: true });
  await mkdir(path.join(temporary, 'public-secret'));
  await writeFile(path.join(root, 'nested/index.html'), 'nested gallery');
  await writeFile(path.join(temporary, 'public-secret/private.txt'), 'private');
  const server = await startServer(0, root); t.after(() => server.close());
  const url = `http://127.0.0.1:${server.port}`;
  assert.equal(await (await fetch(url + '/nested/')).text(), 'nested gallery');
  assert.equal((await fetch(url + '/%2e%2e%2fpublic-secret/private.txt')).status, 403);
  assert.equal((await fetch(url + '/%ZZ')).status, 400);
});
