import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createScene } from './three/scene';
import { createCamera } from './three/camera';
import { createRenderer } from './three/renderer';
import { createLights } from './three/lights';
import { TOUR_STOPS } from './tourData';
import { WALKTHROUGH_EDGES, WALKTHROUGH_PLAYER } from './navigationData';

const ROOM_NODE_NAMES = {
  'living-room': 'living_room',
  'master-bedroom': 'master_bedroom',
  'pool-terrace': 'pool_terrace'
};

const SWITCHABLE_ARCHITECTURAL_MATERIALS = new Set([
  'M4_OrganicWarmLimestone',
  'M3_IvoryPlaster',
  'M2_WalnutTimber',
  'M3_DeckStone'
]);

function buildFallbackMassing(scene, accentColor) {
  const group = new THREE.Group();
  group.name = 'fallback_massing';
  scene.add(group);

  const baseMaterial = new THREE.MeshStandardMaterial({ color: '#ece8df', roughness: 0.5 });
  const upperMaterial = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.42 });

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.35, 15),
    new THREE.MeshStandardMaterial({ color: '#b7aa8d', roughness: 0.85 })
  );
  ground.position.y = -0.2;
  group.add(ground);

  const lower = new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 7.2), baseMaterial);
  lower.position.set(-1.4, 1.6, 0);
  group.add(lower);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(7.3, 2.8, 5.5), upperMaterial);
  upper.position.set(1.3, 4.6, -0.4);
  group.add(upper);

  const pool = new THREE.Mesh(
    new THREE.BoxGeometry(8.2, 0.18, 3.3),
    new THREE.MeshStandardMaterial({ color: '#3bbbc9', roughness: 0.18 })
  );
  pool.position.set(-2.2, 0.05, 5.1);
  group.add(pool);

  group.rotation.y = -0.28;
  return group;
}

function applyMaterialConcept(root, selectedMaterial) {
  if (!root || !selectedMaterial?.swatch) return;

  root.traverse((object) => {
    if (!object.isMesh || !object.material) return;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const nextMaterials = materials.map((source) => {
      if (!SWITCHABLE_ARCHITECTURAL_MATERIALS.has(source.name)) return source;

      const cloned = source.clone();
      cloned.color = new THREE.Color(selectedMaterial.swatch);
      return cloned;
    });

    object.material = nextMaterials.length === 1 ? nextMaterials[0] : nextMaterials;
  });
}

function disposeObject(root) {
  root?.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material?.dispose?.());
  });
}

function findTourNode(root, stop) {
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

function placeFirstPersonCamera(camera, root, activeStopId) {
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

function buildWalkGraph(root) {
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
  return t;
}

function constrainToWalkGraph(candidate, graph, preferredEdgeId) {
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

function nearestTourStop(graph, position) {
  if (!graph?.stopPoints?.size) return null;
  let nearest = null;
  graph.stopPoints.forEach(({ stop, position: stopPosition }) => {
    const distance = stopPosition.distanceTo(position);
    if (!nearest || distance < nearest.distance) nearest = { stop, distance };
  });
  return nearest?.stop ?? null;
}

export default function VillaViewer({
  selectedRoom,
  lightingMode,
  material,
  tourMode = false,
  activeTourStopId = 'overview'
}) {
  const mountRef = useRef(null);
  const mobileMotionRef = useRef({ forward: 0, right: 0 });
  const [modelState, setModelState] = useState('loading');
  const [firstPersonReady, setFirstPersonReady] = useState(false);
  const [walkGraphReady, setWalkGraphReady] = useState(false);
  const [walkStatus, setWalkStatus] = useState({ label: 'Tour anchor', floor: null, edgeType: null });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    let disposed = false;
    let villaRoot = null;
    let frameId = null;
    let orbitControls = null;
    let firstPersonControls = null;
    let walkGraph = null;
    let currentWalkEdgeId = null;
    let lastFrameTime = performance.now();
    let statusTimer = 0;
    const keys = new Set();
    const touchLook = { active: false, pointerId: null, x: 0, y: 0 };
    const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches ?? false;

    setModelState('loading');
    setFirstPersonReady(false);
    setWalkGraphReady(false);

    const scene = createScene(THREE);
    scene.background = new THREE.Color(lightingMode?.name === 'Night' ? '#08111c' : '#dfe8ee');

    const camera = createCamera(THREE);
    camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    camera.updateProjectionMatrix();
    camera.position.set(18, 12, 20);

    const renderer = createRenderer(THREE, container);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(scene.background);
    renderer.domElement.style.touchAction = 'none';

    const { ambient, sun } = createLights(THREE, scene);
    const intensity = lightingMode?.intensity ?? 1;
    ambient.intensity = 0.75 * intensity + 0.18;
    sun.intensity = 2.1 * intensity;

    if (tourMode && activeTourStopId !== 'overview' && !isTouchDevice) {
      firstPersonControls = new PointerLockControls(camera, renderer.domElement);
    } else if (!(tourMode && activeTourStopId !== 'overview')) {
      orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.target.set(0, 2.8, 0);
      orbitControls.minDistance = 8;
      orbitControls.maxDistance = 60;
    }

    const loader = new GLTFLoader();
    const modelUrl = `${import.meta.env.BASE_URL}villa.glb`;

    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;

        villaRoot = gltf.scene;
        villaRoot.name = 'dubai_luxury_villa_active';
        villaRoot.rotation.y = Math.PI;

        villaRoot.traverse((object) => {
          if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });

        applyMaterialConcept(villaRoot, material);
        scene.add(villaRoot);
        villaRoot.updateMatrixWorld(true);
        walkGraph = buildWalkGraph(villaRoot);
        setWalkGraphReady(walkGraph.edges.length >= 4);

        let tourPlaced = false;
        if (tourMode && activeTourStopId !== 'overview') {
          tourPlaced = placeFirstPersonCamera(camera, villaRoot, activeTourStopId);
          if (tourPlaced && isTouchDevice) camera.rotation.order = 'YXZ';
          setFirstPersonReady(tourPlaced);
          const nearest = nearestTourStop(walkGraph, camera.position);
          if (nearest) {
            setWalkStatus({
              label: nearest.title,
              floor: nearest.floor,
              edgeType: null
            });
          }
        }

        if (!tourPlaced && orbitControls) {
          const roomNodeName = ROOM_NODE_NAMES[selectedRoom?.id];
          const roomNode = roomNodeName ? villaRoot.getObjectByName(roomNodeName) : null;
          if (roomNode) {
            const target = new THREE.Vector3();
            roomNode.getWorldPosition(target);
            orbitControls.target.copy(target);
          }
        }

        setModelState('loaded');
      },
      undefined,
      (error) => {
        if (disposed) return;
        console.warn('villa.glb failed to load; using fallback massing', error);
        villaRoot = buildFallbackMassing(scene, material?.swatch ?? '#d8c8ad');
        setModelState('fallback');
      }
    );

    const keyDown = (event) => {
      if (!tourMode) return;
      keys.add(event.code);
    };

    const keyUp = (event) => {
      keys.delete(event.code);
    };

    const lockFirstPerson = () => {
      if (firstPersonControls && villaRoot) firstPersonControls.lock();
    };

    const pointerDown = (event) => {
      if (!isTouchDevice || !tourMode || activeTourStopId === 'overview') return;
      touchLook.active = true;
      touchLook.pointerId = event.pointerId;
      touchLook.x = event.clientX;
      touchLook.y = event.clientY;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };

    const pointerMove = (event) => {
      if (!touchLook.active || touchLook.pointerId !== event.pointerId) return;
      const dx = event.clientX - touchLook.x;
      const dy = event.clientY - touchLook.y;
      touchLook.x = event.clientX;
      touchLook.y = event.clientY;
      camera.rotation.y -= dx * WALKTHROUGH_PLAYER.touchTurnSpeed;
      camera.rotation.x = THREE.MathUtils.clamp(
        camera.rotation.x - dy * WALKTHROUGH_PLAYER.touchTurnSpeed,
        -Math.PI * 0.42,
        Math.PI * 0.42
      );
    };

    const pointerUp = (event) => {
      if (touchLook.pointerId !== event.pointerId) return;
      touchLook.active = false;
      touchLook.pointerId = null;
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    renderer.domElement.addEventListener('click', lockFirstPerson);
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('pointercancel', pointerUp);

    const resize = () => {
      const width = container.clientWidth;
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', resize);
    resize();

    const animate = (now = performance.now()) => {
      frameId = requestAnimationFrame(animate);
      const delta = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;

      if (orbitControls) orbitControls.update();

      const desktopCanWalk = firstPersonControls?.isLocked;
      const touchCanWalk = isTouchDevice && tourMode && activeTourStopId !== 'overview' && firstPersonReady;

      if (desktopCanWalk || touchCanWalk) {
        const keyboardForward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
          - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
        const keyboardRight = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
          - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
        const forwardInput = keyboardForward + mobileMotionRef.current.forward;
        const rightInput = keyboardRight + mobileMotionRef.current.right;

        if (forwardInput !== 0 || rightInput !== 0) {
          const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
          const speed = sprint ? WALKTHROUGH_PLAYER.sprintSpeed : WALKTHROUGH_PLAYER.walkSpeed;
          const forward = new THREE.Vector3();
          camera.getWorldDirection(forward);
          forward.y = 0;
          if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
          forward.normalize();
          const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
          const desired = camera.position.clone()
            .addScaledVector(forward, forwardInput * speed * delta)
            .addScaledVector(right, rightInput * speed * delta);

          const constrained = constrainToWalkGraph(desired, walkGraph, currentWalkEdgeId);
          camera.position.copy(constrained.position);
          currentWalkEdgeId = constrained.edge?.id ?? currentWalkEdgeId;
        }

        statusTimer += delta;
        if (statusTimer >= 0.25) {
          statusTimer = 0;
          const nearest = nearestTourStop(walkGraph, camera.position);
          const currentEdge = walkGraph?.edges?.find((edge) => edge.id === currentWalkEdgeId) ?? null;
          if (nearest) {
            setWalkStatus((previous) => {
              const next = {
                label: nearest.title,
                floor: nearest.floor,
                edgeType: currentEdge?.type ?? null
              };
              return previous.label === next.label
                && previous.floor === next.floor
                && previous.edgeType === next.edgeType
                ? previous
                : next;
            });
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      renderer.domElement.removeEventListener('click', lockFirstPerson);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', pointerUp);
      orbitControls?.dispose();
      firstPersonControls?.unlock();
      firstPersonControls?.dispose();
      if (villaRoot) {
        scene.remove(villaRoot);
        disposeObject(villaRoot);
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [selectedRoom, lightingMode, material, tourMode, activeTourStopId, firstPersonReady]);

  const activeStop = TOUR_STOPS.find((stop) => stop.id === activeTourStopId) ?? TOUR_STOPS[0];
  const isFirstPerson = tourMode && activeTourStopId !== 'overview';

  const setMobileMotion = (axis, value) => {
    mobileMotionRef.current = {
      ...mobileMotionRef.current,
      [axis]: value
    };
  };

  return (
    <section>
      <div className="viewer-heading">
        <div>
          <p className="eyebrow">Native Blender GLB · bounded first-person walkthrough</p>
          <h2>{isFirstPerson ? `First-person · ${activeStop.title}` : '3D Villa Viewer'}</h2>
        </div>
        <p>
          {isFirstPerson
            ? 'Desktop: click view + WASD · Shift sprint · Esc release. Touch: drag to look + use movement pad.'
            : 'Drag to orbit · scroll to zoom · select a room or tour point to change focus'}
        </p>
      </div>
      <div className="three-canvas-shell">
        <div
          ref={mountRef}
          className="three-canvas"
          data-model-state={modelState}
          data-view-mode={isFirstPerson ? 'first-person' : 'orbit'}
          data-tour-stop={activeTourStopId}
          data-walk-graph={walkGraphReady ? 'ready' : 'fallback'}
          aria-label="Interactive Dubai luxury villa virtual tour prototype"
        />
        {isFirstPerson && (
          <>
            <div className="first-person-hud" aria-live="polite">
              <strong>{walkStatus.label || activeStop.title}</strong>
              <span>
                {walkStatus.floor ? `Floor ${walkStatus.floor}` : 'Site'}
                {walkStatus.edgeType ? ` · ${walkStatus.edgeType}` : ''}
                {' · '}
                {walkGraphReady ? 'bounded walk route' : 'anchor fallback'}
              </span>
            </div>
            <div className="touch-walk-pad" aria-label="Touch walkthrough controls">
              <button
                type="button"
                aria-label="Walk forward"
                onPointerDown={() => setMobileMotion('forward', 1)}
                onPointerUp={() => setMobileMotion('forward', 0)}
                onPointerCancel={() => setMobileMotion('forward', 0)}
                onPointerLeave={() => setMobileMotion('forward', 0)}
              >↑</button>
              <button
                type="button"
                aria-label="Step left"
                onPointerDown={() => setMobileMotion('right', -1)}
                onPointerUp={() => setMobileMotion('right', 0)}
                onPointerCancel={() => setMobileMotion('right', 0)}
                onPointerLeave={() => setMobileMotion('right', 0)}
              >←</button>
              <button
                type="button"
                aria-label="Walk backward"
                onPointerDown={() => setMobileMotion('forward', -1)}
                onPointerUp={() => setMobileMotion('forward', 0)}
                onPointerCancel={() => setMobileMotion('forward', 0)}
                onPointerLeave={() => setMobileMotion('forward', 0)}
              >↓</button>
              <button
                type="button"
                aria-label="Step right"
                onPointerDown={() => setMobileMotion('right', 1)}
                onPointerUp={() => setMobileMotion('right', 0)}
                onPointerCancel={() => setMobileMotion('right', 0)}
                onPointerLeave={() => setMobileMotion('right', 0)}
              >→</button>
            </div>
          </>
        )}
      </div>
      <p className="viewer-note">
        Walk mode follows authored room/door/stair anchors and constrains movement to a presentation route. It is safer than unrestricted free-fly, but it is still a portfolio navigation graph rather than a measured construction navmesh.
      </p>
    </section>
  );
}
