import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDroneFlight, moveDrone, DRONE_LIMITS } from '../src/droneFlight.js';
class Events {
  listeners = new Map();
  /** Register a deduplicated listener in the synchronous event-target fixture. */
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type,new Set()); this.listeners.get(type).add(listener); }
  /** Remove one fixture listener so disposal can be checked without a browser. */
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  /** Deliver a synthetic event to the fixture's registered listeners for its type. */
  dispatch(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
}
const camera = new THREE.PerspectiveCamera();
camera.position.set(0, 3, 8); camera.lookAt(0,3,0);
moveDrone(camera, {forward:1}, .05);
assert.ok(camera.position.z < 8, 'Forward must move camera, not orbit target');
const forwardDistance = 8 - camera.position.z;
camera.position.set(0,3,8);
moveDrone(camera, {forward:1,right:1,up:1}, .05);
assert.ok(Math.abs(camera.position.distanceTo(new THREE.Vector3(0,3,8))-forwardDistance) < 1e-6, 'Diagonal movement must not speed up');
camera.position.set(0,DRONE_LIMITS.max[1],0);
moveDrone(camera,{up:1},.05);
assert.equal(camera.position.y,DRONE_LIMITS.max[1]);
const windowTarget = new Events(), documentTarget = new Events(), element = new Events();
documentTarget.hidden = false;
/** Model a canvas outside editable controls so the typing guard permits flight input. */
element.closest = () => null;
/** Update the fake document's active element and emit the corresponding focus event. */
element.focus = () => { documentTarget.activeElement = element; documentTarget.dispatch('focusin',{target:element}); };
/** Provide a no-op capture hook for tests that do not simulate browser pointer ownership. */
element.setPointerCapture = () => {};
/** Report no captured pointer in this keyboard and movement-focused fixture. */
element.hasPointerCapture = () => false;
let exits = 0;
const flight = createDroneFlight({camera,element,windowTarget,documentTarget,onChange:()=>{},onExit:()=>{exits++;}});
/** Create a synthetic movement key with an overridable target and observable default cancellation. */
const key = (code,target=element) => ({
  code, target,
  /** Record cancellation on the synthetic event so input ownership can be asserted. */
  preventDefault(){this.defaultPrevented=true;}
});
/** Enable flight, focus the fake canvas and hold forward movement for the next reset scenario. */
const start = () => { flight.enable(); element.focus(); windowTarget.dispatch('keydown',key('KeyW')); };
/** Advance one 50 ms flight step and return the camera's actual displacement. */
const moved = () => { const before=camera.position.clone(); flight.update(.05); return camera.position.distanceTo(before); };
start(); assert.ok(moved()>0);
windowTarget.dispatch('blur'); assert.equal(moved(),0,'Blur must stop all movement');
start(); documentTarget.hidden=true; documentTarget.dispatch('visibilitychange'); documentTarget.hidden=false; assert.equal(moved(),0,'Hidden tab must clear keys');
start(); documentTarget.activeElement={}; documentTarget.dispatch('focusin',{target:documentTarget.activeElement}); assert.equal(moved(),0,'Focus away must stop movement');
start(); flight.disable(); flight.enable(); assert.equal(moved(),0,'Reentering flight must not restore held keys');
const field={closest:()=>true}; documentTarget.activeElement=element;
windowTarget.dispatch('keydown',key('KeyW',field)); assert.equal(moved(),0,'Typing must not fly');
flight.setMotion('right',1); assert.ok(moved()>0); flight.reset(); assert.equal(moved(),0,'Touch motion must reset');
windowTarget.dispatch('keydown',key('Escape')); assert.equal(exits,1);
flight.dispose();
assert.ok([...windowTarget.listeners.values(),...documentTarget.listeners.values(),...element.listeners.values()].every(set=>set.size===0),'Dispose must remove all listeners');
console.log('PASS: drone translation, normalized speed, altitude bounds, focus/blur/visibility resets, typing guards, touch reset, Escape, disposal');
