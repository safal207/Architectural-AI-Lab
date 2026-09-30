const EXTERIOR_GLASS = /^(living_glass_|master_glass_|balcony_glass_|screen_left_core_recess_glass_)/;
const EXTERIOR_FACADE = /^(ground_left_stone_core|ground_right_private_core|ground_back_wall|master_(rear|right)_wall_v04)/;
const RAIN_BLOCKER = /roof|slab|canopy|cantilever|ceiling|soffit|wall|core|pool_|terrace_deck|site_plinth|planter/;
const IGNORE_BLOCKER = /agave|grass|ribbon|leaf|light|glow|horizon|mist|runtime_rain/;

function seededRandom(seed = 94271) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const RAIN_SHADER_COMMON = /* glsl */ `
  varying vec3 vRainSurfaceWorld;
  varying vec3 vRainSurfaceNormal;
  varying vec3 vRainPaneRest;
  uniform float uSurfaceWater;
  uniform float uSurfaceTime;
  uniform float uSurfaceExposure;
  uniform float uSurfaceWind;
  uniform vec3 uSurfaceFacing;
  uniform vec3 uSurfaceSide;
  uniform vec3 uPaneOrigin;
  uniform vec3 uPaneHorizontal;
  uniform float uPaneHeight;
  vec2 rainSurfaceHash(vec2 p) {
    vec3 h = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    h += dot(h, h.yzx + 33.33);
    return fract((h.xx + h.yz) * h.zy);
  }
`;

const GLASS_FUNCTIONS = /* glsl */ `
  // Physical metre coordinates keep the bead size consistent between panes.
  vec3 glassRain(vec2 p) {
    vec2 grid = p * vec2(20.0, 18.0);
    vec2 cell = floor(grid);
    vec2 seed = rainSurfaceHash(cell);
    vec2 drop = fract(grid) - vec2(0.22, 0.24) - seed * vec2(0.56, 0.47);
    vec2 rounded = drop * vec2(5.3, 4.0);
    float bead = max(0.0, 1.0 - dot(rounded, rounded));
    bead *= bead * step(0.31, seed.x);

    float column = floor(p.x * 14.0);
    vec2 trailSeed = rainSurfaceHash(vec2(column, uPaneOrigin.x + uPaneOrigin.z));
    float cycle = fract(uSurfaceTime * (0.085 + trailSeed.x * 0.065) + trailSeed.y);
    float headY = mix(uPaneHeight + 0.15, -0.15, cycle);
    float dx = fract(p.x * 14.0) - 0.17 - trailSeed.x * 0.66;
    float dy = p.y - headY;
    vec2 headDelta = vec2(dx * 5.6, dy * 34.0);
    float head = max(0.0, 1.0 - dot(headDelta, headDelta));
    head *= head;
    float trail = max(0.0, 1.0 - abs(dx) * 13.0);
    trail *= trail * smoothstep(0.0, 0.055, dy) * (1.0 - smoothstep(0.12, 0.78, dy));
    float boundary = smoothstep(0.0, 0.055, p.y) * (1.0 - smoothstep(uPaneHeight - 0.06, uPaneHeight, p.y));
    float amount = clamp(uSurfaceWater * 2.4, 0.0, 1.0) * uSurfaceExposure * boundary;
    return vec3((bead * 0.62 + head + trail * 0.28) * amount,
      (drop.x * bead * 0.30 + dx * (head + trail) * 0.42) * amount,
      (drop.y * bead * 0.22 + dy * head * 2.0) * amount);
  }
`;

/**
 * Accumulated rain, composed glass/façade materials and small instanced effects.
 * Call after the model transforms/material palette and livingDetails are installed.
 * Additional estate meshes can use registerSurface(mesh, kind). Glass can slide;
 * ground geometry stays fixed after its puddle footprints have been sampled.
 */
export function createRainSurfaces(THREE, { scene, root, quality = 'desktop' }) {
  const mobile = quality === 'mobile' || quality === 'low' || quality?.mobile === true;
  const capacity = mobile ? 32 : 64;
  const report = {
    profile: 'accumulated-exterior-rain-v1',
    accumulatedWetness: 0,
    buildupSeconds: 24,
    dryingSeconds: 100,
    elapsedSeconds: 0,
    puddleCount: 0,
    puddleCapacity: capacity,
    puddleSurfaceCount: 0,
    protectedCandidatesRejected: 0,
    unsupportedCandidatesRejected: 0,
    facadeMeshCount: 0,
    glassPaneCount: 0,
    wetGroundMeshCount: 0,
    mistInstanceCount: 0,
    additionalDrawCalls: 0,
    renderTargets: 0,
    state: { mode: 'day', weather: 'clear', wind: 0.35, motion: true },
    disposed: false
  };
  const state = { ...report.state };
  const group = new THREE.Group();
  group.name = 'runtime_rain_surfaces';
  scene.add(group);
  const ownedMaterials = new Set();
  const ownedGeometries = new Set();
  const restorations = [];
  const registered = new Map();
  const surfaceUniforms = [];
  const clock = { value: 0 };
  const accumulation = { value: 0 };
  const falling = { value: 0 };
  const breeze = { value: 0.35 };
  const random = seededRandom();
  const raycaster = new THREE.Raycaster();
  const rayHits = [];
  const sampleNormal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  const rayDirection = new THREE.Vector3(0, -1, 0);
  const identityNormal = new THREE.Vector3(0, 1, 0);
  const instanceMatrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  root?.updateWorldMatrix(true, true);
  const rootCenter = new THREE.Vector3();
  const house = root?.getObjectByName('ground_floor_slab');
  if (house) new THREE.Box3().setFromObject(house).getCenter(rootCenter);
  const pool = root?.getObjectByName('pool_water');
  const poolBounds = pool?.isMesh ? new THREE.Box3().setFromObject(pool) : null;
  const poolDirection = poolBounds && poolBounds.getCenter(new THREE.Vector3()).z < rootCenter.z ? -1 : 1;

  function ownMaterial(material) { ownedMaterials.add(material); return material; }
  function ownGeometry(geometry) { ownedGeometries.add(geometry); return geometry; }
  function worldBounds(object) {
    object.updateWorldMatrix(true, false);
    return new THREE.Box3().setFromObject(object);
  }
  function findBlockers() {
    const boxes = [];
    // Include registered estate roofs when they use a structural name or mark
    // userData.rainShelter=true. The sky and rain particles never act as roofs.
    scene.traverse((object) => {
      if (!object.isMesh || !object.geometry || IGNORE_BLOCKER.test(object.name)) return;
      if (!RAIN_BLOCKER.test(object.name) && object.userData?.rainShelter !== true) return;
      const bounds = worldBounds(object);
      if (!bounds.isEmpty()) boxes.push({ object, bounds });
    });
    return boxes;
  }
  function shelteredAt(x, z, elevation, blockers, margin = 0) {
    return blockers.some(({ bounds }) => bounds.max.y > elevation + 0.04
      && x + margin >= bounds.min.x && x - margin <= bounds.max.x
      && z + margin >= bounds.min.z && z - margin <= bounds.max.z);
  }

  // One shared asymmetric polygon and one instanced draw for every puddle.
  const sides = mobile ? 16 : 22;
  const vertices = [0, 0, 0];
  const indices = [];
  const shapeRandom = seededRandom(5359);
  for (let i = 0; i < sides; i++) {
    const angle = i * Math.PI * 2 / sides;
    const radius = 0.77 + shapeRandom() * 0.23;
    vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    indices.push(0, i + 1, (i + 1) % sides + 1);
  }
  const puddleGeometry = ownGeometry(new THREE.BufferGeometry());
  puddleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  puddleGeometry.setIndex(indices);
  puddleGeometry.computeVertexNormals();
  const puddleSeeds = new Float32Array(capacity);
  puddleGeometry.setAttribute('aPuddleSeed', new THREE.InstancedBufferAttribute(puddleSeeds, 1));
  const puddleMaterial = ownMaterial(new THREE.MeshStandardMaterial({
    name: 'AccumulatedRainPuddles', color: '#81949a', roughness: 0.095,
    metalness: 0.08, transparent: true, opacity: 0.59, depthWrite: false,
    depthTest: true, side: THREE.FrontSide, polygonOffset: true,
    polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    envMap: scene.environment, envMapIntensity: 1.0
  }));
  puddleMaterial.customProgramCacheKey = () => 'rain-puddle-growth-v1';
  puddleMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uPuddleWater = accumulation;
    shader.uniforms.uPuddleTime = clock;
    shader.uniforms.uPuddleRain = falling;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aPuddleSeed;
        uniform float uPuddleWater;
        varying vec3 vPuddleWorld;
        varying float vPuddleGrowth;
      `)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vPuddleGrowth = smoothstep(aPuddleSeed * 0.10, 0.88, uPuddleWater);
        transformed.xy *= 0.10 + vPuddleGrowth * 0.90;
      `)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vPuddleWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      `);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uPuddleTime;
        uniform float uPuddleRain;
        varying vec3 vPuddleWorld;
        varying float vPuddleGrowth;
      `)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.a *= smoothstep(0.0, 0.18, vPuddleGrowth);
      `)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 puddleSlope = vec2(
          cos(vPuddleWorld.x * 13.0 + vPuddleWorld.z * 9.0 + uPuddleTime * 2.8),
          cos(vPuddleWorld.z * 17.0 - vPuddleWorld.x * 8.0 - uPuddleTime * 3.1)
        ) * uPuddleRain * 0.016;
        normal = normalize(mat3(viewMatrix) * vec3(-puddleSlope.x, 1.0, -puddleSlope.y));
      `);
  };
  const puddles = new THREE.InstancedMesh(puddleGeometry, puddleMaterial, capacity);
  puddles.name = 'runtime_rain_puddles';
  puddles.count = 0;
  puddles.visible = false;
  puddles.castShadow = false;
  puddles.receiveShadow = true;
  puddles.renderOrder = 1;
  group.add(puddles);

  function supportsPuddle(object, x, z, y, radius) {
    normalMatrix.getNormalMatrix(object.matrixWorld);
    // Boundary samples prevent decals bridging holes, missing slabs or sloped
    // edges. Structural bounding boxes additionally reject covered footprints.
    for (let sample = 0; sample < 9; sample++) {
      const angle = (sample - 1) * Math.PI / 4;
      const px = x + (sample ? Math.cos(angle) * radius : 0);
      const pz = z + (sample ? Math.sin(angle) * radius : 0);
      raycaster.set(position.set(px, y + 0.25, pz), rayDirection);
      raycaster.far = 0.5;
      rayHits.length = 0;
      raycaster.intersectObject(object, false, rayHits);
      const hit = rayHits[0];
      if (!hit || Math.abs(hit.point.y - y) > 0.018 || !hit.face) return false;
      sampleNormal.copy(hit.face.normal).applyNormalMatrix(normalMatrix);
      if (sampleNormal.dot(identityNormal) < 0.985) return false;
    }
    return true;
  }

  function addPuddles(object, kind, bounds, blockers) {
    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.z - bounds.min.z;
    if (width < 0.8 || depth < 0.8 || puddles.count >= capacity) return;
    const goal = Math.min(mobile ? 6 : 10, Math.ceil(width * depth / 28));
    const priorCount = puddles.count;
    for (let attempt = 0; attempt < goal * 24 && puddles.count - priorCount < goal && puddles.count < capacity; attempt++) {
      const radiusX = Math.min(width * 0.19, 0.43 + random() * (kind === 'asphalt' ? 0.95 : 0.66));
      const radiusZ = Math.min(depth * 0.19, 0.25 + random() * 0.37);
      const radius = Math.max(radiusX, radiusZ);
      if (width <= radius * 2.1 || depth <= radius * 2.1) continue;
      const x = bounds.min.x + radius + random() * (width - radius * 2);
      const z = bounds.min.z + radius + random() * (depth - radius * 2);
      const y = bounds.max.y;
      if (shelteredAt(x, z, y, blockers.filter((entry) => entry.object !== object), radius)) {
        report.protectedCandidatesRejected++;
        continue;
      }
      if (!supportsPuddle(object, x, z, y, radius)) {
        report.unsupportedCandidatesRejected++;
        continue;
      }
      const index = puddles.count++;
      position.set(x, y + 0.004, z);
      rotation.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, random() * Math.PI * 2));
      scale.set(radiusX, radiusZ, 1);
      instanceMatrix.compose(position, rotation, scale);
      puddles.setMatrixAt(index, instanceMatrix);
      puddles.setColorAt(index, new THREE.Color(kind === 'asphalt' ? '#53616b' : '#9ca6a4'));
      puddleSeeds[index] = random();
    }
    if (puddles.count > priorCount) {
      puddles.instanceMatrix.needsUpdate = true;
      if (puddles.instanceColor) puddles.instanceColor.needsUpdate = true;
      puddleGeometry.attributes.aPuddleSeed.needsUpdate = true;
      puddles.computeBoundingSphere();
      report.puddleSurfaceCount++;
    }
    report.puddleCount = puddles.count;
    report.additionalDrawCalls = Number(puddles.count > 0) + Number(report.mistInstanceCount > 0);
  }

  function composeSurfaceMaterial(object, kind, bounds, blockers) {
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const thinX = size.x < size.z;
    let facing = new THREE.Vector3(0, 0, poolDirection);
    if (kind === 'glass') {
      facing = thinX ? new THREE.Vector3(Math.sign(center.x - rootCenter.x) || 1, 0, 0) : facing;
    } else if (/back_wall|rear_wall/.test(object.name)) {
      facing.set(0, 0, -poolDirection);
    } else if (/right_wall/.test(object.name)) {
      facing.set(Math.sign(center.x - rootCenter.x) || 1, 0, 0);
    }
    const explicitFacing = object.userData.rainFacing;
    if (Array.isArray(explicitFacing) && explicitFacing.length === 3 && explicitFacing.every(Number.isFinite)) {
      const direction = new THREE.Vector3().fromArray(explicitFacing);
      if (direction.lengthSq() > 1e-8) facing.copy(direction).normalize();
    }
    const side = kind === 'facade' && /core/.test(object.name)
      ? new THREE.Vector3(Math.sign(center.x - rootCenter.x) || 1, 0, 0) : facing.clone();
    const probe = center.clone().addScaledVector(facing, (thinX ? size.x : size.z) / 2 + 0.08);
    const sheltered = shelteredAt(probe.x, probe.z, bounds.max.y + 0.02,
      blockers.filter((entry) => entry.object !== object));
    const exposure = { value: sheltered ? 0.08 + state.wind * 0.55 : 1 };
    // Keep the original metre-scale pattern, but anchor it to the pane. Using a
    // displacement (w=0) below removes object/parent translation even on pause.
    const paneLocalOrigin = object.worldToLocal(bounds.min.clone());
    surfaceUniforms.push({ exposure, sheltered });
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    let attached = false;
    const clones = originals.map((source) => {
      if (!source?.isMeshStandardMaterial) return source;
      const clone = ownMaterial(source.clone());
      const previousHook = source.onBeforeCompile;
      const previousKey = source.customProgramCacheKey.call(source);
      clone.userData = { ...source.userData, runtimeMaterialClone: true, rainSurfaceKind: kind };
      clone.customProgramCacheKey = () => `${previousKey}|accumulated-rain-${kind}-v2`;
      clone.onBeforeCompile = (shader, activeRenderer) => {
        previousHook.call(clone, shader, activeRenderer);
        Object.assign(shader.uniforms, {
          uSurfaceWater: accumulation, uSurfaceTime: clock, uSurfaceWind: breeze,
          uSurfaceExposure: exposure, uSurfaceFacing: { value: facing }, uSurfaceSide: { value: side },
          uPaneOrigin: { value: bounds.min.clone() },
          uPaneLocalOrigin: { value: paneLocalOrigin },
          uPaneHorizontal: { value: new THREE.Vector3(thinX ? 0 : 1, 0, thinX ? 1 : 0) },
          uPaneHeight: { value: size.y }
        });
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vRainSurfaceWorld;\nvarying vec3 vRainSurfaceNormal;\nvarying vec3 vRainPaneRest;\nuniform vec3 uPaneLocalOrigin;')
          .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
            vec4 rainLocalPosition = vec4(transformed, 1.0);
            vec4 rainPaneRestPosition = vec4(transformed - uPaneLocalOrigin, 0.0);
            vec3 rainLocalNormal = normal;
            #ifdef USE_INSTANCING
              rainLocalPosition = instanceMatrix * rainLocalPosition;
              rainPaneRestPosition = instanceMatrix * rainPaneRestPosition;
              rainLocalNormal = mat3(instanceMatrix) * rainLocalNormal;
            #endif
            vRainSurfaceWorld = (modelMatrix * rainLocalPosition).xyz;
            vRainPaneRest = (modelMatrix * rainPaneRestPosition).xyz;
            vRainSurfaceNormal = normalize(mat3(modelMatrix) * rainLocalNormal);
          `);
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
          `#include <common>\n${RAIN_SHADER_COMMON}\n${kind === 'glass' ? GLASS_FUNCTIONS : ''}`);
        if (kind === 'glass') {
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <color_fragment>', `#include <color_fragment>
              vec3 paneRain = vec3(0.0);
              if (uSurfaceWater > 0.001) {
                vec2 panePosition = vec2(dot(vRainPaneRest, uPaneHorizontal), vRainPaneRest.y);
                paneRain = glassRain(panePosition);
                float paneFacing = smoothstep(0.65, 0.95, dot(normalize(vRainSurfaceNormal), uSurfaceFacing));
                paneRain *= paneFacing;
              }
              diffuseColor.rgb *= 1.0 - paneRain.x * 0.12;
            `)
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
              roughnessFactor = mix(roughnessFactor, min(roughnessFactor, 0.075), paneRain.x * 0.7);
            `)
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
              normal = normalize(normal + mat3(viewMatrix) * (uPaneHorizontal * paneRain.y + vec3(0.0, paneRain.z, 0.0)));
            `);
        } else {
          const mask = kind === 'facade'
            ? 'smoothstep(0.55, 0.95, max(dot(normalize(vRainSurfaceNormal), uSurfaceFacing), dot(normalize(vRainSurfaceNormal), uSurfaceSide)))'
            : 'smoothstep(0.8, 0.97, vRainSurfaceNormal.y)';
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <color_fragment>', `#include <color_fragment>
              float surfaceExposure = ${mask};
              vec2 runoffSeed = rainSurfaceHash(floor(vRainSurfaceWorld.xz * 8.0));
              float surfaceFilm = uSurfaceWater * uSurfaceExposure * surfaceExposure;
              float surfaceVariation = mix(0.72, 1.0, runoffSeed.x);
              diffuseColor.rgb *= 1.0 - surfaceFilm * surfaceVariation * ${kind === 'asphalt' ? '0.34' : '0.20'};
            `)
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
              roughnessFactor = mix(roughnessFactor, min(roughnessFactor, ${kind === 'asphalt' ? '0.22' : '0.30'}), surfaceFilm * surfaceVariation);
            `);
        }
      };
      attached = true;
      return clone;
    });
    if (!attached) return;
    const originalMaterial = object.material;
    const nextMaterial = Array.isArray(originalMaterial) ? clones : clones[0];
    object.material = nextMaterial;
    restorations.push(() => { if (object.material === nextMaterial) object.material = originalMaterial; });
    if (kind === 'glass') report.glassPaneCount++;
    else if (kind === 'facade') report.facadeMeshCount++;
    else report.wetGroundMeshCount++;
  }

  /** Register after world transforms settle; glass may slide. Repeated calls are harmless. */
  function registerSurface(object, kind = 'asphalt') {
    if (report.disposed || !object?.isMesh || !object.geometry?.attributes?.position || registered.has(object)) return false;
    if (!['asphalt', 'deck', 'facade', 'glass', 'puddles'].includes(kind)) return false;
    const bounds = worldBounds(object);
    if (bounds.isEmpty()) return false;
    registered.set(object, kind);
    const blockers = findBlockers();
    // Existing livingDetails owns deck/coping wetness. Its clones and hooks stay
    // intact; this layer adds separate accumulated puddles on the same geometry.
    const detailsOwned = object.name === 'terrace_deck' || /^pool_coping_/.test(object.name);
    if (kind !== 'puddles' && !detailsOwned) composeSurfaceMaterial(object, kind, bounds, blockers);
    if (['asphalt', 'deck', 'puddles'].includes(kind)) addPuddles(object, kind, bounds, blockers);
    return true;
  }

  let mist = null;
  if (poolBounds && !poolBounds.isEmpty()) {
    const size = poolBounds.getSize(new THREE.Vector3());
    const count = mobile ? 6 : 12;
    const mistGeometry = ownGeometry(new THREE.PlaneGeometry(1, 1));
    const mistSeeds = new Float32Array(count);
    mistGeometry.setAttribute('aMistSeed', new THREE.InstancedBufferAttribute(mistSeeds, 1));
    const mistMaterial = ownMaterial(new THREE.ShaderMaterial({
      uniforms: {
        uMistTime: clock, uMistWater: accumulation, uMistRain: falling, uMistWind: breeze,
        uMistColor: { value: new THREE.Color('#becbd0') }
      },
      vertexShader: /* glsl */ `
        attribute float aMistSeed;
        uniform float uMistTime;
        uniform float uMistWind;
        varying vec2 vMistUv;
        void main() {
          vMistUv = uv * 2.0 - 1.0;
          vec3 origin = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          origin.x += sin(uMistTime * 0.12 + aMistSeed * 12.0) * (0.10 + uMistWind * 0.20);
          origin.z += cos(uMistTime * 0.09 + aMistSeed * 18.0) * 0.16;
          vec4 viewPosition = modelViewMatrix * vec4(origin, 1.0);
          viewPosition.xy += position.xy * vec2(1.25 + aMistSeed * 0.55, 0.24 + aMistSeed * 0.10);
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uMistWater;
        uniform float uMistRain;
        uniform vec3 uMistColor;
        varying vec2 vMistUv;
        void main() {
          float feather = max(0.0, 1.0 - dot(vMistUv, vMistUv));
          float alpha = feather * feather * feather * uMistWater * uMistRain * 0.065;
          gl_FragColor = vec4(uMistColor, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true, depthTest: true, depthWrite: false, toneMapped: true
    }));
    mist = new THREE.InstancedMesh(mistGeometry, mistMaterial, count);
    mist.name = 'runtime_rain_pool_mist';
    mist.frustumCulled = false;
    mist.renderOrder = 2;
    mist.visible = false;
    for (let i = 0; i < count; i++) {
      const seed = random();
      mistSeeds[i] = seed;
      instanceMatrix.makeTranslation(
        poolBounds.min.x + 0.9 + random() * Math.max(0.1, size.x - 1.8),
        poolBounds.max.y + 0.17,
        poolBounds.min.z + 0.5 + random() * Math.max(0.1, size.z - 1.0)
      );
      mist.setMatrixAt(i, instanceMatrix);
    }
    mist.instanceMatrix.needsUpdate = true;
    group.add(mist);
    report.mistInstanceCount = count;
  }

  // Selection intentionally excludes interior stair glass, room floors, pool
  // water and furniture. Every puddle is supported by its named exterior mesh.
  const initialSurfaces = [];
  root?.traverse((object) => {
    if (!object.isMesh) return;
    if (EXTERIOR_GLASS.test(object.name)) initialSurfaces.push([object, 'glass']);
    else if (EXTERIOR_FACADE.test(object.name)) initialSurfaces.push([object, 'facade']);
    else if (object.name === 'terrace_deck') initialSurfaces.push([object, 'puddles']);
    else if (object.name === 'site_plinth') initialSurfaces.push([object, 'deck']);
  });
  for (const [object, kind] of initialSurfaces) registerSurface(object, kind);
  report.additionalDrawCalls = Number(puddles.count > 0) + Number(mist !== null);

  function setState(next = {}) {
    if (report.disposed) return;
    if (next.weather === 'rain' || next.weather === 'clear') state.weather = next.weather;
    if (['day', 'evening', 'night'].includes(next.mode)) state.mode = next.mode;
    if (Number.isFinite(next.wind)) state.wind = THREE.MathUtils.clamp(next.wind, 0, 1);
    if (typeof next.motion === 'boolean') state.motion = next.motion;
    falling.value = state.weather === 'rain' ? 1 : 0;
    breeze.value = state.wind;
    for (const surface of surfaceUniforms) surface.exposure.value = surface.sheltered ? 0.08 + state.wind * 0.55 : 1;
    puddleMaterial.envMap = scene.environment;
    puddleMaterial.envMapIntensity = state.mode === 'night' ? 0.7 : 1.0;
    if (mist) {
      mist.material.uniforms.uMistColor.value.set(state.mode === 'night' ? '#71869b' : state.mode === 'evening' ? '#c0bbaf' : '#becbd0');
      mist.visible = falling.value > 0 && accumulation.value > 0.015;
    }
    Object.assign(report.state, state);
  }

  function update(delta = 0) {
    if (report.disposed || !state.motion) return false;
    const dt = Math.min(Math.max(Number.isFinite(delta) ? delta : 0, 0), 0.25);
    if (dt === 0 || (falling.value === 0 && accumulation.value === 0)) return false;
    clock.value += dt;
    accumulation.value = THREE.MathUtils.clamp(accumulation.value + dt * (falling.value ? 1 / report.buildupSeconds : -1 / report.dryingSeconds), 0, 1);
    if (accumulation.value < 1e-7) accumulation.value = 0;
    report.accumulatedWetness = accumulation.value;
    report.elapsedSeconds = clock.value;
    puddles.visible = accumulation.value > 0.005 && puddles.count > 0;
    if (mist) mist.visible = falling.value > 0 && accumulation.value > 0.015;
    if (puddleMaterial.envMap !== scene.environment) puddleMaterial.envMap = scene.environment;
    return true;
  }

  function dispose() {
    if (report.disposed) return;
    report.disposed = true;
    restorations.forEach((restore) => restore());
    scene.remove(group);
    ownedGeometries.forEach((geometry) => geometry.dispose());
    // All environment/maps are borrowed from the scene or GLB, never disposed here.
    ownedMaterials.forEach((material) => material.dispose());
    registered.clear();
    group.clear();
  }

  setState();
  return { setState, update, dispose, registerSurface, report };
}
