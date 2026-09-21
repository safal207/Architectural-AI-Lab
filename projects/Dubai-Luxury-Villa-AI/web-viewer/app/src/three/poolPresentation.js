const COPLANAR_TOLERANCE_METERS = 0.001;
const SHELF_SUBMERGENCE_METERS = 0.012;

function boundsInRoot(THREE, root, mesh) {
  if (!mesh?.isMesh || !mesh.geometry?.attributes?.position) return null;
  mesh.geometry.computeBoundingBox();
  const relative = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);
  return mesh.geometry.boundingBox.clone().applyMatrix4(relative);
}

function moveInRoot(THREE, root, mesh, offset) {
  const position = root.worldToLocal(mesh.getWorldPosition(new THREE.Vector3())).add(offset);
  root.localToWorld(position);
  if (mesh.parent) mesh.parent.worldToLocal(position);
  mesh.position.copy(position);
  mesh.updateMatrix();
  mesh.updateWorldMatrix(false, true);
}

function isAxisAlignedInRoot(THREE, root, mesh) {
  const relative = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);
  return [1, 2, 4, 6, 8, 9].every((index) => Math.abs(relative.elements[index]) < 1e-6);
}

function alignCoping(THREE, root, waterBounds) {
  const basin = root.getObjectByName('pool_basin');
  const left = root.getObjectByName('pool_coping_left');
  const right = root.getObjectByName('pool_coping_right');
  const near = root.getObjectByName('pool_coping_near');
  if (![basin, left, right, near].every((mesh) => mesh?.isMesh && isAxisAlignedInRoot(THREE, root, mesh))) {
    return 0;
  }

  const basinBounds = boundsInRoot(THREE, root, basin);
  const leftBounds = boundsInRoot(THREE, root, left);
  const rightBounds = boundsInRoot(THREE, root, right);
  const nearBounds = boundsInRoot(THREE, root, near);
  if ([basinBounds, leftBounds, rightBounds, nearBounds].some((bounds) => !bounds || bounds.isEmpty())) {
    return 0;
  }

  const basinSize = basinBounds.getSize(new THREE.Vector3());
  const leftWidth = leftBounds.max.x - leftBounds.min.x;
  const rightWidth = rightBounds.max.x - rightBounds.min.x;
  const nearDepth = nearBounds.max.z - nearBounds.min.z;
  const leftInner = basinBounds.min.x + leftWidth;
  const rightInner = basinBounds.max.x - rightWidth;
  const nearInner = basinBounds.max.z - nearDepth;
  // Only fit the existing edging when its cross-section fits the authored gap.
  // A later asset with a different pool layout should keep its own geometry.
  if (leftInner >= waterBounds.min.x || rightInner <= waterBounds.max.x
    || nearInner <= waterBounds.max.z || basinBounds.min.z >= waterBounds.min.z) {
    return 0;
  }

  const centerZ = (basinBounds.min.z + basinBounds.max.z) / 2;
  const targets = [
    { mesh: left, axis: 'z', length: basinSize.z, x: basinBounds.min.x + leftWidth / 2, z: centerZ },
    { mesh: right, axis: 'z', length: basinSize.z, x: basinBounds.max.x - rightWidth / 2, z: centerZ },
    { mesh: near, axis: 'x', length: rightInner - leftInner, x: (leftInner + rightInner) / 2, z: basinBounds.max.z - nearDepth / 2 }
  ];
  let adjustedCount = 0;
  for (const target of targets) {
    let bounds = boundsInRoot(THREE, root, target.mesh);
    const length = bounds.max[target.axis] - bounds.min[target.axis];
    if (length <= 0) continue;
    const center = bounds.getCenter(new THREE.Vector3());
    if (Math.abs(length - target.length) < 1e-6
      && Math.abs(center.x - target.x) < 1e-6 && Math.abs(center.z - target.z) < 1e-6) continue;

    // R2's coping retained its old dimensions after R11 resized the basin.
    // Preserve the strip cross-sections and elevations; fit their lengths and
    // positions to the current basin, with the near strip between the sides.
    target.mesh.scale[target.axis] *= target.length / length;
    target.mesh.updateMatrix();
    target.mesh.updateWorldMatrix(false, true);
    bounds = boundsInRoot(THREE, root, target.mesh);
    bounds.getCenter(center);
    moveInRoot(THREE, root, target.mesh, new THREE.Vector3(target.x - center.x, 0, target.z - center.z));
    adjustedCount += 1;
  }
  return adjustedCount;
}

/**
 * Repair the pool's exported presentation without changing the source asset.
 * run_v03_r11.py gives both the water and shallow shelf a top elevation of .22 m.
 * Their overlapping triangles therefore compete for the same depth-buffer value.
 */
export function applyPoolPresentation(THREE, root) {
  const report = {
    profile: 'pool-surface-separation-v1',
    waterFound: false,
    shelfFound: false,
    shelfAdjusted: false,
    shelfSubmergenceMeters: null,
    waterShadowDisabled: false,
    copingAdjustedCount: 0
  };
  if (!root) return report;

  const water = root.getObjectByName('pool_water');
  const shelf = root.getObjectByName('pool_shallow_shelf');
  report.waterFound = Boolean(water?.isMesh);
  report.shelfFound = Boolean(shelf?.isMesh);
  if (!report.waterFound) return report;

  const materials = Array.isArray(water.material) ? water.material : [water.material];
  if (materials.some((material) => material?.transmission > 0)) {
    // Three's shadow depth material does not account for transmission: this thin
    // water volume would otherwise cast a solid slab shadow onto its own basin.
    water.castShadow = false;
    report.waterShadowDisabled = true;
  }

  root.updateWorldMatrix(true, true);
  const waterBounds = boundsInRoot(THREE, root, water);
  if (!waterBounds || waterBounds.isEmpty()) return report;
  report.copingAdjustedCount = alignCoping(THREE, root, waterBounds);
  if (!report.shelfFound) return report;
  const shelfBounds = boundsInRoot(THREE, root, shelf);
  if (!shelfBounds || shelfBounds.isEmpty()) return report;

  const overlapX = Math.min(waterBounds.max.x, shelfBounds.max.x)
    - Math.max(waterBounds.min.x, shelfBounds.min.x);
  const overlapZ = Math.min(waterBounds.max.z, shelfBounds.max.z)
    - Math.max(waterBounds.min.z, shelfBounds.min.z);
  const submergence = waterBounds.max.y - shelfBounds.max.y;
  report.shelfSubmergenceMeters = submergence;

  if (overlapX <= 0 || overlapZ <= 0 || Math.abs(submergence) > COPLANAR_TOLERANCE_METERS) {
    return report;
  }

  // Keep the shelf's footprint and thickness. Moving it just below the water
  // resolves the known coincident top faces rather than hiding the entry shelf
  // or using render-order/depth-test overrides that fail from another angle.
  moveInRoot(THREE, root, shelf, new THREE.Vector3(0, submergence - SHELF_SUBMERGENCE_METERS, 0));

  report.shelfAdjusted = true;
  report.shelfSubmergenceMeters = SHELF_SUBMERGENCE_METERS;
  return report;
}
