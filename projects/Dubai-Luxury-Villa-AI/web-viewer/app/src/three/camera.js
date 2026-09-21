// A lower pool-side angle preserves the horizontal proportions of the house.
export const OVERVIEW_TARGET = [0, 2.2, 2.0];
export const OVERVIEW_POSITION = [-13.8, 5.9, 20.3];

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
