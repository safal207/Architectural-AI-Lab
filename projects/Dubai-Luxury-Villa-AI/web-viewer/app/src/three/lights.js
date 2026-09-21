import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Soft reflected light lets the glazing and metal retain depth between the
// authored fixtures. The environment is generated once and reused in every view.
export function createLights(THREE, scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentScene = new RoomEnvironment();
  const environment = pmrem.fromScene(environmentScene, 0.04);
  environmentScene.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.24;

  const ambient = new THREE.AmbientLight(0xd8e1e6, 0.62);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0xaec8d8, 0x6f6254, 0.42);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xffd9a8, 1.65);
  sun.position.set(-14, 18, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  // Cover the full house and pool, rather than Three's default 10 m square.
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 18, bottom: -18, near: 0.5, far: 70 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x9bb7c8, 0.18);
  fill.position.set(14, 10, -8);
  scene.add(fill);

  return { ambient, hemisphere, sun, fill, environment };
}
