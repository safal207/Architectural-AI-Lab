import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScene } from './three/scene';
import { createCamera } from './three/camera';
import { createRenderer } from './three/renderer';
import { createLights } from './three/lights';

function addBox(scene, size, position, color) {
  const geometry = new THREE.BoxGeometry(...size);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.48 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function buildMassing(scene, accentColor) {
  const group = new THREE.Group();
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

  const wing = new THREE.Mesh(new THREE.BoxGeometry(4.1, 2.7, 4.3), baseMaterial.clone());
  wing.position.set(5.5, 1.35, 1.0);
  group.add(wing);

  const pool = new THREE.Mesh(
    new THREE.BoxGeometry(8.2, 0.18, 3.3),
    new THREE.MeshStandardMaterial({ color: '#3bbbc9', metalness: 0.05, roughness: 0.18 })
  );
  pool.position.set(-2.2, 0.05, 5.1);
  group.add(pool);

  const glass = new THREE.MeshStandardMaterial({
    color: '#9fc5d6',
    transparent: true,
    opacity: 0.38,
    metalness: 0.12,
    roughness: 0.08
  });

  for (const x of [-4.8, -2.7, -0.6, 1.5]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.2, 0.08), glass);
    panel.position.set(x, 1.7, 3.64);
    group.add(panel);
  }

  group.rotation.y = -0.28;
  return group;
}

export default function VillaViewer({ selectedRoom, lightingMode, material }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const scene = createScene(THREE);
    scene.background = new THREE.Color(lightingMode?.name === 'Night' ? '#08111c' : '#dfe8ee');

    const camera = createCamera(THREE);
    camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    camera.updateProjectionMatrix();
    camera.position.set(15, 10, 16);

    const renderer = createRenderer(THREE, container);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(scene.background);

    const { ambient, sun } = createLights(THREE, scene);
    const intensity = lightingMode?.intensity ?? 1;
    ambient.intensity = 0.75 * intensity + 0.18;
    sun.intensity = 2.1 * intensity;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 2.1, 0.8);
    controls.minDistance = 7;
    controls.maxDistance = 35;

    const villa = buildMassing(scene, material?.swatch ?? '#d8c8ad');

    const roomFocus = {
      'living-room': new THREE.Vector3(-1.8, 2.0, 2.8),
      'master-bedroom': new THREE.Vector3(1.7, 4.8, 1.6),
      'pool-terrace': new THREE.Vector3(-2.0, 0.4, 5.0)
    };

    if (selectedRoom?.id && roomFocus[selectedRoom.id]) {
      controls.target.copy(roomFocus[selectedRoom.id]);
    }

    const resize = () => {
      const width = container.clientWidth;
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', resize);
    resize();

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      controls.dispose();
      scene.remove(villa);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [selectedRoom, lightingMode, material]);

  return (
    <section>
      <div className="viewer-heading">
        <div>
          <p className="eyebrow">Interactive massing v0.1</p>
          <h2>3D Villa Viewer</h2>
        </div>
        <p>
          Drag to orbit · scroll to zoom · select a room to change focus
        </p>
      </div>
      <div ref={mountRef} className="three-canvas" aria-label="Interactive 3D villa massing" />
      <p className="viewer-note">
        Current geometry is a concept massing generated in Three.js, not the final Blender/GLB villa.
      </p>
    </section>
  );
}
