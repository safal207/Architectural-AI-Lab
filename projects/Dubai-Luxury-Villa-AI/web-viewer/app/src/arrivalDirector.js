export const ARRIVAL_HOLD_SECONDS = 2;
export const ARRIVAL_MOVE_SECONDS = 6;

/**
 * Advance the presentation by active monotonic time, not the walking physics delta.
 * Slow frames must not stretch an eight-second film into minutes. Pause/resume
 * starts a new clock segment, so time spent hidden or paused is never caught up.
 * The injected millisecond clock makes the same behavior deterministic in tests.
 */
export function createArrivalDirector({ camera, route, reducedMotion = false, onChange = () => {}, onFinish = () => {}, now = () => performance.now() }) {
  let elapsed = 0;
  let lastTick = now();
  let phase = reducedMotion ? 'still' : 'threshold';
  let previousPhase = phase;
  let ended = false;
  const notify = () => onChange(phase);
  const apply = (progress) => {
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(route.entry.position, route.living.position, eased);
    camera.quaternion.slerpQuaternions(route.entry.quaternion, route.living.quaternion, eased);
  };
  apply(0);
  notify();
  const finish = () => {
    if (ended) return;
    ended = true;
    elapsed = ARRIVAL_HOLD_SECONDS + ARRIVAL_MOVE_SECONDS;
    apply(1);
    phase = 'complete';
    notify();
    onFinish({ position: route.living.position.clone(), quaternion: route.living.quaternion.clone() });
  };
  return {
    get phase() { return phase; },
    get progress() { return Math.min(1, Math.max(0, (elapsed - ARRIVAL_HOLD_SECONDS) / ARRIVAL_MOVE_SECONDS)); },
    update(delta) {
      if (ended || !['threshold', 'moving'].includes(phase) || !Number.isFinite(delta) || delta <= 0) return false;
      const tick = now();
      if (!Number.isFinite(tick)) { lastTick = null; return false; }
      if (!Number.isFinite(lastTick) || tick < lastTick) { lastTick = tick; return false; }
      const activeSeconds = (tick - lastTick) / 1000;
      lastTick = tick;
      if (activeSeconds <= 0) return false;
      elapsed = Math.min(ARRIVAL_HOLD_SECONDS + ARRIVAL_MOVE_SECONDS, elapsed + activeSeconds);
      const progress = Math.min(1, Math.max(0, (elapsed - ARRIVAL_HOLD_SECONDS) / ARRIVAL_MOVE_SECONDS));
      apply(progress);
      const next = progress > 0 ? 'moving' : 'threshold';
      if (next !== phase) { phase = next; notify(); }
      if (progress >= 1) finish();
      return true;
    },
    pause() {
      if (ended || !['threshold', 'moving'].includes(phase)) return;
      previousPhase = phase;
      phase = 'paused';
      notify();
    },
    resume() {
      if (!ended && phase === 'paused') { lastTick = now(); phase = previousPhase; notify(); }
    },
    reduceMotion() {
      if (!ended) { elapsed = 0; lastTick = now(); apply(0); phase = 'still'; notify(); }
    },
    finish,
    cancel(notifyChange = true) {
      if (ended) return;
      ended = true;
      phase = 'idle';
      if (notifyChange) notify();
    }
  };
}
