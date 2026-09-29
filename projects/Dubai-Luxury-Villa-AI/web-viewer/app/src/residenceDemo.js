import * as THREE from 'three';
import { TOUR_STOPS } from './tourData.js';
import { placeFirstPersonCamera } from './walkthroughEngine.js';
import { graphLeg, preparePolyline, samplePolyline } from './demoTimeline.js';

export const HOUSE_DEMO_STOPS = ['entry', 'living', 'dining', 'stair-ground', 'stair-upper', 'master', 'stair-upper', 'stair-ground', 'dining', 'living', 'pool'];
const INTERIOR = new Set(['entry', 'living', 'dining', 'stair-ground', 'stair-upper', 'master']);
const ease = t => t * t * (3 - 2 * t);

/** A bounded nine-ray presentation guard, not a navmesh or a human-clearance claim. */
export function createRouteGuard(root) {
  root.updateWorldMatrix(true, true);
  const solids = [];
  root.traverse(object => {
    if (!object.isMesh || !object.geometry || !object.material) return;
    for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return;
    solids.push({ object, box: new THREE.Box3().setFromObject(object) });
  });
  const ray = new THREE.Raycaster();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), direction = new THREE.Vector3();
  const right = new THREE.Vector3(), up = new THREE.Vector3(), offset = new THREE.Vector3();
  return path => {
    const blocked = new Set();
    for (let index = 1; index < path.points.length; index += 1) {
      a.fromArray(path.points[index - 1]); b.fromArray(path.points[index]);
      direction.subVectors(b, a);
      const distance = direction.length();
      if (distance < 1e-6) continue;
      direction.divideScalar(distance);
      right.crossVectors(direction, worldUp);
      if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
      right.normalize(); up.crossVectors(right, direction).normalize();
      const sweptBox = new THREE.Box3().setFromPoints([a, b]).expandByScalar(0.12);
      const candidates = solids.filter(solid => sweptBox.intersectsBox(solid.box)).map(solid => solid.object);
      if (!candidates.length) continue;
      for (const x of [-0.09, 0, 0.09]) for (const y of [-0.09, 0, 0.09]) {
        offset.copy(right).multiplyScalar(x).addScaledVector(up, y);
        // Bidirectional probes also see single-sided surfaces facing away from the first ray.
        for (const backwards of [false, true]) {
          ray.set((backwards ? b : a).clone().add(offset), direction.clone().multiplyScalar(backwards ? -1 : 1));
          ray.near = 0.001; ray.far = distance;
          const hit = ray.intersectObjects(candidates, false)[0];
          if (hit) blocked.add(hit.object.name || 'unnamed surface');
        }
      }
    }
    return [...blocked].sort();
  };
}

/** Use named architecture rather than the ground/landscape when framing the aerial circle. */
export function residenceEnvelope(root) {
  const box = new THREE.Box3();
  for (const name of ['living_room', 'master_bedroom', 'signature_timber_soffit']) {
    const object = root.getObjectByName(name);
    if (object) box.union(new THREE.Box3().setFromObject(object));
  }
  root.traverse(object => {
    if (object.isMesh && /wall|roof|facade|soffit|parapet/.test(object.name.toLowerCase())) {
      box.union(new THREE.Box3().setFromObject(object));
    }
  });
  if (box.isEmpty() || ![...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)) {
    throw new Error('The residence has no usable architectural bounds');
  }
  return box;
}

/** Build once on explicit Play, using the loaded model and its existing stair-expanded walk graph. */
export function createResidenceStoryboard({ root, graph, aspect = 16 / 9, mode = 'house' }) {
  if (!['house', 'orbit'].includes(mode)) throw new Error('Unknown demo mode');
  const stages = [];
  const chapters = [];
  const cuts = [];
  let duration = 0;
  const guard = createRouteGuard(root);
  const camera = new THREE.PerspectiveCamera(64, aspect, 0.05, 500);
  const poses = new Map();
  function pose(id) {
    if (!poses.has(id)) {
      camera.fov = 64;
      if (!placeFirstPersonCamera(camera, root, id, { presentation: false })) throw new Error(`Missing demo anchor: ${id}`);
      poses.set(id, { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov });
    }
    return poses.get(id);
  }
  function add(stage, chapter = false) {
    const next = { ...stage, start: duration, end: duration + stage.duration };
    stages.push(next);
    if (chapter) chapters.push({ title: stage.title, start: duration, stopId: stage.stopId });
    duration = next.end;
  }
  function hold(id, title, seconds = 1.8) {
    add({ kind: 'hold', stopId: id, title, duration: seconds, from: pose(id), to: pose(id) }, true);
  }
  function travel(path, from, to, title, stopId, seconds) {
    const blockedBy = guard(path);
    const cut = blockedBy.length > 0;
    if (cut) cuts.push({ title, blockedBy });
    add({ kind: cut ? 'cut' : 'travel', stopId, title, duration: cut ? 1.6 : seconds, path, from, to, blockedBy });
  }
  if (mode === 'house') {
    hold('entry', 'Arrival · Main entry', 2);
    for (let index = 1; index < HOUSE_DEMO_STOPS.length; index += 1) {
      const from = HOUSE_DEMO_STOPS[index - 1], to = HOUSE_DEMO_STOPS[index];
      const path = graphLeg(graph, from, to);
      const stop = TOUR_STOPS.find(item => item.id === to);
      const returning = index > 5 && to !== 'pool';
      const title = `${returning ? 'Return · ' : ''}${stop.title}`;
      travel(path, pose(from), pose(to), title, to, THREE.MathUtils.clamp(path.length / 1.25, 2.5, 7));
      hold(to, title, returning ? 0.65 : 1.8);
    }
  }

  const envelope = residenceEnvelope(root);
  const center = envelope.getCenter(new THREE.Vector3());
  const size = envelope.getSize(new THREE.Vector3());
  const pool = pose('pool');
  const direction = new THREE.Vector3(...pool.position).sub(center); direction.y = 0;
  if (direction.lengthSq() < 0.01) direction.set(0, 0, 1);
  direction.normalize();
  const radius = Math.max(10, Math.hypot(size.x, size.z) / 2 + 4);
  const height = envelope.max.y + 5;
  const angle = Math.atan2(direction.z, direction.x);
  const launch = center.clone().addScaledVector(direction, radius); launch.y = pool.position[1];
  const air = launch.clone(); air.y = height;
  const target = center.toArray();
  function aerialPose(position) {
    camera.position.copy(position); camera.lookAt(center);
    return { position: position.toArray(), quaternion: camera.quaternion.toArray(), fov: aspect < 1 ? 72 : 60 };
  }
  const launchPose = aerialPose(launch), airPose = aerialPose(air);
  if (mode === 'house') {
    travel(preparePolyline([pool.position, launch.toArray()]), pool, launchPose, 'Beyond the terrace', 'pool', 5);
    travel(preparePolyline([launch.toArray(), air.toArray()]), launchPose, airPose, 'Drone · Lift above the roof', 'overview', 5);
  }
  // Four continuous arcs expose useful still frames to reduced-motion users and chapter navigation.
  for (let quarter = 0; quarter < 4; quarter += 1) {
    add({ kind: 'orbit', stopId: 'overview', title: `Drone orbit · ${quarter * 90}–${(quarter + 1) * 90}°`,
      duration: 7, center: target, radius, height, angle: angle + quarter * Math.PI / 2,
      sweep: Math.PI / 2, from: airPose, to: airPose }, true);
  }
  return { stages, chapters, duration, report: { profile: 'house-drone-demo-v1', mode,
    routeStops: mode === 'house' ? [...HOUSE_DEMO_STOPS] : [], duration, cuts,
    guard: 'nine bidirectional rays per segment; not collision completeness',
    aerial: { radius, height, roofMaxY: envelope.max.y, center: target },
    modelReloads: 0, additionalLights: 0 } };
}

/** Deterministic position/orientation sampling; graph legs remain piecewise linear by design. */
export function applyResidenceFrame(camera, storyboard, seconds) {
  const time = THREE.MathUtils.clamp(seconds, 0, storyboard.duration);
  const stage = storyboard.stages.find(item => time < item.end) ?? storyboard.stages.at(-1);
  const t = THREE.MathUtils.clamp((time - stage.start) / stage.duration, 0, 1);
  let shade = 0;
  if (stage.kind === 'orbit') {
    const angle = stage.angle + stage.sweep * t;
    camera.position.set(stage.center[0] + Math.cos(angle) * stage.radius, stage.height,
      stage.center[2] + Math.sin(angle) * stage.radius);
    camera.lookAt(new THREE.Vector3(...stage.center));
    camera.fov = camera.aspect < 1 ? 72 : 60;
  } else {
    const fraction = stage.kind === 'cut' ? (t < 0.5 ? 0 : 1) : stage.kind === 'hold' ? 1 : ease(t);
    camera.position.fromArray(stage.kind === 'travel' ? samplePolyline(stage.path, fraction)
      : fraction < 0.5 ? stage.from.position : stage.to.position);
    camera.quaternion.slerpQuaternions(new THREE.Quaternion(...stage.from.quaternion), new THREE.Quaternion(...stage.to.quaternion), fraction);
    camera.fov = THREE.MathUtils.lerp(stage.from.fov, stage.to.fov, fraction);
    if (stage.kind === 'cut') shade = t < 0.35 ? ease(t / 0.35) : t > 0.65 ? ease((1 - t) / 0.35) : 1;
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  let chapter = 0;
  for (let i = 0; i < storyboard.chapters.length; i += 1) if (storyboard.chapters[i].start <= time) chapter = i;
  return { seconds: time, duration: storyboard.duration, title: stage.title, stopId: stage.stopId,
    interior: INTERIOR.has(stage.stopId), chapter, chapters: storyboard.chapters.length,
    cut: stage.kind === 'cut', shade };
}
