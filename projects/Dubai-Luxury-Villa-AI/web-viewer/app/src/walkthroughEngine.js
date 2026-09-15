import * as THREE from 'three';
import { TOUR_STOPS } from './tourData';
import { WALKTHROUGH_EDGES, WALKTHROUGH_PLAYER } from './navigationData';

const ROOM_NODE_NAMES = {
  'living-room': 'living_room',
  'master-bedroom': 'master_bedroom',
  'pool-terrace': 'pool_terrace'
};

export function findTourNode(root, stop) {
  if (!root || !stop) return null;
  if (stop.nodeName) {
    const authored = root.getObjectByName(stop.nodeName);
    if (authored) return authored;
  }
  if (stop.fallbackNodeName) {
    const fallback = root.getObjectByName(stop.fallbackNodeName);
    if (fallback) return fallback;
  }
  if (stop.roomId) {
    const roomName = ROOM_NODE_NAMES[stop.roomId];
    if (roomName) return root.getObjectByName(roomName);
  }
  return null;
}

function findFallbackLookTarget(root, stop, position) {
  const index = TOUR_STOPS.findIndex((item) => item.id === stop.id);
  for (let offset = 1; offset < TOUR_STOPS.length; offset += 1) {
    const candidate = TOUR_STOPS[(index + offset) % TOUR_STOPS.length];
    const candidateNode = findTourNode(root, candidate);
    if (!candidateNode) continue;
    const target = new THREE.Vector3();
    candidateNode.getWorldPosition(target);
    if (target.distanceTo(position) > 0.25) return target;
  }
  return null;
}

export function placeFirstPersonCamera(camera, root, activeStopId) {
  const stop = TOUR_STOPS.find((item) => item.id === activeStopId);
  const node = findTourNode(root, stop);
  if (!stop || !node) return false;

  const position = new THREE.Vector3();
  node.getWorldPosition(position);
  camera.position.copy(position);

  let target = null;
  if (stop.targetNodeName) {
    const targetNode = root.getObjectByName(stop.targetNodeName);
    if (targetNode) {
      target = new THREE.Vector3();
      targetNode.getWorldPosition(target);
    }
  }

  if (!target) target = findFallbackLookTarget(root, stop, position);
  if (!target) target = position.clone().add(new THREE.Vector3(0, 0, -4));
  target.y = Math.max(target.y, position.y - 0.55);
  camera.lookAt(target);
  return true;
}

export function buildWalkGraph(root) {
  const stopPoints = new Map();

  TOUR_STOPS.forEach((stop) => {
    if (stop.id === 'overview') return;
    const node = findTourNode(root, stop);
    if (!node) return;
    const position = new THREE.Vector3();
    node.getWorldPosition(position);
    stopPoints.set(stop.id, { stop, position });
  });

  const edges = WALKTHROUGH_EDGES.flatMap((edge, index) => {
    const from = stopPoints.get(edge.from);
    const to = stopPoints.get(edge.to);
    if (!from || !to) return [];
    return [{
      ...edge,
      id: `${edge.from}:${edge.to}:${index}`,
      a: from.position.clone(),
      b: to.position.clone()
    }];
  });

  return { stopPoints, edges };
}

function closestPointOnWalkEdge(point, edge, target) {
  const ax = edge.a.x;
  const az = edge.a.z;
  const bx = edge.b.x;
  const bz = edge.b.z;
  const dx = bx - ax;
  const dz = bz - az;
  const denominator = dx * dx + dz * dz;
  const t = denominator > 1e-6
    ? THREE.MathUtils.clamp(((point.x - ax) * dx + (point.z - az) * dz) / denominator, 0, 1)
    : 0;

  target.set(
    THREE.MathUtils.lerp(edge.a.x, edge.b.x, t),
    THREE.MathUtils.lerp(edge.a.y, edge.b.y, t),
    THREE.MathUtils.lerp(edge.a.z, edge.b.z, t)
  );
}

export function constrainToWalkGraph(candidate, graph, preferredEdgeId) {
  if (!graph?.edges?.length) return { position: candidate, edge: null };

  let best = null;
  const closest = new THREE.Vector3();
  const orderedEdges = preferredEdgeId
    ? [
        ...graph.edges.filter((edge) => edge.id === preferredEdgeId),
        ...graph.edges.filter((edge) => edge.id !== preferredEdgeId)
      ]
    : graph.edges;

  orderedEdges.forEach((edge) => {
    closestPointOnWalkEdge(candidate, edge, closest);
    const horizontalDistance = Math.hypot(candidate.x - closest.x, candidate.z - closest.z);
    const floorPenalty = edge.type === 'stairs' ? 0 : Math.abs(candidate.y - closest.y) * 3.5;
    const score = horizontalDistance + floorPenalty;
    if (!best || score < best.score) {
      best = {
        edge,
        closest: closest.clone(),
        horizontalDistance,
        score
      };
    }
  });

  if (!best) return { position: candidate, edge: null };

  const radius = best.edge.radius ?? WALKTHROUGH_PLAYER.corridorRadius;
  const constrained = candidate.clone();
  constrained.y = best.closest.y;

  if (best.horizontalDistance > radius) {
    const offsetX = candidate.x - best.closest.x;
    const offsetZ = candidate.z - best.closest.z;
    const length = Math.max(Math.hypot(offsetX, offsetZ), 1e-6);
    constrained.x = best.closest.x + (offsetX / length) * radius;
    constrained.z = best.closest.z + (offsetZ / length) * radius;
  }

  return { position: constrained, edge: best.edge };
}

export function nearestTourStop(graph, position) {
  if (!graph?.stopPoints?.size) return null;
  let nearest = null;
  graph.stopPoints.forEach(({ stop, position: stopPosition }) => {
    const distance = stopPosition.distanceTo(position);
    if (!nearest || distance < nearest.distance) nearest = { stop, distance };
  });
  return nearest?.stop ?? null;
}
