import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createScene } from './three/scene';
import { createCamera } from './three/camera';
import { createRenderer } from './three/renderer';
import { createLights } from './three/lights';
import { createInteriorLights } from './three/interiorLights';
import { TOUR_STOPS } from './tourData';
import { WALKTHROUGH_PLAYER } from './navigationData';
import {
  buildWalkGraph,
  constrainToWalkGraph,
  nearestTourStop,
  placeFirstPersonCamera
} from './walkthroughEngine';
import './Walkthrough.css';

const ROOM_NODE_NAMES = {
  'living-room': 'living_room',
  'master-bedroom': 'master_bedroom',
  'pool-terrace': 'pool_terrace'
};

const MATERIAL_FAMILY_BY_NAME = {
  M4_OrganicWarmLimestone: 'stone',
  M3_IvoryPlaster: 'plaster',
  M2_WalnutTimber: 'timber',
  M3_DeckStone: 'deck',
  M1_Limestone: 'stone',
  M1_MineralPlaster: 'plaster',
  M1_WalnutTimber: 'timber',
  M1_DeckStone: 'deck',
  WarmTravertine: 'stone',
  CreamStonePBR_R8: 'stone',
  MineralFacadePBR_R5: 'stone',
  NaturalTimber: 'timber',
  TimberCladdingPBR_R5: 'timber'
};

const MATERIAL_RESPONSE_PROFILE = 'family-microcontrast-v1';
const MATERIAL_RESPONSE_BY_FAMILY = {
  stone: { roughness: 0.60, normalScale: 1.08 },
  plaster: { roughness: 0.84, normalScale: 0.72 },
  timber: { roughness: 0.86, normalScale: 1.02 },
  deck: { roughness: 0.88, normalScale: 0.84 }
};

const INTERIOR_TOUR_STOPS = new Set([
  'entry',
  'living',
  'dining',
  'stair-ground',
  'stair-upper',
  'master'
]);

function inferMaterialFamily(name = '') {
  if (MATERIAL_FAMILY_BY_NAME[name]) return MATERIAL_FAMILY_BY_NAME[name];
  const lower = name.toLowerCase();
  if (/(limestone|travertine|stone|mineralfacade|creamstone)/.test(lower)) return 'stone';
  if (/(plaster|stucco)/.test(lower)) return 'plaster';
  if (/(walnut|timber|wood)/.test(lower)) return 'timber';
  if (/(deck|terrace)/.test(lower)) return 'deck';
  return null;
}

function resolveRuntimeLighting(lightingMode, activeTourStopId, isFirstPerson) {
  const interior = isFirstPerson && INTERIOR_TOUR_STOPS.has(activeTourStopId);
  const landing = interior && activeTourStopId === 'stair-upper';

  const exposureScale = landing ? 0.80 : interior ? 0.90 : 1;
  const ambientScale = landing ? 0.82 : interior ? 0.90 : 1;
  const hemisphereScale = landing ? 0.78 : interior ? 0.88 : 1;
  const sunScale = landing ? 0.72 : interior ? 0.82 : 1;
  const fillScale = landing ? 0.82 : interior ? 0.90 : 1;
  const interiorScale = landing ? 1.15 : interior ? 1.08 : 1;

  return {
    profile: landing ? 'landing-adapted' : interior ? 'interior-adapted' : 'global',
    exposure: (lightingMode?.exposure ?? 0.72) * exposureScale,
    ambient: (lightingMode?.ambient ?? 0.62) * ambientScale,
    hemisphere: (lightingMode?.hemisphere ?? 0.42) * hemisphereScale,
    sun: (lightingMode?.sun ?? 1.65) * sunScale,
    fill: (lightingMode?.fill ?? 0.18) * fillScale,
    interior: (lightingMode?.interior ?? 1) * interiorScale
  };
}

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
  const report = {
    profile: MATERIAL_RESPONSE_PROFILE,
    materialCount: 0,
    familyCount: 0
  };
  if (!root || !selectedMaterial?.familyColors) return report;

  const families = new Set();
  root.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const nextMaterials = materials.map((source) => {
      const family = inferMaterialFamily(source.name);
      const familyColor = family ? selectedMaterial.familyColors[family] : null;
      if (!familyColor) return source;

      const cloned = source.clone();
      cloned.color = new THREE.Color(familyColor);

      const response = MATERIAL_RESPONSE_BY_FAMILY[family];
      if (response && typeof cloned.roughness === 'number') {
        cloned.roughness = response.roughness;
      }
      if (response && cloned.normalMap && cloned.normalScale?.clone) {
        cloned.normalScale = cloned.normalScale.clone().multiplyScalar(response.normalScale);
      }

      cloned.userData = {
        ...source.userData,
        ...cloned.userData,
        materialFamily: family,
        materialResponseProfile: MATERIAL_RESPONSE_PROFILE
      };
      cloned.needsUpdate = true;
      report.materialCount += 1;
      families.add(family);
      return cloned;
    });
    object.material = nextMaterials.length === 1 ? nextMaterials[0] : nextMaterials;
  });

  report.familyCount = families.size;
  return report;
}

function neutralizeImportedLights(root) {
  let count = 0;
  root?.traverse((object) => {
    if (!object.isLight) return;
    count += 1;
    object.intensity = 0;
    object.visible = false;
    object.castShadow = false;
    object.userData = {
      ...object.userData,
      disabledForRuntimeLighting: true
    };
  });
  return count;
}

function disposeObject(root) {
  root?.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((item) => item?.dispose?.());
  });
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
  const [interiorLightCount, setInteriorLightCount] = useState(0);
  const [importedLightCount, setImportedLightCount] = useState(0);
  const [materialResponse, setMaterialResponse] = useState({
    profile: 'pending',
    materialCount: 0,
    familyCount: 0
  });
  const [walkStatus, setWalkStatus] = useState({ label: 'Tour anchor', floor: null, edgeType: null });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    let disposed = false;
    let villaRoot = null;
    let interiorLightGroup = null;
    let frameId = null;
    let orbitControls = null;
    let pointerLockControls = null;
    let walkGraph = null;
    let currentWalkEdgeId = null;
    let firstPersonAvailable = false;
    let lastFrameTime = performance.now();
    let statusTimer = 0;
    const keys = new Set();
    const touchLook = { active: false, pointerId: null, x: 0, y: 0 };
    const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const isFirstPerson = tourMode && activeTourStopId !== 'overview';
    const runtimeLighting = resolveRuntimeLighting(lightingMode, activeTourStopId, isFirstPerson);

    setModelState('loading');
    setFirstPersonReady(false);
    setWalkGraphReady(false);
    setInteriorLightCount(0);
    setImportedLightCount(0);
    setMaterialResponse({ profile: 'pending', materialCount: 0, familyCount: 0 });

    const scene = createScene(THREE);
    scene.background = new THREE.Color(lightingMode?.background ?? '#bfd0d7');

    const camera = createCamera(THREE);
    camera.fov = isFirstPerson ? 64 : 45;
    camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    camera.updateProjectionMatrix();
    camera.position.set(18, 12, 20);

    const renderer = createRenderer(THREE, container);
    renderer.shadowMap.enabled = true;
    renderer.toneMappingExposure = runtimeLighting.exposure;
    renderer.setClearColor(scene.background);
    renderer.domElement.style.touchAction = 'none';

    const { ambient, hemisphere, sun, fill } = createLights(THREE, scene);
    ambient.intensity = runtimeLighting.ambient;
    hemisphere.intensity = runtimeLighting.hemisphere;
    sun.intensity = runtimeLighting.sun;
    fill.intensity = runtimeLighting.fill;

    if (isFirstPerson && !isTouchDevice) {
      pointerLockControls = new PointerLockControls(camera, renderer.domElement);
    } else if (!isFirstPerson) {
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

        const disabledImportedLights = neutralizeImportedLights(villaRoot);
        setImportedLightCount(disabledImportedLights);

        const responseReport = applyMaterialConcept(villaRoot, material);
        setMaterialResponse(responseReport);
        scene.add(villaRoot);
        villaRoot.updateMatrixWorld(true);

        interiorLightGroup = createInteriorLights(
          THREE,
          scene,
          villaRoot,
          runtimeLighting.interior
        );
        setInteriorLightCount(interiorLightGroup.userData.fixtureCount ?? 0);

        walkGraph = buildWalkGraph(villaRoot);
        const graphReady = walkGraph.edges.length >= 4;
        setWalkGraphReady(graphReady);

        let tourPlaced = false;
        if (isFirstPerson) {
          tourPlaced = placeFirstPersonCamera(camera, villaRoot, activeTourStopId);
          firstPersonAvailable = tourPlaced;
          setFirstPersonReady(tourPlaced);
          if (tourPlaced && isTouchDevice) camera.rotation.order = 'YXZ';
          const nearest = nearestTourStop(walkGraph, camera.position);
          if (nearest) {
            setWalkStatus({ label: nearest.title, floor: nearest.floor, edgeType: null });
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
      if (isFirstPerson) keys.add(event.code);
    };
    const keyUp = (event) => keys.delete(event.code);

    const lockFirstPerson = () => {
      if (pointerLockControls && villaRoot) pointerLockControls.lock();
    };

    const pointerDown = (event) => {
      if (!isTouchDevice || !isFirstPerson) return;
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

      const desktopCanWalk = Boolean(pointerLockControls?.isLocked);
      const touchCanWalk = Boolean(isTouchDevice && isFirstPerson && firstPersonAvailable);

      if (desktopCanWalk || touchCanWalk) {
        const keyboardForward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
          - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
        const keyboardRight = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
          - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
        const forwardInput = THREE.MathUtils.clamp(keyboardForward + mobileMotionRef.current.forward, -1, 1);
        const rightInput = THREE.MathUtils.clamp(keyboardRight + mobileMotionRef.current.right, -1, 1);

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
      pointerLockControls?.unlock();
      pointerLockControls?.dispose();
      mobileMotionRef.current = { forward: 0, right: 0 };
      if (interiorLightGroup) {
        scene.remove(interiorLightGroup);
      }
      if (villaRoot) {
        scene.remove(villaRoot);
        disposeObject(villaRoot);
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [selectedRoom, lightingMode, material, tourMode, activeTourStopId]);

  const activeStop = TOUR_STOPS.find((stop) => stop.id === activeTourStopId) ?? TOUR_STOPS[0];
  const isFirstPerson = tourMode && activeTourStopId !== 'overview';
  const runtimeLightingProfile = resolveRuntimeLighting(lightingMode, activeTourStopId, isFirstPerson).profile;

  const setMobileMotion = (axis, value) => {
    mobileMotionRef.current = { ...mobileMotionRef.current, [axis]: value };
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
          data-interior-light-count={interiorLightCount}
          data-imported-light-count={importedLightCount}
          data-light-engine="runtime-only"
          data-lighting-profile={runtimeLightingProfile}
          data-lighting-mode={lightingMode?.name ?? 'Day'}
          data-material-mode={material?.id ?? 'default'}
          data-material-response-profile={materialResponse.profile}
          data-material-response-count={materialResponse.materialCount}
          data-material-family-count={materialResponse.familyCount}
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
                {walkGraphReady ? 'bounded walk route' : firstPersonReady ? 'anchor fallback' : 'tour anchor unavailable'}
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
        Walk mode follows authored room, door and stair anchors and constrains movement to a presentation route. It is safer than unrestricted free-fly, but it remains a portfolio navigation graph rather than a measured construction navmesh.
      </p>
    </section>
  );
}
