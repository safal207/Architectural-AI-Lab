import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createResidenceInteractions } from '../src/three/residenceInteractions.js';

// Read the actual shipped geometry and hierarchy. Images are irrelevant to
// world-space doors, fixtures and lifetime ownership, so avoid DOM image APIs.
globalThis.ProgressEvent ??= class ProgressEvent { constructor(type, values) { this.type = type; Object.assign(this, values); } };
const bytes = readFileSync(new URL('../public/villa.glb', import.meta.url));
const jsonSize = bytes.readUInt32LE(12);
const data = JSON.parse(bytes.subarray(20, 20 + jsonSize).toString());
data.buffers[0].uri = `data:application/octet-stream;base64,${bytes.subarray(28 + jsonSize).toString('base64')}`;
delete data.images;
delete data.textures;
for (const material of data.materials) {
  for (const owner of [material, material.pbrMetallicRoughness, ...Object.values(material.extensions ?? {})].filter(Boolean)) {
    for (const key of Object.keys(owner)) if (key.endsWith('Texture')) delete owner[key];
  }
}
const { scene: root } = await new GLTFLoader().parseAsync(JSON.stringify(data), '');
root.rotation.y = Math.PI;
const scene = new THREE.Scene();
scene.add(root);
root.updateMatrixWorld(true);
const originals = new Map();
root.traverse(object => originals.set(object, {
  parent: object.parent, position: object.position.clone(), quaternion: object.quaternion.clone(),
  material: object.material, visible: object.visible
}));
const renderer = { shadowMap: { needsUpdate: false } };
const controller = createResidenceInteractions(THREE, { scene, root, renderer });
assert.equal(controller.report.bathroom.available, true);
assert.equal(controller.report.doors.length, 2);
assert.equal(controller.report.windows.length, 2);
assert.equal(controller.report.screenCount, 1);
assert.equal(controller.destinations.bathroom.position.every(Number.isFinite), true);
assert.ok(controller.interactables.every(object => object.isMesh));

const door = root.getObjectByName('entry_door');
const originalDoorWorld = door.getWorldPosition(new THREE.Vector3()).clone();
controller.setState({ motion: false });
assert.equal(controller.activateFromObject(door), true);
for (let i = 0; i < 12; i++) controller.update(0.1);
assert.equal(controller.actions.find(action => action.id === 'entry-door').state, 'open');
assert.ok(door.getWorldPosition(new THREE.Vector3()).distanceTo(originalDoorWorld) > 0.5,
  'Opening must move the actual authored door while environmental motion is paused');
controller.activate('entry-door');
for (let i = 0; i < 12; i++) controller.update(0.1);
assert.ok(door.getWorldPosition(new THREE.Vector3()).distanceTo(originalDoorWorld) < 1e-6);

const glazing = root.getObjectByName('living_glass_03');
const closedGlazing = glazing.getWorldPosition(new THREE.Vector3()).clone();
controller.activate('living-window');
for (let i = 0; i < 12; i++) controller.update(0.1);
assert.ok(glazing.getWorldPosition(new THREE.Vector3()).distanceTo(closedGlazing) > 1.4);
assert.ok(root.getObjectByName('living_glass_03'), 'Moving windows must remain inside the source hierarchy');

// Match the viewer's closest-visible-geometry picking, including the stationary
// neighbour pane. Both sides must retain a reachable closing handle when stacked.
const raycaster = new THREE.Raycaster();
function firstVisibleHit() {
  return raycaster.intersectObject(root, true).find(hit => {
    for (let item = hit.object; item; item = item.parent) if (!item.visible) return false;
    return true;
  });
}
for (const id of ['living-window', 'bedroom-window']) {
  if (controller.actions.find(action => action.id === id).state !== 'open') controller.activate(id);
  for (let i = 0; i < 12; i++) controller.update(0.1);
  for (const outside of [true, false]) {
    const handle = root.getObjectByName(`runtime_${id}_${outside ? 'pull' : 'interior_pull'}`);
    const target = handle.getWorldPosition(new THREE.Vector3());
    const direction = new THREE.Vector3(0,0,outside ? -1 : 1);
    raycaster.set(target.clone().addScaledVector(direction,-0.4),direction);
    const hit = firstVisibleHit();
    assert.equal(controller.actionForObject(hit?.object)?.id, id,
      `${id}: ${outside ? 'outside' : 'room-side'} pull must remain clickable beyond the fixed glazing`);
  }
}

const cabinet = root.getObjectByName('kitchen_base_v04_00');
const cabinetMaterial = cabinet.material;
const rainHook = () => {};
cabinetMaterial.onBeforeCompile = rainHook;
controller.setState({ kitchenStyle: 'graphite', furnitureStyle: 'sage' });
assert.equal(cabinet.material, cabinetMaterial, 'Interior choices must retain material identity for later rain/PBR hooks');
assert.equal(cabinet.material.onBeforeCompile, rainHook);
assert.equal(cabinet.material.color.getHexString(), '3f4440');

controller.activate('living-tv-power');
controller.activate('living-tv-channel');
assert.equal(controller.actions.find(action => action.id === 'living-tv-channel').state, 'Ocean');
const screen = root.getObjectByName('runtime_living_television_display');
assert.equal(screen.material.uniforms.uPower.value, 1);
assert.equal(screen.material.uniforms.uTime.value, 0, 'Paused environmental motion must not animate the screen');
renderer.shadowMap.needsUpdate = false;
controller.setState({ motion: true });
renderer.shadowMap.needsUpdate = false;
controller.update(0.1);
assert.equal(renderer.shadowMap.needsUpdate, false, 'TV pixels must not invalidate architectural shadows');

controller.activate('bathroom-door');
assert.equal(root.getObjectByName('ground_right_private_core').visible, false);
assert.equal(root.getObjectByName('runtime_private_core_bathroom').visible, true);
assert.ok(root.getObjectByName('runtime_bathroom_wc_bowl'));
assert.ok(root.getObjectByName('runtime_bathroom_vessel_basin'));
assert.ok(root.getObjectByName('runtime_bathroom_rain_shower_head'));
controller.setBathroomCutaway(false);
assert.equal(root.getObjectByName('ground_right_private_core').visible, true);

controller.dispose();
controller.dispose();
for (const [object, before] of originals) {
  assert.equal(object.parent, before.parent, `${object.name}: original parent must be restored`);
  assert.ok(object.position.distanceTo(before.position) < 1e-6, `${object.name}: original position must be restored`);
  assert.ok(1 - Math.abs(object.quaternion.dot(before.quaternion)) < 1e-6, `${object.name}: original rotation must be restored`);
  assert.equal(object.material, before.material, `${object.name}: original material must be restored`);
  assert.equal(object.visible, before.visible, `${object.name}: original visibility must be restored`);
  assert.equal(object.userData.residenceActionId, undefined, `${object.name}: pick metadata must be released`);
}
assert.equal(root.getObjectByName('runtime_residence_interactions'), undefined);
console.log(JSON.stringify({ status: 'PASS', actionCount: controller.actions.length,
  checks: ['actual GLB panels move', 'paused door motion', 'window hierarchy', 'both-side open-window raycast', 'stable material hooks', 'TV controls', 'bathroom visibility', 'source restoration'] }, null, 2));
