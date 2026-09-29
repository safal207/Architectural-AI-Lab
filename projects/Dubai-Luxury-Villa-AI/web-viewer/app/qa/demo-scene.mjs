import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRouteGuard, createResidenceStoryboard, applyResidenceFrame, HOUSE_DEMO_STOPS } from '../src/residenceDemo.js';
import { createInteriorAccessories } from '../src/interiorAccessories.js';
import { preparePolyline } from '../src/demoTimeline.js';
import { buildWalkGraph } from '../src/walkthroughEngine.js';
import { applyStairPresentation } from '../src/three/stairPresentation.js';
import { applyPoolPresentation } from '../src/three/poolPresentation.js';

function cube(name, dimensions, position) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), new THREE.MeshStandardMaterial());
  object.name = name; object.position.set(...position); return object;
}
test('route guard detects a thin wall in either direction and leaves source materials alone', () => {
  const root = new THREE.Group();
  const wall = cube('closed_wall', [0.02, 3, 4], [0, 1.5, 0]); root.add(wall);
  const material = wall.material;
  const guard = createRouteGuard(root);
  assert.deepEqual(guard(preparePolyline([[-2, 1.6, 0], [2, 1.6, 0]])), ['closed_wall']);
  assert.deepEqual(guard(preparePolyline([[2, 1.6, 0], [-2, 1.6, 0]])), ['closed_wall']);
  assert.deepEqual(guard(preparePolyline([[-2, 1.6, 0], [-2, 1.6, 2]])), []);
  assert.equal(wall.material, material);
});
test('accessories are bounded instances with no new lights, and dispose only their own resources once', () => {
  const scene = new THREE.Scene(), root = new THREE.Group(); scene.add(root);
  root.add(cube('dining_table', [2.8, 0.15, 1.2], [0, 0.8, 0]));
  root.add(cube('master_bench_cushion_v04_r5', [2, 0.14, 0.6], [0, 4, 0]));
  root.rotation.y = Math.PI; root.updateMatrixWorld(true);
  const accessories = createInteriorAccessories(THREE, { scene, root });
  assert.equal(accessories.report.placeSettings, 4);
  assert.equal(accessories.report.foldedThrows, 1);
  assert.equal(accessories.report.batches, 5);
  assert.equal(accessories.report.additionalLights, 0);
  assert.ok(accessories.group.children.every(object => object.isInstancedMesh));
  let disposals = 0;
  const geometries = new Set(), materials = new Set();
  accessories.group.traverse(object => { if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); } });
  for (const resource of [...geometries, ...materials]) resource.addEventListener('dispose', () => { disposals += 1; });
  accessories.dispose(); accessories.dispose();
  assert.equal(disposals, geometries.size + materials.size);
  assert.equal(accessories.group.parent, null);
  assert.equal(root.children.length, 2);
  const mobile = createInteriorAccessories(THREE, { scene, root, quality: 'mobile' });
  assert.equal(mobile.report.placeSettings, 2); mobile.dispose();
});

/** Strip only material/image decoding from a private in-memory GLB copy; preserve all geometry and node transforms. */
async function geometryOnlyRoot(bytes) {
  const jsonSize = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonSize).toString('utf8').trim());
  json.materials = (json.materials ?? []).map(material => ({ name: material.name, doubleSided: material.doubleSided, alphaMode: material.alphaMode }));
  delete json.images; delete json.textures; delete json.samplers;
  const encoded = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 0x20); encoded.copy(padded);
  const chunks = bytes.subarray(20 + jsonSize);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length + chunks.length, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const input = Buffer.concat([header, padded, chunks]);
  const gltf = await new GLTFLoader().parseAsync(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength), '');
  return gltf.scene;
}

test('actual pinned GLB supplies all route anchors, furniture, finite poses and an above-roof closed orbit', async () => {
  const bytes = await readFile(new URL('../public/villa.glb', import.meta.url));
  const digest = createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest, '4f3e2868b532d1e3ea50e83aeb9a696e3c1f6484b38b2067db4973b57e66d115');
  const root = await geometryOnlyRoot(bytes);
  root.rotation.y = Math.PI; root.updateMatrixWorld(true);
  applyStairPresentation(root); applyPoolPresentation(THREE, root);
  root.updateMatrixWorld(true);
  const graph = buildWalkGraph(root);
  const board = createResidenceStoryboard({ root, graph });
  assert.deepEqual(board.report.routeStops, HOUSE_DEMO_STOPS);
  assert.ok(graph.edges.filter(edge => edge.type === 'stairs').length > 2, 'Actual stair steps must remain expanded');
  const camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.05, 500);
  for (let time = 0; time <= board.duration; time += 0.1) {
    applyResidenceFrame(camera, board, time);
    assert.ok([...camera.position.toArray(), ...camera.quaternion.toArray(), camera.fov].every(Number.isFinite));
    assert.ok(Math.abs(camera.quaternion.length() - 1) < 1e-6);
  }
  const firstOrbit = board.stages.find(stage => stage.kind === 'orbit');
  applyResidenceFrame(camera, board, firstOrbit.start);
  const initial = camera.position.clone();
  assert.ok(initial.y > board.report.aerial.roofMaxY + 4.99);
  applyResidenceFrame(camera, board, board.duration);
  assert.ok(initial.distanceTo(camera.position) < 1e-6, 'A full orbit must close without a positional seam');
  const scene = new THREE.Scene(); scene.add(root);
  const extras = createInteriorAccessories(THREE, { scene, root });
  assert.equal(extras.report.placeSettings, 4);
  assert.equal(extras.report.foldedThrows, 1);
  assert.ok(extras.report.batches <= 5);
  const report = { testedSha: process.env.GITHUB_SHA ?? null, assetSha256: digest,
    boundary: 'Geometry-only GLB copy for route and placement tests; not a rendering/performance result.',
    storyboard: board.report, accessories: extras.report };
  await mkdir('qa-output', { recursive: true });
  await writeFile('qa-output/demo-scene.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  extras.dispose();
});
