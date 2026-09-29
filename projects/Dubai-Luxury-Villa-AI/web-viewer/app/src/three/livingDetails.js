const EXTERIOR_FOLIAGE = /^(agave_(left|right|far)_r6_leaf_|ribbon_(left|right|far)_r7_|pool_context_(agaves|grasses)_v3)/;
const AUTHORED_FIXTURE = /(linear_light|downlight|pendant_glow|headboard_cove|bedside_lamp)/;

/** Small architectural layers, each anchored to the loaded model instead of guessed coordinates. */
export function createLivingDetails(THREE, { scene, root, quality = 'desktop' }) {
  const report = {
    profile: 'living-architecture-detail-v1',
    windMeshCount: 0,
    detailMeshCount: 0,
    fixtureMeshCount: 0,
    wetSurfaceMeshCount: 0,
    additionalLights: 0,
    detailLayers: [],
    shadowDeformation: 'matching-depth-material'
  };
  const group = new THREE.Group();
  group.name = 'runtime_living_architecture_details';
  scene.add(group);
  const geometries = new Set();
  const materials = new Set();
  const restorations = [];
  const emitters = [];
  const wetSurfaces = [];
  const pavingWetness = { value: 0 };
  const windTime = { value: 0 };
  const windStrength = { value: 0.45 };
  let motion = true;
  let disposed = false;
  root?.updateWorldMatrix(true, true);

  function ownGeometry(geometry) { geometries.add(geometry); return geometry; }
  function ownMaterial(material) { materials.add(material); return material; }
  function nodeBounds(name) {
    const node = root?.getObjectByName(name);
    if (!node?.isMesh) return null;
    const bounds = new THREE.Box3().setFromObject(node);
    return bounds.isEmpty() ? null : bounds;
  }
  function mesh(name, geometry, material, x, y, z) {
    const object = new THREE.Mesh(geometry, material);
    object.name = `runtime_detail_${name}`;
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    group.add(object);
    report.detailMeshCount += 1;
    return object;
  }
  const bronze = ownMaterial(new THREE.MeshStandardMaterial({ name: 'DetailBronze', color: '#5d5245', metalness: 0.7, roughness: 0.38 }));
  const timberJoint = ownMaterial(new THREE.MeshStandardMaterial({ name: 'DetailTimberJoint', color: '#625043', roughness: 0.88 }));
  const ceramic = ownMaterial(new THREE.MeshStandardMaterial({ name: 'DetailCeramic', color: '#d2c6b4', roughness: 0.67 }));
  const terracotta = ownMaterial(new THREE.MeshStandardMaterial({ name: 'DetailTerracotta', color: '#9f6e53', roughness: 0.85 }));
  const paper = ownMaterial(new THREE.MeshStandardMaterial({ name: 'DetailPaper', color: '#ded8c6', roughness: 0.9 }));
  const cover = ownMaterial(new THREE.MeshStandardMaterial({ name: 'DetailBookCover', color: '#455851', roughness: 0.8 }));
  const glow = ownMaterial(new THREE.MeshStandardMaterial({
    name: 'DetailWarmInset', color: '#ead3ad', emissive: '#ffc77f', emissiveIntensity: 0.65, roughness: 0.65
  }));
  emitters.push({ material: glow, base: 1.0 });

  // Refine the underside of the authored timber cantilever with narrow recessed
  // board joints. One instanced draw call; its footprint never extends past the soffit.
  const soffit = nodeBounds('signature_timber_soffit');
  if (soffit) {
    const size = soffit.getSize(new THREE.Vector3());
    const count = Math.min(34, Math.max(6, Math.floor(size.x / 0.31)));
    const geometry = ownGeometry(new THREE.BoxGeometry(0.012, 0.006, Math.max(0.1, size.z - 0.12)));
    const joints = new THREE.InstancedMesh(geometry, timberJoint, count);
    joints.name = 'runtime_detail_timber_soffit_joints';
    joints.castShadow = false;
    joints.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    const centerZ = (soffit.min.z + soffit.max.z) / 2;
    for (let i = 0; i < count; i += 1) {
      matrix.makeTranslation(soffit.min.x + size.x * (i + 1) / (count + 1), soffit.min.y - 0.003, centerZ);
      joints.setMatrixAt(i, matrix);
    }
    joints.instanceMatrix.needsUpdate = true;
    group.add(joints);
    report.detailMeshCount += 1;
    report.detailLayers.push('timber-soffit-board-joints');
  }

  // Pulls sit 12 mm in front of the actual cabinet face, rather than floating
  // relative to a camera. Face direction follows the model's world orientation.
  for (let i = 0; i < 4; i += 1) {
    const bounds = nodeBounds(`kitchen_base_v04_0${i}`);
    if (!bounds) continue;
    const center = bounds.getCenter(new THREE.Vector3());
    mesh(`cabinet_pull_${i}`, ownGeometry(new THREE.BoxGeometry(0.32, 0.014, 0.027)), bronze,
      center.x, bounds.max.y - 0.09, bounds.max.z + 0.014);
  }
  if (nodeBounds('kitchen_base_v04_00')) report.detailLayers.push('bronze-cabinet-pulls');

  const livingTable = nodeBounds('living_table');
  if (livingTable) {
    const c = livingTable.getCenter(new THREE.Vector3());
    const pages = mesh('table_book_pages', ownGeometry(new THREE.BoxGeometry(0.38, 0.034, 0.27)), paper,
      c.x + 0.23, livingTable.max.y + 0.022, c.z);
    const bookCover = mesh('table_book_cover', ownGeometry(new THREE.BoxGeometry(0.39, 0.009, 0.28)), cover,
      c.x + 0.23, livingTable.max.y + 0.045, c.z);
    pages.rotation.y = bookCover.rotation.y = -0.12;
    const profile = [[0, 0], [0.085, 0], [0.095, 0.025], [0.1, 0.09], [0.075, 0.145], [0.045, 0.175], [0.045, 0.19]];
    mesh('table_ceramic', ownGeometry(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 20)), ceramic,
      c.x - 0.28, livingTable.max.y + 0.002, c.z + 0.02);
    report.detailLayers.push('living-table-book-and-ceramic');
  }
  const dining = nodeBounds('dining_table');
  if (dining) {
    const c = dining.getCenter(new THREE.Vector3());
    const profile = [[0, 0], [0.10, 0], [0.125, 0.05], [0.145, 0.17], [0.095, 0.26], [0.055, 0.30], [0.055, 0.325]];
    mesh('dining_vessel', ownGeometry(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 24)), terracotta,
      c.x - 0.20, dining.max.y + 0.002, c.z);
    mesh('dining_tray', ownGeometry(new THREE.CylinderGeometry(0.18, 0.17, 0.025, 24)), ceramic,
      c.x + 0.24, dining.max.y + 0.014, c.z + 0.03);
    report.detailLayers.push('dining-handmade-vessels');
  }

  for (const name of ['left_planter', 'right_planter']) {
    const bounds = nodeBounds(name);
    if (!bounds) continue;
    const center = bounds.getCenter(new THREE.Vector3());
    const inset = mesh(`${name}_inset`, ownGeometry(new THREE.BoxGeometry(0.64, 0.026, 0.012)), glow,
      center.x, bounds.max.y - 0.16, bounds.max.z + 0.008);
    inset.castShadow = false;
    report.fixtureMeshCount += 1;
  }
  if (nodeBounds('left_planter')) report.detailLayers.push('planter-inset-warm-lines');

  const poolBounds = nodeBounds('pool_water');
  const poolCenterZ = poolBounds ? (poolBounds.min.z + poolBounds.max.z) / 2 : 0;
  const soffitCenterZ = soffit ? (soffit.min.z + soffit.max.z) / 2 : 0;
  const poolDirection = poolCenterZ >= soffitCenterZ ? 1 : -1;
  // Only the exposed paving within .75 m of the basin and beyond gets rain
  // sheen. The terrace below the house/cantilever keeps its dry material.
  const exposedPavingStart = poolBounds
    ? (poolDirection > 0 ? poolBounds.min.z : -poolBounds.max.z) - 0.75
    : 0;

  function attachWetSurface(object) {
    const isPaving = object.name === 'terrace_deck';
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    const clones = originals.map((source) => {
      const clone = ownMaterial(source.clone());
      clone.userData = {
        ...source.userData,
        runtimeMaterialClone: true,
        materialFamily: source.userData?.materialFamily ?? (isPaving ? 'deck' : 'stone'),
        baseNormalScale: source.userData?.baseNormalScale ?? (source.normalScale ? [source.normalScale.x, source.normalScale.y] : null)
      };
      if (isPaving) {
        clone.customProgramCacheKey = () => 'exposed-terrace-rain-sheen-v1';
        clone.onBeforeCompile = (shader) => {
          shader.uniforms.uPavingWetness = pavingWetness;
          shader.uniforms.uPavingStart = { value: exposedPavingStart };
          shader.uniforms.uPavingDirection = { value: poolDirection };
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying float vPavingWorldZ;')
            .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvPavingWorldZ = (modelMatrix * vec4(transformed, 1.0)).z;');
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying float vPavingWorldZ;\nuniform float uPavingWetness;\nuniform float uPavingStart;\nuniform float uPavingDirection;')
            .replace('#include <roughnessmap_fragment>', `
              #include <roughnessmap_fragment>
              float exposedPaving = smoothstep(uPavingStart - 0.2, uPavingStart + 0.2, vPavingWorldZ * uPavingDirection);
              roughnessFactor = mix(roughnessFactor, min(roughnessFactor, 0.32), exposedPaving * uPavingWetness);
            `);
        };
      } else {
        wetSurfaces.push({ material: clone, dryRoughness: clone.roughness, lastAppliedRoughness: clone.roughness });
      }
      return clone;
    });
    const originalMaterial = object.material;
    const nextMaterial = Array.isArray(originalMaterial) ? clones : clones[0];
    object.material = nextMaterial;
    restorations.push(() => { if (object.material === nextMaterial) object.material = originalMaterial; });
    report.wetSurfaceMeshCount += 1;
  }

  function injectWind(material, localBounds, phase) {
    const base = { value: localBounds.min.y };
    const height = { value: Math.max(0.15, localBounds.max.y - localBounds.min.y) };
    const isGrass = phase.isGrass;
    material.customProgramCacheKey = () => 'living-exterior-wind-v1';
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uLeafTime = windTime;
      shader.uniforms.uLeafWind = windStrength;
      shader.uniforms.uLeafBase = base;
      shader.uniforms.uLeafHeight = height;
      shader.uniforms.uLeafFlex = { value: isGrass ? 0.115 : 0.044 };
      shader.uniforms.uLeafPhase = { value: phase.value };
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `
        #include <common>
        uniform float uLeafTime;
        uniform float uLeafWind;
        uniform float uLeafBase;
        uniform float uLeafHeight;
        uniform float uLeafFlex;
        uniform float uLeafPhase;
        vec2 leafBend(vec3 p) {
          float tip = clamp((p.y - uLeafBase) / uLeafHeight, 0.0, 1.0);
          float gust = sin(uLeafTime * 1.35 + uLeafPhase + p.x * 0.12 + p.z * 0.10);
          gust += sin(uLeafTime * 2.7 + uLeafPhase * 1.7) * 0.24;
          return vec2(0.82, 0.44) * gust * tip * tip * uLeafWind * uLeafFlex;
        }
      `).replace('#include <begin_vertex>', `
        #include <begin_vertex>
        transformed.xz += leafBend(position);
      `).replace('#include <beginnormal_vertex>', `
        #include <beginnormal_vertex>
        vec2 leafDerivative = (leafBend(position + vec3(0.0, 0.01, 0.0)) - leafBend(position)) / 0.01;
        objectNormal.y -= dot(leafDerivative, objectNormal.xz);
      `);
    };
  }

  root?.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    if (/^pool_coping_(left|right|near)$/.test(object.name) || (object.name === 'terrace_deck' && poolBounds)) {
      attachWetSurface(object);
    } else if (EXTERIOR_FOLIAGE.test(object.name)) {
      object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox;
      if (!bounds || bounds.isEmpty()) return;
      const originals = Array.isArray(object.material) ? object.material : [object.material];
      const phase = { isGrass: /ribbon|grasses/.test(object.name), value: bounds.min.x * 0.7 + bounds.min.z * 0.33 };
      const clones = originals.map((source) => {
        const clone = ownMaterial(source.clone());
        injectWind(clone, bounds, phase);
        return clone;
      });
      const originalMaterial = object.material;
      const originalDepth = object.customDepthMaterial;
      const originalDistance = object.customDistanceMaterial;
      const nextMaterial = Array.isArray(originalMaterial) ? clones : clones[0];
      object.material = nextMaterial;
      const depth = ownMaterial(new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        side: originals[0].side,
        alphaMap: originals[0].alphaMap,
        map: originals[0].map,
        alphaTest: originals[0].alphaTest
      }));
      injectWind(depth, bounds, phase);
      object.customDepthMaterial = depth;
      const distance = ownMaterial(new THREE.MeshDistanceMaterial({
        side: originals[0].side, alphaTest: originals[0].alphaTest,
        alphaMap: originals[0].alphaMap, map: originals[0].map
      }));
      injectWind(distance, bounds, phase);
      object.customDistanceMaterial = distance;
      restorations.push(() => {
        if (object.material === nextMaterial) object.material = originalMaterial;
        if (object.customDepthMaterial === depth) object.customDepthMaterial = originalDepth;
        if (object.customDistanceMaterial === distance) object.customDistanceMaterial = originalDistance;
      });
      report.windMeshCount += 1;
    } else if (AUTHORED_FIXTURE.test(object.name)) {
      const originals = Array.isArray(object.material) ? object.material : [object.material];
      const clones = originals.map((source) => {
        const clone = ownMaterial(source.clone());
        if (clone.emissive) {
          clone.emissive.set('#ffd09a');
          emitters.push({ material: clone, base: Math.max(0.7, Math.min(source.emissiveIntensity || 1, 2.2)) });
        }
        return clone;
      });
      const originalMaterial = object.material;
      const nextMaterial = Array.isArray(originalMaterial) ? clones : clones[0];
      object.material = nextMaterial;
      restorations.push(() => { if (object.material === nextMaterial) object.material = originalMaterial; });
      report.fixtureMeshCount += 1;
    }
  });

  function setState({ mode = 'day', weather = 'clear', wind = 0.45, motion: nextMotion = true } = {}) {
    motion = nextMotion !== false;
    windStrength.value = typeof wind === 'number' ? THREE.MathUtils.clamp(wind, 0, 1) : wind ? 0.55 : 0;
    const intensity = mode === 'night' ? 1.75 : mode === 'evening' ? 1.15 : weather === 'rain' ? 0.55 : 0.26;
    for (const emitter of emitters) emitter.material.emissiveIntensity = emitter.base * intensity;
    const wetness = weather === 'rain' || weather === 'rainy' ? 1 : 0;
    pavingWetness.value = wetness;
    for (const surface of wetSurfaces) {
      // Palette updates may set a new dry response while rain is active. Capture
      // that external change, never the wet value applied by this layer itself.
      if (surface.material.roughness !== surface.lastAppliedRoughness) {
        surface.dryRoughness = surface.material.roughness;
      }
      surface.material.roughness = THREE.MathUtils.lerp(surface.dryRoughness, Math.min(surface.dryRoughness, 0.32), wetness);
      surface.lastAppliedRoughness = surface.material.roughness;
    }
    report.wind = windStrength.value;
    report.motion = motion;
    report.weather = weather;
    report.quality = quality;
    report.wetness = wetness;
  }
  setState();
  return {
    report,
    setState,
    update(delta) {
      if (disposed || !motion || windStrength.value <= 0 || report.windMeshCount === 0) return false;
      windTime.value += Math.min(Math.max(Number(delta) || 0, 0), 0.06);
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      restorations.forEach((restore) => restore());
      scene.remove(group);
      geometries.forEach((geometry) => geometry.dispose());
      // Maps belong to the GLB and are deliberately never disposed by this layer.
      materials.forEach((material) => material.dispose());
      group.clear();
    }
  };
}
