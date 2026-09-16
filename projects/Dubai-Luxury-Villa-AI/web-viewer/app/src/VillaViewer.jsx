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
const VIEWER_RUNTIME_PROFILE = 'persistent-scene-v1';
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
      const family = source.userData?.materialFamily ?? inferMaterialFamily(source.name);
      const familyColor = family ? selectedMaterial.familyColors[family] : null;
      if (!familyColor) return source;

      let material = source;
      if (!source.userData?.runtimeMaterialClone) {
        material = source.clone();
        material.userData = {
          ...source.userData,
          runtimeMaterialClone: true,
          materialFamily: family,
          materialResponseProfile: MATERIAL_RESPONSE_PROFILE,
          baseNormalScale: source.normalScale ? [source.normalScale.x, source.normalScale.y] : null
        };
        if (source.normalScale?.clone) material.normalScale = source.normalScale.clone();
      }

      material.color = new THREE.Color(familyColor);
      const response = MATERIAL_RESPONSE_BY_FAMILY[family];
      if (response && typeof material.roughness === 'number') {
        material.roughness = response.roughness;
      }
      if (response && material.normalMap && material.normalScale) {
        const base = material.userData?.baseNormalScale ?? [1, 1];
        material.normalScale.set(base[0] * response.normalScale, base[1] * response.normalScale);
      }

      material.userData = {
        ...material.userData,
        runtimeMaterialClone: true,
        materialFamily: family,
        materialResponseProfile: MATERIAL_RESPONSE_PROFILE
      };
      material.needsUpdate = true;
      report.materialCount += 1;
      families.add(family);
      return material;
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

function setInteriorLightMultiplier(group, multiplier) {
  if (!group) return;
  group.traverse((object) => {
    if (!object.isLight) return;
    if (typeof object.userData.runtimeBaseIntensity !== 'number') {
      object.userData.runtimeBaseIntensity = object.intensity;
    }
    object.intensity = object.userData.runtimeBaseIntensity * multiplier;
  });
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
  activeTourStopId = 'overview',
  onSelectTourStop,
  onExitTour
}) {
  const mountRef = useRef(null);
  const runtimeRef = useRef(null);
  const mobileMotionRef = useRef({ forward: 0, right: 0 });
  const latestPropsRef = useRef(null);
  const [modelState, setModelState] = useState('loading');
  const [modelLoadCount, setModelLoadCount] = useState(0);
  const [firstPersonReady, setFirstPersonReady] = useState(false);
  const [walkGraphReady, setWalkGraphReady] = useState(false);
  const [interiorLightCount, setInteriorLightCount] = useState(0);
  const [importedLightCount, setImportedLightCount] = useState(0);
  const [isTouchUi, setIsTouchUi] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [materialResponse, setMaterialResponse] = useState({
    profile: 'pending',
    materialCount: 0,
    familyCount: 0
  });
  const [walkStatus, setWalkStatus] = useState({ label: 'Tour anchor', floor: null, edgeType: null });

  latestPropsRef.current = {
    selectedRoom,
    lightingMode,
    material,
    tourMode,
    activeTourStopId
  };

  const syncLighting = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const current = latestPropsRef.current;
    const isFirstPerson = current.tourMode && current.activeTourStopId !== 'overview';
    const lighting = resolveRuntimeLighting(current.lightingMode, current.activeTourStopId, isFirstPerson);

    runtime.scene.background = new THREE.Color(current.lightingMode?.background ?? '#bfd0d7');
    runtime.renderer.setClearColor(runtime.scene.background);
    runtime.renderer.toneMappingExposure = lighting.exposure;
    runtime.ambient.intensity = lighting.ambient;
    runtime.hemisphere.intensity = lighting.hemisphere;
    runtime.sun.intensity = lighting.sun;
    runtime.fill.intensity = lighting.fill;
    setInteriorLightMultiplier(runtime.interiorLightGroup, lighting.interior);
  };

  const syncMaterial = () => {
    const runtime = runtimeRef.current;
    if (!runtime?.villaRoot) return;
    const report = applyMaterialConcept(runtime.villaRoot, latestPropsRef.current.material);
    setMaterialResponse(report);
  };

  const syncView = () => {
    const runtime = runtimeRef.current;
    if (!runtime?.villaRoot) return;

    const current = latestPropsRef.current;
    const isFirstPerson = current.tourMode && current.activeTourStopId !== 'overview';
    const wasFirstPerson = runtime.isFirstPerson;
    runtime.isFirstPerson = isFirstPerson;
    runtime.currentWalkEdgeId = null;
    runtime.firstPersonAvailable = false;

    if (runtime.orbitControls) runtime.orbitControls.enabled = !isFirstPerson;

    if (isFirstPerson) {
      runtime.camera.fov = 64;
      runtime.camera.updateProjectionMatrix();
      const tourPlaced = placeFirstPersonCamera(runtime.camera, runtime.villaRoot, current.activeTourStopId);
      runtime.firstPersonAvailable = tourPlaced;
      setFirstPersonReady(tourPlaced);
      if (tourPlaced && runtime.isTouchDevice) runtime.camera.rotation.order = 'YXZ';

      const nearest = nearestTourStop(runtime.walkGraph, runtime.camera.position);
      if (nearest) {
        setWalkStatus({ label: nearest.title, floor: nearest.floor, edgeType: null });
      }
      if (!wasFirstPerson) setHasInteracted(false);
      return;
    }

    runtime.pointerLockControls?.unlock();
    setFirstPersonReady(false);
    if (wasFirstPerson) runtime.camera.position.set(18, 12, 20);
    runtime.camera.fov = 45;
    runtime.camera.updateProjectionMatrix();

    if (runtime.orbitControls) {
      const roomNodeName = ROOM_NODE_NAMES[current.selectedRoom?.id];
      const roomNode = roomNodeName ? runtime.villaRoot.getObjectByName(roomNodeName) : null;
      if (roomNode) {
        const target = new THREE.Vector3();
        roomNode.getWorldPosition(target);
        runtime.orbitControls.target.copy(target);
      } else {
        runtime.orbitControls.target.set(0, 2.8, 0);
      }
      runtime.orbitControls.update();
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const scene = createScene(THREE);
    const camera = createCamera(THREE);
    camera.fov = 45;
    camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    camera.updateProjectionMatrix();
    camera.position.set(18, 12, 20);

    const renderer = createRenderer(THREE, container);
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.touchAction = 'none';

    const { ambient, hemisphere, sun, fill } = createLights(THREE, scene);
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.target.set(0, 2.8, 0);
    orbitControls.minDistance = 8;
    orbitControls.maxDistance = 60;

    const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    setIsTouchUi(isTouchDevice);
    const pointerLockControls = isTouchDevice ? null : new PointerLockControls(camera, renderer.domElement);

    const runtime = {
      disposed: false,
      scene,
      camera,
      renderer,
      ambient,
      hemisphere,
      sun,
      fill,
      orbitControls,
      pointerLockControls,
      isTouchDevice,
      isFirstPerson: false,
      villaRoot: null,
      interiorLightGroup: null,
      walkGraph: null,
      currentWalkEdgeId: null,
      firstPersonAvailable: false,
      keys: new Set(),
      touchLook: { active: false, pointerId: null, x: 0, y: 0 },
      statusTimer: 0,
      lastFrameTime: performance.now(),
      frameId: null
    };
    runtimeRef.current = runtime;

    setModelState('loading');
    setFirstPersonReady(false);
    setWalkGraphReady(false);
    setInteriorLightCount(0);
    setImportedLightCount(0);
    setMaterialResponse({ profile: 'pending', materialCount: 0, familyCount: 0 });

    const loader = new GLTFLoader();
    const modelUrl = `${import.meta.env.BASE_URL}villa.glb`;
    loader.load(
      modelUrl,
      (gltf) => {
        if (runtime.disposed) return;

        runtime.villaRoot = gltf.scene;
        runtime.villaRoot.name = 'dubai_luxury_villa_active';
        runtime.villaRoot.rotation.y = Math.PI;
        runtime.villaRoot.traverse((object) => {
          if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });

        setImportedLightCount(neutralizeImportedLights(runtime.villaRoot));
        scene.add(runtime.villaRoot);
        runtime.villaRoot.updateMatrixWorld(true);

        runtime.interiorLightGroup = createInteriorLights(THREE, scene, runtime.villaRoot, 1);
        setInteriorLightCount(runtime.interiorLightGroup.userData.fixtureCount ?? 0);

        runtime.walkGraph = buildWalkGraph(runtime.villaRoot);
        setWalkGraphReady(runtime.walkGraph.edges.length >= 4);

        syncMaterial();
        syncLighting();
        syncView();
        setModelLoadCount((count) => count + 1);
        setModelState('loaded');
      },
      undefined,
      (error) => {
        if (runtime.disposed) return;
        console.warn('villa.glb failed to load; using fallback massing', error);
        runtime.villaRoot = buildFallbackMassing(scene, latestPropsRef.current.material?.swatch ?? '#d8c8ad');
        setModelState('fallback');
      }
    );

    const keyDown = (event) => {
      if (!runtime.isFirstPerson) return;
      runtime.keys.add(event.code);
      if (/^(Key[WASD]|Arrow|Shift)/.test(event.code)) setHasInteracted(true);
    };
    const keyUp = (event) => runtime.keys.delete(event.code);

    const lockFirstPerson = () => {
      if (!runtime.isFirstPerson || !runtime.pointerLockControls || !runtime.villaRoot) return;
      setHasInteracted(true);
      runtime.pointerLockControls.lock();
    };

    const pointerDown = (event) => {
      if (!runtime.isTouchDevice || !runtime.isFirstPerson) return;
      setHasInteracted(true);
      runtime.touchLook.active = true;
      runtime.touchLook.pointerId = event.pointerId;
      runtime.touchLook.x = event.clientX;
      runtime.touchLook.y = event.clientY;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };

    const pointerMove = (event) => {
      const touchLook = runtime.touchLook;
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
      if (runtime.touchLook.pointerId !== event.pointerId) return;
      runtime.touchLook.active = false;
      runtime.touchLook.pointerId = null;
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
      runtime.frameId = requestAnimationFrame(animate);
      const delta = Math.min((now - runtime.lastFrameTime) / 1000, 0.05);
      runtime.lastFrameTime = now;

      if (runtime.orbitControls?.enabled) runtime.orbitControls.update();

      const desktopCanWalk = runtime.isFirstPerson && Boolean(runtime.pointerLockControls?.isLocked);
      const touchCanWalk = Boolean(runtime.isTouchDevice && runtime.isFirstPerson && runtime.firstPersonAvailable);

      if (desktopCanWalk || touchCanWalk) {
        const keyboardForward = (runtime.keys.has('KeyW') || runtime.keys.has('ArrowUp') ? 1 : 0)
          - (runtime.keys.has('KeyS') || runtime.keys.has('ArrowDown') ? 1 : 0);
        const keyboardRight = (runtime.keys.has('KeyD') || runtime.keys.has('ArrowRight') ? 1 : 0)
          - (runtime.keys.has('KeyA') || runtime.keys.has('ArrowLeft') ? 1 : 0);
        const forwardInput = THREE.MathUtils.clamp(keyboardForward + mobileMotionRef.current.forward, -1, 1);
        const rightInput = THREE.MathUtils.clamp(keyboardRight + mobileMotionRef.current.right, -1, 1);

        if ((forwardInput !== 0 || rightInput !== 0) && runtime.walkGraph) {
          const sprint = runtime.keys.has('ShiftLeft') || runtime.keys.has('ShiftRight');
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

          const constrained = constrainToWalkGraph(desired, runtime.walkGraph, runtime.currentWalkEdgeId);
          camera.position.copy(constrained.position);
          runtime.currentWalkEdgeId = constrained.edge?.id ?? runtime.currentWalkEdgeId;
        }

        runtime.statusTimer += delta;
        if (runtime.statusTimer >= 0.25) {
          runtime.statusTimer = 0;
          const nearest = nearestTourStop(runtime.walkGraph, camera.position);
          const currentEdge = runtime.walkGraph?.edges?.find((edge) => edge.id === runtime.currentWalkEdgeId) ?? null;
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
      runtime.disposed = true;
      if (runtime.frameId) cancelAnimationFrame(runtime.frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      renderer.domElement.removeEventListener('click', lockFirstPerson);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', pointerUp);
      runtime.orbitControls?.dispose();
      runtime.pointerLockControls?.unlock();
      runtime.pointerLockControls?.dispose();
      mobileMotionRef.current = { forward: 0, right: 0 };
      if (runtime.interiorLightGroup) scene.remove(runtime.interiorLightGroup);
      if (runtime.villaRoot) {
        scene.remove(runtime.villaRoot);
        disposeObject(runtime.villaRoot);
      }
      renderer.dispose();
      renderer.domElement.remove();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    syncLighting();
  }, [lightingMode, tourMode, activeTourStopId]);

  useEffect(() => {
    syncMaterial();
  }, [material]);

  useEffect(() => {
    syncView();
  }, [selectedRoom, tourMode, activeTourStopId]);

  const activeStop = TOUR_STOPS.find((stop) => stop.id === activeTourStopId) ?? TOUR_STOPS[0];
  const isFirstPerson = tourMode && activeTourStopId !== 'overview';
  const runtimeLightingProfile = resolveRuntimeLighting(lightingMode, activeTourStopId, isFirstPerson).profile;
  const guidedStops = TOUR_STOPS.filter((stop) => stop.id !== 'overview');
  const guidedIndex = guidedStops.findIndex((stop) => stop.id === activeTourStopId);
  const previousStop = guidedIndex > 0 ? guidedStops[guidedIndex - 1] : null;
  const nextStop = guidedIndex >= 0 && guidedIndex < guidedStops.length - 1 ? guidedStops[guidedIndex + 1] : null;

  const setMobileMotion = (axis, value) => {
    if (value !== 0) setHasInteracted(true);
    mobileMotionRef.current = { ...mobileMotionRef.current, [axis]: value };
  };

  return (
    <section>
      <div className="viewer-heading">
        <div>
          <p className="eyebrow">Interactive architectural walkthrough</p>
          <h2>{isFirstPerson ? activeStop.title : '3D Villa Viewer'}</h2>
        </div>
        <p>
          {isFirstPerson
            ? 'Follow the guided route or look around freely. The villa stays loaded while you move between spaces.'
            : 'Drag to orbit · scroll to zoom · choose a room or enter the guided walkthrough.'}
        </p>
      </div>

      <div className="three-canvas-shell">
        <div
          ref={mountRef}
          className="three-canvas"
          data-model-state={modelState}
          data-model-load-count={modelLoadCount}
          data-viewer-runtime={VIEWER_RUNTIME_PROFILE}
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
          data-navigation-anchor-mode="separate-presentation-v1"
          aria-label="Interactive Dubai luxury villa virtual tour prototype"
        />

        {modelState === 'loading' && (
          <div className="viewer-loading" role="status" aria-live="polite">
            <span /> Loading villa…
          </div>
        )}

        {isFirstPerson && (
          <>
            <div className="first-person-hud" aria-live="polite">
              <strong>{walkStatus.label || activeStop.title}</strong>
              <span>
                {walkStatus.floor ? `Floor ${walkStatus.floor}` : 'Site'}
                {walkStatus.edgeType ? ` · ${walkStatus.edgeType}` : ''}
                {' · '}
                {walkGraphReady ? 'route ready' : firstPersonReady ? 'anchor ready' : 'preparing route'}
              </span>
            </div>

            {!hasInteracted && (
              <div className="walkthrough-onboarding" role="status">
                <strong>{isTouchUi ? 'Drag to look' : 'Click the view to look around'}</strong>
                <span>{isTouchUi ? 'Use the movement pad to walk.' : 'WASD to move · Shift to move faster · Esc releases the cursor.'}</span>
              </div>
            )}

            {onExitTour && (
              <button type="button" className="viewer-exit-tour" onClick={onExitTour} aria-label="Exit walkthrough">
                Exit
              </button>
            )}

            {onSelectTourStop && guidedIndex >= 0 && (
              <nav className="viewer-guided-controls" aria-label="Guided walkthrough controls">
                <button type="button" disabled={!previousStop} onClick={() => previousStop && onSelectTourStop(previousStop)} aria-label="Previous stop">
                  ←
                </button>
                <span><strong>{guidedIndex + 1}</strong> / {guidedStops.length}</span>
                <button type="button" disabled={!nextStop} onClick={() => nextStop && onSelectTourStop(nextStop)} aria-label="Next stop">
                  →
                </button>
              </nav>
            )}

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
        Guided mode keeps movement on the authored presentation route while the camera framing stays independent from navigation anchors, so visual polish cannot silently distort the walk path.
      </p>
    </section>
  );
}
