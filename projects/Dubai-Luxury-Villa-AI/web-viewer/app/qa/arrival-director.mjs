import assert from 'node:assert/strict';
import { createArrivalDirector } from '../src/arrivalDirector.js';

// Spy only on the camera interface. Real Three.js geometry is tested separately.
function fixture(reducedMotion = false) {
  const point = (x) => ({ x, clone() { return point(this.x); } });
  const entry = { position: point(0), quaternion: point(0) };
  const living = { position: point(4), quaternion: point(1) };
  const phases = [];
  const finished = [];
  let milliseconds = 0;
  const camera = {
    position: { x: NaN, lerpVectors(a, b, t) { this.x = a.x + (b.x - a.x) * t; } },
    quaternion: { x: NaN, slerpQuaternions(a, b, t) { this.x = t; } }
  };
  const director = createArrivalDirector({ camera, route: { entry, living }, reducedMotion,
    now: () => milliseconds,
    onChange: (value) => phases.push(value), onFinish: (value) => finished.push(value) });
  const advance = (seconds) => {
    milliseconds += seconds * 1000;
    return director.update(Math.min(seconds, 0.05)); // The real viewer caps walking physics.
  };
  const tick = (count) => { for (let i = 0; i < count; i++) advance(1 / 60); };
  return { camera, director, phases, finished, tick, advance, entry, living,
    setClock: (value) => { milliseconds = value; } };
}
const checks = [];
{
  const f = fixture();
  assert.equal(f.camera.position.x, 0);
  assert.equal(f.director.phase, 'threshold');
  f.tick(100);
  assert.equal(f.camera.position.x, 0);
  checks.push('Entry hold does not move the camera');
  let last = 0;
  for (let i = 0; i < 500; i++) {
    f.tick(1);
    assert(f.camera.position.x >= last && f.camera.position.x <= 4);
    assert(Math.abs(f.camera.position.x / 4 - f.camera.quaternion.x) < 1e-12);
    last = f.camera.position.x;
  }
  assert.equal(f.camera.position.x, 4);
  assert.equal(f.director.phase, 'complete');
  assert.equal(f.finished.length, 1);
  assert.equal(f.entry.position.x, 0);
  assert.equal(f.living.position.x, 4);
  f.director.finish(); f.tick(100);
  assert.equal(f.finished.length, 1);
  checks.push('Monotonic eased motion, exact end pose, no source mutation, one completion');
}
{
  const f = fixture(); f.tick(200); f.director.pause();
  const x = f.camera.position.x;
  f.tick(1000);
  assert.equal(f.camera.position.x, x);
  assert.equal(f.director.phase, 'paused');
  f.director.resume(); f.tick(1);
  assert(f.camera.position.x > x);
  checks.push('Pause freezes time and pose; resume continues');
  f.director.cancel(); const cancelledX = f.camera.position.x;
  f.tick(1000); f.director.resume(); f.director.finish();
  assert.equal(f.camera.position.x, cancelledX);
  assert.equal(f.finished.length, 0);
  checks.push('Cancellation cannot later move the camera or complete');
}
{
  const f = fixture();
  for (const delta of [NaN, Infinity, -1, 0]) assert.equal(f.director.update(delta), false);
  assert.equal(f.camera.position.x, 0);
  f.advance(4);
  const position = f.camera.position.x;
  f.setClock(NaN); assert.equal(f.director.update(0.05), false);
  f.setClock(10000); assert.equal(f.director.update(0.05), false);
  f.setClock(9000); assert.equal(f.director.update(0.05), false);
  assert.equal(f.camera.position.x, position);
  checks.push('Invalid deltas and invalid/backward clock samples cannot move the camera');
}
{
  const f = fixture(true); f.tick(1000);
  assert.equal(f.director.phase, 'still');
  assert.equal(f.camera.position.x, 0);
  f.director.resume(); f.tick(1000);
  assert.equal(f.camera.position.x, 0);
  f.director.finish();
  assert.equal(f.camera.position.x, 4);
  assert.equal(f.finished.length, 1);
  checks.push('Reduced motion stays still until explicit next view');
}
{
  const f = fixture(); f.tick(200); assert(f.camera.position.x > 0);
  f.director.reduceMotion(); f.tick(1000);
  assert.equal(f.director.phase, 'still');
  assert.equal(f.camera.position.x, 0);
  checks.push('Enabling reduced motion during playback cancels automatic movement');
}
{
  for (const fps of [60, 10, 1]) {
    const f = fixture();
    for (let i = 0; i < 4 * fps; i++) f.advance(1 / fps);
    assert(Math.abs(f.director.progress - 1 / 3) < 1e-10, `${fps} FPS changed progress at four active seconds`);
    for (let i = 0; i < 4 * fps + 1; i++) f.advance(1 / fps);
    assert.equal(f.director.phase, 'complete', `${fps} FPS stretched the arrival`);
    assert.equal(f.finished.length, 1);
  }
  checks.push('60, 10 and 1 FPS have identical active-time progress despite capped physics deltas');
}
{
  const f = fixture();
  f.advance(4);
  const progress = f.director.progress;
  const position = f.camera.position.x;
  f.director.pause();
  f.advance(3600);
  assert.equal(f.camera.position.x, position);
  f.director.resume();
  f.advance(0.1);
  assert(Math.abs(f.director.progress - progress - 0.1 / 6) < 1e-10, 'Resume caught up paused time');
  checks.push('One hour paused adds zero playback time on resume');
}
console.log(JSON.stringify({ status: 'PASS', checks }, null, 2));
