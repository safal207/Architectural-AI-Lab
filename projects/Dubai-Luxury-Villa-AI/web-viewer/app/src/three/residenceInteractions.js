const KITCHEN_STYLES = {
  walnut: { label: 'Walnut + limestone', cabinet: '#745744', counter: '#d2c6b2', metal: '#65584a' },
  ivory: { label: 'Ivory + pale oak', cabinet: '#d7d0c0', counter: '#eee7d7', metal: '#8c795b' },
  graphite: { label: 'Graphite + warm stone', cabinet: '#3f4440', counter: '#b6a78e', metal: '#806b4d' }
};
const FURNITURE_STYLES = {
  linen: { label: 'Natural linen', fabric: '#c7baa4', chair: '#ad9a80', rug: '#8a8070', cushion: '#7f8a72' },
  sage: { label: 'Sage + sand', fabric: '#7e8977', chair: '#ac9275', rug: '#b3a68d', cushion: '#d1b99b' },
  charcoal: { label: 'Charcoal + clay', fabric: '#515958', chair: '#826852', rug: '#95816d', cushion: '#ac7960' }
};

/** Authored movable panels, reversible room fit-out and material-only interior choices. */
export function createResidenceInteractions(THREE, { scene, root, renderer, onChange = () => {}, quality = 'desktop' }) {
  const group = new THREE.Group();
  group.name = 'runtime_residence_interactions';
  scene.add(group);
  // Retain authored moving panels inside the model hierarchy for material,
  // picking and rain traversal. Attach preserves the world-aligned fit-out.
  root?.attach(group);
  const actions = [];
  const interactables = [];
  const destinations = {};
  const motions = [];
  const screens = [];
  const geometries = new Set();
  const materials = new Set();
  const restores = [];
  const actionById = new Map();
  const kitchenTargets = [];
  const furnitureTargets = [];
  const state = { kitchenStyle: 'walnut', furnitureStyle: 'linen', motion: true, bathroomCutaway: false };
  const report = {
    profile: 'authored-residence-interactions-v1', quality, actions: [],
    doors: [], windows: [], bathroom: { available: false, cutaway: false },
    kitchenStyle: state.kitchenStyle, furnitureStyle: state.furnitureStyle,
    detailMeshCount: 0, screenCount: 0, additionalLights: 0
  };
  let disposed = false;
  let elapsed = 0;
  const ownGeometry = value => { geometries.add(value); return value; };
  const ownMaterial = value => { materials.add(value); return value; };
  const boundsOf = object => {
    if (!object) return null;
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    return box.isEmpty() ? null : box;
  };
  const tuple = vector => vector.toArray().map(value => Number(value.toFixed(3)));
  const serializeBounds = box => ({ min: tuple(box.min), max: tuple(box.max) });
  function publish(id) {
    report.actions = actions.map(({ id: actionId, label, type, state: value }) => ({ id: actionId, label, type, state: value }));
    if (renderer?.shadowMap) renderer.shadowMap.needsUpdate = true;
    if (id) onChange({ id, report });
  }
  function addAction(id, label, type, value, handler) {
    if (actionById.has(id)) return actionById.get(id);
    const action = { id, label, type, state: value, handler };
    actions.push(action);
    actionById.set(id, action);
    return action;
  }
  function tag(object, id) {
    object.traverse(child => {
      if (!child.isMesh) return;
      const previous = child.userData.residenceActionId;
      child.userData.residenceActionId = id;
      if (!interactables.includes(child)) interactables.push(child);
      restores.push(() => {
        if (previous === undefined) delete child.userData.residenceActionId;
        else child.userData.residenceActionId = previous;
      });
    });
  }
  function mesh(name, geometry, material, position, parent = group) {
    const item = new THREE.Mesh(ownGeometry(geometry), material);
    item.name = `runtime_${name}`;
    item.position.fromArray(position);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    report.detailMeshCount += 1;
    return item;
  }
  function standard(name, color, roughness = 0.65, metalness = 0) {
    return ownMaterial(new THREE.MeshStandardMaterial({ name, color, roughness, metalness }));
  }
  const bronze = standard('InteractionBrushedBronze', '#76664d', 0.38, 0.72);
  const ceramic = standard('BathroomIvoryCeramic', '#e5e2d5', 0.26);
  const tile = standard('BathroomWarmStone', '#bdb4a1', 0.76);
  const grout = standard('BathroomTileJoint', '#898577', 0.92);
  const dark = standard('BathroomDrainDark', '#373c3a', 0.55, 0.4);
  const vanity = standard('BathroomVanityTimber', '#826853', 0.75);
  const cushionMaterial = standard('ConfigurableAccentCushion', '#7f8a72', 0.94);

  function adoptIntoPivot(nodes, worldPosition) {
    const pivot = new THREE.Group();
    pivot.name = `runtime_pivot_${nodes[0].name}`;
    pivot.position.copy(worldPosition);
    group.add(pivot);
    pivot.updateWorldMatrix(true, false);
    for (const node of nodes) {
      const original = { parent: node.parent, index: node.parent.children.indexOf(node), position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() };
      pivot.attach(node);
      restores.push(() => {
        original.parent.add(node);
        node.position.copy(original.position);
        node.quaternion.copy(original.quaternion);
        node.scale.copy(original.scale);
        const children = original.parent.children;
        children.splice(children.indexOf(node), 1);
        children.splice(original.index, 0, node);
        node.updateMatrix();
        node.updateWorldMatrix(false, true);
      });
    }
    return pivot;
  }

  /** Register an existing local hinge pivot, e.g. the estate garage door. */
  function registerHinge({ id, label, object, axis = 'y', angle = Math.PI * 0.48, initiallyOpen = false, onToggle }) {
    if (!object || actionById.has(id)) return actionById.get(id) ?? null;
    const closedQuaternion = object.quaternion.clone();
    const axisVector = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
    const turn = new THREE.Quaternion();
    const motion = { value: initiallyOpen ? 1 : 0, target: initiallyOpen ? 1 : 0, object, apply(value) {
      turn.setFromAxisAngle(axisVector, angle * value);
      object.quaternion.copy(closedQuaternion).multiply(turn);
      object.updateWorldMatrix(false, true);
    } };
    const action = addAction(id, label, 'door', initiallyOpen ? 'open' : 'closed', () => {
      motion.target = motion.target > 0.5 ? 0 : 1;
      action.state = motion.target ? 'opening' : 'closing';
      onToggle?.(Boolean(motion.target));
    });
    motion.action = action;
    motions.push(motion);
    motion.apply(motion.value);
    tag(object, id);
    restores.push(() => { object.quaternion.copy(closedQuaternion); object.updateWorldMatrix(false, true); });
    publish();
    return action;
  }
  function authoredDoor(name, id, label, options = {}) {
    const door = root?.getObjectByName(name);
    const box = boundsOf(door);
    if (!door?.isMesh || !box) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // The hinge follows the thin panel's long horizontal edge, in world space.
    const pivotPosition = center.clone();
    if (size.x > size.z) pivotPosition.x = box.min.x;
    else pivotPosition.z = box.min.z;
    const handle = options.handle ? root.getObjectByName(options.handle) : null;
    const pivot = adoptIntoPivot([door, ...(handle ? [handle] : [])], pivotPosition);
    registerHinge({ id, label, object: pivot, angle: options.angle ?? -Math.PI * 0.48, onToggle: options.onToggle });
    if (!handle) {
      const position = center.clone().sub(pivotPosition);
      if (size.x > size.z) { position.x += size.x * 0.34; position.z += size.z * 0.5 + 0.027; }
      else { position.z += size.z * 0.34; position.x += size.x * 0.5 + 0.027; }
      position.y = box.min.y + 1.05 - pivotPosition.y;
      const pull = mesh(`${id}_handle`, new THREE.BoxGeometry(0.028, 0.28, 0.028), bronze, position.toArray(), pivot);
      tag(pull, id);
    }
    report.doors.push({ id, source: name, bounds: serializeBounds(box) });
  }
  function slidingWindow(name, id, label, direction) {
    const panel = root?.getObjectByName(name);
    const box = boundsOf(panel);
    if (!panel?.isMesh || !box) return;
    const size = box.getSize(new THREE.Vector3());
    const pivot = adoptIntoPivot([panel], box.getCenter(new THREE.Vector3()));
    const closed = pivot.position.clone();
    // Move one selected panel onto its neighbour on a separate track.
    const offset = new THREE.Vector3(size.x * 1.02 * direction, 0, 0.095);
    const motion = { value: 0, target: 0, object: pivot, apply(value) {
      pivot.position.copy(closed).addScaledVector(offset, value);
      pivot.updateWorldMatrix(false, true);
    } };
    const action = addAction(id, label, 'window', 'closed', () => {
      motion.target = motion.target > 0.5 ? 0 : 1;
      action.state = motion.target ? 'opening' : 'closing';
    });
    motion.action = action;
    motions.push(motion);
    tag(panel, id);
    const handle = mesh(`${id}_pull`, new THREE.BoxGeometry(0.024, 0.24, 0.04), bronze,
      [direction * size.x * 0.39, -0.14, size.z / 2 + 0.035], pivot);
    tag(handle, id);
    // The moving pane stacks outboard of its fixed neighbour. A room-side pull
    // extends past both tracks so it stays selectable from indoors when open.
    const interiorZ = -size.z / 2 - 0.17;
    const interiorHandle = mesh(`${id}_interior_pull`, new THREE.BoxGeometry(0.024, 0.24, 0.04), bronze,
      [direction * size.x * 0.39, -0.14, interiorZ], pivot);
    tag(interiorHandle, id);
    for (const vertical of [-0.085, 0.085]) {
      const mounting = mesh(`${id}_interior_pull_mount`, new THREE.BoxGeometry(0.018, 0.018, 0.17), bronze,
        [direction * size.x * 0.39, -0.14 + vertical, -size.z / 2 - 0.085], pivot);
      tag(mounting, id);
    }
    report.windows.push({ id, source: name, bounds: serializeBounds(box), travel: tuple(offset) });
  }

  // Each cloned material is created once. Later configuration updates mutate only
  // its properties, retaining PBR maps and the rain hooks installed by the owner.
  function cloneConfigurable(object, role, collection) {
    if (!object?.isMesh || !object.material) return;
    const original = object.material;
    const list = Array.isArray(original) ? original : [original];
    const cloned = list.map(source => {
      const material = ownMaterial(source.clone());
      material.userData = { ...source.userData, runtimeMaterialClone: true, residenceConfigurationRole: role };
      collection.push({ material, role });
      return material;
    });
    const next = Array.isArray(original) ? cloned : cloned[0];
    object.material = next;
    restores.push(() => { object.material = original; });
  }
  root?.traverse(object => {
    if (/^(kitchen_base_v04_|kitchen_tall_unit_v04|kitchen_island_v04$)/.test(object.name)) cloneConfigurable(object, 'cabinet', kitchenTargets);
    else if (/^kitchen_(counter|island_top)_v04$/.test(object.name)) cloneConfigurable(object, 'counter', kitchenTargets);
    else if (/^living_sofa_|^master_bench_cushion|^master_pillow/.test(object.name)) cloneConfigurable(object, 'fabric', furnitureTargets);
    else if (/^dining_chair_|^island_stool_seat/.test(object.name)) cloneConfigurable(object, 'chair', furnitureTargets);
    else if (/^living_rug$/.test(object.name)) cloneConfigurable(object, 'rug', furnitureTargets);
  });
  furnitureTargets.push({ material: cushionMaterial, role: 'cushion' });
  const sofaBounds = boundsOf(root?.getObjectByName('living_sofa_main'));
  if (sofaBounds) {
    for (let i = 0; i < 3; i++) {
      const pillow = mesh(`sofa_accent_cushion_${i}`, new THREE.BoxGeometry(0.47, 0.39, 0.17), cushionMaterial,
        [sofaBounds.min.x + 0.64 + i * 1.04, sofaBounds.max.y + 0.05, sofaBounds.min.z + 0.17]);
      pillow.rotation.x = -0.16;
      pillow.rotation.z = (i - 1) * 0.06;
    }
  }
  const kitchenAction = addAction('kitchen-style', 'Kitchen finishes', 'style', state.kitchenStyle, () => {
    const ids = Object.keys(KITCHEN_STYLES);
    setState({ kitchenStyle: ids[(ids.indexOf(state.kitchenStyle) + 1) % ids.length] });
  });
  const furnitureAction = addAction('furniture-style', 'Sofa and furniture', 'style', state.furnitureStyle, () => {
    const ids = Object.keys(FURNITURE_STYLES);
    setState({ furnitureStyle: ids[(ids.indexOf(state.furnitureStyle) + 1) % ids.length] });
  });
  for (const name of ['living_sofa_main', 'living_sofa_side']) {
    const object = root?.getObjectByName(name);
    if (object) tag(object, furnitureAction.id);
  }
  const island = root?.getObjectByName('kitchen_island_v04');
  if (island) tag(island, kitchenAction.id);

  const TV_FRAGMENT = `
    uniform float uTime;
    uniform float uPower;
    uniform float uChannel;
    varying vec2 vScreenUV;
    void main() {
      vec2 uv = vScreenUV;
      vec3 color = vec3(0.012, 0.021, 0.025);
      if (uPower > 0.5) {
        if (uChannel < 0.5) {
          color = mix(vec3(0.72,0.47,0.27), vec3(0.12,0.28,0.37), smoothstep(0.15,0.96,uv.y));
          float dune = 0.32 + sin(uv.x * 4.0 + uTime * 0.09) * 0.08;
          color = mix(color, vec3(0.45,0.28,0.16), 1.0 - smoothstep(dune - 0.015,dune,uv.y));
          float sun = 1.0 - smoothstep(0.08,0.09,length((uv - vec2(0.73,0.69)) * vec2(1.78,1.0)));
          color += vec3(0.54,0.38,0.15) * sun;
        } else if (uChannel < 1.5) {
          color = mix(vec3(0.04,0.22,0.25),vec3(0.30,0.64,0.65),uv.y);
          float wave = sin(uv.x * 19.0 + uTime * 0.3 + sin(uv.y * 15.0));
          color += vec3(0.13,0.20,0.16) * smoothstep(0.8,1.0,wave) * (1.0 - uv.y);
        } else {
          vec2 p = uv * vec2(1.78,1.0);
          color = vec3(0.035,0.055,0.060);
          float bars = step(0.10,fract(p.x * 9.0)) * step(fract(p.y * 6.0),0.82);
          color += vec3(0.35,0.24,0.14) * bars * (0.55 + sin(p.y * 8.0 + uTime * 0.1) * 0.15);
        }
        color *= 0.70 + 0.30 * smoothstep(0.0,0.035,min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y)));
      }
      gl_FragColor = vec4(color,1.0);
      #include <colorspace_fragment>
    }
  `;
  /** Attach an independent power/channel control to an existing visible screen. */
  function registerScreen({ id, label, object }) {
    if (!object?.isMesh || screens.some(screen => screen.id === id)) return null;
    const original = object.material;
    const material = ownMaterial(new THREE.ShaderMaterial({
      name: `${id}_live_screen`, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uChannel: { value: 0 } },
      vertexShader: 'varying vec2 vScreenUV; void main(){vScreenUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: TV_FRAGMENT
    }));
    object.material = material;
    const screen = { id, material, power: false, channel: 0 };
    const powerAction = addAction(`${id}-power`, `${label}: power`, 'screen', 'off', () => {
      screen.power = !screen.power;
      material.uniforms.uPower.value = screen.power ? 1 : 0;
      powerAction.state = screen.power ? 'on' : 'off';
    });
    const channelAction = addAction(`${id}-channel`, `${label}: channel`, 'screen', 'Desert', () => {
      screen.channel = (screen.channel + 1) % 3;
      screen.power = true;
      material.uniforms.uChannel.value = screen.channel;
      material.uniforms.uPower.value = 1;
      powerAction.state = 'on';
      channelAction.state = ['Desert', 'Ocean', 'Architecture'][screen.channel];
    });
    screen.powerAction = powerAction;
    screen.channelAction = channelAction;
    screens.push(screen);
    tag(object, powerAction.id);
    restores.push(() => { object.material = original; });
    report.screenCount = screens.length;
    publish();
    return screen;
  }
  const livingScreenSource = root?.getObjectByName('living_screen_v04');
  const screenBounds = boundsOf(livingScreenSource);
  if (screenBounds) {
    const c = screenBounds.getCenter(new THREE.Vector3());
    const size = screenBounds.getSize(new THREE.Vector3());
    const screen = mesh('living_television_display', new THREE.PlaneGeometry(size.x * 0.956, size.y * 0.93), dark,
      [c.x, c.y, screenBounds.max.z + 0.006]);
    screen.castShadow = false;
    registerScreen({ id: 'living-tv', label: 'Living TV', object: screen });
  }

  const bathroomGroup = new THREE.Group();
  bathroomGroup.name = 'runtime_private_core_bathroom';
  bathroomGroup.visible = false;
  group.add(bathroomGroup);
  const core = root?.getObjectByName('ground_right_private_core');
  const coreBounds = boundsOf(core);
  const sourceCoreVisible = core?.visible;
  if (coreBounds) {
    const b = coreBounds;
    const width = b.max.x - b.min.x;
    const length = b.max.z - b.min.z;
    const floorBounds = boundsOf(root.getObjectByName('ground_floor_slab'));
    const floor = Math.max(floorBounds?.max.y ?? b.min.y, b.min.y) + 0.012;
    const centerX = (b.min.x + b.max.x) / 2;
    const centerZ = (b.min.z + b.max.z) / 2;
    const wallHeight = Math.min(2.72, b.max.y - floor);
    const bathMesh = (name, geometry, material, position) => mesh(`bathroom_${name}`, geometry, material, position, bathroomGroup);
    bathMesh('floor', new THREE.BoxGeometry(width - 0.04, 0.025, length - 0.04), tile, [centerX, floor, centerZ]);
    bathMesh('west_wall', new THREE.BoxGeometry(0.08, wallHeight, length - 0.04), tile, [b.min.x + 0.04, floor + wallHeight / 2, centerZ]);
    for (const [name, z] of [['south_wall', b.min.z + 0.04], ['north_wall', b.max.z - 0.04]]) {
      bathMesh(name, new THREE.BoxGeometry(width - 0.04, wallHeight, 0.08), tile, [centerX, floor + wallHeight / 2, z]);
    }
    // A section view leaves the east wall and ceiling open. Fixed edge strips
    // outline the actual footprint without hiding the sanitary fittings.
    for (let i = 1; i < 9; i++) {
      bathMesh(`floor_joint_${i}`, new THREE.BoxGeometry(width - 0.12, 0.003, 0.009), grout,
        [centerX, floor + 0.014, b.min.z + length * i / 9]);
    }
    const showerZ = b.max.z - 0.68;
    bathMesh('shower_tray', new THREE.BoxGeometry(width - 0.22, 0.055, 1.10), ceramic, [centerX, floor + 0.042, showerZ]);
    bathMesh('linear_drain', new THREE.BoxGeometry(0.82, 0.008, 0.035), dark, [centerX, floor + 0.074, showerZ + 0.33]);
    const showerGlass = ownMaterial(new THREE.MeshStandardMaterial({ name: 'BathroomShowerGlass', color: '#abc9c5', roughness: 0.19, metalness: 0.05, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }));
    bathMesh('shower_glass', new THREE.BoxGeometry(width * 0.61, 2.05, 0.012), showerGlass,
      [b.min.x + width * 0.37, floor + 1.045, showerZ - 0.58]);
    bathMesh('shower_rail', new THREE.CylinderGeometry(0.014, 0.014, 1.72, 10), bronze,
      [b.min.x + 0.19, floor + 1.21, showerZ + 0.23]);
    const arm = bathMesh('shower_arm', new THREE.CylinderGeometry(0.015, 0.015, 0.48, 10), bronze,
      [b.min.x + 0.40, floor + 2.08, showerZ + 0.23]);
    arm.rotation.z = Math.PI / 2;
    bathMesh('rain_shower_head', new THREE.CylinderGeometry(0.145, 0.145, 0.025, 20), bronze,
      [b.min.x + 0.63, floor + 2.06, showerZ + 0.23]);
    const control = bathMesh('shower_mixer', new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), bronze,
      [b.min.x + 0.14, floor + 1.05, showerZ + 0.22]);
    control.rotation.z = Math.PI / 2;

    const wcZ = b.min.z + length * 0.45;
    const wcX = b.min.x + 0.56;
    bathMesh('wc_cistern', new THREE.BoxGeometry(0.17, 0.66, 0.46), ceramic, [b.min.x + 0.23, floor + 0.43, wcZ]);
    const pedestal = bathMesh('wc_pedestal', new THREE.CylinderGeometry(0.17, 0.14, 0.34, 20), ceramic,
      [wcX + 0.04, floor + 0.19, wcZ]);
    pedestal.scale.x = 1.32;
    const bowlProfile = [[0,0], [0.16,0], [0.23,0.08], [0.265,0.18], [0.255,0.23], [0.215,0.23], [0.19,0.17], [0.13,0.08], [0,0.065]];
    const bowl = bathMesh('wc_bowl', new THREE.LatheGeometry(bowlProfile.map(([x,y]) => new THREE.Vector2(x,y)), 24), ceramic, [wcX, floor + 0.28, wcZ]);
    bowl.scale.set(1.42, 1, 0.91);
    const seat = bathMesh('wc_seat', new THREE.TorusGeometry(0.205, 0.029, 8, 24), ceramic, [wcX + 0.015, floor + 0.515, wcZ]);
    seat.rotation.x = Math.PI / 2;
    seat.scale.x = 1.36;
    const opening = bathMesh('wc_bowl_opening', new THREE.CircleGeometry(0.115, 24), dark, [wcX + 0.015, floor + 0.358, wcZ]);
    opening.rotation.x = -Math.PI / 2;
    opening.scale.x = 1.35;
    const flush = bathMesh('wc_flush', new THREE.BoxGeometry(0.012, 0.09, 0.14), bronze,
      [b.min.x + 0.32, floor + 0.67, wcZ]);
    flush.castShadow = false;

    const sinkZ = b.min.z + 0.91;
    bathMesh('vanity', new THREE.BoxGeometry(0.46, 0.49, 0.92), vanity, [b.min.x + 0.34, floor + 0.53, sinkZ]);
    bathMesh('basin_counter', new THREE.BoxGeometry(0.59, 0.075, 1.02), ceramic, [b.min.x + 0.39, floor + 0.84, sinkZ]);
    const sinkProfile = [[0.07,0], [0.11,0], [0.18,0.075], [0.235,0.13], [0.22,0.142], [0.167,0.077], [0.09,0.035]];
    const basin = bathMesh('vessel_basin', new THREE.LatheGeometry(sinkProfile.map(([x,y]) => new THREE.Vector2(x,y)), 28), ceramic,
      [b.min.x + 0.43, floor + 0.88, sinkZ]);
    basin.scale.z = 1.28;
    bathMesh('tap_stem', new THREE.CylinderGeometry(0.019,0.019,0.24,12), bronze, [b.min.x + 0.20, floor + 1.01, sinkZ]);
    const tap = bathMesh('tap_spout', new THREE.CylinderGeometry(0.017,0.017,0.20,12), bronze, [b.min.x + 0.29, floor + 1.13, sinkZ]);
    tap.rotation.z = Math.PI / 2;
    const mirror = standard('BathroomMirror', '#a8b6b5', 0.16, 0.88);
    bathMesh('mirror', new THREE.BoxGeometry(0.014,0.90,0.79), mirror, [b.min.x + 0.088, floor + 1.65,sinkZ]);
    const towel = standard('BathroomLinenTowel', '#d1c9b9', 0.95);
    bathMesh('towel', new THREE.BoxGeometry(0.05,0.41,0.29), towel, [b.min.x + 0.18,floor + 1.15,sinkZ + 0.77]);

    const doorBounds = boundsOf(root.getObjectByName('private_door_v04'));
    if (doorBounds) {
      const d = doorBounds;
      const vestibuleWidth = Math.max(0.1, d.min.x - b.max.x);
      const vestibuleX = b.max.x + vestibuleWidth / 2;
      bathMesh('entry_threshold', new THREE.BoxGeometry(vestibuleWidth,0.032,d.max.z-d.min.z), tile,
        [vestibuleX,floor,(d.max.z+d.min.z)/2]);
      for (const z of [d.min.z-0.035,d.max.z+0.035]) {
        bathMesh('entry_reveal',new THREE.BoxGeometry(vestibuleWidth,2.34,0.06),tile,[vestibuleX,floor+1.17,z]);
      }
    }
    report.bathroom = { available: true, cutaway: false, bounds: serializeBounds(b), fixtures: ['walk-in shower','rain shower head','linear drain','WC','vessel basin','tap','mirror','vanity'], view: 'private-core-section' };
    destinations.bathroom = {
      id: 'bathroom', label: 'Bathroom + shower',
      position: [b.max.x + 3.6, floor + 2.08, centerZ + 1.8],
      target: [centerX, floor + 1.12, centerZ],
      onEnter: () => setBathroomCutaway(true), onLeave: () => setBathroomCutaway(false)
    };
  }
  const cutawayAction = addAction('bathroom-cutaway', 'Inspect bathroom + shower', 'section', 'closed', () => setBathroomCutaway(!state.bathroomCutaway));
  function setBathroomCutaway(enabled) {
    if (disposed || !coreBounds) return false;
    state.bathroomCutaway = Boolean(enabled);
    core.visible = enabled ? false : sourceCoreVisible;
    bathroomGroup.visible = Boolean(enabled);
    report.bathroom.cutaway = Boolean(enabled);
    cutawayAction.state = enabled ? 'open' : 'closed';
    publish();
    return true;
  }
  restores.push(() => { if (core) core.visible = sourceCoreVisible; });
  authoredDoor('entry_door','entry-door','Entrance door', { angle: -Math.PI * 0.48 });
  authoredDoor('private_door_v04','bathroom-door','Bathroom door', { handle: 'private_door_handle_v04', angle: -Math.PI * 0.48, onToggle: open => setBathroomCutaway(open) });
  slidingWindow('living_glass_03','living-window','Living sliding glazing',1);
  slidingWindow('master_glass_02','bedroom-window','Bedroom sliding glazing',-1);

  function setState(next = {}) {
    if (disposed) return;
    if (typeof next.motion === 'boolean') state.motion = next.motion;
    if (KITCHEN_STYLES[next.kitchenStyle]) state.kitchenStyle = next.kitchenStyle;
    if (FURNITURE_STYLES[next.furnitureStyle]) state.furnitureStyle = next.furnitureStyle;
    for (const item of kitchenTargets) item.material.color?.set(KITCHEN_STYLES[state.kitchenStyle][item.role]);
    for (const item of furnitureTargets) item.material.color?.set(FURNITURE_STYLES[state.furnitureStyle][item.role]);
    kitchenAction.state = state.kitchenStyle;
    furnitureAction.state = state.furnitureStyle;
    report.kitchenStyle = state.kitchenStyle;
    report.furnitureStyle = state.furnitureStyle;
    if (typeof next.bathroomCutaway === 'boolean') setBathroomCutaway(next.bathroomCutaway);
    const living = screens.find(screen => screen.id === 'living-tv');
    if (living && typeof next.tvPower === 'boolean') {
      living.power = next.tvPower;
      living.material.uniforms.uPower.value = next.tvPower ? 1 : 0;
      living.powerAction.state = next.tvPower ? 'on' : 'off';
    }
    if (living && Number.isInteger(next.tvChannel)) {
      living.channel = ((next.tvChannel % 3) + 3) % 3;
      living.material.uniforms.uChannel.value = living.channel;
      living.channelAction.state = ['Desert','Ocean','Architecture'][living.channel];
    }
    publish();
  }
  function activate(id) {
    if (disposed) return false;
    const action = actionById.get(id);
    if (!action) return false;
    action.handler();
    publish(id);
    return true;
  }
  function actionForObject(object) {
    for (let node = object; node; node = node.parent) {
      if (actionById.has(node.userData?.residenceActionId)) return actionById.get(node.userData.residenceActionId);
    }
    return null;
  }
  setState();
  return {
    group, actions, interactables, destinations, report,
    kitchenStyles: KITCHEN_STYLES, furnitureStyles: FURNITURE_STYLES,
    setState, activate, actionForObject, registerHinge, registerScreen, setBathroomCutaway,
    activateFromObject(object) { const action = actionForObject(object); return action ? activate(action.id) : false; },
    update(delta) {
      if (disposed) return false;
      const dt = Math.min(Math.max(Number(delta) || 0,0),0.1);
      let changed = false;
      let geometryChanged = false;
      let completed = false;
      for (const motion of motions) {
        if (motion.value === motion.target) continue;
        const difference = motion.target - motion.value;
        motion.value += Math.sign(difference) * Math.min(Math.abs(difference), dt * 1.45);
        const eased = motion.value * motion.value * (3 - 2 * motion.value);
        motion.apply(eased);
        changed = true;
        geometryChanged = true;
        if (motion.value === motion.target) {
          motion.action.state = motion.target ? 'open' : 'closed';
          completed = true;
        }
      }
      if (state.motion && screens.some(screen => screen.power)) {
        elapsed += dt;
        for (const screen of screens) screen.material.uniforms.uTime.value = elapsed;
        changed = true;
      }
      if (geometryChanged && renderer?.shadowMap) renderer.shadowMap.needsUpdate = true;
      if (completed) publish('animation-complete');
      return changed;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      // Root-owned rain/PBR layers must dispose before this ownership layer.
      for (let i = restores.length - 1; i >= 0; i--) restores[i]();
      group.removeFromParent();
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      group.clear();
      interactables.length = 0;
    }
  };
}
