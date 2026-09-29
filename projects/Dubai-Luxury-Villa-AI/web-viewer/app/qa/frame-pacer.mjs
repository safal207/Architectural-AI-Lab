import assert from 'node:assert/strict';
import { createFramePacer } from '../src/three/framePacer.js';

let status = 1;
let lost = false;
let nextId = 0;
const deleted = [];
const polls = [];
let flushes = 0;
let clock = 0;
const gl = {
  TIMEOUT_EXPIRED: 1, ALREADY_SIGNALED: 2, WAIT_FAILED: 3, SYNC_GPU_COMMANDS_COMPLETE: 4,
  isContextLost: () => lost,
  fenceSync: () => ({ id: ++nextId }),
  deleteSync: fence => deleted.push(fence.id),
  clientWaitSync: (fence, flags, timeout) => { polls.push({ fence: fence.id, flags, timeout }); return status; },
  flush: () => { flushes += 1; }
};
const pacer = createFramePacer(gl, () => clock);
assert.equal(pacer.ready(), true);
pacer.submitted();
assert.equal(flushes, 1);
assert.equal(pacer.ready(), false);
assert.equal(pacer.ready(), false);
assert.deepEqual(deleted, [], 'An unfinished frame must keep its fence');
assert.ok(polls.every(poll => poll.flags === 0 && poll.timeout === 0), 'Polling must never block the UI');
status = gl.ALREADY_SIGNALED;
clock = 100;
assert.equal(pacer.ready(), true);
assert.deepEqual(deleted, [1]);
assert.equal(pacer.canAnimate(), false, 'Slow environmental frames must leave idle time for input');
assert.equal(pacer.ready(), true, 'Camera/UI frames must not wait for the environmental cooldown');
clock = 200;
assert.equal(pacer.canAnimate(), true);
pacer.submitted();
status = gl.WAIT_FAILED;
assert.equal(pacer.ready(), true, 'A failed fence must not permanently freeze the viewer');
assert.deepEqual(deleted, [1, 2]);
pacer.submitted();
lost = true;
assert.equal(pacer.ready(), false);
pacer.submitted();
assert.equal(nextId, 3, 'Context loss must prevent new GPU submissions');
pacer.restored();
lost = false;
assert.equal(pacer.ready(), true, 'Restoration must forget invalid old-context fences');
assert.equal(pacer.canAnimate(), true);
pacer.submitted();
pacer.dispose();
pacer.dispose();
assert.deepEqual(deleted, [1, 2, 4], 'Cleanup must release each live fence once');

const fallback = createFramePacer({ isContextLost: () => false });
assert.equal(fallback.ready(), true);
fallback.submitted();
fallback.dispose();
console.log('GPU frame pacing: PASS (nonblocking waits, completion, failure, restore and disposal)');
