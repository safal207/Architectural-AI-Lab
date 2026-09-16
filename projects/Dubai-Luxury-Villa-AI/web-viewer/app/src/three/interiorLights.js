const FIXTURE_GROUPS = [
  {
    names: ['living_downlight_v04_00', 'living_downlight_v04_01', 'living_downlight_v04_02'],
    color: 0xffe0b6,
    intensity: 54,
    distance: 4.8,
    drop: 0.16
  },
  {
    names: ['dining_pendant_r6_00', 'dining_pendant_r6_01', 'dining_pendant_r6_02'],
    color: 0xffd39a,
    intensity: 46,
    distance: 4.2,
    drop: 0.18
  },
  {
    names: ['master_bedside_lamp_v04_00', 'master_bedside_lamp_v04_01'],
    color: 0xffd0a3,
    intensity: 32,
    distance: 3.8,
    drop: -0.06
  },
  {
    names: ['upper_linear_light_r6'],
    color: 0xffe1b9,
    intensity: 88,
    distance: 6.4,
    drop: 0.22
  }
];

function addPointFromNode(THREE, group, root, definition, nodeName, multiplier) {
  const node = root.getObjectByName(nodeName);
  if (!node) return 0;

  const position = new THREE.Vector3();
  node.getWorldPosition(position);
  position.y -= definition.drop;

  const light = new THREE.PointLight(
    definition.color,
    definition.intensity * multiplier,
    definition.distance,
    2
  );
  light.name = `runtime_${nodeName}`;
  light.position.copy(position);
  light.castShadow = false;
  group.add(light);
  return 1;
}

/**
 * Adds a browser-owned interior light layer at authored fixture anchors.
 *
 * Blender punctual lights are intentionally stripped from the web GLB because
 * their exported physical intensities stack unpredictably with the Three.js
 * day/evening/night rig. These restrained runtime lights restore local depth
 * around furniture, stairs and thresholds while keeping one lighting engine in
 * control of exposure and mode transitions.
 */
export function createInteriorLights(THREE, scene, root, multiplier = 1) {
  const group = new THREE.Group();
  group.name = 'runtime_interior_lights';
  scene.add(group);

  let count = 0;
  for (const definition of FIXTURE_GROUPS) {
    for (const nodeName of definition.names) {
      count += addPointFromNode(THREE, group, root, definition, nodeName, multiplier);
    }
  }

  // Upper Landing gets one additional soft transition fill between the authored
  // stair eye point and look target. This is not a fake camera light: it is a
  // bounded spatial fill for the circulation zone that remains stable while the
  // user moves through the landing and open master-suite threshold.
  const upper = root.getObjectByName('tour_stair_upper');
  const upperTarget = root.getObjectByName('tour_look_stair_upper');
  if (upper && upperTarget) {
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    upper.getWorldPosition(a);
    upperTarget.getWorldPosition(b);
    const midpoint = a.clone().lerp(b, 0.58);
    midpoint.y += 0.95;

    const fill = new THREE.PointLight(0xffe4c5, 60 * multiplier, 5.4, 2);
    fill.name = 'runtime_upper_landing_transition_fill';
    fill.position.copy(midpoint);
    fill.castShadow = false;
    group.add(fill);
    count += 1;
  }

  group.userData.fixtureCount = count;
  return group;
}
