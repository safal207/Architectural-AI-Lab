// Frame the complete pool and the stair terrace from the pool-side approach.
export const OVERVIEW_TARGET = [0, 2.2, 2.0];
export const OVERVIEW_POSITION = [-16.5, 8.8, 25];

export function updateOverviewProjection(camera) {
  // Keep the horizontal composition on narrow screens without resetting orbit.
  const referenceAspect = 1.6;
  const referenceFov = 40;
  camera.fov = Math.min(82, 2 * Math.atan(
    Math.tan(referenceFov * Math.PI / 360) * referenceAspect / Math.max(camera.aspect, 0.1)
  ) * 180 / Math.PI);
  camera.updateProjectionMatrix();
}

export function createCamera(THREE) {
  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.fromArray(OVERVIEW_POSITION);

  return camera;
}
