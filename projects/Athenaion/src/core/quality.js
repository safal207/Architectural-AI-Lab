// Quality presets. Modules must scale their density/resolution with these numbers so the
// interactive preview stays usable on an integrated GPU while offline renders go all out.
export const QUALITY = {
  lite: {
    name: 'lite', spp: 1, msaa: 0,
    shadowMapSize: 1024, cascades: 1, shadowMaxFar: 1000, softShadows: false,
    terrainRes: 0.25, density: 0.18, detail: 0.3,
    cloudSteps: 8, bloom: true, ao: false,
    renderScale: 0.65, maxPixels: 921600, maxAccumulation: 2, workers: 2,
  },
  preview: {
    name: 'preview', spp: 1, msaa: 4,
    shadowMapSize: 2048, cascades: 3, shadowMaxFar: 1400, softShadows: false,
    terrainRes: 0.5,      // multiplier on terrain mesh resolution
    density: 0.45,        // vegetation / city / props instance density multiplier
    detail: 0.5,          // geometric detail multiplier (segments, sculpt resolution)
    cloudSteps: 16, bloom: true, ao: false,
    renderScale: 1, maxPixels: 2073600, maxAccumulation: 32, workers: 4,
  },
  high: {
    name: 'high', spp: 12, msaa: 4,
    shadowMapSize: 4096, cascades: 4, shadowMaxFar: 2400, softShadows: true,
    terrainRes: 1.0, density: 1.0, detail: 1.0,
    cloudSteps: 32, bloom: true, ao: true,
  },
  ultra: {
    name: 'ultra', spp: 48, msaa: 4,
    shadowMapSize: 4096, cascades: 4, shadowMaxFar: 3200, softShadows: true,
    terrainRes: 1.0, density: 1.0, detail: 1.0,
    cloudSteps: 64, bloom: true, ao: true,
  },
};

export function getQuality(name) { return { ...(Object.hasOwn(QUALITY, name) ? QUALITY[name] : QUALITY.preview) }; }
