/**
 * Browser-owned atmosphere: a procedural sky and GPU-animated rain columns.
 * The model must already have its final world transform before construction.
 * Model materials, lighting and background remain owned by the viewer. A cached
 * sky reflection environment is installed and its previous value restored on disposal.
 */

const PALETTES = {
  day: {
    top: '#6b9cbb', horizon: '#e7deca', cloud: '#f4f2e9',
    rainTop: '#596c7d', rainHorizon: '#adb7b9', rainCloud: '#bfc8cb',
    sun: '#fff0d4', position: [-14, 18, 16], night: 0
  },
  evening: {
    top: '#566e91', horizon: '#e7b38e', cloud: '#ebc9b4',
    rainTop: '#505d72', rainHorizon: '#a6a2a5', rainCloud: '#b2b4bc',
    sun: '#ffd6a1', position: [-18, 7, 14], night: 0
  },
  night: {
    top: '#091322', horizon: '#26364a', cloud: '#40516b',
    rainTop: '#101b29', rainHorizon: '#30404e', rainCloud: '#435263',
    sun: '#c9def2', position: [-10, 20, -12], night: 1
  }
};

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Place the sky at the far plane, independently of the camera's far range.
    gl_Position = p.xyww;
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uCloud;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uTime;
  uniform float uWind;
  uniform float uRain;
  uniform float uNight;
  varying vec3 vDirection;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise21(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x), f.y);
  }
  float cloudNoise(vec2 p) {
    float n = 0.0;
    float amplitude = 0.52;
    mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
    for (int octave = 0; octave < 4; octave++) {
      n += noise21(p) * amplitude;
      p = turn * p * 2.07 + vec2(17.7, 9.2);
      amplitude *= 0.48;
    }
    return n;
  }

  void main() {
    vec3 d = normalize(vDirection);
    float height = max(d.y, 0.0);
    float horizonMix = pow(smoothstep(-0.10, 0.38, d.y), 0.60);
    vec3 color = mix(uHorizon, uTop, horizonMix);

    float sunAlignment = max(dot(d, uSunDirection), 0.0);
    float halo = pow(sunAlignment, mix(14.0, 28.0, uNight));
    float disc = smoothstep(mix(0.99945, 0.99960, uNight), 0.99992, sunAlignment);
    float daylight = mix(1.0, 0.38, uNight) * (1.0 - uRain * 0.94);
    color += uSunColor * (halo * 0.20 + disc * 1.55) * daylight;

    // Anisotropic noise produces long wisps rather than round smoke puffs.
    vec2 cloudUv = d.xz / (0.30 + height);
    cloudUv *= vec2(1.85, 3.75);
    cloudUv += vec2(uTime * uWind * 0.0030, uTime * uWind * 0.0012);
    float soft = cloudNoise(cloudUv);
    float detail = cloudNoise(cloudUv * vec2(1.1, 2.9) + vec2(13.0, 3.0));
    float density = mix(soft * 0.62 + detail * 0.38, soft, uRain);
    float coverage = smoothstep(mix(0.48, 0.24, uRain), mix(0.70, 0.66, uRain), density);
    coverage *= smoothstep(-0.015, 0.09, d.y);
    coverage *= mix(0.76, 0.93, uRain);
    vec3 cloudColor = uCloud * (0.78 + density * 0.37);
    cloudColor += uSunColor * halo * 0.13 * (1.0 - uRain) * (1.0 - uNight);
    color = mix(color, cloudColor, coverage);

    // A sparse stable star field fades out naturally through cloud cover.
    vec2 starsUv = vec2(atan(d.z, d.x) / 6.2831853, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927);
    vec2 starCell = starsUv * vec2(750.0, 375.0);
    float starSeed = hash21(floor(starCell));
    vec2 starDelta = fract(starCell) - vec2(0.5);
    float star = (1.0 - smoothstep(0.03, 0.16, length(starDelta))) * step(0.993, starSeed);
    color += vec3(0.60, 0.72, 0.88) * star * uNight * (1.0 - uRain) * (1.0 - coverage)
      * smoothstep(0.06, 0.35, d.y);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const RAIN_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  uniform float uTop;
  attribute float aFloor;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aEnd;
  varying float vOpacity;
  varying float vViewDistance;
  void main() {
    float span = max(uTop - aFloor, 1.0);
    float cycle = fract(aPhase - uTime * aSpeed / span);
    float fallY = aFloor + cycle * span;
    float streakLength = 0.18 + aSpeed * 0.025;
    // The complete slanted trajectory is covered by the conservative roof scan.
    vec2 drift = vec2(0.78, 0.31) * uWind * (1.0 - cycle);
    vec3 p = position + vec3(drift.x, fallY + aEnd * streakLength, drift.y);
    p.xz -= vec2(0.10, 0.04) * uWind * aEnd;
    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    vOpacity = (0.44 + aPhase * 0.38) * mix(0.36, 1.0, aEnd);
    vOpacity *= smoothstep(0.0, 0.20, fallY - aFloor);
    vViewDistance = length(viewPosition.xyz);
  }
`;

const RAIN_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vOpacity;
  varying float vViewDistance;
  void main() {
    float distanceFade = 1.0 - smoothstep(28.0, 65.0, vViewDistance);
    float cameraFade = smoothstep(0.6, 2.0, vViewDistance);
    gl_FragColor = vec4(uColor, vOpacity * uOpacity * distanceFade * cameraFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** A deterministic seed keeps captures and mode comparisons repeatable. */
function randomGenerator() {
  let seed = 71337;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function createRain(THREE, root, mobile) {
  const count = mobile ? 240 : 600;
  const structuralMeshes = [];
  const overheadBounds = [];
  const siteBounds = new THREE.Box3();
  const meshBounds = new THREE.Box3();
  root?.updateWorldMatrix(true, true);
  root?.traverse((object) => {
    if (!object.isMesh || !object.geometry?.attributes?.position) return;
    if (/roof|slab|canopy|cantilever|ceiling|soffit|wall|core|pool_water|pool_basin|coping|ground|field|deck|plinth|corridor_bridge/i.test(object.name)
      && !/agave|grass|ribbon|leaf|curtain|light|glow/i.test(object.name)) {
      structuralMeshes.push(object);
    }
    if (/roof|slab|canopy|cantilever|ceiling|soffit/.test(object.name)
      && !/light|glow/.test(object.name)) {
      overheadBounds.push(new THREE.Box3().setFromObject(object));
    }
    if (/^(roof_plane|ground_floor_slab|pool_water|terrace_deck|site_plinth)$/.test(object.name)) {
      siteBounds.union(meshBounds.setFromObject(object));
    }
  });
  if (siteBounds.isEmpty()) {
    siteBounds.set(new THREE.Vector3(-12, 0, -12), new THREE.Vector3(12, 7, 16));
  }
  siteBounds.min.x -= 7;
  siteBounds.max.x += 7;
  siteBounds.min.z -= 7;
  siteBounds.max.z += 7;
  const top = Math.max(siteBounds.max.y + 10, 17);
  const ground = Math.min(0, siteBounds.min.y) + 0.04;
  const spanX = siteBounds.max.x - siteBounds.min.x;
  const spanZ = siteBounds.max.z - siteBounds.min.z;
  const raycaster = new THREE.Raycaster();
  raycaster.ray.direction.set(0, -1, 0);
  raycaster.far = top - ground + 2;
  const hits = [];
  const sampleOffsets = [[-0.12, -0.06], [0, 0], [0.42, 0.17], [0.82, 0.34]];
  const positions = new Float32Array(count * 6);
  const floors = new Float32Array(count * 2);
  const phases = new Float32Array(count * 2);
  const speeds = new Float32Array(count * 2);
  const ends = new Float32Array(count * 2);
  const random = randomGenerator();
  let roofProtectedColumns = 0;
  for (let drop = 0; drop < count; drop++) {
    const x = siteBounds.min.x + random() * spanX;
    const z = siteBounds.min.z + random() * spanZ;
    let floor = ground;
    // Once-only geometry queries prevent rain entering rooms and covered terraces.
    // Multiple samples include the full wind sweep and segment tail at wind = 1.
    for (const offset of sampleOffsets) {
      raycaster.ray.origin.set(x + offset[0], top, z + offset[1]);
      hits.length = 0;
      raycaster.intersectObjects(structuralMeshes, false, hits);
      if (hits.length) floor = Math.max(floor, hits[0].point.y + 0.06);
    }
    // A conservative swept footprint also covers narrow roof edges between ray
    // samples. It can suppress a few exterior drops, but cannot leak beneath a roof.
    for (const bounds of overheadBounds) {
      if (x + 0.82 >= bounds.min.x && x - 0.12 <= bounds.max.x
        && z + 0.34 >= bounds.min.z && z - 0.06 <= bounds.max.z) {
        floor = Math.max(floor, bounds.max.y + 0.06);
      }
    }
    if (floor > 2) roofProtectedColumns++;
    const phase = random();
    const speed = 8.0 + random() * 5.0;
    for (let end = 0; end < 2; end++) {
      const vertex = drop * 2 + end;
      positions[vertex * 3] = x;
      positions[vertex * 3 + 2] = z;
      floors[vertex] = floor;
      phases[vertex] = phase;
      speeds[vertex] = speed;
      ends[vertex] = end;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aFloor', new THREE.BufferAttribute(floors, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: RAIN_VERTEX,
    fragmentShader: RAIN_FRAGMENT,
    uniforms: {
      uTime: { value: 0 }, uWind: { value: 0.35 }, uTop: { value: top },
      uColor: { value: new THREE.Color('#c9dbe6') }, uOpacity: { value: 0.54 }
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: true
  });
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.name = 'runtime_atmosphere_rain';
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.visible = false;
  return { mesh, count, roofProtectedColumns, structuralMeshCount: structuralMeshes.length };
}

/**
 * Return {setState, update, dispose, report, sunPosition, horizonColor}.
 * Copy sunPosition to the existing directional light after calling setState.
 * `update(deltaSeconds)` reports whether animated atmosphere needs another frame.
 * Pass quality = 'mobile' / 'low' (or {mobile:true}) to reduce rain to 240 lines.
 */
export function createAtmosphere(THREE, { scene, renderer, camera, root, quality = 'desktop' }) {
  const mobile = quality === 'mobile' || quality === 'low' || quality?.mobile === true;
  const sunPosition = new THREE.Vector3();
  const horizonColor = new THREE.Color();
  const uniforms = {
    uTop: { value: new THREE.Color() }, uHorizon: { value: horizonColor },
    uCloud: { value: new THREE.Color() }, uSunColor: { value: new THREE.Color() },
    uSunDirection: { value: new THREE.Vector3() }, uTime: { value: 0 },
    uWind: { value: 0.35 }, uRain: { value: 0 }, uNight: { value: 0 }
  };
  const geometry = new THREE.SphereGeometry(1, mobile ? 24 : 40, mobile ? 12 : 20);
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide, depthWrite: false, depthTest: true, toneMapped: true
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = 'runtime_procedural_sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  sky.position.copy(camera.position);
  // Camera changes also draw the sky correctly when environmental motion is paused.
  sky.onBeforeRender = (_renderer, _scene, renderCamera) => {
    renderCamera.getWorldPosition(sky.position);
    sky.updateMatrixWorld();
  };
  scene.add(sky);
  const rain = createRain(THREE, root, mobile);
  scene.add(rain.mesh);
  const state = { mode: 'day', weather: 'clear', wind: 0.35, motion: true };
  const report = {
    profile: 'procedural-sky-roof-aware-rain-v1',
    rainCount: rain.count,
    roofProtectedColumns: rain.roofProtectedColumns,
    structuralMeshCount: rain.structuralMeshCount,
    reflectionEnvironment: renderer ? 'procedural-sky-pmrem' : 'unavailable-no-renderer',
    reflectionFaceSize: renderer ? 128 : 0,
    reflectionCacheCount: 0,
    reflectionCacheKey: null,
    reflectionUpdate: 'time-weather-only',
    elapsedSeconds: 0,
    state: { ...state },
    disposed: false
  };
  let elapsed = 0;
  const previousEnvironment = scene.environment;
  const reflectionCache = new Map();
  const pmrem = renderer ? new THREE.PMREMGenerator(renderer) : null;
  const reflectionScene = new THREE.Scene();
  const reflectionMaterial = material.clone();
  // Capture linear HDR radiance, with no display tone map or sRGB encoding.
  // Three's PMREM render target selects LinearSRGBColorSpace automatically.
  reflectionMaterial.toneMapped = false;
  reflectionMaterial.uniforms = {
    ...uniforms,
    uTime: { value: 0 },
    uWind: { value: 0 }
  };
  // The reflection's lower hemisphere represents warm ground instead of an
  // implausible second bright sky. Keep the visible dome unchanged.
  reflectionMaterial.fragmentShader = SKY_FRAGMENT.replace(
    'gl_FragColor = vec4(color, 1.0);',
    `color = mix(color, uHorizon * vec3(0.22, 0.18, 0.14),
      1.0 - smoothstep(-0.28, 0.015, d.y));
    gl_FragColor = vec4(color, 1.0);`
  );
  const reflectionSky = new THREE.Mesh(geometry, reflectionMaterial);
  reflectionSky.frustumCulled = false;
  reflectionScene.add(reflectionSky);

  function syncReflection() {
    if (!pmrem || report.disposed) return;
    const key = `${state.mode}:${state.weather}`;
    let target = reflectionCache.get(key);
    if (!target) {
      // r180 supports the fifth options argument. Fixed 128 px faces keep six
      // possible time/weather combinations bounded; wind never creates a target.
      target = pmrem.fromScene(reflectionScene, 0.025, 0.1, 10, { size: 128 });
      target.texture.name = `villa-sky-reflection-${key}`;
      reflectionCache.set(key, target);
    }
    scene.environment = target.texture;
    report.reflectionCacheKey = key;
    report.reflectionCacheCount = reflectionCache.size;
  }

  function restoreReflectionAfterContextLoss() {
    if (report.disposed) return;
    // Render-target pixels do not survive context loss. Rebuild the current
    // atmosphere now and repopulate the other five variants only when selected.
    reflectionCache.forEach((target) => target.dispose());
    reflectionCache.clear();
    syncReflection();
  }
  renderer?.domElement?.addEventListener('webglcontextrestored', restoreReflectionAfterContextLoss);

  function setState(next = {}) {
    if (report.disposed) return;
    if (next.mode && PALETTES[next.mode]) state.mode = next.mode;
    if (next.weather === 'clear' || next.weather === 'rain') state.weather = next.weather;
    if (Number.isFinite(next.wind)) state.wind = THREE.MathUtils.clamp(next.wind, 0, 1);
    if (typeof next.motion === 'boolean') state.motion = next.motion;
    const palette = PALETTES[state.mode];
    const wet = state.weather === 'rain';
    sunPosition.fromArray(palette.position);
    uniforms.uSunDirection.value.copy(sunPosition).normalize();
    uniforms.uTop.value.set(wet ? palette.rainTop : palette.top);
    horizonColor.set(wet ? palette.rainHorizon : palette.horizon);
    uniforms.uCloud.value.set(wet ? palette.rainCloud : palette.cloud);
    uniforms.uSunColor.value.set(palette.sun);
    uniforms.uNight.value = palette.night;
    uniforms.uRain.value = wet ? 1 : 0;
    uniforms.uWind.value = state.wind;
    rain.mesh.visible = wet;
    rain.mesh.material.uniforms.uWind.value = state.wind;
    rain.mesh.material.uniforms.uOpacity.value = state.mode === 'night' ? 0.29 : 0.54;
    rain.mesh.material.uniforms.uColor.value.set(state.mode === 'night' ? '#7992ae' : '#c9dbe6');
    Object.assign(report.state, state);
    syncReflection();
  }

  function update(delta = 0) {
    if (report.disposed || !state.motion || (state.wind === 0 && state.weather !== 'rain')) return false;
    elapsed += Math.min(Math.max(Number.isFinite(delta) ? delta : 0, 0), 0.06);
    report.elapsedSeconds = elapsed;
    uniforms.uTime.value = elapsed;
    rain.mesh.material.uniforms.uTime.value = elapsed;
    return true;
  }

  function dispose() {
    if (report.disposed) return;
    report.disposed = true;
    renderer?.domElement?.removeEventListener('webglcontextrestored', restoreReflectionAfterContextLoss);
    if ([...reflectionCache.values()].some((target) => target.texture === scene.environment)) {
      scene.environment = previousEnvironment;
    }
    reflectionCache.forEach((target) => target.dispose());
    reflectionCache.clear();
    reflectionScene.remove(reflectionSky);
    reflectionMaterial.dispose();
    pmrem?.dispose();
    sky.onBeforeRender = () => {};
    scene.remove(sky, rain.mesh);
    geometry.dispose();
    material.dispose();
    rain.mesh.geometry.dispose();
    rain.mesh.material.dispose();
  }

  setState();
  return { setState, update, dispose, report, sunPosition, horizonColor };
}
