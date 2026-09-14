import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createScene } from './three/scene';
import { createCamera } from './three/camera';
import { createRenderer } from './three/renderer';
import { createLights } from './three/lights';

const ROOM_NODE_NAMES = {
  'living-room': 'living_room',
  'master-bedroom': 'master_bedroom',
  'pool-terrace': 'pool_terrace'
};

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

  const protectedMaterials = new Set(['GlassTint', 'PoolWater', 'MetalTrim', 'Landscape']);

  root.traverse((object) => {
    if (!object.isMesh || !object.material) return;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    object.material = materials.map((source) => {
      if (protectedMaterials.has(source.name)) return source;

      const cloned = source.clone();
      cloned.color = new THREE.Color(selectedMaterial.swatch);
      return cloned;
    });

    if (object.material.length === 1) {
      object.material = object.material[0];
    }
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

export default function VillaViewer({ selectedRoom, lightingMode, material }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    let disposed = false;
    let villaRoot = null;
    let frameId = null;

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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 2.8, 0);
    controls.minDistance = 8;
    controls.maxDistance = 45;

    const loader = new GLTFLoader();
    const modelUrl = `${import.meta.env.BASE_URL}villa.glb`;

    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;

        villaRoot = gltf.scene;
        villaRoot.name = 'dubai_luxury_villa_v01';
        villaRoot.rotation.y = Math.PI;

        villaRoot.traverse((object) => {
          if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });

        applyMaterialConcept(villaRoot, material);
        scene.add(villaRoot);

        const roomNodeName = ROOM_NODE_NAMES[selectedRoom?.id];
        const roomNode = roomNodeName ? villaRoot.getObjectByName(roomNodeName) : null;
        if (roomNode) {
          const target = new THREE.Vector3();
          roomNode.getWorldPosition(target);
          controls.target.copy(target);
        }
      },
      undefined,
      (error) => {
        if (disposed) return;
        console.warn('villa.glb failed to load; using fallback massing', error);
        villaRoot = buildFallbackMassing(scene, material?.swatch ?? '#d8c8ad');
      }
    );

    const resize = () => {
      const width = container.clientWidth;
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', resize);
    resize();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      controls.dispose();
      if (villaRoot) {
        scene.remove(villaRoot);
        disposeObject(villaRoot);
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [selectedRoom, lightingMode, material]);

  return (
    <section>
      <div className="viewer-heading">
        <div>
          <p className="eyebrow">Native Blender GLB prototype v0.1</p>
          <h2>3D Villa Viewer</h2>
        </div>
        <p>Drag to orbit · scroll to zoom · select a room to change focus</p>
      </div>
      <div ref={mountRef} className="three-canvas" aria-label="Interactive Blender-exported villa prototype" />
      <p className="viewer-note">
        The viewer loads the validated Blender headless GLB when available; fallback massing is used only if the asset fails to load.
      </p>
    </section>
  );
}
