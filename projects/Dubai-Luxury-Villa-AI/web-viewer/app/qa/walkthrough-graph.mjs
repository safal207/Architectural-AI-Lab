import * as THREE from 'three';
import { buildWalkGraph, constrainToWalkGraph } from '../src/walkthroughEngine.js';

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
