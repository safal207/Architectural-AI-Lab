import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { applyLivingGlazingPresentation, LIVING_GLAZING_PANES } from '../src/three/glazingPresentation.js';

const output = process.env.QA_OUTPUT ?? 'qa-glazing-output';
await mkdir(output, { recursive: true });
const source = new THREE.MeshPhysicalMaterial({
  name: 'M3_SmokeArchitecturalGlass', color: 0x536269, transmission: 0.52,
  transparent: true, opacity: 0.82, roughness: 0.13, side: THREE.DoubleSide
});
const beforeSource = JSON.stringify(source.toJSON());
const root = new THREE.Group();
const geometry = new THREE.BoxGeometry(1, 3, 0.03);
const names = [...LIVING_GLAZING_PANES, 'master_glass_01', 'stair_glass_guard_v04_r2',
  'living_frame_01', 'pool_water', 'balcony_glass_r6_00', 'living_glass_07'];
for (const [i, name] of names.entries()) {
  const mesh = new THREE.Mesh(geometry, source);
  mesh.name = name; mesh.position.set(i * 1.2, 1.5, 0); mesh.castShadow = true; mesh.receiveShadow = true;
  root.add(mesh);
}
root.updateMatrixWorld(true);
const transforms = root.children.map(mesh => mesh.matrixWorld.toArray());
const report = applyLivingGlazingPresentation(THREE, root);
assert.deepEqual(report.applied, LIVING_GLAZING_PANES);
assert.equal(report.clonedMaterials, 1, 'Shared panes should reuse one cloned material');
const pane = root.getObjectByName('living_glass_01');
assert.notEqual(pane.material, source);
assert.equal(pane.material.transmission, 0);
assert.equal(pane.material.opacity, 0.10);
assert.equal(pane.material.transparent, true);
assert.equal(pane.material.depthWrite, false);
assert.equal(pane.material.depthTest, true);
assert.equal(pane.material.side, source.side, 'Sidedness was changed');
for (const mesh of root.children) {
  assert.equal(mesh.geometry, geometry); assert.equal(mesh.visible, true);
  if (LIVING_GLAZING_PANES.includes(mesh.name)) {
    assert.equal(mesh.material, pane.material); assert.equal(mesh.castShadow, false);
  } else {
    assert.equal(mesh.material, source, `Unrelated surface changed: ${mesh.name}`);
    assert.equal(mesh.castShadow, true); assert.equal(mesh.receiveShadow, true);
  }
}
root.updateMatrixWorld(true);
assert.deepEqual(root.children.map(mesh => mesh.matrixWorld.toArray()), transforms);
assert.equal(JSON.stringify(source.toJSON()), beforeSource, 'Shared exported material was mutated');
const material = pane.material;
assert.equal(applyLivingGlazingPresentation(THREE, root).clonedMaterials, 0);
assert.equal(pane.material, material, 'Repeated setup leaked another clone');
assert.equal(applyLivingGlazingPresentation(THREE, null).applied.length, 0);
const unknownRoot = new THREE.Group();
const unknown = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ name: 'FutureGlass' }));
unknown.name = 'living_glass_01'; unknownRoot.add(unknown);
assert.equal(applyLivingGlazingPresentation(THREE, unknownRoot).applied.length, 0);
assert.equal(unknown.material.name, 'FutureGlass');

// Inspect the real asset's material bindings independently of the synthetic tests.
const bytes = await readFile('public/villa.glb');
assert.equal(bytes.readUInt32LE(0), 0x46546c67);
const asset = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
const bindings = LIVING_GLAZING_PANES.map(name => {
  const node = asset.nodes.find(node => node.name === name);
  assert(node && Number.isInteger(node.mesh), `Real GLB is missing ${name}`);
  const materials = asset.meshes[node.mesh].primitives.map(p => asset.materials[p.material]);
  assert(materials.every(m => m.name === source.name), `Unexpected GLB material for ${name}`);
  return { name, materials: materials.map(m => ({ name: m.name, alphaMode: m.alphaMode,
    alpha: m.pbrMetallicRoughness.baseColorFactor[3], transmission: m.extensions?.KHR_materials_transmission?.transmissionFactor })) };
});
const result = { status: 'PASS', checks: [
  'Only six allowlisted living panes change; frames, bedroom, balcony, guard and water stay untouched',
  'Shared source material, geometry, transforms, sidedness and visibility preserved',
  'Depth testing retained; one reusable clone; repeated setup is idempotent',
  'Null roots and unknown materials are not modified',
  'Six actual GLB pane/material bindings verified'
], bindings, glbSha256: createHash('sha256').update(bytes).digest('hex') };
await writeFile(`${output}/materials.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
geometry.dispose(); source.dispose(); material.dispose(); unknown.material.dispose();
