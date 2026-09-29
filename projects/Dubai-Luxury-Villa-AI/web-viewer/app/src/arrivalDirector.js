export const ARRIVAL_HOLD_SECONDS = 2;
export const ARRIVAL_MOVE_SECONDS = 6;

/** Deterministic, pausable director driven by the existing viewer render loop. */
export function createArrivalDirector({ camera, route, reducedMotion = false, onChange = () => {}, onFinish = () => {} }) {
  let elapsed = 0;
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
      elapsed += Math.min(delta, 0.05);
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
    resume() { if (!ended && phase === 'paused') { phase = previousPhase; notify(); } },
    reduceMotion() { if (!ended) { elapsed = 0; apply(0); phase = 'still'; notify(); } },
    finish,
    cancel(notifyChange = true) {
      if (ended) return;
      ended = true;
      phase = 'idle';
      if (notifyChange) notify();
    }
  };
}
