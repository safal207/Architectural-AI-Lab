// Three.js lighting setup for Dubai Luxury Villa AI

export function createLights(THREE, scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0d0, 2);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  scene.add(sun);

  return { ambient, sun };
}
