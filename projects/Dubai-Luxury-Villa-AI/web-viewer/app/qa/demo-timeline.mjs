import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoClock, createDemoFrameClock, preparePolyline, samplePolyline, graphLeg } from '../src/demoTimeline.js';

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

test('frame clock cannot finish while only state is read during GPU wait', () => {
  let now = 0;
  const clock = createDemoFrameClock(20, () => now);
  clock.start();
  for (let i = 0; i < 600; i += 1) {
    now += 100;
    assert.deepEqual(clock.read(), { state: 'playing', seconds: 0, duration: 20 });
  }
  assert.equal(clock.advance().seconds, 0.25, 'The first pose after a stall must have a bounded jump');
  now += 16;
  assert.equal(clock.advance().seconds, 0.266, 'Dropped time must not become a catch-up backlog');
  assert.equal(clock.advance().seconds, 0.266, 'Repeated samples at the same time do not advance');
});

test('frame clock follows ordinary elapsed time at different refresh rates', () => {
  for (const hz of [30, 60, 120, 144]) {
    let now = 0;
    const clock = createDemoFrameClock(20, () => now);
    clock.start();
    for (let i = 1; i <= hz * 2; i += 1) {
      now = i * 1000 / hz;
      clock.advance();
    }
    assert.ok(Math.abs(clock.read().seconds - 2) < 1e-10, `Incorrect pacing at ${hz} Hz`);
  }
});

test('frame pause holds the last pose and resume excludes paused or waiting time', () => {
  let now = 0;
  const clock = createDemoFrameClock(20, () => now);
  clock.start(); now = 100; clock.advance();
  now = 60000; clock.pause();
  assert.equal(clock.read().seconds, 0.1, 'Pause must not jump to an unshown pose');
  now += 60000; clock.advance();
  assert.equal(clock.read().seconds, 0.1);
  clock.resume(); now += 16;
  assert.equal(clock.advance().seconds, 0.116);
});

test('frame clock keeps still scenes, finite completion and restart semantics', () => {
  let now = 0;
  const clock = createDemoFrameClock(1, () => now);
  clock.start(true); now = 90000;
  assert.equal(clock.advance().seconds, 0);
  assert.equal(clock.seek(0.5).state, 'paused');
  now += 90000; assert.equal(clock.advance().seconds, 0.5);
  clock.resume();
  for (let i = 0; i < 2; i += 1) { now += 10000; clock.advance(); }
  assert.deepEqual(clock.read(), { state: 'completed', seconds: 1, duration: 1 });
  clock.start(); assert.equal(clock.read().seconds, 0);
  now += 100; assert.equal(clock.advance().seconds, 0.1);
  clock.stop(); now += 10000;
  assert.deepEqual(clock.advance(), { state: 'idle', seconds: 0, duration: 1 });
  assert.throws(() => clock.seek(NaN));
});

test('frame clock rejects invalid durations and ignores nonfinite or backward samples', () => {
  assert.throws(() => createDemoFrameClock(0));
  assert.throws(() => createDemoFrameClock(Infinity));
  let now = 1000;
  const clock = createDemoFrameClock(20, () => now);
  clock.start(); now = 1100; clock.advance();
  now = 1050; assert.equal(clock.advance().seconds, 0.1);
  now = NaN; assert.equal(clock.advance().seconds, 0.1);
  now = Infinity; assert.equal(clock.advance().seconds, 0.1);
  now = 1200; assert.equal(clock.advance().seconds, 0.2);
});
