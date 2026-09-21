import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
const rootUrl = new URL('../', import.meta.url);
const study = JSON.parse(readFileSync(new URL('data/design-study.json', rootUrl)));
const hash = data => createHash('sha256').update(data).digest('hex');
for (const [path, expected] of Object.entries(study.sources)) {
  const bytes = readFileSync(new URL(path, rootUrl));
  assert.equal(hash(path.endsWith('.glb') ? bytes : bytes.toString('utf8').replace(/\r\n/g, '\n')), expected, `${path}: regenerate the model-derived study`);
}
for (const [gesture, image] of Object.entries(study.images)) {
  const bytes = readFileSync(new URL('public/' + image.path, rootUrl));
  assert.equal(hash(bytes), image.sha256, `${gesture}: illustration differs from its generation receipt`);
  assert.equal(bytes.length, image.bytes);
  assert(bytes.length < 100000, 'Each static study should remain below 100 kB');
}
// Independently reconstruct source-node bounds from the shipped GLB metadata.
// This catches manual placement of the callouts or accidental axis mirroring.
const glb=readFileSync(new URL('public/villa.glb',rootUrl));
const gltf=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));
const nodes=gltf.nodes.map(node=>{
  const object=new THREE.Object3D();object.name=node.name;
  if(node.matrix){object.matrix.fromArray(node.matrix);object.matrix.decompose(object.position,object.quaternion,object.scale);}
  else {if(node.translation)object.position.fromArray(node.translation);if(node.rotation)object.quaternion.fromArray(node.rotation);if(node.scale)object.scale.fromArray(node.scale);}
  return object;
});
gltf.nodes.forEach((node,index)=>(node.children??[]).forEach(child=>nodes[index].add(nodes[child])));
const root=new THREE.Group();root.rotation.y=Math.PI;
gltf.scenes[gltf.scene??0].nodes.forEach(index=>root.add(nodes[index]));root.updateMatrixWorld(true);
const c=study.camera,camera=new THREE.OrthographicCamera(c.left,c.right,c.top,c.bottom,c.near,c.far);
camera.position.fromArray(c.position);camera.quaternion.fromArray(c.quaternion);camera.updateMatrixWorld(true);
const close=(a,b,message)=>assert(new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b))<1e-5,message);
for(const [gesture,landmark] of Object.entries(study.landmarks)){
  const index=gltf.nodes.findIndex(node=>node.name===landmark.mesh);
  assert(index>=0, `${gesture}: anchor mesh is missing`);
  const bounds=new THREE.Box3();
  for(const primitive of gltf.meshes[gltf.nodes[index].mesh].primitives){
    const accessor=gltf.accessors[primitive.attributes.POSITION];
    bounds.union(new THREE.Box3(new THREE.Vector3(...accessor.min),new THREE.Vector3(...accessor.max)).applyMatrix4(nodes[index].matrixWorld));
  }
  close(bounds.min.toArray(),landmark.bounds.min,`${gesture}: minimum bounds`);
  close(bounds.max.toArray(),landmark.bounds.max,`${gesture}: maximum bounds`);
  const anchor=bounds.getCenter(new THREE.Vector3());
  if(gesture==='edges'){anchor.y=bounds.max.y;anchor.z=bounds.max.z;}
  close(anchor.toArray(),landmark.world,`${gesture}: anchor moved from actual mesh`);
  const projected=anchor.project(camera);
  assert(Math.hypot((projected.x+1)*360-landmark.svg[0],(1-projected.y)*240-landmark.svg[1])<1e-5,`${gesture}: projection mismatch`);
}
assert(study.landmarks.pool.bounds.min[2]>study.landmarks.thresholds.bounds.max[2], 'Pool must remain in front of the living glazing');
assert(study.landmarks.timber.svg[0]<study.landmarks.thresholds.svg[0], 'Facade fins must remain left of central glazing in this view');
assert(!study.includedMeshes.includes('kitchen_island_v04'), 'Exterior diagram must not imply a kitchen island on the front facade');
assert(!study.includedMeshes.some(name=>name.startsWith('upper_spine_joint_')), 'Repaired orphan trim must stay omitted');
for(const [gesture,names] of Object.entries(study.highlightedMeshes)){
  assert(names.length>0,`${gesture}: empty highlight`);
  for(const name of names)assert(study.includedMeshes.includes(name),`${gesture}: highlight references an omitted mesh`);
}
console.log('PASS: source hashes, image receipts, actual GLB bounds and projected anchors; pool/glazing relationship and facade orientation match the current model');
