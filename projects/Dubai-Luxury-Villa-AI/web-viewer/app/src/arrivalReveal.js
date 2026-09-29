import * as THREE from 'three';
import { placeFirstPersonCamera } from './walkthroughEngine.js';

export const ARRIVAL_CLEARANCE = 0.18;

/** Nine double-sided ray probes around the camera path; not a human collision system. */
export function checkArrivalClearance(root, from, to) {
  const distance = from.distanceTo(to);
  if (!Number.isFinite(distance) || distance < 0.25) return { clear: false, reason: 'Invalid arrival path' };
  root.updateMatrixWorld(true);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const colliders = [];
  root.traverseVisible((object) => {
    if (!object.isMesh || !object.geometry) return;
    const mesh = new THREE.Mesh(object.geometry, material);
    mesh.name = object.name;
    mesh.matrixAutoUpdate = false;
    mesh.matrixWorld.copy(object.matrixWorld);
    colliders.push(mesh);
  });
  const direction = to.clone().sub(from).normalize();
  const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
  if (right.lengthSq() < 0.5) { material.dispose(); return { clear: false, reason: 'Vertical arrival path' }; }
  const up = new THREE.Vector3().crossVectors(right, direction).normalize();
  try {
    for (const x of [-ARRIVAL_CLEARANCE, 0, ARRIVAL_CLEARANCE]) {
      for (const y of [-ARRIVAL_CLEARANCE, 0, ARRIVAL_CLEARANCE]) {
        const origin = from.clone().addScaledVector(right, x).addScaledVector(up, y);
        const hits = new THREE.Raycaster(origin, direction, 0, distance).intersectObjects(colliders, false);
        if (hits.length) return { clear: false, reason: `Arrival path intersects ${hits[0].object.name || 'geometry'}`, obstacle: hits[0].object.name };
      }
    }
    return { clear: true, probes: 9, clearance: ARRIVAL_CLEARANCE, distance };
  } finally { material.dispose(); }
}

/** Use real authored eye points; compose the final view toward the existing infinity edge. */
export function buildArrivalRoute(root, aspect = 16 / 9) {
  for (const name of ['tour_entry', 'tour_living', 'infinity_lip']) {
    if (!root?.getObjectByName(name)) throw new Error(`Arrival requires ${name}`);
  }
  const entry = new THREE.PerspectiveCamera(64, aspect, 0.1, 1000);
  const living = entry.clone();
  if (!placeFirstPersonCamera(entry, root, 'entry') || !placeFirstPersonCamera(living, root, 'living')) {
    throw new Error('Arrival eye points are unavailable');
  }
  if (Math.abs(entry.position.y - living.position.y) > 0.5) throw new Error('Arrival must stay on the ground floor');
  const water = root.getObjectByName('infinity_lip').getWorldPosition(new THREE.Vector3());
  water.y = Math.max(water.y, living.position.y - 0.4);
  if (water.distanceTo(living.position) < 0.25) throw new Error('Water look target is too close');
  living.lookAt(water);
  const clearance = checkArrivalClearance(root, entry.position, living.position);
  if (!clearance.clear) throw new Error(clearance.reason);
  return { entry, living, water, clearance };
}

export { createArrivalDirector } from './arrivalDirector.js';
