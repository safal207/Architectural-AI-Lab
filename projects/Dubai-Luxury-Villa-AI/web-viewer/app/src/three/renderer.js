// WebGL renderer initialization prototype

export function createRenderer(THREE, container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );

  container.appendChild(renderer.domElement);

  return renderer;
}
