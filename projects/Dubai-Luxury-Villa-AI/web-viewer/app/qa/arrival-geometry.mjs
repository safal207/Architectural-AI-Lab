import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildArrivalRoute, checkArrivalClearance } from '../src/arrivalReveal.js';
const root = new THREE.Group();
for (const [name, xyz] of [['tour_entry', [0, 1.65, 0]], ['tour_living', [4, 1.65, 0]], ['infinity_lip', [4, 0, -8]]]) {
  const node = new THREE.Object3D(); node.name = name; node.position.fromArray(xyz); root.add(node);
}
root.updateMatrixWorld(true);
const route = buildArrivalRoute(root);
assert(route.clearance.clear);
assert.equal(route.clearance.probes, 9);
assert(route.entry.position.distanceTo(route.living.position) > 3);
const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 2), new THREE.MeshBasicMaterial());
wall.name = 'synthetic-wall'; wall.position.set(2, 1.65, 0); root.add(wall); root.updateMatrixWorld(true);
assert.throws(() => buildArrivalRoute(root), /synthetic-wall/);
assert.equal(checkArrivalClearance(root, route.living.position, route.entry.position).clear, false);
assert.equal(wall.material.side, THREE.FrontSide, 'Probe changed real material sidedness');
root.remove(wall); wall.geometry.dispose(); wall.material.dispose();
root.rotation.y = Math.PI; root.updateMatrixWorld(true);
const rotated = buildArrivalRoute(root);
assert(rotated.clearance.clear);
assert(Math.abs(rotated.living.position.x + 4) < 1e-8);
root.remove(root.getObjectByName('tour_living'));
assert.throws(() => buildArrivalRoute(root), /tour_living/);
console.log('PASS: geometry guard, both wall directions, unchanged materials, world transforms and missing anchors.');
