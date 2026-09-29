export const LIVING_GLAZING_PROFILE = 'living-clear-pane-v1';
export const LIVING_GLAZING_PANES = Object.freeze([
  'living_glass_01', 'living_glass_02', 'living_glass_03',
  'living_glass_04', 'living_glass_05', 'living_glass_06'
]);
const SOURCE_MATERIAL = 'M3_SmokeArchitecturalGlass';

/**
 * Give only the six living-room panes a light, reflective surface approximation.
 * The exported smoke material mixes 0.52 transmission and 0.82 alpha with a dark
 * tint. Alpha-only glass lets the already-transmissive pool remain visible
 * behind it without another screen-space refraction layer. This is a bounded
 * web presentation, not a physically calibrated glazing or daylight model.
 * Clone shared materials: bedroom glazing and safety guards must not change.
 */
export function applyLivingGlazingPresentation(THREE, root) {
  const report = { profile: LIVING_GLAZING_PROFILE, applied: [], skipped: [], clonedMaterials: 0 };
  if (!root) return report;
  const clones = new Map();
  for (const name of LIVING_GLAZING_PANES) {
    const mesh = root.getObjectByName(name);
    if (!mesh?.isMesh) { report.skipped.push(name); continue; }
    const sources = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!sources.length || sources.some(source => !source?.isMeshStandardMaterial
      || source.name !== SOURCE_MATERIAL || source.map || source.alphaMap)) {
      report.skipped.push(name);
      continue;
    }
    const materials = sources.map(source => {
      if (source.userData?.livingGlazingProfile === LIVING_GLAZING_PROFILE) return source;
      if (clones.has(source)) return clones.get(source);
      const material = source.clone();
      material.color.setRGB(0.90, 0.95, 0.93, THREE.LinearSRGBColorSpace);
      material.metalness = 0;
      material.roughness = 0.08;
      material.transparent = true;
      material.opacity = 0.10;
      material.depthTest = true;
      material.depthWrite = false;
      material.envMapIntensity = 0.60;
      if (material.isMeshPhysicalMaterial) {
        material.transmission = 0;
        material.thickness = 0;
      }
      material.userData = { ...source.userData, livingGlazingProfile: LIVING_GLAZING_PROFILE };
      material.needsUpdate = true;
      clones.set(source, material);
      report.clonedMaterials += 1;
      return material;
    });
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    // Ordinary shadow maps would turn these almost-clear panes into opaque slabs.
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    report.applied.push(name);
  }
  root.userData.livingGlazingPresentation = report;
  return report;
}
