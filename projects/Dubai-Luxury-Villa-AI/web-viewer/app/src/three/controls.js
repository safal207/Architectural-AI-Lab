// Camera interaction controls for future Three.js viewer

export function createControls(THREE, camera, domElement) {
  return {
    camera,
    domElement,
    mode: 'orbit',
    features: [
      'orbit rotation',
      'zoom',
      'room focus',
      'walkthrough mode'
    ]
  };
}
