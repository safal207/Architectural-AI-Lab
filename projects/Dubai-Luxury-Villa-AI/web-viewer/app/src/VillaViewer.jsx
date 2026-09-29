import { useEffect, useId, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createScene } from './three/scene';
import { createCamera, OVERVIEW_POSITION, OVERVIEW_TARGET, updateOverviewProjection } from './three/camera';
import { createRenderer } from './three/renderer';
import { createFramePacer } from './three/framePacer';
import { createLights } from './three/lights';
import { createInteriorLights } from './three/interiorLights';
import { applyStairPresentation } from './three/stairPresentation';
import { applyPoolPresentation } from './three/poolPresentation';
import { createAtmosphere } from './three/atmosphere';
import { createLivingWater } from './three/livingWater';
import { createLivingDetails } from './three/livingDetails';
import AtmosphereControls from './AtmosphereControls';
import { TOUR_STOPS } from './tourData';
import { createDroneFlight } from './droneFlight';
import './DroneFlight.css';
import { WALKTHROUGH_PLAYER } from './navigationData';
import { bindWalkthroughKeyboard, canUseWalkthroughKeyboard, resetWalkthroughInput } from './walkthroughInput';
import {
  buildWalkGraph,
  constrainToWalkGraph,
  nearestTourStop,
  placeFirstPersonCamera,
  updateTourCameraProjection
} from './walkthroughEngine';
import './Walkthrough.css';

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
const VIEWER_RUNTIME_PROFILE = 'persistent-scene-v2';
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

      let runtimeMaterial = source;
      if (!source.userData?.runtimeMaterialClone) {
        runtimeMaterial = source.clone();
        runtimeMaterial.userData = {
          ...source.userData,
          runtimeMaterialClone: true,
          materialFamily: family,
          materialResponseProfile: MATERIAL_RESPONSE_PROFILE,
          baseNormalScale: source.normalScale ? [source.normalScale.x, source.normalScale.y] : null
        };
        if (source.normalScale?.clone) runtimeMaterial.normalScale = source.normalScale.clone();
      }

      runtimeMaterial.color = new THREE.Color(familyColor);
      const response = MATERIAL_RESPONSE_BY_FAMILY[family];
      if (response && typeof runtimeMaterial.roughness === 'number') {
        runtimeMaterial.roughness = response.roughness;
      }
      if (response && runtimeMaterial.normalMap && runtimeMaterial.normalScale) {
        const base = runtimeMaterial.userData?.baseNormalScale ?? [1, 1];
        runtimeMaterial.normalScale.set(
          base[0] * response.normalScale,
          base[1] * response.normalScale
        );
      }

      runtimeMaterial.userData = {
        ...runtimeMaterial.userData,
        runtimeMaterialClone: true,
        materialFamily: family,
        materialResponseProfile: MATERIAL_RESPONSE_PROFILE
      };
      runtimeMaterial.needsUpdate = true;
      report.materialCount += 1;
      families.add(family);
      return runtimeMaterial;
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

/**
 * Restore authored linear midpoint colors only for known Blender ramps exported as untextured white.
 * Preserve existing color maps and nonwhite colors; this does not reconstruct procedural textures.
 */
function restoreProceduralMaterialColors(root) {
  // glTF cannot export these Blender procedural color ramps. Use their authored
  // linear midpoint only when the export has neither a color nor a color map.
  // Sources: run_v03_m4.py and run_v04_pool_context.py, respectively.
  const sourceColors = {
    M4_OrganicWarmLimestone: [0.47, 0.325, 0.19],
    V04_PoolContextGravelV3: [0.305, 0.270, 0.220]
  };
  root.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const sourceColor = sourceColors[material.name];
      if (!sourceColor || material.map || material.color?.getHex() !== 0xffffff) continue;
      material.color.setRGB(...sourceColor, THREE.LinearSRGBColorSpace);
    }
  });
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
  const geometries = new Set();
  const ownedMaterials = new Set();
  const textures = new Set();
  root?.traverse((object) => {
    if (!object.isMesh) return;
    if (object.geometry) geometries.add(object.geometry);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const item of materials) {
      if (!item) continue;
      ownedMaterials.add(item);
      for (const value of Object.values(item)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  ownedMaterials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

/**
 * Own one persistent Three.js scene and synchronize its camera, materials and lighting with React state.
 * Support orbit, Guided, Explore and Drone modes, and release scene resources and input listeners on unmount.
 */
export default function VillaViewer({
  selectedRoom,
  lightingMode,
  material,
  tourMode = false,
  activeTourStopId = 'overview',
  viewRequestId = 0,
  droneMode = false,
  setDroneMode,
  onSelectTourStop,
  onExitTour
}) {
  const viewerNoteId = useId();
  const mountRef = useRef(null);
  const runtimeRef = useRef(null);
  const mobileMotionRef = useRef({ forward: 0, right: 0 });
  const latestPropsRef = useRef(null);

  const [modelState, setModelState] = useState('loading');
  const [modelProgress, setModelProgress] = useState(null);
  const [modelLoadCount, setModelLoadCount] = useState(0);
  const [firstPersonReady, setFirstPersonReady] = useState(false);
  const [walkGraphReady, setWalkGraphReady] = useState(false);
  const [interiorLightCount, setInteriorLightCount] = useState(0);
  const [importedLightCount, setImportedLightCount] = useState(0);
  const [isTouchUi, setIsTouchUi] = useState(false);
  const [interactionMode, setInteractionMode] = useState('guided');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [weather, setWeather] = useState('clear');
  const [wind, setWind] = useState(0.35);
  const [motion, setMotion] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [materialResponse, setMaterialResponse] = useState({
    profile: 'pending',
    materialCount: 0,
    familyCount: 0
  });
  const [walkStatus, setWalkStatus] = useState({
    stopId: null,
    label: 'Tour anchor',
    floor: null,
    edgeType: null
  });

  latestPropsRef.current = {
    selectedRoom,
    lightingMode,
    material,
    tourMode,
    activeTourStopId,
    interactionMode,
    droneMode,
    weather,
    wind,
    motion
  };

  /** Apply the latest atmosphere and current room's lighting profile to the existing lights and request a frame. */
  const syncLighting = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.needsRender = true;
    const current = latestPropsRef.current;
    const isFirstPerson = !current.droneMode && current.tourMode && current.activeTourStopId !== 'overview';
    const lighting = resolveRuntimeLighting(
      current.lightingMode,
      current.interactionMode === 'explore' && runtime.isExplore
        ? (runtime.lightingStopId ?? current.activeTourStopId)
        : current.activeTourStopId,
      isFirstPerson
    );

    const raining = current.weather === 'rain';
    const mode = current.lightingMode?.name?.toLowerCase() ?? 'evening';
    const state = { mode, weather: current.weather, wind: current.wind, motion: current.motion };
    runtime.atmosphere?.setState(state);
    runtime.water?.setState(state);
    runtime.details?.setState(state);
    if (runtime.atmosphere) {
      mountRef.current.dataset.atmosphereReport = JSON.stringify(runtime.atmosphere.report);
      mountRef.current.dataset.waterReport = JSON.stringify(runtime.water.report);
      mountRef.current.dataset.detailsReport = JSON.stringify(runtime.details.report);
    }
    runtime.scene.background = new THREE.Color(current.lightingMode?.background ?? '#bfd0d7');
    runtime.scene.environmentIntensity = (current.lightingMode?.environment ?? 0.24) * (raining ? 0.78 : 1);
    runtime.renderer.setClearColor(runtime.scene.background);
    runtime.renderer.toneMappingExposure = lighting.exposure * (raining ? 0.94 : 1);
    runtime.ambient.intensity = lighting.ambient * (raining ? 1.12 : 1);
    runtime.hemisphere.intensity = lighting.hemisphere * (raining ? 0.9 : 1);
    runtime.hemisphere.color.set(mode === 'night' ? '#7895ba' : raining ? '#a2bac9' : '#b5d1e5');
    runtime.sun.intensity = lighting.sun * (raining ? 0.18 : 1);
    runtime.sun.color.set(raining ? '#cbd9e1' : current.lightingMode?.sunColor ?? '#ffd9a8');
    if (runtime.atmosphere) runtime.sun.position.copy(runtime.atmosphere.sunPosition);
    runtime.sun.shadow.radius = raining ? 4 : 2;
    runtime.renderer.shadowMap.needsUpdate = true;
    runtime.fill.intensity = lighting.fill * (raining ? 0.8 : 1);
    setInteriorLightMultiplier(runtime.interiorLightGroup, lighting.interior * (raining ? 1.25 : 1));
    if (runtime.atmosphere) {
      const color = runtime.atmosphere.horizonColor;
      runtime.scene.fog = new THREE.Fog(color, raining ? 32 : 65, raining ? 120 : 230);
    }
  };

  /** Apply the selected concept palette to the loaded model and publish its material-response report. */
  const syncMaterial = () => {
    const runtime = runtimeRef.current;
    if (!runtime?.villaRoot) return;
    runtime.needsRender = true;
    const report = applyMaterialConcept(runtime.villaRoot, latestPropsRef.current.material);
    setMaterialResponse(report);
    syncLighting();
  };

  /**
   * Transfer input ownership and place the camera for the requested viewing mode.
   * Clear stale motion, keep Guided views separate from Explore anchors and reset orbit momentum on exit.
   */
  const syncView = () => {
    const runtime = runtimeRef.current;
    if (!runtime?.villaRoot) return;
    runtime.needsRender = true;

    const current = latestPropsRef.current;
    const isFirstPerson = !current.droneMode && current.tourMode && current.activeTourStopId !== 'overview';
    const isExplore = isFirstPerson && current.interactionMode === 'explore';
    const wasFirstPerson = runtime.isFirstPerson;

    runtime.isFirstPerson = isFirstPerson;
    runtime.isExplore = isExplore;
    runtime.currentWalkEdgeId = null;
    runtime.firstPersonAvailable = false;
    runtime.lightingStopId = current.activeTourStopId;
    resetWalkthroughInput(runtime, mobileMotionRef, runtime.renderer.domElement);

    if (runtime.orbitControls) runtime.orbitControls.enabled = !isFirstPerson && !current.droneMode;
    runtime.isDrone = current.droneMode;
    if (current.droneMode) {
      runtime.camera.fov = runtime.camera.aspect < 1 ? 72 : 60;
      runtime.camera.updateProjectionMatrix();
      runtime.drone.enable();
      setFirstPersonReady(false);
      syncLighting();
      return;
    }
    runtime.drone.disable();

    if (isFirstPerson) {
      runtime.camera.fov = 64;
      runtime.camera.updateProjectionMatrix();
      const tourPlaced = placeFirstPersonCamera(
        runtime.camera,
        runtime.villaRoot,
        current.activeTourStopId,
        { presentation: !isExplore }
      );
      runtime.firstPersonAvailable = tourPlaced;
      setFirstPersonReady(tourPlaced);
      if (tourPlaced && isExplore) {
        runtime.camera.rotation.reorder('YXZ');
      }

      const activeStop = TOUR_STOPS.find((stop) => stop.id === current.activeTourStopId);
      if (!isExplore && activeStop) {
        setWalkStatus({
          stopId: activeStop.id,
          label: activeStop.title,
          floor: activeStop.floor,
          edgeType: null
        });
      } else {
        const nearest = nearestTourStop(runtime.walkGraph, runtime.camera.position);
        if (nearest) {
          runtime.lightingStopId = nearest.id;
          setWalkStatus({ stopId: nearest.id, label: nearest.title, floor: nearest.floor, edgeType: null });
        }
      }

      syncLighting();
      if (!wasFirstPerson || !isExplore) setHasInteracted(false);
      return;
    }

    runtime.isExplore = false;
    setFirstPersonReady(false);
    if (runtime.orbitControls) {
      const damping = runtime.orbitControls.enableDamping;
      runtime.orbitControls.enableDamping = false;
      runtime.orbitControls.update();
      runtime.orbitControls.enableDamping = damping;
    }
    runtime.camera.position.fromArray(OVERVIEW_POSITION);
    updateOverviewProjection(runtime.camera);

    if (runtime.orbitControls) {
      runtime.orbitControls.target.fromArray(OVERVIEW_TARGET);
      runtime.orbitControls.update();
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const scene = createScene(THREE);
    const camera = createCamera(THREE);
    camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    updateOverviewProjection(camera);

    const renderer = createRenderer(THREE, container);
    const framePacer = createFramePacer(renderer.getContext());
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('role', 'application');
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D residence');
    renderer.domElement.setAttribute('aria-describedby', viewerNoteId);

    const { ambient, hemisphere, sun, fill, environment } = createLights(THREE, scene, renderer);
    if (container.clientWidth < 640) sun.shadow.mapSize.set(1024, 1024);
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.target.fromArray(OVERVIEW_TARGET);
    orbitControls.minDistance = 8;
    orbitControls.maxDistance = 60;
    orbitControls.maxPolarAngle = Math.PI * 0.49;

    const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    setIsTouchUi(isTouchDevice);

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
      isTouchDevice,
      isDrone: false,
      isFirstPerson: false,
      isExplore: false,
      villaRoot: null,
      interiorLightGroup: null,
      walkGraph: null,
      currentWalkEdgeId: null,
      lightingStopId: null,
      firstPersonAvailable: false,
      keys: new Set(),
      touchLook: { active: false, pointerId: null, x: 0, y: 0 },
      statusTimer: 0,
      atmosphere: null,
      water: null,
      details: null,
      visible: true,
      elapsed: 0,
      atmosphereDelta: 0,
      shadowElapsed: 0,
      lastFrameTime: performance.now(),
      frameId: null
    };
    runtime.needsRender = true;
    /** Mark the scene dirty so the animation loop draws a frame even when the camera is idle. */
    const requestRender = () => { runtime.needsRender = true; };
    runtime.drone = createDroneFlight({
      camera, element: renderer.domElement, onChange: requestRender,
      onActivity: () => setHasInteracted(true), onExit: () => setDroneMode(false)
    });
    /** Invalidate cached shadows and the presentation frame after Three.js restores GPU resources. */
    const contextRestored = () => {
      framePacer.restored();
      // Three rebuilds GPU resources, so both cached shadows and the idle
      // presentation frame must be drawn again after context recovery.
      renderer.shadowMap.needsUpdate = true;
      runtime.interiorLightGroup?.traverse((object) => {
        if (object.isLight && object.shadow) object.shadow.needsUpdate = true;
      });
      requestRender();
    };
    renderer.domElement.addEventListener('webglcontextrestored', contextRestored);
    orbitControls.addEventListener('change', requestRender);
    runtimeRef.current = runtime;
    const visibilityObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      runtime.visible = entry.isIntersecting;
      runtime.lastFrameTime = performance.now();
      if (runtime.visible) requestRender();
    }, { rootMargin: '80px' });
    visibilityObserver?.observe(container);
    const visibilityChanged = () => { runtime.lastFrameTime = performance.now(); requestRender(); };
    document.addEventListener('visibilitychange', visibilityChanged);
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionPreferenceChanged = (event) => { if (event.matches) setMotion(false); };
    motionPreference.addEventListener?.('change', motionPreferenceChanged);

    setModelState('loading');
    setModelProgress(null);
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
        if (runtime.disposed) { disposeObject(gltf.scene); return; }

        runtime.villaRoot = gltf.scene;
        runtime.villaRoot.name = 'dubai_luxury_villa_active';
        runtime.villaRoot.rotation.y = Math.PI;
        restoreProceduralMaterialColors(runtime.villaRoot);
        runtime.villaRoot.traverse((object) => {
          if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });

        const stairReport = applyStairPresentation(runtime.villaRoot);
        const poolReport = applyPoolPresentation(THREE, runtime.villaRoot);
        container.dataset.stairRepair = JSON.stringify(stairReport);
        container.dataset.poolRepair = JSON.stringify(poolReport);

        setImportedLightCount(neutralizeImportedLights(runtime.villaRoot));
        scene.add(runtime.villaRoot);
        runtime.villaRoot.updateMatrixWorld(true);

        const quality = runtime.isTouchDevice || container.clientWidth < 640 ? 'mobile' : 'desktop';
        runtime.atmosphere = createAtmosphere(THREE, { scene, renderer, camera, root: runtime.villaRoot, quality });
        runtime.water = createLivingWater(THREE, { scene, renderer, root: runtime.villaRoot, quality });
        runtime.details = createLivingDetails(THREE, { scene, root: runtime.villaRoot, quality });
        container.dataset.atmosphereReport = JSON.stringify(runtime.atmosphere.report);
        container.dataset.waterReport = JSON.stringify(runtime.water.report);
        container.dataset.detailsReport = JSON.stringify(runtime.details.report);

        runtime.interiorLightGroup = createInteriorLights(THREE, scene, runtime.villaRoot, 1);
        setInteriorLightCount(runtime.interiorLightGroup.userData.fixtureCount ?? 0);
        renderer.shadowMap.needsUpdate = true;

        runtime.walkGraph = buildWalkGraph(runtime.villaRoot);
        setWalkGraphReady(runtime.walkGraph.edges.length >= 4);

        syncMaterial();
        syncLighting();
        syncView();
        setModelLoadCount((count) => count + 1);
        setModelProgress(100);
        setModelState('loaded');
      },
      (event) => {
        if (runtime.disposed || !event.total) return;
        const next = Math.min(99, Math.max(1, Math.round((event.loaded / event.total) * 100)));
        setModelProgress((current) => current === next ? current : next);
      },
      (error) => {
        if (runtime.disposed) return;
        console.warn('villa.glb failed to load; using fallback massing', error);
        runtime.villaRoot = buildFallbackMassing(
          scene,
          latestPropsRef.current.material?.swatch ?? '#d8c8ad'
        );
        setModelProgress(null);
        renderer.shadowMap.needsUpdate = true;
        requestRender();
        setModelState('fallback');
      }
    );

    const disposeKeyboard = bindWalkthroughKeyboard({
      runtime,
      mobileMotionRef,
      element: renderer.domElement,
      windowTarget: window,
      documentTarget: document,
      onInteract: () => setHasInteracted(true),
      onPause: () => setHasInteracted(false)
    });

    /** Capture one primary pointer for mouse or touch look-around without browser pointer lock. */
    const pointerDown = (event) => {
      if (!runtime.isExplore || !runtime.firstPersonAvailable
        || runtime.touchLook.active || event.button !== 0) return;
      setHasInteracted(true);
      renderer.domElement.focus({ preventScroll: true });
      runtime.touchLook.active = true;
      runtime.touchLook.pointerId = event.pointerId;
      runtime.touchLook.x = event.clientX;
      runtime.touchLook.y = event.clientY;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };

    /** Apply the captured pointer's movement to yaw and bounded pitch, then request a frame. */
    const pointerMove = (event) => {
      const touchLook = runtime.touchLook;
      if (!runtime.isExplore || !runtime.firstPersonAvailable
        || !touchLook.active || touchLook.pointerId !== event.pointerId) return;
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
      requestRender();
    };

    const pointerUp = (event) => {
      if (runtime.touchLook.pointerId !== event.pointerId) return;
      runtime.touchLook.active = false;
      runtime.touchLook.pointerId = null;
    };

    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('pointercancel', pointerUp);
    renderer.domElement.addEventListener('lostpointercapture', pointerUp);

    /** Resize the drawing buffer and refresh the active mode's projection without resetting camera position. */
    const resize = () => {
      const width = container.clientWidth;
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      if (runtime.isDrone) {
        camera.fov = camera.aspect < 1 ? 72 : 60;
        camera.updateProjectionMatrix();
      } else if (runtime.isFirstPerson) {
        const stop = TOUR_STOPS.find((item) => item.id === latestPropsRef.current.activeTourStopId);
        updateTourCameraProjection(camera, stop, { presentation: !runtime.isExplore });
      } else {
        updateOverviewProjection(camera);
      }
      requestRender();
    };
    window.addEventListener('resize', resize);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(container);
    resize();

    /**
     * Advance active controls with a capped frame delta and constrain walking to the authored route.
     * Render only dirty frames and publish camera diagnostics after rendering for synchronized browser QA.
     */
    const animate = (now = performance.now()) => {
      runtime.frameId = requestAnimationFrame(animate);
      const delta = Math.min((now - runtime.lastFrameTime) / 1000, 0.05);
      runtime.lastFrameTime = now;

      // A resting, hidden scene must not spend frames on weather effects.
      if (document.hidden || !runtime.visible) return;
      // Keep at most one frame in flight so a slow GPU cannot block page input
      // behind an ever-growing queue of weather renders. Dirty state is retained.
      const canSubmitFrame = framePacer.ready();
      if (latestPropsRef.current.motion && runtime.atmosphere) {
        runtime.atmosphereDelta += delta;
        const frameBudget = runtime.isTouchDevice ? 1 / 24 : 1 / 30;
        if (canSubmitFrame && framePacer.canAnimate() && runtime.atmosphereDelta >= frameBudget) {
          const step = Math.min(runtime.atmosphereDelta, 0.08);
          runtime.atmosphereDelta = 0;
          runtime.elapsed += step;
          const skyChanged = runtime.atmosphere.update(step);
          const waterChanged = runtime.water?.update(step);
          const detailsChanged = runtime.details?.update(step);
          runtime.shadowElapsed += step;
          if (detailsChanged && runtime.shadowElapsed >= 0.25) {
            renderer.shadowMap.needsUpdate = true;
            runtime.shadowElapsed = 0;
          }
          if (skyChanged || waterChanged || detailsChanged) requestRender();
        }
      } else {
        runtime.atmosphereDelta = 0;
      }

      if (runtime.orbitControls?.enabled) runtime.orbitControls.update();
      runtime.drone.update(delta);

      const desktopCanWalk = canUseWalkthroughKeyboard(runtime, renderer.domElement, document);
      const touchCanWalk = Boolean(
        runtime.isTouchDevice && runtime.isExplore && runtime.firstPersonAvailable
      );

      if (desktopCanWalk || touchCanWalk) {
        const keyboardForward =
          (runtime.keys.has('KeyW') || runtime.keys.has('ArrowUp') ? 1 : 0)
          - (runtime.keys.has('KeyS') || runtime.keys.has('ArrowDown') ? 1 : 0);
        const keyboardRight =
          (runtime.keys.has('KeyD') || runtime.keys.has('ArrowRight') ? 1 : 0)
          - (runtime.keys.has('KeyA') || runtime.keys.has('ArrowLeft') ? 1 : 0);
        const forwardInput = THREE.MathUtils.clamp(
          keyboardForward + mobileMotionRef.current.forward,
          -1,
          1
        );
        const rightInput = THREE.MathUtils.clamp(
          keyboardRight + mobileMotionRef.current.right,
          -1,
          1
        );

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

          const constrained = constrainToWalkGraph(
            desired,
            runtime.walkGraph,
            runtime.currentWalkEdgeId
          );
          camera.position.copy(constrained.position);
          requestRender();
          runtime.currentWalkEdgeId = constrained.edge?.id ?? runtime.currentWalkEdgeId;
        }

        runtime.statusTimer += delta;
        if (runtime.statusTimer >= 0.25) {
          runtime.statusTimer = 0;
          const nearest = nearestTourStop(runtime.walkGraph, camera.position);
          const currentEdge = runtime.walkGraph?.edges?.find(
            (edge) => edge.id === runtime.currentWalkEdgeId
          ) ?? null;
          if (nearest) {
            if (runtime.lightingStopId !== nearest.id) {
              runtime.lightingStopId = nearest.id;
              syncLighting();
            }
            setWalkStatus((previous) => {
              const next = {
                stopId: nearest.id,
                label: nearest.title,
                floor: nearest.floor,
                edgeType: currentEdge?.type ?? null
              };
              return previous.stopId === next.stopId
                && previous.label === next.label
                && previous.floor === next.floor
                && previous.edgeType === next.edgeType
                ? previous
                : next;
            });
          }
        }
      }

      if (runtime.needsRender && canSubmitFrame) {
        renderer.render(scene, camera);
        framePacer.submitted();
        // Mark the mode of this rendered frame, not only React's requested mode.
        // Browser QA must not sample the previous camera while a new frame is pending.
        container.dataset.renderedInteractionMode = runtime.isDrone ? 'drone' : runtime.isFirstPerson ? (runtime.isExplore ? 'explore' : 'guided') : 'orbit';
        container.dataset.cameraPosition = camera.position.toArray().map((value) => value.toFixed(3)).join(',');
        container.dataset.cameraDirection = camera.getWorldDirection(new THREE.Vector3()).toArray().map((value) => value.toFixed(3)).join(',');
        container.dataset.atmosphereTime = runtime.elapsed.toFixed(3);
        container.dataset.renderedWeather = latestPropsRef.current.weather;
        container.dataset.renderedLighting = latestPropsRef.current.lightingMode?.name ?? '';
        container.dataset.renderedMotion = latestPropsRef.current.motion ? 'running' : 'paused';
        runtime.needsRender = false;
      }
    };
    animate();

    return () => {
      runtime.disposed = true;
      if (runtime.frameId) cancelAnimationFrame(runtime.frameId);
      framePacer.dispose();
      window.removeEventListener('resize', resize);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      motionPreference.removeEventListener?.('change', motionPreferenceChanged);
      disposeKeyboard();
      runtime.drone.dispose();
      renderer.domElement.removeEventListener('webglcontextrestored', contextRestored);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', pointerUp);
      renderer.domElement.removeEventListener('lostpointercapture', pointerUp);
      runtime.orbitControls?.removeEventListener('change', requestRender);
      runtime.orbitControls?.dispose();
      mobileMotionRef.current = { forward: 0, right: 0 };
      runtime.details?.dispose();
      runtime.water?.dispose();
      runtime.atmosphere?.dispose();
      scene.traverse((object) => { if (object.isLight) object.shadow?.dispose(); });
      if (runtime.interiorLightGroup) scene.remove(runtime.interiorLightGroup);
      if (runtime.villaRoot) {
        scene.remove(runtime.villaRoot);
        disposeObject(runtime.villaRoot);
      }
      scene.environment = null;
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, [viewerNoteId]);

  useEffect(() => {
    syncLighting();
  }, [lightingMode, tourMode, activeTourStopId, droneMode, weather, wind, motion]);

  useEffect(() => {
    syncMaterial();
  }, [material]);

  useEffect(() => {
    syncView();
  }, [selectedRoom, tourMode, activeTourStopId, interactionMode, droneMode, viewRequestId]);

  useEffect(() => {
    setInteractionMode('guided');
    setDroneMode(false);
    setHasInteracted(false);
  }, [tourMode, activeTourStopId, viewRequestId]);

  const activeStop = TOUR_STOPS.find((stop) => stop.id === activeTourStopId) ?? TOUR_STOPS[0];
  const isFirstPerson = !droneMode && tourMode && activeTourStopId !== 'overview';
  const isExplore = isFirstPerson && interactionMode === 'explore';
  const runtimeLightingProfile = resolveRuntimeLighting(
    lightingMode,
    isExplore ? (walkStatus.stopId ?? activeTourStopId) : activeTourStopId,
    isFirstPerson
  ).profile;

  const guidedStops = TOUR_STOPS.filter((stop) => stop.id !== 'overview');
  const guidedIndex = guidedStops.findIndex((stop) => stop.id === activeTourStopId);
  const previousStop = guidedIndex > 0 ? guidedStops[guidedIndex - 1] : null;
  const nextStop = guidedIndex >= 0 && guidedIndex < guidedStops.length - 1
    ? guidedStops[guidedIndex + 1]
    : null;

  const setMobileMotion = (axis, value) => {
    if (value !== 0) setHasInteracted(true);
    mobileMotionRef.current = { ...mobileMotionRef.current, [axis]: value };
  };

  /** Leave Drone mode and request the exterior stop through the parent's shared navigation state. */
  const returnToOverview = () => {
    setDroneMode(false);
    onSelectTourStop?.(TOUR_STOPS[0]);
  };
  /**
   * Clear held flight input and move the drone camera to the living-area walk anchor.
   * Retain flight projection, restore canvas focus and request the new frame.
   */
  const flyInside = () => {
    const runtime = runtimeRef.current;
    if (!runtime?.villaRoot) return;
    runtime.drone.reset();
    placeFirstPersonCamera(runtime.camera, runtime.villaRoot, 'living', { presentation: false });
    runtime.camera.fov = runtime.camera.aspect < 1 ? 72 : 60;
    runtime.camera.updateProjectionMatrix();
    runtime.renderer.domElement.focus({ preventScroll: true });
    runtime.needsRender = true;
  };
  /**
   * Bind a movement-pad axis to pointer and keyboard holds.
   * Stop that axis on release, cancellation, capture loss or blur so a held button cannot keep flying.
   */
  const droneButtonProps = (axis, value) => ({
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      runtimeRef.current?.renderer.domElement.focus({ preventScroll: true });
      runtimeRef.current?.drone.setMotion(axis, value);
    },
    onPointerUp: () => runtimeRef.current?.drone.setMotion(axis, 0),
    onPointerCancel: () => runtimeRef.current?.drone.setMotion(axis, 0),
    onLostPointerCapture: () => runtimeRef.current?.drone.setMotion(axis, 0),
    onKeyDown: (event) => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); runtimeRef.current?.drone.setMotion(axis, value); } },
    onKeyUp: () => runtimeRef.current?.drone.setMotion(axis, 0),
    onBlur: () => runtimeRef.current?.drone.setMotion(axis, 0),
  });

  const switchMode = (mode) => {
    setHasInteracted(false);
    setInteractionMode(mode);
  };

  return (
    <section>
      <div className="viewer-heading">
        <div>
          <p className="eyebrow">Your own perspective</p>
          <h2>{droneMode ? 'Fly through the residence' : isFirstPerson ? activeStop.title : 'The residence, in 3D'}</h2>
        </div>
        <p>
          {droneMode ? 'Drag to look · move freely, inside and outside' : isFirstPerson
            ? isExplore
              ? 'Drag to look around. Walk through the connected spaces.'
              : 'Follow the arrows, or explore at your own pace.'
            : 'Drag to orbit · choose Drone flight to move freely'}
        </p>
      </div>

      <div className="scene-navigation" role="group" aria-label="Scene navigation">
        <button type="button" aria-pressed={!droneMode && !isFirstPerson} onClick={returnToOverview} disabled={modelState !== 'loaded'}>Orbit overview</button>
        <button type="button" aria-pressed={droneMode} onClick={() => setDroneMode(true)} disabled={modelState !== 'loaded'}>Drone flight</button>
        <button type="button" onClick={() => { setDroneMode(false); onSelectTourStop?.(TOUR_STOPS.find((stop) => stop.id === 'entry')); }} disabled={modelState !== 'loaded'}>Go inside <span aria-hidden="true">↗</span></button>
      </div>
      <AtmosphereControls weather={weather} setWeather={setWeather} wind={wind} setWind={setWind} motion={motion} setMotion={setMotion} />
      <div className="three-canvas-shell">
        <div
          ref={mountRef}
          className="three-canvas"
          data-model-state={modelState}
          data-weather={weather}
          data-wind={wind}
          data-atmosphere-motion={motion ? 'running' : 'paused'}
          data-model-progress={modelProgress ?? ''}
          data-model-load-count={modelLoadCount}
          data-viewer-runtime={VIEWER_RUNTIME_PROFILE}
          data-view-mode={droneMode ? 'drone' : isFirstPerson ? 'first-person' : 'orbit'}
          data-interaction-mode={droneMode ? 'drone' : isFirstPerson ? interactionMode : 'orbit'}
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
          data-navigation-anchor-mode="guided-presentation-explore-anchor-v2"
          aria-label="Interactive Dubai luxury villa virtual tour prototype"
        />

        {modelState === 'loading' && (
          <div className="viewer-loading" role="status" aria-live="polite">
            <span className="viewer-loading__pulse" aria-hidden="true" />
            <div className="viewer-loading__copy">
              <strong>
                {modelProgress !== null ? `Loading villa · ${modelProgress}%` : 'Loading villa…'}
              </strong>
              <span>Preparing the 3D walkthrough</span>
              <div className="viewer-loading__track" aria-hidden="true">
                <i style={{ width: `${modelProgress ?? 8}%` }} />
              </div>
            </div>
          </div>
        )}

        {droneMode && <>
          <div className="drone-help"><strong>Free flight</strong><span>{isTouchUi ? 'Drag to look. Hold a control to move.' : 'Drag to look · WASD to move · E up / Q down'}</span><small>Fly freely through the concept model.</small></div>
          <button className="drone-inside" type="button" onClick={flyInside}>Fly inside ↗</button>
          <div className="drone-pad" role="group" aria-label="Drone movement controls">
            <button type="button" aria-label="Fly left" {...droneButtonProps('right', -1)}>←</button>
            <button type="button" aria-label="Fly forward" {...droneButtonProps('forward', 1)}>↑</button>
            <button type="button" aria-label="Fly right" {...droneButtonProps('right', 1)}>→</button>
            <button type="button" aria-label="Descend" {...droneButtonProps('up', -1)}>−</button>
            <button type="button" aria-label="Fly backward" {...droneButtonProps('forward', -1)}>↓</button>
            <button type="button" aria-label="Ascend" {...droneButtonProps('up', 1)}>+</button>
          </div>
        </>}
        {isFirstPerson && (
          <>
            <div className="first-person-hud" aria-live="polite">
              <strong>{walkStatus.label || activeStop.title}</strong>
              <span>
                {walkStatus.floor ? `Floor ${walkStatus.floor}` : 'Site'}
                {walkStatus.edgeType ? ` · ${walkStatus.edgeType}` : ''}
                {' · '}
                {isExplore
                  ? walkGraphReady ? 'Explore' : firstPersonReady ? 'Explore' : 'Preparing route'
                  : 'Guided view'}
              </span>
            </div>

            {onExitTour && (
              <button
                type="button"
                className="viewer-exit-tour"
                onClick={onExitTour}
                aria-label="Exit walkthrough"
              >
                Exit
              </button>
            )}

            <div className="viewer-mode-switch" role="group" aria-label="Walkthrough mode">
              <button
                type="button"
                className={interactionMode === 'guided' ? 'is-active' : ''}
                aria-pressed={interactionMode === 'guided'}
                onClick={() => switchMode('guided')}
              >
                Guided
              </button>
              <button
                type="button"
                className={interactionMode === 'explore' ? 'is-active' : ''}
                aria-pressed={interactionMode === 'explore'}
                onClick={() => switchMode('explore')}
              >
                Explore
              </button>
            </div>

            {isExplore && !hasInteracted && (
              <div className="walkthrough-onboarding" role="status">
                <strong>{isTouchUi ? 'Drag to look' : 'Drag the view to look around'}</strong>
                <span>
                  {isTouchUi
                    ? 'Use the movement pad to walk.'
                    : 'Click the view, then use WASD or arrow keys to walk · Shift speeds up · Esc pauses.'}
                </span>
              </div>
            )}

            {!isExplore && onSelectTourStop && guidedIndex >= 0 && (
              <nav className="viewer-guided-controls" aria-label="Guided walkthrough controls">
                <button
                  type="button"
                  disabled={!previousStop}
                  onClick={() => previousStop && onSelectTourStop(previousStop)}
                  aria-label="Previous stop"
                >
                  ←
                </button>
                <span><strong>{guidedIndex + 1}</strong> / {guidedStops.length}</span>
                <button
                  type="button"
                  disabled={!nextStop}
                  onClick={() => nextStop && onSelectTourStop(nextStop)}
                  aria-label="Next stop"
                >
                  →
                </button>
              </nav>
            )}

            {isExplore && isTouchUi && (
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
            )}
          </>
        )}
      </div>

      <p className="viewer-note" id={viewerNoteId}>
        Explore the villa, change the weather, or pause to study the light. Drone flight moves freely; Go inside starts the room-by-room tour.
      </p>
    </section>
  );
}
