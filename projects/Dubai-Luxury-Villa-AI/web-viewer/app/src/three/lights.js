// Balanced architectural lighting: warm key + cool sky fill.
// Individual Day / Evening / Night modes still scale ambient and sun intensity in VillaViewer.
export function createLights(THREE, scene) {
  const ambient = new THREE.AmbientLight(0xd8e1e6, 0.62);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0xaec8d8, 0x6f6254, 0.42);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xffd9a8, 1.65);
  sun.position.set(12, 22, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.00018;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x9bb7c8, 0.18);
  fill.position.set(-12, 10, -8);
  scene.add(fill);

  return { ambient, hemisphere, sun, fill };
}
