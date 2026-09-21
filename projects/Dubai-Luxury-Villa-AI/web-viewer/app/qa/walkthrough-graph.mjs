import * as THREE from 'three';
import { buildWalkGraph, constrainToWalkGraph, placeFirstPersonCamera, resolveTourFov, updateTourCameraProjection } from '../src/walkthroughEngine.js';

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function anchor(root, name, x, y, z) {
  const node = new THREE.Object3D();
  node.name = name;
  node.position.set(x, y, z);
  root.add(node);
  return node;
}

const root = new THREE.Group();
anchor(root, 'tour_entry', 0, 1.65, 0);
anchor(root, 'tour_living', 4, 1.65, 0);
anchor(root, 'tour_dining', 8, 1.65, 0);
anchor(root, 'tour_stair_ground', 10, 1.65, 0);
anchor(root, 'tour_stair_upper', 14, 5.15, 0);
anchor(root, 'tour_master', 18, 5.15, 0);
anchor(root, 'tour_pool', 4, 1.65, 6);
root.updateMatrixWorld(true);

const graph = buildWalkGraph(root);
check(graph.edges.length === 6, `Expected 6 walkthrough edges, got ${graph.edges.length}`);

const stairEdge = graph.edges.find((edge) => edge.type === 'stairs');
check(stairEdge, 'Stair edge is missing');

const nearStairs = new THREE.Vector3(12, 1.65, 0.4);
const stairResult = constrainToWalkGraph(nearStairs, graph, stairEdge.id);
check(stairResult.edge?.type === 'stairs', 'Candidate did not remain on stair edge');
check(stairResult.position.y > 2.5 && stairResult.position.y < 4.5, `Stair Y interpolation failed: ${stairResult.position.y}`);

const outsideLiving = new THREE.Vector3(2, 1.65, 8);
const bounded = constrainToWalkGraph(outsideLiving, graph, null);
check(bounded.position.distanceTo(outsideLiving) > 1, 'Walk constraint did not pull an out-of-route candidate back to the route');

console.log(JSON.stringify({
  status: 'PASS',
  edges: graph.edges.map(({ from, to, type }) => ({ from, to, type })),
  stairY: stairResult.position.y
}, null, 2));

// Routes may overlap in plan but occupy different floors. A sideways ground
// move must not jump to a stair halfway up, with or without a previous edge.
const crossingGraph = { edges: [
  { id: 'ground', a: new THREE.Vector3(0, 1.65, 0), b: new THREE.Vector3(8, 1.65, 0), radius: 1.7, type: 'room' },
  { id: 'stair-lower', a: new THREE.Vector3(0, 1.65, 0), b: new THREE.Vector3(0, 2.65, 2), radius: 0.72, type: 'stairs' },
  { id: 'stair-middle', a: new THREE.Vector3(0, 2.65, 2), b: new THREE.Vector3(4, 4.65, 2), radius: 0.72, type: 'stairs' },
  { id: 'landing', a: new THREE.Vector3(4, 4.65, 2), b: new THREE.Vector3(8, 4.65, 2), radius: 1.25, type: 'door' }
] };
for (const previousEdge of ['ground', null]) {
  const result = constrainToWalkGraph(new THREE.Vector3(4, 1.65, 1.6), crossingGraph, previousEdge);
  check(result.edge.id === 'ground', 'Ground-floor movement jumped to a stair segment');
  check(result.position.y === 1.65, 'Ground-floor movement changed floor');
}

// Reconstruct just node transforms and stair bounding geometry from the shipped
// GLB, without textures or a renderer. Test every authored stair segment both
// ways using small real movement steps, rather than teleporting between stops.
const { readFileSync } = await import('node:fs');
const glb = readFileSync(new URL('../public/villa.glb', import.meta.url));
const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
const authoredNodes = gltf.nodes.map((node) => {
  let object = new THREE.Object3D();
  if (/^stair_step_v04_\d+$/.test(node.name)) {
    const primitive = gltf.meshes[node.mesh].primitives[0];
    const bounds = gltf.accessors[primitive.attributes.POSITION];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...bounds.min, ...bounds.max], 3));
    object = new THREE.Mesh(geometry);
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
for (let index = 0; index < gltf.nodes.length; index += 1) {
  for (const child of gltf.nodes[index].children ?? []) authoredNodes[index].add(authoredNodes[child]);
}
const authoredRoot = new THREE.Group();
for (const index of gltf.scenes[gltf.scene ?? 0].nodes) authoredRoot.add(authoredNodes[index]);
authoredRoot.rotation.y = Math.PI;
authoredRoot.updateMatrixWorld(true);
const authoredGraph = buildWalkGraph(authoredRoot);
const stairs = authoredGraph.edges.filter((edge) => edge.type === 'stairs');
check(stairs.length > 2, 'Shipped GLB must contain authored stair segments');
for (const descending of [false, true]) {
  const route = descending ? [...stairs].reverse() : stairs;
  let position = (descending ? route[0].b : route[0].a).clone();
  let preferred = null;
  let maximumHeightStep = 0;
  for (const edge of route) {
    const from = descending ? edge.b : edge.a;
    const to = descending ? edge.a : edge.b;
    const count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.08));
    for (let step = 1; step <= count; step += 1) {
      const desired = from.clone().lerp(to, step / count);
      desired.y = position.y;
      const result = constrainToWalkGraph(desired, authoredGraph, preferred);
      maximumHeightStep = Math.max(maximumHeightStep, Math.abs(result.position.y - position.y));
      position = result.position;
      preferred = result.edge.id;
    }
  }
  const destination = descending ? stairs[0].a : stairs.at(-1).b;
  check(position.distanceTo(destination) < 0.12, `${descending ? 'Descent' : 'Ascent'} did not reach its authored endpoint`);
  check(maximumHeightStep < 0.25, `Stair traversal snapped by ${maximumHeightStep} metres`);
}
console.log(JSON.stringify({ status: 'PASS', continuity: 'ground floor, initial floor, GLB ascent and descent', stairSegments: stairs.length }));
const { TOUR_STOPS } = await import('../src/tourData.js');
const poolStop = TOUR_STOPS.find((stop) => stop.id === 'pool');
const authoredAspect = 16 / 9;
const authoredFov = poolStop.presentationFov;
const horizontalCoverage = (fov, aspect) => Math.tan(THREE.MathUtils.degToRad(fov) / 2) * aspect;
const authoredCoverage = horizontalCoverage(authoredFov, authoredAspect);
for (const aspect of [authoredAspect, 740 / 498, 9 / 16]) {
  const fittedFov = resolveTourFov(poolStop, aspect);
  check(Math.abs(horizontalCoverage(fittedFov, aspect) - authoredCoverage) < 1e-10,
    `Pool composition cropped at aspect ${aspect}`);
  check(resolveTourFov(poolStop, aspect, { presentation: false }) === poolStop.firstPersonFov,
    'Explore FOV changed with presentation aspect');
}
check(resolveTourFov(poolStop, 21 / 9) === authoredFov, 'Wider canvas should retain authored vertical FOV');
for (const aspect of [0, NaN, Infinity]) {
  check(resolveTourFov(poolStop, aspect) === authoredFov, 'Invalid layout must retain a finite authored FOV');
}
for (const stop of TOUR_STOPS.filter((item) => item.id !== 'pool')) {
  check(resolveTourFov(stop, 9 / 16) === (stop.presentationFov ?? stop.firstPersonFov),
    `Unexpected framing change for ${stop.id}`);
}
const presentationCamera = new THREE.PerspectiveCamera(64, authoredAspect, 0.1, 1000);
check(placeFirstPersonCamera(presentationCamera, authoredRoot, 'pool'), 'Pool presentation camera failed');
const presentationPosition = presentationCamera.position.clone();
const presentationRotation = presentationCamera.quaternion.clone();
for (const aspect of [740 / 498, 9 / 16, authoredAspect]) {
  presentationCamera.aspect = aspect;
  updateTourCameraProjection(presentationCamera, poolStop);
  check(presentationCamera.position.equals(presentationPosition), 'Resize moved the authored camera');
  check(presentationCamera.quaternion.equals(presentationRotation), 'Resize turned the authored camera');
  check(Math.abs(presentationCamera.fov - resolveTourFov(poolStop, aspect)) < 1e-10,
    'Resize did not refresh presentation FOV');
}
console.log(JSON.stringify({ status: 'PASS', framing: '16:9, narrow landscape, portrait, ultrawide, resize pose and Explore isolation' }));