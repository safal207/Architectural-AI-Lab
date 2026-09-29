/** Pure, injectable film clock. Walking's capped physics delta is deliberately not used. */
export function createDemoClock(duration, now = () => performance.now()) {
  if (!Number.isFinite(duration) || duration <= 0) throw new RangeError('Demo duration must be positive');
  let state = 'idle';
  let seconds = 0;
  let previous = null;
  const clamp = value => Math.min(duration, Math.max(0, value));
  function read() {
    const time = now();
    if (state === 'playing' && Number.isFinite(time)) {
      if (previous !== null) seconds = clamp(seconds + Math.max(0, time - previous) / 1000);
      previous = previous === null ? time : Math.max(previous, time);
      if (seconds >= duration) { state = 'completed'; previous = null; }
    }
    return { state, seconds, duration };
  }
  return {
    read,
    start(still = false) { seconds = 0; state = still ? 'paused' : 'playing'; const time = now(); previous = Number.isFinite(time) ? time : null; return read(); },
    pause() { read(); if (state === 'playing') state = 'paused'; previous = null; return read(); },
    resume() { if (state === 'paused') { state = 'playing'; previous = now(); } return read(); },
    seek(value) {
      if (!Number.isFinite(value)) throw new TypeError('Demo position must be finite');
      seconds = clamp(value); state = seconds === duration ? 'completed' : 'paused'; previous = null;
      return read();
    },
    stop() { state = 'idle'; seconds = 0; previous = null; return read(); }
  };
}

/**
 * Advance film time only when the viewer can prepare a new camera pose.
 * Reads never spend GPU-wait time. Drop stall backlog rather than finishing off-screen.
 * The 250 ms cap slows the film below 4 pose updates/s; it is not a smoothness guarantee.
 */
export function createDemoFrameClock(duration, now = () => performance.now()) {
  let filmMilliseconds = 0;
  let previous = null;
  const clock = createDemoClock(duration, () => filmMilliseconds);
  const rebase = () => { const time = now(); previous = Number.isFinite(time) ? time : null; };
  return {
    read: clock.read,
    advance() {
      if (clock.read().state !== 'playing') return clock.read();
      const time = now();
      if (Number.isFinite(time)) {
        if (previous !== null) filmMilliseconds += Math.min(250, Math.max(0, time - previous));
        previous = previous === null ? time : Math.max(previous, time);
      }
      return clock.read();
    },
    start(still = false) { filmMilliseconds = 0; rebase(); return clock.start(still); },
    pause() { previous = null; return clock.pause(); },
    resume() { if (clock.read().state === 'paused') rebase(); return clock.resume(); },
    seek(value) { const result = clock.seek(value); previous = null; return result; },
    stop() { previous = null; return clock.stop(); }
  };
}

export function preparePolyline(points) {
  if (!Array.isArray(points) || points.length < 2) throw new Error('A route needs at least two points');
  const copy = points.map(point => {
    const p = typeof point?.toArray === 'function' ? point.toArray() : point;
    if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite)) throw new Error('Invalid route point');
    return [...p];
  });
  const distances = [0];
  for (let i = 1; i < copy.length; i += 1) {
    distances.push(distances[i - 1] + Math.hypot(...copy[i].map((value, axis) => value - copy[i - 1][axis])));
  }
  return { points: copy, distances, length: distances.at(-1) };
}

/** Arc-length interpolation stays on the actual graph segments; it never rounds a doorway corner. */
export function samplePolyline(path, fraction) {
  if (!Number.isFinite(fraction)) throw new TypeError('Route progress must be finite');
  const distance = Math.min(1, Math.max(0, fraction)) * path.length;
  if (!path.length) return [...path.points[0]];
  let index = 1;
  while (index < path.distances.length - 1 && path.distances[index] < distance) index += 1;
  const span = path.distances[index] - path.distances[index - 1];
  const t = span > 0 ? (distance - path.distances[index - 1]) / span : 0;
  return path.points[index - 1].map((value, axis) => value + (path.points[index][axis] - value) * t);
}

/** Preserve expanded stair segments, including their order when travelling back downstairs. */
export function graphLeg(graph, from, to) {
  let edges = graph.edges.filter(edge => edge.from === from && edge.to === to);
  let reverse = false;
  if (!edges.length) {
    edges = graph.edges.filter(edge => edge.from === to && edge.to === from).slice().reverse();
    reverse = true;
  }
  if (!edges.length) throw new Error(`Missing authored route: ${from} -> ${to}`);
  const point = value => typeof value?.toArray === 'function' ? value.toArray() : value;
  const points = [point(reverse ? edges[0].b : edges[0].a)];
  for (const edge of edges) {
    const a = point(reverse ? edge.b : edge.a);
    const b = point(reverse ? edge.a : edge.b);
    if (Math.hypot(...a.map((value, axis) => value - points.at(-1)[axis])) > 1e-5) {
      throw new Error(`Disconnected authored route: ${from} -> ${to}`);
    }
    points.push(b);
  }
  return preparePolyline(points);
}
