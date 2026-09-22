import * as THREE from 'three';
import { isInteractiveTarget } from './walkthroughInput.js';

export const DRONE_LIMITS = { min: [-42, 0.3, -42], max: [42, 24, 42] };
const FLIGHT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight']);

/**
 * Translate camera-relative forward/right and world-up input within scene bounds.
 * Normalize combined input above unit length and cap elapsed time at 50 ms; no collision simulation is performed.
 * Return whether nonzero input was processed, even if a bound prevents displacement.
 */
export function moveDrone(camera, motion, seconds, speed = 3.2, bounds = DRONE_LIMITS) {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const velocity = direction.multiplyScalar(motion.forward || 0)
    .addScaledVector(right, motion.right || 0)
    .addScaledVector(new THREE.Vector3(0, 1, 0), motion.up || 0);
  if (velocity.lengthSq() === 0) return false;
  if (velocity.lengthSq() > 1) velocity.normalize();
  camera.position.addScaledVector(velocity, speed * Math.min(Math.max(seconds, 0), 0.05));
  camera.position.clamp(new THREE.Vector3(...bounds.min), new THREE.Vector3(...bounds.max));
  return true;
}

/**
 * Bind flight input to the canvas and injectable window/document event targets.
 * Call update with elapsed seconds each frame; dispose removes bindings and clears held input.
 */
export function createDroneFlight({ camera, element, onChange, onActivity, onExit, windowTarget = window, documentTarget = document }) {
  let enabled = false;
  let pointer = null;
  let input = { forward: 0, right: 0, up: 0 };
  const keys = new Set();
  /** Clear keyboard and pad motion, drop the active pointer and release any remaining pointer capture. */
  const reset = () => {
    keys.clear();
    input = { forward: 0, right: 0, up: 0 };
    const id = pointer?.id;
    pointer = null;
    if (id != null && element.hasPointerCapture?.(id)) element.releasePointerCapture(id);
  };
  /** Start one primary drag in enabled flight mode, focus the canvas and capture its pointer. */
  const down = event => {
    if (!enabled || event.button !== 0 || pointer) return;
    event.preventDefault();
    element.focus({ preventScroll: true });
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    element.setPointerCapture?.(event.pointerId);
    onActivity?.();
  };
  /** Rotate the camera from the active pointer's delta, clamp pitch and notify the renderer. */
  const move = event => {
    if (!enabled || pointer?.id !== event.pointerId) return;
    camera.rotation.y -= (event.clientX - pointer.x) * 0.003;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - (event.clientY - pointer.y) * 0.003, -Math.PI * 0.47, Math.PI * 0.47);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    onChange();
  };
  /** End the drag only when the released or cancelled pointer owns the current gesture. */
  const up = event => { if (pointer?.id === event.pointerId) pointer = null; };
  /**
   * Accept flight keys only for the focused canvas; preserve typing and modified shortcuts.
   * Escape clears motion before requesting exit from flight mode.
   */
  const keyDown = event => {
    if (!enabled || event.defaultPrevented || event.isComposing || event.altKey || event.metaKey || event.ctrlKey
      || isInteractiveTarget(event.target) || documentTarget.activeElement !== element || documentTarget.hidden) return;
    if (event.code === 'Escape') { reset(); onExit(); return; }
    if (!FLIGHT_KEYS.has(event.code)) return;
    event.preventDefault(); keys.add(event.code); onActivity?.();
  };
  /** Forget a released key even when focus or flight ownership has changed. */
  const keyUp = event => keys.delete(event.code);
  /** Clear held flight input when the document becomes hidden. */
  const visibility = () => { if (documentTarget.hidden) reset(); };
  /** Clear motion when focus leaves the flight canvas. */
  const focus = event => { if (event.target !== element) reset(); };
  /** Move the enabled flight camera along its viewing direction for one wheel tick and request a frame. */
  const wheel = event => {
    if (!enabled) return;
    event.preventDefault();
    // A wheel tick moves the camera itself, rather than zooming toward an orbit target.
    moveDrone(camera, { forward: -Math.sign(event.deltaY) }, 0.05, 7);
    onChange();
  };
  element.addEventListener('pointerdown', down);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', up);
  element.addEventListener('pointercancel', up);
  element.addEventListener('lostpointercapture', up);
  element.addEventListener('wheel', wheel, { passive: false });
  windowTarget.addEventListener('keydown', keyDown);
  windowTarget.addEventListener('keyup', keyUp);
  windowTarget.addEventListener('blur', reset);
  documentTarget.addEventListener('visibilitychange', visibility);
  documentTarget.addEventListener('focusin', focus);
  return {
    /** Enter flight once with cleared input, YXZ look rotation and keyboard focus on the canvas. */
    enable() { if (enabled) return; reset(); enabled = true; camera.rotation.reorder('YXZ'); element.focus({ preventScroll: true }); },
    /** Disable flight updates and release all currently held motion and pointer input. */
    disable() { enabled = false; reset(); },
    reset,
    /** Set one on-screen motion axis while flight is enabled and record interaction activity. */
    setMotion(axis, value) { if (!enabled) return; input[axis] = value; onActivity?.(); },
    /**
     * Combine keyboard and pad axes, apply optional Shift acceleration and advance the camera.
     * Return whether nonzero motion was processed; hidden or disabled views do not advance.
     */
    update(delta) {
      if (!enabled || documentTarget.hidden) return false;
      /** Return a unit contribution when any equivalent movement key is held. */
      const held = (...codes) => codes.some(code => keys.has(code)) ? 1 : 0;
      const motion = {
        forward: THREE.MathUtils.clamp(input.forward + held('KeyW','ArrowUp') - held('KeyS','ArrowDown'), -1, 1),
        right: THREE.MathUtils.clamp(input.right + held('KeyD','ArrowRight') - held('KeyA','ArrowLeft'), -1, 1),
        up: THREE.MathUtils.clamp(input.up + held('KeyE') - held('KeyQ'), -1, 1),
      };
      const moved = moveDrone(camera, motion, delta, held('ShiftLeft','ShiftRight') ? 6.4 : 3.2);
      if (moved) onChange();
      return moved;
    },
    /** Disable flight, clear input and remove every canvas, window and document listener owned here. */
    dispose() {
      enabled = false; reset();
      element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up);
      element.removeEventListener('lostpointercapture', up); element.removeEventListener('wheel', wheel);
      windowTarget.removeEventListener('keydown', keyDown); windowTarget.removeEventListener('keyup', keyUp);
      windowTarget.removeEventListener('blur', reset); documentTarget.removeEventListener('visibilitychange', visibility);
      documentTarget.removeEventListener('focusin', focus);
    },
  };
}
