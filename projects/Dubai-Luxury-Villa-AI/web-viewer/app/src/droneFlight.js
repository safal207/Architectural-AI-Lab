import * as THREE from 'three';
import { isInteractiveTarget } from './walkthroughInput.js';

export const DRONE_LIMITS = { min: [-42, 0.3, -42], max: [42, 24, 42] };
const FLIGHT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight']);

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

export function createDroneFlight({ camera, element, onChange, onActivity, onExit, windowTarget = window, documentTarget = document }) {
  let enabled = false;
  let pointer = null;
  let input = { forward: 0, right: 0, up: 0 };
  const keys = new Set();
  const reset = () => {
    keys.clear();
    input = { forward: 0, right: 0, up: 0 };
    const id = pointer?.id;
    pointer = null;
    if (id != null && element.hasPointerCapture?.(id)) element.releasePointerCapture(id);
  };
  const down = event => {
    if (!enabled || event.button !== 0 || pointer) return;
    event.preventDefault();
    element.focus({ preventScroll: true });
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    element.setPointerCapture?.(event.pointerId);
    onActivity?.();
  };
  const move = event => {
    if (!enabled || pointer?.id !== event.pointerId) return;
    camera.rotation.y -= (event.clientX - pointer.x) * 0.003;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - (event.clientY - pointer.y) * 0.003, -Math.PI * 0.47, Math.PI * 0.47);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    onChange();
  };
  const up = event => { if (pointer?.id === event.pointerId) pointer = null; };
  const keyDown = event => {
    if (!enabled || event.defaultPrevented || event.isComposing || event.altKey || event.metaKey || event.ctrlKey
      || isInteractiveTarget(event.target) || documentTarget.activeElement !== element || documentTarget.hidden) return;
    if (event.code === 'Escape') { reset(); onExit(); return; }
    if (!FLIGHT_KEYS.has(event.code)) return;
    event.preventDefault(); keys.add(event.code); onActivity?.();
  };
  const keyUp = event => keys.delete(event.code);
  const visibility = () => { if (documentTarget.hidden) reset(); };
  const focus = event => { if (event.target !== element) reset(); };
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
    enable() { if (enabled) return; reset(); enabled = true; camera.rotation.reorder('YXZ'); element.focus({ preventScroll: true }); },
    disable() { enabled = false; reset(); },
    reset,
    setMotion(axis, value) { if (!enabled) return; input[axis] = value; onActivity?.(); },
    update(delta) {
      if (!enabled || documentTarget.hidden) return false;
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
