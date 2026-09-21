import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const REPAIR_KEY = 'stairPresentationRepair';
const HEAD_CLEARANCE = 2;
const EDGE_CLEARANCE = 0.08;
const SLAB_NAMES = ['upper_floor_slab', 'living_ceiling_warm'];
const ORPHAN_JOINT_NAMES = ['upper_spine_joint_00', 'upper_spine_joint_01', 'upper_spine_joint_02'];

function boundsInSpace(mesh, inverseSpace) {
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox.clone().applyMatrix4(
    new THREE.Matrix4().multiplyMatrices(inverseSpace, mesh.matrixWorld)
  );
}

function serializeBox(box) {
  return { min: box.min.toArray(), max: box.max.toArray() };
}

function makeSlabSegments(bounds, opening) {
  // Four non-overlapping strips retain the complete slab outside the opening.
  // A ceiling edge or corner meeting the stair needs fewer strips.
  const rectangles = [
    [bounds.min.x, opening.min.x, bounds.min.z, bounds.max.z],
    [opening.max.x, bounds.max.x, bounds.min.z, bounds.max.z],
    [opening.min.x, opening.max.x, bounds.min.z, opening.min.z],
    [opening.min.x, opening.max.x, opening.max.z, bounds.max.z]
  ].filter(([x0, x1, z0, z1]) => x1 - x0 > 1e-5 && z1 - z0 > 1e-5);
  const height = bounds.max.y - bounds.min.y;
  const parts = rectangles.map(([x0, x1, z0, z1]) => {
    const geometry = new THREE.BoxGeometry(x1 - x0, height, z1 - z0);
    geometry.translate((x0 + x1) / 2, (bounds.min.y + bounds.max.y) / 2, (z0 + z1) / 2);
    return geometry;
  });
  const geometry = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, segmentCount: rectangles.length };
}

/**
 * Repair two documented defects in the shipped concept model at load time.
 * The original GLB remains unchanged. A removed stone spine left three metal
 * joints behind; two intact floor/ceiling boxes also cover the authored stairs.
 * Keep every tread, landing, bridge and guard, and open only their stairwell.
 * Call after the model transform is applied, before building the walk graph.
 */
export function applyStairPresentation(root) {
  if (root.userData[REPAIR_KEY]) return root.userData[REPAIR_KEY];
  root.updateMatrixWorld(true);
  const report = { version: 1, orphanTrimHidden: [], slabsRebuilt: [], headClearance: HEAD_CLEARANCE };

  // These are facade trim, not the stair handrail. Retain them if their host
  // exists in a future export instead of applying the old defect blindly.
  if (!root.getObjectByName('upper_stone_spine')) {
    for (const name of ORPHAN_JOINT_NAMES) {
      const joint = root.getObjectByName(name);
      if (!joint?.isMesh) continue;
      joint.visible = false;
      joint.userData.stairRepairReason = 'Orphan trim: upper_stone_spine was removed in the interior model.';
      report.orphanTrimHidden.push(name);
    }
  }

  const steps = [];
  root.traverse((object) => {
    if (object.isMesh && /^stair_step_v04_\d+$/.test(object.name)) steps.push(object);
  });
  const guard = root.getObjectByName('stair_glass_guard_v04_r2');
  // The repair is specific to the complete authored flight, not a generic
  // boolean operation on assets with missing or differently named stairs.
  if (steps.length === 14 && guard?.isMesh) {
    for (const name of SLAB_NAMES) {
      const slab = root.getObjectByName(name);
      if (!slab?.isMesh || Array.isArray(slab.material)) continue;
      slab.geometry.computeBoundingBox();
      const originalBounds = slab.geometry.boundingBox.clone();
      const inverseSlab = new THREE.Matrix4().copy(slab.matrixWorld).invert();
      const stepBounds = steps.map((step) => ({ step, bounds: boundsInSpace(step, inverseSlab) }));
      const affected = stepBounds.filter(({ bounds }) => (
        bounds.max.y <= originalBounds.max.y
        && originalBounds.min.y - bounds.max.y < HEAD_CLEARANCE
        && bounds.max.x > originalBounds.min.x && bounds.min.x < originalBounds.max.x
        && bounds.max.z > originalBounds.min.z && bounds.min.z < originalBounds.max.z
      ));
      if (!affected.length) continue;

      const opening = new THREE.Box3();
      affected.forEach(({ bounds }) => opening.union(bounds));
      const guardBounds = boundsInSpace(guard, inverseSlab);
      // Include the glass thickness at the open edge, but never extend the
      // aperture along the whole guard into the lower, clear stair approach.
      opening.min.x = Math.min(opening.min.x, guardBounds.min.x) - EDGE_CLEARANCE;
      opening.max.x = Math.max(opening.max.x, guardBounds.max.x) + EDGE_CLEARANCE;
      opening.min.z -= EDGE_CLEARANCE;
      opening.max.z += EDGE_CLEARANCE;
      opening.min.y = originalBounds.min.y;
      opening.max.y = originalBounds.max.y;
      opening.intersect(originalBounds);
      if (opening.isEmpty()) continue;

      const originalGeometry = slab.geometry;
      const rebuilt = makeSlabSegments(originalBounds, opening);
      slab.geometry = rebuilt.geometry;
      slab.userData.stairRepairReason = 'Stairwell aperture through the original solid floor/ceiling box.';
      const openingWorld = opening.clone().applyMatrix4(slab.matrixWorld);
      report.slabsRebuilt.push({
        name,
        segmentCount: rebuilt.segmentCount,
        affectedSteps: affected.map(({ step }) => step.name).sort(),
        boundsLocal: serializeBox(originalBounds),
        openingLocal: serializeBox(opening),
        openingWorld: serializeBox(openingWorld)
      });
      let shared = false;
      root.traverse((object) => { if (object.geometry === originalGeometry) shared = true; });
      if (!shared) originalGeometry.dispose();
    }
  }
  root.userData[REPAIR_KEY] = report;
  return report;
}
