import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { applyStairPresentation } from '../src/three/stairPresentation.js';
import { buildWalkGraph } from '../src/walkthroughEngine.js';

// Read the actual position/index streams, including the original beveled
// solids. No renderer, mocked slab topology, texture loading or GLB mutation.
const glb = readFileSync(new URL('../public/villa.glb', import.meta.url));
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());
const binary = glb.subarray(28 + jsonLength);
const componentReaders = {
  5121: [1, 'readUInt8'], 5123: [2, 'readUInt16LE'],
  5125: [4, 'readUInt32LE'], 5126: [4, 'readFloatLE']
};
function readAccessor(index) {
  const accessor = gltf.accessors[index];
  const view = gltf.bufferViews[accessor.bufferView];
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
  const [bytes, reader] = componentReaders[accessor.componentType];
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? bytes * width;
  return Array.from({ length: accessor.count * width }, (_, item) => (
    binary[reader](offset + Math.floor(item / width) * stride + (item % width) * bytes)
  ));
}
const materials = gltf.materials.map((item) => {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  material.name = item.name;
  return material;
});
const nodes = gltf.nodes.map((node) => {
  let object = new THREE.Object3D();
  if (node.mesh !== undefined) {
    const primitives = gltf.meshes[node.mesh].primitives;
    const meshes = primitives.map((primitive) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(readAccessor(primitive.attributes.POSITION), 3));
      if (primitive.indices !== undefined) geometry.setIndex(readAccessor(primitive.indices));
      return new THREE.Mesh(geometry, materials[primitive.material]);
    });
    object = meshes.length === 1 ? meshes[0] : new THREE.Group();
    if (meshes.length > 1) object.add(...meshes);
  }
  object.name = node.name ?? '';
  if (node.matrix) {
    object.matrix.fromArray(node.matrix);
    object.matrix.decompose(object.position, object.quaternion, object.scale);
  } else {
    if (node.translation) object.position.fromArray(node.translation);
    if (node.rotation) object.quaternion.fromArray(node.rotation);
    if (node.scale) object.scale.fromArray(node.scale);
  }
  return object;
});
gltf.nodes.forEach((node, index) => {
  for (const child of node.children ?? []) nodes[index].add(nodes[child]);
});
const root = new THREE.Group();
for (const index of gltf.scenes[gltf.scene ?? 0].nodes) root.add(nodes[index]);
root.rotation.y = Math.PI;
root.updateMatrixWorld(true);

const slabNames = ['upper_floor_slab', 'living_ceiling_warm'];
const slabs = slabNames.map((name) => root.getObjectByName(name));
const original = new Map();
root.traverse((object) => {
  if (object.isMesh) original.set(object.name, {
    geometry: object.geometry, material: object.material, matrix: object.matrixWorld.clone(), visible: object.visible
  });
});
const graphBefore = buildWalkGraph(root);
const route = graphBefore.edges.filter((edge) => edge.type === 'stairs');
assert(route.length > 2, 'The real model must supply authored stair segments.');
const ray = new THREE.Raycaster();
const up = new THREE.Vector3(0, 1, 0);
function blockedHeadSamples() {
  let blocked = 0;
  for (const edge of route) {
    const count = Math.max(2, Math.ceil(edge.a.distanceTo(edge.b) / 0.025));
    const sideways = new THREE.Vector3(edge.b.z - edge.a.z, 0, edge.a.x - edge.b.x).normalize();
    for (let i = 0; i <= count; i += 1) {
      const eye = edge.a.clone().lerp(edge.b, i / count);
      // The graph uses a 1.6 m eye height. Verify the head and shoulder band
      // through 2 m above the tread and both sides of the walk corridor.
      for (const offset of [-edge.radius, 0, edge.radius]) {
        const origin = eye.clone().addScaledVector(up, -0.35).addScaledVector(sideways, offset);
        ray.set(origin, up);
        ray.near = 0;
        ray.far = 0.75;
        if (ray.intersectObjects(slabs, false).length) blocked += 1;
      }
    }
  }
  return blocked;
}
const blockedBefore = blockedHeadSamples();
assert(blockedBefore > 0, 'This regression must reproduce the original slab/stair obstruction.');

const report = applyStairPresentation(root);
assert.equal(report.orphanTrimHidden.length, 3);
assert.deepEqual(report.slabsRebuilt.map(({ name }) => name), slabNames);
assert.equal(blockedHeadSamples(), 0, 'A repaired slab still intersects the authored stair head clearance.');
assert.deepEqual(buildWalkGraph(root), graphBefore, 'The geometry repair changed the authored walking route.');

let coverageSamples = 0;
for (const repair of report.slabsRebuilt) {
  const slab = root.getObjectByName(repair.name);
  const box = new THREE.Box3(new THREE.Vector3(...repair.boundsLocal.min), new THREE.Vector3(...repair.boundsLocal.max));
  const hole = new THREE.Box3(new THREE.Vector3(...repair.openingLocal.min), new THREE.Vector3(...repair.openingLocal.max));
  assert(slab.geometry.boundingBox.equals(box), `${repair.name} changed its outer bounds.`);
  const width = hole.max.x - hole.min.x;
  const length = hole.max.z - hole.min.z;
  assert(width < 1.9 && length < 3.2, `${repair.name} has an oversized stair opening.`);
  assert(repair.segmentCount >= 2 && repair.segmentCount <= 4);
  const down = new THREE.Vector3(0, -1, 0).transformDirection(slab.matrixWorld);
  for (let x = box.min.x + 0.025; x < box.max.x; x += 0.125) {
    for (let z = box.min.z + 0.025; z < box.max.z; z += 0.125) {
      const inside = x > hole.min.x && x < hole.max.x && z > hole.min.z && z < hole.max.z;
      const origin = new THREE.Vector3(x, box.max.y + 1, z).applyMatrix4(slab.matrixWorld);
      ray.set(origin, down);
      ray.near = 0;
      ray.far = 2;
      const hit = ray.intersectObject(slab, false).length > 0;
      assert.equal(hit, !inside, `${repair.name} floor coverage mismatch at ${x}, ${z}.`);
      coverageSamples += 1;
    }
  }
}

root.traverse((object) => {
  const before = original.get(object.name);
  if (!before) return;
  assert.equal(object.material, before.material, `${object.name} material was replaced.`);
  assert(object.matrixWorld.equals(before.matrix), `${object.name} transform changed.`);
  if (!slabNames.includes(object.name)) assert.equal(object.geometry, before.geometry, `${object.name} geometry changed.`);
  if (!report.orphanTrimHidden.includes(object.name)) assert.equal(object.visible, before.visible, `${object.name} visibility changed.`);
});
const repairedGeometry = slabs.map((slab) => slab.geometry);
assert.equal(applyStairPresentation(root), report, 'Repeated application should return the original report.');
assert.deepEqual(slabs.map((slab) => slab.geometry), repairedGeometry, 'Repeated application rebuilt the slabs.');

const futureRoot = new THREE.Group();
const host = new THREE.Object3D();
host.name = 'upper_stone_spine';
futureRoot.add(host);
const trim = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
trim.name = 'upper_spine_joint_00';
futureRoot.add(trim);
assert.equal(applyStairPresentation(futureRoot).orphanTrimHidden.length, 0);
assert(trim.visible, 'Trim with a present host must not be hidden.');

console.log(JSON.stringify({
  status: 'PASS', blockedHeadSamplesBefore: blockedBefore, blockedHeadSamplesAfter: 0,
  routeSegments: route.length, floorCoverageSamples: coverageSamples, ...report
}, null, 2));
