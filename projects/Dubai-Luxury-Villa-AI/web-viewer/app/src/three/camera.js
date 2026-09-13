// Camera controls prototype

export function createCamera(THREE) {
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.set(10, 8, 10);

  return camera;
}
