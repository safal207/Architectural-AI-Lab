// WebGL renderer tuned for luxury architectural presentation.
// Color management is kept here so every viewer mode uses the same photographic baseline.
export function createRenderer(THREE, container) {
  // CI visual gates can opt into a preserved drawing buffer with `?qaCapture=1`.
  // Production keeps the faster default (`false`), so evidence capture does not
  // silently tax the client-facing walkthrough.
  const qaCapture = new URLSearchParams(window.location.search).get('qaCapture') === '1';

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: qaCapture
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  // CSS owns the display size; resizing only updates the drawing buffer.
  renderer.setSize(
    container.clientWidth,
    container.clientHeight,
    false
  );

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.70;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Geometry and fixture positions stay fixed while touring; reuse their shadows.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  renderer.domElement.dataset.qaCapture = qaCapture ? 'preserved' : 'off';
  container.appendChild(renderer.domElement);

  return renderer;
}
