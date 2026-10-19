import test from 'node:test';
import assert from 'node:assert/strict';
import { MeshPool } from '../src/terrain/pool.js';

class WorkerStub {
  static created = [];
  constructor() { this.messages = []; this.terminated = false; WorkerStub.created.push(this); }
  postMessage(message) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  send(message) { this.onmessage({ data: message }); }
}

function withWorkers(t) {
  const original = globalThis.Worker; WorkerStub.created = []; globalThis.Worker = WorkerStub;
  t.after(() => { globalThis.Worker = original; });
}
test('a worker error rejects setup instead of leaving the loading screen forever', async (t) => {
  withWorkers(t);
  const pool = new MeshPool(2);
  const setup = pool.setFar({ data: new Float32Array(4) });
  const rejected = assert.rejects(setup, /Worker crashed/);
  WorkerStub.created[0].onerror({ message: 'Worker crashed' });
  await rejected;
  assert.ok(WorkerStub.created.every((w) => w.terminated));
  assert.equal(pool.farWaiters.size, 0);
});
test('a failed chunk rejects both active and queued jobs and stops all workers', async (t) => {
  withWorkers(t);
  const pool = new MeshPool(1);
  const result = Promise.allSettled([pool.run({ n: 1 }), pool.run({ n: 2 })]);
  WorkerStub.created[0].onerror({ message: 'GPU-independent meshing error' });
  const rows = await result;
  assert.ok(rows.every((r) => r.status === 'rejected'));
  assert.equal(pool.pending.size, 0); assert.equal(pool.queue.length, 0);
  await assert.rejects(pool.run({ n: 3 }), /meshing error/);
});
test('a completed chunk releases the worker to the next queued job', async (t) => {
  withWorkers(t);
  const pool = new MeshPool(1), worker = WorkerStub.created[0];
  t.after(() => pool.dispose());
  const first = pool.run({ n: 1 }), second = pool.run({ n: 2 });
  worker.send({ id: worker.messages[0].id, r: 'first mesh' });
  worker.send({ id: worker.messages[1].id, r: 'second mesh' });
  assert.deepEqual(await Promise.all([first, second]), ['first mesh', 'second mesh']);
  assert.equal(pool.pending.size, 0);
});
