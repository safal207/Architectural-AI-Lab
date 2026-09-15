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

function placeFirstPersonCamera(camera, root, activeStopId) {
  const stop = TOUR_STOPS.find((item) => item.id === activeStopId);
  const node = findTourNode(root, stop);
  if (!stop || !node) return false;

  const position = new THREE.Vector3();
  node.getWorldPosition(position);
  camera.position.copy(position);

  const index = TOUR_STOPS.findIndex((item) => item.id === stop.id);
  let target = null;
  for (let offset = 1; offset < TOUR_STOPS.length; offset += 1) {
    const candidate = TOUR_STOPS[(index + offset) % TOUR_STOPS.length];
    const candidateNode = findTourNode(root, candidate);
    if (!candidateNode) continue;
    target = new THREE.Vector3();
    candidateNode.getWorldPosition(target);
    if (target.distanceTo(position) > 0.25) break;
    target = null;
  }

  if (!target) target = position.clone().add(new THREE.Vector3(0, 0, -4));
  target.y = Math.max(target.y, position.y - 0.35);
  camera.lookAt(target);
  return true;
}

export default function VillaViewer({
  selectedRoom,
  lightingMode,
  material,
  tourMode = false,
  activeTourStopId = 'overview'
}) {
  const mountRef = useRef(null);
  const [modelState, setModelState] = useState('loading');
  const [firstPersonReady, setFirstPersonReady] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    let disposed = false;
    let villaRoot = null;
    let frameId = null;
    let orbitControls = null;
    let firstPersonControls = null;
    let lastFrameTime = performance.now();
    const keys = new Set();

    setModelState('loading');
    setFirstPersonReady(false);

    const scene = createScene(THREE);
    scene.background = new THREE.Color(lightingMode?.name === 'Night' ? '#08111c' : '#dfe8ee');

    const camera = createCamera(THREE);
    camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    camera.updateProjectionMatrix();
    camera.position.set(18, 12, 20);

    const renderer = createRenderer(THREE, container);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(scene.background);

    const { ambient, sun } = createLights(THREE, scene);
    const intensity = lightingMode?.intensity ?? 1;
    ambient.intensity = 0.75 * intensity + 0.18;
    sun.intensity = 2.1 * intensity;

    if (tourMode && activeTourStopId !== 'overview') {
      firstPersonControls = new PointerLockControls(camera, renderer.domElement);
    } else {
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

        let tourPlaced = false;
        if (tourMode && activeTourStopId !== 'overview') {
          tourPlaced = placeFirstPersonCamera(camera, villaRoot, activeTourStopId);
          setFirstPersonReady(tourPlaced);
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
      if (firstPersonControls && modelState !== 'fallback') firstPersonControls.lock();
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    renderer.domElement.addEventListener('click', lockFirstPerson);

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

      if (firstPersonControls?.isLocked) {
        const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 6.0 : 3.0;
        if (keys.has('KeyW') || keys.has('ArrowUp')) firstPersonControls.moveForward(speed * delta);
        if (keys.has('KeyS') || keys.has('ArrowDown')) firstPersonControls.moveForward(-speed * delta);
        if (keys.has('KeyA') || keys.has('ArrowLeft')) firstPersonControls.moveRight(-speed * delta);
        if (keys.has('KeyD') || keys.has('ArrowRight')) firstPersonControls.moveRight(speed * delta);
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
  }, [selectedRoom, lightingMode, material, tourMode, activeTourStopId]);

  const activeStop = TOUR_STOPS.find((stop) => stop.id === activeTourStopId) ?? TOUR_STOPS[0];
  const isFirstPerson = tourMode && activeTourStopId !== 'overview';

  return (
    <section>
      <div className="viewer-heading">
        <div>
          <p className="eyebrow">Native Blender GLB · interactive tour viewer</p>
          <h2>{isFirstPerson ? `First-person · ${activeStop.title}` : '3D Villa Viewer'}</h2>
        </div>
        <p>
          {isFirstPerson
            ? 'Click inside the 3D view to look around · WASD to walk · Shift to move faster · Esc to release cursor'
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
          aria-label="Interactive Dubai luxury villa virtual tour prototype"
        />
        {isFirstPerson && (
          <div className="first-person-hud" aria-live="polite">
            <strong>{activeStop.order}. {activeStop.title}</strong>
            <span>{firstPersonReady ? 'Camera at tour anchor · click view to enter' : 'Using nearest verified room anchor until the interior-tour asset is promoted'}</span>
          </div>
        )}
      </div>
      <p className="viewer-note">
        The house plan and guided camera path are presentation/navigation features. Free-walk mode currently has no collision or navmesh guarantee; the measured plan and construction geometry remain outside this prototype scope.
      </p>
    </section>
  );
}
