/** A bounded, browser-owned water layer. The repaired source pool remains the geometry authority. */
export function createLivingWater(THREE, { scene, root, renderer, quality = 'high' }) {
  const report = {
    profile: 'living-pool-water-v1',
    surfaceFound: false,
    surfaceSizeMeters: null,
    surfaceHeightMeters: null,
    worldSpaceRipples: true,
    rainRipples: true,
    reflection: 'shared-sky-environment',
    renderTargets: 0
  };
  const source = root?.getObjectByName('pool_water');
  if (!source?.isMesh) return { report, setState() {}, update: () => false, dispose() {} };
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  if (![size.x, size.z, bounds.max.y].every(Number.isFinite) || size.x < 0.1 || size.z < 0.1) {
    return { report, setState() {}, update: () => false, dispose() {} };
  }

  const uniforms = {
    uPoolTime: { value: 0 },
    uPoolWind: { value: 0.45 },
    uPoolRain: { value: 0 },
    uPoolCenter: { value: new THREE.Vector2(center.x, center.z) },
    uPoolSize: { value: new THREE.Vector2(size.x, size.z) },
    uPoolNight: { value: 0 }
  };
  // Transmission uses Three's existing scene pass. No planar-reflection render,
  // image downloads, per-frame texture writes, or high-poly displacement are needed.
  const material = new THREE.MeshPhysicalMaterial({
    name: 'LivingPoolWater',
    color: '#5cafb7',
    roughness: 0.17,
    metalness: 0,
    transmission: 0.62,
    thickness: 0.22,
    attenuationColor: '#2b9aaa',
    attenuationDistance: 2.8,
    ior: 1.333,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    side: THREE.FrontSide,
    depthWrite: true
  });
  material.customProgramCacheKey = () => `living-pool-v1-${quality}`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPoolWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvPoolWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec3 vPoolWorld;
      uniform float uPoolTime;
      uniform float uPoolWind;
      uniform float uPoolRain;
      uniform float uPoolNight;
      uniform vec2 uPoolCenter;
      uniform vec2 uPoolSize;
      vec2 poolHash(vec2 p) {
        return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
      }
      vec2 poolSlope(vec2 p) {
        float t = uPoolTime;
        float strength = 0.24 + uPoolWind * 0.76;
        vec2 slope = vec2(0.0);
        slope += vec2(1.0, 0.38) * cos(dot(p, vec2(2.1, 0.8)) - t * 1.25) * 0.033;
        slope += vec2(-0.45, 1.0) * cos(dot(p, vec2(-2.8, 6.2)) - t * 1.75) * 0.025;
        slope += vec2(0.87, 0.5) * cos(dot(p, vec2(13.4, 7.7)) - t * 2.5) * 0.018;
        slope += vec2(-0.7, 0.71) * cos(dot(p, vec2(-22.1, 22.4)) + t * 3.0) * 0.009;
        slope *= strength;
        if (uPoolRain > 0.001) {
          vec2 cell = floor(p * 1.6);
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 id = cell + vec2(float(x), float(y));
              vec2 random = poolHash(id);
              float cycle = t * 0.73 + random.x * 7.0;
              float age = fract(cycle);
              vec2 origin = (id + 0.18 + poolHash(id + floor(cycle)) * 0.64) / 1.6;
              vec2 direction = p - origin;
              float distanceToDrop = length(direction);
              float crest = distanceToDrop - age * 0.76;
              float envelope = exp(-crest * crest * 150.0) * smoothstep(0.0, 0.12, age) * (1.0 - smoothstep(0.48, 1.0, age));
              slope += direction / max(distanceToDrop, 0.025) * cos(crest * 68.0) * envelope * uPoolRain * 0.055;
            }
          }
        }
        return slope;
      }
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 poolUV = (vPoolWorld.xz - uPoolCenter) / uPoolSize + 0.5;
      vec2 poolEdge = min(poolUV, vec2(1.0) - poolUV) * uPoolSize;
      float poolDepthTint = smoothstep(0.0, 0.85, min(poolEdge.x, poolEdge.y));
      diffuseColor.rgb *= mix(vec3(1.13, 1.08, 1.03), vec3(0.72, 0.94, 1.02), poolDepthTint);
      float poolCausticA = sin(dot(vPoolWorld.xz, vec2(7.4, 4.8)) + uPoolTime * 0.55);
      float poolCausticB = sin(dot(vPoolWorld.xz, vec2(-5.2, 8.8)) - uPoolTime * 0.43);
      float poolCaustic = pow(clamp(1.0 - abs(poolCausticA + poolCausticB) * 1.65, 0.0, 1.0), 6.0);
      diffuseColor.rgb += vec3(0.04, 0.075, 0.07) * poolCaustic * (1.0 - uPoolRain * 0.6) * (1.0 - uPoolNight * 0.65);
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec2 poolSurfaceSlope = poolSlope(vPoolWorld.xz);
      normal = normalize(mat3(viewMatrix) * vec3(-poolSurfaceSlope.x, 1.0, -poolSurfaceSlope.y));
    `).replace('#include <clearcoat_normal_fragment_maps>', `
      #include <clearcoat_normal_fragment_maps>
      #ifdef USE_CLEARCOAT
        clearcoatNormal = normal;
      #endif
    `);
  };

  const geometry = new THREE.PlaneGeometry(size.x, size.z);
  const surface = new THREE.Mesh(geometry, material);
  surface.name = 'runtime_living_pool_surface';
  surface.rotation.x = -Math.PI / 2;
  // Source bounds already include the root's π orientation and pool repairs.
  // Leave the authored .012 m shelf clearance exactly intact.
  surface.position.set(center.x, bounds.max.y, center.z);
  surface.receiveShadow = true;
  surface.castShadow = false;
  scene.add(surface);
  const sourceVisible = source.visible;
  source.visible = false;
  report.surfaceFound = true;
  report.surfaceSizeMeters = [size.x, size.z];
  report.surfaceHeightMeters = bounds.max.y;
  report.transmission = material.transmission;
  let motion = true;
  let disposed = false;

  function setState({ mode = 'day', weather = 'clear', wind = 0.45, motion: nextMotion = true } = {}) {
    motion = nextMotion !== false;
    uniforms.uPoolWind.value = typeof wind === 'number' ? THREE.MathUtils.clamp(wind, 0, 1) : wind ? 0.55 : 0;
    uniforms.uPoolRain.value = weather === 'rain' || weather === 'rainy' ? 1 : weather === 'overcast' ? 0.05 : 0;
    uniforms.uPoolNight.value = mode === 'night' ? 1 : mode === 'evening' ? 0.25 : 0;
    material.roughness = uniforms.uPoolRain.value > 0.5 ? 0.23 : 0.14 + uniforms.uPoolWind.value * 0.06;
    report.weather = weather;
    report.wind = uniforms.uPoolWind.value;
    report.motion = motion;
    // This is a material-only change; pool shadows never need a per-frame refresh.
    if (renderer?.domElement) renderer.domElement.dataset.waterProfile = report.profile;
  }
  setState();
  return {
    report,
    setState,
    update(delta) {
      if (disposed || !motion) return false;
      uniforms.uPoolTime.value += Math.min(Math.max(Number(delta) || 0, 0), 0.06);
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      source.visible = sourceVisible;
      scene.remove(surface);
      geometry.dispose();
      material.dispose();
    }
  };
}
