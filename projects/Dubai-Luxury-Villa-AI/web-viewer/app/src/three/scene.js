/** Create the neutral-background scene before the viewer applies its selected atmosphere. */
export function createScene(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cecfc5');
  return scene;
}
