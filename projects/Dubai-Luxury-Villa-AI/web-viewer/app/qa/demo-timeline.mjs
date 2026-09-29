import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoClock, preparePolyline, samplePolyline, graphLeg } from '../src/demoTimeline.js';

test('clock uses uncapped active wall time, excluding paused time', () => {
  let now = 1000;
  const clock = createDemoClock(20, () => now);
  assert.equal(clock.read().state, 'idle');
  clock.start(); now += 2400;
  assert.equal(clock.read().seconds, 2.4);
  clock.pause(); now += 60000;
  assert.equal(clock.read().seconds, 2.4);
  clock.resume(); now += 600;
  assert.equal(clock.read().seconds, 3);
});
test('completion is finite and restart does not retain elapsed time', () => {
  let now = 0;
  const clock = createDemoClock(5, () => now);
  clock.start(); now = 20000;
  assert.deepEqual(clock.read(), { state: 'completed', seconds: 5, duration: 5 });
  clock.start(); assert.equal(clock.read().seconds, 0);
  clock.stop(); now += 5000; assert.equal(clock.read().seconds, 0);
});
test('still mode and chapter seeking never autoplay', () => {
  let now = 0;
  const clock = createDemoClock(10, () => now);
  clock.start(true); now += 4000;
  assert.equal(clock.read().seconds, 0);
  assert.equal(clock.seek(4).state, 'paused');
  now += 4000; assert.equal(clock.read().seconds, 4);
  assert.equal(clock.seek(100).seconds, 10);
  assert.throws(() => clock.seek(NaN));
});
test('backward clock samples do not rewind or double count', () => {
  let now = 1000;
  const clock = createDemoClock(10, () => now);
  clock.start(); now = 2000; clock.read(); now = 1500; clock.read(); now = 2500;
  assert.equal(clock.read().seconds, 1.5);
});
test('polyline follows corners rather than cutting across rooms', () => {
  const p = preparePolyline([[0, 1.6, 0], [4, 1.6, 0], [4, 1.6, 4]]);
  assert.deepEqual(samplePolyline(p, 0), [0, 1.6, 0]);
  assert.deepEqual(samplePolyline(p, 0.5), [4, 1.6, 0]);
  assert.deepEqual(samplePolyline(p, 0.75), [4, 1.6, 2]);
  assert.deepEqual(samplePolyline(p, 1), [4, 1.6, 4]);
  assert.throws(() => samplePolyline(p, NaN));
});
test('reverse stair traversal keeps every authored step', () => {
  const graph = { edges: [
    { from: 'lower', to: 'upper', a: [0, 1.6, 0], b: [1, 1.8, 0] },
    { from: 'lower', to: 'upper', a: [1, 1.8, 0], b: [2, 2.0, 0] },
    { from: 'lower', to: 'upper', a: [2, 2.0, 0], b: [3, 2.2, 0] }
  ] };
  assert.deepEqual(graphLeg(graph, 'upper', 'lower').points, [[3, 2.2, 0], [2, 2, 0], [1, 1.8, 0], [0, 1.6, 0]]);
  assert.throws(() => graphLeg(graph, 'upper', 'pool'));
});
test('broken and nonfinite geometry is rejected instead of inventing a route', () => {
  assert.throws(() => preparePolyline([[0, 0, 0], [NaN, 0, 0]]));
  assert.throws(() => graphLeg({ edges: [
    { from: 'a', to: 'b', a: [0, 0, 0], b: [1, 0, 0] },
    { from: 'a', to: 'b', a: [2, 0, 0], b: [3, 0, 0] }
  ] }, 'a', 'b'));
});
