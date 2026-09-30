import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** An architectural extension in world metres. The authored GLB remains untouched. */
export function createEstateAmenities(THREE, { scene, root, quality = 'desktop' }) {
  root.updateWorldMatrix(true, true);
  const group = new THREE.Group();
  group.name = 'runtime_estate_amenities';
  scene.add(group);
  const materials = new Set();
  const geometries = new Set();
  const bins = new Map();
  const cache = new Map();
  const wetSurfaces = [];
  const rainOccluders = [];
  const interactables = [];
  const ownGeometry = geometry => { geometries.add(geometry); return geometry; };
  const material = (name, color, options = {}) => {
    const result = new THREE.MeshStandardMaterial({ name, color, roughness: 0.7, ...options });
    materials.add(result);
    return result;
  };
  const stone = material('EstateTravertine', '#b9ad97', { roughness: 0.8 });
  const paleStone = material('EstateCutStone', '#ddd3bf', { roughness: 0.65 });
  const timber = material('EstateOiledTeak', '#755541', { roughness: 0.62 });
  const bronze = material('EstateBronze', '#49443b', { metalness: 0.7, roughness: 0.38 });
  const linen = material('EstateLinen', '#e9e1cf', { roughness: 0.96 });
  const sage = material('EstateSageFabric', '#748176', { roughness: 0.94 });
  const rubber = material('EstateRubber', '#242725', { roughness: 0.97 });
  const silver = material('EstateBrushedSteel', '#a6ada9', { metalness: 0.85, roughness: 0.28 });
  const glass = material('EstateGlazing', '#45656a', { metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.42, depthWrite: false });
  const carGlass = material('EstateCoupeGlazing', '#132d35', { metalness: 0.58, roughness: 0.13 });
  const lawn = material('EstateLawn', '#64705a', { roughness: 1 });
  const asphalt = material('EstateAsphalt', '#484a46', { roughness: 0.96 });
  const playMat = material('EstatePlaySurface', '#a99a7f', { roughness: 1 });
  const slideFinish = material('EstateSlideEnamel', '#709d9a', { metalness: 0.18, roughness: 0.3 });
  const glow = material('EstateWarmLight', '#ffe3ad', { emissive: '#ffc674', emissiveIntensity: 0.65, roughness: 0.55 });
  const red = material('EstateTailLamp', '#971f18', { emissive: '#e12919', emissiveIntensity: 0.7, roughness: 0.3 });
  const carPaint = new THREE.MeshPhysicalMaterial({ name: 'EstateSportsCarPaint', color: '#365b57', metalness: 0.72, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.15 });
  materials.add(carPaint);
  const waterMaterial = material('EstateShallowWater', '#57a7ad', { metalness: 0.28, roughness: 0.18 });
  const fountainMaterial = material('EstateFountainWater', '#83c8cd', { metalness: 0.3, roughness: 0.14 });
  const waterTime = { value: 0 };
  const rain = { value: 0 };
  const wind = { value: 0.35 };
  waterMaterial.customProgramCacheKey = () => 'estate-shallow-water-v1';
  waterMaterial.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uEstateTime: waterTime, uEstateRain: rain, uEstateWind: wind });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vEstateWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvEstateWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec3 vEstateWorld;
      uniform float uEstateTime;
      uniform float uEstateRain;
      uniform float uEstateWind;
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec2 p = vEstateWorld.xz;
      float t = uEstateTime;
      vec2 slope = vec2(cos(p.x * 8.0 + t * 1.9), sin(p.y * 9.0 - t * 1.6)) * (0.035 + uEstateWind * 0.025);
      vec2 cell = fract(p * 2.2) - 0.5;
      float rings = cos(length(cell) * 72.0 - t * 7.0) * uEstateRain * 0.035;
      slope += normalize(cell + vec2(0.0001)) * rings;
      normal = normalize(mat3(viewMatrix) * vec3(-slope.x, 1.0, -slope.y));
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      float caustic = pow(max(0.0, 1.0 - abs(sin(vEstateWorld.x * 11.0 + uEstateTime) + cos(vEstateWorld.z * 9.0 - uEstateTime * 0.7))), 5.0);
      diffuseColor.rgb += vec3(0.035, 0.06, 0.055) * caustic;
    `);
  };

  function bounds(name, fallback) {
    const node = root.getObjectByName(name);
    const box = node ? new THREE.Box3().setFromObject(node) : null;
    return box && !box.isEmpty() ? box : new THREE.Box3(new THREE.Vector3(...fallback[0]), new THREE.Vector3(...fallback[1]));
  }
  const site = bounds('site_plinth', [[-15, -0.12, -9.7], [15, 0, 13.3]]);
  const pool = bounds('pool_water', [[-6.16, 0.16, 7.32], [7.26, 0.22, 11.18]]);
  const roof = bounds('roof_plane', [[-8.85, 6.59, -4.02], [5.75, 6.73, 3.92]]);
  const grade = site.max.y;
  const west = site.min.x;
  const extension = { minX: west - 15, maxX: west, minZ: site.min.z, maxZ: pool.max.z + 12 };
  const garageX = west - 8;
  const garageZ = site.min.z + 4.6;
  const garageFront = garageZ + 3.25;
  const waterX = west - 8;
  const waterZ = pool.min.z + 2.2;
  const playX = west - 7;
  const playZ = pool.max.z + 7;
  const roofY = roof.max.y + 0.06;
  const roofCenterX = (roof.min.x + roof.max.x) * 0.5;
  const roofRear = roof.min.z + 0.68;
  const roofFront = roof.max.z - 2.55;
  const report = {
    profile: 'inhabited-estate-extension-v1', quality, disposed: false,
    coordinateSpace: 'world-metres-after-authored-root-transform',
    additions: ['pool-loungers', 'outdoor-kitchen-dining', 'woodland-playground', 'water-play-garden', 'roof-entertainment-pavilion', 'garage-sports-car', 'three-level-lift'],
    loungerCount: 4, fountainJetCount: 3, originalAssetModified: false,
    bounds: { site: { min: site.min.toArray(), max: site.max.toArray() }, pool: { min: pool.min.toArray(), max: pool.max.toArray() }, roof: { min: roof.min.toArray(), max: roof.max.toArray() }, extension },
    garageOpen: false, roofTvOn: true, carColor: '#365b57', weather: 'clear', motion: true
  };
  const transform = new THREE.Object3D();
  function geometry(key, create) {
    if (!cache.has(key)) cache.set(key, ownGeometry(create()));
    return cache.get(key);
  }
  function boxGeometry(size, radius = 0.035) {
    const safeRadius = Math.min(radius, ...size.map(value => value * 0.4));
    return geometry(`box:${size}:${safeRadius}`, () => safeRadius > 0 ? new RoundedBoxGeometry(...size, 1, safeRadius) : new THREE.BoxGeometry(...size));
  }
  function cylinderGeometry(radiusTop, radiusBottom, height, segments = 16) {
    return geometry(`cyl:${radiusTop}:${radiusBottom}:${height}:${segments}`, () => new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments));
  }
  // Static pieces are baked into one mesh per finish per parent, preserving
  // independent garage/TV/car pivots while keeping the estate draw count bounded.
  function part(shape, finish, position, rotation = [0, 0, 0], parent = group, scale = [1, 1, 1]) {
    transform.position.set(...position); transform.rotation.set(...rotation); transform.scale.set(...scale); transform.updateMatrix();
    const copy = shape.index ? shape.toNonIndexed() : shape.clone();
    copy.applyMatrix4(transform.matrix);
    if (!copy.getAttribute('uv')) copy.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(copy.getAttribute('position').count * 2), 2));
    const key = `${parent.uuid}:${finish.uuid}`;
    if (!bins.has(key)) bins.set(key, { parent, finish, parts: [] });
    bins.get(key).parts.push(copy);
  }
  const box = (size, finish, position, rotation, parent, radius) => part(boxGeometry(size, radius), finish, position, rotation, parent);
  const cylinder = (r1, r2, height, finish, position, rotation, parent, segments) => part(cylinderGeometry(r1, r2, height, segments), finish, position, rotation, parent);
  function rod(a, b, radius, finish, parent = group) {
    const start = new THREE.Vector3(...a); const end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()));
    cylinder(radius, radius, direction.length(), finish, start.add(end).multiplyScalar(0.5).toArray(), [rotation.x, rotation.y, rotation.z], parent, 10);
  }
  function direct(name, shape, finish, position, parent = group) {
    const mesh = new THREE.Mesh(shape, finish); mesh.name = name; mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function surface(name, size, finish, position, kind) {
    const mesh = direct(name, boxGeometry(size, 0.04), finish, position);
    mesh.userData.estateSurface = kind; mesh.userData.rainExtent = true;
    wetSurfaces.push({ mesh, kind }); return mesh;
  }
  function rainRoof(name, size, position) {
    // Small invisible structural proxies retain each roof's own footprint after
    // rendering geometry has been merged by finish. They never submit a draw.
    const proxy = direct(`estate_${name}_roof_proxy`, boxGeometry(size, 0), stone, position);
    proxy.visible = false; proxy.userData.rainShelter = true;
    proxy.updateWorldMatrix(true, false);
    rainOccluders.push(new THREE.Box3().setFromObject(proxy));
    return proxy;
  }
  function roundTable(x, y, z, radius = 0.42, height = 0.48, parent = group) {
    cylinder(radius, radius, 0.065, paleStone, [x, y + height, z], undefined, parent, 24);
    cylinder(radius * 0.25, radius * 0.32, height, bronze, [x, y + height * 0.5, z], undefined, parent);
  }
  function seat(x, y, z, angle = 0, parent = group, finish = linen) {
    const chair = new THREE.Group(); chair.position.set(x, y, z); chair.rotation.y = angle; parent.add(chair);
    box([0.65, 0.11, 0.64], finish, [0, 0.47, 0], undefined, chair, 0.05);
    box([0.65, 0.47, 0.11], finish, [0, 0.75, -0.27], [-0.08, 0, 0], chair, 0.045);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box([0.055, 0.43, 0.055], timber, [sx * 0.25, 0.22, sz * 0.23], undefined, chair, 0.015);
    for (const sx of [-1, 1]) box([0.055, 0.055, 0.62], timber, [sx * 0.34, 0.66, 0], undefined, chair, 0.018);
    return chair;
  }

  // Continuous ground and a pedestrian connection meet the original plinth.
  surface('estate_site_extension', [15, 0.22, extension.maxZ - extension.minZ], stone,
    [west - 7.5, grade - 0.11, (extension.minZ + extension.maxZ) / 2], 'paving');
  surface('estate_garden_lawn', [12.5, 0.035, 18.4], lawn, [west - 7.4, grade + 0.02, pool.max.z + 1.7], 'garden');
  surface('estate_link_terrace', [8.5, 0.14, 9.9], stone, [west + 0.8, grade + 0.081, 6.1], 'paving');
  surface('estate_garden_walk', [2.1, 0.14, 25], paleStone, [west - 0.9, grade + 0.07, 9.7], 'paving');
  surface('estate_waterplay_walk', [7.7, 0.14, 1.6], paleStone, [west - 5.7, grade + 0.07, waterZ - 3.6], 'paving');
  surface('estate_garage_drive', [6.2, 0.055, 6.1], asphalt, [garageX, grade + 0.035, garageFront + 2.95], 'asphalt');
  surface('estate_drive_connection', [8.6, 0.055, 3], asphalt, [west - 2.7, grade + 0.035, garageFront + 2.1], 'asphalt');
  // Low planted edges and inset path lights frame the extension without a tall boundary wall.
  for (const z of [waterZ - 1, waterZ + 4.5, playZ + 2]) {
    box([0.65, 0.55, 2], timber, [extension.minX + 0.75, grade + 0.275, z], undefined, undefined, 0.06);
    for (let i = 0; i < 4; i++) part(geometry('shrub', () => new THREE.IcosahedronGeometry(0.42, 1)), lawn,
      [extension.minX + 0.75, grade + 0.64, z - 0.7 + i * 0.45], undefined, group, [0.74, 0.9, 0.85]);
  }
  for (let i = 0; i < 8; i++) {
    cylinder(0.045, 0.055, 0.7, bronze, [west - 2.2, grade + 0.35, -1 + i * 3.1]);
    cylinder(0.07, 0.07, 0.035, glow, [west - 2.2, grade + 0.64, -1 + i * 3.1]);
  }

  // Pool furniture: tilted upholstery, open teak frames and round drinks tables.
  const loungerZ = (pool.min.z + pool.max.z) / 2;
  const poolDeckY = grade + 0.15;
  surface('estate_pool_lounge_deck', [6.2, .15, 5.6], stone, [pool.max.x + 3.5, grade + .075, loungerZ], 'paving');
  for (let i = 0; i < 4; i++) {
    const x = pool.max.x + 1.12 + i * 1.34;
    box([0.91, 0.10, 2.16], timber, [x, poolDeckY + 0.36, loungerZ], undefined, undefined, 0.05);
    box([0.78, 0.15, 1.43], linen, [x, poolDeckY + 0.49, loungerZ + 0.30], undefined, undefined, 0.07);
    box([0.78, 0.14, 0.77], linen, [x, poolDeckY + 0.69, loungerZ - 0.72], [-0.48, 0, 0], undefined, 0.065);
    box([0.62, 0.11, 0.23], sage, [x, poolDeckY + 0.96, loungerZ - 0.95], [-0.48, 0, 0], undefined, 0.05);
    for (const sx of [-0.36, 0.36]) for (const sz of [-0.78, 0.78]) box([0.065, 0.31, 0.085], timber, [x + sx, poolDeckY + 0.155, loungerZ + sz]);
    if (i < 3) roundTable(x + 0.68, poolDeckY, loungerZ + 0.12, 0.22, 0.43);
  }
  for (const x of [pool.max.x + 1.8, pool.max.x + 4.45]) {
    // The authored long planter occupies the house-side pool edge. Put the
    // parasol feet on the garden-side deck rather than inside its planting.
    const z = pool.max.z + 0.45;
    cylinder(0.3, 0.33, 0.08, paleStone, [x, poolDeckY + 0.04, z]);
    cylinder(0.035, 0.035, 2.55, bronze, [x, poolDeckY + 1.32, z]);
    part(geometry('parasol', () => new THREE.ConeGeometry(1.48, 0.48, 8)), linen, [x, poolDeckY + 2.54, z], [0, Math.PI / 8, 0]);
    rainRoof(`parasol_${x.toFixed(2)}`, [2.96, 0.48, 2.96], [x, poolDeckY + 2.54, z]);
    for (let rib = 0; rib < 8; rib++) {
      const a = rib * Math.PI / 4;
      rod([x, poolDeckY + 2.78, z], [x + Math.cos(a) * 1.43, poolDeckY + 2.31, z + Math.sin(a) * 1.43], 0.01, bronze);
    }
  }

  // Outdoor kitchen and dining are linked to the existing western terrace.
  const bbqX = west + 2.2;
  const bbqZ = 3.1;
  box([3.5, 0.83, 0.8], timber, [bbqX, grade + 0.48, bbqZ], undefined, undefined, 0.045);
  box([3.64, 0.105, 0.94], paleStone, [bbqX, grade + 0.94, bbqZ], undefined, undefined, 0.045);
  box([1.1, 0.12, 0.66], bronze, [bbqX - 0.5, grade + 1.04, bbqZ]);
  part(geometry('grill-hood', () => new THREE.CylinderGeometry(0.32, 0.32, 1.02, 20, 1, false, 0, Math.PI)), silver,
    [bbqX - 0.5, grade + 1.08, bbqZ - 0.02], [0, 0, Math.PI / 2]);
  rod([bbqX - 0.88, grade + 1.19, bbqZ + 0.33], [bbqX - 0.14, grade + 1.19, bbqZ + 0.33], 0.026, bronze);
  for (let i = 0; i < 4; i++) cylinder(0.035, 0.035, 0.055, silver, [bbqX - 0.87 + i * 0.25, grade + 0.91, bbqZ + 0.5], [Math.PI / 2, 0, 0]);
  box([0.54, 0.03, 0.47], silver, [bbqX + 1.1, grade + 1, bbqZ]);
  cylinder(0.022, 0.022, 0.32, silver, [bbqX + 1.1, grade + 1.15, bbqZ - 0.27]);
  rod([bbqX + 1.1, grade + 1.30, bbqZ - 0.27], [bbqX + 1.1, grade + 1.30, bbqZ - 0.04], 0.022, silver);
  for (let i = 0; i < 4; i++) box([0.68, 0.62, 0.018], timber, [bbqX - 1.21 + i * 0.8, grade + 0.47, bbqZ + 0.416]);
  const diningX = west + 2.3; const diningZ = 7;
  box([1.12, 0.10, 2.82], paleStone, [diningX, grade + 0.88, diningZ], undefined, undefined, 0.07);
  for (const z of [-0.9, 0.9]) box([0.55, 0.75, 0.12], bronze, [diningX, grade + 0.45, diningZ + z]);
  for (const x of [-1, 1]) for (const z of [-0.85, 0.85]) seat(diningX + x * 1.04, grade + 0.14, diningZ + z, x * Math.PI / 2);
  seat(diningX, grade + 0.14, diningZ - 1.93, 0);
  seat(diningX, grade + 0.14, diningZ + 1.93, Math.PI);
  for (const z of [-0.7, 0.7]) cylinder(0.18, 0.17, 0.02, linen, [diningX, grade + 0.945, diningZ + z], undefined, undefined, 24);
  cylinder(0.08, 0.1, 0.24, sage, [diningX, grade + 1.06, diningZ], undefined, undefined, 20);

  // A garage with a visibly finished car, a real independent door and connected drive.
  const garage = new THREE.Group(); garage.name = 'estate_garage'; group.add(garage);
  surface('estate_garage_floor', [6.1, 0.14, 6.7], stone, [garageX, grade + 0.07, garageZ], 'covered');
  const garageWest=surface('estate_garage_west_right_wall',[.22,3,6.7],paleStone,[garageX-3.05,grade+1.5,garageZ],'facade');
  const garageEast=surface('estate_garage_east_right_wall',[.22,3,6.7],paleStone,[garageX+3.05,grade+1.5,garageZ],'facade');
  const garageRear=surface('estate_garage_rear_wall',[6.1,3,.22],stone,[garageX,grade+1.5,garageZ-3.27],'facade');
  garageWest.userData.rainFacing=[-1,0,0];garageEast.userData.rainFacing=[1,0,0];garageRear.userData.rainFacing=[0,0,-1];
  box([6.6, 0.20, 7.05], paleStone, [garageX, grade + 3.07, garageZ], undefined, garage, 0.05);
  rainRoof('garage', [6.6, 0.2, 7.05], [garageX, grade + 3.07, garageZ]);
  box([5.8, 0.035, 0.05], glow, [garageX, grade + 2.81, garageZ + 2.5], undefined, garage);
  const garageDoor = new THREE.Group(); garageDoor.name = 'estate_garage_door'; garageDoor.position.set(garageX, grade + 2.75, garageFront + 0.04);
  garageDoor.userData.estateAction = 'garage-door'; group.add(garageDoor); interactables.push(garageDoor);
  box([5.83, 2.62, 0.07], bronze, [0, -1.31, 0], undefined, garageDoor, 0.025);
  for (let i = 0; i < 11; i++) box([5.75, 0.19, 0.025], timber, [0, -0.12 - i * 0.236, 0.048], undefined, garageDoor, 0.015);
  box([0.58, 0.026, 0.055], silver, [0, -2.18, 0.088], undefined, garageDoor);
  const car = new THREE.Group(); car.name = 'estate_sports_car'; car.position.set(garageX, grade + 0.15, garageZ + 0.5); group.add(car);
  car.userData.estateAction = 'car-paint'; interactables.push(car);
  // Closed continuous lofts make a low coupe, rather than stacking rectangular
  // platforms. Clockwise XY rings need outward-wound sides when Z increases.
  function loft(sections, ringForSection) {
    const rings=sections.map(ringForSection),vertices=[],indices=[];
    const count=rings[0].length;
    rings.forEach((ring,i)=>ring.forEach(([x,y])=>vertices.push(x,y,sections[i][0])));
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<count;j++){
      const a=i*count+j,b=i*count+(j+1)%count,c=(i+1)*count+j,d=(i+1)*count+(j+1)%count;
      indices.push(a,c,b,b,c,d);
    }
    for(const end of [0,rings.length-1]){
      const center=vertices.length/3;
      const average=rings[end].reduce((sum,p)=>[sum[0]+p[0]/count,sum[1]+p[1]/count],[0,0]);
      vertices.push(average[0],average[1],sections[end][0]);
      for(let j=0;j<count;j++){const a=end*count+j,b=end*count+(j+1)%count;indices.push(...(end===0?[center,a,b]:[center,b,a]));}
    }
    const shape=ownGeometry(new THREE.BufferGeometry());shape.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));shape.setIndex(indices);shape.computeVertexNormals();return shape;
  }
  const body=loft([
    [-2.30,.80,.27,.60],[-2.16,.96,.24,.67],[-1.46,1.02,.23,.73],[-.79,.98,.22,.68],
    [.18,.94,.22,.60],[.84,.98,.23,.58],[1.46,1.03,.24,.59],[2.06,.94,.27,.49],[2.32,.77,.30,.43]
  ],([z,w,b,t])=>[[-w*.73,b],[-w,b+.09],[-w,t-.11],[-w*.8,t],[0,t+.025],[w*.8,t],[w,t-.11],[w,b+.09],[w*.73,b]]);
  part(body,carPaint,[0,0,0],undefined,car);
  const cabin=loft([
    [-1.48,.77,.70,.73,.70],[-.87,.79,.68,1.08,.62],[-.62,.79,.66,1.17,.65],
    [-.12,.78,.65,1.18,.66],[.24,.79,.64,1.10,.63],[.92,.80,.62,.67,.76]
  ],([z,w,b,t,r])=>[[-w,b],[-w,b+.025],[-r,t-.035],[0,t],[r,t-.035],[w,b+.025],[w,b]]);
  part(cabin,carGlass,[0,0,0],undefined,car);
  const coupeRoof=loft([[-.86,.60,1.095],[-.62,.66,1.195],[-.12,.67,1.205],[.24,.63,1.125]],
    ([z,w,y])=>[[-w,y-.035],[-w,y-.007],[0,y+.016],[w,y-.007],[w,y-.035]]);
  part(coupeRoof,carPaint,[0,0,0],undefined,car);
  for(const side of [-1,1]){
    rod([side*.63,1.105,.24],[side*.80,.66,.94],.028,carPaint,car);
    rod([side*.62,1.08,-.87],[side*.79,.72,-1.5],.035,carPaint,car);
    rod([side*.66,1.17,-.34],[side*.79,.68,-.34],.018,bronze,car);
    box([.06,.10,2.7],bronze,[side*1.01,.245,-.1],undefined,car,.025);
    box([.023,.025,.21],silver,[side*.991,.645,-.30],undefined,car,.01);
    box([.26,.09,.20],carPaint,[side*.99,.77,.63],undefined,car,.035);
    // Slightly raised curved shoulders surround the wide wheel tread.
    for(const z of [-1.45,1.42])part(geometry('coupe-arch',()=>new THREE.TorusGeometry(.382,.046,6,24,Math.PI)),carPaint,[side*1.025,.362,z],[0,Math.PI/2,0],car);
  }
  for (const x of [-1.015, 1.015]) for (const z of [-1.45, 1.42]) {
    const axleY=.362;
    part(geometry('coupe-tire',()=>new THREE.TorusGeometry(.274,.088,10,28)),rubber,[x,axleY,z],[0,Math.PI/2,0],car,[1,1,1.55]);
    cylinder(.25,.25,.29,silver,[x,axleY,z],[0,0,Math.PI/2],car,28);
    cylinder(.202,.202,.305,bronze,[x,axleY,z],[0,0,Math.PI/2],car,24);
    for(let spoke=0;spoke<5;spoke++)box([.313,.030,.39],silver,[x,axleY,z],[spoke*Math.PI/5+.12,0,0],car,.009);
    cylinder(.054,.054,.324,silver,[x,axleY,z],[0,0,Math.PI/2],car,12);
  }
  for(const x of [-.61,.61]){
    box([.52,.043,.095],glow,[x,.485,2.13],[-.07,0,-Math.sign(x)*.05],car,.02);
    box([.62,.038,.048],red,[x,.624,-2.23],undefined,car,.015);
    box([.36,.11,.065],rubber,[x,.332,2.19],undefined,car,.035);
  }
  box([1.58,.038,.13],bronze,[0,.263,2.19],undefined,car,.025);
  box([.64,.092,.042],rubber,[0,.351,2.309],undefined,car,.028);
  box([.42,.095,.018],paleStone,[0,.40,-2.31],undefined,car,.01);
  box([1.70,.035,.13],carPaint,[0,.709,-2.03],undefined,car,.023);

  // Timber climbing house, slide and hanging swing: a separate dry garden zone.
  surface('estate_playground_mat', [10.6, 0.09, 6.8], playMat, [playX, grade + 0.06, playZ], 'playground');
  const towerX = playX - 2.7;
  for (const x of [-0.72, 0.72]) for (const z of [-0.72, 0.72]) box([0.12, 2.4, 0.12], timber, [towerX + x, grade + 1.25, playZ + z]);
  box([1.68, 0.12, 1.68], timber, [towerX, grade + 1.35, playZ]);
  part(geometry('play-roof', () => new THREE.ConeGeometry(1.34, 0.64, 4)), sage, [towerX, grade + 2.75, playZ], [0, Math.PI / 4, 0]);
  rainRoof('playhouse', [1.9, .64, 1.9], [towerX, grade + 2.75, playZ]);
  for (const x of [-0.76, 0.76]) {
    box([0.07, 0.07, 1.5], timber, [towerX + x, grade + 2, playZ]);
    for (let i = 0; i < 5; i++) box([0.045, 0.52, 0.045], timber, [towerX + x, grade + 1.72, playZ - 0.6 + i * 0.3]);
  }
  for (let i = 0; i < 5; i++) rod([towerX - 0.38, grade + 0.27 + i * 0.22, playZ - 1.2 + i * 0.07], [towerX + 0.38, grade + 0.27 + i * 0.22, playZ - 1.2 + i * 0.07], 0.04, timber);
  for (const x of [-0.4,0.4]) rod([towerX + x, grade + 0.1, playZ - 1.35], [towerX + x, grade + 1.5, playZ - 0.75], 0.045, timber);
  function slide(x, z, startY, length, finish) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x,startY,z), new THREE.Vector3(x,startY - 0.22,z + length * 0.22), new THREE.Vector3(x,grade + 0.37,z + length * 0.8), new THREE.Vector3(x,grade + 0.25,z + length)]);
    const vertices = []; const uv = []; const index = [];
    for (let i=0;i<=20;i++) { const p=curve.getPoint(i/20); vertices.push(p.x-.34,p.y,p.z,p.x+.34,p.y,p.z); uv.push(0,i/20,1,i/20); if(i<20){const a=i*2; index.push(a,a+2,a+1,a+1,a+2,a+3);} }
    const shape=ownGeometry(new THREE.BufferGeometry());shape.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));shape.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));shape.setIndex(index);shape.computeVertexNormals();
    part(shape,finish,[0,0,0]);
    for(const side of [-.37,.37]){ const edge=new THREE.CatmullRomCurve3(curve.points.map(p=>p.clone().add(new THREE.Vector3(side,.1,0)))); part(ownGeometry(new THREE.TubeGeometry(edge,20,.06,8,false)),finish,[0,0,0]); }
    return curve;
  }
  slide(towerX, playZ + 0.78, grade + 1.43, 2.05, slideFinish);
  const swingX = playX + 2.7;
  for(const x of [-1.35,1.35]){ rod([swingX+x,grade+.1,playZ-.9],[swingX+x,grade+2.55,playZ],.075,timber); rod([swingX+x,grade+.1,playZ+.9],[swingX+x,grade+2.55,playZ],.075,timber); }
  rod([swingX-1.55,grade+2.55,playZ],[swingX+1.55,grade+2.55,playZ],.085,timber);
  const swing = new THREE.Group(); swing.name='estate_swing'; swing.position.set(swingX,grade+2.5,playZ); group.add(swing);
  for(const x of [-.3,.3]) rod([x,0,0],[x,-1.94,0],.014,bronze,swing);
  box([.77,.08,.38],timber,[0,-1.94,0],undefined,swing,.05);

  // Water-play garden: shallow basin, compact slide and three animated fountain arcs.
  surface('estate_waterplay_deck', [9.1, .16, 7], paleStone, [waterX,grade+.08,waterZ], 'paving');
  box([6.9,.23,4.7],slideFinish,[waterX,grade+.22,waterZ],undefined,undefined,.24);
  const water = direct('estate_shallow_water', boxGeometry([6.55,.025,4.34],.18),waterMaterial,[waterX,grade+.35,waterZ]);
  water.castShadow=false;
  for(const x of [-3.43,3.43])box([.19,.12,4.75],paleStone,[waterX+x,grade+.38,waterZ],undefined,undefined,.07);
  for(const z of [-2.34,2.34])box([6.9,.12,.19],paleStone,[waterX,grade+.38,waterZ+z],undefined,undefined,.07);
  const aquaX=waterX-1.9, aquaZ=waterZ-2.1;
  box([1.5,.12,1.2],timber,[aquaX,grade+1.82,aquaZ],undefined,undefined,.04);
  for(const x of [-.62,.62])for(const z of [-.47,.47])cylinder(.05,.05,1.68,bronze,[aquaX+x,grade+.96,aquaZ+z]);
  slide(aquaX,aquaZ+.56,grade+1.88,2.7,slideFinish);
  for(const x of [-.4,.4])rod([aquaX+x,grade+.2,aquaZ-1.5],[aquaX+x,grade+2,aquaZ-.55],.04,bronze);
  for(let i=0;i<6;i++)rod([aquaX-.4,grade+.33+i*.25,aquaZ-1.37+i*.15],[aquaX+.4,grade+.33+i*.25,aquaZ-1.37+i*.15],.032,timber);
  for(const x of [-.58,.58])rod([aquaX+x,grade+1.9,aquaZ-.52],[aquaX+x,grade+2.42,aquaZ-.52],.027,bronze);
  const droplets = new THREE.InstancedMesh(geometry('fountain-drop',()=>new THREE.SphereGeometry(.042,6,4)),fountainMaterial,quality==='mobile'?30:54);
  droplets.name='estate_fountain_jets';droplets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);droplets.castShadow=false;droplets.receiveShadow=true;group.add(droplets);
  for(let i=0;i<3;i++)cylinder(.095,.095,.16,silver,[waterX+.1+i*.9,grade+.45,waterZ-1.9]);
  const dropTransform=new THREE.Object3D();
  function updateFountain(time){
    const count=droplets.count/3;
    for(let jet=0;jet<3;jet++)for(let i=0;i<count;i++){
      const t=(i/count+time*.43)%1;
      dropTransform.position.set(waterX+.1+jet*.9+Math.sin(t*Math.PI)*wind.value*.13,grade+.43+Math.sin(t*Math.PI)*1.45,waterZ-1.85+t*2.6);
      dropTransform.scale.set(.78,1.9,.78);dropTransform.updateMatrix();droplets.setMatrixAt(jet*count+i,dropTransform.matrix);
    }
    droplets.instanceMatrix.needsUpdate=true; droplets.computeBoundingSphere();
  }
  updateFountain(0);

  // A set-back third level leaves the original cantilever/terrace view intact.
  const pavilionX=roofCenterX-.35, pavilionWidth=Math.min(9.6,roof.max.x-roof.min.x-3.3), pavilionDepth=roofFront-roofRear;
  surface('estate_roof_terrace',[pavilionWidth+1.6,.10,pavilionDepth+1.05],paleStone,[pavilionX,roofY,roofRear+pavilionDepth*.5],'roof');
  box([pavilionWidth,.17,pavilionDepth],timber,[pavilionX,roofY+2.77,roofRear+pavilionDepth*.5],undefined,undefined,.035);
  rainRoof('pavilion', [pavilionWidth,.17,pavilionDepth], [pavilionX,roofY+2.77,roofRear+pavilionDepth*.5]);
  const pavilionRear=surface('estate_pavilion_rear_wall',[pavilionWidth,2.58,.17],stone,[pavilionX,roofY+1.35,roofRear],'facade');
  pavilionRear.userData.rainFacing=[0,0,-1];
  for(const x of [-pavilionWidth*.5,pavilionWidth*.5])box([.12,2.65,.12],bronze,[pavilionX+x,roofY+1.35,roofFront]);
  const pavilionSideGlass=surface('estate_pavilion_side_glass',[.035,2.44,pavilionDepth-.2],glass,[pavilionX-pavilionWidth*.5,roofY+1.3,roofRear+pavilionDepth*.5],'glass');
  const pavilionFrontGlass=surface('estate_pavilion_front_glass',[pavilionWidth-.1,2.34,.025],glass,[pavilionX,roofY+1.28,roofFront],'glass');
  pavilionSideGlass.userData.rainFacing=[-1,0,0];pavilionFrontGlass.userData.rainFacing=[0,0,1];
  pavilionSideGlass.castShadow=pavilionFrontGlass.castShadow=false;
  for(let i=1;i<4;i++)box([.035,2.38,.04],bronze,[pavilionX-pavilionWidth*.5+i*pavilionWidth*.25,roofY+1.28,roofFront]);
  box([pavilionWidth-.4,.025,.055],glow,[pavilionX,roofY+2.62,roofRear+.24]);
  // Low sofa directed toward the cinema wall, with a billiards table alongside.
  const sofaX=pavilionX-2.3;
  box([2.6,.38,.82],sage,[sofaX,roofY+.36,roofFront-.65],undefined,undefined,.12);
  box([2.65,.55,.17],sage,[sofaX,roofY+.70,roofFront-.25],undefined,undefined,.075);
  for(const x of [-1.24,1.24])box([.19,.44,.84],sage,[sofaX+x,roofY+.58,roofFront-.65],undefined,undefined,.075);
  roundTable(sofaX,roofY,roofFront-1.8,.44,.40);
  box([2.65,1.54,.11],bronze,[sofaX,roofY+1.58,roofRear+.13],undefined,undefined,.055);
  const tvMaterial = material('EstateRoofScreen','#7ea8a3',{emissive:'#518d94',emissiveIntensity:.85,roughness:.35});
  const tvScreen=direct('estate_roof_tv',geometry('estate-tv-plane',()=>new THREE.PlaneGeometry(2.43,1.36)),tvMaterial,[sofaX,roofY+1.58,roofRear+.2]);
  tvScreen.castShadow=false;tvScreen.userData.estateAction='roof-tv';interactables.push(tvScreen);
  // A simple panoramic landscape gives the powered screen an intentional image.
  const screenPixels=new Uint8Array(96*54*4);
  for(let y=0;y<54;y++)for(let x=0;x<96;x++){
    const mountain=27+Math.sin(x*.085)*9+Math.sin(x*.2)*3;const sky=y>mountain;const offset=(y*96+x)*4;
    screenPixels.set(sky?[123+y,160+y*.6,166+y*.5,255]:[43+y,78+y*.5,70+y*.4,255],offset);
  }
  const screenTexture=new THREE.DataTexture(screenPixels,96,54,THREE.RGBAFormat);screenTexture.colorSpace=THREE.SRGBColorSpace;screenTexture.needsUpdate=true;tvMaterial.map=screenTexture;tvMaterial.emissiveMap=screenTexture;
  const gamesX=pavilionX+2.05,gamesZ=roofRear+1.8;
  box([1.52,.2,2.56],timber,[gamesX,roofY+.84,gamesZ],undefined,undefined,.08);
  box([1.33,.026,2.34],sage,[gamesX,roofY+.954,gamesZ],undefined,undefined,.05);
  for(const x of [-.55,.55])for(const z of [-.92,.92])box([.13,.74,.13],bronze,[gamesX+x,roofY+.42,gamesZ+z]);
  for(let i=0;i<5;i++)part(geometry('billiard-ball',()=>new THREE.SphereGeometry(.034,10,6)),i%2?linen:red,[gamesX-.18+i*.085,roofY+.997,gamesZ+i*.065]);
  rod([gamesX-.68,roofY+1.02,gamesZ-.95],[gamesX+.48,roofY+1.02,gamesZ+.87],.014,timber);
  // Rear lift connects ground, original upper floor and the new pavilion.
  const liftX=roof.max.x-1.05,liftZ=roof.min.z-.93,liftTop=roofY+2.7;
  const liftFacade=surface('estate_lift_rear_core',[2.1,liftTop,2.18],stone,[liftX,grade+liftTop*.5,liftZ],'facade');
  liftFacade.userData.rainFacing=[0,0,-1];
  for(const y of [grade+.18,3.56,roofY+.05]){
    box([1.34,2.12,.028],bronze,[liftX,y+1.06,liftZ+1.108]);
    box([.635,2.02,.025],silver,[liftX-.33,y+1.02,liftZ+1.131]);
    box([.635,2.02,.025],silver,[liftX+.33,y+1.02,liftZ+1.131]);
    box([.11,.20,.034],glow,[liftX+.82,y+1.13,liftZ+1.135]);
    box([2.1,.11,.75],paleStone,[liftX,y-.02,liftZ+1.42]);
  }
  box([2.35,.15,2.48],paleStone,[liftX,liftTop+.075,liftZ]);
  rainRoof('lift', [2.35,.15,2.48], [liftX,liftTop+.075,liftZ]);

  // Flatten all stationary subgroups into the main group so furniture does not
  // add a draw call for every leg. Preserve only actual interactive/moving roots.
  const preserved=new Set([garageDoor,car,swing]);
  const rebinned=new Map();group.updateWorldMatrix(true,true);
  for(const entry of bins.values()){
    let parent=entry.parent;
    if(!preserved.has(parent)&&parent!==group){
      const local=new THREE.Matrix4().copy(group.matrixWorld).invert().multiply(parent.matrixWorld);
      entry.parts.forEach(shape=>shape.applyMatrix4(local));parent=group;
    }
    const key=`${parent.uuid}:${entry.finish.uuid}`;
    if(!rebinned.has(key))rebinned.set(key,{parent,finish:entry.finish,parts:[]});
    rebinned.get(key).parts.push(...entry.parts);
  }
  for(const entry of rebinned.values()){
    const merged=ownGeometry(mergeGeometries(entry.parts,false));entry.parts.forEach(shape=>shape.dispose());
    const mesh=direct(`estate_merged_${entry.finish.name}`,merged,entry.finish,[0,0,0],entry.parent);
    if(entry.finish===glow||entry.finish===glass)mesh.castShadow=false;
  }
  bins.clear();
  group.updateWorldMatrix(true,true);
  const worldBounds=new THREE.Box3().setFromObject(group);
  report.worldBounds={min:worldBounds.min.toArray(),max:worldBounds.max.toArray()};
  report.meshCount=0;group.traverse(object=>{if(object.isMesh)report.meshCount++;});
  report.renderMeshCount=0;report.triangleCount=0;group.traverse(object=>{if(object.isMesh&&object.visible){report.renderMeshCount++;report.triangleCount+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);}});
  report.rainShelterCount=rainOccluders.length;
  report.wetSurfaceCount=wetSurfaces.length;
  const destinations=[
    {id:'estate',label:'Whole estate',description:'Villa, garden, pool and family amenities.',position:[west-22,16,pool.max.z+24],target:[west+4,2,6],floor:0},
    {id:'pool-club',label:'Pool lounge',description:'Teak loungers, linen parasols and drinks tables.',position:[pool.max.x+9,4.2,pool.max.z+6],target:[pool.max.x+2.6,.8,loungerZ],floor:0},
    {id:'outdoor-dining',label:'Outdoor kitchen',description:'Garden dining and a fitted barbecue counter.',position:[west-4,3.2,11.8],target:[bbqX,1,5.3],floor:0},
    {id:'water-garden',label:'Water-play garden',description:'A shallow splash pool, slide and fountain arcs.',position:[waterX-7,4.5,waterZ+7],target:[waterX,.9,waterZ],floor:0},
    {id:'play-garden',label:'Children’s garden',description:'Timber playhouse, slide and swing.',position:[playX-7,3.3,playZ+6],target:[playX,1.2,playZ],floor:0},
    {id:'garage',label:'Garage & sports car',description:'Open the timber garage door and choose a car finish.',position:[garageX-5,2.9,garageFront+8],target:[garageX,1.1,garageZ+.3],floor:0},
    {id:'roof-lounge',label:'Sky lounge',description:'A third-level cinema and games pavilion with lift access.',position:[pavilionX-6,roofY+3.1,roofFront+8],target:[pavilionX,roofY+1.1,roofRear+1.9],floor:3}
  ];
  const actions=[
    {id:'garage-door',label:'Open garage',type:'door',state:'closed',description:'Open or close the timber garage door.'},
    {id:'roof-tv',label:'Turn roof TV off',type:'screen',state:'on',description:'Switch the sky lounge screen.'},
    {id:'car-paint',label:'Change car finish',type:'style',state:'racing-green',description:'Cycle three sports car finishes.'}
  ];
  const state={motion:true,weather:'clear',wind:.35,mode:'evening'};
  let disposed=false,garageOpen=false,garageAmount=0,tvOn=true,elapsed=0;
  const carColors={'racing-green':'#365b57',silver:'#c5c0b5',red:'#832f30'};
  const carKeys=Object.keys(carColors);let carColorIndex=0;
  const refreshActions=()=>{report.actions=actions.map(({id,label,type,state})=>({id,label,type,state}));};
  function setState(next={}){
    if(disposed)return;
    Object.assign(state,next);
    wind.value=THREE.MathUtils.clamp(Number(state.wind)||0,0,1);rain.value=state.weather==='rain'?1:0;
    waterMaterial.roughness=state.weather==='rain'?.27:.18;
    glow.emissiveIntensity=state.mode==='night'?1.7:state.mode==='day'?.22:.8;
    if(next.carColor){carPaint.color.set(carColors[next.carColor]??next.carColor);report.carColor=next.carColor;actions[2].state=next.carColor;if(carKeys.includes(next.carColor))carColorIndex=carKeys.indexOf(next.carColor);refreshActions();}
    Object.assign(report,{weather:state.weather,motion:Boolean(state.motion),wind:wind.value,mode:state.mode});
  }
  function activate(id){
    if(disposed)return false;
    if(id==='garage-door'){garageOpen=!garageOpen;report.garageOpen=garageOpen;report.garageAnimating=true;actions[0].label=garageOpen?'Close garage':'Open garage';actions[0].state=garageOpen?'open':'closed';refreshActions();return true;}
    if(id==='roof-tv'){tvOn=!tvOn;tvMaterial.color.set(tvOn?'#ffffff':'#101714');tvMaterial.emissiveIntensity=tvOn?.85:0;report.roofTvOn=tvOn;actions[1].label=tvOn?'Turn roof TV off':'Turn roof TV on';actions[1].state=tvOn?'on':'off';refreshActions();return true;}
    if(id==='car-paint'){carColorIndex=(carColorIndex+1)%carKeys.length;setState({carColor:carKeys[carColorIndex]});return true;}
    return false;
  }
  function activateFromObject(object){for(let current=object;current&&current!==scene;current=current.parent)if(current.userData?.estateAction)return activate(current.userData.estateAction);return false;}
  function actionForObject(object){for(let current=object;current&&current!==scene;current=current.parent)if(current.userData?.estateAction)return actions.find(action=>action.id===current.userData.estateAction)??null;return null;}
  function update(delta){
    if(disposed)return false;
    const dt=Math.max(0,Math.min(Number(delta)||0,.1));let changed=false;
    const target=garageOpen?1:0;
    if(Math.abs(garageAmount-target)>.001){garageAmount=THREE.MathUtils.damp(garageAmount,target,4,dt);if(Math.abs(garageAmount-target)<.001)garageAmount=target;garageDoor.rotation.x=garageAmount*Math.PI*.48;garageDoor.position.y=grade+2.75+garageAmount*.08;changed=true;}
    if(state.motion&&dt>0){elapsed+=dt;waterTime.value=elapsed;updateFountain(elapsed);swing.rotation.x=Math.sin(elapsed*.82)*.075*wind.value;changed=true;}
    report.elapsedSeconds=elapsed;report.garageProgress=garageAmount;report.garageAnimating=Math.abs(garageAmount-target)>.001;return changed;
  }
  actions.forEach(action=>{action.handler=()=>activate(action.id);});refreshActions();
  const clickableMeshes=[];interactables.forEach(object=>object.traverse(child=>{if(child.isMesh)clickableMeshes.push(child);}));
  setState({carColor:'racing-green'});
  return {group,report,destinations,wetSurfaces,rainOccluders,actions,interactables:clickableMeshes,interactiveTargets:{garageDoor,tvScreen,car},setState,activate,activateFromObject,actionForObject,update,
    dispose(){if(disposed)return;disposed=true;report.disposed=true;group.removeFromParent();for(const item of geometries)item.dispose();for(const item of materials)item.dispose();screenTexture.dispose();bins.clear();cache.clear();}
  };
}
