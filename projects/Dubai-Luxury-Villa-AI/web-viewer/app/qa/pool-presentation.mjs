import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { applyPoolPresentation } from '../src/three/poolPresentation.js';

// Read the shipped geometry and transforms without a renderer or texture loader.
const glbPath = new URL('../public/villa.glb', import.meta.url);
const glb = readFileSync(glbPath);
const hashBefore = createHash('sha256').update(glb).digest('hex');
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());
const binStart = 20 + jsonLength + 8;
const poolNames = new Set([
  'pool_water', 'pool_basin', 'pool_shallow_shelf', 'pool_floor_r3',
  'pool_coping_left', 'pool_coping_right', 'pool_coping_near', 'infinity_lip'
]);

/** Decode a FLOAT VEC3 position accessor from the actual GLB, respecting byte offsets and stride. */
function readPositions(index) {
  const accessor = gltf.accessors[index];
  assert.equal(accessor.componentType, 5126);
  assert.equal(accessor.type, 'VEC3');
  const view = gltf.bufferViews[accessor.bufferView];
  const offset = binStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? 12;
  const result = new Float32Array(accessor.count * 3);
  for (let vertex = 0; vertex < accessor.count; vertex += 1) {
    for (let axis = 0; axis < 3; axis += 1) result[vertex * 3 + axis] = glb.readFloatLE(offset + vertex * stride + axis * 4);
  }
  return result;
}

/**
 * Reconstruct the GLB hierarchy and real pool position streams without a renderer or texture loader.
 * Retain relevant authored material values and apply the viewer's root rotation for repair tests.
 */
function makeRoot() {
  const nodes = gltf.nodes.map((node) => {
    let object = new THREE.Object3D();
    if (poolNames.has(node.name)) {
      const primitives = gltf.meshes[node.mesh].primitives;
      assert.equal(primitives.length, 1, `${node.name}: fixture expects one actual pool primitive`);
      const primitive = primitives[0];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(readPositions(primitive.attributes.POSITION), 3));
      const authoredMaterial = gltf.materials[primitive.material];
      const material = new THREE.MeshPhysicalMaterial({
        transmission: authoredMaterial.extensions?.KHR_materials_transmission?.transmissionFactor ?? 0,
        roughness: authoredMaterial.pbrMetallicRoughness?.roughnessFactor ?? 1
      });
      material.name = authoredMaterial.name;
      const color = authoredMaterial.pbrMetallicRoughness?.baseColorFactor;
      if (color) material.color.setRGB(...color.slice(0, 3));
      object = new THREE.Mesh(geometry, material);
      object.castShadow = true;
      object.receiveShadow = true;
    }
    object.name = node.name ?? '';
    if (node.matrix) {
      object.matrix.fromArray(node.matrix).decompose(object.position, object.quaternion, object.scale);
    } else {
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
    }
    return object;
  });
  gltf.nodes.forEach((node, index) => (node.children ?? []).forEach((child) => nodes[index].add(nodes[child])));
  const root = new THREE.Group();
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes) root.add(nodes[index]);
  root.rotation.y = Math.PI;
  root.updateMatrixWorld(true);
  return root;
}

/** Read a named fixture mesh's bounding box in model-root coordinates. */
function bounds(root, name) {
  const mesh = root.getObjectByName(name);
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox.clone().applyMatrix4(
    new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld)
  );
}

/** Require scalar pool measurements to agree within 1e-6 model units. */
function close(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} vs ${expected}`);
}

/** Compare both X/Z extrema while intentionally allowing a shelf's elevation to change. */
function sameFootprint(actual, expected, message) {
  for (const axis of ['x', 'z']) {
    close(actual.min[axis], expected.min[axis], `${message} min ${axis}`);
    close(actual.max[axis], expected.max[axis], `${message} max ${axis}`);
  }
}

/** Detect positive X/Z overlap above numeric tolerance; touching edges alone are not overlap. */
function overlapsInPlan(a, b) {
  return Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x) > 1e-6
    && Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z) > 1e-6;
}

const root = makeRoot();
const before = Object.fromEntries([...poolNames].map((name) => [name, bounds(root, name)]));
assert.ok(Math.abs(before.pool_water.max.y - before.pool_shallow_shelf.max.y) < 1e-7,
  'The canonical asset should reproduce the reported coplanar water/shelf faces');
assert.ok(overlapsInPlan(before.pool_coping_right, before.pool_water),
  'The canonical asset should reproduce the misplaced side coping');
const snapshots = new Map();
root.traverse((object) => snapshots.set(object, {
  position: object.position.clone(), scale: object.scale.clone(), quaternion: object.quaternion.clone(),
  geometry: object.geometry, positions: object.geometry?.attributes.position.array.slice(), material: object.material
}));
const water = root.getObjectByName('pool_water');
const waterMaterial = water.material.toJSON();
const report = applyPoolPresentation(THREE, root);
assert.equal(report.shelfAdjusted, true);
assert.equal(report.copingAdjustedCount, 3);
assert.equal(water.castShadow, false);
assert.equal(water.receiveShadow, true);
assert.deepEqual(water.material.toJSON(), waterMaterial, 'Authored water material must remain intact');

const after = Object.fromEntries([...poolNames].map((name) => [name, bounds(root, name)]));
close(after.pool_water.max.y - after.pool_shallow_shelf.max.y, 0.012, 'Shelf must be clearly below the water');
assert.ok(after.pool_shallow_shelf.max.y > after.pool_basin.max.y,
  'Shelf top must remain above the solid concept basin, not be buried inside it');
sameFootprint(after.pool_shallow_shelf, before.pool_shallow_shelf, 'Shelf footprint');
for (const name of ['pool_water', 'pool_basin', 'pool_floor_r3', 'infinity_lip']) {
  assert.ok(after[name].equals(before[name]), `${name} geometry placement must remain intact`);
}

const basin = after.pool_basin;
const left = after.pool_coping_left;
const right = after.pool_coping_right;
const near = after.pool_coping_near;
close(left.min.x, basin.min.x, 'Left coping outer face must align to basin');
close(right.max.x, basin.max.x, 'Right coping outer face must align to basin');
for (const name of ['pool_coping_left', 'pool_coping_right']) {
  close(after[name].min.z, basin.min.z, `${name} far end must align to basin`);
  close(after[name].max.z, basin.max.z, `${name} near end must align to basin`);
  close(after[name].max.x - after[name].min.x, before[name].max.x - before[name].min.x, `${name} width`);
}
close(near.min.x, left.max.x, 'Near coping must meet left inner edge');
close(near.max.x, right.min.x, 'Near coping must meet right inner edge');
close(near.max.z, basin.max.z, 'Near coping outer face must align to basin');
close(near.max.z - near.min.z, before.pool_coping_near.max.z - before.pool_coping_near.min.z, 'Near coping thickness');
for (const name of ['pool_coping_left', 'pool_coping_right', 'pool_coping_near']) {
  assert.equal(overlapsInPlan(after[name], after.pool_water), false, `${name} must stay outside the water footprint`);
  close(after[name].min.y, before[name].min.y, `${name} lower elevation`);
  close(after[name].max.y, before[name].max.y, `${name} upper elevation`);
}

const adjusted = new Set(['pool_shallow_shelf', 'pool_coping_left', 'pool_coping_right', 'pool_coping_near']);
let anchorCount = 0;
root.traverse((object) => {
  const snapshot = snapshots.get(object);
  assert.ok(snapshot, 'No replacement or extra geometry should be introduced');
  assert.equal(object.geometry, snapshot.geometry);
  assert.equal(object.material, snapshot.material);
  if (object.geometry) assert.deepEqual(object.geometry.attributes.position.array, snapshot.positions);
  assert.ok(object.quaternion.equals(snapshot.quaternion));
  if (!adjusted.has(object.name)) {
    assert.ok(object.position.equals(snapshot.position), `${object.name} position changed unexpectedly`);
    assert.ok(object.scale.equals(snapshot.scale), `${object.name} scale changed unexpectedly`);
  }
  if (object.name.startsWith('tour_')) anchorCount += 1;
});
assert.ok(anchorCount > 0, 'Actual tour anchors must be included in the unchanged-transform checks');
const secondReport = applyPoolPresentation(THREE, root);
assert.equal(secondReport.shelfAdjusted, false, 'Repeated application must not keep lowering the shelf');
assert.equal(secondReport.copingAdjustedCount, 0, 'Repeated application must not keep adjusting coping');
for (const name of poolNames) assert.ok(bounds(root, name).equals(after[name]), `${name}: repeated application drifted`);

// Safe no-ops for an absent asset and an already separated source shelf.
assert.equal(applyPoolPresentation(THREE, new THREE.Group()).waterFound, false);
const separatedRoot = makeRoot();
separatedRoot.getObjectByName('pool_shallow_shelf').position.y -= 0.06;
separatedRoot.rotation.set(0.1, 0.7, 0.03);
separatedRoot.position.set(4, 2, -3);
separatedRoot.updateMatrixWorld(true);
const separatedShelf = separatedRoot.getObjectByName('pool_shallow_shelf').position.clone();
assert.equal(applyPoolPresentation(THREE, separatedRoot).shelfAdjusted, false);
assert.ok(separatedRoot.getObjectByName('pool_shallow_shelf').position.equals(separatedShelf));

assert.equal(createHash('sha256').update(readFileSync(glbPath)).digest('hex'), hashBefore,
  'The source GLB must remain unchanged');
console.log(JSON.stringify({
  status: 'PASS',
  ...report,
  preservedTourAnchors: anchorCount,
  sourceSha256: hashBefore,
  sourceTopGapMeters: before.pool_water.max.y - before.pool_shallow_shelf.max.y,
  remainingConceptLimitation: 'The authored basin is a solid shallow slab. Water-to-basin top remains about 40mm; this presentation repair does not define a physical pool depth.'
}, null, 2));
