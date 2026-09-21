import assert from 'node:assert/strict';
import { bindWalkthroughKeyboard, resetWalkthroughInput } from '../src/walkthroughInput.js';

class Events {
  listeners = new Map();
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  dispatch(type, event = {}) {
    for (const callback of this.listeners.get(type) ?? []) callback(event);
  }
}

const windowTarget = new Events();
const documentTarget = new Events();
documentTarget.hidden = false;
const controls = new Events();
controls.isLocked = true;
const runtime = {
  keys: new Set(), isExplore: true, firstPersonAvailable: true,
  isTouchDevice: false, pointerLockControls: controls,
  touchLook: { active: false, pointerId: null }
};
const mobileMotionRef = { current: { forward: 0, right: 0 } };
let capturedPointer = null;
let interactions = 0;
const element = {
  hasPointerCapture: (id) => capturedPointer === id,
  releasePointerCapture: () => { capturedPointer = null; }
};
const dispose = bindWalkthroughKeyboard({
  runtime, mobileMotionRef, element, windowTarget, documentTarget,
  onInteract: () => { interactions += 1; }
});
const key = (code = 'KeyW', extra = {}) => ({
  code, defaultPrevented: false,
  preventDefault() { this.defaultPrevented = true; },
  ...extra
});
const press = (extra = {}) => {
  const event = key('KeyW', extra);
  windowTarget.dispatch('keydown', event);
  return event;
};
const assertStopped = (label) => {
  assert.equal(runtime.keys.size, 0, `${label}: keyboard must stop`);
  assert.deepEqual(mobileMotionRef.current, { forward: 0, right: 0 }, `${label}: touch motion must stop`);
  assert.equal(runtime.touchLook.active, false, `${label}: touch look must stop`);
  assert.equal(capturedPointer, null, `${label}: touch capture must release`);
};
const startMotion = () => {
  press();
  mobileMotionRef.current = { forward: 1, right: -1 };
  runtime.touchLook = { active: true, pointerId: 7 };
  capturedPointer = 7;
};

assert.equal(press().defaultPrevented, true, 'Walking keys must suppress page scrolling');
assert(runtime.keys.has('KeyW'));
windowTarget.dispatch('keyup', key());
assert.equal(runtime.keys.size, 0);
const arrow = key('ArrowDown');
windowTarget.dispatch('keydown', arrow);
assert.equal(arrow.defaultPrevented, true, 'Arrow keys must not scroll while walking');

startMotion();
windowTarget.dispatch('blur');
assertStopped('window blur');
startMotion();
controls.isLocked = false;
controls.dispatch('unlock');
assertStopped('pointer unlock');
assert.equal(press().defaultPrevented, false, 'Unlocked viewer must not intercept page keys');
assert.equal(runtime.keys.size, 0);
controls.isLocked = true;

startMotion();
documentTarget.hidden = true;
documentTarget.dispatch('visibilitychange');
assertStopped('hidden tab');
press();
assert.equal(runtime.keys.size, 0, 'Hidden tab must ignore input');
documentTarget.hidden = false;

// Coarse-pointer laptops can also have keyboards. Typing in the assistant or
// operating a form/button must not move the camera, including editable children.
runtime.isTouchDevice = true;
for (const target of [
  { closest: () => ({ tagName: 'INPUT' }) },
  { closest: () => ({ tagName: 'TEXTAREA' }) },
  { closest: () => ({ tagName: 'BUTTON' }) },
  { isContentEditable: true },
  { closest: () => ({ contentEditable: 'true' }) }
]) {
  assert.equal(press({ target }).defaultPrevented, false);
  assert.equal(runtime.keys.size, 0, 'Interactive targets must retain keyboard input');
}
startMotion();
documentTarget.dispatch('focusin', { target: { isContentEditable: true } });
assertStopped('editable focus');

for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'isComposing']) {
  assert.equal(press({ [modifier]: true }).defaultPrevented, false);
  assert.equal(runtime.keys.size, 0, 'Browser shortcuts and IME input must be ignored');
}
runtime.isExplore = false;
press();
assert.equal(runtime.keys.size, 0, 'Guided mode must ignore walking keys');
runtime.isExplore = true;
runtime.firstPersonAvailable = false;
press();
assert.equal(runtime.keys.size, 0, 'Missing navigation anchors must disable walking');
runtime.firstPersonAvailable = true;

startMotion();
resetWalkthroughInput(runtime, mobileMotionRef, element);
assertStopped('mode or stop change');
startMotion();
dispose();
assertStopped('unmount');
press();
assert.equal(runtime.keys.size, 0, 'Unmount must remove key listeners');
assert(interactions > 0);
console.log(JSON.stringify({ status: 'PASS', cases: [
  'keydown/keyup', 'arrow scrolling', 'blur', 'unlock', 'visibility',
  'editable controls', 'browser shortcuts', 'guided/anchor guards',
  'mode reset', 'touch capture release', 'unmount'
] }, null, 2));
